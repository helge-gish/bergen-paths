package no.trakk.coach

import android.content.Context
import android.media.AudioAttributes
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.util.Locale

/** Runs alongside Expo's existing location foreground service. No JS/GPS timer dependency.
 * The location task and foreground recovery reattach after process recreation. Force-stop
 * still stops all Android services. A bounded wakelock covers only the running workout.
 */
class TrakkCoachModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TrakkCoach")
    AsyncFunction("configure") { json: String? ->
      val context = requireNotNull(appContext.reactContext).applicationContext
      Coach.handler.post { Coach.configure(context, json) }
    }
    AsyncFunction("offer") { text: String, kind: String, promise: Promise ->
      Coach.handler.post { promise.resolve(Coach.offer(text, kind)) }
    }
    Function("busy") { Coach.busy() }
    Function("error") { Coach.error }
  }
}

private object Coach {
  val handler = Handler(Looper.getMainLooper())
  private var config: JSONObject? = null
  private var raw: String? = null
  private var context: Context? = null
  private var engine: TextToSpeech? = null
  private var ready = false
  private var voiceReady = false
  private var wake: PowerManager.WakeLock? = null
  private var baseElapsed = 0L
  private var baseClock = 0L
  private var lastCue = -1
  @Volatile private var protectedUntil = 0L
  @Volatile var error: String? = null
  private var generation = 0
  private var finishing = false
  private data class Pending(val text: String, val at: Long)
  private val pending = mutableMapOf<String, Pending>()
  @Volatile private var speakingUntil = 0L
  fun offer(text: String, kind: String): Boolean {
    if (config == null) return false
    if (config?.optBoolean("routeAudio") == true) pending[kind] = Pending(text, SystemClock.elapsedRealtime())
    return true
  }
  private fun takePending(shortOnly: Boolean = false): String {
    val now = SystemClock.elapsedRealtime()
    val keys = if (shortOnly) listOf("ghost") else listOf("event", "ghost")
    val result = keys.mapNotNull { key -> pending.remove(key)?.takeIf { now - it.at < if (key == "ghost") 45_000 else 35_000 }?.text }
    return if (config?.optBoolean("routeAudio") == true) result.joinToString(" ") else ""
  }
  private fun flushPending(nextCue: Long) {
    if (!ready || SystemClock.elapsedRealtime() < speakingUntil || nextCue - elapsed() <= 25_000) return
    if (pending["event"] != null || pending["ghost"]?.let { SystemClock.elapsedRealtime() - it.at >= 20_000 } == true) {
      val text = takePending()
      if (text.isNotBlank()) say(text, "route")
    }
  }
  private val loop = object : Runnable {
    override fun run() { tick(); if (config != null && !finishing) handler.postDelayed(this, 500) }
  }
  private fun elapsed(): Long = baseElapsed + if (config?.optBoolean("running") == true) SystemClock.elapsedRealtime() - baseClock else 0L
  fun busy(): Boolean = SystemClock.elapsedRealtime() < protectedUntil

