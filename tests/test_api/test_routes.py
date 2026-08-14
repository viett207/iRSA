import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_agent_status(client):
    response = await client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "nodes" in data


@pytest.mark.asyncio
async def test_evaluate_invalid_request(client):
    response = await client.post("/api/v1/evaluate", json={})
    assert response.status_code == 422  # Pydantic validation error for missing application_id

