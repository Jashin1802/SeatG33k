from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Division, Session, SessionDivisionLimit
from ..services.session_service import get_session_availability
from ..utils.validators import parse_pagination, require_fields

bp = Blueprint("sessions", __name__, url_prefix="/api/sessions")

SESSION_LIMITS = {
    "morning session": 20,
    "midday session": 20,
    "afternoon session": 20,
}


@bp.get("")
def list_sessions():
    page, page_size = parse_pagination(request.args)
    status = request.args.get("status")
    query = Session.query
    if status:
        query = query.filter_by(status=status)
    pagination = query.order_by(Session.sess_id.asc()).paginate(page=page, per_page=page_size, error_out=False)
    return jsonify(
        {
            "success": True,
            "meta": {"page": page, "page_size": page_size, "total": pagination.total},
            "data": [
                {
                    "sess_id": session.sess_id,
                    "name": session.name,
                    "max_participants": session.max_participants,
                    "starts_at": session.starts_at,
                    "ends_at": session.ends_at,
                    "status": session.status,
                }
                for session in pagination.items
            ],
        }
    )


@bp.post("")
def create_session():
    payload = request.get_json(silent=True) or {}
    require_fields(payload, ["name", "max_participants"])
    normalized_name = str(payload["name"]).strip().lower()
    if normalized_name not in SESSION_LIMITS:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Session name must be one of: Morning Session, Midday Session, Afternoon Session.",
                }
            ),
            400,
        )

    try:
        provided_max = int(payload["max_participants"])
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "max_participants must be an integer."}), 400
    required_max = SESSION_LIMITS[normalized_name]
    if provided_max != required_max:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"{payload['name']} must have max_participants set to {required_max}.",
                }
            ),
            400,
        )

    existing = Session.query.filter(db.func.lower(Session.name) == normalized_name).first()
    if existing:
        return jsonify({"success": False, "message": f"Session '{payload['name']}' already exists."}), 409

    session = Session(
        name=str(payload["name"]).strip(),
        max_participants=required_max,
        status=payload.get("status", "scheduled"),
    )
    db.session.add(session)
    db.session.commit()

    # Default per-division quotas from project constraints.
    default_limits = {"division a": 8, "division b": 6, "division c": 6}
    divisions = Division.query.all()
    for division in divisions:
        max_seats = default_limits.get(division.name.strip().lower())
        if max_seats:
            db.session.add(
                SessionDivisionLimit(
                    sess_id=session.sess_id,
                    div_id=division.div_id,
                    max_seats=max_seats,
                )
            )
    db.session.commit()

    return jsonify({"success": True, "data": {"sess_id": session.sess_id}}), 201


@bp.patch("/<int:sess_id>/status")
def update_session_status(sess_id: int):
    payload = request.get_json(silent=True) or {}
    require_fields(payload, ["status"])
    allowed = {"scheduled", "open", "closed", "cancelled"}
    if payload["status"] not in allowed:
        return jsonify({"success": False, "message": "Invalid session status"}), 400

    session = Session.query.get_or_404(sess_id)
    session.status = payload["status"]
    db.session.commit()
    return jsonify({"success": True, "message": "Session status updated"})


@bp.get("/<int:sess_id>/capacity")
def get_capacity(sess_id: int):
    return jsonify({"success": True, "data": get_session_availability(sess_id)})


@bp.get("/<int:sess_id>/division-limits")
def get_division_limits(sess_id: int):
    Session.query.get_or_404(sess_id)
    rows = (
        db.session.query(SessionDivisionLimit, Division)
        .join(Division, Division.div_id == SessionDivisionLimit.div_id)
        .filter(SessionDivisionLimit.sess_id == sess_id)
        .order_by(Division.div_id.asc())
        .all()
    )
    return jsonify(
        {
            "success": True,
            "data": [
                {
                    "division_id": division.div_id,
                    "division_name": division.name,
                    "max_seats": limit.max_seats,
                }
                for limit, division in rows
            ],
        }
    )
