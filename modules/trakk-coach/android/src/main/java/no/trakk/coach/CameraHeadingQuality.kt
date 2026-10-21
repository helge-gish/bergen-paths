package no.trakk.coach

import kotlin.math.*

/** Rotation-vector heading accuracy is an angle in radians; the generic status
 * is not consistently populated by fusion sensors. Prefer the angular estimate
 * when supplied. Unknown estimates use Android's calibration status. */
internal fun rotationHeadingQuality(accuracy: Int, radians: Double?): String {
  if (radians != null && !radians.isFinite()) return "unreliable"
  if (radians != null && radians >= 0) {
    val degrees = Math.toDegrees(radians)
    return when { degrees <= 20 -> "precise"; degrees <= 45 -> "approximate"; else -> "unreliable" }
  }
  return if (accuracy >= 2) "approximate" else "unreliable"
}
internal fun magneticHeadingUsable(accuracy: Int, gravity: FloatArray, magnetic: FloatArray): Boolean {
  if (accuracy < 2 || gravity.size < 3 || magnetic.size < 3 || gravity.any { !it.isFinite() } || magnetic.any { !it.isFinite() }) return false
  val g = sqrt(gravity.take(3).sumOf { it.toDouble().pow(2) })
  val m = sqrt(magnetic.take(3).sumOf { it.toDouble().pow(2) })
  return g in 7.0..12.0 && m in 20.0..80.0
}
internal data class HeadingReading(val bearing: Double, val pitch: Double, val quality: String, val at: Long, val source: String, val accuracy: Int, val errorDegrees: Double? = null)
internal fun chooseCameraHeading(rotation: HeadingReading?, magnetic: HeadingReading?, now: Long): HeadingReading? {
  fun fresh(r: HeadingReading?) = r?.takeIf { now - it.at in 0..2000 && it.bearing.isFinite() && it.pitch.isFinite() }
  val r = fresh(rotation); val m = fresh(magnetic)
  return r?.takeIf { it.quality != "unreliable" } ?: m?.takeIf { it.quality != "unreliable" } ?: r ?: m
}
