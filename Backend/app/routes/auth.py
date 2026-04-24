from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import (
    Division,
    DivisionParticipant,
    Manager,
    Participant,
    Seat,
    SeatConfirmation,
    Session,
    SessionEnrollment,
)
from ..utils.security import verify_password
from ..utils.validators import require_fields

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    require_fields(payload, ["email_address", "password"])
    email_address = str(payload["email_address"]).strip().lower()

    manager = Manager.query.filter_by(email_address=email_address).first()
    if not manager or not verify_password(manager.password_hash, payload["password"]):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    return jsonify(
        {
            "success": True,
            "message": "Login successful",
            "user_type": "manager",
            "data": {
                "manager_id": manager.manager_id,
                "first_name": manager.first_name,
                "last_name": manager.last_name,
                "email_address": manager.email_address,
            },
        }
    )


@bp.post("/participant/login")
def participant_login():
    payload = request.get_json(silent=True) or {}
    require_fields(payload, ["email_address", "password"])
    email_address = str(payload["email_address"]).strip().lower()

    participant = Participant.query.filter_by(email_address=email_address).first()
    if not participant or not verify_password(participant.password_hash, payload["password"]):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    allocations = (
        db.session.query(SessionEnrollment, Session, DivisionParticipant, Division, Seat, SeatConfirmation)
        .join(Session, Session.sess_id == SessionEnrollment.sess_id)
        .join(
            DivisionParticipant,
            DivisionParticipant.participant_id == SessionEnrollment.participant_id,
        )
        .join(Division, Division.div_id == DivisionParticipant.div_id)
        .outerjoin(Seat, Seat.seat_id == SessionEnrollment.seat_id)
        .outerjoin(
            SeatConfirmation,
            db.and_(
                SeatConfirmation.sess_id == SessionEnrollment.sess_id,
                SeatConfirmation.participant_id == SessionEnrollment.participant_id,
            ),
        )
        .filter(SessionEnrollment.participant_id == participant.participant_id)
        .order_by(Session.sess_id.asc())
        .all()
    )

    return jsonify(
        {
            "success": True,
            "message": "Login successful",
            "user_type": "participant",
            "data": {
                "participant_id": participant.participant_id,
                "first_name": participant.first_name,
                "last_name": participant.last_name,
                "email_address": participant.email_address,
                "allocated_sessions": [
                    {
                        "sess_id": session.sess_id,
                        "session_name": session.name,
                        "starts_at": session.starts_at,
                        "ends_at": session.ends_at,
                        "division_id": division.div_id,
                        "division_name": division.name,
                        "status": session.status,
                        "seat_id": enrollment.seat_id,
                        "seat_label": seat.seat_label if seat else None,
                        "seat_confirmation_status": confirmation.status if confirmation else "pending",
                        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                    }
                    for enrollment, session, _, division, seat, confirmation in allocations
                ],
            },
        }
    )
