from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Manager
from ..utils.security import hash_password
from ..utils.validators import parse_pagination, require_fields

bp = Blueprint("managers", __name__, url_prefix="/api/managers")


@bp.get("")
def list_managers():
    page, page_size = parse_pagination(request.args)
    pagination = Manager.query.order_by(Manager.manager_id.asc()).paginate(
        page=page, per_page=page_size, error_out=False
    )
    return jsonify(
        {
            "success": True,
            "meta": {"page": page, "page_size": page_size, "total": pagination.total},
            "data": [
                {
                    "manager_id": manager.manager_id,
                    "first_name": manager.first_name,
                    "last_name": manager.last_name,
                    "email_address": manager.email_address,
                }
                for manager in pagination.items
            ],
        }
    )


@bp.get("/<int:manager_id>")
def get_manager(manager_id: int):
    manager = Manager.query.get_or_404(manager_id)
    return jsonify(
        {
            "success": True,
            "data": {
                "manager_id": manager.manager_id,
                "first_name": manager.first_name,
                "last_name": manager.last_name,
                "contact_no": manager.contact_no,
                "email_address": manager.email_address,
            },
        }
    )


@bp.post("")
def create_manager():
    payload = request.get_json(silent=True) or {}
    require_fields(payload, ["first_name", "last_name", "email_address", "password"])

    manager = Manager(
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        contact_no=payload.get("contact_no"),
        email_address=str(payload["email_address"]).strip().lower(),
        password_hash=hash_password(payload["password"]),
    )
    db.session.add(manager)
    db.session.commit()

    return jsonify({"success": True, "data": {"manager_id": manager.manager_id}}), 201


@bp.patch("/<int:manager_id>")
def update_manager(manager_id: int):
    manager = Manager.query.get_or_404(manager_id)
    payload = request.get_json(silent=True) or {}

    if "first_name" in payload:
        manager.first_name = payload["first_name"]
    if "last_name" in payload:
        manager.last_name = payload["last_name"]
    if "contact_no" in payload:
        manager.contact_no = payload["contact_no"]
    if "email_address" in payload:
        manager.email_address = str(payload["email_address"]).strip().lower()
    if payload.get("password"):
        manager.password_hash = hash_password(payload["password"])

    db.session.commit()
    return jsonify({"success": True, "message": "Manager updated successfully"})


@bp.delete("/<int:manager_id>")
def delete_manager(manager_id: int):
    manager = Manager.query.get_or_404(manager_id)
    db.session.delete(manager)
    db.session.commit()
    return jsonify({"success": True, "message": "Manager deleted successfully"})
