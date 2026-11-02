package com.example.automation

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class PollingService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private val pollIntervalMs = 30000L // 30 seconds interval

    private val pollRunnable = object : Runnable {
        override fun run() {
            checkForPendingTask()
            handler.postDelayed(this, pollIntervalMs)
        }
    }

    private val powerReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
            val serverBaseUrl = prefs.getString("server_url", BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL
            val devicePhone = prefs.getString("device_phone", "") ?: ""
            if (devicePhone.isNotEmpty()) {
                sendHeartbeat(serverBaseUrl, devicePhone)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        startForegroundServiceNotification()
        handler.post(pollRunnable)
        
        val filter = android.content.IntentFilter().apply {
            addAction(android.content.Intent.ACTION_POWER_CONNECTED)
            addAction(android.content.Intent.ACTION_POWER_DISCONNECTED)
        }
        registerReceiver(powerReceiver, filter)
    }

    private fun checkForPendingTask() {
        thread {
            try {
                val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                val serverBaseUrl = prefs.getString("server_url", BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL
                var devicePhone = prefs.getString("device_phone", "") ?: ""
                
                // URL encode the phone number (e.g. + becomes %2B)
                val encodedPhone = java.net.URLEncoder.encode(devicePhone, "UTF-8")
                
                if (devicePhone.isEmpty()) {
                    return@thread // Do nothing if phone not configured
                }

                // --- Send Heartbeat (Battery & Temp) ---
                sendHeartbeat(serverBaseUrl, devicePhone)

                val url = URL("$serverBaseUrl/masters/api/tasks/poll/?deviceId=$encodedPhone")

                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                var hasHandledTask = false

                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream))
                    val response = reader.readText()
                    reader.close()

                    val json = JSONObject(response)
                    val hasTask = json.optBoolean("hasTask", false)

                    if (hasTask) {
                        val taskId = json.optString("taskId")
                        val phoneNumber = json.optString("phoneNumber")
                        val message = json.optString("message")

                        if (phoneNumber.isNotEmpty() && message.isNotEmpty()) {
                            AutomationState.serverBaseUrl = serverBaseUrl
                            AutomationState.platform = "WHATSAPP"
                            AutomationState.taskType = "WHATSAPP"
                            hasHandledTask = true
                            launchWhatsAppDispatch(taskId, phoneNumber, message)
                        }
                    }
                }
                connection.disconnect()

                // --- If no WhatsApp task was found, check for Twitter (X) Tasks ---
                if (!hasHandledTask) {
                    val twitterUrl = URL("$serverBaseUrl/masters/api/twitter/tasks/poll/?deviceId=$encodedPhone")
                    val twConn = twitterUrl.openConnection() as HttpURLConnection
                    twConn.requestMethod = "GET"
                    twConn.connectTimeout = 5000
                    twConn.readTimeout = 5000

                    if (twConn.responseCode == HttpURLConnection.HTTP_OK) {
                        val twReader = BufferedReader(InputStreamReader(twConn.inputStream))
                        val twResponse = twReader.readText()
                        twReader.close()

                        val twJson = JSONObject(twResponse)
                        val hasTwTask = twJson.optBoolean("hasTask", false)

                        if (hasTwTask) {
                            val taskId = twJson.optString("taskId")
                            val taskType = twJson.optString("taskType", "DM") // "DM" or "TWEET"
                            val targetHandle = twJson.optString("targetHandle", "")
                            val content = twJson.optString("content", "")

                            if (content.isNotEmpty()) {
                                AutomationState.serverBaseUrl = serverBaseUrl
                                AutomationState.platform = "TWITTER"
                                AutomationState.taskType = if (taskType == "TWEET") "TWITTER_TWEET" else "TWITTER_DM"
                                AutomationState.targetHandle = targetHandle
                                AutomationState.taskContent = content
                                launchTwitterDispatch(taskId, taskType, targetHandle, content)
                            }
                        }
                    }
                    twConn.disconnect()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun sendHeartbeat(serverBaseUrl: String, phone: String) {
        thread {
            try {
                val batteryStatus: Intent? = registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
                val level = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
                val scale = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: -1
                val batteryPct = if (level != -1 && scale != -1) (level * 100 / scale.toFloat()).toInt() else -1
                
                val temp = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_TEMPERATURE, -1) ?: -1
                val temperature = if (temp != -1) temp / 10.0 else -1.0
                
                val status = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1) ?: -1
                val isCharging = status == android.os.BatteryManager.BATTERY_STATUS_CHARGING || status == android.os.BatteryManager.BATTERY_STATUS_FULL
                val statusString = if (isCharging) "Charging" else "Discharging"

                val url = URL("$serverBaseUrl/masters/api/devices/heartbeat/")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val jsonPayload = JSONObject()
                jsonPayload.put("phone_number", phone)
                if (batteryPct != -1) jsonPayload.put("battery_level", batteryPct)
                if (temperature != -1.0) jsonPayload.put("temperature", temperature)
                jsonPayload.put("battery_status", statusString)
                
                val outputStream = connection.outputStream
                outputStream.write(jsonPayload.toString().toByteArray(Charsets.UTF_8))
                outputStream.flush()
                outputStream.close()
                
                connection.responseCode
                connection.disconnect()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun launchWhatsAppDispatch(taskId: String, phone: String, msg: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("taskId", taskId)
            putExtra("phoneNumber", phone)
            putExtra("message", msg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        try {
            // Android 14 Background Launch Bypass via PendingIntent
            val options = android.app.ActivityOptions.makeBasic()
            if (Build.VERSION.SDK_INT >= 34) {
                options.pendingIntentBackgroundActivityStartMode = android.app.ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
            }

            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            pendingIntent.send(this, 0, intent, null, null, null, options.toBundle())
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback for older Android versions
            startActivity(intent)
        }
    }

    private fun launchTwitterDispatch(taskId: String, taskType: String, targetHandle: String, content: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("platform", "TWITTER")
            putExtra("taskId", taskId)
            putExtra("taskType", taskType)
            putExtra("targetHandle", targetHandle)
            putExtra("message", content)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        try {
            val options = android.app.ActivityOptions.makeBasic()
            if (Build.VERSION.SDK_INT >= 34) {
                options.pendingIntentBackgroundActivityStartMode = android.app.ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
            }

            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            pendingIntent.send(this, 0, intent, null, null, null, options.toBundle())
        } catch (e: Exception) {
            e.printStackTrace()
            startActivity(intent)
        }
    }

    private fun startForegroundServiceNotification() {
        val channelId = "automation_polling_channel"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Automation Service",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Automation Engine Active")
            .setContentText("Polling server for task queue...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build()

        startForeground(1001, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(pollRunnable)
        try {
            unregisterReceiver(powerReceiver)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}