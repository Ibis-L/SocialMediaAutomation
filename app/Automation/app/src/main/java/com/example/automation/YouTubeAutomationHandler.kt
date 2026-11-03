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
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.net.HttpURLConnection
import java.net.URL
import java.util.ArrayDeque

class YouTubeAutomationHandler(private val service: AccessibilityService) {

    private val TAG = "YouTubeAutomation"
    private val handler = Handler(Looper.getMainLooper())
    var isProcessing = false
    var didReachAddDetails = false
    private var pipelineStarted = false
    private var pendingWaitRunnable: Runnable? = null

    private val safetyResetRunnable = Runnable {
        if (isProcessing) {
            Log.e(TAG, "Safety timeout reached (90s). Marking task FAILED and resetting.")
            reportTaskStatus("FAILED")
            resetState()
        }
    }

    private fun cancelWaitAddDetails() {
        pendingWaitRunnable?.let {
            handler.removeCallbacks(it)
            pendingWaitRunnable = null
        }
    }

    fun handleEvent(event: AccessibilityEvent?) {
        if (!AutomationState.isAutomationActive) return
        if (AutomationState.currentTaskType != "YOUTUBE") return

        if (isAddDetailsScreen()) {
            if (!didReachAddDetails && !pipelineStarted) {
                Log.d(TAG, "[NEW_V2] Add details screen detected via live event! Starting pipeline in 800ms...")
                didReachAddDetails = true
                isProcessing = true
                cancelWaitAddDetails()
                handler.removeCallbacks(safetyResetRunnable)
                handler.postDelayed(safetyResetRunnable, 90000)
                handler.postDelayed({ runDynamicUploadPipeline() }, 800)
                return
            }
        }

        if (!isProcessing && !pipelineStarted) {
            Log.d(TAG, "[NEW_V2] YouTube event detected. Starting auto-upload pipeline...")
            isProcessing = true
            didReachAddDetails = false
            handler.removeCallbacks(safetyResetRunnable)
            handler.postDelayed(safetyResetRunnable, 90000)
            attemptYouTubeFlow(0)
        }
    }

