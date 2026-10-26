package no.gatekampen.app

import android.app.Activity
import android.app.ActivityManager
import android.app.Application
import android.app.ApplicationExitInfo
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.util.AtomicFile
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/** Local diagnostics only. Never reads walks, location history, account data or tokens. */
object GatekampenDiagnostics {
  private const val MAX_REPORT = 24000
  private fun folder(context: Context) = File(context.noBackupFilesDir, "gatekampen-diagnostics").apply { mkdirs() }
  private fun file(context: Context, name: String) = File(folder(context), name)
  private fun read(context: Context, name: String): String = try {
    file(context, name).inputStream().bufferedReader().use { it.readText().take(MAX_REPORT) }
  } catch (_: Exception) { "" }
  private fun write(context: Context, name: String, text: String) {
    val target = AtomicFile(file(context, name))
    val stream = target.startWrite()
    try { stream.write(text.take(MAX_REPORT).toByteArray(Charsets.UTF_8)); target.finishWrite(stream) }
    catch (e: Exception) { target.failWrite(stream); throw e }
  }
  fun isRecoveryProcess(context: Context): Boolean {
    val name = if (Build.VERSION.SDK_INT >= 28) Application.getProcessName()
    else (context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).runningAppProcesses?.firstOrNull { it.pid == Process.myPid() }?.processName
    return name == context.packageName + ":diagnostics"
  }
  fun install(context: Context) {
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    val handling = AtomicBoolean(false)
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
      try { if (handling.compareAndSet(false, true)) record(context, error) }
      catch (_: Throwable) { /* Preserve Android's crash handling even if the disk is full. */ }
      finally {
        if (previous != null) previous.uncaughtException(thread, error)
        else { Process.killProcess(Process.myPid()); kotlin.system.exitProcess(10) }
      }
    }
  }
  fun record(context: Context, error: Throwable) {
    write(context, "crash.txt", "Gatekampen ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})\n" +
      "${Build.MANUFACTURER} ${Build.MODEL} · Android ${Build.VERSION.RELEASE} / API ${Build.VERSION.SDK_INT}\n" +
      "Tid: ${System.currentTimeMillis()}\n\n" + Log.getStackTraceString(error))
  }
  /** Run before Expo restores tasks. JS recovery in 0.1.2 ran too late for native startup failures. */
  fun retireLegacyTask(context: Context) {
    val state = context.getSharedPreferences("GatekampenRecovery", Context.MODE_PRIVATE)
    if (state.getBoolean("retired-before-expo-013", false)) return
    val tasks = context.getSharedPreferences("TaskManagerModule", Context.MODE_PRIVATE)
    val edit = tasks.edit()
    for ((key, value) in tasks.all) {
      if (value !is String) continue
      val config = try { JSONObject(value) } catch (_: Exception) { continue }
      val entries = config.optJSONObject("tasks") ?: continue
      if (!entries.has("gatekampen-walking-v1")) continue
      entries.remove("gatekampen-walking-v1")
      if (entries.length() == 0) edit.remove(key) else edit.putString(key, config.toString())
    }
    check(edit.commit()) { "Could not retire legacy location task" }
    check(state.edit().putBoolean("retired-before-expo-013", true).commit()) { "Could not save recovery revision" }
  }
  private fun exitReport(context: Context): String {
    if (Build.VERSION.SDK_INT < 30) return ""
    return try {
      val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      val exit = manager.getHistoricalProcessExitReasons(context.packageName, 0, 12).firstOrNull {
        it.processName == context.packageName && it.reason in listOf(ApplicationExitInfo.REASON_CRASH, ApplicationExitInfo.REASON_CRASH_NATIVE, ApplicationExitInfo.REASON_ANR, ApplicationExitInfo.REASON_INITIALIZATION_FAILURE)
      } ?: return ""
      "Androids siste feilrapport\nTid: ${exit.timestamp}\nÅrsak: ${exit.reason} · status: ${exit.status}\n${exit.description ?: "Ingen detaljer fra Android"}"
    } catch (_: Exception) { "" }
  }
  fun report(context: Context): String {
    val crash = read(context, "crash.txt")
    val system = exitReport(context)
    return listOf(crash, system).filter { it.isNotBlank() }.joinToString("\n\n").take(MAX_REPORT)
  }
  fun needsRecovery(context: Context): Boolean {
    if (read(context, "opened-version.txt").isBlank()) return true
    val latest = report(context)
    return latest.isNotBlank() && latest != read(context, "acknowledged.txt")
  }
  fun acknowledge(context: Context) {
    write(context, "acknowledged.txt", report(context))
    write(context, "opened-version.txt", BuildConfig.VERSION_NAME)
  }
}

/** Separate process: this screen can open without React Native, MapLibre or GPS. */
class GatekampenRecoveryActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (!GatekampenDiagnostics.needsRecovery(this)) { openApp(); return }
    val report = GatekampenDiagnostics.report(this)
    val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 60, 32, 40); setBackgroundColor(Color.rgb(246,244,234)) }
    fun text(value: String, size: Float) = TextView(this).apply { text = value; textSize = size; setTextColor(Color.rgb(22,45,80)); setPadding(0, 12, 0, 12) }.also { layout.addView(it) }
    text("Gatekampen ${BuildConfig.VERSION_NAME}", 26f)
    text(if (report.isBlank()) "Klar for å undersøke krasjen" else "Feilrapport", 22f)
    text(if (report.isBlank()) "Trykk Åpne Gatekampen. Hvis appen lukker seg igjen, åpne den én gang til for å se feilen. Turene dine beholdes." else "Kopier feilen og lim den inn i samtalen. Rapporten sendes ikke automatisk.", 18f)
    if (report.isNotBlank()) {
      layout.addView(Button(this).apply { text = "Kopier feilrapport"; setOnClickListener {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Gatekampen-feil", report))
        Toast.makeText(this@GatekampenRecoveryActivity, "Feilrapport kopiert", Toast.LENGTH_SHORT).show()
      } })
    }
    layout.addView(Button(this).apply { text = "Åpne Gatekampen"; setOnClickListener { openApp() } })
    if (report.isNotBlank()) text(report, 14f).apply { typeface = android.graphics.Typeface.MONOSPACE; setTextIsSelectable(true) }
    setContentView(ScrollView(this).apply { isFillViewport = true; addView(layout) })
    window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
  }
  private fun openApp() {
    GatekampenDiagnostics.acknowledge(this)
    startActivity(Intent().setClassName(this, packageName + ".GatekampenAppActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP))
    finish()
  }
}
