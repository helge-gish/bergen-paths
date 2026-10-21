package no.trakk.coach

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.*

/** Portrait rear-camera direction, not the top-edge compass bearing of a flat
 * phone. No camera frames, photos or sensor history are stored or transmitted. */
class CameraHeadingModule : Module(), SensorEventListener {
  private var manager: SensorManager? = null
  @Volatile private var requested = false
  @Volatile private var observing = false
  @Volatile private var declination = 0.0
  private var lastAt = 0L
  private var rotation: HeadingReading? = null
  private var magnetic: HeadingReading? = null
  private var gravityValues: FloatArray? = null
  private var magneticValues: FloatArray? = null
  private var gravityAt = 0L
  private var magneticAt = 0L
  private var magneticAccuracy = SensorManager.SENSOR_STATUS_UNRELIABLE
  private var gravitySensorType = Sensor.TYPE_GRAVITY
  override fun definition() = ModuleDefinition {
    Name("TrakkCameraHeading")
    Events("heading")
    AsyncFunction("start") { latitude: Double, longitude: Double, altitude: Double ->
      require(latitude.isFinite() && longitude.isFinite() && altitude.isFinite() && abs(latitude) <= 90 && abs(longitude) <= 180)
      declination = GeomagneticField(latitude.toFloat(), longitude.toFloat(), altitude.toFloat(), System.currentTimeMillis()).declination.toDouble()
      requested = true
      startSensor()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") { requested = false; stopSensor() }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { stopSensor() }
    OnActivityEntersForeground { if (requested) startSensor() }
    OnDestroy { requested = false; stopSensor() }
  }
  private fun startSensor(): Boolean {
    if (observing) return true
    val context = appContext.reactContext ?: return false
    val sensors = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    manager = sensors
    lastAt = 0
    rotation = null; magnetic = null; gravityValues = null; magneticValues = null
    magneticAccuracy = SensorManager.SENSOR_STATUS_UNRELIABLE
    fun register(type: Int): Boolean = sensors.getDefaultSensor(type)?.let { sensors.registerListener(this, it, 100000) } ?: false
    val fused = register(Sensor.TYPE_ROTATION_VECTOR)
    gravitySensorType = if (sensors.getDefaultSensor(Sensor.TYPE_GRAVITY) != null) Sensor.TYPE_GRAVITY else Sensor.TYPE_ACCELEROMETER
    val gravity = register(gravitySensorType)
    val field = register(Sensor.TYPE_MAGNETIC_FIELD)
    observing = fused || (gravity && field)
    if (!observing) sensors.unregisterListener(this)
    return observing
  }
  private fun stopSensor() {
    manager?.unregisterListener(this)
    observing = false
  }
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    if (sensor?.type == Sensor.TYPE_MAGNETIC_FIELD) {
      magneticAccuracy = accuracy
      if (accuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) magnetic = magnetic?.copy(quality = "unreliable", accuracy = accuracy)
    }
  }
  override fun onSensorChanged(event: SensorEvent) {
    if (!observing || !requested) return
    val now = SystemClock.elapsedRealtime()
    when (event.sensor.type) {
      Sensor.TYPE_ROTATION_VECTOR -> {
        if (event.values.size < 3 || event.values.any { !it.isFinite() }) return
        val matrix = FloatArray(9)
        SensorManager.getRotationMatrixFromVector(matrix, event.values)
        val direction = rearCameraDirection(matrix, declination)
        val radians = event.values.getOrNull(4)?.toDouble()
        val error = radians?.takeIf { it >= 0 && it.isFinite() }?.let { Math.toDegrees(it) }
        rotation = HeadingReading(direction.first, direction.second, rotationHeadingQuality(event.accuracy, radians), now, "rotation", event.accuracy, error)
      }
      gravitySensorType -> {
        gravityValues = event.values.copyOf(3); gravityAt = now
      }
      Sensor.TYPE_MAGNETIC_FIELD -> {
        magneticValues = event.values.copyOf(3); magneticAt = now
        magneticAccuracy = event.accuracy
      }
    }
    val gravity = gravityValues; val field = magneticValues
    if (gravity != null && field != null && now - gravityAt <= 1500 && now - magneticAt <= 1500) {
      val matrix = FloatArray(9)
      if (SensorManager.getRotationMatrix(matrix, null, gravity, field)) {
        val direction = rearCameraDirection(matrix, declination)
        val quality = if (magneticHeadingUsable(magneticAccuracy, gravity, field)) "approximate" else "unreliable"
        // Never refresh a frozen sample using timestamps from the other sensor.
        magnetic = HeadingReading(direction.first, direction.second, quality, min(gravityAt, magneticAt), "magnetic", magneticAccuracy)
      }
    }
    if (now - lastAt < 100) return
    val reading = chooseCameraHeading(rotation, magnetic, now) ?: return
    lastAt = now
    sendEvent("heading", mapOf(
      "bearing" to reading.bearing, "pitch" to reading.pitch,
      "reliable" to (reading.quality != "unreliable"), "quality" to reading.quality,
      "source" to reading.source, "accuracy" to reading.accuracy, "errorDegrees" to reading.errorDegrees,
      "magneticAccuracy" to magneticAccuracy, "magneticMicrotesla" to field?.let { sqrt(it.sumOf { v -> v.toDouble().pow(2) }) },
      "timestamp" to (System.currentTimeMillis() - (now - reading.at)).toDouble()
    ))
  }
}

internal fun rearCameraDirection(matrix: FloatArray, declination: Double): Pair<Double, Double> {
  val east = -matrix[2].toDouble()
  val north = -matrix[5].toDouble()
  val up = -matrix[8].toDouble()
  return Pair((Math.toDegrees(atan2(east, north)) + declination + 360) % 360, Math.toDegrees(asin(up.coerceIn(-1.0, 1.0))))
}
