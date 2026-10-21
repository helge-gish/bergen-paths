package no.trakk.coach

import android.graphics.SurfaceTexture
import android.opengl.*
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import com.google.ar.core.*
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import kotlin.math.*

/** One serialized camera owner across inline/fullscreen native views. All ARCore,
 * EGL and anchor calls live on this worker; no frame work crosses the JS bridge. */
internal object GroundArEngine {
  private val thread = HandlerThread("TrakkGroundAr").apply { start() }
  private val worker = Handler(thread.looper)
  private var owner: GroundArView? = null
  private var session: Session? = null
  private var display: EGLDisplay = EGL14.EGL_NO_DISPLAY
  private var context: EGLContext = EGL14.EGL_NO_CONTEXT
  private var surface: EGLSurface = EGL14.EGL_NO_SURFACE
  private var renderer: GroundArRenderer? = null
  private var anchor: Anchor? = null
  private var anchorId: String? = null
  private var anchorAt = 0L
  private var localDirection = floatArrayOf(0f, 0f, -1f)
  private var trackingSince = 0L
  private var lastState = ""
  private var lastFrame = 0L
  private var lastFrameAt = 0L
  private val draw = object : Runnable {
    override fun run() {
      val view = owner ?: return
      try { frame(view) } catch (_: Exception) { fail(view, "Kamerasporingen stoppet. Bruker vanlig retningsvisning."); return }
      if (owner === view) worker.postDelayed(this, 16)
    }
  }
  fun start(view: GroundArView, texture: SurfaceTexture) { worker.post {
    if (owner === view || view.failed) return@post
    release()
    owner = view
    try {
      initEgl(texture)
      val ar = Session(view.context)
      session = ar
      ar.configure(Config(ar).apply {
        planeFindingMode = Config.PlaneFindingMode.HORIZONTAL
        focusMode = Config.FocusMode.AUTO
        depthMode = Config.DepthMode.DISABLED
        lightEstimationMode = Config.LightEstimationMode.DISABLED
        updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
      })
      renderer = GroundArRenderer()
      ar.setCameraTextureName(renderer!!.texture)
      ar.resume()
      lastFrameAt = SystemClock.elapsedRealtime()
      worker.post(draw)
    } catch (_: Exception) { fail(view, "Bakkeankre kunne ikke startes. Bruker vanlig retningsvisning.") }
  } }
  fun stop(view: GroundArView, texture: SurfaceTexture? = null) { worker.post {
    if (owner === view) release()
    texture?.release()
  } }
  private fun state(view: GroundArView, value: String, reason: String = "") {
    val key = "$value:$reason:$anchorId"
    if (key != lastState) { lastState = key; view.report(value, reason, targetId = anchorId) }
  }
  private fun fail(view: GroundArView, reason: String) {
    view.failed = true
    release() // Camera is released before JS can mount its fallback preview.
    view.report("unavailable", reason, false)
  }
  private fun detachAnchor() { anchor?.detach(); anchor = null; anchorId = null }
  private fun frame(view: GroundArView) {
    val ar = session ?: return
    val gl = renderer ?: return
    val w = view.pixelWidth; val h = view.pixelHeight
    if (w <= 0 || h <= 0) return
    ar.setDisplayGeometry(view.rotation, w, h)
    GLES20.glViewport(0, 0, w, h)
    val frame = ar.update()
    val elapsed = SystemClock.elapsedRealtime()
    if (frame.timestamp != 0L && frame.timestamp != lastFrame) { lastFrame = frame.timestamp; lastFrameAt = elapsed }
    if (elapsed - lastFrameAt > 7000) { fail(view, "AR-kameraet svarte ikke. Bruker vanlig retningsvisning."); return }
    if (frame.timestamp == 0L) return
    gl.background(frame)
    val camera = frame.camera
    val guide = view.guide?.takeIf { it.fresh(System.currentTimeMillis()) }
    if (camera.trackingState != TrackingState.TRACKING) {
      trackingSince = 0; detachAnchor()
      val reason = when (camera.trackingFailureReason) {
        TrackingFailureReason.INSUFFICIENT_LIGHT -> "For mørkt til å feste i underlaget"
        TrackingFailureReason.EXCESSIVE_MOTION -> "Beveg kameraet roligere"
        TrackingFailureReason.INSUFFICIENT_FEATURES -> "Pek mot et underlag med synlige detaljer"
        TrackingFailureReason.CAMERA_UNAVAILABLE -> "Kameraet er opptatt"
        else -> "Finner kamerabevegelsen"
      }
      state(view, "searching", reason)
    } else {
      if (trackingSince == 0L) trackingSince = elapsed
      if (guide == null) { detachAnchor(); state(view, "tracking", "Velg et sted med brukbar GPS og kompassretning") }
      else {
        val held = anchor
        if (held != null) {
          val p = held.pose.translation; val c = camera.pose.translation
          val distance = sqrt(p.indices.sumOf { (p[it] - c[it]).toDouble().pow(2) }).toFloat()
          if (anchorId != guide.id || held.trackingState != TrackingState.TRACKING || groundAnchorExpired(elapsed - anchorAt, distance)) detachAnchor()
        }
        if (anchor == null && elapsed - trackingSince >= 500) {
          // Only a confirmed upward-facing plane, inside its measured polygon.
          // Do not invent a floor at a fixed height or use instant placement.
          val hits = listOf(.5f to .68f, .35f to .75f, .65f to .75f).flatMap { (x, y) -> frame.hitTest(w * x, h * y) }
          val hit = hits.firstOrNull {
            val plane = it.trackable as? Plane
            plane != null && plane.trackingState == TrackingState.TRACKING && plane.type == Plane.Type.HORIZONTAL_UPWARD_FACING &&
              plane.isPoseInPolygon(it.hitPose) && groundHitUsable(it.distance, camera.pose.ty() - it.hitPose.ty(), plane.extentX, plane.extentZ)
          }
          if (hit != null) {
            val forward = camera.pose.rotateVector(floatArrayOf(0f, 0f, -1f))
            val direction = groundArrowDirection(forward[0], forward[2], guide.bearing - guide.heading)
            if (direction != null) {
              anchor = hit.createAnchor(); anchorId = guide.id; anchorAt = elapsed
              localDirection = anchor!!.pose.inverse().rotateVector(direction)
            }
          }
        }
        val pinned = anchor
        if (pinned != null && pinned.trackingState == TrackingState.TRACKING) {
          gl.arrow(camera, pinned.pose, localDirection)
          state(view, "anchored", "Lokal retningspil · målets plassering er omtrentlig")
        } else state(view, "surface", "Beveg kameraet rolig over bakken foran deg")
      }
    }
    if (!EGL14.eglSwapBuffers(display, surface)) throw IllegalStateException("EGL swap failed")
  }
  private fun initEgl(texture: SurfaceTexture) {
    display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
    check(EGL14.eglInitialize(display, IntArray(2), 0, IntArray(2), 0))
    val configs = arrayOfNulls<EGLConfig>(1)
    val attributes = intArrayOf(EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT, EGL14.EGL_SURFACE_TYPE, EGL14.EGL_WINDOW_BIT,
      EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 8, EGL14.EGL_DEPTH_SIZE, 16, EGL14.EGL_NONE)
    val count = IntArray(1)
    check(EGL14.eglChooseConfig(display, attributes, 0, configs, 0, 1, count, 0) && count[0] > 0)
    context = EGL14.eglCreateContext(display, configs[0], EGL14.EGL_NO_CONTEXT, intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE), 0)
    check(context != EGL14.EGL_NO_CONTEXT)
    surface = EGL14.eglCreateWindowSurface(display, configs[0], texture, intArrayOf(EGL14.EGL_NONE), 0)
    check(surface != EGL14.EGL_NO_SURFACE)
    check(EGL14.eglMakeCurrent(display, surface, surface, context))
  }
  private fun release() {
    worker.removeCallbacks(draw)
    try { detachAnchor() } catch (_: Exception) { anchor = null; anchorId = null }
    try { session?.pause() } catch (_: Exception) { }
    try { session?.close() } catch (_: Exception) { }
    session = null
    renderer = null // GL resources die with the private EGL context below.
    if (display != EGL14.EGL_NO_DISPLAY) {
      EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
      if (surface != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(display, surface)
      if (context != EGL14.EGL_NO_CONTEXT) EGL14.eglDestroyContext(display, context)
      EGL14.eglTerminate(display)
    }
    display = EGL14.EGL_NO_DISPLAY; context = EGL14.EGL_NO_CONTEXT; surface = EGL14.EGL_NO_SURFACE
    owner = null; lastState = ""; trackingSince = 0; lastFrame = 0
  }
}

