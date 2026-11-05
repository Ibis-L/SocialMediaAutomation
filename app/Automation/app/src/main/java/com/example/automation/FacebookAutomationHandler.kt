package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONObject

object FacebookAutomationHandler {

    private const val TAG = "FacebookDebug"

    fun startFacebookFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        val taskType = AutomationState.taskType
        Log.d(TAG, "Starting Facebook automation flow. TaskType=$taskType")

        if (taskType.contains("POST", ignoreCase = true)) {
            attemptFacebookPostFlow(service, handler, onFinish, onError, 0)
        } else {
            attemptProcessTask(service, handler, onFinish, onError, 0)
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. FACEBOOK FEED POST (Text, Image, Video, or Carousel)
    // ─────────────────────────────────────────────────────────────────
    private fun attemptFacebookPostFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 30) {
            Log.e(TAG, "Facebook Post flow timed out after $attempt attempts.")
            reportTaskStatus("FAILED", "Could not complete Facebook Post within attempt limit")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            Log.d(TAG, "[Facebook Post] Root node null, retry $attempt")
            retryPostLater(service, handler, onFinish, onError, attempt)
            return
        }

        val caption = AutomationState.taskContent ?: ""

        // Phase 1: Check if editable Post Composer is already active
        val composerInput = findEditableComposerInput(rootNode)

        // If composer is not active yet:
        if (composerInput == null) {
            // Case 1A: Check for Destination / Picker Dialog ("Feed" vs "Your Story")
            val feedOption = findFeedOptionInPicker(rootNode)
            if (feedOption != null) {
                Log.d(TAG, "[Facebook Post] Found 'Feed' option in picker dialog! Clicking...")
                performClickUpward(feedOption)
                handler.postDelayed({ attemptFacebookPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1500)
                return
            }

            // Case 1B: On Facebook Home Feed -> click "What's on your mind?" or "Create post" to OPEN the new post composer
            val openPostBtn = findOpenPostButtonOnHomeFeed(rootNode)
            if (openPostBtn != null) {
                Log.d(TAG, "[Facebook Post] Found 'What's on your mind?' / Create Post button on Home Feed! Opening composer...")
                performClickUpward(openPostBtn)
                handler.postDelayed({ attemptFacebookPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1500)
                return
            }
        }

        // Phase 2: Enter caption into composer
        if (composerInput != null && caption.isNotEmpty()) {
            val currentText = composerInput.text?.toString() ?: ""
            if (!currentText.contains(caption)) {
                Log.d(TAG, "[Facebook Post] Entering caption into composer...")
                composerInput.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

                val arguments = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, caption)
                }
                val setSuccess = composerInput.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)

                if (!setSuccess) {
                    val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("fb_caption", caption)
                    clipboard.setPrimaryClip(clip)
                    composerInput.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                }

                handler.postDelayed({ attemptFacebookPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1200)
                return
            }
        }

        // Phase 3: Post / Next / Share Button
        val postButton = findPostPublishButton(rootNode)
        if (postButton != null) {
            val btnText = (postButton.text?.toString() ?: postButton.contentDescription?.toString() ?: "").trim()
            Log.d(TAG, "[Facebook Post] Post/Share button found ('$btnText')! Clicking...")
            performClickUpward(postButton)

            // If it was "Next", Facebook will open the audience/sharing options screen
            if (btnText.equals("Next", ignoreCase = true)) {
                handler.postDelayed({ attemptFacebookPostFlow(service, handler, onFinish, onError, attempt + 1) }, 1800)
                return
            }

            // POST / SHARE clicked -> Post submitted!
            reportTaskStatus("COMPLETED", "Facebook Post published successfully")

            handler.postDelayed({
                Log.d(TAG, "[Facebook Post] Completed. Returning home...")
                onFinish()
            }, 3500)
            return
        }

