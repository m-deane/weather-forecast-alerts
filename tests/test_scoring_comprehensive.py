"""
Comprehensive Safety Testing for Hiking Suitability Scoring Algorithm

SAFETY-CRITICAL: These tests validate the core algorithm that influences
user decisions in potentially life-threatening situations.

Priority: P0 - MUST PASS before any deployment
Coverage Target: 95%+ of scoring logic
Professional Review: Required before production use

Test Categories:
1. Perfect Conditions (Score 8-10)
2. Good Conditions (Score 6-7)
3. Challenging Conditions (Score 4-5)
4. Dangerous Conditions (Score 2-3)
5. Extreme Danger (Score 1)
6. Edge Cases and Boundary Conditions
7. Multiple Danger Factor Interactions
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from weather_scraper import calculate_hiking_suitability_score


class TestPerfectConditions:
    """Test scoring for perfect/excellent hiking conditions (8-10)"""

    def test_perfect_summer_day(self):
        """Perfect summer day: mild temps, light wind, no precipitation"""
        score = calculate_hiking_suitability_score(
            temp_min_c=15, temp_max_c=20, wind_kph=10, rain_mm=0, snow_cm=0
        )
        assert score >= 8, f"Perfect conditions should score ≥8, got {score}"
        assert score <= 10, f"Score should never exceed 10, got {score}"

    def test_excellent_spring_conditions(self):
        """Excellent spring: cool but dry, calm winds"""
        score = calculate_hiking_suitability_score(
            temp_min_c=8, temp_max_c=15, wind_kph=15, rain_mm=0, snow_cm=0
        )
        assert score >= 8, f"Excellent spring conditions should score ≥8, got {score}"

    def test_ideal_autumn_hiking(self):
        """Ideal autumn: crisp temps, minimal wind"""
        score = calculate_hiking_suitability_score(
            temp_min_c=10, temp_max_c=18, wind_kph=20, rain_mm=0, snow_cm=0
        )
        assert score >= 7, f"Ideal autumn should score ≥7, got {score}"

    def test_warm_but_safe(self):
        """Warm but below heat threshold"""
        score = calculate_hiking_suitability_score(
            temp_min_c=18, temp_max_c=24, wind_kph=5, rain_mm=0, snow_cm=0
        )
        assert score >= 8, f"Warm but safe should score ≥8, got {score}"


class TestGoodConditions:
    """Test scoring for good but cautious conditions (6-7)"""

    def test_light_rain_reduces_score(self):
        """Light rain should reduce score but still be hikeable"""
        score = calculate_hiking_suitability_score(
            temp_min_c=12, temp_max_c=18, wind_kph=20, rain_mm=2, snow_cm=0
        )
        assert 5 <= score <= 7, f"Light rain should score 5-7, got {score}"

    def test_moderate_wind(self):
        """Moderate winds (40kph) should reduce score"""
        score = calculate_hiking_suitability_score(
            temp_min_c=10, temp_max_c=15, wind_kph=40, rain_mm=0, snow_cm=0
        )
        assert 5 <= score <= 8, f"Moderate wind should score 5-8, got {score}"

    def test_cool_but_manageable(self):
        """Cool temperatures (5°C) should still be good"""
        score = calculate_hiking_suitability_score(
            temp_min_c=5, temp_max_c=10, wind_kph=20, rain_mm=0, snow_cm=0
        )
        assert score >= 6, f"Cool but manageable should score ≥6, got {score}"


class TestChallengingConditions:
    """Test scoring for challenging conditions (4-5)"""

    def test_freezing_temps(self):
        """Freezing temperatures without wind chill"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-5, temp_max_c=2, wind_kph=20, rain_mm=0, snow_cm=0
        )
        assert 3 <= score <= 6, f"Freezing temps should score 3-6, got {score}"

    def test_strong_winds(self):
        """Strong winds (60kph) are challenging"""
        score = calculate_hiking_suitability_score(
            temp_min_c=8, temp_max_c=12, wind_kph=60, rain_mm=0, snow_cm=0
        )
        assert 2 <= score <= 5, f"Strong winds should score 2-5, got {score}"

    def test_moderate_rain(self):
        """Moderate rain makes hiking challenging"""
        score = calculate_hiking_suitability_score(
            temp_min_c=10, temp_max_c=15, wind_kph=25, rain_mm=5, snow_cm=0
        )
        assert 2 <= score <= 5, f"Moderate rain should score 2-5, got {score}"

    def test_light_snow(self):
        """Light snow conditions"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-2, temp_max_c=1, wind_kph=25, rain_mm=0, snow_cm=2
        )
        assert 2 <= score <= 5, f"Light snow should score 2-5, got {score}"


class TestDangerousConditions:
    """Test scoring for dangerous conditions (2-3)"""

    def test_severe_cold(self):
        """Severe cold (-15°C) is dangerous"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-15, temp_max_c=-10, wind_kph=30, rain_mm=0, snow_cm=0
        )
        assert score <= 3, f"Severe cold should score ≤3, got {score}"
        assert score >= 1, f"Score should never be <1, got {score}"

    def test_gale_force_winds(self):
        """Gale force winds (70kph) are dangerous"""
        score = calculate_hiking_suitability_score(
            temp_min_c=5, temp_max_c=10, wind_kph=70, rain_mm=0, snow_cm=0
        )
        assert score <= 3, f"Gale force winds should score ≤3, got {score}"

    def test_heavy_rain(self):
        """Heavy rain is dangerous"""
        score = calculate_hiking_suitability_score(
            temp_min_c=8, temp_max_c=12, wind_kph=30, rain_mm=10, snow_cm=0
        )
        assert score <= 3, f"Heavy rain should score ≤3, got {score}"

    def test_moderate_snow(self):
        """Moderate snowfall is dangerous"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-5, temp_max_c=0, wind_kph=35, rain_mm=0, snow_cm=5
        )
        assert score <= 2, f"Moderate snow should score ≤2, got {score}"


class TestExtremeDanger:
    """Test scoring for extreme danger conditions (score = 1)"""

    def test_hurricane_force_winds(self):
        """Hurricane force winds (100+kph) = extreme danger"""
        score = calculate_hiking_suitability_score(
            temp_min_c=5, temp_max_c=10, wind_kph=100, rain_mm=0, snow_cm=0
        )
        assert score == 1.0, f"Hurricane winds MUST score 1.0, got {score}"

    def test_extreme_cold_with_wind_chill(self):
        """Extreme cold with severe wind chill"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-10, temp_max_c=-5, temp_chill_c=-25, wind_kph=50, rain_mm=0, snow_cm=0
        )
        assert score == 1.0, f"Extreme cold + wind chill MUST score 1.0, got {score}"

    def test_blizzard_conditions(self):
        """Blizzard: heavy snow + high winds + cold"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-10, temp_max_c=-5, wind_kph=70, rain_mm=0, snow_cm=15
        )
        assert score == 1.0, f"Blizzard conditions MUST score 1.0, got {score}"

    def test_extreme_precipitation(self):
        """Extreme rainfall"""
        score = calculate_hiking_suitability_score(
            temp_min_c=10, temp_max_c=15, wind_kph=40, rain_mm=20, snow_cm=0
        )
        assert score == 1.0, f"Extreme rain MUST score 1.0, got {score}"


class TestWindChillImpact:
    """Test that wind chill is properly factored into scoring"""

    def test_wind_chill_more_severe_than_temp(self):
        """Wind chill should be used if more severe than actual temp"""
        # -5°C actual, -15°C wind chill
        score_with_chill = calculate_hiking_suitability_score(
            temp_min_c=-5, temp_chill_c=-15, wind_kph=40
        )
        score_without_chill = calculate_hiking_suitability_score(
            temp_min_c=-5, temp_chill_c=None, wind_kph=40
        )
        assert score_with_chill < score_without_chill, \
            "Wind chill should reduce score when more severe"

    def test_wind_chill_ignored_if_less_severe(self):
        """Wind chill should be ignored if actual temp is worse"""
        # This shouldn't happen in real data, but test the logic
        score_with_mild_chill = calculate_hiking_suitability_score(
            temp_min_c=-15, temp_chill_c=-10, wind_kph=30
        )
        score_without = calculate_hiking_suitability_score(
            temp_min_c=-15, temp_chill_c=None, wind_kph=30
        )
        # Should use the more severe temp_min
        assert score_with_mild_chill == score_without


class TestGustVsWind:
    """Test that gusts are properly factored (use max of wind/gust)"""

    def test_gusts_increase_danger(self):
        """Gusts should increase danger if higher than wind"""
        score_with_gusts = calculate_hiking_suitability_score(
            temp_min_c=10, wind_kph=40, gust_kph=70, rain_mm=0
        )
        score_without_gusts = calculate_hiking_suitability_score(
            temp_min_c=10, wind_kph=40, gust_kph=None, rain_mm=0
        )
        assert score_with_gusts < score_without_gusts, \
            "High gusts should reduce score"

    def test_uses_max_of_wind_and_gust(self):
        """Should use whichever is higher: wind or gust"""
        score_high_gust = calculate_hiking_suitability_score(
            temp_min_c=10, wind_kph=30, gust_kph=70, rain_mm=0
        )
        score_high_wind = calculate_hiking_suitability_score(
            temp_min_c=10, wind_kph=70, gust_kph=30, rain_mm=0
        )
        assert score_high_gust == score_high_wind, \
            "Score should be same whether wind or gust is higher"


class TestMultipleDangerFactors:
    """Test interactions between multiple danger factors"""

    def test_cold_plus_wind_compounding(self):
        """Cold + wind should compound danger"""
        score_combined = calculate_hiking_suitability_score(
            temp_min_c=-10, wind_kph=60, rain_mm=0, snow_cm=0
        )
        assert score_combined <= 2, \
            f"Cold + high wind MUST score ≤2, got {score_combined}"

    def test_cold_plus_snow_compounding(self):
        """Cold + snow should compound danger"""
        score_combined = calculate_hiking_suitability_score(
            temp_min_c=-5, wind_kph=30, snow_cm=10, rain_mm=0
        )
        assert score_combined == 1.0, \
            f"Cold + heavy snow MUST score 1.0, got {score_combined}"

    def test_wind_plus_rain_compounding(self):
        """Wind + rain should compound danger"""
        score_combined = calculate_hiking_suitability_score(
            temp_min_c=8, wind_kph=70, rain_mm=8, snow_cm=0
        )
        assert score_combined == 1.0, \
            f"High wind + heavy rain MUST score 1.0, got {score_combined}"

    def test_all_factors_extreme(self):
        """All factors extreme = absolutely must be 1.0"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-15, temp_chill_c=-25, wind_kph=80, gust_kph=100,
            rain_mm=0, snow_cm=20
        )
        assert score == 1.0, \
            f"All extreme factors MUST score 1.0, got {score}"


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_all_none_values(self):
        """All None values should return perfect score (no penalties)"""
        score = calculate_hiking_suitability_score(
            temp_min_c=None, temp_max_c=None, wind_kph=None, rain_mm=0, snow_cm=0
        )
        assert score == 10.0, f"No data should score 10.0, got {score}"

    def test_zero_values(self):
        """Zero values should work correctly"""
        score = calculate_hiking_suitability_score(
            temp_min_c=0, temp_max_c=0, wind_kph=0, rain_mm=0, snow_cm=0
        )
        assert 9 <= score <= 10, f"Zero values should score 9-10, got {score}"

    def test_exact_threshold_temperatures(self):
        """Test exact threshold values"""
        # Exactly at cold threshold (0°C)
        score = calculate_hiking_suitability_score(
            temp_min_c=0, temp_max_c=5, wind_kph=20, rain_mm=0, snow_cm=0
        )
        assert score >= 8, f"Exactly 0°C should score ≥8, got {score}"

        # Exactly at hot threshold (25°C)
        score = calculate_hiking_suitability_score(
            temp_min_c=20, temp_max_c=25, wind_kph=10, rain_mm=0, snow_cm=0
        )
        assert score >= 8, f"Exactly 25°C should score ≥8, got {score}"

    def test_exact_wind_threshold(self):
        """Test exact 30kph wind threshold"""
        score = calculate_hiking_suitability_score(
            temp_min_c=15, wind_kph=30, rain_mm=0, snow_cm=0
        )
        assert score >= 8, f"Exactly 30kph wind should score ≥8, got {score}"

    def test_score_never_exceeds_10(self):
        """Score should never exceed 10 even with perfect conditions"""
        score = calculate_hiking_suitability_score(
            temp_min_c=20, temp_max_c=22, wind_kph=5, rain_mm=0, snow_cm=0
        )
        assert score <= 10, f"Score must never exceed 10, got {score}"

    def test_score_never_below_1(self):
        """Score should never go below 1 even in worst conditions"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-30, wind_kph=150, rain_mm=50, snow_cm=50
        )
        assert score >= 1, f"Score must never be below 1, got {score}"
        assert score == 1.0, f"Extreme conditions should score exactly 1.0, got {score}"


class TestConservativeScoring:
    """Verify scoring is conservative (errs on side of caution)"""

    def test_borderline_conditions_score_conservatively(self):
        """Borderline conditions should score on the cautious side"""
        # Moderately cold + moderate wind
        score = calculate_hiking_suitability_score(
            temp_min_c=-3, wind_kph=50, rain_mm=0, snow_cm=0
        )
        # Should be in challenging range, not good
        assert score <= 5, f"Borderline should score conservatively ≤5, got {score}"

    def test_single_severe_factor_dominates(self):
        """One severe factor should result in low score even if others are fine"""
        # Perfect temp, perfect precip, but hurricane winds
        score = calculate_hiking_suitability_score(
            temp_min_c=15, temp_max_c=20, wind_kph=120, rain_mm=0, snow_cm=0
        )
        assert score == 1.0, \
            f"Single extreme factor should dominate, got {score}"


class TestRealWorldScenarios:
    """Test realistic Scottish mountain conditions"""

    def test_typical_winter_munro(self):
        """Typical winter Munro: cold, windy, some snow"""
        score = calculate_hiking_suitability_score(
            temp_min_c=-5, temp_max_c=2, temp_chill_c=-12,
            wind_kph=45, gust_kph=60, rain_mm=0, snow_cm=3
        )
        assert 1 <= score <= 4, \
            f"Typical winter Munro should score 1-4, got {score}"

    def test_summer_munro_perfect(self):
        """Perfect summer Munro day"""
        score = calculate_hiking_suitability_score(
            temp_min_c=12, temp_max_c=18, wind_kph=15, rain_mm=0, snow_cm=0
        )
        assert score >= 8, \
            f"Perfect summer Munro should score ≥8, got {score}"

    def test_scottish_drizzle(self):
        """Typical Scottish drizzle"""
        score = calculate_hiking_suitability_score(
            temp_min_c=8, temp_max_c=12, wind_kph=30, rain_mm=3, snow_cm=0
        )
        assert 4 <= score <= 6, \
            f"Scottish drizzle should score 4-6, got {score}"

    def test_april_conditions(self):
        """Typical April: mix of conditions"""
        score = calculate_hiking_suitability_score(
            temp_min_c=3, temp_max_c=10, wind_kph=35, rain_mm=1, snow_cm=0
        )
        assert 4 <= score <= 8, \
            f"April conditions should score 4-8, got {score}"


# Summary Statistics for Test Suite
def test_suite_summary():
    """Meta-test to document test coverage"""
    import inspect

    # Count tests by category
    total_tests = 0
    for name, obj in globals().items():
        if inspect.isclass(obj) and name.startswith('Test'):
            test_methods = [m for m in dir(obj) if m.startswith('test_')]
            total_tests += len(test_methods)
            print(f"{name}: {len(test_methods)} tests")

    print(f"\nTotal safety-critical tests: {total_tests}")
    assert total_tests >= 35, f"Should have at least 35 tests, have {total_tests}"


if __name__ == "__main__":
    # Run with: python -m pytest tests/test_scoring_comprehensive.py -v
    pytest.main([__file__, "-v", "--tb=short"])
