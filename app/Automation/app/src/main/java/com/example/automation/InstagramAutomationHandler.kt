package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo

object InstagramAutomationHandler {

    private const val TAG = "InstagramDebug"

    fun startInstagramFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        Log.d(TAG, "Starting Instagram automation flow...")
        AutomationState.instagramPhase = "TYPE_MESSAGE"
        attemptProcessTask(service, handler, onFinish, onError, 0)
    }

    private fun attemptProcessTask(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 15) {
            Log.e(TAG, "Gave up after 15 attempts. Resetting.")
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

        val messageBox = findEditText(rootNode)
        val currentText = messageBox?.text?.toString() ?: ""

        if (messageBox != null && currentText != message) {
            Log.d(TAG, "Message box found. Pasting message...")
            
            // 1. Focus the text box
            messageBox.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            
            // 2. Use Clipboard to Paste (this triggers Instagram's TextWatcher so the Send button enables)
            val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("auto_message", message)
            clipboard.setPrimaryClip(clip)
            
            messageBox.performAction(AccessibilityNodeInfo.ACTION_PASTE)
            
            // Re-run attempt shortly to let UI update and hit Send button
            handler.postDelayed({ attemptProcessTask(service, handler, onFinish, onError, attempt + 1) }, 1000)
            return
        } else if (messageBox != null && currentText.contains(message)) {
            Log.d(TAG, "Text is typed. Looking for Send button...")
            val sendButton = findSendButton(rootNode)
            if (sendButton != null) {
                Log.d(TAG, "Send button found! Clicking...")
                if (sendButton.isClickable) {
                    sendButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                } else {
                    sendButton.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                }

                // Report success to backend
                reportTaskStatus("COMPLETED")

                // Wait 3.0s to ensure message is sent, then go HOME, and reset
                handler.postDelayed({
                    Log.d(TAG, "Closing Instagram...")
                    onFinish()
                }, 3000)
                return
            } else {
                Log.d(TAG, "Send button not found yet, retry $attempt")
            }
        }

        retryLater(service, handler, onFinish, onError, attempt)
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

        val contentDesc = node.contentDescription?.toString()
        val text = node.text?.toString()
        
        // 🎯 TARGETING THE SPECIFIC INSTAGRAM SEND BUTTON
        // The Instagram send button usually has the text 'Send' or content description 'Send'
        if (contentDesc != null && contentDesc.equals("Send", ignoreCase = true)) return node
        if (text != null && text.equals("Send", ignoreCase = true)) return node

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
                    outputStream.write("{\"status\":\"$status\"}".toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()

                    connection.responseCode // Trigger the request
                    connection.disconnect()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }.start()
        }
    }
}