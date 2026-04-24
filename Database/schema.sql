PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Managers who control divisions and sessions.
CREATE TABLE IF NOT EXISTS manager (
    manager_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    contact_no TEXT,
    email_address TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Participants who can be assigned to divisions and sessions.
CREATE TABLE IF NOT EXISTS participant (
    participant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    contact_no TEXT,
    email_address TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A division is managed by one manager.
CREATE TABLE IF NOT EXISTS division (
    div_id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES manager(manager_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE (manager_id, name)
);

-- Many-to-many relationship between divisions and participants.
CREATE TABLE IF NOT EXISTS division_participant (
    div_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (div_id, participant_id),
    FOREIGN KEY (div_id) REFERENCES division(div_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participant(participant_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Sessions belong to a division.
CREATE TABLE IF NOT EXISTS session (
    sess_id INTEGER PRIMARY KEY AUTOINCREMENT,
    div_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    max_participants INTEGER NOT NULL CHECK (max_participants > 0),
    starts_at TEXT,
    ends_at TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (div_id) REFERENCES division(div_id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (div_id, name)
);

-- Physical seats for each session.
CREATE TABLE IF NOT EXISTS seat (
    seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sess_id INTEGER NOT NULL,
    seat_label TEXT NOT NULL,
    is_accessible INTEGER NOT NULL DEFAULT 0 CHECK (is_accessible IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    FOREIGN KEY (sess_id) REFERENCES session(sess_id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (sess_id, seat_label)
);

-- Attendance/enrollment and optional seat assignment.
CREATE TABLE IF NOT EXISTS session_enrollment (
    sess_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    seat_id INTEGER,
    enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sess_id, participant_id),
    FOREIGN KEY (sess_id) REFERENCES session(sess_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participant(participant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seat(seat_id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE (seat_id)
);

CREATE INDEX IF NOT EXISTS idx_division_manager ON division(manager_id);
CREATE INDEX IF NOT EXISTS idx_division_participant_participant ON division_participant(participant_id);
CREATE INDEX IF NOT EXISTS idx_session_division ON session(div_id);
CREATE INDEX IF NOT EXISTS idx_seat_session ON seat(sess_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_session ON session_enrollment(sess_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_participant ON session_enrollment(participant_id);

-- Prevent enrolling more than max_participants.
CREATE TRIGGER IF NOT EXISTS trg_capacity_before_insert
BEFORE INSERT ON session_enrollment
FOR EACH ROW
WHEN (
    SELECT COUNT(*)
    FROM session_enrollment se
    WHERE se.sess_id = NEW.sess_id
) >= (
    SELECT s.max_participants
    FROM session s
    WHERE s.sess_id = NEW.sess_id
)
BEGIN
    SELECT RAISE(ABORT, 'Session capacity reached.');
END;

-- Prevent assigning a seat that belongs to another session.
CREATE TRIGGER IF NOT EXISTS trg_validate_seat_session_before_insert
BEFORE INSERT ON session_enrollment
FOR EACH ROW
WHEN NEW.seat_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM seat st
    WHERE st.seat_id = NEW.seat_id
      AND st.sess_id = NEW.sess_id
      AND st.is_active = 1
)
BEGIN
    SELECT RAISE(ABORT, 'Seat does not belong to this session or is inactive.');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_seat_session_before_update
BEFORE UPDATE OF seat_id, sess_id ON session_enrollment
FOR EACH ROW
WHEN NEW.seat_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM seat st
    WHERE st.seat_id = NEW.seat_id
      AND st.sess_id = NEW.sess_id
      AND st.is_active = 1
)
BEGIN
    SELECT RAISE(ABORT, 'Seat does not belong to this session or is inactive.');
END;

-- Reporting view for available seats and occupancy.
CREATE VIEW IF NOT EXISTS v_session_capacity AS
SELECT
    s.sess_id,
    s.name AS session_name,
    s.div_id,
    s.max_participants,
    COALESCE((
        SELECT COUNT(*)
        FROM session_enrollment se
        WHERE se.sess_id = s.sess_id
    ), 0) AS enrolled_count,
    (s.max_participants - COALESCE((
        SELECT COUNT(*)
        FROM session_enrollment se
        WHERE se.sess_id = s.sess_id
    ), 0)) AS available_by_capacity,
    COALESCE((
        SELECT COUNT(*)
        FROM seat st
        WHERE st.sess_id = s.sess_id
          AND st.is_active = 1
    ), 0) AS active_seat_count,
    (
        COALESCE((
            SELECT COUNT(*)
            FROM seat st
            WHERE st.sess_id = s.sess_id
              AND st.is_active = 1
        ), 0)
        -
        COALESCE((
            SELECT COUNT(*)
            FROM session_enrollment se
            WHERE se.sess_id = s.sess_id
              AND se.seat_id IS NOT NULL
        ), 0)
    ) AS available_physical_seats
FROM session s;

COMMIT;
