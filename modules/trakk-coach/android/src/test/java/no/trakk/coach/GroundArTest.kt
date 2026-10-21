package no.trakk.coach

import org.junit.Assert.*
import org.junit.Test

class GroundArTest {
  @Test fun localDirectionUsesCameraAxesWithoutAssumingArWorldNorth() {
    assertArrayEquals(floatArrayOf(0f,0f,-1f), groundArrowDirection(0f,-1f,0.0), .001f)
    assertArrayEquals(floatArrayOf(1f,0f,0f), groundArrowDirection(0f,-1f,90.0), .001f)
    assertArrayEquals(floatArrayOf(0f,0f,1f), groundArrowDirection(1f,0f,90.0), .001f)
    assertArrayEquals(floatArrayOf(0f,0f,-1f), groundArrowDirection(1f,0f,-90.0), .001f)
    assertArrayEquals(floatArrayOf(-1f,0f,0f), groundArrowDirection(0f,-1f,270.0), .001f)
    assertArrayEquals(floatArrayOf(0f,0f,-1f), groundArrowDirection(0f,-.5f,360.0), .001f)
  }
  @Test fun lookingStraightDownCannotInventAzimuth() {
    assertNull(groundArrowDirection(0f,0f,0.0))
    assertNull(groundArrowDirection(.01f,.1f,90.0))
    assertNull(groundArrowDirection(Float.NaN,-1f,90.0))
    assertNull(groundArrowDirection(0f,-1f,Double.NaN))
  }
  @Test fun guideExpiresWithoutDependingOnJsOrSensorDelivery() {
    val g = GroundGuide("stairs", 270.0, 10.0, 12500.0)
    assertTrue(g.fresh(10000)); assertTrue(g.fresh(12500)); assertFalse(g.fresh(12501))
    assertFalse(g.copy(validUntil = Double.NaN).fresh(10000))
    assertFalse(g.copy(validUntil = 100000.0).fresh(10000))
    assertFalse(g.copy(heading = Double.NaN).fresh(10000))
    assertFalse(g.copy(id = "").fresh(10000))
  }
  @Test fun groundCandidateNeedsNearbyMeasuredSurfaceBelowCamera() {
    assertTrue(groundHitUsable(2f,1.4f,2f,2f))
    assertFalse(groundHitUsable(6f,1.4f,2f,2f))
    assertFalse(groundHitUsable(2f,-1f,2f,2f))
    assertFalse(groundHitUsable(2f,.1f,2f,2f))
    assertFalse(groundHitUsable(2f,5f,2f,2f))
    assertFalse(groundHitUsable(2f,1.4f,.1f,2f))
    assertFalse(groundHitUsable(Float.NaN,1.4f,2f,2f))
  }
  @Test fun oldOrDistantAnchorsRequireNewSurfaceHit() {
    assertFalse(groundAnchorExpired(1000,2f))
    assertTrue(groundAnchorExpired(30001,2f))
    assertTrue(groundAnchorExpired(1000,6.1f))
    assertTrue(groundAnchorExpired(-1,2f))
    assertTrue(groundAnchorExpired(1000,Float.NaN))
  }
}
