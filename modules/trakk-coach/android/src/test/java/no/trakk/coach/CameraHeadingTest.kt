package no.trakk.coach

import org.junit.Assert.assertEquals
import org.junit.Test

class CameraHeadingTest {
  @Test fun rearCameraUsesNegativeZAndTrueNorthCorrection() {
    val north = floatArrayOf(1f,0f,0f, 0f,0f,-1f, 0f,1f,0f)
    assertEquals(0.0, rearCameraDirection(north, 0.0).first, .001)
    assertEquals(0.0, rearCameraDirection(north, 0.0).second, .001)
    assertEquals(7.0, rearCameraDirection(north, 7.0).first, .001)
    assertEquals(355.0, rearCameraDirection(north, -5.0).first, .001)
    val east = floatArrayOf(0f,0f,-1f, -1f,0f,0f, 0f,1f,0f)
    assertEquals(90.0, rearCameraDirection(east, 0.0).first, .001)
  }
  @Test fun flatPhonePointsAtGroundInsteadOfPretendingToSeeTheHorizon() {
    val flat = floatArrayOf(1f,0f,0f, 0f,1f,0f, 0f,0f,1f)
    assertEquals(-90.0, rearCameraDirection(flat, 0.0).second, .001)
  }
}
