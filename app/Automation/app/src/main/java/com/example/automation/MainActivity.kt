package com.example.automation

import android.app.KeyguardManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.text.TextUtils
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupSettings()
        setupPermissionButtons()

        // Ensure background polling service is running
        val serviceIntent = Intent(this, PollingService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }

        // Check for OTA Updates
        val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        val serverBaseUrl = prefs.getString("server_url", BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL
        AutomationState.serverBaseUrl = serverBaseUrl
        AutomationState.deviceToken = prefs.getString("device_token", null)

        if (serverBaseUrl.isNotEmpty()) {
            UpdateChecker(this, serverBaseUrl).checkForUpdates()
        }

        handleIntent(intent)
    }

    private fun setupSettings() {
        val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        val btnScanQr = findViewById<Button>(R.id.btnScanQr)
        val btnManualConfig = findViewById<Button>(R.id.btnManualConfig)
        val tvDeviceConfig = findViewById<TextView>(R.id.tvDeviceConfig)

        // Load saved
        val savedPhone = prefs.getString("device_phone", "")
        val savedUrl = prefs.getString("server_url", "")
        if (!savedPhone.isNullOrEmpty()) {
            tvDeviceConfig.text = "Configured: $savedPhone\n($savedUrl)"
        }

        btnManualConfig?.setOnClickListener {
            showManualConfigDialog(savedPhone ?: "")
        }

        tvDeviceConfig.setOnClickListener {
            showManualConfigDialog(savedPhone ?: "")
        }

        // QR Scanner Launcher
        val barcodeLauncher = registerForActivityResult(ScanContract()) { result: ScanIntentResult ->
            if (result.contents != null) {
                try {
                    val json = JSONObject(result.contents)
                    var url = json.optString("url", "").trim().removeSuffix("/")
                    val phone = json.optString("phone", "").trim()
                    val name = json.optString("name", "Android Companion App").trim()

                    if (url.contains("localhost") || url.contains("127.0.0.1")) {
                        AlertDialog.Builder(this@MainActivity)
                            .setTitle("Localhost Detected")
                            .setMessage("The scanned QR code has URL:\n$url\n\nA mobile phone cannot connect to 'localhost' on your computer.\n\nPlease ensure your dashboard shows your computer's Wi-Fi IP (e.g. 192.168.x.x) and scan again, or configure manually.")
                            .setPositiveButton("Configure Manually") { _, _ ->
                                showManualConfigDialog(phone)
                            }
                            .setNegativeButton("Cancel", null)
                            .show()
                        return@registerForActivityResult
                    }

                    if (url.isNotEmpty() && phone.isNotEmpty()) {
                        registerAndConnectDevice(url, phone, name)
                    } else {
                        Toast.makeText(this, "Invalid QR Code Data", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this, "Error parsing QR Code: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        btnScanQr.setOnClickListener {
            val options = ScanOptions()
            options.setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            options.setPrompt("Scan Device QR Code from Dashboard")
            options.setCameraId(0)
            options.setBeepEnabled(true)
            options.setBarcodeImageEnabled(false)
            barcodeLauncher.launch(options)
        }
    }

    private fun registerAndConnectDevice(url: String, phone: String, deviceName: String = "Android Companion App") {
        val cleanUrl = url.trim().removeSuffix("/")
        val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        val tvDeviceConfig = findViewById<TextView>(R.id.tvDeviceConfig)
        
        tvDeviceConfig?.text = "Connecting to $cleanUrl..."
        AutomationState.serverBaseUrl = cleanUrl
        
        thread {
            try {
                val registerUrl = URL("$cleanUrl/masters/api/devices/")
                val connection = registerUrl.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 7000
                connection.readTimeout = 7000
                connection.doOutput = true
                
                val payload = JSONObject().apply {
                    put("phone_number", phone)
                    put("name", deviceName)
                }
                
                val os = connection.outputStream
                os.write(payload.toString().toByteArray())
                os.flush()
                os.close()
                
                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_CREATED || responseCode == HttpURLConnection.HTTP_OK) {
                    try {
                        val respText = connection.inputStream.bufferedReader().use { it.readText() }
                        val respJson = JSONObject(respText)
                        val apiToken = respJson.optString("api_token", "")
                        if (apiToken.isNotEmpty()) {
                            prefs.edit().putString("device_token", apiToken).apply()
                            AutomationState.deviceToken = apiToken
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                runOnUiThread {
                    if (responseCode == HttpURLConnection.HTTP_CREATED || responseCode == HttpURLConnection.HTTP_OK || responseCode == 400) {
                        tvDeviceConfig?.text = "Configured: $phone\n($cleanUrl)"
                        prefs.edit()
                            .putString("server_url", cleanUrl)
                            .putString("device_phone", phone)
                            .apply()
                            
                        Toast.makeText(this@MainActivity, "Connected to $cleanUrl!", Toast.LENGTH_LONG).show()
                        
                        // Restart Polling Service
                        val serviceIntent = Intent(this@MainActivity, PollingService::class.java)
                        stopService(serviceIntent)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent)
                        } else {
                            startService(serviceIntent)
                        }
                    } else {
                        tvDeviceConfig.text = "Failed (HTTP $responseCode)"
                        Toast.makeText(this@MainActivity, "Server returned HTTP $responseCode", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    tvDeviceConfig.text = "Error connecting to $cleanUrl"
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Connection Failed")
                        .setMessage("Could not connect to:\n$cleanUrl\n\nReason: ${e.localizedMessage ?: e.message}\n\nPlease check:\n1. Your phone and laptop are on the same Wi-Fi.\n2. The laptop IP is correct (e.g. 192.168.x.x:8000).\n3. Django backend (port 8000) is running.")
                        .setPositiveButton("Manual Setup") { _, _ ->
                            showManualConfigDialog(phone)
                        }
                        .setNegativeButton("OK", null)
                        .show()
                }
            }
        }
    }

    private fun showManualConfigDialog(prefilledPhone: String = "") {
        val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        val currentUrl = prefs.getString("server_url", "") ?: ""
        val currentPhone = if (prefilledPhone.isNotEmpty()) prefilledPhone else (prefs.getString("device_phone", "") ?: "")

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 40, 50, 10)
        }

        val etUrl = EditText(this).apply {
            hint = "Server URL (e.g. https://sslocal.mediatechtemple.com)"
            setText(currentUrl.ifEmpty { "https://sslocal.mediatechtemple.com" })
        }

        val etPhone = EditText(this).apply {
            hint = "Phone Number (e.g. +919876543210)"
            setText(currentPhone)
        }

        layout.addView(TextView(this).apply { text = "Server Base URL (Django):" })
        layout.addView(etUrl)
        layout.addView(TextView(this).apply { 
            text = "Device Phone Number:"
            setPadding(0, 20, 0, 0)
        })
        layout.addView(etPhone)

        AlertDialog.Builder(this)
            .setTitle("Manual Server Setup")
            .setView(layout)
            .setPositiveButton("Save & Connect") { _, _ ->
                val inputUrl = etUrl.text.toString().trim()
                val inputPhone = etPhone.text.toString().trim()
                if (inputUrl.isNotEmpty() && inputPhone.isNotEmpty()) {
                    registerAndConnectDevice(inputUrl, inputPhone, "Manual Connected Device")
                } else {
                    Toast.makeText(this, "Both URL and Phone are required", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        updateWaitingStatus()
    }

    private fun handleIntent(intent: Intent?) {
        val tvStatus = findViewById<TextView>(R.id.tvStatus)

        val platform = intent?.getStringExtra("platform") ?: ""
        val taskType = intent?.getStringExtra("taskType") ?: "WHATSAPP"
        val taskId = intent?.getStringExtra("taskId")
        val message = intent?.getStringExtra("message")

        // 1. YouTube Task Dispatch
        if (platform.equals("YOUTUBE", ignoreCase = true) || taskType.equals("YOUTUBE", ignoreCase = true)) {
            val videoUriStr = intent?.getStringExtra("videoUri")
            val title = intent?.getStringExtra("title") ?: "Video Update"
            val description = intent?.getStringExtra("description") ?: ""

            if (!videoUriStr.isNullOrEmpty()) {
                wakeUpAndDismissLockScreen()
                tvStatus?.text = "Executing YouTube Task #$taskId\nTitle: $title"
                AutomationState.currentTaskId = taskId
                AutomationState.currentTaskType = "YOUTUBE"
                AutomationState.platform = "YOUTUBE"
                AutomationState.taskType = "YOUTUBE"
                AutomationState.videoTitle = title
                AutomationState.videoDescription = description
                AutomationState.isMadeForKids = intent.getBooleanExtra("isMadeForKids", true)
                AutomationState.commentsEnabled = intent.getBooleanExtra("commentsEnabled", true)

                val uri = Uri.parse(videoUriStr)
                dispatchYouTubeIntent(uri, title, description)
                return
            } else {
                updateWaitingStatus()
                return
            }
        }

        // 2. Twitter Task Dispatch
        if (platform == "TWITTER" || taskType.startsWith("TWITTER")) {
            val targetHandle = intent?.getStringExtra("targetHandle") ?: ""
            val mediaUrisStrings = intent?.getStringArrayListExtra("mediaUris") ?: arrayListOf()
            val mediaUris = mediaUrisStrings.map { Uri.parse(it) }

            if (!message.isNullOrEmpty() || mediaUris.isNotEmpty()) {
                wakeUpAndDismissLockScreen()
                AutomationState.currentTaskId = taskId
                AutomationState.platform = "TWITTER"
                AutomationState.taskContent = message
                AutomationState.isAutomationActive = true
                if (AutomationState.serverBaseUrl.isNullOrEmpty()) {
                    val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                    AutomationState.serverBaseUrl = prefs.getString("server_url", "https://sslocal.mediatechtemple.com")
                }

                if (taskType == "TWEET" || taskType == "TWITTER_TWEET") {
                    val info = if (mediaUris.isNotEmpty()) "Posting Tweet with ${mediaUris.size} photo(s)" else "Posting Custom Tweet"
                    tvStatus?.text = "Executing Twitter Task #$taskId\nAction: $info"
                    AutomationState.taskType = "TWITTER_TWEET"
                    AutomationState.currentTaskType = "TWITTER_TWEET"
                    AutomationState.twitterPhase = "TWEET_COMPOSE"
                    dispatchTwitterTweetIntent(message ?: "", mediaUris)
                } else {
                    tvStatus?.text = "Executing Twitter Task #$taskId\nRecipient: $targetHandle (DM / Follow Fallback)"
                    AutomationState.taskType = "TWITTER_DM"
                    AutomationState.currentTaskType = "TWITTER_DM"
                    AutomationState.targetHandle = targetHandle
                    AutomationState.twitterPhase = "PROFILE_CHECK"
                    dispatchTwitterDmIntent(targetHandle, message ?: "")
                }
                return
            } else {
                updateWaitingStatus()
                return
            }
        }

        // 4. Instagram Task Dispatch (DMs, Posts, Stories, Reels)
        if (platform.equals("INSTAGRAM", ignoreCase = true) || taskType.startsWith("INSTAGRAM")) {
            val username = intent?.getStringExtra("phoneNumber") ?: intent?.getStringExtra("targetHandle") ?: ""
            val mediaUrisStrings = intent?.getStringArrayListExtra("mediaUris") ?: arrayListOf()
            val mediaUris = mediaUrisStrings.map { Uri.parse(it) }

            wakeUpAndDismissLockScreen()
            AutomationState.currentTaskId = taskId
            AutomationState.platform = "INSTAGRAM"
            AutomationState.currentTaskType = taskType
            AutomationState.taskType = taskType
            AutomationState.taskContent = message
            AutomationState.currentMessage = message

            when {
                taskType == "INSTAGRAM_POST" -> {
                    tvStatus?.text = "Executing Instagram Post #$taskId\nMedia: ${mediaUris.size} item(s)"
                    dispatchInstagramPostIntent(mediaUris, message ?: "")
                    return
                }
                taskType == "INSTAGRAM_STORY" -> {
                    tvStatus?.text = "Executing Instagram Story #$taskId"
                    val storyUri = mediaUris.firstOrNull() ?: return
                    dispatchInstagramStoryIntent(storyUri, message ?: "")
                    return
                }
                taskType == "INSTAGRAM_REEL" -> {
                    tvStatus?.text = "Executing Instagram Reel #$taskId"
                    val reelUri = mediaUris.firstOrNull() ?: return
                    dispatchInstagramReelIntent(reelUri, message ?: "")
                    return
                }
                else -> {
                    if (!username.isNullOrEmpty() && !message.isNullOrEmpty()) {
                        tvStatus?.text = "Executing Instagram DM #$taskId\nRecipient: $username"
                        AutomationState.targetHandle = username
                        dispatchInstagramIntent(username, message)
                        return
                    }
                }
            }
            updateWaitingStatus()
            return
        }

        // 5. Facebook Task Dispatch (Feed Posts & DMs)
        if (platform.equals("FACEBOOK", ignoreCase = true) || taskType.startsWith("FACEBOOK", ignoreCase = true)) {
            val mediaUrisStrings = intent?.getStringArrayListExtra("mediaUris") ?: arrayListOf()
            val mediaUris = mediaUrisStrings.map { Uri.parse(it) }

            wakeUpAndDismissLockScreen()
            AutomationState.currentTaskId = taskId
            AutomationState.platform = "FACEBOOK"
            AutomationState.taskContent = message
            AutomationState.currentMessage = message

            if (taskType.equals("FACEBOOK_POST", ignoreCase = true) || mediaUris.isNotEmpty()) {
                tvStatus?.text = "Executing Facebook Post #$taskId\nMedia: ${mediaUris.size} item(s)"
                AutomationState.currentTaskType = "FACEBOOK_POST"
                AutomationState.taskType = "FACEBOOK_POST"
                dispatchFacebookPostIntent(mediaUris, message ?: "")
                return
            } else {
                val username = intent?.getStringExtra("phoneNumber") ?: intent?.getStringExtra("targetHandle") ?: ""
                if (!username.isNullOrEmpty() && !message.isNullOrEmpty()) {
                    tvStatus?.text = "Executing Facebook DM #$taskId\nRecipient: $username"
                    AutomationState.currentTaskType = "FACEBOOK_DM"
                    AutomationState.taskType = "FACEBOOK_DM"
                    AutomationState.targetHandle = username
                    dispatchFacebookIntent(username, message)
                    return
                }
            }
            updateWaitingStatus()
            return
        }

        // 3. WhatsApp Task Dispatch (Default)
        val phoneNumber = intent?.getStringExtra("phoneNumber")
        if (!phoneNumber.isNullOrEmpty() && !message.isNullOrEmpty()) {
            wakeUpAndDismissLockScreen()
            tvStatus?.text = "Executing WhatsApp Task #$taskId\nRecipient: $phoneNumber"
            AutomationState.currentTaskId = taskId
            AutomationState.platform = "WHATSAPP"
            AutomationState.currentTaskType = "WHATSAPP"
            AutomationState.taskType = "WHATSAPP"
            dispatchWhatsAppIntent(phoneNumber, message)
        } else {
            updateWaitingStatus()
        }
    }

    private fun updateWaitingStatus() {
        val tvStatus = findViewById<TextView>(R.id.tvStatus)
        val btnOverlay = findViewById<Button>(R.id.btnGrantOverlay)
        val btnAccessibility = findViewById<Button>(R.id.btnGrantAccessibility)

        val isOverlayGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)
        val isAccessibilityEnabled = isAccessibilityServiceEnabled()

        if (tvStatus != null) {
            val statusText = StringBuilder("Automation Engine Active\n\nWaiting for next server task...")

            if (!isOverlayGranted) {
                statusText.append("\n\n⚠️ Missing: Display over other apps")
            }
            if (!isAccessibilityEnabled) {
                statusText.append("\n\n⚠️ Missing: Accessibility Service")
            }

            tvStatus.text = statusText.toString()
        }

        btnOverlay?.visibility = if (isOverlayGranted) View.GONE else View.VISIBLE
        btnAccessibility?.visibility = if (isAccessibilityEnabled) View.GONE else View.VISIBLE
    }

    private fun setupPermissionButtons() {
        findViewById<Button>(R.id.btnGrantOverlay)?.setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }

        findViewById<Button>(R.id.btnGrantAccessibility)?.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
            Toast.makeText(this, "Find 'WA Dispatcher' and turn it ON", Toast.LENGTH_LONG).show()
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedService = "$packageName/${WAAutoClickService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        
        if (enabledServices.isNullOrEmpty()) return false
        
        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)
        while (colonSplitter.hasNext()) {
            val componentName = colonSplitter.next()
            if (componentName.equals(expectedService, ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    private fun wakeUpAndDismissLockScreen() {
        // Force the screen to turn on and stay on (Crucial for Realme / Android 14)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        }
    }

    private fun dispatchWhatsAppIntent(phoneNumber: String, message: String) {
        try {
            val encodedText = URLEncoder.encode(message, "UTF-8")
            val uri = Uri.parse("https://api.whatsapp.com/send?phone=$phoneNumber&text=$encodedText")

            val intent = Intent(Intent.ACTION_VIEW, uri)
            intent.setPackage("com.whatsapp.w4b")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            // Turn safety switch ON so Auto-Clicker knows it is allowed to run
            AutomationState.isAutomationActive = true
            AutomationState.currentTaskType = "WHATSAPP"

            startActivity(intent)

            // Kill MainActivity instantly so it doesn't loop when Home/Back button is pressed
            finish()

        } catch (e: Exception) {
            Toast.makeText(this, "WhatsApp Business not installed", Toast.LENGTH_SHORT).show()
            e.printStackTrace()
            AutomationState.isAutomationActive = false
        }
    }

    private fun dispatchYouTubeIntent(videoUri: Uri, title: String, description: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "video/*"
                setPackage("com.google.android.youtube")
                putExtra(Intent.EXTRA_STREAM, videoUri)
                clipData = ClipData.newUri(contentResolver, "video", videoUri)
                putExtra(Intent.EXTRA_TITLE, title)
                putExtra(Intent.EXTRA_SUBJECT, title)
                putExtra(Intent.EXTRA_TEXT, description)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            try {
                grantUriPermission("com.google.android.youtube", videoUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (e: Exception) {
                Log.w("MainActivity", "grantUriPermission ignored: ${e.message}")
            }

            // Turn safety switch ON so Auto-Clicker knows it is allowed to run
            AutomationState.isAutomationActive = true
            AutomationState.currentTaskType = "YOUTUBE"
            AutomationState.videoTitle = title
            AutomationState.videoDescription = description

            startActivity(intent)

            // Kill MainActivity so user/accessibility lands cleanly in YouTube
            finish()

        } catch (e: Exception) {
            Toast.makeText(this, "YouTube app not installed or error: ${e.message}", Toast.LENGTH_LONG).show()
            e.printStackTrace()
            AutomationState.isAutomationActive = false
        }
    }

    private fun dispatchTwitterDmIntent(targetHandle: String, message: String) {
        try {
            val cleanHandle = targetHandle.removePrefix("@").trim()
            val uri = Uri.parse("twitter://user?screen_name=$cleanHandle")
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage("com.twitter.android")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }

            AutomationState.isAutomationActive = true
            AutomationState.platform = "TWITTER"
            AutomationState.taskType = "TWITTER_DM"
            AutomationState.targetHandle = cleanHandle
            AutomationState.taskContent = message
            AutomationState.twitterPhase = "PROFILE_CHECK"

            startActivity(intent)
            finish()
        } catch (e: Exception) {
            try {
                val cleanHandle = targetHandle.removePrefix("@").trim()
                val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://twitter.com/$cleanHandle")).apply {
                    setPackage("com.twitter.android")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                AutomationState.isAutomationActive = true
                AutomationState.platform = "TWITTER"
                AutomationState.taskType = "TWITTER_DM"
                AutomationState.targetHandle = cleanHandle
                AutomationState.taskContent = message
                AutomationState.twitterPhase = "PROFILE_CHECK"

                startActivity(webIntent)
                finish()
            } catch (ex: Exception) {
                Toast.makeText(this, "Twitter (X) app not installed", Toast.LENGTH_SHORT).show()
                ex.printStackTrace()
            }
        }
    }

    private fun dispatchTwitterTweetIntent(message: String, mediaUris: List<Uri> = emptyList()) {
        try {
            val intent = if (mediaUris.isEmpty()) {
                Intent(Intent.ACTION_SEND).apply {
                    putExtra(Intent.EXTRA_TEXT, message)
                    type = "text/plain"
                    setPackage("com.twitter.android")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
            } else if (mediaUris.size == 1) {
                Intent(Intent.ACTION_SEND).apply {
                    type = "image/*"
                    setPackage("com.twitter.android")
                    putExtra(Intent.EXTRA_STREAM, mediaUris[0])
                    putExtra(Intent.EXTRA_TEXT, message)
                    clipData = ClipData.newUri(contentResolver, "media", mediaUris[0])
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            } else {
                Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "image/*"
                    setPackage("com.twitter.android")
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(mediaUris))
                    putExtra(Intent.EXTRA_TEXT, message)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }

            for (u in mediaUris) {
                try {
                    grantUriPermission("com.twitter.android", u, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (e: Exception) {}
            }

            AutomationState.isAutomationActive = true
            AutomationState.platform = "TWITTER"
            AutomationState.taskType = "TWITTER_TWEET"
            AutomationState.taskContent = message
            AutomationState.twitterPhase = "TWEET_COMPOSE"

            startActivity(intent)
            finish()
        } catch (e: Exception) {
            try {
                val encoded = URLEncoder.encode(message, "UTF-8")
                val uri = Uri.parse("twitter://post?message=$encoded")
                val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                    setPackage("com.twitter.android")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                AutomationState.isAutomationActive = true
                AutomationState.platform = "TWITTER"
                AutomationState.taskType = "TWITTER_TWEET"
                AutomationState.taskContent = message
                AutomationState.twitterPhase = "TWEET_COMPOSE"

                startActivity(intent)
                finish()
            } catch (ex: Exception) {
                Toast.makeText(this, "Twitter (X) app not installed", Toast.LENGTH_SHORT).show()
                ex.printStackTrace()
            }
        }
    }

    private fun dispatchInstagramPostIntent(mediaUris: List<Uri>, caption: String) {
        try {
            val firstUri = mediaUris.firstOrNull() ?: return
            val isVideo = firstUri.toString().endsWith(".mp4", ignoreCase = true)
            val isSingle = mediaUris.size <= 1

            val intent = if (isSingle) {
                Intent(Intent.ACTION_SEND).apply {
                    type = if (isVideo) "video/*" else "image/*"
                    setPackage("com.instagram.android")
                    putExtra(Intent.EXTRA_STREAM, firstUri)
                    putExtra(Intent.EXTRA_TEXT, caption)
                    clipData = ClipData.newUri(contentResolver, "media", firstUri)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            } else {
                Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "image/*"
                    setPackage("com.instagram.android")
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(mediaUris))
                    putExtra(Intent.EXTRA_TEXT, caption)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }

            for (u in mediaUris) {
                try {
                    grantUriPermission("com.instagram.android", u, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (e: Exception) {}
            }

            AutomationState.isAutomationActive = true
            AutomationState.platform = "INSTAGRAM"
            AutomationState.currentTaskType = "INSTAGRAM_POST"
            AutomationState.taskType = "INSTAGRAM_POST"
            AutomationState.taskContent = caption
            AutomationState.currentMessage = caption

            startActivity(intent)
            finish()
        } catch (e: Exception) {
            Toast.makeText(this, "Instagram error: ${e.message}", Toast.LENGTH_LONG).show()
            e.printStackTrace()
            AutomationState.isAutomationActive = false
        }
    }

    private fun dispatchInstagramStoryIntent(mediaUri: Uri, caption: String) {
        try {
            val isVideo = mediaUri.toString().endsWith(".mp4", ignoreCase = true)
            val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
                type = if (isVideo) "video/*" else "image/*"
                setPackage("com.instagram.android")
                putExtra("interactive_asset_uri", mediaUri)
                putExtra(Intent.EXTRA_STREAM, mediaUri)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            try {
                grantUriPermission("com.instagram.android", mediaUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (e: Exception) {}

            AutomationState.isAutomationActive = true
            AutomationState.platform = "INSTAGRAM"
            AutomationState.currentTaskType = "INSTAGRAM_STORY"
            AutomationState.taskType = "INSTAGRAM_STORY"
            AutomationState.taskContent = caption
            AutomationState.currentMessage = caption

            startActivity(intent)
            finish()
        } catch (e: Exception) {
            try {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "image/*"
                    setPackage("com.instagram.android")
                    putExtra(Intent.EXTRA_STREAM, mediaUri)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                AutomationState.isAutomationActive = true
                AutomationState.platform = "INSTAGRAM"
                AutomationState.currentTaskType = "INSTAGRAM_STORY"
                AutomationState.taskType = "INSTAGRAM_STORY"
                AutomationState.taskContent = caption
                startActivity(intent)
                finish()
            } catch (ex: Exception) {
                Toast.makeText(this, "Instagram not installed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun dispatchInstagramReelIntent(mediaUri: Uri, caption: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "video/*"
                setPackage("com.instagram.android")
                putExtra(Intent.EXTRA_STREAM, mediaUri)
                putExtra(Intent.EXTRA_TEXT, caption)
                clipData = ClipData.newUri(contentResolver, "media", mediaUri)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            try {
                grantUriPermission("com.instagram.android", mediaUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (e: Exception) {}

            AutomationState.isAutomationActive = true
            AutomationState.platform = "INSTAGRAM"
            AutomationState.currentTaskType = "INSTAGRAM_REEL"
            AutomationState.taskType = "INSTAGRAM_REEL"
            AutomationState.taskContent = caption
            AutomationState.currentMessage = caption

            startActivity(intent)
            finish()
        } catch (e: Exception) {
            Toast.makeText(this, "Instagram not installed", Toast.LENGTH_SHORT).show()
        }
    }

    private fun dispatchInstagramIntent(username: String, message: String) {
        try {
            val cleanUser = username.removePrefix("@").trim()
            val uri = Uri.parse("https://ig.me/m/$cleanUser")
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage("com.instagram.android")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            AutomationState.isAutomationActive = true
            AutomationState.platform = "INSTAGRAM"
            AutomationState.currentTaskType = "INSTAGRAM"
            AutomationState.taskType = "INSTAGRAM"
            AutomationState.targetHandle = cleanUser
            AutomationState.taskContent = message
            AutomationState.currentMessage = message
            startActivity(intent)
            finish()
        } catch (e: Exception) {
            android.widget.Toast.makeText(this, "Instagram app not installed", android.widget.Toast.LENGTH_SHORT).show()
            e.printStackTrace()
            AutomationState.isAutomationActive = false
        }
    }

    private fun dispatchFacebookIntent(username: String, message: String) {
        try {
            var clean = username.trim()
            // Support both direct handles, share links, and full URLs
            val finalUrl = if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("fb://")) {
                clean
            } else if (clean.contains("facebook.com") || clean.contains("fb.me")) {
                "https://$clean"
            } else {
                val user = clean.removePrefix("@")
                "https://www.facebook.com/$user"
            }
            
            val uri = Uri.parse(finalUrl)
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage("com.facebook.katana") // Official Facebook App package name
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            
            AutomationState.isAutomationActive = true
            AutomationState.platform = "FACEBOOK"
            AutomationState.currentTaskType = "FACEBOOK"
            AutomationState.taskType = "FACEBOOK"
            AutomationState.targetHandle = finalUrl
            AutomationState.taskContent = message
            AutomationState.currentMessage = message

            try {
                startActivity(intent)
            } catch (anfe: Exception) {
                // Fallback without package specification if strict package match fails
                val fallbackIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                startActivity(fallbackIntent)
            }
            finish()
        } catch (e: Exception) {
            android.widget.Toast.makeText(this, "Facebook app not installed or invalid link", android.widget.Toast.LENGTH_SHORT).show()
            e.printStackTrace()
            AutomationState.isAutomationActive = false
        }
    }

    private fun dispatchFacebookPostIntent(mediaUris: List<Uri>, caption: String) {
        try {
            // Copy caption to clipboard so accessibility can paste it reliably
            if (caption.isNotEmpty()) {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("fb_caption", caption)
                clipboard.setPrimaryClip(clip)
            }

            val intent = when {
                mediaUris.isEmpty() -> {
                    val launchIntent = packageManager.getLaunchIntentForPackage("com.facebook.katana")?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    }
                    launchIntent ?: Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        setPackage("com.facebook.katana")
                        putExtra(Intent.EXTRA_TEXT, caption)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    }
                }
                mediaUris.size == 1 -> {
                    val uri = mediaUris[0]
                    val isVideo = uri.toString().contains(".mp4", ignoreCase = true) || 
                                  uri.toString().contains("video", ignoreCase = true)
                    Intent(Intent.ACTION_SEND).apply {
                        type = if (isVideo) "video/*" else "image/*"
                        setPackage("com.facebook.katana")
                        putExtra(Intent.EXTRA_STREAM, uri)
                        putExtra(Intent.EXTRA_TEXT, caption)
                        clipData = ClipData.newUri(contentResolver, "media", uri)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                }
                else -> {
                    Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                        type = "image/*"
                        setPackage("com.facebook.katana")
                        putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(mediaUris))
                        putExtra(Intent.EXTRA_TEXT, caption)
                        val clip = ClipData.newUri(contentResolver, "media_0", mediaUris[0])
                        for (i in 1 until mediaUris.size) {
                            clip.addItem(ClipData.Item(mediaUris[i]))
                        }
                        clipData = clip
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                }
            }

            for (u in mediaUris) {
                try {
                    grantUriPermission("com.facebook.katana", u, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (e: Exception) {}
            }

            AutomationState.isAutomationActive = true
            AutomationState.platform = "FACEBOOK"
            AutomationState.currentTaskType = "FACEBOOK_POST"
            AutomationState.taskType = "FACEBOOK_POST"
            AutomationState.taskContent = caption
            AutomationState.currentMessage = caption

            try {
                startActivity(intent)
            } catch (e: Exception) {
                intent.setPackage(null)
                startActivity(intent)
            }
            finish()
        } catch (e: Exception) {
            Toast.makeText(this, "Facebook app error: ${e.message}", Toast.LENGTH_SHORT).show()
            e.printStackTrace()
            AutomationState.isAutomationActive = false
        }
    }
}
