package no.trakk.coach

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Looper
import android.os.Vibrator
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode
import java.io.File
import java.time.Duration

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@LooperMode(LooperMode.Mode.PAUSED)
class FieldUpdateTest {
  private val tripId = "test-" + java.util.UUID.randomUUID().toString()
  private val context: Context get() = RuntimeEnvironment.getApplication()
  private val manager get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  @After fun stop() { Coach.configure(context, null); TripStatus.update(context, null); manager.cancelAll() }
  private fun gpsNotification() {
    val channel = "@trakk/test-scope:trakk-location-v1"
    manager.createNotificationChannel(NotificationChannel(channel, "GPS", NotificationManager.IMPORTANCE_LOW))
    manager.notify(481756, Notification.Builder(context, channel).setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("GPS").setOngoing(true).build().apply { flags = flags or Notification.FLAG_FOREGROUND_SERVICE })
  }
  private fun plan(elapsed: Long, vibrate: Boolean = true): JSONObject {
    return JSONObject(File(System.getProperty("trakk.coach.plan")!!).readText()).put("id", tripId)
      .put("elapsedMs", elapsed).put("runningSince", System.currentTimeMillis()).put("running", true)
      .put("audio", false).put("routeAudio", false).put("vibrate", vibrate)
  }
  @Test fun notificationUsesExistingGpsIdPublicVisibilityAndSystemChronometer() {
    gpsNotification()
    val now = System.currentTimeMillis()
    TripStatus.update(context, JSONObject().put("startedAt", now - 3600000).put("meters", 4100).put("ascent", 230).put("hasElevation", true).put("lastGps", now).toString())
    TripStatus.render()
    val result = manager.activeNotifications.single()
    assertEquals(481756, result.id)
    val n = result.notification
    assertEquals(now - 3600000, n.`when`)
    assertTrue(n.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER))
    assertEquals(Notification.VISIBILITY_PUBLIC, n.visibility)
    assertTrue(n.extras.getString(Notification.EXTRA_TITLE)!!.contains("4,1"))
    assertTrue(n.extras.getString(Notification.EXTRA_TITLE)!!.contains("230"))
    assertTrue(n.flags and Notification.FLAG_ONGOING_EVENT != 0)
    assertTrue(n.flags and Notification.FLAG_FOREGROUND_SERVICE != 0)
    // Reattaching Expo's service may reset its notification without a new fix.
    gpsNotification(); TripStatus.render()
    assertTrue(manager.activeNotifications.single().notification.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER))
  }
  @Test fun staleGpsRetainsMeasuredDistanceAndDoesNotResetClock() {
    gpsNotification()
    val now = System.currentTimeMillis()
    TripStatus.update(context, JSONObject().put("startedAt", now - 3600000).put("meters", 4100).put("lastGps", now - 60000).toString())
    TripStatus.render()
    val n = manager.activeNotifications.single().notification
    assertTrue(n.extras.getString(Notification.EXTRA_TEXT)!!.contains("GPS venter"))
    assertEquals(now - 3600000, n.`when`)
    assertTrue(n.extras.getString(Notification.EXTRA_TITLE)!!.contains("4,1"))
  }
  @Test fun phaseChangeVibratesWithSpeechMutedAndDoesNotReplayOnReconfigure() {
    val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    val shadow = shadowOf(vibrator)
    shadow.setHasVibrator(true)
    Coach.configure(context, plan(295000).toString())
    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(5250))
    assertNotNull(shadow.pattern)
    assertTrue("Fast phase should vibrate with speech muted", shadow.isVibrating)
    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(2))
    assertFalse(shadow.isVibrating)
    Coach.configure(context, plan(301000).toString())
    shadowOf(Looper.getMainLooper()).idle()
    assertFalse("Reopening cannot replay phase vibration", shadow.isVibrating)
  }
  @Test fun vibrationCanBeDisabledWithoutPausingTheWorkout() {
    val shadow = shadowOf(context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
    shadow.setHasVibrator(true)
    Coach.configure(context, plan(295000, false).toString())
    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(6))
    assertFalse(shadow.isVibrating)
    assertNull("Disabled vibration must not issue an effect", shadow.pattern)
    Coach.configure(context, plan(301000, true).toString())
    shadowOf(Looper.getMainLooper()).idle()
    assertFalse("Enabling vibration cannot replay the muted transition", shadow.isVibrating)
  }
}
