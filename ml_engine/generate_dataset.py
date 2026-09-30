"""
Synthetic Transaction Dataset Generator for FraudGuard.

Generates labeled fraud / legitimate transactions using behavioral
features that match the inference-time input space exactly:

    amount          — transaction amount in INR
    merchant_risk   — risk score 0-1 (known-safe merchants ≈ 0.05, unknown ≈ 0.85)
    location_risk   — risk score 0-1 (domestic metros ≈ 0.05, foreign/unknown ≈ 0.65)
    device_risk     — risk score 0-1 (verified mobile ≈ 0.05, new_device ≈ 0.85)
    payment_risk    — risk score 0-1 (UPI ≈ 0.05, card ≈ 0.25)
    hour            — hour of transaction 0-23
    amount_deviation— amount / 2500 (ratio vs typical legitimate transaction)
    is_fraud        — label: 0 = legitimate, 1 = fraud

Fraud Labeling Strategy:
    Each transaction gets a latent "fraud propensity" score computed from
    its risk features with added Gaussian noise.  Transactions above a
    threshold are labeled fraud.  This gives the model real statistical
    signal to learn from while keeping the class boundary non-trivial.

    ~3-5% fraud rate mirrors real-world UPI/card fraud incidence.

Usage:
    python ml_engine/generate_dataset.py            # writes ml_engine/synthetic_transactions.csv
    python ml_engine/generate_dataset.py --rows 200000  # larger dataset
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd

_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------- realistic distributions ----------

# Merchant risk: most transactions go to well-known merchants (low risk)
MERCHANT_RISK_DIST = {
    "weights": [0.50, 0.25, 0.10, 0.08, 0.04, 0.03],
    "values":  [0.05, 0.08, 0.10, 0.15, 0.50, 0.85],
}

# Location risk: most are domestic metro (low risk)
LOCATION_RISK_DIST = {
    "weights": [0.55, 0.20, 0.10, 0.08, 0.04, 0.03],
    "values":  [0.05, 0.06, 0.07, 0.15, 0.45, 0.65],
}

# Device risk: most are verified mobile
DEVICE_RISK_DIST = {
    "weights": [0.60, 0.20, 0.10, 0.06, 0.04],
    "values":  [0.05, 0.10, 0.15, 0.50, 0.85],
}

# Payment risk: UPI dominant
PAYMENT_RISK_DIST = {
    "weights": [0.50, 0.20, 0.15, 0.15],
    "values":  [0.05, 0.10, 0.15, 0.25],
}


def _sample_from_dist(rng, dist, n):
    """Sample n values from a weighted discrete distribution."""
    indices = rng.choice(len(dist["values"]), size=n, p=dist["weights"])
    base = np.array(dist["values"])[indices]
    # Add small Gaussian noise to prevent exact duplicates
    noise = rng.normal(0, 0.02, size=n)
    return np.clip(base + noise, 0.0, 1.0)


def generate_dataset(n_rows=100_000, fraud_rate_target=0.04, seed=42):
    """
    Generate a synthetic labeled transaction dataset.

    Args:
        n_rows: number of transactions to generate
        fraud_rate_target: approximate target fraud rate (0.03-0.05)
        seed: random seed for reproducibility

    Returns:
        pd.DataFrame with columns matching the inference feature space + is_fraud
    """
    rng = np.random.RandomState(seed)

    # --- sample features from realistic distributions ---
    merchant_risk = _sample_from_dist(rng, MERCHANT_RISK_DIST, n_rows)
    location_risk = _sample_from_dist(rng, LOCATION_RISK_DIST, n_rows)
    device_risk = _sample_from_dist(rng, DEVICE_RISK_DIST, n_rows)
    payment_risk = _sample_from_dist(rng, PAYMENT_RISK_DIST, n_rows)

    # Amount: log-normal (most small, some very large)
    amount = rng.lognormal(mean=7.0, sigma=1.2, size=n_rows)
    amount = np.clip(amount, 10, 500_000).astype(float)

    # Hour: bimodal — most during business hours, some late-night
    hour_probs = np.array([
        0.01, 0.005, 0.005, 0.005, 0.005, 0.01,   # 0-5 (late night)
        0.03, 0.05, 0.06, 0.07, 0.08, 0.08,        # 6-11 (morning)
        0.07, 0.06, 0.06, 0.06, 0.06, 0.05,        # 12-17 (afternoon)
        0.05, 0.05, 0.04, 0.04, 0.03, 0.02,        # 18-23 (evening)
    ])
    hour_probs /= hour_probs.sum()
    hour = rng.choice(24, size=n_rows, p=hour_probs).astype(float)

    # Amount deviation from typical (Rs 2500)
    amount_deviation = amount / 2500.0

    # --- compute latent fraud propensity ---
    # This is the "true" fraud signal.  The model needs to learn to
    # approximate this from the features.
    propensity = (
        0.30 * merchant_risk +
        0.20 * location_risk +
        0.25 * device_risk +
        0.10 * payment_risk +
        0.10 * np.clip(amount_deviation / 40.0, 0, 1) +
        0.05 * np.where((hour >= 0) & (hour <= 5), 1.0, 0.0)
    )

    # Add noise to make boundary non-trivial
    noise = rng.normal(0, 0.08, size=n_rows)
    propensity_noisy = propensity + noise

    # Calibrate threshold to hit target fraud rate
    threshold = np.quantile(propensity_noisy, 1.0 - fraud_rate_target)
    is_fraud = (propensity_noisy >= threshold).astype(int)

    # --- also inject some "hard negatives" and "hard positives" ---
    # 1% of legitimate get randomly flipped to fraud (mimics novel attacks)
    legit_mask = is_fraud == 0
    flip_count = max(1, int(legit_mask.sum() * 0.005))
    flip_indices = rng.choice(np.where(legit_mask)[0], size=flip_count, replace=False)
    is_fraud[flip_indices] = 1

    # 0.5% of fraud get flipped to legitimate (mimics label noise)
    fraud_mask = is_fraud == 1
    if fraud_mask.sum() > 10:
        flip_count2 = max(1, int(fraud_mask.sum() * 0.005))
        flip_indices2 = rng.choice(np.where(fraud_mask)[0], size=flip_count2, replace=False)
        is_fraud[flip_indices2] = 0

    df = pd.DataFrame({
        "amount": np.round(amount, 2),
        "merchant_risk": np.round(merchant_risk, 4),
        "location_risk": np.round(location_risk, 4),
        "device_risk": np.round(device_risk, 4),
        "payment_risk": np.round(payment_risk, 4),
        "hour": hour.astype(int),
        "amount_deviation": np.round(amount_deviation, 4),
        "is_fraud": is_fraud,
    })

    return df


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic fraud dataset")
    parser.add_argument("--rows", type=int, default=100_000, help="Number of rows")
    parser.add_argument("--fraud-rate", type=float, default=0.04, help="Target fraud rate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--output", type=str, default=None, help="Output CSV path")
    args = parser.parse_args()

    output_path = args.output or os.path.join(_DIR, "synthetic_transactions.csv")

    print("=" * 60)
    print("SYNTHETIC DATASET GENERATOR — FraudGuard")
    print("=" * 60)
    print(f"  Rows:        {args.rows:,}")
    print(f"  Fraud rate:  {args.fraud_rate:.1%}")
    print(f"  Seed:        {args.seed}")

    df = generate_dataset(n_rows=args.rows, fraud_rate_target=args.fraud_rate, seed=args.seed)

    actual_fraud_rate = df["is_fraud"].mean()
    fraud_count = df["is_fraud"].sum()
    legit_count = len(df) - fraud_count

    print(f"\n  Generated {len(df):,} transactions:")
    print(f"    Legitimate: {legit_count:,} ({1 - actual_fraud_rate:.2%})")
    print(f"    Fraud:      {fraud_count:,} ({actual_fraud_rate:.2%})")

    # Feature summary for fraud vs legit
    print(f"\n  Feature means (Fraud vs Legit):")
    for col in ["amount", "merchant_risk", "location_risk", "device_risk",
                 "payment_risk", "hour", "amount_deviation"]:
        fraud_mean = df.loc[df["is_fraud"] == 1, col].mean()
        legit_mean = df.loc[df["is_fraud"] == 0, col].mean()
        print(f"    {col:20s}  fraud={fraud_mean:8.3f}  legit={legit_mean:8.3f}")

    df.to_csv(output_path, index=False)
    print(f"\n  Saved to: {output_path}")
    print(f"  File size: {os.path.getsize(output_path) / (1024*1024):.2f} MB")
    print("Done.\n")


if __name__ == "__main__":
    main()
