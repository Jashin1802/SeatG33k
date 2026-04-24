import os
from pathlib import Path


class Config:
    _default_db_path = Path(__file__).resolve().parents[2] / "Database" / "seatg33k.db"
    SECRET_KEY = os.getenv("SECRET_KEY", "dev")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{_default_db_path.as_posix()}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
