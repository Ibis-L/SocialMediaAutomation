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

/**
 * Dedicated, separated handler specifically for Facebook Feed Posts (Text, Image, Video, Carousel).
 * Decoupled from Facebook Direct Messages to make debugging and testing clean and isolated.
 */
object FacebookPostAutomationHandler {

    private const val TAG = "FBPostHandler"

    fun startPostFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        val taskId = AutomationState.currentTaskId
        val caption = AutomationState.taskContent ?: ""
        Log.d(TAG, "Starting dedicated Facebook Post automation flow for Task #$taskId (Caption len: ${caption.length})")

        // Initial 800ms delay to let the Facebook activity / intent settle
        handler.postDelayed({
            attemptPostFlow(service, handler, onFinish, onError, 0)
        }, 800)
    }

    private fun attemptPostFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit,
        attempt: Int
    ) {
        if (attempt >= 35) {
            Log.e(TAG, "Facebook Post flow timed out after $attempt attempts.")
            FacebookDebugHelper.dumpCurrentHierarchy(service)
            reportPostTaskStatus("FAILED", "Timed out after 35 attempts. Check logcat tags: $TAG, FBDebugDump")
            onError()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null) {
            Log.d(TAG, "[Attempt $attempt] Root node is null, retrying...")
            retryLater(service, handler, onFinish, onError, attempt)
            return
        }

        val pkg = rootNode.packageName?.toString() ?: ""
        if (pkg != "com.facebook.katana") {
            Log.d(TAG, "[Attempt $attempt] Active window package is '$pkg', waiting for Facebook...")
            retryLater(service, handler, onFinish, onError, attempt)
            return
        }

        // Periodically dump tree to logcat on attempts 0, 5, 10, 20 for debugging
        if (attempt == 0 || attempt == 5 || attempt == 10 || attempt == 20) {
            Log.d(TAG, "--- Accessibility Snapshot at Attempt $attempt ---")
            FacebookDebugHelper.dumpCurrentHierarchy(service, maxDepth = 6)
        }

        val caption = AutomationState.taskContent ?: ""

        // ═════════════════════════════════════════════════════════════
        // STEP 1: Check for Share Destination Picker ("Feed" vs "Story")
        // Appears when sharing images/videos via ACTION_SEND to Facebook
        // ═════════════════════════════════════════════════════════════
        val feedOption = findFeedOptionInPicker(rootNode)
        if (feedOption != null) {
            Log.d(TAG, "[Attempt $attempt] Found 'Feed' option in picker bottom sheet! Clicking...")
            val clicked = performClick(feedOption)
            Log.d(TAG, "Clicked Feed picker: $clicked")
            handler.postDelayed({
                attemptPostFlow(service, handler, onFinish, onError, attempt + 1)
            }, 1800)
            return
        }

        // ═════════════════════════════════════════════════════════════
        // STEP 2: Check for Home Feed "What's on your mind?" button
        // Appears when Facebook opens to Home Feed (e.g., text-only posts)
        // ═════════════════════════════════════════════════════════════
        val composerInput = findEditableComposerInput(rootNode)
        if (composerInput == null) {
            val openPostBtn = findOpenPostPromptOnHomeFeed(rootNode)
            if (openPostBtn != null) {
                Log.d(TAG, "[Attempt $attempt] Found 'What's on your mind?' on Home Feed! Opening Composer...")
                val clicked = performClick(openPostBtn)
                Log.d(TAG, "Clicked Home Feed composer prompt: $clicked")
                handler.postDelayed({
                    attemptPostFlow(service, handler, onFinish, onError, attempt + 1)
                }, 1800)
                return
            }
        }

        // ═════════════════════════════════════════════════════════════
        // STEP 3: Enter Caption into Composer EditText
        // ═════════════════════════════════════════════════════════════
        if (composerInput != null && caption.isNotEmpty()) {
            val currentText = composerInput.text?.toString() ?: ""
            if (!currentText.contains(caption)) {
                Log.d(TAG, "[Attempt $attempt] Composer active. Setting caption...")
                composerInput.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

                val arguments = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, caption)
                }
                var setSuccess = composerInput.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)

                // Fallback to paste via ClipboardManager
                if (!setSuccess) {
                    Log.d(TAG, "ACTION_SET_TEXT returned false. Falling back to ACTION_PASTE...")
                    val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("fb_caption", caption)
                    clipboard.setPrimaryClip(clip)
                    setSuccess = composerInput.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                }
                Log.d(TAG, "Caption entry success: $setSuccess")

                handler.postDelayed({
                    attemptPostFlow(service, handler, onFinish, onError, attempt + 1)
                }, 1200)
                return
            }
        }

        // ═════════════════════════════════════════════════════════════
        // STEP 4: Next / Share / Post Button
        // ═════════════════════════════════════════════════════════════
        val postButton = findPostOrNextButton(rootNode)
        if (postButton != null) {
            val btnText = (postButton.text?.toString() ?: postButton.contentDescription?.toString() ?: "").trim()
            Log.d(TAG, "[Attempt $attempt] Action button found ('$btnText')! Clicking...")
            val clicked = performClick(postButton)
            Log.d(TAG, "Clicked '$btnText' button: $clicked")

            // If it was "Next" or "Continue", wait for audience selector screen
            if (btnText.equals("Next", ignoreCase = true) || btnText.equals("Continue", ignoreCase = true)) {
                handler.postDelayed({
                    attemptPostFlow(service, handler, onFinish, onError, attempt + 1)
                }, 2000)
                return
            }

            // POST / SHARE clicked -> Post published!
            Log.d(TAG, "Post confirmed clicked ('$btnText'). Reporting success...")
            reportPostTaskStatus("COMPLETED", "Facebook Post published successfully via button: $btnText")

            handler.postDelayed({
                Log.d(TAG, "Post flow finished. Returning home...")
                onFinish()
            }, 3500)
            return
        }

        Log.d(TAG, "[Attempt $attempt] None of the targets found on screen. Waiting...")
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
            attemptPostFlow(service, handler, onFinish, onError, attempt + 1)
        }, 1000)
    }

    // ─────────────────────────────────────────────────────────────────
    // NODE FINDERS
    // ─────────────────────────────────────────────────────────────────

    private fun findFeedOptionInPicker(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.trim() ?: ""
        val contentDesc = node.contentDescription?.toString()?.trim() ?: ""

        val isFeed = text.equals("Feed", ignoreCase = true) ||
                text.equals("News Feed", ignoreCase = true) ||
                text.equals("Your Feed", ignoreCase = true) ||
                text.equals("Post to Feed", ignoreCase = true) ||
                contentDesc.equals("Feed", ignoreCase = true) ||
                contentDesc.equals("News Feed", ignoreCase = true) ||
                contentDesc.equals("Your Feed", ignoreCase = true) ||
                contentDesc.equals("Post to Feed", ignoreCase = true)

        if (isFeed) return node

        for (i in 0 until node.childCount) {
            val res = findFeedOptionInPicker(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findOpenPostPromptOnHomeFeed(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val resId = node.viewIdResourceName?.lowercase() ?: ""
        val combined = "$text $desc".lowercase()

        // Don't match if it's already an editable input (that's inside the composer)
        if (node.isEditable || (node.className?.toString()?.contains("EditText", ignoreCase = true) == true)) {
            return null
        }

        if (combined.contains("what's on your mind") ||
            combined.contains("whats on your mind") ||
            combined.contains("write something") ||
            combined.contains("create a post") ||
            combined.contains("create post") ||
            desc.equals("Make a post", ignoreCase = true) ||
            resId.contains("feed_composer") ||
            resId.contains("whats_on_your_mind") ||
            resId.contains("composer_header")
        ) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findOpenPostPromptOnHomeFeed(node.getChild(i))
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

        if (isEditable) return node

        if (combined.contains("say something") ||
            combined.contains("say something about this photo") ||
            combined.contains("say something about this video")
        ) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findEditableComposerInput(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun findPostOrNextButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val resId = node.viewIdResourceName?.lowercase() ?: ""

        val isTarget = text.equals("POST", ignoreCase = true) ||
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
                desc.equals("Publish", ignoreCase = true)

        if (isTarget) return node

        if (resId.contains("composer_post") ||
            resId.contains("post_button") ||
            resId.contains("share_button") ||
            resId.contains("share_now")
        ) {
            return node
        }

        for (i in 0 until node.childCount) {
            val res = findPostOrNextButton(node.getChild(i))
            if (res != null) return res
        }
        return null
    }

    private fun performClick(node: AccessibilityNodeInfo?): Boolean {
        var curr = node
        while (curr != null) {
            if (curr.isClickable) {
                return curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            curr = curr.parent
        }
        return node?.performAction(AccessibilityNodeInfo.ACTION_CLICK) ?: false
    }

    private fun reportPostTaskStatus(status: String, resultMessage: String = "") {
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

