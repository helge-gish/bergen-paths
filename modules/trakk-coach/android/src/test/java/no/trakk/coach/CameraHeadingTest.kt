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
  @Test fun angularEstimateDoesNotRequireAnUnpopulatedGenericFusionStatus() {
    assertEquals("precise", rotationHeadingQuality(0, Math.toRadians(10.0)))
    assertEquals("approximate", rotationHeadingQuality(0, Math.toRadians(30.0)))
    assertEquals("unreliable", rotationHeadingQuality(3, Math.toRadians(70.0)))
    assertEquals("approximate", rotationHeadingQuality(2, null))
    assertEquals("approximate", rotationHeadingQuality(3, -1.0))
    assertEquals("unreliable", rotationHeadingQuality(0, -1.0))
    assertEquals("unreliable", rotationHeadingQuality(3, Double.NaN))
  }
  @Test fun magneticFallbackRequiresCalibrationAndPlausiblePhysicalReadings() {
    val gravity = floatArrayOf(0f, 9.81f, 0f)
    val magnetic = floatArrayOf(0f, 40f, -20f)
    assertEquals(true, magneticHeadingUsable(2, gravity, magnetic))
    assertEquals(false, magneticHeadingUsable(0, gravity, magnetic))
    assertEquals(false, magneticHeadingUsable(3, gravity, floatArrayOf(0f, 150f, 0f)))
    assertEquals(false, magneticHeadingUsable(3, floatArrayOf(0f, 0f, 0f), magnetic))
    assertEquals(false, magneticHeadingUsable(3, gravity, floatArrayOf(Float.NaN, 40f, 0f)))
  }
  @Test fun fallbackReplacesRejectedFusionButNeverReusesStaleOrFutureMeasurements() {
    val rotation = HeadingReading(10.0, 0.0, "unreliable", 1000, "rotation", 0, 90.0)
    val magnetic = HeadingReading(15.0, 0.0, "approximate", 1100, "magnetic", 2)
    assertEquals("magnetic", chooseCameraHeading(rotation, magnetic, 1200)?.source)
    assertEquals("rotation", chooseCameraHeading(rotation.copy(quality = "precise"), magnetic, 1200)?.source)
    assertEquals("rotation", chooseCameraHeading(rotation.copy(quality = "approximate"), magnetic, 1200)?.source)
    assertEquals(null, chooseCameraHeading(rotation, magnetic, 4000))
    assertEquals(null, chooseCameraHeading(rotation, magnetic, 500))
    assertEquals("unreliable", chooseCameraHeading(rotation, magnetic.copy(quality = "unreliable"), 1200)?.quality)
    assertEquals("magnetic", chooseCameraHeading(null, magnetic, 1200)?.source)
  }
}
