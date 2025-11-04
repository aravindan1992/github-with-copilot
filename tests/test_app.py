"""
Test suite for the FastAPI activities application.
Tests the GET /activities endpoint, POST signup, and DELETE unregister functionality.
"""

import pytest
from fastapi.testclient import TestClient
from src.app import app, activities

@pytest.fixture
def client():
    """Create a test client instance."""
    return TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    """Reset activities data before each test."""
    # Store original activities
    original = activities.copy()
    # Let the test run
    yield
    # Restore original activities after test
    activities.clear()
    activities.update(original)

def test_get_activities(client):
    """Test GET /activities returns all activities."""
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "Programming Class" in data
    
    # Verify an activity's structure
    chess = data["Chess Club"]
    assert "description" in chess
    assert "schedule" in chess
    assert "max_participants" in chess
    assert "participants" in chess
    assert isinstance(chess["participants"], list)

def test_signup_success(client):
    """Test successful participant signup."""
    activity = "Chess Club"
    email = "newstudent@mergington.edu"
    
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for {activity}"
    
    # Verify participant was added
    assert email in activities[activity]["participants"]

def test_signup_duplicate(client):
    """Test signing up a participant who is already registered."""
    activity = "Chess Club"
    email = "michael@mergington.edu"  # Already in Chess Club
    
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 400
    assert "already signed up" in response.json()["detail"].lower()

def test_signup_invalid_activity(client):
    """Test signing up for a non-existent activity."""
    response = client.post("/activities/InvalidClub/signup?email=test@mergington.edu")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_unregister_success(client):
    """Test successful participant unregistration."""
    activity = "Chess Club"
    email = "michael@mergington.edu"
    
    response = client.delete(f"/activities/{activity}/participants?email={email}")
    assert response.status_code == 200
    assert response.json()["message"] == f"Unregistered {email} from {activity}"
    
    # Verify participant was removed
    assert email not in activities[activity]["participants"]

def test_unregister_not_found(client):
    """Test unregistering a participant who isn't registered."""
    activity = "Chess Club"
    email = "notregistered@mergington.edu"
    
    response = client.delete(f"/activities/{activity}/participants?email={email}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_unregister_invalid_activity(client):
    """Test unregistering from a non-existent activity."""
    response = client.delete("/activities/InvalidClub/participants?email=test@mergington.edu")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()