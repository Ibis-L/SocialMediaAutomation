package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONObject

/**
 * Dedicated handler for all Twitter (X) automated flows:
 * 1. News Direct Messages (DM) with automatic Follow fallback
 * 2. Custom Tweet Publishing
 *
 * Kept completely independent from WhatsApp automation to minimize merge conflicts.
 */
object TwitterAutomationHandler {

    private const val TAG = "TwitterAutomation"

    fun startTwitterFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        Log.d(TAG, "Starting Twitter task flow. Type: ${AutomationState.taskType}. Phase: ${AutomationState.twitterPhase}")
        if (AutomationState.taskType == "TWITTER_TWEET") {
            attemptTwitterTweetPublish(service, handler, 0, onFinish, onError)
        } else {
            // DM flow: wait a bit longer for the profile page to fully load before scanning
            handler.postDelayed({
                attemptTwitterDmFlow(service, handler, 0, onFinish, onError)
            }, 2000)
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // TWITTER (X) AUTOMATED DM & FALLBACK FOLLOW LOGIC
    // ─────────────────────────────────────────────────────────────────
    private fun attemptTwitterDmFlow(
        service: AccessibilityService,
        handler: Handler,
        attempt: Int,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        if (attempt >= 25) {
            Log.e(TAG, "Twitter DM: Flow timed out after 25 attempts.")
            reportTwitterTaskStatus("FAILED", "Could not complete DM or Follow on target profile within attempt limit")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            handler.postDelayed({
                attemptTwitterDmFlow(service, handler, attempt + 1, onFinish, onError)
            }, 800)
            return
        }

        // Phase 1: On Profile View -> Look for Direct Message (DM) Button
        if (AutomationState.twitterPhase == "PROFILE_CHECK") {
            Log.d(TAG, "Twitter DM: Attempt $attempt - scanning profile for DM button...")

            // Dump all clickable nodes on first few attempts to help with debugging
            if (attempt <= 2) {
                dumpClickableNodes(rootNode, 0)
            }

            val dmButton = findTwitterDmButton(rootNode)

            if (dmButton != null) {
                Log.d(TAG, "Twitter DM: DM Button Found on profile! Opening conversation...")
                clickNode(dmButton)
                AutomationState.twitterPhase = "CONVERSATION"

                // Wait 2.5s for conversation screen to open then start typing & sending
                handler.postDelayed({
                    attemptTwitterConversationSend(service, handler, 0, onFinish, onError)
                }, 2500)
                return
            }

            // Fallback: If DM is disabled by target user privacy settings -> click Follow
            if (attempt >= 6) {
                Log.d(TAG, "Twitter DM: DM button not present after $attempt attempts (privacy settings may block DMs). Triggering FOLLOW fallback...")
                val followButton = findTwitterFollowButton(rootNode)

                if (followButton != null) {
                    val btnText = followButton.text?.toString() ?: ""
                    val btnDesc = followButton.contentDescription?.toString() ?: ""

                    // Check if already following
                    if (btnText.equals("Following", ignoreCase = true) || btnDesc.contains("Following", ignoreCase = true)) {
                        Log.d(TAG, "Twitter Fallback: Already following @${AutomationState.targetHandle}.")
                        reportTwitterTaskStatus("FOLLOWED_FALLBACK", "DMs restricted by user privacy settings. Account is already followed.")
                        onFinish()
                        return
                    }

                    Log.d(TAG, "Twitter Fallback: Clicking Follow button for @${AutomationState.targetHandle}...")
                    clickNode(followButton)

                    reportTwitterTaskStatus(
                        "FOLLOWED_FALLBACK",
                        "DMs closed by user privacy settings. Fallback executed: Automatically followed @${AutomationState.targetHandle}"
                    )

                    handler.postDelayed({
                        onFinish()
                    }, 2500)
                    return
                }
            }

            handler.postDelayed({
                attemptTwitterDmFlow(service, handler, attempt + 1, onFinish, onError)
            }, 900)
            return
        }

        // If in CONVERSATION phase (re-entry from accessibility event during conversation screen)
        if (AutomationState.twitterPhase == "CONVERSATION") {
            attemptTwitterConversationSend(service, handler, attempt, onFinish, onError)
        }
    }

    private fun attemptTwitterConversationSend(
        service: AccessibilityService,
        handler: Handler,
        attempt: Int,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        if (attempt >= 20) {
            Log.e(TAG, "Twitter Conversation: Timed out looking for message input/send.")
            reportTwitterTaskStatus("FAILED", "Opened chat but could not send DM message")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            handler.postDelayed({ attemptTwitterConversationSend(service, handler, attempt + 1, onFinish, onError) }, 800)
            return
        }

        Log.d(TAG, "Twitter Conversation: Attempt $attempt - looking for message input...")

        val messageInput = findTwitterMessageInput(rootNode)
        val textToSend = AutomationState.taskContent ?: ""

        if (messageInput != null && textToSend.isNotEmpty()) {
            Log.d(TAG, "Twitter Conversation: Message input found! Filling text...")

            // Focus the input field first
            messageInput.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

            // Copy to clipboard to support native pasting (enables Send button in X app)
            try {
                val clipboard = service.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("twitter_msg", textToSend)
                clipboard?.setPrimaryClip(clip)
            } catch (e: Exception) {}

            // Small delay before setting text to ensure field is focused
            handler.postDelayed({
                val refreshedRoot = service.rootInActiveWindow
                val refreshedInput = findTwitterMessageInput(refreshedRoot) ?: messageInput

                // Try paste first (triggers text watcher so Send button enables)
                val pasted = refreshedInput.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                if (!pasted) {
                    val arguments = Bundle().apply {
                        putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, textToSend)
                    }
                    refreshedInput.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
                }

                // Wait for text to be set, then find and click Send
                handler.postDelayed({
                    clickSendButtonInConversation(service, handler, 0, onFinish, onError)
                }, 800)
            }, 500)
            return
        }

        Log.w(TAG, "Twitter Conversation: Message input not found on attempt $attempt, retrying...")
        handler.postDelayed({ attemptTwitterConversationSend(service, handler, attempt + 1, onFinish, onError) }, 800)
    }

