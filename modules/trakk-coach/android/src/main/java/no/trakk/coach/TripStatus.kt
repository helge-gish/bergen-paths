package no.trakk.coach

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.util.Locale

/** Decorate the existing Expo GPS foreground notification; never start a second service.
 * Android owns the elapsed-time chronometer, including when JS/GPS are asleep. */
internal object TripStatus {
  private val handler = Handler(Looper.getMainLooper())
  private var context: Context? = null
  private var data: JSONObject? = null
  private var rendered = ""
  private var retries = 0
  val commentary: String get() = data?.optString("commentary", "") ?: ""
  private val loop = object : Runnable {
    override fun run() {
      render()
      if (data != null) handler.postDelayed(this, if (retries > 0) 1000 else 5000)
    }
  }
  fun update(ctx: Context, json: String?) {
    context = ctx; data = json?.let(::JSONObject); retries = 5
    handler.removeCallbacks(loop)
    if (data != null) handler.post(loop) else rendered = ""
  }
  fun render() {
    val ctx = context ?: return
    val d = data ?: return
    val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val existing = manager.activeNotifications.firstOrNull {
      if (Build.VERSION.SDK_INT >= 26) it.notification.channelId?.endsWith(":trakk-location-v1") == true
      else it.notification.flags and Notification.FLAG_FOREGROUND_SERVICE != 0
    }
    if (existing == null) { retries = (retries - 1).coerceAtLeast(0); return }
    retries = 0
    val now = System.currentTimeMillis()
    val meters = d.optDouble("meters", 0.0)
    val ascent = if (d.optBoolean("hasElevation")) " · ↑ ${d.optInt("ascent")} m" else ""
    val title = String.format(Locale.forLanguageTag("nb-NO"), "Tråkk · %.1f km%s", meters / 1000, ascent)
    val gps = if (d.optLong("lastGps") <= 0 || now - d.optLong("lastGps") > 30000) "GPS venter · sist målte distanse" else "GPS registrerer"
    val workout = d.optJSONObject("workout")
    var phase = ""
    if (workout != null) {
      val elapsed = workout.optLong("elapsedMs") + if (workout.isNull("runningSince")) 0 else (now - workout.optLong("runningSince")).coerceAtLeast(0)
      val phases = d.optJSONArray("phases")
      val workoutName = d.optString("workoutName", "4×4")
      val totalMs = d.optLong("workoutTotalMs", 2100000)
      if (workout.isNull("endedAt") && elapsed < totalMs && phases != null) {
        for (i in 0 until phases.length()) {
          val p = phases.getJSONObject(i); val end = (p.getLong("start") + p.getLong("seconds")) * 1000
          if (elapsed < end) {
            val seconds = ((end - elapsed + 999) / 1000).coerceAtLeast(0)
            phase = (if (workout.isNull("runningSince")) "$workoutName pause · " else "$workoutName · ") + p.getString("label") + String.format(Locale.ROOT, " · %d:%02d igjen", seconds / 60, seconds % 60)
            break
          }
        }
      } else phase = "$workoutName avsluttet · turen fortsetter"
    }
    val text = if (phase.isEmpty()) gps else phase
    val elapsed = (now - d.getLong("startedAt")).coerceAtLeast(1)
    val average = String.format(Locale.forLanguageTag("nb-NO"), "Snitt %.1f km/t", meters / elapsed * 3600)
    val summary = listOf(text, if (phase.isNotEmpty()) gps else "", average).filter { it.isNotEmpty() }.joinToString("\n")
    val key = "${existing.id}:${d.getLong("startedAt")}:$title:$summary"
    if (key == rendered && existing.notification.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER)
      && existing.notification.`when` == d.getLong("startedAt")
      && existing.notification.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() == title) return
    val notification = Notification.Builder.recoverBuilder(ctx, existing.notification)
      .setContentTitle(title).setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText(summary))
      .setWhen(d.getLong("startedAt")).setShowWhen(true).setUsesChronometer(true)
      .setVisibility(Notification.VISIBILITY_PUBLIC).setOnlyAlertOnce(true).setOngoing(true)
      .build()
    notification.flags = notification.flags or (existing.notification.flags and Notification.FLAG_FOREGROUND_SERVICE)
    // Retain the service's id, channel, small icon, launch intent and FG flag.
    try {
      manager.notify(existing.tag, existing.id, notification)
      rendered = key
    } catch (_: SecurityException) { /* Recording continues if notification access is revoked. */ }
  }
}