    fun attemptYouTubeFlow(attempt: Int) {
        if (!AutomationState.isAutomationActive || pipelineStarted) return

        if (attempt >= 25) {
            Log.e(TAG, "Timed out waiting for YouTube upload screen after 25 attempts.")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        val rootNode = service.rootInActiveWindow
        if (rootNode == null || rootNode.packageName != "com.google.android.youtube") {
            Log.d(TAG, "Waiting for YouTube active window (attempt $attempt, pkg=${rootNode?.packageName})...")
            handler.postDelayed({ attemptYouTubeFlow(attempt + 1) }, 800)
            return
        }

        // 1. Check if already on 'Add details' screen
        if (isAddDetailsScreen()) {
            Log.d(TAG, "[NEW_V2] Direct 'Add details' screen detected! Starting pipeline in 800ms...")
            didReachAddDetails = true
            cancelWaitAddDetails()
            handler.postDelayed({ runDynamicUploadPipeline() }, 800)
            return
        }

        // 2. Check if on Preview screen (Shorts / Video preview with 'Next' button)
        val nextBtn = findYouTubeNextButton(rootNode)
        if (nextBtn != null || isPreviewScreen()) {
            val dm = service.resources.displayMetrics
            val fallbackNextX = (dm.widthPixels * 0.875f).toInt() // 630 on 720x1604
            val fallbackNextY = (dm.heightPixels * 0.957f).toInt() // 1535 on 720x1604

            Log.d(TAG, "[NEW_V2] Preview screen detected! Clicking Next button...")
            clickNodeOrFallback(nextBtn, fallbackNextX, fallbackNextY)

            waitForAddDetailsScreen(0)
            return
        }

        Log.d(TAG, "Waiting for upload screen on attempt $attempt...")
        handler.postDelayed({ attemptYouTubeFlow(attempt + 1) }, 1000)
    }

    private fun isPreviewScreen(): Boolean {
        val active = service.rootInActiveWindow ?: return false
        if (active.packageName != "com.google.android.youtube") return false

        return findNodeRecursive(active, "Edit into a Short") != null ||
                findNodeRecursive(active, "Add sound") != null ||
                (findNodeRecursive(active, "Next") != null && !isAddDetailsScreen())
    }

    private fun waitForAddDetailsScreen(attempt: Int) {
        if (!AutomationState.isAutomationActive || pipelineStarted) return

        if (attempt >= 25) {
            Log.e(TAG, "Failed to reach 'Add details' screen after 25 attempts. Reporting FAILED.")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        val runnable = Runnable {
            if (!AutomationState.isAutomationActive || pipelineStarted) return@Runnable

            val root = service.rootInActiveWindow
            val pkg = root?.packageName?.toString() ?: ""
            val hasDetails = isAddDetailsScreen()
            val isPrev = isPreviewScreen()
            Log.d(TAG, "[NEW_V2] waitForAddDetailsScreen attempt $attempt: pkg=$pkg, isAddDetails=$hasDetails, isPreview=$isPrev")

            val isPermissionPrompt = findNodeRecursive(root, "Open settings") != null ||
                    findNodeRecursive(root, "Select from gallery") != null

            if (hasDetails || (attempt >= 5 && pkg == "com.google.android.youtube" && !isPrev && !isPermissionPrompt)) {
                Log.d(TAG, "[NEW_V2] Add details screen or transition confirmed! Starting pipeline...")
                didReachAddDetails = true
                cancelWaitAddDetails()
                handler.postDelayed({ runDynamicUploadPipeline() }, 800)
            } else if (isPrev && attempt % 4 == 3) {
                val dm = service.resources.displayMetrics
                val next = findYouTubeNextButton(root)
                Log.d(TAG, "Still on preview screen at attempt $attempt, re-clicking Next...")
                clickNodeOrFallback(next, (dm.widthPixels * 0.875f).toInt(), (dm.heightPixels * 0.957f).toInt())
                waitForAddDetailsScreen(attempt + 1)
            } else {
                waitForAddDetailsScreen(attempt + 1)
            }
        }
        pendingWaitRunnable = runnable
        handler.postDelayed(runnable, 600)
    }

    private fun isAddDetailsScreen(): Boolean {
        val active = service.rootInActiveWindow ?: return false
        if (active.packageName != "com.google.android.youtube") return false

        if (findNodeRecursive(active, "Edit into a Short") != null ||
            findNodeRecursive(active, "Add sound") != null
        ) return false

        return findNodeRecursive(active, "Add details") != null ||
                findNodeRecursive(active, "Create a title") != null ||
                findNodeRecursive(active, "Caption your Short") != null ||
                findNodeRecursive(active, "Select audience") != null ||
                findNodeRecursive(active, "Show more") != null ||
                findNodeRecursive(active, "Visibility") != null ||
                !active.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/upload_bottom_button").isNullOrEmpty()
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SEQUENTIAL UPLOAD PIPELINE
    // ─────────────────────────────────────────────────────────────────────────────

    private fun runDynamicUploadPipeline() {
        if (pipelineStarted) return
        pipelineStarted = true
        cancelWaitAddDetails()

        val dm = service.resources.displayMetrics
        val screenW = dm.widthPixels
        val screenH = dm.heightPixels
        val centerX = screenW / 2

        val title = AutomationState.videoTitle ?: ""
        val description = AutomationState.videoDescription ?: ""
        val isMadeForKids = AutomationState.isMadeForKids

        Log.d(TAG, "=== [NEW_V2] Starting Sequential Upload Pipeline ===")
        Log.d(TAG, "Resolution: ${screenW}x${screenH} | title='$title' | descLen=${description.length} | isMadeForKids=$isMadeForKids")

        executeStepTitle(screenW, screenH, centerX, title) {
            executeStepAudience(screenW, screenH, centerX, isMadeForKids) {
                executeStepDescription(screenW, screenH, centerX, description) {
                    executeStepUpload(screenW, screenH, centerX) {
                        verifyUploadAndComplete(screenW, screenH, centerX, 0)
                    }
                }
            }
        }
    }

    private fun executeStepTitle(screenW: Int, screenH: Int, centerX: Int, title: String, onDone: () -> Unit) {
        if (title.isEmpty()) {
            onDone()
            return
        }

        val root = service.rootInActiveWindow
        if (root?.packageName != "com.google.android.youtube") {
            Log.e(TAG, "[Step 1: Title] Not in YouTube (${root?.packageName}), aborting!")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        Log.d(TAG, "[Step 1: Title] Focusing title field for '$title'...")
        val isShorts = findNodeRecursive(root, "Caption your Short") != null
        val editNode = findTitleEditText(root)

        val targetX = if (isShorts) (screenW * 0.636f).toInt() else centerX
        val targetY = if (isShorts) (screenH * 0.150f).toInt() else (screenH * 0.481f).toInt()

        copyToClipboard("title", title)
        clickNodeOrFallback(editNode, targetX, targetY)

        handler.postDelayed({
            val focusedRoot = service.rootInActiveWindow
            val focusedNode = focusedRoot?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                ?: findFirstEditText(focusedRoot)
                ?: editNode

            if (focusedNode != null) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, title)
                }
                val setOk = focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                Log.d(TAG, "[Step 1: Title] ACTION_SET_TEXT result: $setOk")
                if (!setOk) {
                    val pasted = focusedNode.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                    Log.d(TAG, "[Step 1: Title] ACTION_PASTE result: $pasted")
                }
            } else {
                Log.w(TAG, "[Step 1: Title] EditText node still null after tap!")
            }

            handler.postDelayed({
                Log.d(TAG, "[Step 1: Title] Dismissing soft keyboard...")
                service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
                handler.postDelayed({ onDone() }, 800)
            }, 600)
        }, 900)
    }

    private fun executeStepAudience(screenW: Int, screenH: Int, centerX: Int, isMadeForKids: Boolean, onDone: () -> Unit) {
        val root = service.rootInActiveWindow
        if (root?.packageName != "com.google.android.youtube") {
            Log.e(TAG, "[Step 2: Audience] Not in YouTube (${root?.packageName}), aborting!")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        Log.d(TAG, "[Step 2: Audience] Tapping 'Select audience' row...")
        val audNode = findNodeRecursive(root, "Select audience")
        clickNodeOrFallback(audNode, centerX, (screenH * 0.646f).toInt())

        handler.postDelayed({
            val audRoot = service.rootInActiveWindow
            val targetText = if (isMadeForKids) "Yes, it's Made for Kids" else "No, it's not Made for Kids"
            val fallbackOptionY = if (isMadeForKids) (screenH * 0.337f).toInt() else (screenH * 0.416f).toInt()

            Log.d(TAG, "[Step 2: Audience] Selecting '$targetText' at y=$fallbackOptionY...")
            val optionNode = findNodeRecursive(audRoot, targetText)
            clickNodeOrFallback(optionNode, centerX, fallbackOptionY)

            handler.postDelayed({
                Log.d(TAG, "[Step 2: Audience] Tapping top-left Back arrow to return to Add details...")
                clickTopLeftBackArrow(screenW, screenH)
                handler.postDelayed({ onDone() }, 1000)
            }, 700)
        }, 1100)
    }

    private fun executeStepDescription(screenW: Int, screenH: Int, centerX: Int, description: String, onDone: () -> Unit) {
        if (description.isEmpty()) {
            onDone()
            return
        }

        val root = service.rootInActiveWindow
        if (root?.packageName != "com.google.android.youtube") {
            Log.e(TAG, "[Step 3: Description] Not in YouTube (${root?.packageName}), aborting!")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        if (findNodeRecursive(root, "Caption your Short") != null) {
            Log.d(TAG, "[Step 3: Description] Shorts format; skipping separate description.")
            onDone()
            return
        }

        val showMoreNode = findNodeRecursive(root, "Show more")
        Log.d(TAG, "[Step 3: Description] Tapping 'Show more'...")
        clickNodeOrFallback(showMoreNode, centerX, (screenH * 0.716f).toInt())

        handler.postDelayed({
            openDescriptionAndType(screenW, screenH, centerX, description, onDone)
        }, 1000)
    }

    private fun openDescriptionAndType(screenW: Int, screenH: Int, centerX: Int, description: String, onDone: () -> Unit) {
        val root = service.rootInActiveWindow
        val descNode = findNodeRecursive(root, "Add description")
        val scrolledDescY = (screenH * 0.351f).toInt()

        Log.d(TAG, "[Step 3: Description] Tapping 'Add description' row at y=$scrolledDescY (563px)...")
        copyToClipboard("description", description)
        clickNodeOrFallback(descNode, centerX, scrolledDescY)

        handler.postDelayed({
            val descRoot = service.rootInActiveWindow
            val focused = descRoot?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                ?: findFirstEditText(descRoot)

            if (focused != null) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, description)
                }
                val setOk = focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                Log.d(TAG, "[Step 3: Description] ACTION_SET_TEXT result: $setOk")
                if (!setOk) {
                    val pasted = focused.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                    Log.d(TAG, "[Step 3: Description] ACTION_PASTE result: $pasted")
                }
            } else {
                Log.w(TAG, "[Step 3: Description] Focused EditText was null on Description screen!")
            }

            handler.postDelayed({
                Log.d(TAG, "[Step 3: Description] Clicking top-left Back arrow to return to Add details...")
                clickTopLeftBackArrow(screenW, screenH)

                handler.postDelayed({
                    Log.d(TAG, "[Step 3: Description] Completed.")
                    onDone()
                }, 1100)
            }, 800)
        }, 1100)
    }

