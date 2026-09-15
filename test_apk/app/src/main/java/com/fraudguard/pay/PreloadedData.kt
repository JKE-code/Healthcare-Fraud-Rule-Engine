package com.fraudguard.pay

object PreloadedData {

    val PROFILES = listOf(
        CustomerProfile(
            customerId = "CUST-1001",
            name = "Rohan Sharma (Student)",
            typicalChannel = "UPI",
            avgAmount = 650.0,
            amountRange = listOf(50.0, 2500.0),
            knownLocations = listOf("Pune", "Mumbai"),
            knownDevices = listOf("DEV-ROHAN-PIXEL", "mobile"),
            riskTolerance = "LOW"
        ),
        CustomerProfile(
            customerId = "CUST-1002",
            name = "Priya Verma (Corporate Executive)",
            typicalChannel = "CREDIT_CARD",
            avgAmount = 42000.0,
            amountRange = listOf(1000.0, 150000.0),
            knownLocations = listOf("Mumbai", "Bengaluru", "Delhi"),
            knownDevices = listOf("DEV-PRIYA-S23", "DEV-PRIYA-MAC", "mobile"),
            riskTolerance = "HIGH"
        ),
        CustomerProfile(
            customerId = "CUST-1003",
            name = "Amit Patel (Retail Merchant)",
            typicalChannel = "UPI",
            avgAmount = 7500.0,
            amountRange = listOf(500.0, 25000.0),
            knownLocations = listOf("Ahmedabad", "Surat", "Delhi"),
            knownDevices = listOf("DEV-AMIT-ONEPLUS", "desktop", "mobile"),
            riskTolerance = "MEDIUM"
        ),
        CustomerProfile(
            customerId = "CUST-1004",
            name = "Sneha Reddy (Tech Freelancer)",
            typicalChannel = "DEBIT_CARD",
            avgAmount = 3400.0,
            amountRange = listOf(200.0, 12000.0),
            knownLocations = listOf("Hyderabad", "Bengaluru"),
            knownDevices = listOf("DEV-SNEHA-MOTO", "mobile"),
            riskTolerance = "LOW"
        )
    )

    var currentProfile: CustomerProfile = PROFILES[0]
}
