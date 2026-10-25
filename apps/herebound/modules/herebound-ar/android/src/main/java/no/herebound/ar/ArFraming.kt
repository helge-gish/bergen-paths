package no.herebound.ar

import kotlin.math.*

/** Geometry-only framing, independent of Android/ARCore, in camera NDC. */
internal object ArFraming {
  fun shouldAutoPlace(hasAnchor: Boolean, trackingSince: Long, now: Long, lastAttempt: Long) =
    !hasAnchor && trackingSince > 0 && now - trackingSince >= 600 && (lastAttempt == 0L || now - lastAttempt >= 350)
  data class Bounds(val halfWidth: Float, val height: Float, val back: Float, val front: Float, val scale: Float)
  data class Rect(val left: Float, val top: Float, val right: Float, val bottom: Float) {
    val width get() = right - left
    val height get() = top - bottom
    val visible get() = left > -1f && right < 1f && bottom > -1f && top < 1f
    fun hit(x: Float, y: Float) = visible && x in left..right && y in bottom..top
  }
  fun bounds(kind: String) = when (kind) {
    "merchant" -> Bounds(.55f, 1.55f, .25f, .6f, .45f)
    "berries" -> Bounds(.42f, .77f, .25f, .25f, .45f)
    "satchel" -> Bounds(.29f, .665f, .14f, .22f, .55f)
    "lantern" -> Bounds(.225f, .85f, .225f, .225f, .5f)
    else -> Bounds(.23f, .9f, .18f, .21f, .55f)
  }
  fun project(mvp: FloatArray, kind: String, scale: Float): Rect? {
    val b = bounds(kind)
    var left = Float.POSITIVE_INFINITY; var right = Float.NEGATIVE_INFINITY
    var top = Float.NEGATIVE_INFINITY; var bottom = Float.POSITIVE_INFINITY
    for (x in listOf(-b.halfWidth, b.halfWidth)) for (y in listOf(0f, b.height)) for (z in listOf(-b.back, b.front)) {
      fun row(i: Int) = mvp[i]*x*scale + mvp[i+4]*y*scale + mvp[i+8]*z*scale + mvp[i+12]
      val w = row(3); if (!w.isFinite() || w <= .01f) return null
      val px = row(0)/w; val py = row(1)/w
      if (!px.isFinite() || !py.isFinite()) return null
      left = min(left,px); right = max(right,px); top = max(top,py); bottom = min(bottom,py)
    }
    return Rect(left,top,right,bottom)
  }
  /** Fit once on placement. Never enlarge the base miniature to fill the view.
   * NDC spans two units: .72/.64 means 36% width / 32% height. */
  fun fittedScale(mvp: FloatArray, kind: String): Float {
    var low = 0f; var high = bounds(kind).scale
    repeat(14) {
      val mid = (low+high)/2
      val r = project(mvp,kind,mid)
      if (r != null && r.visible && r.width <= .72f && r.height <= .64f) low = mid else high = mid
    }
    return low
  }
}
