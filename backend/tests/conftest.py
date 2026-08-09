"""Test fixtures.

Every test runs against a throwaway JSON database in a tmp directory. The store keeps
its path and its cache in module attributes, so redirecting both is enough to isolate a
test — and it means a test run can never overwrite the data/db.json someone is demoing
from, which is the failure mode worth engineering against here.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.repositories import store  # noqa: E402


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DATA_DIR", tmp_path)
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "db.json")
    monkeypatch.setattr(store, "_db", None)
    yield
    monkeypatch.setattr(store, "_db", None)
