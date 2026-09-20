package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"
)

const maxRangeDays = 93

type capacityWeek struct {
	Start       string `json:"start"`
	End         string `json:"end"`
	WorkingDays int    `json:"workingDays"`
}

type capacityCell struct {
	WeekStart      string  `json:"weekStart"`
	AllocatedHours float64 `json:"allocatedHours"`
	CapacityHours  float64 `json:"capacityHours"`
}

type personCapacity struct {
	ID          int            `json:"id"`
	Name        string         `json:"name"`
	WeeklyHours float64        `json:"weeklyHours"`
	Weeks       []capacityCell `json:"weeks"`
}

type capacityResponse struct {
	From   string           `json:"from"`
	To     string           `json:"to"`
	Weeks  []capacityWeek   `json:"weeks"`
	People []personCapacity `json:"people"`
}

// Dates are inclusive. Capacity is spread evenly across Monday-Friday;
// holidays and individual working schedules are not represented in the schema.
func weeksInRange(from, to time.Time) []capacityWeek {
	monday := from.AddDate(0, 0, -(int(from.Weekday())+6)%7)
	weeks := []capacityWeek{}
	for start := monday; !start.After(to); start = start.AddDate(0, 0, 7) {
		end := start.AddDate(0, 0, 6)
		if end.Year() > 9999 {
			end = to
		}
		week := capacityWeek{Start: start.Format(time.DateOnly), End: end.Format(time.DateOnly)}
		for day := 0; day < 5; day++ {
			date := start.AddDate(0, 0, day)
			if !date.Before(from) && !date.After(to) {
				week.WorkingDays++
			}
		}
		weeks = append(weeks, week)
	}
	return weeks
}

func parseCapacityRange(fromValue, toValue string) (time.Time, time.Time, error) {
	from, fromErr := time.Parse(time.DateOnly, fromValue)
	to, toErr := time.Parse(time.DateOnly, toValue)
	if fromErr != nil || toErr != nil || from.Year() < 1 || to.Year() < 1 {
		return from, to, errors.New("from and to must be valid YYYY-MM-DD dates")
	}
	if to.Before(from) || to.After(from.AddDate(0, 0, maxRangeDays-1)) {
		return from, to, fmt.Errorf("Choose a range of 1 to %d days", maxRangeDays)
	}
	return from, to, nil
}

func (s *server) handleCapacity(w http.ResponseWriter, r *http.Request) {
	from, to, err := parseCapacityRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	result, err := loadCapacity(ctx, s.db, from, to)
	if err != nil {
		log.Printf("load capacity: %v", err)
		http.Error(w, "Could not load capacity", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, result)
}
