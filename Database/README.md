# SeatG33k Database (SQLite)

This schema is based on your ERD entities (`Manager`, `Participant`, `Division`, `Session`) and enhanced for seat-allocation reliability.

## What's improved

- Normalized many-to-many relationships:
  - `division_participant` for division membership.
  - `session_enrollment` for session attendance.
- Added `seat` table to support actual seat assignment.
- Added integrity protections:
  - Capacity trigger to prevent over-enrollment.
  - Seat/session trigger to prevent assigning seats from the wrong session.
  - Unique seat assignment via `UNIQUE(seat_id)`.
- Added reporting view: `v_session_capacity`.

## Create database

```bash
sqlite3 seatg33k.db < Database/schema.sql
```

## Seed sample data

```bash
sqlite3 seatg33k.db < Database/seed.sql
```

## Quick checks

```bash
sqlite3 seatg33k.db ".tables"
sqlite3 seatg33k.db "SELECT * FROM v_session_capacity;"
```

## Notes

- Store password hashes, never plain-text passwords.
- Run `PRAGMA foreign_keys = ON;` for each SQLite connection in your app.
