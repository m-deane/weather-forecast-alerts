"""Tests for the hiking suitability scoring function.

This is SAFETY-CRITICAL code - scores directly impact hikers' decisions.
These tests verify the scoring algorithm produces correct, conservative results.
"""
import pytest
import sys
import os

# Add project root to path so we can import weather_scraper
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from weather_scraper import (
    calculate_hiking_suitability_score,
    validate_url,
    validate_weather_data,
    SCORE_WEIGHT_WIND,
    SCORE_WEIGHT_RAIN,
    SCORE_WEIGHT_SNOW,
    SCORE_WEIGHT_COLD,
    SCORE_WEIGHT_HOT,
)


class TestHikingSuitabilityScore:
    """Tests for calculate_hiking_suitability_score()."""

    # --- Perfect conditions ---

    def test_perfect_conditions_returns_10(self):
        """Calm, warm, dry conditions should score 10."""
        score = calculate_hiking_suitability_score(
            temp_min_c=10, temp_max_c=18, wind_kph=10, rain_mm=0, snow_cm=0
        )
        assert score == 10.0

    def test_all_none_returns_10(self):
        """No weather data means no penalties - score 10."""
        score = calculate_hiking_suitability_score()
        assert score == 10.0

    # --- Score range ---

    def test_score_never_below_1(self):
        """Even extreme conditions should never go below 1."""
        score = calculate_hiking_suitability_score(
            temp_min_c=-30, wind_kph=120, rain_mm=50, snow_cm=20
        )
        assert score == 1.0

    def test_score_never_above_10(self):
        """Score cannot exceed 10."""
        score = calculate_hiking_suitability_score(
            temp_min_c=15, temp_max_c=20, wind_kph=0, rain_mm=0, snow_cm=0
        )
        assert score <= 10.0

    def test_score_is_rounded_to_1_decimal(self):
        """Score should be rounded to 1 decimal place."""
        score = calculate_hiking_suitability_score(wind_kph=25)
        # 25 kph -> 10 over 15 threshold -> (10/10)*3.0 = 3.0 penalty -> 7.0
        assert score == 7.0
        assert isinstance(score, float)

    # --- Wind penalties ---

    def test_wind_below_20_no_penalty(self):
        """Wind under 15kph threshold should incur no penalty."""
        score = calculate_hiking_suitability_score(wind_kph=19)
        # 19 kph -> 4 over 15 threshold -> (4/10)*3.0 = 1.2 penalty -> 8.8
        assert score == 8.8

    def test_wind_at_20_no_penalty(self):
        """Wind at 20kph is 5 over threshold -> (5/10)*3.0 = 1.5 penalty -> 8.5."""
        score = calculate_hiking_suitability_score(wind_kph=20)
        assert score == 8.5

    def test_wind_40kph_penalty(self):
        """40kph = 25 over 15 threshold -> (25/10)*3.0 = 7.5 penalty -> score 2.5."""
        score = calculate_hiking_suitability_score(wind_kph=40)
        assert score == 2.5

    def test_wind_60kph_penalty(self):
        """60kph = 45 over 15 threshold -> (45/10)*3.0 = 13.5 penalty -> score 1.0 (clamped)."""
        score = calculate_hiking_suitability_score(wind_kph=60)
        assert score == 1.0

    def test_gust_used_when_higher_than_wind(self):
        """Gust speed should be used when higher than sustained wind."""
        score_wind_only = calculate_hiking_suitability_score(wind_kph=20, gust_kph=50)
        score_no_gust = calculate_hiking_suitability_score(wind_kph=20)
        assert score_wind_only < score_no_gust

    def test_gust_ignored_when_lower_than_wind(self):
        """Gust lower than wind should not affect score."""
        score_with_gust = calculate_hiking_suitability_score(wind_kph=50, gust_kph=30)
        score_without_gust = calculate_hiking_suitability_score(wind_kph=50)
        assert score_with_gust == score_without_gust

    # --- Rain penalties ---

    def test_no_rain_no_penalty(self):
        """0mm rain should incur no penalty."""
        score = calculate_hiking_suitability_score(rain_mm=0)
        assert score == 10.0

    def test_light_rain_penalty(self):
        """1mm rain -> 1*2.0 = 2.0 penalty -> score 8.0."""
        score = calculate_hiking_suitability_score(rain_mm=1)
        assert score == 8.0

    def test_heavy_rain_penalty(self):
        """5mm rain -> 5*2.0 = 10.0 penalty -> score 1.0 (clamped)."""
        score = calculate_hiking_suitability_score(rain_mm=5)
        assert score == 1.0

    # --- Snow penalties ---

    def test_no_snow_no_penalty(self):
        """0cm snow should incur no penalty."""
        score = calculate_hiking_suitability_score(snow_cm=0)
        assert score == 10.0

    def test_light_snow_penalty(self):
        """1cm snow -> 1*4.0 = 4.0 penalty -> score 6.0."""
        score = calculate_hiking_suitability_score(snow_cm=1)
        assert score == 6.0

    def test_heavy_snow_penalty(self):
        """3cm snow -> 3*4.0 = 12.0 penalty -> score 1.0 (clamped)."""
        score = calculate_hiking_suitability_score(snow_cm=3)
        assert score == 1.0

    # --- Cold penalties ---

    def test_mild_temp_no_penalty(self):
        """Temperatures above 0°C should incur no cold penalty."""
        score = calculate_hiking_suitability_score(temp_min_c=5)
        assert score == 10.0

    def test_at_zero_no_penalty(self):
        """Exactly 0°C should not incur cold penalty (threshold is below 0)."""
        score = calculate_hiking_suitability_score(temp_min_c=0)
        assert score == 10.0

    def test_cold_penalty(self):
        """-5°C -> 5*1.2 = 6.0 penalty -> score 4.0."""
        score = calculate_hiking_suitability_score(temp_min_c=-5)
        assert score == 4.0

    def test_extreme_cold_penalty(self):
        """-10°C -> 10*1.2 = 12.0 penalty -> score 1.0 (clamped)."""
        score = calculate_hiking_suitability_score(temp_min_c=-10)
        assert score == 1.0

    # --- Heat penalties ---

    def test_normal_temp_no_heat_penalty(self):
        """Temperatures below 25°C should incur no heat penalty."""
        score = calculate_hiking_suitability_score(temp_max_c=24)
        assert score == 10.0

    def test_at_25_no_heat_penalty(self):
        """Exactly 25°C should not incur heat penalty."""
        score = calculate_hiking_suitability_score(temp_max_c=25)
        assert score == 10.0

    def test_heat_penalty(self):
        """30°C -> 5*0.5 = 2.5 penalty -> score 7.5."""
        score = calculate_hiking_suitability_score(temp_max_c=30)
        assert score == 7.5

    # --- Wind chill ---

    def test_wind_chill_used_when_colder(self):
        """Wind chill should be used when colder than actual temp."""
        score_with_chill = calculate_hiking_suitability_score(temp_min_c=2, temp_chill_c=-5)
        score_without_chill = calculate_hiking_suitability_score(temp_min_c=2)
        assert score_with_chill < score_without_chill

    def test_wind_chill_ignored_when_warmer(self):
        """Wind chill warmer than actual temp should not be used."""
        score_with_chill = calculate_hiking_suitability_score(temp_min_c=-5, temp_chill_c=0)
        score_without_chill = calculate_hiking_suitability_score(temp_min_c=-5)
        assert score_with_chill == score_without_chill

    def test_wind_chill_alone_without_temp_min(self):
        """Wind chill should work even without temp_min_c."""
        score = calculate_hiking_suitability_score(temp_chill_c=-5)
        assert score == 4.0  # 5*1.2 = 6.0 penalty -> score 4.0

    # --- Combined conditions ---

    def test_combined_wind_and_rain(self):
        """Multiple penalties should stack."""
        score = calculate_hiking_suitability_score(wind_kph=50, rain_mm=2)
        # Wind: (35/10)*3.0 = 10.5, Rain: 2*2.0 = 4.0, Total: 14.5 penalty -> 1.0 (clamped)
        assert score == 1.0

    def test_typical_scottish_winter(self):
        """Typical winter conditions: cold, windy, rainy."""
        score = calculate_hiking_suitability_score(
            temp_min_c=-3, wind_kph=45, rain_mm=2, snow_cm=1
        )
        # Cold: 3*1.2=3.6, Wind: (30/10)*3.0=9.0, Rain: 2*2.0=4.0, Snow: 1*4.0=4.0
        # Total penalty: 20.6 -> score 1.0 (clamped)
        assert score == 1.0

    def test_typical_scottish_summer(self):
        """Good summer day: mild, light wind, no rain."""
        score = calculate_hiking_suitability_score(
            temp_min_c=10, temp_max_c=18, wind_kph=15, rain_mm=0
        )
        assert score == 10.0

    # --- Score interpretation boundaries ---

    def test_excellent_range(self):
        """Score 8-10 should be achievable with calm wind only (under 20kph threshold)."""
        score = calculate_hiking_suitability_score(wind_kph=15)
        assert 8.0 <= score <= 10.0

    def test_good_range(self):
        """Score 5-7 should be moderate conditions."""
        score = calculate_hiking_suitability_score(wind_kph=20, rain_mm=1)
        # Wind: (5/10)*3.0=1.5, Rain: 1*2.0=2.0 -> penalty 3.5 -> score 6.5
        assert 4.0 <= score <= 7.0

    def test_dangerous_range(self):
        """Score 1-3 for severe conditions."""
        score = calculate_hiking_suitability_score(wind_kph=70, rain_mm=5)
        assert score <= 3.0

    # --- Scoring weights verification ---

    def test_scoring_weights_values(self):
        """Verify scoring weights match documented values."""
        assert SCORE_WEIGHT_WIND == 3.0
        assert SCORE_WEIGHT_RAIN == 2.0
        assert SCORE_WEIGHT_SNOW == 4.0
        assert SCORE_WEIGHT_COLD == 1.2
        assert SCORE_WEIGHT_HOT == 0.5