  fun configure(ctx: Context, json: String?) {
    if (json == raw) return
    val old = config
    finishing = false
    raw = json
    handler.removeCallbacks(loop)
    context = ctx
    engine?.stop(); speakingUntil = 0
    if (old?.optString("id") != JSONObject(json ?: "{}").optString("id")) pending.clear()
    wake?.let { if (it.isHeld) it.release() }; wake = null
    if (json == null) {
      config = null; engine?.shutdown(); engine = null; ready = false; voiceReady = false
      generation++; protectedUntil = 0; error = null; pending.clear()
      return
    }
    val next = JSONObject(json)
    if (!next.getBoolean("routeAudio")) pending.clear()
    else if (old?.optString("routeKey") != next.optString("routeKey")) pending.remove("ghost")
    config = next
    baseElapsed = next.getLong("elapsedMs") + if (next.getBoolean("running")) (System.currentTimeMillis() - next.getLong("runningSince")).coerceAtLeast(0) else 0
    baseClock = SystemClock.elapsedRealtime()
    val preferences = ctx.getSharedPreferences("trakk-coach", Context.MODE_PRIVATE)
    val id = next.getString("id")
    lastCue = if (preferences.getString("trip", null) == id) preferences.getInt("cue", -1) else -1
    if (next.getBoolean("running") && baseElapsed < next.getLong("totalMs")) {
      wake = (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "trakk:4x4").apply {
        acquire((next.getLong("totalMs") - baseElapsed + 30_000).coerceAtLeast(1000))
      }
    }
    if ((next.getBoolean("audio") || next.getBoolean("routeAudio")) && engine == null) {
      val expected = ++generation
      engine = TextToSpeech(ctx) { status -> handler.post {
        if (expected != generation || config == null) return@post
        ready = status == TextToSpeech.SUCCESS
        if (!ready) error = "Taletreneren kunne ikke starte. Nedtellingen fungerer fortsatt."
        else {
          engine?.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
          engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onDone(id: String?) { speakingUntil = 0 }
            @Deprecated("Android callback") override fun onError(id: String?) { speakingUntil = 0; error = "Tale kunne ikke spilles av. Sjekk talestemme og medievolum på mobilen. Neste beskjed prøves igjen." }
            override fun onError(id: String?, code: Int) { onError(id); Log.w("TrakkCoach", "Speech failed: $code; retrying at next cue") }
          })
          selectVoice()
          tick()
        }
      } }
    } else if (ready) selectVoice()
    // Pausing / resuming never queues missed reminders. Say the current instruction
    // when resuming or enabling speech, then continue the original timeline.
    if (old?.optString("id") == id && ready && next.getBoolean("running") && next.getBoolean("audio") &&
        (!old.optBoolean("running") || !old.optBoolean("audio"))) announceCurrent()
    handler.post(loop)
  }
  private fun selectVoice() {
    error = null
    voiceReady = true
    val selected = config?.optString("voice")
    val voices = engine?.voices.orEmpty()
    val voice = voices.find { it.name == selected } ?: voices.find { it.locale.language in listOf("nb", "nn", "no") && !it.isNetworkConnectionRequired }
      ?: voices.find { it.locale.language in listOf("nb", "nn", "no") }
    if (voice != null) engine?.voice = voice
    else if ((engine?.setLanguage(Locale.forLanguageTag("nb-NO")) ?: -1) < 0) { voiceReady = false; error = "Norsk talestemme mangler. Installer norsk tale i Androids taleinnstillinger." }
    engine?.setSpeechRate(0.95f)
  }
  private fun say(text: String, cue: String) {
    if (!ready || !voiceReady || (config?.optBoolean("audio") != true && config?.optBoolean("routeAudio") != true)) return
    error = null
    speakingUntil = SystemClock.elapsedRealtime() + 30_000
    protectedUntil = SystemClock.elapsedRealtime() + 15_000
    if (engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, cue) == TextToSpeech.ERROR) error = "Tale kunne ikke spilles av. Nedtellingen fungerer fortsatt."
    Log.i("TrakkCoach", "cue=$cue elapsed=${elapsed()} text=$text")
  }
  private fun announceCurrent() {
    val c = config ?: return
    if (!c.getBoolean("audio")) return
    val phases = c.getJSONArray("phases")
    for (i in 0 until phases.length()) {
      val p = phases.getJSONObject(i)
      val end = (p.getLong("start") + p.getLong("seconds")) * 1000
      if (elapsed() < end) {
        val seconds = ((end - elapsed() + 999) / 1000).coerceAtLeast(1)
        say("${p.getString("label")}. $seconds sekunder igjen i denne fasen.", "resume")
        return
      }
    }
  }
  private fun tick() {
    if (finishing) return
    val c = config ?: return
    if (!c.getBoolean("running")) { protectedUntil = 0; flushPending(Long.MAX_VALUE); return }
    val ms = elapsed()
    val cues = c.getJSONArray("cues")
    var latest = -1
    var nextCue = Long.MAX_VALUE
    for (i in 0 until cues.length()) {
      val at = cues.getJSONObject(i).getLong("at")
      if (at <= ms) latest = i
      else {
        if (c.getBoolean("audio")) nextCue = at
        if (c.getBoolean("audio") && at - ms <= 15_000) protectedUntil = SystemClock.elapsedRealtime() + 1000
        break
      }
    }
    // Wait briefly for TTS initialization; muted events are consumed immediately.
    if (latest > lastCue && (!c.getBoolean("audio") || ready || error != null)) {
      lastCue = latest
      context!!.getSharedPreferences("trakk-coach", Context.MODE_PRIVATE).edit().putString("trip", c.getString("id")).putInt("cue", lastCue).commit()
      val cue = cues.getJSONObject(latest)
      if (c.getBoolean("audio")) {
        if (ms - cue.getLong("at") <= 2_000) say((cue.getString("text") + " " + takePending(nextCue - ms <= 15_000)).trim(), latest.toString())
        else if (ms < c.getLong("totalMs")) announceCurrent()
      }
    }
    flushPending(nextCue)
    if (ms >= c.getLong("totalMs")) {
      wake?.let { if (it.isHeld) it.release() }; wake = null
      handler.removeCallbacks(loop)
      // Keep the completion audible, but stop the timer and release TTS shortly after.
      val completedRaw = raw
      handler.postDelayed({ if (raw == completedRaw) configure(context!!, null) }, 20_000)
      finishing = true
    }
  }
}
