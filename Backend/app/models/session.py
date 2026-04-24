from datetime import datetime

from ..extensions import db


class Session(db.Model):
    __tablename__ = "session"

    sess_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    max_participants = db.Column(db.Integer, nullable=False)
    starts_at = db.Column(db.String(20))
    ends_at = db.Column(db.String(20))
    status = db.Column(db.String(20), nullable=False, default="scheduled")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
