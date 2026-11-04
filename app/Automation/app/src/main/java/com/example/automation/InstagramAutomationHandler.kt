package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
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
        val taskType = AutomationState.taskType
        Log.d(TAG, "Starting Instagram automation flow. TaskType=$taskType")

        when {
            taskType.contains("POST", ignoreCase = true) -> {
                AutomationState.instagramPhase = "POST_PREVIEW"
                attemptPostFlow(service, handler, onFinish, onError, 0)
            }
            taskType.contains("STORY", ignoreCase = true) -> {
                AutomationState.instagramPhase = "STORY_SHARE"
                attemptStoryFlow(service, handler, onFinish, onError, 0)
            }
            taskType.contains("REEL", ignoreCase = true) -> {
                AutomationState.instagramPhase = "REEL_PREVIEW"
                attemptReelFlow(service, handler, onFinish, onError, 0)
            }
            else -> {
                AutomationState.instagramPhase = "TYPE_MESSAGE"
                attemptProcessDmTask(service, handler, onFinish, onError, 0)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. INSTAGRAM FEED POST (Single Image, Carousel, or Video)
    // ─────────────────────────────────────────────────────────────────
    private fun attemptPostFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 30) {
            Log.e(TAG, "Post flow timed out after $attempt attempts.")
            reportTaskStatus("FAILED")
            onError()
            return
        }

        val root = service.rootInActiveWindow
        if (root == null || root.packageName != "com.instagram.android") {
            handler.postDelayed({ attemptPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1000)
            return
        }

        // Phase 1: Check if on Caption / Final Share screen
        val captionBox = findCaptionEditText(root)
        val shareBtn = findFinalShareButton(root)

        if (captionBox != null && shareBtn != null) {
            Log.d(TAG, "[Post Flow] Reached Share screen! Entering caption...")
            val captionText = AutomationState.taskContent ?: ""
            if (captionText.isNotEmpty()) {
                pasteTextIntoNode(service, captionBox, captionText)
            }

            handler.postDelayed({
                val updatedRoot = service.rootInActiveWindow ?: root
                val finalShare = findFinalShareButton(updatedRoot) ?: shareBtn
                Log.d(TAG, "[Post Flow] Clicking Share button...")
                performClickUpward(finalShare)
                reportTaskStatus("COMPLETED")

                handler.postDelayed({
                    Log.d(TAG, "Post published successfully. Returning home...")
                    onFinish()
                }, 4000)
            }, 1200)
            return
        }

        // Phase 2: Look for 'Next' button (moving from Gallery/Crop to Filter, then Filter to Share)
        val nextBtn = findNextButton(root)
        if (nextBtn != null) {
            Log.d(TAG, "[Post Flow] Clicking Next button (attempt $attempt)...")
            performClickUpward(nextBtn)
            handler.postDelayed({ attemptPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1500)
            return
        }

        // Phase 3: Retry if transitional screen
        handler.postDelayed({ attemptPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1000)
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. INSTAGRAM STORY AUTOMATION
    // ─────────────────────────────────────────────────────────────────
    private fun attemptStoryFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 25) {
            Log.e(TAG, "Story flow timed out after $attempt attempts.")
            reportTaskStatus("FAILED")
            onError()
            return
        }

        val root = service.rootInActiveWindow
        if (root == null || root.packageName != "com.instagram.android") {
            handler.postDelayed({ attemptStoryFlow(service, handler, onFinish, onError, attempt + 1) }, 1000)
            return
        }

        // Look for "Your story" button at bottom of Story editor
        val yourStoryBtn = findNodeByTextOrDesc(root, "Your story")
            ?: findNodeByViewIdSubstring(root, "share_to_story_button")
            ?: findNodeByViewIdSubstring(root, "bottom_sheet_footer_button")

        if (yourStoryBtn != null) {
            Log.d(TAG, "[Story Flow] Found 'Your story' button! Publishing Story...")
            performClickUpward(yourStoryBtn)
            reportTaskStatus("COMPLETED")

            handler.postDelayed({
                Log.d(TAG, "Story published successfully. Returning home...")
                onFinish()
            }, 3500)
            return
        }

        // Check for "Share" arrow icon / button
        val shareArrow = findNodeByTextOrDesc(root, "Share")
            ?: findNodeByViewIdSubstring(root, "arrow")
        if (shareArrow != null) {
            Log.d(TAG, "[Story Flow] Found Share button, clicking...")
            performClickUpward(shareArrow)
            handler.postDelayed({ attemptStoryFlow(service, handler, onFinish, onError, attempt + 1) }, 1200)
            return
        }

        handler.postDelayed({ attemptStoryFlow(service, handler, onFinish, onError, attempt + 1) }, 1000)
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. INSTAGRAM REEL AUTOMATION
    // ─────────────────────────────────────────────────────────────────
    private fun attemptReelFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 30) {
            Log.e(TAG, "Reel flow timed out after $attempt attempts.")
            reportTaskStatus("FAILED")
            onError()
            return
        }

        val root = service.rootInActiveWindow
        if (root == null || root.packageName != "com.instagram.android") {
            handler.postDelayed({ attemptReelFlow(service, handler, onFinish, onError, attempt + 1) }, 1000)
            return
        }

        // Check if on final Reel Share screen
        val shareReelBtn = findNodeByTextOrDesc(root, "Share")
            ?: findNodeByTextOrDesc(root, "Share Reel")
            ?: findNodeByViewIdSubstring(root, "share_button")
        val captionBox = findCaptionEditText(root)

        if (shareReelBtn != null && captionBox != null) {
            Log.d(TAG, "[Reel Flow] Final Reel share screen detected! Setting caption...")
            val captionText = AutomationState.taskContent ?: ""
            if (captionText.isNotEmpty()) {
                pasteTextIntoNode(service, captionBox, captionText)
            }

            handler.postDelayed({
                val updatedRoot = service.rootInActiveWindow ?: root
                val finalBtn = findNodeByTextOrDesc(updatedRoot, "Share")
                    ?: findNodeByTextOrDesc(updatedRoot, "Share Reel")
                    ?: shareReelBtn
                Log.d(TAG, "[Reel Flow] Clicking final Share Reel button...")
                performClickUpward(finalBtn)
                reportTaskStatus("COMPLETED")

                handler.postDelayed({
                    Log.d(TAG, "Reel shared successfully. Returning home...")
                    onFinish()
                }, 4000)
            }, 1200)
            return
        }

        // In preview editor, click Next
        val nextBtn = findNextButton(root)
        if (nextBtn != null) {
            Log.d(TAG, "[Reel Flow] Clicking Next button on Reel preview...")
            performClickUpward(nextBtn)
            handler.postDelayed({ attemptReelFlow(service, handler, onFinish, onError, attempt + 1) }, 1500)
            return
        }

        handler.postDelayed({ attemptReelFlow(service, handler, onFinish, onError, attempt + 1) }, 1000)
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. INSTAGRAM DM AUTOMATION (Legacy & Direct Message)
    // ─────────────────────────────────────────────────────────────────
    private fun attemptProcessDmTask(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 18) {
            Log.e(TAG, "DM gave up after 18 attempts. Resetting.")
            reportTaskStatus("FAILED")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            retryLater(service, handler, onFinish, onError, attempt)
            return
        }

        val message = AutomationState.taskContent
        if (message.isNullOrEmpty()) {
            reportTaskStatus("FAILED")
            onError()
            return
        }

        val messageBox = findEditText(rootNode)
        val currentText = messageBox?.text?.toString() ?: ""

        if (messageBox != null && !currentText.contains(message)) {
            Log.d(TAG, "Message box found. Pasting message...")
            pasteTextIntoNode(service, messageBox, message)
            handler.postDelayed({ attemptProcessDmTask(service, handler, onFinish, onError, attempt + 1) }, 1000)
            return
        } else if (messageBox != null && currentText.contains(message)) {
            Log.d(TAG, "Text is typed. Looking for Send button...")
            val sendButton = findSendButton(rootNode)
            if (sendButton != null) {
                Log.d(TAG, "Send button found! Clicking...")
                performClickUpward(sendButton)
                reportTaskStatus("COMPLETED")

                handler.postDelayed({
                    Log.d(TAG, "Closing Instagram...")
                    onFinish()
                }, 3000)
                return
            }
        }

        retryLater(service, handler, onFinish, onError, attempt)
    }

    // ─────────────────────────────────────────────────────────────────
    // NODE LOCATORS & TEXT ENTRY HELPERS
    // ─────────────────────────────────────────────────────────────────

    private fun findNextButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.trim() ?: ""
        val text = node.text?.toString()?.trim() ?: ""

        if (viewId.contains("next_button") || viewId.contains("action_bar_button_action")) {
            return node
        }
        if (text.equals("Next", ignoreCase = true) || text.equals("Continue", ignoreCase = true)) {
            return node
        }
        if (contentDesc.equals("Next", ignoreCase = true) || contentDesc.equals("Continue", ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findNextButton(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findCaptionEditText(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val hint = node.hintText?.toString()?.lowercase() ?: ""

        if (viewId.contains("caption") || hint.contains("caption") || hint.contains("write a caption")) {
            return node
        }

        if (node.isEditable || node.className?.toString()?.contains("EditText") == true) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findCaptionEditText(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findFinalShareButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val text = node.text?.toString()?.trim() ?: ""
        val contentDesc = node.contentDescription?.toString()?.trim() ?: ""

        if (viewId.contains("share_footer_button") || viewId.contains("share_button")) {
            return node
        }
        if (text.equals("Share", ignoreCase = true) || text.equals("Share to Feed", ignoreCase = true)) {
            return node
        }
        if (contentDesc.equals("Share", ignoreCase = true) || contentDesc.equals("Share to Feed", ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findFinalShareButton(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findNodeByTextOrDesc(node: AccessibilityNodeInfo?, target: String): AccessibilityNodeInfo? {
        if (node == null) return null
        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""

        if (text.equals(target, ignoreCase = true) || desc.equals(target, ignoreCase = true)) {
            return node
        }
        if (text.contains(target, ignoreCase = true) || desc.contains(target, ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findNodeByTextOrDesc(node.getChild(i), target)
            if (res != null) return res
        }
        return null
    }

    private fun findNodeByViewIdSubstring(node: AccessibilityNodeInfo?, snippet: String): AccessibilityNodeInfo? {
        if (node == null) return null
        val resId = node.viewIdResourceName?.lowercase() ?: ""
        if (resId.contains(snippet.lowercase())) {
            return node
        }
        for (i in 0 until node.childCount) {
            val res = findNodeByViewIdSubstring(node.getChild(i), snippet)
            if (res != null) return res
        }
        return null
    }

    private fun pasteTextIntoNode(service: AccessibilityService, node: AccessibilityNodeInfo, text: String) {
        try {
            node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("ig_text", text)
            clipboard.setPrimaryClip(clip)

            val pasted = node.performAction(AccessibilityNodeInfo.ACTION_PASTE)
            if (!pasted) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error pasting text: ${e.message}")
        }
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

    private fun findEditText(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.className == "android.widget.EditText" || node.isEditable) return node
        for (i in 0 until node.childCount) {
            val result = findEditText(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun findSendButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.trim()
        val text = node.text?.toString()?.trim()

        if (viewId.contains("button_send") || viewId.contains("composer_send") || viewId.contains("send_button")) {
            return node
        }
        if (contentDesc != null && (contentDesc.equals("Send", ignoreCase = true) || contentDesc.equals("Send message", ignoreCase = true))) return node
        if (text != null && (text.equals("Send", ignoreCase = true) || text.equals("Send message", ignoreCase = true))) return node

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
            attemptProcessDmTask(service, handler, onFinish, onError, attempt + 1)
        }, 800)
    }

    private fun reportTaskStatus(status: String) {
        val serverBaseUrl = AutomationState.serverBaseUrl
        val taskId = AutomationState.currentTaskId
        val taskType = AutomationState.taskType
        val deviceToken = AutomationState.deviceToken

        if (serverBaseUrl != null && taskId != null && taskId != "TEST_LOCAL") {
            Thread {
                try {
                    // Try Instagram Content task endpoint first if it's POST/STORY/REEL
                    val isContent = taskType.contains("POST") || taskType.contains("STORY") || taskType.contains("REEL")
                    val primaryEndpoint = if (isContent) {
                        "$serverBaseUrl/masters/api/instagram/tasks/$taskId/complete/"
                    } else {
                        "$serverBaseUrl/masters/api/tasks/$taskId/complete/"
                    }

                    var url = java.net.URL(primaryEndpoint)
                    var connection = url.openConnection() as java.net.HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/json")
                    if (!deviceToken.isNullOrEmpty()) {
                        connection.setRequestProperty("X-Device-Token", deviceToken)
                    }
                    connection.doOutput = true

                    val outputStream = connection.outputStream
                    outputStream.write("{\"status\":\"$status\"}".toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()

                    var code = connection.responseCode
                    connection.disconnect()

                    // Fallback to the other endpoint if 404
                    if (code == 404) {
                        val fallbackEndpoint = if (isContent) {
                            "$serverBaseUrl/masters/api/tasks/$taskId/complete/"
                        } else {
                            "$serverBaseUrl/masters/api/instagram/tasks/$taskId/complete/"
                        }
                        url = java.net.URL(fallbackEndpoint)
                        connection = url.openConnection() as java.net.HttpURLConnection
                        connection.requestMethod = "POST"
                        connection.setRequestProperty("Content-Type", "application/json")
                        if (!deviceToken.isNullOrEmpty()) {
                            connection.setRequestProperty("X-Device-Token", deviceToken)
                        }
                        connection.doOutput = true
                        val fbStream = connection.outputStream
                        fbStream.write("{\"status\":\"$status\"}".toByteArray(Charsets.UTF_8))
                        fbStream.flush()
                        fbStream.close()
                        code = connection.responseCode
                        connection.disconnect()
                    }

                    Log.d(TAG, "Reported Instagram task $taskId status=$status (HTTP $code)")
                } catch (e: Exception) {
                    Log.e(TAG, "Error reporting Instagram task: ${e.message}")
                }
            }.start()
        }
    }
}
