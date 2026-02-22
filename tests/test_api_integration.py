"""Integration tests for simple_api.py endpoints.

Tests verify all API endpoints return correct structure, status codes,
and serve real scraped data when available.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from fastapi.testclient import TestClient
from simple_api import app, MOCK_LOCATIONS, find_latest_forecast


client = TestClient(app)


# --- Root & Health ---

class TestHealthEndpoints:
    def test_root_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data

    def test_health_returns_healthy(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


# --- Locations ---

class TestLocationsEndpoint:
    def test_get_all_locations(self):
        response = client.get("/api/v1/locations")
        assert response.status_code == 200
        data = response.json()
        assert "locations" in data
        assert "total" in data
        assert data["total"] == len(MOCK_LOCATIONS)
        assert len(data["locations"]) == len(MOCK_LOCATIONS)

    def test_location_has_required_fields(self):
        response = client.get("/api/v1/locations")
        loc = response.json()["locations"][0]
        required = ["id", "name", "area", "latitude", "longitude", "elevation_m", "classification"]
        for field in required:
            assert field in loc, f"Missing field: {field}"

    def test_search_by_name(self):
        response = client.get("/api/v1/locations", params={"search": "Beinn Eighe"})
        data = response.json()
        assert data["total"] >= 1
        assert any("Beinn Eighe" in loc["name"] for loc in data["locations"])

    def test_search_by_area(self):
        response = client.get("/api/v1/locations", params={"search": "Torridon"})
        data = response.json()
        assert data["total"] >= 1
        assert all("Torridon" in loc["area"] or "torridon" in loc["name"].lower() for loc in data["locations"])

    def test_filter_by_area(self):
        response = client.get("/api/v1/locations", params={"area": "Torridon"})
        data = response.json()
        assert data["total"] >= 1
        assert all(loc["area"] == "Torridon" for loc in data["locations"])

    def test_filter_by_classification(self):
        response = client.get("/api/v1/locations", params={"classification": "munro"})
        data = response.json()
        assert data["total"] >= 1
        assert all(loc["classification"] == "munro" for loc in data["locations"])

    def test_limit_parameter(self):
        response = client.get("/api/v1/locations", params={"limit": 5})
        data = response.json()
        assert len(data["locations"]) <= 5

    def test_search_no_results(self):
        response = client.get("/api/v1/locations", params={"search": "nonexistent_mountain_xyz"})
        data = response.json()
        assert data["total"] == 0
        assert len(data["locations"]) == 0


# --- Weather ---

class TestWeatherEndpoint:
    def test_get_weather_for_known_location(self):
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        assert response.status_code == 200
        data = response.json()
        assert "location" in data
        assert "forecasts" in data
        assert "last_updated" in data
        assert "data_source" in data

    def test_weather_404_for_unknown_location(self):
        response = client.get("/api/v1/weather/nonexistent-mountain-xyz")
        assert response.status_code == 404

    def test_forecast_structure(self):
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        data = response.json()
        assert len(data["forecasts"]) >= 1

        day = data["forecasts"][0]
        assert "date" in day
        assert "summary" in day
        assert "periods" in day

        summary = day["summary"]
        for field in ["max_temp_c", "min_temp_c", "max_wind_speed_kph", "total_precipitation_mm", "overall_hiking_score"]:
            assert field in summary, f"Missing summary field: {field}"

    def test_period_structure(self):
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        period = response.json()["forecasts"][0]["periods"][0]

        required = [
            "period_type", "temperature_c", "wind_speed_kph",
            "precipitation_mm", "precipitation_type", "hiking_score", "risk_level"
        ]
        for field in required:
            assert field in period, f"Missing period field: {field}"

    def test_hiking_score_range(self):
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        for day in response.json()["forecasts"]:
            for period in day["periods"]:
                assert 1.0 <= period["hiking_score"] <= 10.0
                assert period["risk_level"] in ["low", "moderate", "high", "extreme"]

    def test_precipitation_type_values(self):
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        for day in response.json()["forecasts"]:
            for period in day["periods"]:
                assert period["precipitation_type"] in ["none", "rain", "snow", "sleet"]

    def test_data_source_is_scraped_when_forecast_exists(self):
        """Locations with scraped forecasts should show real data source"""
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        data = response.json()
        # Beinn Eighe always has scraped data
        if find_latest_forecast("Beinn Eighe"):
            assert "scraped" in data["data_source"]

    def test_estimated_data_has_alert(self):
        """Locations falling back to estimated data should include info alert"""
        # Find a location without real data (if any exist)
        for loc in MOCK_LOCATIONS:
            if not find_latest_forecast(loc["name"]):
                response = client.get(f"/api/v1/weather/{loc['id']}")
                data = response.json()
                assert "estimated" in data["data_source"]
                assert len(data["alerts"]) >= 1
                assert data["alerts"][0]["severity"] == "info"
                return
        # All locations have real data — that's fine, skip this test
        pytest.skip("All locations have real forecast data")

    def test_multiple_locations_weather(self):
        """Verify several locations across different areas return valid data"""
        test_ids = ["torridon-beinn-eighe", "glencoe-bidean-nam-bian", "cairngorms-ben-macdui"]
        for lid in test_ids:
            response = client.get(f"/api/v1/weather/{lid}")
            assert response.status_code == 200, f"Failed for {lid}"
            data = response.json()
            assert len(data["forecasts"]) >= 1, f"No forecasts for {lid}"


# --- Compare ---

class TestCompareEndpoint:
    def test_compare_two_locations(self):
        response = client.get("/api/v1/weather/compare", params={
            "location_ids": "torridon-beinn-eighe,glencoe-bidean-nam-bian"
        })
        assert response.status_code == 200
        data = response.json()
        assert "comparisons" in data
        assert len(data["comparisons"]) == 2

    def test_compare_returns_forecast_structure(self):
        response = client.get("/api/v1/weather/compare", params={
            "location_ids": "torridon-beinn-eighe"
        })
        comp = response.json()["comparisons"][0]
        assert "location" in comp
        assert "forecasts" in comp
        assert "data_source" in comp

    def test_compare_skips_unknown_locations(self):
        response = client.get("/api/v1/weather/compare", params={
            "location_ids": "torridon-beinn-eighe,nonexistent-xyz"
        })
        data = response.json()
        assert len(data["comparisons"]) == 1

    def test_compare_uses_real_data(self):
        """Compare endpoint should serve real data when available"""
        response = client.get("/api/v1/weather/compare", params={
            "location_ids": "torridon-beinn-eighe"
        })
        comp = response.json()["comparisons"][0]
        if find_latest_forecast("Beinn Eighe"):
            assert "scraped" in comp["data_source"]


# --- Areas ---

class TestAreasEndpoint:
    def test_get_areas(self):
        response = client.get("/api/v1/areas")
        assert response.status_code == 200
        areas = response.json()
        assert len(areas) >= 1

    def test_area_structure(self):
        response = client.get("/api/v1/areas")
        area = response.json()[0]
        assert "id" in area
        assert "name" in area
        assert "locationCount" in area
        assert area["locationCount"] >= 1

    def test_area_count_matches_locations(self):
        """Each area's locationCount should match actual locations in that area"""
        areas = client.get("/api/v1/areas").json()
        for area in areas:
            locs = client.get("/api/v1/locations", params={"area": area["name"]}).json()
            assert locs["total"] == area["locationCount"], (
                f"Area '{area['name']}': locationCount={area['locationCount']} but found {locs['total']} locations"
            )


