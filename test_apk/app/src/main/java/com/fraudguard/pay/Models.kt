package com.fraudguard.pay

import com.google.gson.annotations.SerializedName

data class CustomerProfile(
    @SerializedName("customer_id") val customerId: String,
    @SerializedName("name") val name: String,
    @SerializedName("typical_channel") val typicalChannel: String,
    @SerializedName("avg_amount") val avgAmount: Double,
    @SerializedName("amount_range") val amountRange: List<Double>,
    @SerializedName("known_locations") val knownLocations: List<String>,
    @SerializedName("known_devices") val knownDevices: List<String>,
    @SerializedName("risk_tolerance") val riskTolerance: String
)

data class TransactionSubmission(
    @SerializedName("amount") val amount: Double,
    @SerializedName("merchant") val merchant: String,
    @SerializedName("location") val location: String,
    @SerializedName("device") val device: String,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("customer_id") val customerId: String,
    @SerializedName("channel") val channel: String
)

data class TransactionResponseData(
    @SerializedName("transaction_id") val transactionId: String,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("merchant") val merchant: String,
    @SerializedName("location") val location: String,
    @SerializedName("device") val device: String,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("customer_id") val customerId: String?,
    @SerializedName("channel") val channel: String?,
    @SerializedName("fraud_probability") val fraudProbability: Double,
    @SerializedName("anomaly_score") val anomalyScore: Double,
    @SerializedName("risk_score") val riskScore: Double,
    @SerializedName("risk_level") val riskLevel: String,
    @SerializedName("is_suspicious") val isSuspicious: Boolean,
    @SerializedName("prediction") val prediction: String,
    @SerializedName("decision") val decision: String?, // APPROVE, REVIEW, BLOCK
    @SerializedName("explanation") val explanation: List<String>?
)
