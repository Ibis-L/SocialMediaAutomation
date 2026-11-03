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
    private val pollIntervalMs = 5000L // 5 seconds interval

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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(powerReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(powerReceiver, filter)
        }
    }

    private fun checkForPendingTask() {
        thread {
            try {
                // Prevent task collisions: Skip poll if already executing a task or downloading video
                if (AutomationState.isAutomationActive || AutomationState.isDownloading) {
                    android.util.Log.d("PollingService", "Device is currently busy with active automation/download. Skipping poll cycle.")
                    return@thread
                }

                val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                val serverBaseUrl = prefs.getString("server_url", BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL
                var devicePhone = prefs.getString("device_phone", "") ?: ""
                val deviceToken = prefs.getString("device_token", AutomationState.deviceToken)
                
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
                if (!deviceToken.isNullOrEmpty()) {
                    connection.setRequestProperty("X-Device-Token", deviceToken)
                }

                var hasHandledTask = false

                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream))
                    val response = reader.readText()
                    reader.close()

                    val json = JSONObject(response)
                    val hasTask = json.optBoolean("hasTask", false)

                    if (hasTask) {
                        val taskId = json.optString("taskId")
                        val taskType = json.optString("taskType", "WHATSAPP")

                        AutomationState.serverBaseUrl = serverBaseUrl
                        AutomationState.currentTaskId = taskId
                        AutomationState.currentTaskType = taskType
                        if (!deviceToken.isNullOrEmpty()) {
                            AutomationState.deviceToken = deviceToken
                        }

                        if (taskType.equals("YOUTUBE", ignoreCase = true)) {
                            val videoUrl = json.optString("videoUrl", "")
                            val title = json.optString("title", "Breaking News Update")
                            val description = json.optString("description", "")
                            val isMadeForKids = json.optBoolean("isMadeForKids", true)
                            val commentsEnabled = json.optBoolean("commentsEnabled", true)

                            AutomationState.isMadeForKids = isMadeForKids
                            AutomationState.commentsEnabled = commentsEnabled
                            AutomationState.platform = "YOUTUBE"
                            AutomationState.taskType = "YOUTUBE"

                            if (videoUrl.isNotEmpty()) {
                                hasHandledTask = true
                                downloadAndLaunchYouTube(taskId, videoUrl, title, description, isMadeForKids, commentsEnabled, serverBaseUrl)
                            }
                        } else {
                            val platform = json.optString("platform", "whatsapp").lowercase()
                            val phoneNumber = json.optString("phoneNumber")
                            val message = json.optString("message")

                            if (phoneNumber.isNotEmpty() && message.isNotEmpty()) {
                                if (platform == "instagram" || taskType.equals("INSTAGRAM", ignoreCase = true)) {
                                    AutomationState.platform = "INSTAGRAM"
                                    AutomationState.taskType = "INSTAGRAM"
                                    hasHandledTask = true
                                    launchInstagramDispatch(taskId, phoneNumber, message)
                                } else if (platform == "facebook" || taskType.equals("FACEBOOK", ignoreCase = true)) {
                                    AutomationState.platform = "FACEBOOK"
                                    AutomationState.taskType = "FACEBOOK"
                                    hasHandledTask = true
                                    launchFacebookDispatch(taskId, phoneNumber, message)
                                } else {
                                    AutomationState.platform = "WHATSAPP"
                                    AutomationState.taskType = "WHATSAPP"
                                    hasHandledTask = true
                                    launchWhatsAppDispatch(taskId, phoneNumber, message)
                                }
                            }
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
                    if (!deviceToken.isNullOrEmpty()) {
                        twConn.setRequestProperty("X-Device-Token", deviceToken)
                    }

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
                val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                val deviceToken = prefs.getString("device_token", AutomationState.deviceToken)

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
                if (!deviceToken.isNullOrEmpty()) {
                    connection.setRequestProperty("X-Device-Token", deviceToken)
                }
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

    private fun downloadAndLaunchYouTube(
        taskId: String,
        videoUrl: String,
        title: String,
        description: String,
        isMadeForKids: Boolean,
        commentsEnabled: Boolean,
        serverBaseUrl: String
    ) {
        thread {
            val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
            val deviceToken = prefs.getString("device_token", AutomationState.deviceToken)
            AutomationState.isDownloading = true

            val fullUrl = if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
                videoUrl
            } else {
                "$serverBaseUrl$videoUrl"
            }

            val targetFile = java.io.File(cacheDir, "yt_task_${taskId}.mp4")
            var downloadSuccess = false
            var lastException: Exception? = null
            val maxRetries = 3

            for (attempt in 1..maxRetries) {
                try {
                    if (targetFile.exists()) targetFile.delete()

                    android.util.Log.d("PollingService", "Downloading video (attempt $attempt/$maxRetries): $fullUrl")
                    val url = URL(fullUrl)
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        connectTimeout = 15000
                        readTimeout = 60000
                        if (!deviceToken.isNullOrEmpty()) {
                            setRequestProperty("X-Device-Token", deviceToken)
                        }
                    }

                    if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                        val contentLength = conn.contentLength
                        conn.inputStream.use { input ->
                            java.io.FileOutputStream(targetFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                        conn.disconnect()

                        // Validate file downloaded completely if length header provided
                        if (contentLength > 0 && targetFile.length() < contentLength) {
                            android.util.Log.w("PollingService", "Downloaded size ${targetFile.length()} < $contentLength. Retrying attempt $attempt...")
                            Thread.sleep(2000)
                            continue
                        }

                        downloadSuccess = true
                        break
                    } else {
                        conn.disconnect()
                        android.util.Log.e("PollingService", "Download attempt $attempt failed with HTTP ${conn.responseCode}")
                        Thread.sleep(2000)
                    }
                } catch (e: Exception) {
                    lastException = e
                    android.util.Log.e("PollingService", "Download attempt $attempt encountered error: ${e.message}")
                    Thread.sleep(2000)
                }
            }

            if (!downloadSuccess) {
                android.util.Log.e("PollingService", "Failed to download video after $maxRetries attempts. Reporting task FAILED.", lastException)
                reportTaskFailure(serverBaseUrl, taskId, deviceToken)
                AutomationState.isDownloading = false
                AutomationState.isAutomationActive = false
                if (targetFile.exists()) targetFile.delete()
                return@thread
            }

            AutomationState.isDownloading = false
            AutomationState.isAutomationActive = true

            try {
                var finalUri: android.net.Uri? = null
                try {
                    val values = android.content.ContentValues().apply {
                        put(android.provider.MediaStore.Video.Media.TITLE, title)
                        put(android.provider.MediaStore.Video.Media.DISPLAY_NAME, "yt_task_${taskId}.mp4")
                        put(android.provider.MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            put(android.provider.MediaStore.Video.Media.RELATIVE_PATH, android.os.Environment.DIRECTORY_MOVIES + "/Automation")
                            put(android.provider.MediaStore.Video.Media.IS_PENDING, 1)
                        }
                    }

                    val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        android.provider.MediaStore.Video.Media.getContentUri(android.provider.MediaStore.VOLUME_EXTERNAL_PRIMARY)
                    } else {
                        android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    }

                    val mediaUri = contentResolver.insert(collection, values)
                    if (mediaUri != null) {
                        contentResolver.openOutputStream(mediaUri)?.use { outStream ->
                            java.io.FileInputStream(targetFile).use { inStream ->
                                inStream.copyTo(outStream)
                            }
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            values.clear()
                            values.put(android.provider.MediaStore.Video.Media.IS_PENDING, 0)
                            contentResolver.update(mediaUri, values, null, null)
                        }
                        finalUri = mediaUri
                        android.util.Log.d("PollingService", "Successfully saved video to MediaStore: $finalUri")
                    }
                } catch (e: Exception) {
                    android.util.Log.e("PollingService", "Failed to save to MediaStore, falling back to FileProvider: ${e.message}")
                }

                if (finalUri == null) {
                    finalUri = androidx.core.content.FileProvider.getUriForFile(
                        this,
                        "${packageName}.fileprovider",
                        targetFile
                    )
                }

                val intent = Intent(this, MainActivity::class.java).apply {
                    putExtra("taskType", "YOUTUBE")
                    putExtra("taskId", taskId)
                    putExtra("videoUri", finalUri.toString())
                    putExtra("title", title)
                    putExtra("description", description)
                    putExtra("isMadeForKids", isMadeForKids)
                    putExtra("commentsEnabled", commentsEnabled)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                launchActivityWithBypass(intent)
            } catch (e: Exception) {
                e.printStackTrace()
                reportTaskFailure(serverBaseUrl, taskId, deviceToken)
                AutomationState.isAutomationActive = false
            }
        }
    }

    private fun reportTaskFailure(serverBaseUrl: String, taskId: String, deviceToken: String?) {
        thread {
            try {
                val endpoint = "$serverBaseUrl/masters/api/youtube/tasks/$taskId/complete/"
                val url = URL(endpoint)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                if (!deviceToken.isNullOrEmpty()) {
                    connection.setRequestProperty("X-Device-Token", deviceToken)
                }
                connection.doOutput = true

                val outputStream = connection.outputStream
                outputStream.write("{\"status\":\"FAILED\"}".toByteArray(Charsets.UTF_8))
                outputStream.flush()
                outputStream.close()

                connection.responseCode
                connection.disconnect()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }


    private fun launchInstagramDispatch(taskId: String, phone: String, msg: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("platform", "INSTAGRAM")
            putExtra("taskType", "INSTAGRAM")
            putExtra("taskId", taskId)
            putExtra("phoneNumber", phone)
            putExtra("message", msg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        launchActivityWithBypass(intent)
    }

    private fun launchFacebookDispatch(taskId: String, phone: String, msg: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("platform", "FACEBOOK")
            putExtra("taskType", "FACEBOOK")
            putExtra("taskId", taskId)
            putExtra("phoneNumber", phone)
            putExtra("message", msg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        launchActivityWithBypass(intent)
    }

    private fun launchWhatsAppDispatch(taskId: String, phone: String, msg: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("taskType", "WHATSAPP")
            putExtra("taskId", taskId)
            putExtra("phoneNumber", phone)
            putExtra("message", msg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        launchActivityWithBypass(intent)
    }

    private fun launchActivityWithBypass(intent: Intent) {
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