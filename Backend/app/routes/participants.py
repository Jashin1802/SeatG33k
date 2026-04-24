from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import (
    Division,
    DivisionParticipant,
    Participant,
    Seat,
    SeatConfirmation,
    Session,
    SessionEnrollment,
)
from ..utils.security import hash_password
from ..utils.validators import parse_pagination, require_fields

bp = Blueprint("participants", __name__, url_prefix="/api/participants")


@bp.get("")
def list_participants():
    page, page_size = parse_pagination(request.args)
    pagination = Participant.query.order_by(Participant.participant_id.asc()).paginate(
        page=page, per_page=page_size, error_out=False
    )
    return jsonify(
        {
            "success": True,
            "meta": {"page": page, "page_size": page_size, "total": pagination.total},
            "data": [
                {
                    "participant_id": participant.participant_id,
                    "first_name": participant.first_name,
                    "last_name": participant.last_name,
                    "email_address": participant.email_address,
                    "contact_no": participant.contact_no,
                }
                for participant in pagination.items
            ],
        }
    )


@bp.get("/<int:participant_id>")
def get_participant(participant_id: int):
    participant = Participant.query.get_or_404(participant_id)
    return jsonify(
        {
            "success": True,
            "data": {
                "participant_id": participant.participant_id,
                "first_name": participant.first_name,
                "last_name": participant.last_name,
                "contact_no": participant.contact_no,
                "email_address": participant.email_address,
            },
        }
    )


@bp.post("")
def create_participant():
    payload = request.get_json(silent=True) or {}
    require_fields(payload, ["first_name", "last_name", "email_address", "password"])

    participant = Participant(
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        contact_no=payload.get("contact_no"),
        email_address=str(payload["email_address"]).strip().lower(),
        password_hash=hash_password(payload["password"]),
    )
    db.session.add(participant)
    db.session.commit()

    return jsonify({"success": True, "data": {"participant_id": participant.participant_id}}), 201


@bp.patch("/<int:participant_id>")
def update_participant(participant_id: int):
    participant = Participant.query.get_or_404(participant_id)
    payload = request.get_json(silent=True) or {}

    if "first_name" in payload:
        participant.first_name = payload["first_name"]
    if "last_name" in payload:
        participant.last_name = payload["last_name"]
    if "contact_no" in payload:
        participant.contact_no = payload["contact_no"]
    if "email_address" in payload:
        participant.email_address = str(payload["email_address"]).strip().lower()
    if payload.get("password"):
        participant.password_hash = hash_password(payload["password"])

    db.session.commit()
    return jsonify({"success": True, "message": "Participant updated successfully"})


@bp.delete("/<int:participant_id>")
def delete_participant(participant_id: int):
    participant = Participant.query.get_or_404(participant_id)
    db.session.delete(participant)
    db.session.commit()
    return jsonify({"success": True, "message": "Participant deleted successfully"})


@bp.get("/<int:participant_id>/sessions")
def get_participant_sessions(participant_id: int):
    Participant.query.get_or_404(participant_id)
    rows = (
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
        .filter(SessionEnrollment.participant_id == participant_id)
        .order_by(Session.sess_id.asc())
        .all()
    )
    return jsonify(
        {
            "success": True,
            "data": [
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
                for enrollment, session, _, division, seat, confirmation in rows
            ],
        }
    )


@bp.post("/<int:participant_id>/sessions/<int:sess_id>/confirm-seat")
def confirm_participant_seat(participant_id: int, sess_id: int):
    enrollment = SessionEnrollment.query.filter_by(
        participant_id=participant_id, sess_id=sess_id
    ).first()
    if not enrollment:
        return jsonify({"success": False, "message": "Participant is not enrolled in this session."}), 404
    if not enrollment.seat_id:
        return jsonify({"success": False, "message": "No seat assigned yet to confirm."}), 409

    record = SeatConfirmation.query.filter_by(
        participant_id=participant_id, sess_id=sess_id
    ).first()
    if not record:
        record = SeatConfirmation(participant_id=participant_id, sess_id=sess_id, status="confirmed")
        db.session.add(record)
    else:
        record.status = "confirmed"
    db.session.commit()

    return jsonify({"success": True, "message": "Seat confirmed successfully"})


@bp.post("/<int:participant_id>/sessions/<int:sess_id>/reject-seat")
def reject_participant_seat(participant_id: int, sess_id: int):
    enrollment = SessionEnrollment.query.filter_by(
        participant_id=participant_id, sess_id=sess_id
    ).first()
    if not enrollment:
        return jsonify({"success": False, "message": "Participant is not enrolled in this session."}), 404

    enrollment.seat_id = None
    record = SeatConfirmation.query.filter_by(
        participant_id=participant_id, sess_id=sess_id
    ).first()
    if not record:
        record = SeatConfirmation(participant_id=participant_id, sess_id=sess_id, status="rejected")
        db.session.add(record)
    else:
        record.status = "rejected"
    db.session.commit()

    return jsonify({"success": True, "message": "Seat rejected. Manager can reallocate a new seat."})
