package com.fraudguard.pay

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class LoginActivity : AppCompatActivity() {

    private lateinit var etBackendUrl: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        etBackendUrl = findViewById(R.id.etBackendUrl)

        findViewById<Button>(R.id.btnSelectCust1).setOnClickListener {
            selectProfile(0)
        }
        findViewById<Button>(R.id.btnSelectCust2).setOnClickListener {
            selectProfile(1)
        }
        findViewById<Button>(R.id.btnSelectCust3).setOnClickListener {
            selectProfile(2)
        }
        findViewById<Button>(R.id.btnSelectCust4).setOnClickListener {
            selectProfile(3)
        }
    }

    private fun selectProfile(index: Int) {
        val customUrl = etBackendUrl.text.toString().trim()
        if (customUrl.isNotEmpty()) {
            ApiService.baseUrl = customUrl
        }
        PreloadedData.currentProfile = PreloadedData.PROFILES[index]
        Toast.makeText(this, "Logged in as ${PreloadedData.currentProfile.name}", Toast.LENGTH_SHORT).show()

        val intent = Intent(this, PaymentActivity::class.java)
        startActivity(intent)
    }
}