internal class GroundArRenderer {
  val texture: Int
  private val backgroundProgram: Int
  private val arrowProgram: Int
  private val quad = buffer(floatArrayOf(-1f,-1f, 1f,-1f, -1f,1f, 1f,1f))
  private val uv = buffer(FloatArray(8))
  private val projection = FloatArray(16)
  private val view = FloatArray(16)
  private val model = FloatArray(16)
  private val vp = FloatArray(16)
  private val mvp = FloatArray(16)
  private val arrow = buffer(floatArrayOf(
    -.09f,.018f,.28f, .09f,.018f,.28f, -.09f,.018f,-.1f,
    -.09f,.018f,-.1f, .09f,.018f,.28f, .09f,.018f,-.1f,
    -.26f,.018f,-.08f, .26f,.018f,-.08f, 0f,.018f,-.48f))
  private val ring = buffer((0..64).flatMap { i -> val a = i * Math.PI * 2 / 64; listOf((cos(a)*.55).toFloat(), .012f, (sin(a)*.55).toFloat()) }.toFloatArray())
  init {
    val names = IntArray(1); GLES20.glGenTextures(1, names, 0); texture = names[0]
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, texture)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    backgroundProgram = program("attribute vec2 a; attribute vec2 uv; varying vec2 t; void main(){gl_Position=vec4(a,0.,1.);t=uv;}",
      "#extension GL_OES_EGL_image_external : require\nprecision mediump float; uniform samplerExternalOES camera; varying vec2 t; void main(){gl_FragColor=texture2D(camera,t);}")
    arrowProgram = program("attribute vec3 a; uniform mat4 mvp; void main(){gl_Position=mvp*vec4(a,1.);}",
      "precision mediump float; uniform vec4 color; void main(){gl_FragColor=color;}")
  }
  fun background(frame: Frame) {
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
    GLES20.glDisable(GLES20.GL_DEPTH_TEST)
    GLES20.glUseProgram(backgroundProgram)
    quad.position(0); uv.position(0)
    frame.transformCoordinates2d(Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES, quad, Coordinates2d.TEXTURE_NORMALIZED, uv)
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, texture)
    GLES20.glUniform1i(GLES20.glGetUniformLocation(backgroundProgram, "camera"), 0)
    attribute(backgroundProgram, "a", quad, 2); attribute(backgroundProgram, "uv", uv, 2)
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    GLES20.glDisableVertexAttribArray(GLES20.glGetAttribLocation(backgroundProgram, "a"))
    GLES20.glDisableVertexAttribArray(GLES20.glGetAttribLocation(backgroundProgram, "uv"))
  }
  fun arrow(camera: Camera, pose: Pose, direction: FloatArray) {
    camera.getProjectionMatrix(projection, 0, .1f, 30f); camera.getViewMatrix(view, 0)
    pose.toMatrix(model, 0)
    // Matrix.rotateM's positive Y rotation sends -Z toward -X.
    Matrix.rotateM(model, 0, (-Math.toDegrees(atan2(direction[0].toDouble(), -direction[2].toDouble()))).toFloat(), 0f, 1f, 0f)
    Matrix.multiplyMM(vp, 0, projection, 0, view, 0); Matrix.multiplyMM(mvp, 0, vp, 0, model, 0)
    GLES20.glUseProgram(arrowProgram); GLES20.glEnable(GLES20.GL_DEPTH_TEST)
    GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(arrowProgram, "mvp"), 1, false, mvp, 0)
    val color = GLES20.glGetUniformLocation(arrowProgram, "color")
    GLES20.glUniform4f(color, .58f, .96f, .86f, 1f)
    attribute(arrowProgram, "a", arrow, 3); GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 9)
    GLES20.glUniform4f(color, .96f, .84f, .59f, 1f)
    GLES20.glLineWidth(3f); attribute(arrowProgram, "a", ring, 3); GLES20.glDrawArrays(GLES20.GL_LINE_STRIP, 0, 65)
  }
  private fun attribute(program: Int, name: String, data: FloatBuffer, size: Int) {
    val at = GLES20.glGetAttribLocation(program, name)
    data.position(0); GLES20.glVertexAttribPointer(at, size, GLES20.GL_FLOAT, false, 0, data); GLES20.glEnableVertexAttribArray(at)
  }
  private fun program(vertex: String, fragment: String): Int {
    fun shader(type: Int, source: String): Int {
      val id = GLES20.glCreateShader(type); GLES20.glShaderSource(id, source); GLES20.glCompileShader(id)
      val status = IntArray(1); GLES20.glGetShaderiv(id, GLES20.GL_COMPILE_STATUS, status, 0)
      check(status[0] != 0) { GLES20.glGetShaderInfoLog(id) }; return id
    }
    val v = shader(GLES20.GL_VERTEX_SHADER, vertex); val f = shader(GLES20.GL_FRAGMENT_SHADER, fragment)
    val id = GLES20.glCreateProgram(); GLES20.glAttachShader(id, v); GLES20.glAttachShader(id, f); GLES20.glLinkProgram(id)
    val status = IntArray(1); GLES20.glGetProgramiv(id, GLES20.GL_LINK_STATUS, status, 0)
    check(status[0] != 0) { GLES20.glGetProgramInfoLog(id) }
    GLES20.glDeleteShader(v); GLES20.glDeleteShader(f); return id
  }
}
private fun buffer(values: FloatArray): FloatBuffer = ByteBuffer.allocateDirect(values.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply { put(values); position(0) }
