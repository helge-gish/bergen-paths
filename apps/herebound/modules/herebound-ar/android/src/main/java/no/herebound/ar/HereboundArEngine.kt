package no.herebound.ar

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
internal object HereboundArEngine {
  private val thread = HandlerThread("HereboundAr").apply { start() }
  private val worker = Handler(thread.looper)
  private var owner: HereboundArView? = null
  private var session: Session? = null
  private var display: EGLDisplay = EGL14.EGL_NO_DISPLAY
  private var context: EGLContext = EGL14.EGL_NO_CONTEXT
  private var surface: EGLSurface = EGL14.EGL_NO_SURFACE
  private var renderer: HereboundArRenderer? = null
  private var anchor: Anchor? = null
  private var anchorId: String? = null
  private var anchorAt = 0L
  private var lastPlacement = -1
  private var placementFailed = false
  private var lastAutoTry = 0L
  private var trackingSince = 0L
  private var lastState = ""
  private var lastFrame = 0L
  private var lastFrameAt = 0L
  private var lastTargetAt = 0L
  private val draw = object : Runnable {
    override fun run() {
      val view = owner ?: return
      try { frame(view) } catch (_: Exception) { fail(view, "Kamerasporingen stoppet. Prøv å åpne kameraet igjen."); return }
      if (owner === view) worker.postDelayed(this, 16)
    }
  }
  fun start(view: HereboundArView, texture: SurfaceTexture) { worker.post {
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
      renderer = HereboundArRenderer()
      ar.setCameraTextureName(renderer!!.texture)
      ar.resume()
      lastPlacement = view.placement
      lastFrameAt = SystemClock.elapsedRealtime()
      worker.post(draw)
    } catch (_: Exception) { fail(view, "Bakkeankre kunne ikke startes. Prøv å åpne kameraet igjen.") }
  } }
  fun stop(view: HereboundArView, texture: SurfaceTexture? = null) { worker.post {
    if (owner === view) release()
    texture?.release()
  } }
  private fun state(view: HereboundArView, value: String, reason: String = "") {
    val key = "$value:$reason:$anchorId"
    if (key != lastState) { lastState = key; view.report(value, reason, targetId = anchorId) }
  }
  private fun fail(view: HereboundArView, reason: String) {
    view.failed = true
    release() // Camera is released before JS can mount its fallback preview.
    view.report("unavailable", reason, false)
  }
  private fun detachAnchor() { anchor?.detach(); anchor = null; anchorId = null; renderer?.resetActor(); lastTargetAt = 0L; placementFailed = false; lastAutoTry = 0L }
  private fun frame(view: HereboundArView) {
    val ar = session ?: return
    val gl = renderer ?: return
    val w = view.pixelWidth; val h = view.pixelHeight
    if (w <= 0 || h <= 0) return
    ar.setDisplayGeometry(view.rotation, w, h)
    GLES20.glViewport(0, 0, w, h)
    val frame = ar.update()
    val elapsed = SystemClock.elapsedRealtime()
    if (frame.timestamp != 0L && frame.timestamp != lastFrame) { lastFrame = frame.timestamp; lastFrameAt = elapsed }
    if (elapsed - lastFrameAt > 7000) { fail(view, "AR-kameraet svarte ikke. Prøv å åpne kameraet igjen."); return }
    if (frame.timestamp == 0L) return
    gl.background(frame)
    val camera = frame.camera
    val sceneId = view.sceneId
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
      if (sceneId == null) { detachAnchor(); state(view, "tracking", "Velg et møte i nærheten") }
      else {
        val held = anchor
        if (held != null) {
          val p = held.pose.translation; val c = camera.pose.translation
          val distance = sqrt(p.indices.sumOf { (p[it] - c[it]).toDouble().pow(2) }).toFloat()
          if (anchorId != sceneId || held.trackingState == TrackingState.STOPPED || distance > 10f) detachAnchor()
        }
        val requested = view.placement != lastPlacement
        if (requested) { lastPlacement = view.placement; detachAnchor() }
        // Nearby encounters are already gated by fresh host GPS. Once camera
        // tracking is stable, discover a ground surface without an extra tap.
        if (ArFraming.shouldAutoPlace(anchor != null, trackingSince, elapsed, lastAutoTry)) {
          lastAutoTry = elapsed
          val hits = frame.hitTest(w * .5f, h * .58f)
          val hit = hits.firstOrNull {
            val plane = it.trackable as? Plane
            plane != null && plane.trackingState == TrackingState.TRACKING && plane.type == Plane.Type.HORIZONTAL_UPWARD_FACING &&
              plane.isPoseInPolygon(it.hitPose) && it.distance in 1.2f..5f
          }
          placementFailed = hit == null
          if (hit != null) { anchor = hit.createAnchor(); anchorId = sceneId; anchorAt = elapsed }
        }
        val pinned = anchor
        if (pinned != null && pinned.trackingState == TrackingState.TRACKING) {
          val bounds = gl.actor(camera, pinned.pose, view.modelKind, view.lit, elapsed)
          state(view, "anchored", "Funnet er plassert")
          if (elapsed - lastTargetAt >= 150) {
            lastTargetAt = elapsed
            val x = bounds?.let { ((it.left+it.right)/2+1)/2 } ?: .5f
            val y = bounds?.let { (1-it.top)/2 } ?: .5f
            view.target(sceneId, x.coerceIn(0f,1f), y.coerceIn(0f,1f), bounds?.visible == true)
          }
          if (view.touchX >= 0) {
            val x = view.touchX; val y = view.touchY; view.touchX = -1f; view.touchY = -1f
            if (gl.hit(x / w * 2 - 1, 1 - y / h * 2)) view.interact(sceneId)
          }
        } else { view.touchX = -1f; state(view, "surface", if (placementFailed) "Finner bakken … pek rolig litt lenger frem" else "Pek mot bakken · funnet dukker opp automatisk") }
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

internal class HereboundArRenderer {
  val texture: Int
  private val backgroundProgram: Int
  private val actorProgram: Int
  private val quad = buffer(floatArrayOf(-1f,-1f, 1f,-1f, -1f,1f, 1f,1f))
  private val uv = buffer(FloatArray(8))
  private val projection = FloatArray(16)
  private val view = FloatArray(16)
  private val model = FloatArray(16)
  private val vp = FloatArray(16)
  private val mvp = FloatArray(16)
  private val cube = buffer(floatArrayOf(-0.5f,-0.5f,0.5f,0.5f,-0.5f,0.5f,0.5f,0.5f,0.5f,-0.5f,-0.5f,0.5f,0.5f,0.5f,0.5f,-0.5f,0.5f,0.5f,0.5f,-0.5f,-0.5f,-0.5f,-0.5f,-0.5f,-0.5f,0.5f,-0.5f,0.5f,-0.5f,-0.5f,-0.5f,0.5f,-0.5f,0.5f,0.5f,-0.5f,-0.5f,-0.5f,-0.5f,-0.5f,-0.5f,0.5f,-0.5f,0.5f,0.5f,-0.5f,-0.5f,-0.5f,-0.5f,0.5f,0.5f,-0.5f,0.5f,-0.5f,0.5f,-0.5f,0.5f,0.5f,-0.5f,-0.5f,0.5f,0.5f,-0.5f,0.5f,-0.5f,0.5f,0.5f,0.5f,-0.5f,0.5f,0.5f,0.5f,-0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,-0.5f,-0.5f,0.5f,0.5f,0.5f,0.5f,-0.5f,-0.5f,0.5f,-0.5f,-0.5f,-0.5f,-0.5f,0.5f,-0.5f,-0.5f,0.5f,-0.5f,0.5f,-0.5f,-0.5f,-0.5f,0.5f,-0.5f,0.5f,-0.5f,-0.5f,0.5f))
  init {
    val names = IntArray(1); GLES20.glGenTextures(1, names, 0); texture = names[0]
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, texture)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    backgroundProgram = program("attribute vec2 a; attribute vec2 uv; varying vec2 t; void main(){gl_Position=vec4(a,0.,1.);t=uv;}",
      "#extension GL_OES_EGL_image_external : require\nprecision mediump float; uniform samplerExternalOES camera; varying vec2 t; void main(){gl_FragColor=texture2D(camera,t);}")
    actorProgram = program("attribute vec3 a; uniform mat4 mvp; void main(){gl_Position=mvp*vec4(a,1.);}",
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
  private var hitBounds: ArFraming.Rect? = null
  private var fittedScale: Float? = null
  fun resetActor() { hitBounds = null; fittedScale = null }
  fun hit(x: Float, y: Float) = hitBounds?.hit(x,y) == true
  fun actor(camera: Camera, pose: Pose, kind: String, lit: Boolean, elapsed: Long): ArFraming.Rect? {
    camera.getProjectionMatrix(projection, 0, .1f, 30f); camera.getViewMatrix(view, 0)
    pose.toMatrix(model, 0)
    if (kind == "sprite" || kind == "merchant") {
      val facing = pose.inverse().transformPoint(camera.pose.translation)
      Matrix.rotateM(model,0,Math.toDegrees(atan2(facing[0].toDouble(),facing[2].toDouble())).toFloat(),0f,1f,0f)
    }
    Matrix.multiplyMM(vp, 0, projection, 0, view, 0)
    Matrix.multiplyMM(mvp,0,vp,0,model,0)
    val scale = fittedScale ?: ArFraming.fittedScale(mvp,kind).also { fittedScale = it }
    val bounds = ArFraming.project(mvp,kind,scale)
    // Do not fill the camera with clipped geometry if the player walks into it.
    hitBounds = bounds?.takeIf { it.visible && it.width <= 1.4f && it.height <= 1.4f }
    if (hitBounds == null || scale <= .001f) return null
    Matrix.scaleM(model,0,scale,scale,scale)
    GLES20.glUseProgram(actorProgram); GLES20.glEnable(GLES20.GL_DEPTH_TEST)
    val color = GLES20.glGetUniformLocation(actorProgram, "color")
    fun block(x: Float, y: Float, z: Float, sx: Float, sy: Float, sz: Float, r: Float, g: Float, b: Float) {
      val local = model.copyOf(); Matrix.translateM(local, 0, x, y, z); Matrix.scaleM(local, 0, sx, sy, sz)
      Matrix.multiplyMM(mvp, 0, vp, 0, local, 0)
      GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(actorProgram, "mvp"), 1, false, mvp, 0)
      GLES20.glUniform4f(color,r,g,b,1f); attribute(actorProgram,"a",cube,3); GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,36)
    }
    val glow = (.85 + .15 * sin(elapsed / 500.0)).toFloat()
    if (kind == "satchel") {
      block(0f,.3f,0f,.48f,.55f,.25f,.49f,.31f,.17f)
      block(0f,.58f,0f,.58f,.17f,.28f,.62f,.65f,.44f)
      block(-.16f,.35f,.14f,.05f,.4f,.03f,.8f,.65f,.4f)
      block(.16f,.35f,.14f,.05f,.4f,.03f,.8f,.65f,.4f)
      block(0f,.25f,.17f,.3f,.2f,.09f,.65f,.43f,.24f)
    } else if (kind == "berries") {
      block(0f,.34f,0f,.05f,.65f,.05f,.34f,.42f,.19f)
      for(i in 0..5) { val angle=i*Math.PI/3; block((cos(angle)*.18).toFloat(),.62f+(i%2)*.08f,(sin(angle)*.18).toFloat(),.14f,.14f,.14f,.85f,.17f,.09f) }
      block(.22f,.4f,0f,.4f,.05f,.2f,.35f,.53f,.18f)
    } else if (kind == "lantern") {
      block(0f,.06f,0f,.45f,.12f,.45f,.22f,.25f,.24f)
      block(0f,.44f,0f,.24f,.64f,.24f,.27f,.30f,.26f)
      block(0f,.54f,0f,.31f,.34f,.31f,if(lit) glow else .25f,if(lit) .72f*glow else .32f,if(lit) .25f else .31f)
      block(0f,.79f,0f,.45f,.12f,.45f,.18f,.22f,.19f)
    } else if (kind == "merchant") {
      block(0f,.75f,0f,.45f,.8f,.3f,.32f,.24f,.42f)
      block(0f,1.3f,0f,.32f,.32f,.32f,.77f,.59f,.43f)
      block(0f,1.5f,0f,.6f,.1f,.5f,.25f,.18f,.31f)
      block(0f,.45f,.3f,1.1f,.13f,.6f,.42f,.28f,.15f)
      block(-.28f,.59f,.3f,.15f,.16f,.15f,.65f,.21f,.14f)
      block(.25f,.59f,.3f,.17f,.17f,.17f,.8f,.76f,.54f)
    } else {
      val bounce = (.015 * sin(elapsed / 350.0)).toFloat()
      block(0f,.27f+bounce,0f,.4f,.46f,.28f,.42f,.35f,.19f)
      block(0f,.57f+bounce,0f,.46f,.31f,.36f,.32f,.48f,.25f)
      block(-.12f,.61f+bounce,.19f,.07f,.08f,.03f,.94f,.9f,.68f)
      block(.12f,.61f+bounce,.19f,.07f,.08f,.03f,.94f,.9f,.68f)
      block(.07f,.79f+bounce,0f,.14f,.16f,.08f,.44f,.62f,.24f)
    }
    return hitBounds
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