# --- Metrics ---

class TestMetricsEndpoint:
    def test_post_metrics_accepted(self):
        response = client.post("/api/metrics", json={"event": "page_view"})
        assert response.status_code == 200
        assert response.json()["status"] == "received"


# --- Data Integrity ---

class TestDataIntegrity:
    def test_all_location_ids_unique(self):
        ids = [loc["id"] for loc in MOCK_LOCATIONS]
        assert len(ids) == len(set(ids)), "Duplicate location IDs found"

    def test_all_locations_have_valid_coordinates(self):
        for loc in MOCK_LOCATIONS:
            assert -90 <= loc["latitude"] <= 90, f"{loc['name']}: invalid latitude"
            assert -180 <= loc["longitude"] <= 180, f"{loc['name']}: invalid longitude"

    def test_all_locations_have_positive_elevation(self):
        for loc in MOCK_LOCATIONS:
            assert loc["elevation_m"] > 0, f"{loc['name']}: elevation must be positive"

    def test_scoring_consistency(self):
        """Hiking scores should be consistent between summary and periods"""
        response = client.get("/api/v1/weather/torridon-beinn-eighe")
        for day in response.json()["forecasts"]:
            period_scores = [p["hiking_score"] for p in day["periods"]]
            avg = round(sum(period_scores) / len(period_scores), 1)
            assert abs(day["summary"]["overall_hiking_score"] - avg) < 0.2, (
                f"Summary score {day['summary']['overall_hiking_score']} doesn't match period avg {avg}"
            )

    def test_find_latest_forecast_handles_special_chars(self):
        """Verify the forecast finder handles apostrophes and parentheses"""
        # These names have special chars that previously caused matching failures
        special_names = ["A'Mhaighdean", "Beinn na Caillich (Knoydart)", "Stob Ban (Grey Corries)"]
        for name in special_names:
            loc = next((l for l in MOCK_LOCATIONS if l["name"] == name), None)
            if loc:
                result = find_latest_forecast(name)
                assert result is not None, f"find_latest_forecast failed for '{name}'"
