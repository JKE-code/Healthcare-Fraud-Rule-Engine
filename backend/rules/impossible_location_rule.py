import math
from typing import Dict, Any, List, Optional, Tuple
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import register_rule
from backend.rules.velocity_rule import parse_timestamp

# Geographic coordinates (Latitude, Longitude) for major hubs and test scenarios
CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    # Domestic Indian Metros
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "chandigarh": (30.7333, 76.7794),
    "goa": (15.2993, 74.1240),
    "kochi": (9.9312, 76.2673),
    # International Hubs (Common attack vectors)
    "dubai": (25.2048, 55.2708),
    "london": (51.5074, -0.1278),
    "new york": (40.7128, -74.0060),
    "singapore": (1.3521, 103.8198),
    "tokyo": (35.6762, 139.6503),
    "sydney": (-33.8688, 151.2093),
    "moscow": (55.7558, 37.6173),
    "lagos": (6.5244, 3.3792),
    "hong kong": (22.3193, 114.1694),
}


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two points on Earth in kilometers."""
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    radius_earth_km = 6371.0
    return radius_earth_km * c


def get_city_coords(location_str: str) -> Optional[Tuple[float, float]]:
    """Resolves city string to coordinates."""
    if not location_str:
        return None
    loc_clean = location_str.strip().lower()
    for city, coords in CITY_COORDINATES.items():
        if city in loc_clean:
            return coords
    return None


@register_rule
class ImpossibleLocationRule(BaseRule):
    rule_code = "RULE_IMPOSSIBLE_LOCATION"
    rule_name = "Impossible Geographical Location & Travel Speed"
    description = "Calculates physical distance and required velocity between sequential transactions to intercept geographically impossible logins/payments."
    weight = 1.5

    def __init__(self, max_feasible_speed_kmh: float = 850.0, min_elapsed_seconds: float = 60.0):
        # Commercial airliner cruising speed ~850 km/h
        self.max_feasible_speed_kmh = max_feasible_speed_kmh
        self.min_elapsed_seconds = min_elapsed_seconds

    def get_parameters(self) -> Dict[str, Any]:
        return {
            "max_feasible_speed_kmh": self.max_feasible_speed_kmh,
            "min_elapsed_seconds": self.min_elapsed_seconds,
        }

    def update_parameters(self, params: Dict[str, Any]) -> None:
        if "max_feasible_speed_kmh" in params:
            self.max_feasible_speed_kmh = float(params["max_feasible_speed_kmh"])
        if "min_elapsed_seconds" in params:
            self.min_elapsed_seconds = float(params["min_elapsed_seconds"])

    def evaluate(self, transaction: Dict[str, Any], history: List[Dict[str, Any]]) -> RuleResult:
        current_loc = str(transaction.get("location", "")).strip()
        current_coords = get_city_coords(current_loc)
        current_time = parse_timestamp(transaction.get("timestamp"))
        customer_id = transaction.get("customer_id")

        if not current_coords:
            # City not in catalog, cannot calculate physics
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=False,
                risk_score=0.0,
                metrics={"status": "location_coords_unresolved", "location": current_loc},
            )

        # Find the most recent previous transaction for this customer with a valid location
        prev_tx = None
        for prev in history:
            if customer_id and prev.get("customer_id") != customer_id:
                continue
            prev_time = parse_timestamp(prev.get("timestamp"))
            # Must be strictly preceding current transaction
            if prev_time < current_time:
                prev_loc = str(prev.get("location", "")).strip()
                prev_coords = get_city_coords(prev_loc)
                if prev_coords:
                    prev_tx = prev
                    break

        if not prev_tx:
            # First transaction or no prior reference point
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=False,
                risk_score=0.0,
                metrics={"status": "no_prior_location_reference"},
            )

        prev_loc = str(prev_tx.get("location", "")).strip()
        prev_coords = get_city_coords(prev_loc)
        prev_time = parse_timestamp(prev_tx.get("timestamp"))

        # Calculate distance and elapsed time
        distance_km = haversine_distance(prev_coords, current_coords)
        elapsed_seconds = max(1.0, current_time - prev_time)
        elapsed_hours = elapsed_seconds / 3600.0
        calculated_speed_kmh = distance_km / elapsed_hours

        # Check for impossible physical movement:
        # Distance > 50km and (speed > 850 km/h or elapsed time < 5 mins for different cities)
        if distance_km > 50.0 and (calculated_speed_kmh > self.max_feasible_speed_kmh or elapsed_seconds < 300.0):
            elapsed_min = elapsed_seconds / 60.0
            
            # Severity mapping:
            # High speed or overseas leap is CRITICAL
            severity = "CRITICAL"
            score = 0.95 if calculated_speed_kmh > 1500.0 else 0.85

            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_score=score,
                severity=severity,
                reason=(
                    f"Impossible Travel: Required speed of {calculated_speed_kmh:,.0f} km/h between "
                    f"{prev_loc} and {current_loc} ({distance_km:,.0f} km in {elapsed_min:.1f} mins)."
                ),
                metrics={
                    "previous_location": prev_loc,
                    "current_location": current_loc,
                    "distance_km": round(distance_km, 1),
                    "elapsed_seconds": round(elapsed_seconds, 1),
                    "elapsed_minutes": round(elapsed_min, 1),
                    "speed_kmh": round(calculated_speed_kmh, 1),
                    "max_speed_limit": self.max_feasible_speed_kmh,
                },
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_score=0.0,
            metrics={
                "previous_location": prev_loc,
                "current_location": current_loc,
                "distance_km": round(distance_km, 1),
                "speed_kmh": round(calculated_speed_kmh, 1),
            },
        )
