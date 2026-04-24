BEGIN TRANSACTION;

INSERT INTO manager (first_name, last_name, contact_no, email_address, password_hash)
VALUES ('Andile', 'Mahlaba', '0000000000', 'andile.manager@example.com', 'replace-with-real-hash');

INSERT INTO participant (first_name, last_name, contact_no, email_address, password_hash)
VALUES
('Lerato', 'Khumalo', '0000000001', 'lerato@example.com', 'replace-with-real-hash'),
('Thabo', 'Mokoena', '0000000002', 'thabo@example.com', 'replace-with-real-hash');

INSERT INTO division (manager_id, name)
VALUES (1, 'Division A');

INSERT INTO division_participant (div_id, participant_id)
VALUES
(1, 1),
(1, 2);

INSERT INTO session (div_id, name, max_participants, status)
VALUES (1, 'Morning Session', 30, 'open');

INSERT INTO seat (sess_id, seat_label, is_accessible, is_active)
VALUES
(1, 'A1', 0, 1),
(1, 'A2', 1, 1);

INSERT INTO session_enrollment (sess_id, participant_id, seat_id)
VALUES
(1, 1, 1),
(1, 2, 2);

COMMIT;