    private fun executeStepUpload(screenW: Int, screenH: Int, centerX: Int, onDone: () -> Unit) {
        val root = service.rootInActiveWindow
        if (root?.packageName != "com.google.android.youtube") {
            Log.e(TAG, "[Step 4: Upload] Not in YouTube (${root?.packageName}), aborting!")
            reportTaskStatus("FAILED")
            resetState()
            return
        }

        Log.d(TAG, "[Step 4: Upload] Clicking final Upload button...")
        val uploadBtn = findRealUploadButton(root)
        clickNodeOrFallback(uploadBtn, centerX, (screenH * 0.960f).toInt())

        handler.postDelayed({
            onDone()
        }, 3000)
    }

    private fun verifyUploadAndComplete(screenW: Int, screenH: Int, centerX: Int, attempt: Int) {
        val root = service.rootInActiveWindow
        val pkg = root?.packageName?.toString() ?: ""
        val isStillOnAddDetails = isAddDetailsScreen()

        val isExplicitUploadActive = root != null && (
                findNodeRecursive(root, "Uploading") != null ||
                        findNodeRecursive(root, "Uploaded") != null ||
                        findNodeRecursive(root, "Sending") != null ||
                        findNodeRecursive(root, "Processing") != null ||
                        findNodeRecursive(root, "Preparing") != null ||
                        findNodeRecursive(root, "See video") != null
                )

        if (isExplicitUploadActive || (didReachAddDetails && !isStillOnAddDetails && pkg == "com.google.android.youtube")) {
            Log.d(TAG, "[NEW_V2] Upload confirmed! Reporting COMPLETED.")
            onYouTubeUploadTriggered()
        } else {
            if (attempt < 3 && pkg == "com.google.android.youtube") {
                Log.w(TAG, "Still on 'Add details' screen (attempt $attempt). Retrying Upload tap...")
                val uploadBtn = findRealUploadButton(root)
                clickNodeOrFallback(uploadBtn, centerX, (screenH * 0.960f).toInt())

                handler.postDelayed({
                    verifyUploadAndComplete(screenW, screenH, centerX, attempt + 1)
                }, 3000)
            } else {
                Log.e(TAG, "Upload failed to complete (didReachAddDetails=$didReachAddDetails, isStillOnAddDetails=$isStillOnAddDetails, pkg=$pkg)")
                reportTaskStatus("FAILED")
                resetState()
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LITHO-SAFE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    private fun clickNodeOrFallback(node: AccessibilityNodeInfo?, fallbackX: Int, fallbackY: Int) {
        if (node != null) {
            if (performClick(node)) {
                Log.d(TAG, "  ✓ Clicked node via Accessibility ACTION_CLICK")
                return
            }
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (rect.width() > 0 && rect.height() > 0) {
                Log.d(TAG, "  ✓ Gesture tapping node bounds center (${rect.centerX()}, ${rect.centerY()})")
                gestureClick(rect.centerX(), rect.centerY())
                return
            }
        }
        Log.d(TAG, "  ✓ Gesture tapping calibrated coordinate ($fallbackX, $fallbackY)")
        gestureClick(fallbackX, fallbackY)
    }

    private fun clickTopLeftBackArrow(screenW: Int, screenH: Int) {
        val root = service.rootInActiveWindow
        val backNode = findNodeByExactDesc(root, "Navigate up")
            ?: findNodeByExactDesc(root, "Back")
        val backX = (screenW * 0.088f).toInt()
        val backY = (screenH * 0.070f).toInt()
        clickNodeOrFallback(backNode, backX, backY)
    }

    private fun findNodeRecursive(root: AccessibilityNodeInfo?, target: String): AccessibilityNodeInfo? {
        if (root == null) return null
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        while (!queue.isEmpty()) {
            val node = queue.poll() ?: continue
            val text = node.text?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""
            if (text.contains(target, ignoreCase = true) || desc.contains(target, ignoreCase = true)) {
                return node
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { queue.add(it) }
            }
        }
        return null
    }

    private fun findNodeByExactDesc(root: AccessibilityNodeInfo?, targetDesc: String): AccessibilityNodeInfo? {
        if (root == null) return null
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        while (!queue.isEmpty()) {
            val node = queue.poll() ?: continue
            val desc = node.contentDescription?.toString()?.trim() ?: ""
            if (desc.equals(targetDesc, ignoreCase = true)) return node
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { queue.add(it) }
            }
        }
        return null
    }

    private fun copyToClipboard(label: String, text: String) {
        try {
            val clipboard = service.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val clip = ClipData.newPlainText(label, text)
            clipboard?.setPrimaryClip(clip)
            Log.d(TAG, "Copied '$label' to clipboard (${text.length} chars)")
        } catch (e: Exception) {
            Log.e(TAG, "Error copying to clipboard: ${e.message}")
        }
    }

    private fun gestureClick(x: Int, y: Int, durationMs: Long = 100) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val path = Path().apply {
                moveTo(x.toFloat(), y.toFloat())
                lineTo(x.toFloat(), y.toFloat())
            }
            val stroke = GestureDescription.StrokeDescription(path, 0, durationMs)
            val gesture = GestureDescription.Builder().addStroke(stroke).build()
            service.dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    Log.d(TAG, "  ✓ Gesture tap ($x,$y) completed")
                }
                override fun onCancelled(gestureDescription: GestureDescription?) {
                    Log.w(TAG, "  ✗ Gesture tap ($x,$y) cancelled")
                }
            }, null)
        }
    }

    private fun findYouTubeNextButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        try {
            val byId = node.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/next_button")
            if (!byId.isNullOrEmpty()) return byId[0]
        } catch (e: Exception) {}
        return findNodeRecursive(node, "Next")
    }

    private fun findRealUploadButton(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        try {
            val byId = node.findAccessibilityNodeInfosByViewId("com.google.android.youtube:id/upload_bottom_button")
            if (!byId.isNullOrEmpty()) return byId[0]
        } catch (e: Exception) {}
        return findNodeRecursive(node, "Upload")
    }

    private fun findTitleEditText(root: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (root == null) return null
        return findFirstEditText(root)
            ?: findNodeRecursive(root, "Create a title")
            ?: findNodeRecursive(root, "Caption your Short")
    }

    private fun findFirstEditText(root: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (root == null) return null
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        while (!queue.isEmpty()) {
            val node = queue.poll() ?: continue
            val cls = node.className?.toString() ?: ""
            if (node.isEditable || cls.contains("EditText", ignoreCase = true)) {
                return node
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { queue.add(it) }
            }
        }
        return null
    }

    private fun onYouTubeUploadTriggered() {
        Log.d(TAG, "YouTube upload successfully dispatched! Reporting COMPLETED.")
        reportTaskStatus("COMPLETED")

        handler.postDelayed({
            Log.d(TAG, "Returning to Home screen...")
            service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
            resetState()
        }, 3500)
    }

    fun resetState() {
        handler.removeCallbacks(safetyResetRunnable)
        cancelWaitAddDetails()
        pipelineStarted = false
        AutomationState.isAutomationActive = false
        AutomationState.currentTaskType = "WHATSAPP"
        AutomationState.currentTaskId = null
        AutomationState.videoTitle = null
        AutomationState.videoDescription = null
        isProcessing = false
        didReachAddDetails = false
        Log.d(TAG, "YouTube automation state reset.")
    }

    fun performClick(node: AccessibilityNodeInfo?): Boolean {
        var current = node
        for (i in 0..4) {
            if (current == null) break
            if (current.isClickable) {
                val success = current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (success) return true
            }
            current = current.parent
        }
        return false
    }

    private fun reportTaskStatus(status: String) {
        val serverBaseUrl = AutomationState.serverBaseUrl
            ?: service.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                .getString("server_url", BuildConfig.API_BASE_URL)
        val taskId = AutomationState.currentTaskId

        if (!serverBaseUrl.isNullOrEmpty() && taskId != null && taskId != "TEST_LOCAL") {
            Thread {
                try {
                    val endpoint = "$serverBaseUrl/masters/api/youtube/tasks/$taskId/complete/"
                    val url = URL(endpoint)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/json")
                    val token = AutomationState.deviceToken
                        ?: service.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                            .getString("device_token", null)
                    if (!token.isNullOrEmpty()) {
                        connection.setRequestProperty("X-Device-Token", token)
                    }
                    connection.doOutput = true
                    val outputStream = connection.outputStream
                    outputStream.write("{\"status\":\"$status\"}".toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()
                    val code = connection.responseCode
                    Log.d(TAG, "Reported YouTube task $taskId status=$status HTTP $code")
                    connection.disconnect()
                } catch (e: Exception) {
                    Log.e(TAG, "Error reporting task: ${e.message}")
                    e.printStackTrace()
                }
            }.start()
        }
    }
}