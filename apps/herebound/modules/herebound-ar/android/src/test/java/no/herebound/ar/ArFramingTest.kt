package no.herebound.ar

import org.junit.Assert.*
import org.junit.Test

class ArFramingTest {
  @Test fun placementStartsAutomaticallyAfterStableTrackingAndKeepsExistingAnchors() {
    assertFalse(ArFraming.shouldAutoPlace(false,0,2000,0))
    assertFalse(ArFraming.shouldAutoPlace(false,1000,1500,0))
    assertTrue(ArFraming.shouldAutoPlace(false,1000,1600,0))
    assertFalse(ArFraming.shouldAutoPlace(false,1000,1700,1600))
    assertTrue(ArFraming.shouldAutoPlace(false,1000,1950,1600))
    assertFalse(ArFraming.shouldAutoPlace(true,1000,3000,1600))
  }
  private fun camera(width: Float, height: Float, distance: Float): FloatArray {
    val m = FloatArray(16)
    m[0] = 1.4f; m[5] = 1.4f * width / height
    m[11] = -1f; m[13] = -.16f * distance; m[15] = distance
    return m
  }
  @Test fun allModelsFitInlineAndFullscreenAtPlacement() {
    for (kind in listOf("merchant","berries","satchel","lantern","sprite")) {
      for (height in listOf(220f,320f,760f)) for (distance in listOf(1.2f,2f,5f)) {
        val m = camera(360f,height,distance)
        val scale = ArFraming.fittedScale(m,kind)
        val r = ArFraming.project(m,kind,scale)!!
        assertTrue("$kind/$height/$distance", scale > 0f && scale <= ArFraming.bounds(kind).scale)
        assertTrue(r.visible); assertTrue(r.width <= .721f); assertTrue(r.height <= .641f)
      }
    }
  }
  @Test fun noModelCanBecomeLifeSizeThroughFitting() {
    for (kind in listOf("merchant","berries","satchel","lantern","sprite")) {
      val scale = ArFraming.fittedScale(camera(360f,760f,5f),kind)
      assertTrue(scale * ArFraming.bounds(kind).height < .71f)
    }
  }
  @Test fun hitAreaUsesTheScaledModelRatherThanAnOversizedGenericBox() {
    val m = camera(360f,320f,2f)
    val scale = ArFraming.fittedScale(m,"berries")
    val r = ArFraming.project(m,"berries",scale)!!
    assertTrue(r.hit((r.left+r.right)/2,(r.top+r.bottom)/2))
    assertFalse(r.hit(r.right+.02f,(r.top+r.bottom)/2))
    assertFalse(r.hit(0f,r.top+.02f))
  }
  @Test fun invalidBehindCameraAndOffscreenModelsNeverOfferAnInteraction() {
    val m = camera(360f,320f,-2f)
    assertNull(ArFraming.project(m,"merchant",.45f))
    assertEquals(0f,ArFraming.fittedScale(m,"merchant"),0f)
    m[15] = Float.NaN
    assertNull(ArFraming.project(m,"berries",.4f))
    val offscreen = camera(360f,320f,2f); offscreen[12]=6f
    val r = ArFraming.project(offscreen,"berries",.4f)!!
    assertFalse(r.visible); assertFalse(r.hit((r.left+r.right)/2,(r.top+r.bottom)/2))
  }
}
