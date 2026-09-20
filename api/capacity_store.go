package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Aggregate assignments before joining people, retaining people with no work.
// Distinct assignment IDs can have identical fields: all contribute hours.
// Prorate numeric hours in SQL, converting to float only for the JSON response.
const capacitySQL = `
WITH days AS (
    SELECT day::date AS day, date_trunc('week', day)::date AS week
    FROM generate_series($1::date::timestamp, $2::date::timestamp, interval '1 day') AS day
), weeks AS (
    SELECT week, count(*) FILTER (WHERE extract(isodow FROM day) <= 5) AS working_days
    FROM days
    GROUP BY week
), allocated AS (
    SELECT a.person_id, d.week, sum(a.hours_per_day) AS hours
    FROM days d
    JOIN assignments a ON d.day BETWEEN a.start_date AND a.end_date
    WHERE a.start_date <= $2::date AND a.end_date >= $1::date
      AND extract(isodow FROM d.day) <= 5
    GROUP BY a.person_id, d.week
)
SELECT p.id, p.name, p.weekly_hours::float8,
       to_char(w.week, 'YYYY-MM-DD'), coalesce(a.hours, 0)::float8,
       (p.weekly_hours * w.working_days / 5)::float8
FROM people p
CROSS JOIN weeks w
LEFT JOIN allocated a ON a.person_id = p.id AND a.week = w.week
ORDER BY p.id, w.week`

func loadCapacity(ctx context.Context, db *pgxpool.Pool, from, to time.Time) (capacityResponse, error) {
	result := capacityResponse{
		From: from.Format(time.DateOnly), To: to.Format(time.DateOnly),
		Weeks: weeksInRange(from, to), People: []personCapacity{},
	}
	rows, err := db.Query(ctx, capacitySQL, result.From, result.To)
	if err != nil {
		return capacityResponse{}, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id int
		var name string
		var weeklyHours float64
		var cell capacityCell
		if err := rows.Scan(&id, &name, &weeklyHours, &cell.WeekStart, &cell.AllocatedHours, &cell.CapacityHours); err != nil {
			return capacityResponse{}, fmt.Errorf("scan: %w", err)
		}
		if len(result.People) == 0 || result.People[len(result.People)-1].ID != id {
			person := personCapacity{ID: id, Name: name, WeeklyHours: weeklyHours, Weeks: make([]capacityCell, 0, len(result.Weeks))}
			result.People = append(result.People, person)
		}
		person := &result.People[len(result.People)-1]
		person.Weeks = append(person.Weeks, cell)
	}
	if err := rows.Err(); err != nil {
		return capacityResponse{}, fmt.Errorf("read rows: %w", err)
	}
	return result, nil
}