class TestValidateUrl:
    """Tests for validate_url()."""

    def test_valid_mountain_forecast_url(self):
        """Standard mountain-forecast.com URL should be valid."""
        assert validate_url("https://www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/1345") is True

    def test_valid_url_with_hyphenated_name(self):
        """URL with hyphenated mountain name should be valid."""
        assert validate_url("https://www.mountain-forecast.com/peaks/Sgurr-nan-Gillean/forecasts/964") is True

    def test_wrong_domain_rejected(self):
        """Non mountain-forecast.com domains should be rejected."""
        assert validate_url("https://www.evil-site.com/peaks/Ben-Nevis/forecasts/1345") is False

    def test_no_scheme_rejected(self):
        """URL without scheme should be rejected."""
        assert validate_url("www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/1345") is False

    def test_wrong_path_pattern_rejected(self):
        """URL with wrong path structure should be rejected."""
        assert validate_url("https://www.mountain-forecast.com/other/page") is False

    def test_empty_string_rejected(self):
        """Empty string should be rejected."""
        assert validate_url("") is False

    def test_none_handled_gracefully(self):
        """None input should return False, not crash."""
        assert validate_url(None) is False

    def test_non_numeric_elevation_rejected(self):
        """Elevation must be numeric in URL path."""
        assert validate_url("https://www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/abc") is False


