package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo

object FacebookAutomationHandler {

    private const val TAG = "FacebookDebug"

    fun startFacebookFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        Log.d(TAG, "Starting Facebook Messenger automation flow...")
        attemptProcessTask(service, handler, onFinish, onError, 0)
    }

    private fun attemptProcessTask(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 25) {
            Log.e(TAG, "Gave up after 25 attempts. Resetting.")
            reportTaskStatus("FAILED")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            Log.d(TAG, "Root node null, retry $attempt")
            retryLater(service, handler, onFinish, onError, attempt)
            return
        }

        val message = AutomationState.taskContent
        if (message.isNullOrEmpty()) {
            Log.e(TAG, "Message is null or empty, aborting.")
            reportTaskStatus("FAILED")
            onError()
            return
        }

        // ── Phase A: Chat Screen Check (Priority 1) ──
        // If messageBox is already present, we are in the chat screen!
        val messageBox = findEditText(rootNode)
        if (messageBox != null) {
            val currentText = messageBox.text?.toString() ?: ""
            if (!currentText.contains(message)) {
                Log.d(TAG, "Chat screen active. Typing message...")
                messageBox.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

                val arguments = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, message)
                }
                val setSuccess = messageBox.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)

                if (!setSuccess) {
                    val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("auto_message", message)
                    clipboard.setPrimaryClip(clip)
                    messageBox.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                }

                handler.postDelayed({ attemptProcessTask(service, handler, onFinish, onError, attempt + 1) }, 1000)
                return
            } else {
                Log.d(TAG, "Message is typed. Looking for Send button...")
                val sendButton = findSendButton(rootNode)
                if (sendButton != null) {
                    Log.d(TAG, "Send button found! Clicking...")
                    performClickUpward(sendButton)

                    reportTaskStatus("COMPLETED")

                    handler.postDelayed({
                        Log.d(TAG, "Closing Facebook App...")
                        onFinish()
                    }, 3000)
                    return
                } else {
                    Log.d(TAG, "Send button not found yet, retry $attempt")
                }
            }
            retryLater(service, handler, onFinish, onError, attempt)
            return
        }

        // ── Phase B: Profile / Share Screen Check ──
        // Look for the "Message" or "Send message" button on the profile page
        val messageProfileButton = findMessageProfileButton(rootNode)
        if (messageProfileButton != null) {
            Log.d(TAG, "Found the 'Message' button on the profile page! Clicking it to open chat...")
            performClickUpward(messageProfileButton)
            // Wait for chat screen to open
            handler.postDelayed({ attemptProcessTask(service, handler, onFinish, onError, attempt + 1) }, 2000)
            return
        }

        retryLater(service, handler, onFinish, onError, attempt)
    }

    private fun performClickUpward(node: AccessibilityNodeInfo?): Boolean {
        var curr = node
        while (curr != null) {
            if (curr.isClickable) {
                return curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            curr = curr.parent
        }
        return node?.performAction(AccessibilityNodeInfo.ACTION_CLICK) ?: false
    }

    private fun findMessageProfileButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val contentDesc = node.contentDescription?.toString()?.trim()
        val text = node.text?.toString()?.trim()
        
        // Target the "Message" or "Send Message" button on a Facebook Profile/Page
        if (!contentDesc.isNullOrEmpty()) {
            if (contentDesc.equals("Message", ignoreCase = true) ||
                contentDesc.equals("Send message", ignoreCase = true) ||
                contentDesc.startsWith("Message ", ignoreCase = true) ||
                contentDesc.equals("Chat", ignoreCase = true)) {
                return node
            }
        }
        if (!text.isNullOrEmpty()) {
            if (text.equals("Message", ignoreCase = true) ||
                text.equals("Send message", ignoreCase = true) ||
                text.startsWith("Message ", ignoreCase = true) ||
                text.equals("Chat", ignoreCase = true)) {
                return node
            }
        }

        for (i in 0 until node.childCount) {
            val result = findMessageProfileButton(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun findEditText(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.className == "android.widget.EditText") return node

        for (i in 0 until node.childCount) {
            val result = findEditText(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun findSendButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val contentDesc = node.contentDescription?.toString()?.trim()
        val text = node.text?.toString()?.trim()
        val resId = node.viewIdResourceName?.lowercase() ?: ""
        
        // Target Facebook Messenger Send Button
        if (!contentDesc.isNullOrEmpty()) {
            if (contentDesc.equals("Send", ignoreCase = true) ||
                contentDesc.equals("Send message", ignoreCase = true) ||
                contentDesc.equals("Send Message", ignoreCase = false)) {
                return node
            }
        }
        if (!text.isNullOrEmpty()) {
            if (text.equals("Send", ignoreCase = true) ||
                text.equals("Send message", ignoreCase = true) ||
                text.equals("Send Message", ignoreCase = false)) {
                return node
            }
        }
        if (resId.contains("send_button") || resId.contains("send_icon")) {
            return node
        }

        for (i in 0 until node.childCount) {
            val result = findSendButton(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun retryLater(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        handler.postDelayed({
            attemptProcessTask(service, handler, onFinish, onError, attempt + 1)
        }, 800)
    }

    private fun reportTaskStatus(status: String) {
        val serverBaseUrl = AutomationState.serverBaseUrl
        val taskId = AutomationState.currentTaskId

        if (serverBaseUrl != null && taskId != null && taskId != "TEST_LOCAL") {
            Thread {
                try {
                    val url = java.net.URL("$serverBaseUrl/masters/api/tasks/$taskId/complete/")
                    val connection = url.openConnection() as java.net.HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/json")
                    
                    val deviceToken = AutomationState.deviceToken
                    if (!deviceToken.isNullOrEmpty()) {
                        connection.setRequestProperty("X-Device-Token", deviceToken)
                    }
                    
                    connection.doOutput = true

                    val outputStream = connection.outputStream
                    outputStream.write("{"status":"$status"}".toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()

                    connection.responseCode
                    connection.disconnect()
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update task status: ${e.message}")
                }
            }.start()
        }
    }
}
