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
    val sensor = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) ?: return false
    lastAt = 0
    observing = sensors.registerListener(this, sensor, 100000)
    return observing
  }
  private fun stopSensor() {
    manager?.unregisterListener(this)
    observing = false
  }
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
  override fun onSensorChanged(event: SensorEvent) {
    if (!observing || !requested) return
    val now = SystemClock.elapsedRealtime()
    if (now - lastAt < 100) return
    lastAt = now
    val matrix = FloatArray(9)
    SensorManager.getRotationMatrixFromVector(matrix, event.values)
    val direction = rearCameraDirection(matrix, declination)
    val estimate = if (event.values.size >= 5 && event.values[4] >= 0) Math.toDegrees(event.values[4].toDouble()) else null
    val reliable = event.accuracy >= SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM && (estimate == null || estimate <= 20)
    sendEvent("heading", mapOf("bearing" to direction.first, "pitch" to direction.second, "reliable" to reliable, "timestamp" to System.currentTimeMillis().toDouble()))
  }
}

internal fun rearCameraDirection(matrix: FloatArray, declination: Double): Pair<Double, Double> {
  val east = -matrix[2].toDouble()
  val north = -matrix[5].toDouble()
  val up = -matrix[8].toDouble()
  return Pair((Math.toDegrees(atan2(east, north)) + declination + 360) % 360, Math.toDegrees(asin(up.coerceIn(-1.0, 1.0))))
}
