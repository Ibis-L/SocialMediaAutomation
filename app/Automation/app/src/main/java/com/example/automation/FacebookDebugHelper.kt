package com.example.automation

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Diagnostic tool to dump the accessibility node hierarchy of the active window.
 * Useful for debugging what the Facebook app is actually displaying on screen.
 */
object FacebookDebugHelper {

    private const val TAG = "FBDebugDump"

    fun dumpCurrentHierarchy(service: AccessibilityService, maxDepth: Int = 8) {
        val root = service.rootInActiveWindow
        if (root == null) {
            Log.e(TAG, "Cannot dump hierarchy: rootInActiveWindow is NULL")
            return
        }

        Log.d(TAG, "══════════════ FACEBOOK UI HIERARCHY DUMP START ══════════════")
        Log.d(TAG, "Package: ${root.packageName}, Class: ${root.className}")
        dumpNodeRecursive(root, 0, maxDepth)
        Log.d(TAG, "══════════════ FACEBOOK UI HIERARCHY DUMP END ════════════════")
    }

    private fun dumpNodeRecursive(node: AccessibilityNodeInfo?, depth: Int, maxDepth: Int) {
        if (node == null || depth > maxDepth) return

        val indent = "  ".repeat(depth)
        val text = node.text?.toString()?.take(50) ?: ""
        val desc = node.contentDescription?.toString()?.take(50) ?: ""
        val id = node.viewIdResourceName ?: ""
        val cls = node.className?.toString()?.substringAfterLast('.') ?: ""
        val click = if (node.isClickable) "[CLICK]" else ""
        val edit = if (node.isEditable) "[EDIT]" else ""
        val focus = if (node.isFocused) "[FOCUSED]" else ""

        val info = StringBuilder()
        if (cls.isNotEmpty()) info.append("cls=$cls ")
        if (text.isNotEmpty()) info.append("text=\"$text\" ")
        if (desc.isNotEmpty()) info.append("desc=\"$desc\" ")
        if (id.isNotEmpty()) info.append("id=\"$id\" ")
        if (click.isNotEmpty()) info.append("$click ")
        if (edit.isNotEmpty()) info.append("$edit ")
        if (focus.isNotEmpty()) info.append("$focus ")

        if (info.isNotEmpty()) {
            Log.d(TAG, "$indent└─ $info")
        }

        for (i in 0 until node.childCount) {
            dumpNodeRecursive(node.getChild(i), depth + 1, maxDepth)
        }
    }
}

