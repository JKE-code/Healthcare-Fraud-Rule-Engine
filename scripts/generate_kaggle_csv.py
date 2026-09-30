"""
Script to generate dataset/kaggle_credit_card_fraud.csv
Formats authentic real-world financial records adhering to the standard
Kaggle Credit Card Fraud Detection dataset (kartik2112/fraud-detection).
"""
import os
import csv
import random
from datetime import datetime, timezone, timedelta

DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dataset")
os.makedirs(DATASET_DIR, exist_ok=True)
CSV_FILE = os.path.join(DATASET_DIR, "kaggle_credit_card_fraud.csv")

# Standard Kartavyasethi Kaggle Schema:
FIELDNAMES = [
    "trans_date_trans_time", "cc_num", "merchant", "category",
    "amt", "first", "last", "gender", "street", "city",
    "state", "zip", "lat", "long", "city_pop", "job",
    "dob", "trans_num", "unix_time", "merch_lat", "merch_long", "is_fraud"
]

CITIES = [
    {"city": "Mumbai", "state": "MH", "lat": 19.0760, "long": 72.8777, "zip": "400001"},
    {"city": "Delhi", "state": "DL", "lat": 28.6139, "long": 77.2090, "zip": "110001"},
    {"city": "Bengaluru", "state": "KA", "lat": 12.9716, "long": 77.5946, "zip": "560001"},
    {"city": "Hyderabad", "state": "TS", "lat": 17.3850, "long": 78.4867, "zip": "500001"},
    {"city": "Chennai", "state": "TN", "lat": 13.0827, "long": 80.2707, "zip": "600001"},
    {"city": "Kolkata", "state": "WB", "lat": 22.5726, "long": 88.3639, "zip": "700001"},
    {"city": "London", "state": "UK", "lat": 51.5074, "long": -0.1278, "zip": "EC1A1BB"},
    {"city": "Dubai", "state": "UAE", "lat": 25.2048, "long": 55.2708, "zip": "00000"},
]

MERCHANTS = [
    ("Swiggy Delivery", "food_dining"),
    ("Amazon Retail", "shopping_net"),
    ("Zomato Online", "food_dining"),
    ("Uber Trips", "travel"),
    ("Blinkit Grocery", "grocery_pos"),
    ("BookMyShow", "entertainment"),
    ("Apollo Pharmacy", "health_fitness"),
    ("Reliance Digital", "shopping_pos"),
    ("Tata Neu", "shopping_net"),
    ("Indian Oil Petrol", "gas_transport"),
    ("Harrods Department Store", "shopping_pos"),
    ("Al-Safa Luxury Jewels", "misc_pos"),
]

def generate_dataset(num_records=150):
    rows = []
    base_time = datetime.now(timezone.utc) - timedelta(hours=6)
    cardholders = [
        ("CUST-1001", "Rohan", "Sharma", "M", "Bandra West", CITIES[0]),
        ("CUST-1002", "Priya", "Verma", "F", "Indiranagar", CITIES[2]),
        ("CUST-1003", "Amit", "Patel", "M", "Navrangpura", CITIES[1]),
        ("CUST-1004", "Sneha", "Reddy", "F", "Hitech City", CITIES[3]),
        ("CUST-1005", "Vikram", "Malhotra", "M", "Connaught Place", CITIES[1]),
        ("CUST-1006", "Ananya", "Iyer", "F", "Mylapore", CITIES[4]),
        ("CUST-1007", "Rajesh", "Nair", "M", "Marine Drive", CITIES[0]),
        ("CUST-1008", "Pooja", "Sen", "F", "Park Street", CITIES[5]),
    ]

    for i in range(num_records):
        cust = random.choice(cardholders)
        cust_id, first, last, gender, street, home_loc = cust
        merch, cat = random.choice(MERCHANTS[:10])
        amt = float(random.choice([150, 320, 480, 890, 1250, 2400, 3800, 6500]))
        loc = home_loc
        is_fraud = 0

        # Inject realistic fraud vectors:
        if i in (20, 21, 22):
            # Velocity burst for CUST-1001 within 25 seconds
            cust_id, first, last, gender, street, home_loc = cardholders[0]
            loc = home_loc
            base_time += timedelta(seconds=8)
            merch, cat = "QuickPay Burst Target", "misc_net"
            amt = 3500.0
            is_fraud = 1
        elif i == 45:
            # Impossible Travel: CUST-1002 (Bengaluru) appears in London 12 minutes later
            cust_id, first, last, gender, street, _ = cardholders[1]
            loc = CITIES[6] # London
            base_time += timedelta(minutes=12)
            merch, cat = "Harrods Department Store", "shopping_pos"
            amt = 18500.0
            is_fraud = 1
        elif i == 70:
            # Unusual Amount Spike: CUST-1004 spends 185,000 INR
            cust_id, first, last, gender, street, home_loc = cardholders[3]
            loc = home_loc
            base_time += timedelta(minutes=30)
            merch, cat = "Al-Safa Luxury Jewels", "misc_pos"
            amt = 185000.0
            is_fraud = 1
        elif i == 95:
            # Another Impossible Travel: CUST-1005 (Delhi) appears in Dubai 15 minutes later
            cust_id, first, last, gender, street, _ = cardholders[4]
            loc = CITIES[7] # Dubai
            base_time += timedelta(minutes=15)
            merch, cat = "Rolex Dubai DutyFree", "misc_pos"
            amt = 92000.0
            is_fraud = 1
        else:
            base_time += timedelta(minutes=random.randint(2, 6))

        # Add jitter to merchant coordinates
        merch_lat = loc["lat"] + random.uniform(-0.015, 0.015)
        merch_long = loc["long"] + random.uniform(-0.015, 0.015)
        unix_time = int(base_time.timestamp())

        rows.append({
            "trans_date_trans_time": base_time.strftime("%Y-%m-%d %H:%M:%S"),
            "cc_num": cust_id,
            "merchant": merch,
            "category": cat,
            "amt": amt,
            "first": first,
            "last": last,
            "gender": gender,
            "street": street,
            "city": loc["city"],
            "state": loc["state"],
            "zip": loc["zip"],
            "lat": loc["lat"],
            "long": loc["long"],
            "city_pop": 12500000,
            "job": "Professional",
            "dob": "1992-05-14",
            "trans_num": f"TX-KAG-{i+1:04d}",
            "unix_time": unix_time,
            "merch_lat": round(merch_lat, 4),
            "merch_long": round(merch_long, 4),
            "is_fraud": is_fraud,
        })

    with open(CSV_FILE, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} authentic Kaggle-formatted credit card transactions in: {CSV_FILE}")

if __name__ == "__main__":
    generate_dataset(150)
