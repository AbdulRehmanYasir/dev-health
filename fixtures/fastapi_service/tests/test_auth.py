import pytest
from app.main import app

def test_health():
    assert 200 == 200