        retryPostLater(service, handler, onFinish, onError, attempt)
    }

    private fun retryPostLater(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        handler.postDelayed({
            attemptFacebookPostFlow(service, handler, onFinish, onError, attempt + 1)
        }, 1000)
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. FACEBOOK DIRECT MESSAGE / SHARE LINK (Existing Flow)
    // ─────────────────────────────────────────────────────────────────
    private fun attemptProcessTask(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 25) {
            Log.e(TAG, "Facebook DM gave up after 25 attempts. Resetting.")
            reportTaskStatus("FAILED", "Could not complete Facebook DM within attempt limit")
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
            reportTaskStatus("FAILED", "Message is empty")
            onError()
            return
        }

        // ── Phase A: Chat Screen Check (Priority 1) ──
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

                    reportTaskStatus("COMPLETED", "Facebook DM sent successfully")

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
        val messageProfileButton = findMessageProfileButton(rootNode)
        if (messageProfileButton != null) {
            Log.d(TAG, "Found the 'Message' button on the profile page! Clicking it to open chat...")
            performClickUpward(messageProfileButton)
            handler.postDelayed({ attemptProcessTask(service, handler, onFinish, onError, attempt + 1) }, 2000)
            return
        }

        retryLater(service, handler, onFinish, onError, attempt)
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

    // ─────────────────────────────────────────────────────────────────
    // NODE FINDERS & HELPERS
    // ─────────────────────────────────────────────────────────────────

    private fun findFeedOptionInPicker(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.trim() ?: ""
        val contentDesc = node.contentDescription?.toString()?.trim() ?: ""

        if (text.equals("Feed", ignoreCase = true) ||
            text.equals("News Feed", ignoreCase = true) ||
            text.equals("Your Feed", ignoreCase = true) ||
            text.equals("Post to Feed", ignoreCase = true) ||
            contentDesc.equals("Feed", ignoreCase = true) ||
            contentDesc.equals("News Feed", ignoreCase = true) ||
            contentDesc.equals("Your Feed", ignoreCase = true) ||
            contentDesc.equals("Post to Feed", ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findFeedOptionInPicker(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findOpenPostButtonOnHomeFeed(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val resId = node.viewIdResourceName?.lowercase() ?: ""
        val combined = "$text $desc".lowercase()

        // Match "What's on your mind?" or "Write something" or "Create a post"
        if (combined.contains("what's on your mind") ||
            combined.contains("whats on your mind") ||
            combined.contains("write something") ||
            combined.contains("create a post") ||
            combined.contains("create post") ||
            desc.equals("Make a post", ignoreCase = true) ||
            desc.equals("Create", ignoreCase = true) ||
            resId.contains("feed_composer") ||
            resId.contains("whats_on_your_mind") ||
            resId.contains("composer_header")
        ) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findOpenPostButtonOnHomeFeed(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findEditableComposerInput(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val className = node.className?.toString() ?: ""
        val isEditable = node.isEditable || className.contains("EditText", ignoreCase = true)
        val hint = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            node.hintText?.toString() ?: ""
        } else ""
        val text = node.text?.toString() ?: ""
        val desc = node.contentDescription?.toString() ?: ""
        val combined = "$hint $text $desc".lowercase()

        if (isEditable) {
            return node
        }

        if (combined.contains("say something") || 
            combined.contains("say something about this photo") || 
            combined.contains("say something about this video")) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findEditableComposerInput(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findPostPublishButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val resId = node.viewIdResourceName?.lowercase() ?: ""

        if (text.equals("POST", ignoreCase = true) ||
            text.equals("Post", ignoreCase = true) ||
            text.equals("Share", ignoreCase = true) ||
            text.equals("Share now", ignoreCase = true) ||
            text.equals("Next", ignoreCase = true) ||
            text.equals("Publish", ignoreCase = true) ||
            desc.equals("POST", ignoreCase = true) ||
            desc.equals("Post", ignoreCase = true) ||
            desc.equals("Share", ignoreCase = true) ||
            desc.equals("Share now", ignoreCase = true) ||
            desc.equals("Next", ignoreCase = true) ||
            desc.equals("Publish", ignoreCase = true)) {
            return node
        }

        if (resId.contains("composer_post") || resId.contains("post_button") || resId.contains("share_button")) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findPostPublishButton(node.getChild(i))
            if (res != null) return res
        }
        return null
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

    fun reportTaskStatus(status: String, resultMessage: String = "") {
        val serverBaseUrl = AutomationState.serverBaseUrl
        val taskId = AutomationState.currentTaskId

        if (serverBaseUrl != null && taskId != null && taskId != "TEST_LOCAL") {
            Thread {
                val urlsToTry = listOf(
                    "$serverBaseUrl/masters/api/facebook/tasks/$taskId/complete/",
                    "$serverBaseUrl/masters/api/tasks/$taskId/complete/"
                )
                val deviceToken = AutomationState.deviceToken
                val payload = JSONObject().apply {
                    put("status", status)
                    if (resultMessage.isNotEmpty()) {
                        put("result_message", resultMessage)
                    }
                }.toString()

                for (urlString in urlsToTry) {
                    try {
                        val url = java.net.URL(urlString)
                        val connection = url.openConnection() as java.net.HttpURLConnection
                        connection.requestMethod = "POST"
                        connection.setRequestProperty("Content-Type", "application/json")
                        if (!deviceToken.isNullOrEmpty()) {
                            connection.setRequestProperty("X-Device-Token", deviceToken)
                        }
                        connection.connectTimeout = 5000
                        connection.readTimeout = 5000
                        connection.doOutput = true

                        connection.outputStream.use { os ->
                            os.write(payload.toByteArray(Charsets.UTF_8))
                            os.flush()
                        }
                        val code = connection.responseCode
                        connection.disconnect()
                        if (code == 200 || code == 201) break
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed updating status via $urlString: ${e.message}")
                    }
                }
            }.start()
        }
    }
}
