package com.fraudguard.pay

import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson

class ResultActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_result)

        val json = intent.getStringExtra("RESPONSE_JSON") ?: ""
        val data = try {
            Gson().fromJson(json, TransactionResponseData::class.java)
        } catch (e: Exception) {
            null
        }

        val tvStatusIcon = findViewById<TextView>(R.id.tvStatusIcon)
        val tvDecisionStatus = findViewById<TextView>(R.id.tvDecisionStatus)
        val tvDecisionSubtitle = findViewById<TextView>(R.id.tvDecisionSubtitle)
        val tvTxId = findViewById<TextView>(R.id.tvTxId)
        val tvAmount = findViewById<TextView>(R.id.tvAmount)
        val tvRiskScore = findViewById<TextView>(R.id.tvRiskScore)
        val tvRiskLevel = findViewById<TextView>(R.id.tvRiskLevel)
        val tvExplanations = findViewById<TextView>(R.id.tvExplanations)
        val btnDone = findViewById<Button>(R.id.btnDone)

        if (data != null) {
            tvTxId.text = data.transactionId
            tvAmount.text = "₹${data.amount.toInt()}"
            val score100 = (data.riskScore * 100).toInt()
            tvRiskScore.text = "$score100 / 100"
            tvRiskLevel.text = data.riskLevel

            val decision = data.decision ?: if (data.prediction == "FRAUD") "BLOCK" else "APPROVE"

            when (decision) {
                "BLOCK" -> {
                    tvStatusIcon.text = "🚫"
                    tvDecisionStatus.text = "PAYMENT BLOCKED"
                    tvDecisionStatus.setTextColor(Color.parseColor("#EF4444"))
                    tvDecisionSubtitle.text = "High risk fraud pattern / critical behavioral anomaly detected."
                    tvRiskLevel.setTextColor(Color.parseColor("#EF4444"))
                    tvRiskScore.setTextColor(Color.parseColor("#EF4444"))
                }
                "REVIEW" -> {
                    tvStatusIcon.text = "⚠️"
                    tvDecisionStatus.text = "SECURITY REVIEW REQUIRED"
                    tvDecisionStatus.setTextColor(Color.parseColor("#F59E0B"))
                    tvDecisionSubtitle.text = "Transaction flagged for secondary verification / OTP challenge."
                    tvRiskLevel.setTextColor(Color.parseColor("#F59E0B"))
                    tvRiskScore.setTextColor(Color.parseColor("#F59E0B"))
                }
                else -> {
                    tvStatusIcon.text = "✅"
                    tvDecisionStatus.text = "PAYMENT APPROVED"
                    tvDecisionStatus.setTextColor(Color.parseColor("#10B981"))
                    tvDecisionSubtitle.text = "Transaction verified within expected customer baseline."
                    tvRiskLevel.setTextColor(Color.parseColor("#10B981"))
                    tvRiskScore.setTextColor(Color.parseColor("#10B981"))
                }
            }

            val explanations = data.explanation ?: emptyList()
            if (explanations.isNotEmpty()) {
                tvExplanations.text = explanations.joinToString("\n") { "• $it" }
            } else {
                tvExplanations.text = "• Transaction within normal profile activity\n• No anomalous signals detected"
            }
        }

        btnDone.setOnClickListener {
            finish()
        }
    }
}
