package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *server) handleUpdatePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 || id > 2147483647 {
		http.Error(w, "Invalid person ID", http.StatusBadRequest)
		return
	}
	var input struct {
		WeeklyHours *float64 `json:"weeklyHours"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		http.Error(w, "Provide a JSON object with weeklyHours", http.StatusBadRequest)
		return
	}
	if decoder.Decode(new(any)) != io.EOF || input.WeeklyHours == nil || math.IsNaN(*input.WeeklyHours) || math.IsInf(*input.WeeklyHours, 0) || *input.WeeklyHours < 0 || *input.WeeklyHours > 168 {
		http.Error(w, "weeklyHours must be a number between 0 and 168", http.StatusBadRequest)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	var saved float64
	err = s.db.QueryRow(ctx, `UPDATE people SET weekly_hours = $1 WHERE id = $2 RETURNING weekly_hours::float8`, *input.WeeklyHours, id).Scan(&saved)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "Person not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("update person: %v", err)
		http.Error(w, "Could not save capacity", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "weeklyHours": saved})
}
