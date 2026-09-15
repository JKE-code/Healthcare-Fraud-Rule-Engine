# FraudGuard Pay — Android Test Client

A native Android (Kotlin) demonstration app configured to integrate directly with the **FraudGuard** FastAPI backend.

---

## 1. Features
1. **4 Preloaded Customer Profiles**:
   - `CUST-1001`: **Rohan Sharma (Student)** — Typical UPI range: ₹50 - ₹2,500 in Pune/Mumbai.
   - `CUST-1002`: **Priya Verma (Corporate Exec)** — Typical Card range: ₹1,000 - ₹1,50,000 in Mumbai/Bengaluru.
   - `CUST-1003`: **Amit Patel (Retail Merchant)** — Typical UPI range: ₹500 - ₹25,000.
   - `CUST-1004`: **Sneha Reddy (Freelancer)** — Typical Debit range: ₹200 - ₹12,000.
2. **Preset 1-Tap Scenarios**:
   - **Normal Tx**: Populates legitimate transaction fitting the customer's baseline.
   - **Fraud/Anomaly**: Simulates high-risk deviation (e.g. ₹65,000 transfer from Dubai on a new device for Rohan).
3. **Backend-Driven Risk Decisions**:
   - **PAYMENT APPROVED** (Green)
   - **SECURITY REVIEW REQUIRED** (Amber)
   - **PAYMENT BLOCKED** (Red) with exact explanations & risk score.

---

## 2. Opening & Running in Android Studio

1. Open **Android Studio**.
2. Click **Open** and select the folder:
   ```
   d:\Fraud-Detection\test_apk
   ```
3. Allow Gradle to sync dependencies (`OkHttp`, `Gson`, `Material3`, `AndroidX`).
4. Select your target device (Android Emulator or USB-connected Physical Phone).
5. Click **Run 'app'** (`Shift + F10`).

---

## 3. Connecting to the Backend Server

Start your FastAPI server from the repository root:
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- **If running on Android Emulator**:
  Use the default IP: `http://10.0.2.2:8000` (already set by default in the app).
- **If running on a Physical Android Phone**:
  Ensure phone and computer are on the same Wi-Fi network, and enter your PC's local IP on the login screen (e.g. `http://192.168.1.15:8000`).
