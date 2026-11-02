package com.example.automation

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.result.contract.ActivityResultContracts
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
        
        tvDeviceConfig.text = "Connecting to $cleanUrl..."
        
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
                runOnUiThread {
                    if (responseCode == HttpURLConnection.HTTP_CREATED || responseCode == HttpURLConnection.HTTP_OK || responseCode == 400) {
                        tvDeviceConfig.text = "Configured: $phone\n($cleanUrl)"
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
            hint = "Server URL (e.g. http://192.168.0.109:8000)"
            setText(if (currentUrl.isNotEmpty()) currentUrl else "http://192.168.0.109:8000")
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

        val platform = intent?.getStringExtra("platform") ?: "WHATSAPP"
        val taskId = intent?.getStringExtra("taskId")
        val message = intent?.getStringExtra("message")

        if (platform == "TWITTER") {
            val taskType = intent?.getStringExtra("taskType") ?: "DM"
            val targetHandle = intent?.getStringExtra("targetHandle") ?: ""

            if (!message.isNullOrEmpty()) {
                wakeUpAndDismissLockScreen()
                AutomationState.currentTaskId = taskId
                AutomationState.platform = "TWITTER"
                AutomationState.taskContent = message
                AutomationState.isAutomationActive = true

                if (taskType == "TWEET") {
                    tvStatus?.text = "Executing Twitter Task #$taskId\nAction: Posting Custom Tweet"
                    AutomationState.taskType = "TWITTER_TWEET"
                    AutomationState.twitterPhase = "TWEET_COMPOSE"
                    dispatchTwitterTweetIntent(message)
                } else {
                    tvStatus?.text = "Executing Twitter Task #$taskId\nRecipient: $targetHandle (DM / Follow Fallback)"
                    AutomationState.taskType = "TWITTER_DM"
                    AutomationState.targetHandle = targetHandle
                    AutomationState.twitterPhase = "PROFILE_CHECK"
                    dispatchTwitterDmIntent(targetHandle, message)
                }
            } else {
                updateWaitingStatus()
            }
        } else {
            val phoneNumber = intent?.getStringExtra("phoneNumber")
            if (!phoneNumber.isNullOrEmpty() && !message.isNullOrEmpty()) {
                wakeUpAndDismissLockScreen()
                tvStatus?.text = "Executing Task #$taskId\nRecipient: $phoneNumber"
                AutomationState.currentTaskId = taskId
                AutomationState.platform = "WHATSAPP"
                AutomationState.taskType = "WHATSAPP"
                dispatchWhatsAppIntent(phoneNumber, message)
            } else {
                updateWaitingStatus()
            }
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

            // 1. Turn the safety switch ON so the Auto-Clicker knows it is allowed to run
            AutomationState.isAutomationActive = true

            startActivity(intent)

            // 2. KILL MainActivity instantly so it doesn't loop when the Home/Back button is pressed
            finish()

        } catch (e: Exception) {
            Toast.makeText(this, "WhatsApp Business not installed", Toast.LENGTH_SHORT).show()
            e.printStackTrace()
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

    private fun dispatchTwitterTweetIntent(message: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                putExtra(Intent.EXTRA_TEXT, message)
                type = "text/plain"
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
}