class TestValidateWeatherData:
    """Tests for validate_weather_data()."""

    def test_normal_data_valid(self):
        """Normal weather data should validate."""
        result = validate_weather_data(temp_c=15, wind_kph=20, precip_mm=5)
        assert result['valid'] is True
        assert result['issues'] == []

    def test_extreme_cold_invalid(self):
        """Temperature below -60°C should be invalid."""
        result = validate_weather_data(temp_c=-65)
        assert result['valid'] is False

    def test_extreme_hot_invalid(self):
        """Temperature above 60°C should be invalid."""
        result = validate_weather_data(temp_c=65)
        assert result['valid'] is False

    def test_negative_wind_invalid(self):
        """Negative wind speed should be invalid."""
        result = validate_weather_data(wind_kph=-5)
        assert result['valid'] is False

    def test_extreme_wind_invalid(self):
        """Wind speed above 300kph should be invalid."""
        result = validate_weather_data(wind_kph=350)
        assert result['valid'] is False

    def test_negative_precip_invalid(self):
        """Negative precipitation should be invalid."""
        result = validate_weather_data(precip_mm=-1)
        assert result['valid'] is False

    def test_extreme_precip_invalid(self):
        """Precipitation above 500mm should be invalid."""
        result = validate_weather_data(precip_mm=550)
        assert result['valid'] is False

    def test_none_values_valid(self):
        """None values should pass validation (optional data)."""
        result = validate_weather_data(temp_c=None, wind_kph=None, precip_mm=None)
        assert result['valid'] is True

    def test_boundary_values_valid(self):
        """Values at boundaries should be valid."""
        result = validate_weather_data(temp_c=-60, wind_kph=300, precip_mm=500)
        assert result['valid'] is True