    private fun clickSendButtonInConversation(
        service: AccessibilityService,
        handler: Handler,
        attempt: Int,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        if (attempt >= 10) {
            Log.e(TAG, "Twitter Conversation: Could not find Send button after $attempt attempts.")
            reportTwitterTaskStatus("FAILED", "Text typed but could not click Send button in DM conversation")
            onError()
            return
        }

        val updatedRoot = service.rootInActiveWindow
        val sendButton = findTwitterSendButton(updatedRoot)

        if (sendButton != null) {
            Log.d(TAG, "Twitter DM: Clicking Send button... (attempt $attempt)")
            clickNode(sendButton)
            reportTwitterTaskStatus("COMPLETED", "DM sent successfully to @${AutomationState.targetHandle}")

            handler.postDelayed({
                onFinish()
            }, 3000)
        } else {
            Log.w(TAG, "Twitter Conversation: Send button not found on attempt $attempt, retrying...")
            handler.postDelayed({ clickSendButtonInConversation(service, handler, attempt + 1, onFinish, onError) }, 600)
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // NODE FINDERS
    // ─────────────────────────────────────────────────────────────────

    private fun findTwitterDmButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val text = node.text?.toString() ?: ""

        // Match by resource ID first (most reliable)
        if (viewId.endsWith(":id/send_dm") ||
            viewId.endsWith(":id/dm_button") ||
            viewId.endsWith(":id/button_dm") ||
            viewId.endsWith(":id/direct_message_button")) {
            Log.d(TAG, "DM button found by viewId: $viewId")
            return node
        }

        // Match by content description — both exact and partial
        if (contentDesc.startsWith("Direct message", ignoreCase = true) ||
            contentDesc.startsWith("Send Direct Message", ignoreCase = true) ||
            contentDesc.contains("Direct message", ignoreCase = true) ||
            contentDesc.equals("Message", ignoreCase = true)) {
            Log.d(TAG, "DM button found by contentDesc: $contentDesc")
            return node
        }

        // Match by text — "Message" text on profile area
        if (text.equals("Message", ignoreCase = true)) {
            Log.d(TAG, "DM button found by text: $text")
            return node
        }

        for (i in 0 until node.childCount) {
            val found = findTwitterDmButton(node.getChild(i))
            if (found != null) return found
        }
        return null
    }

    private fun findTwitterFollowButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName ?: ""
        val text = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""

        if (viewId.endsWith(":id/follow_button") || viewId.endsWith(":id/button_follow")) {
            return node
        }

        if (text.equals("Follow", ignoreCase = true) ||
            text.equals("Following", ignoreCase = true) ||
            contentDesc.startsWith("Follow", ignoreCase = true) ||
            contentDesc.startsWith("Following", ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val found = findTwitterFollowButton(node.getChild(i))
            if (found != null) return found
        }
        return null
    }

    private fun findTwitterMessageInput(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName ?: ""
        val className = node.className?.toString() ?: ""
        val hint = node.hintText?.toString() ?: ""

        // Match known DM composer view IDs
        if (viewId.endsWith(":id/chat_message_input") ||
            viewId.endsWith(":id/message_input") ||
            viewId.endsWith(":id/composer_write") ||
            viewId.endsWith(":id/dm_message_input")) {
            return node
        }

        // Match by hint text (placeholder text in message box)
        if (hint.contains("message", ignoreCase = true) || hint.contains("Start a message", ignoreCase = true)) {
            if (className.contains("EditText", ignoreCase = true) || node.isEditable) {
                return node
            }
        }

        // Match by editable EditText class — but only if it's in an editable field
        if (className.contains("EditText", ignoreCase = true) && node.isEditable) {
            return node
        }

        for (i in 0 until node.childCount) {
            val found = findTwitterMessageInput(node.getChild(i))
            if (found != null) return found
        }
        return null
    }

    private fun findTwitterSendButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val text = node.text?.toString() ?: ""

        // Match by resource ID (most reliable)
        if (viewId.endsWith(":id/chat_message_send") ||
            viewId.endsWith(":id/send_button") ||
            viewId.endsWith(":id/dm_send_button") ||
            viewId.endsWith(":id/message_send_button")) {
            if (node.isClickable || node.isEnabled) {
                return node
            }
        }

        // Match by content description
        if (contentDesc.equals("Send", ignoreCase = true) ||
            contentDesc.equals("Send message", ignoreCase = true) ||
            contentDesc.contains("Send", ignoreCase = true)) {
            return node
        }

        // Match by text
        if (text.equals("Send", ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val found = findTwitterSendButton(node.getChild(i))
            if (found != null) return found
        }
        return null
    }

    // ─────────────────────────────────────────────────────────────────
    // TWITTER (X) CUSTOM TWEET PUBLISHING LOGIC
    // ─────────────────────────────────────────────────────────────────
    private fun attemptTwitterTweetPublish(
        service: AccessibilityService,
        handler: Handler,
        attempt: Int,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        if (attempt >= 18) {
            Log.e(TAG, "Tweet Compose: Timed out finding Tweet button.")
            reportTwitterTaskStatus("FAILED", "Could not locate Tweet post button in Twitter composer")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            handler.postDelayed({ attemptTwitterTweetPublish(service, handler, attempt + 1, onFinish, onError) }, 800)
            return
        }

        // 1. Ensure tweet text is present (fill if empty)
        val tweetInput = findTweetComposerInput(rootNode)
        val tweetContent = AutomationState.taskContent ?: ""
        if (tweetInput != null && tweetContent.isNotEmpty()) {
            val currentText = tweetInput.text?.toString() ?: ""
            if (currentText.isEmpty()) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, tweetContent)
                }
                tweetInput.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            }
        }

        // 2. Find and click "Post" / "Tweet" button
        val postButton = findTweetPostButton(rootNode)
        if (postButton != null) {
            Log.d(TAG, "Tweet Compose: Post button found! Publishing Tweet...")
            clickNode(postButton)

            reportTwitterTaskStatus("COMPLETED", "Custom Tweet published successfully")

            handler.postDelayed({
                onFinish()
            }, 3000)
            return
        }

        handler.postDelayed({ attemptTwitterTweetPublish(service, handler, attempt + 1, onFinish, onError) }, 800)
    }

    private fun findTweetComposerInput(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName ?: ""
        val className = node.className?.toString() ?: ""

        if (className.contains("EditText", ignoreCase = true) ||
            viewId.endsWith(":id/tweet_text") || viewId.endsWith(":id/composer_text")) {
            return node
        }

        for (i in 0 until node.childCount) {
            val found = findTweetComposerInput(node.getChild(i))
            if (found != null) return found
        }
        return null
    }

    private fun findTweetPostButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val viewId = node.viewIdResourceName ?: ""
        val text = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""

        if (viewId.endsWith(":id/button_tweet") || viewId.endsWith(":id/tweet_button") ||
            viewId.endsWith(":id/composer_post_button") || viewId.endsWith(":id/post_button")) {
            return node
        }

        if (text.equals("Post", ignoreCase = true) || text.equals("Tweet", ignoreCase = true) ||
            text.equals("Tweet all", ignoreCase = true)) {
            return node
        }

        if (contentDesc.equals("Post", ignoreCase = true) ||
            contentDesc.equals("Tweet", ignoreCase = true)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val found = findTweetPostButton(node.getChild(i))
            if (found != null) return found
        }
        return null
    }

    // ─────────────────────────────────────────────────────────────────
    // DEBUG HELPER — logs all clickable nodes to Logcat
    // ─────────────────────────────────────────────────────────────────
    private fun dumpClickableNodes(node: AccessibilityNodeInfo?, depth: Int) {
        if (node == null || depth > 8) return
        if (node.isClickable) {
            Log.d(TAG, "CLICKABLE[$depth] id=${node.viewIdResourceName} text=${node.text} desc=${node.contentDescription} class=${node.className}")
        }
        for (i in 0 until node.childCount) {
            dumpClickableNodes(node.getChild(i), depth + 1)
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPERS & STATUS REPORTING
    // ─────────────────────────────────────────────────────────────────
    private fun clickNode(node: AccessibilityNodeInfo) {
        var curr: AccessibilityNodeInfo? = node
        while (curr != null) {
            if (curr.isClickable) {
                curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                return
            }
            curr = curr.parent
        }
        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }

    fun reportTwitterTaskStatus(status: String, resultMessage: String) {
        val serverBaseUrl = AutomationState.serverBaseUrl
        val taskId = AutomationState.currentTaskId
        val deviceToken = AutomationState.deviceToken

        if (serverBaseUrl != null && taskId != null) {
            Thread {
                try {
                    // 1. Try Twitter-specific completion endpoint first
                    var url = java.net.URL("$serverBaseUrl/masters/api/twitter/tasks/$taskId/complete/")
                    var connection = url.openConnection() as java.net.HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/json")
                    if (!deviceToken.isNullOrEmpty()) {
                        connection.setRequestProperty("X-Device-Token", deviceToken)
                    }
                    connection.doOutput = true

                    val json = JSONObject().apply {
                        put("status", status)
                        put("result_message", resultMessage)
                    }

                    val outputStream = connection.outputStream
                    outputStream.write(json.toString().toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()

                    var code = connection.responseCode
                    connection.disconnect()

                    // 2. If 404 or 400 (e.g. this Twitter task was queued as a WhatsAppTask with platform="twitter"),
                    // report to the primary tasks endpoint
                    if (code == 404 || code == 400) {
                        url = java.net.URL("$serverBaseUrl/masters/api/tasks/$taskId/complete/")
                        connection = url.openConnection() as java.net.HttpURLConnection
                        connection.requestMethod = "POST"
                        connection.setRequestProperty("Content-Type", "application/json")
                        if (!deviceToken.isNullOrEmpty()) {
                            connection.setRequestProperty("X-Device-Token", deviceToken)
                        }
                        connection.doOutput = true
                        val primaryJson = JSONObject().apply {
                            put("status", status)
                        }
                        val primaryStream = connection.outputStream
                        primaryStream.write(primaryJson.toString().toByteArray(Charsets.UTF_8))
                        primaryStream.flush()
                        primaryStream.close()
                        code = connection.responseCode
                        connection.disconnect()
                    }
                    Log.d(TAG, "Reported Twitter task $taskId status=$status (HTTP $code)")
                } catch (e: Exception) {
                    Log.e(TAG, "Error reporting Twitter task status: ${e.message}")
                    e.printStackTrace()
                }
            }.start()
        }
    }
}
