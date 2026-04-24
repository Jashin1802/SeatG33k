from datetime import datetime

from ..extensions import db


class SeatConfirmation(db.Model):
    __tablename__ = "seat_confirmation"

    sess_id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), nullable=False, default="pending")
    confirmed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
