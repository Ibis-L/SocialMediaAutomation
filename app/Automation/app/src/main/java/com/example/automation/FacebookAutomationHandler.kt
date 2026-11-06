package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.util.Log

/**
 * Main entry point for all Facebook automation events.
 * Cleanly routes to:
 * - FacebookPostAutomationHandler (for FEED posts: text, images, videos)
 * - FacebookDmAutomationHandler (for DMs / Profile shares)
 */
object FacebookAutomationHandler {

    private const val TAG = "FacebookAutomation"

    fun startFacebookFlow(
        service: AccessibilityService,
        handler: Handler,
        onFinish: () -> Unit,
        onError: () -> Unit
    ) {
        val taskType = AutomationState.taskType
        Log.d(TAG, "Routing Facebook flow. taskType='$taskType', currentTaskType='${AutomationState.currentTaskType}'")

        if (taskType.contains("POST", ignoreCase = true) || AutomationState.currentTaskType.contains("POST", ignoreCase = true)) {
            FacebookPostAutomationHandler.startPostFlow(service, handler, onFinish, onError)
        } else {
            FacebookDmAutomationHandler.startDmFlow(service, handler, onFinish, onError)
        }
    }
}
