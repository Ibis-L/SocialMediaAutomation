package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONObject

class WAAutoClickService : AccessibilityService() {

    private var isProcessing = false
    private val TAG = "AutomationDebug"
    private val handler = Handler(Looper.getMainLooper())

    private val youTubeHandler by lazy { YouTubeAutomationHandler(this) }

    private val safetyResetRunnable = Runnable {
        if (isProcessing) {
            Log.e(TAG, "Safety timeout reached. Force resetting isProcessing.")
            if (AutomationState.platform == "TWITTER") {
                TwitterAutomationHandler.reportTwitterTaskStatus(this, "FAILED", "Safety timeout reached during Twitter automation")
            } else {
                reportTaskStatus("FAILED")
            }
            resetState()
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val pkg = event?.packageName?.toString() ?: return

        // 🚨 CRITICAL CHECK: Only run IF an automation task is actively marked
        if (!AutomationState.isAutomationActive) return

        // ─────────────────────────────────────────────────────────────
        // 1. WHATSAPP AUTOMATION FLOW
        // ─────────────────────────────────────────────────────────────
        if ((pkg == "com.whatsapp.w4b" || pkg == "com.whatsapp") &&
            (AutomationState.platform == "WHATSAPP" || AutomationState.currentTaskType == "WHATSAPP")
        ) {
            if (!isProcessing) {
                Log.d(TAG, "WhatsApp task detected. Starting auto-click...")
                isProcessing = true
                handler.removeCallbacks(safetyResetRunnable)
                handler.postDelayed(safetyResetRunnable, 15000)
                attemptWhatsAppSendClick(0)
            }
            return
        }

        // ─────────────────────────────────────────────────────────────
        // 2. TWITTER (X) AUTOMATION FLOW (Delegated to TwitterAutomationHandler)
        // Handles both Twitter app and system share/post bottom sheets
        // ─────────────────────────────────────────────────────────────
        if (AutomationState.platform == "TWITTER") {
            val isTwitterPkg = pkg == "com.twitter.android"
            val isSystemSheet = pkg == "android" || pkg == "com.android.intentresolver" || pkg.contains("chooser") || pkg.contains("share") || pkg.contains("systemui")
            
            if (isTwitterPkg || (isSystemSheet && AutomationState.taskType == "TWITTER_TWEET")) {
                if (!isProcessing) {
                    isProcessing = true
                    handler.removeCallbacks(safetyResetRunnable)
                    handler.postDelayed(safetyResetRunnable, 35000)

                    TwitterAutomationHandler.startTwitterFlow(
                        service = this,
                        handler = handler,
                        onFinish = {
                            closeAppAndGoHome()
                        },
                        onError = {
                            closeAppAndGoHome()
                        }
                    )
                }
                return
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 3. YOUTUBE AUTOMATION FLOW (Delegated to YouTubeAutomationHandler)
        // ─────────────────────────────────────────────────────────────
        if (pkg == "com.google.android.youtube" &&
            (AutomationState.platform == "YOUTUBE" || AutomationState.currentTaskType == "YOUTUBE")
        ) {
            youTubeHandler.handleEvent(event)
        }

        // ─────────────────────────────────────────────────────────────
        // 4. INSTAGRAM AUTOMATION FLOW (Delegated to InstagramAutomationHandler)
        // ─────────────────────────────────────────────────────────────
        if (pkg == "com.instagram.android" &&
            (AutomationState.platform == "INSTAGRAM" || AutomationState.currentTaskType.startsWith("INSTAGRAM"))
        ) {
            if (!isProcessing) {
                isProcessing = true
                handler.removeCallbacks(safetyResetRunnable)
                handler.postDelayed(safetyResetRunnable, 45000)

                InstagramAutomationHandler.startInstagramFlow(
                    service = this,
                    handler = handler,
                    onFinish = {
                        closeAppAndGoHome()
                    },
                    onError = {
                        resetState()
                    }
                )
            }
            return
        }

        // ─────────────────────────────────────────────────────────────
        // 5. FACEBOOK AUTOMATION FLOW (Delegated to FacebookAutomationHandler)
        // ─────────────────────────────────────────────────────────────
        if ((pkg == "com.facebook.katana" || pkg == "com.facebook.orca") &&
            (AutomationState.platform == "FACEBOOK" || AutomationState.currentTaskType.startsWith("FACEBOOK"))
        ) {
            if (!isProcessing) {
                isProcessing = true
                handler.removeCallbacks(safetyResetRunnable)
                handler.postDelayed(safetyResetRunnable, 45000)

                FacebookAutomationHandler.startFacebookFlow(
                    service = this,
                    handler = handler,
                    onFinish = {
                        closeAppAndGoHome()
                    },
                    onError = {
                        resetState()
                    }
                )
            }
            return
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // WHATSAPP SEND LOGIC
    // ─────────────────────────────────────────────────────────────────
    private fun attemptWhatsAppSendClick(attempt: Int) {
        if (attempt >= 15) {
            Log.e(TAG, "WhatsApp: Gave up after 15 attempts. Resetting.")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        val rootNode = rootInActiveWindow
        if (rootNode == null) {
            Log.d(TAG, "WhatsApp: Root node null, retry $attempt")
            retryWhatsAppLater(attempt)
            return
        }

        val sendButton = findWhatsAppSendButton(rootNode)

        if (sendButton != null) {
            Log.d(TAG, "WhatsApp: Send button found! Clicking...")
            performClick(sendButton)
            reportTaskStatus("COMPLETED")

            handler.postDelayed({
                Log.d(TAG, "Closing WhatsApp and returning Home...")
                closeAppAndGoHome()
            }, 3000)
            return
        }

        retryWhatsAppLater(attempt)
    }

    private fun findWhatsAppSendButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName
        val contentDesc = node.contentDescription?.toString()

        if (viewId != null && viewId.endsWith(":id/send")) return node
        if (contentDesc != null && (contentDesc.equals("Send", ignoreCase = true) || contentDesc.equals("Done", ignoreCase = true))) return node

        for (i in 0 until node.childCount) {
            val result = findWhatsAppSendButton(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun retryWhatsAppLater(attempt: Int) {
        handler.postDelayed({
            attemptWhatsAppSendClick(attempt + 1)
        }, 800)
    }

    // ─────────────────────────────────────────────────────────────────
    // COMMON UTILS & TASK REPORTING
    // ─────────────────────────────────────────────────────────────────
    fun performClick(node: AccessibilityNodeInfo?): Boolean {
        var current = node
        for (i in 0..3) {
            if (current == null) break
            if (current.isClickable) {
                return current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            current = current.parent
        }
        return false
    }

    fun clickNode(node: AccessibilityNodeInfo) {
        if (!performClick(node)) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
    }

    fun closeAppAndGoHome() {
        // Cancel safety timer immediately so it cannot fire FAILED after a successful post
        handler.removeCallbacks(safetyResetRunnable)
        AutomationState.isAutomationActive = false
        performGlobalAction(GLOBAL_ACTION_HOME)
        handler.postDelayed({
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
            }
            resetState()
        }, 1200)
    }

    private fun resetState() {
        handler.removeCallbacks(safetyResetRunnable)
        AutomationState.isAutomationActive = false
        AutomationState.platform = "WHATSAPP"
        AutomationState.currentTaskType = "WHATSAPP"
        AutomationState.taskType = "WHATSAPP"
        AutomationState.twitterPhase = "IDLE"
        AutomationState.currentTaskId = null
        isProcessing = false
        TwitterAutomationHandler.resetTweetState()
        Log.d(TAG, "State reset completed. Ready for next server task.")
    }

    private fun reportTaskStatus(status: String) {
        val serverBaseUrl = AutomationState.serverBaseUrl
        val taskId = AutomationState.currentTaskId

        if (serverBaseUrl != null && taskId != null && taskId != "TEST_LOCAL") {
            Thread {
                try {
                    val endpoint = "$serverBaseUrl/masters/api/tasks/$taskId/complete/"
                    val url = java.net.URL(endpoint)
                    val connection = url.openConnection() as java.net.HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/json")
                    val deviceToken = AutomationState.deviceToken ?: getSharedPreferences("AppPrefs", Context.MODE_PRIVATE).getString("device_token", null)
                    if (!deviceToken.isNullOrEmpty()) {
                        connection.setRequestProperty("X-Device-Token", deviceToken)
                    }
                    connection.doOutput = true

                    val outputStream = connection.outputStream
                    outputStream.write("{\"status\":\"$status\"}".toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()

                    connection.responseCode
                    connection.disconnect()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }.start()
        }
    }

    override fun onInterrupt() {
        resetState()
        youTubeHandler.resetState()
    }
}
