from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import DivisionParticipant, Participant, Seat, Session, SessionEnrollment
from .session_service import ensure_capacity


def allocate_seat(sess_id: int, participant_id: int, preferred_accessible: bool | None = None) -> dict:
    Session.query.get_or_404(sess_id)
    Participant.query.get_or_404(participant_id)
    is_member = DivisionParticipant.query.filter_by(participant_id=participant_id).first()
    if not is_member:
        raise ValueError("Participant must belong to a division before allocation.")

    existing_enrollment = SessionEnrollment.query.filter_by(
        sess_id=sess_id, participant_id=participant_id
    ).first()
    if existing_enrollment and existing_enrollment.seat_id is not None:
        seat = Seat.query.get(existing_enrollment.seat_id)
        return {
            "sess_id": sess_id,
            "participant_id": participant_id,
            "seat_id": existing_enrollment.seat_id,
            "seat_label": seat.seat_label if seat else None,
            "message": "Participant already assigned.",
        }

    ensure_capacity(sess_id)

    query = Seat.query.filter_by(sess_id=sess_id, is_active=True).outerjoin(
        SessionEnrollment, Seat.seat_id == SessionEnrollment.seat_id
    ).filter(SessionEnrollment.seat_id.is_(None))

    if preferred_accessible is True:
        query = query.order_by(Seat.is_accessible.desc(), Seat.seat_label.asc())
    else:
        query = query.order_by(Seat.seat_label.asc())

    seat = query.first()
    if not seat:
        raise ValueError("No available seats for this session.")

    try:
        if existing_enrollment:
            existing_enrollment.seat_id = seat.seat_id
        else:
            existing_enrollment = SessionEnrollment(
                sess_id=sess_id,
                participant_id=participant_id,
                seat_id=seat.seat_id,
            )
            db.session.add(existing_enrollment)
        db.session.commit()
    except IntegrityError as error:
        db.session.rollback()
        raise ValueError("Seat allocation conflict detected. Please retry.") from error

    return {
        "sess_id": sess_id,
        "participant_id": participant_id,
        "seat_id": seat.seat_id,
        "seat_label": seat.seat_label,
        "message": "Seat allocated successfully.",
    }


def unassign_seat(sess_id: int, participant_id: int) -> dict:
    enrollment = SessionEnrollment.query.filter_by(
        sess_id=sess_id, participant_id=participant_id
    ).first()
    if not enrollment:
        raise ValueError("Enrollment not found for this participant and session.")
    enrollment.seat_id = None
    db.session.commit()
    return {
        "sess_id": sess_id,
        "participant_id": participant_id,
        "message": "Seat unassigned successfully.",
    }
