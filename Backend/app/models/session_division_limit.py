from ..extensions import db


class SessionDivisionLimit(db.Model):
    __tablename__ = "session_division_limit"

    sess_id = db.Column(
        db.Integer,
        db.ForeignKey("session.sess_id", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    )
    div_id = db.Column(
        db.Integer,
        db.ForeignKey("division.div_id", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    )
    max_seats = db.Column(db.Integer, nullable=False)
