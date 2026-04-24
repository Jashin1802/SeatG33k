from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .config import Config
from .extensions import db
from .routes import api_bp
from .routes.auth import bp as auth_bp
from .routes.divisions import bp as divisions_bp
from .routes.managers import bp as managers_bp
from .routes.participants import bp as participants_bp
from .routes.seats import bp as seats_bp
from .routes.sessions import bp as sessions_bp


def create_app(config_object: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)
    project_root = Path(__file__).resolve().parents[2]
    frontend_root = project_root / "Frontend"
    public_dir = frontend_root / "public"
    private_dir = frontend_root / "private"
    src_js_dir = frontend_root / "src" / "js"

    db.init_app(app)

    with app.app_context():
        from . import models  # noqa: F401

        db.create_all()

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp)
    app.register_blueprint(managers_bp)
    app.register_blueprint(participants_bp)
    app.register_blueprint(divisions_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(seats_bp)

    @app.get("/")
    def index():
        return send_from_directory(str(public_dir), "Login.html")

    @app.get("/login")
    def login_page():
        return send_from_directory(str(public_dir), "Login.html")

    @app.get("/manager")
    def manager_page():
        return send_from_directory(str(private_dir), "Manager.html")

    @app.get("/participant")
    def participant_page():
        return send_from_directory(str(private_dir), "Participation.html")

    @app.get("/public/<path:filename>")
    def public_assets(filename: str):
        return send_from_directory(str(public_dir), filename)

    @app.get("/private/<path:filename>")
    def private_assets(filename: str):
        return send_from_directory(str(private_dir), filename)

    @app.get("/src/js/<path:filename>")
    def js_assets(filename: str):
        return send_from_directory(str(src_js_dir), filename)

    @app.errorhandler(400)
    @app.errorhandler(404)
    @app.errorhandler(409)
    @app.errorhandler(500)
    def handle_error(error):
        return (
            jsonify(
                {
                    "success": False,
                    "message": getattr(error, "description", str(error)),
                }
            ),
            getattr(error, "code", 500),
        )

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        db.session.rollback()
        return (
            jsonify({"success": False, "message": "Database constraint violation.", "details": str(error.orig)}),
            409,
        )

    @app.errorhandler(SQLAlchemyError)
    def handle_sqlalchemy_error(error):
        db.session.rollback()
        return jsonify({"success": False, "message": "Database operation failed.", "details": str(error)}), 500

    return app
