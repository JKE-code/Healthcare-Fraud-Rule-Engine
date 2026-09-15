package com.fraudguard.pay

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import kotlinx.coroutines.launch

class PaymentActivity : AppCompatActivity() {

    private lateinit var tvActiveCustomerName: TextView
    private lateinit var tvActiveBaselineInfo: TextView
    private lateinit var etAmount: EditText
    private lateinit var etMerchant: EditText
    private lateinit var etLocation: EditText
    private lateinit var etDevice: EditText
    private lateinit var etPaymentMethod: EditText
    private lateinit var btnSubmitPayment: Button
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment)

        tvActiveCustomerName = findViewById(R.id.tvActiveCustomerName)
        tvActiveBaselineInfo = findViewById(R.id.tvActiveBaselineInfo)
        etAmount = findViewById(R.id.etAmount)
        etMerchant = findViewById(R.id.etMerchant)
        etLocation = findViewById(R.id.etLocation)
        etDevice = findViewById(R.id.etDevice)
        etPaymentMethod = findViewById(R.id.etPaymentMethod)
        btnSubmitPayment = findViewById(R.id.btnSubmitPayment)
        progressBar = findViewById(R.id.progressBar)

        setupCustomerView()

        findViewById<Button>(R.id.btnPresetNormal).setOnClickListener {
            applyNormalPreset()
        }

        findViewById<Button>(R.id.btnPresetAnomaly).setOnClickListener {
            applyAnomalyPreset()
        }

        btnSubmitPayment.setOnClickListener {
            processPayment()
        }
    }

    private fun setupCustomerView() {
        val profile = PreloadedData.currentProfile
        tvActiveCustomerName.text = profile.name
        tvActiveBaselineInfo.text = "ID: ${profile.customerId} • Range: ₹${profile.amountRange[0].toInt()} - ₹${profile.amountRange[1].toInt()} • Known: ${profile.knownLocations.joinToString()}"
        applyNormalPreset()
    }

    private fun applyNormalPreset() {
        val profile = PreloadedData.currentProfile
        etAmount.setText(profile.avgAmount.toInt().toString())
        etMerchant.setText("Amazon India")
        etLocation.setText(profile.knownLocations.firstOrNull() ?: "Mumbai")
        etDevice.setText(profile.knownDevices.firstOrNull() ?: "mobile")
        etPaymentMethod.setText(profile.typicalChannel)
    }

    private fun applyAnomalyPreset() {
        val profile = PreloadedData.currentProfile
        when (profile.customerId) {
            "CUST-1001" -> {
                // Rohan student tries 65,000 in Dubai with new device
                etAmount.setText("65000")
                etMerchant.setText("Unknown Overseas Electronics")
                etLocation.setText("Dubai")
                etDevice.setText("new_device")
                etPaymentMethod.setText("CARD")
            }
            "CUST-1002" -> {
                // Priya normal high volume vs extreme suspicious transfer
                etAmount.setText("350000")
                etMerchant.setText("Offshore Crypto Wire")
                etLocation.setText("Lagos")
                etDevice.setText("new_device")
                etPaymentMethod.setText("CARD")
            }
            "CUST-1003" -> {
                // Amit retail merchant sudden massive 90k withdrawal
                etAmount.setText("90000")
                etMerchant.setText("Direct Cash Gateway")
                etLocation.setText("Goa")
                etDevice.setText("new_device")
                etPaymentMethod.setText("UPI")
            }
            else -> {
                etAmount.setText("85000")
                etMerchant.setText("Unknown Merchant")
                etLocation.setText("Dubai")
                etDevice.setText("new_device")
                etPaymentMethod.setText("CARD")
            }
        }
    }

    private fun processPayment() {
        val amountStr = etAmount.text.toString().trim()
        val merchant = etMerchant.text.toString().trim()
        val location = etLocation.text.toString().trim()
        val device = etDevice.text.toString().trim()
        val paymentMethod = etPaymentMethod.text.toString().trim()

        if (amountStr.isEmpty() || merchant.isEmpty() || location.isEmpty() || device.isEmpty() || paymentMethod.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }

        val amount = amountStr.toDoubleOrNull() ?: 0.0
        val profile = PreloadedData.currentProfile

        val submission = TransactionSubmission(
            amount = amount,
            merchant = merchant,
            location = location,
            device = device,
            paymentMethod = paymentMethod,
            customerId = profile.customerId,
            channel = profile.typicalChannel
        )

        progressBar.visibility = View.VISIBLE
        btnSubmitPayment.isEnabled = false

        lifecycleScope.launch {
            val result = ApiService.submitTransaction(submission)
            progressBar.visibility = View.GONE
            btnSubmitPayment.isEnabled = true

            result.onSuccess { data ->
                val intent = Intent(this@PaymentActivity, ResultActivity::class.java).apply {
                    putExtra("RESPONSE_JSON", Gson().toJson(data))
                }
                startActivity(intent)
            }.onFailure { err ->
                Toast.makeText(this@PaymentActivity, "Connection error: ${err.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}
