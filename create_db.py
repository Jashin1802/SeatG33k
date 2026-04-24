import sqlite3

conn = sqlite3.connect("seatg33k.db")
cursor = conn.cursor()

cursor.executescript("""
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Participant (
    ParticipantID INTEGER PRIMARY KEY AUTOINCREMENT,
    FName         TEXT NOT NULL,
    LName         TEXT NOT NULL,
    ContactNo     TEXT,
    EmailAd       TEXT NOT NULL UNIQUE,
    Password      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Manager (
    ManagerID  INTEGER PRIMARY KEY AUTOINCREMENT,
    FName      TEXT NOT NULL,
    LName      TEXT NOT NULL,
    ContactNo  TEXT,
    EmailAd    TEXT NOT NULL UNIQUE,
    Password   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Division (
    DivID           INTEGER PRIMARY KEY AUTOINCREMENT,
    ParticipantID   INTEGER,
    ManagerID       INTEGER,
    Name            TEXT NOT NULL,
    maxParticipants INTEGER NOT NULL,
    FOREIGN KEY (ParticipantID) REFERENCES Participant(ParticipantID),
    FOREIGN KEY (ManagerID)     REFERENCES Manager(ManagerID)
);

CREATE TABLE IF NOT EXISTS Session (
    SessID          INTEGER PRIMARY KEY AUTOINCREMENT,
    DivID           INTEGER NOT NULL,
    ParticipantID   INTEGER,
    Name            TEXT NOT NULL,
    avaliableSeats  INTEGER NOT NULL,
    FOREIGN KEY (DivID)         REFERENCES Division(DivID),
    FOREIGN KEY (ParticipantID) REFERENCES Participant(ParticipantID)
);
""")

conn.commit()
conn.close()
print("Database 'seatg33k.db' created successfully.")
