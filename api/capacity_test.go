package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestWeeksInRange(t *testing.T) {
	for _, test := range []struct {
		from, to, first string
		days            []int
	}{
		{"2025-12-29", "2026-01-16", "2025-12-29", []int{5, 5, 5}},
		{"2026-01-07", "2026-01-13", "2026-01-05", []int{3, 2}},
		{"2026-01-10", "2026-01-11", "2026-01-05", []int{0}},
		{"2024-02-29", "2024-02-29", "2024-02-26", []int{1}},
	} {
		t.Run(test.from+"/"+test.to, func(t *testing.T) {
			from, _ := time.Parse(time.DateOnly, test.from)
			to, _ := time.Parse(time.DateOnly, test.to)
			weeks := weeksInRange(from, to)
			if len(weeks) != len(test.days) || weeks[0].Start != test.first {
				t.Fatalf("unexpected weeks: %+v", weeks)
			}
			for i, days := range test.days {
				if weeks[i].WorkingDays != days {
					t.Errorf("week %d: got %d working days, want %d", i, weeks[i].WorkingDays, days)
				}
			}
		})
	}
}

func TestInvalidRequests(t *testing.T) {
	s := &server{}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/capacity", s.handleCapacity)
	mux.HandleFunc("PATCH /api/people/{id}", s.handleUpdatePerson)
	for _, test := range []struct{ method, path, body string }{
		{"GET", "/api/capacity", ""},
		{"GET", "/api/capacity?from=2026-02-30&to=2026-03-01", ""},
		{"GET", "/api/capacity?from=2026-01-02&to=2026-01-01", ""},
		{"GET", "/api/capacity?from=2026-01-01&to=2026-12-31", ""},
		{"PATCH", "/api/people/nope", `{"weeklyHours":40}`},
		{"PATCH", "/api/people/1", `{}`},
		{"PATCH", "/api/people/1", `{"weeklyHours":null}`},
		{"PATCH", "/api/people/1", `{"weeklyHours":-1}`},
		{"PATCH", "/api/people/1", `{"weeklyHours":169}`},
		{"PATCH", "/api/people/1", `{"weeklyHours":"40"}`},
		{"PATCH", "/api/people/1", `{"weeklyHours":40,"name":"changed"}`},
		{"PATCH", "/api/people/1", `{"weeklyHours":40} {}`},
	} {
		t.Run(test.path+test.body, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			mux.ServeHTTP(recorder, httptest.NewRequest(test.method, test.path, strings.NewReader(test.body)))
			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("got %d: %s", recorder.Code, recorder.Body.String())
			}
		})
	}
}

func TestCapacityDatabaseFailure(t *testing.T) {
	db, err := pgxpool.New(context.Background(), "postgres://capacity:capacity@localhost:5432/capacity?sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	db.Close()
	s := &server{db: db}
	w := httptest.NewRecorder()
	s.handleCapacity(w, httptest.NewRequest("GET", "/api/capacity?from=2026-01-05&to=2026-01-09", nil))
	if w.Code != http.StatusInternalServerError || w.Body.String() != "Could not load capacity\n" {
		t.Fatalf("database failure: %d %s", w.Code, w.Body.String())
	}
}

// Uses the real seeded database, but all edits are restored before returning.
func TestSeededCapacity(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to run against the assignment seed")
	}
	db, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := &server{db: db}
	get := func(from, to string) capacityResponse {
		t.Helper()
		w := httptest.NewRecorder()
		s.handleCapacity(w, httptest.NewRequest("GET", "/api/capacity?from="+from+"&to="+to, nil))
		if w.Code != 200 {
			t.Fatalf("GET: %d %s", w.Code, w.Body.String())
		}
		var result capacityResponse
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		return result
	}
	result := get("2025-12-29", "2026-01-16")
	if len(result.People) != 500 || len(result.Weeks) != 3 {
		t.Fatalf("got %d people, %d weeks", len(result.People), len(result.Weeks))
	}
	expected := [][]float64{{40, 0, 30}, {0, 32, 8}, {0, 4, 12}, {0, 45, 40}, {0, 20, 0}}
	for i, hours := range expected {
		person := result.People[i]
		for j, want := range hours {
			if person.Weeks[j].AllocatedHours != want || person.Weeks[j].CapacityHours != person.WeeklyHours {
				t.Errorf("%s week %d: %+v, want %v allocated / %v capacity", person.Name, j, person.Weeks[j], want, person.WeeklyHours)
			}
		}
	}
	partial := get("2026-01-07", "2026-01-09")
	if got := partial.People[3].Weeks[0]; got.AllocatedHours != 33 || got.CapacityHours != 24 {
		t.Errorf("Dee partial week: %+v, want 33/24", got)
	}
	for _, person := range get("2026-01-10", "2026-01-11").People {
		if person.Weeks[0].AllocatedHours != 0 || person.Weeks[0].CapacityHours != 0 {
			t.Fatal("weekend range should have zero allocation and capacity")
		}
	}
	for _, person := range get("2030-01-07", "2030-01-11").People {
		if person.Weeks[0].AllocatedHours != 0 {
			t.Fatal("empty assignment range should retain people with zero allocation")
		}
	}
	oldHours := result.People[3].WeeklyHours
	defer func() {
		if _, err := db.Exec(context.Background(), `UPDATE people SET weekly_hours=$1 WHERE id=4`, oldHours); err != nil {
			t.Errorf("restore capacity: %v", err)
		}
	}()
	patch := func(id, body string) int {
		r := httptest.NewRequest("PATCH", "/api/people/"+id, strings.NewReader(body))
		r.SetPathValue("id", id)
		w := httptest.NewRecorder()
		s.handleUpdatePerson(w, r)
		return w.Code
	}
	if status := patch("4", `{"weeklyHours":32.5}`); status != 200 {
		t.Fatalf("PATCH status %d", status)
	}
	if got := get("2026-01-07", "2026-01-09").People[3].Weeks[0]; got.CapacityHours != 19.5 || got.AllocatedHours != 33 {
		t.Errorf("after edit: %+v, want 33/19.5", got)
	}
	for _, test := range []struct {
		weeklyHours string
		capacity    float64
	}{
		{"20.4", 12.24},
		{"20.7", 12.42},
		{"0.0001", 0.00006},
	} {
		if status := patch("4", `{"weeklyHours":`+test.weeklyHours+`}`); status != 200 {
			t.Fatalf("fractional PATCH status %d", status)
		}
		if got := get("2026-01-07", "2026-01-09").People[3].Weeks[0]; got.CapacityHours != test.capacity {
			t.Errorf("weekly hours %s: got %.17g capacity, want %.17g", test.weeklyHours, got.CapacityHours, test.capacity)
		}
	}
	if status := patch("4", `{"weeklyHours":0}`); status != 200 {
		t.Fatalf("zero PATCH status %d", status)
	}
	if got := get("2026-01-05", "2026-01-09").People[3].Weeks[0]; got.CapacityHours != 0 || got.AllocatedHours != 45 {
		t.Errorf("zero capacity: %+v, want 45/0", got)
	}
	if status := patch("2147483647", `{"weeklyHours":40}`); status != 404 {
		t.Fatalf("missing person PATCH status %d", status)
	}
}
