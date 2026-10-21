package no.trakk.coach

import kotlin.math.*

/** Local ground guide, never a geographic destination anchor. */
internal data class GroundGuide(val id: String, val bearing: Double, val heading: Double, val validUntil: Double) {
  fun fresh(now: Long) = id.isNotBlank() && bearing.isFinite() && heading.isFinite() && validUntil.isFinite() &&
    validUntil >= now && validUntil <= now + 35_000
}
internal fun groundHitUsable(distance: Float, cameraHeight: Float, extentX: Float, extentZ: Float) =
  distance.isFinite() && cameraHeight.isFinite() && extentX.isFinite() && extentZ.isFinite() &&
    distance in .5f..4f && cameraHeight in .4f..2.5f && extentX >= .5f && extentZ >= .5f

// AR world axes have arbitrary north. Align a *local* arrow once, from the
// camera's horizontal forward vector and a contemporaneous compass reading.
internal fun groundArrowDirection(forwardX: Float, forwardZ: Float, deltaDegrees: Double): FloatArray? {
  if (!forwardX.isFinite() || !forwardZ.isFinite() || !deltaDegrees.isFinite()) return null
  val norm = hypot(forwardX.toDouble(), forwardZ.toDouble())
  if (norm < .25) return null // Nearly vertical phone cannot establish azimuth.
  val angle = atan2(forwardX.toDouble(), -forwardZ.toDouble()) + Math.toRadians(deltaDegrees)
  return floatArrayOf(sin(angle).toFloat(), 0f, -cos(angle).toFloat())
}
internal fun groundAnchorExpired(ageMs: Long, distance: Float) = ageMs !in 0..30_000 || !distance.isFinite() || distance > 6f
