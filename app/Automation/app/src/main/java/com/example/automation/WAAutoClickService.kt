package com.example.automation

import android.accessibilityservice.AccessibilityService
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
    private val TAG = "AutoServiceDebug"
    private val handler = Handler(Looper.getMainLooper())

    private val safetyResetRunnable = Runnable {
        if (isProcessing) {
            Log.e(TAG, "Safety timeout reached. Force resetting isProcessing.")
            if (AutomationState.platform == "TWITTER") {
                TwitterAutomationHandler.reportTwitterTaskStatus("FAILED", "Safety timeout reached during Twitter automation")
            } else {
                reportTaskStatus("FAILED")
            }
            resetState()
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return

        // 🚨 CRITICAL CHECK: Only run IF an automation task is actively marked
        if (!AutomationState.isAutomationActive) return

        // ─────────────────────────────────────────────────────────────
        // 1. WHATSAPP AUTOMATION FLOW
        // ─────────────────────────────────────────────────────────────
        if ((packageName == "com.whatsapp.w4b" || packageName == "com.whatsapp") &&
            AutomationState.platform == "WHATSAPP") {

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
        // ─────────────────────────────────────────────────────────────
        if (packageName == "com.twitter.android" && AutomationState.platform == "TWITTER") {
            if (!isProcessing) {
                isProcessing = true
                handler.removeCallbacks(safetyResetRunnable)
                handler.postDelayed(safetyResetRunnable, 60000) // 60s timeout for full multi-phase Twitter DM flow

                TwitterAutomationHandler.startTwitterFlow(
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
            clickNode(sendButton)
            reportTaskStatus("COMPLETED")

            handler.postDelayed({
                Log.d(TAG, "Closing WhatsApp...")
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
    private fun clickNode(node: AccessibilityNodeInfo) {
        if (node.isClickable) {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        } else {
            node.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
    }

    private fun closeAppAndGoHome() {
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
        AutomationState.twitterPhase = "IDLE"
        isProcessing = false
        Log.d(TAG, "State reset completed. Ready for next server task.")
    }

    private fun reportTaskStatus(status: String) {
        val serverBaseUrl = AutomationState.serverBaseUrl
        val taskId = AutomationState.currentTaskId

        if (serverBaseUrl != null && taskId != null) {
            Thread {
                try {
                    val url = java.net.URL("$serverBaseUrl/masters/api/tasks/$taskId/complete/")
                    val connection = url.openConnection() as java.net.HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/json")
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
    }
}
