package com.fraudguard.pay

import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

object ApiService {

    // Default for Android Emulator to access local FastAPI server
    var baseUrl: String = "http://10.0.2.2:8000"

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun submitTransaction(submission: TransactionSubmission): Result<TransactionResponseData> {
        return withContext(Dispatchers.IO) {
            try {
                val jsonBody = gson.toJson(submission)
                val request = Request.Builder()
                    .url("$baseUrl/api/transactions")
                    .post(jsonBody.toRequestBody(jsonMediaType))
                    .build()

                val response = client.newCall(request).execute()
                val responseString = response.body?.string()

                if (response.isSuccessful && !responseString.isNullOrEmpty()) {
                    val result = gson.fromJson(responseString, TransactionResponseData::class.java)
                    Result.success(result)
                } else {
                    Result.failure(Exception("HTTP ${response.code}: $responseString"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
