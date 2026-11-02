package com.example.automation

import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class UpdateChecker(private val context: Context, private val serverBaseUrl: String) {

    private val TAG = "UpdateChecker"
    private var downloadId: Long = -1

    fun checkForUpdates() {
        if (serverBaseUrl.isEmpty()) return

        thread {
            try {
                val url = URL("$serverBaseUrl/masters/api/app-versions/latest/")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"

                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)

                    val latestVersionCode = json.optInt("version_code", -1)
                    val apkFileUrl = json.optString("apk_file")
                    val releaseNotes = json.optString("release_notes", "A new update is available.")
                    val isMandatory = json.optBoolean("is_mandatory", true)

                    val currentVersionCode = BuildConfig.VERSION_CODE

                    if (latestVersionCode > currentVersionCode && apkFileUrl.isNotEmpty()) {
                        (context as? android.app.Activity)?.runOnUiThread {
                            showUpdateDialog(apkFileUrl, releaseNotes, isMandatory)
                        }
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to check for updates", e)
            }
        }
    }

    private fun showUpdateDialog(apkUrl: String, notes: String, mandatory: Boolean) {
        val builder = AlertDialog.Builder(context)
            .setTitle("Update Available")
            .setMessage(notes)
            .setCancelable(!mandatory)
            .setPositiveButton("Update") { _, _ ->
                downloadAndInstall(apkUrl)
            }

        if (!mandatory) {
            builder.setNegativeButton("Later", null)
        }

        builder.show()
    }

    private fun downloadAndInstall(apkUrl: String) {
        val fullUrl = if (apkUrl.startsWith("http")) apkUrl else "${serverBaseUrl}$apkUrl"
        
        Toast.makeText(context, "Downloading update...", Toast.LENGTH_SHORT).show()

        val request = DownloadManager.Request(Uri.parse(fullUrl))
            .setTitle("WA Dispatcher Update")
            .setDescription("Downloading latest version")
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "wa_dispatcher_update.apk")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)

        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        downloadId = manager.enqueue(request)

        context.registerReceiver(
            onDownloadComplete,
            IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        )
    }

    private val onDownloadComplete = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
            if (id == downloadId) {
                installApk(context)
                context.unregisterReceiver(this)
            }
        }
    }

    private fun installApk(context: Context) {
        val file = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "wa_dispatcher_update.apk")
        if (!file.exists()) {
            Toast.makeText(context, "Download failed", Toast.LENGTH_SHORT).show()
            return
        }

        val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        } else {
            Uri.fromFile(file)
        }

        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        try {
            context.startActivity(installIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Install failed", e)
            Toast.makeText(context, "Failed to launch installer", Toast.LENGTH_SHORT).show()
        }
    }
}
