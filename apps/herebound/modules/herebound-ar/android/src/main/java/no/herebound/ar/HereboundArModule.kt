package no.herebound.ar

import android.content.Context
import android.graphics.SurfaceTexture
import android.view.TextureView
import android.view.MotionEvent
import android.view.ViewGroup
import com.google.ar.core.ArCoreApk
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import java.util.Collections
import java.util.WeakHashMap

class HereboundArModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HereboundAr")
    AsyncFunction("availability") {
      val context = appContext.reactContext
      if (context == null) "unsupported" else when (ArCoreApk.getInstance().checkAvailability(context)) {
        ArCoreApk.Availability.SUPPORTED_INSTALLED -> "ready"
        ArCoreApk.Availability.SUPPORTED_NOT_INSTALLED, ArCoreApk.Availability.SUPPORTED_APK_TOO_OLD -> "install"
        ArCoreApk.Availability.UNKNOWN_CHECKING, ArCoreApk.Availability.UNKNOWN_TIMED_OUT -> "checking"
        else -> "unsupported"
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("install") {
      val activity = appContext.currentActivity
      if (activity == null) false else try {
        ArCoreApk.getInstance().requestInstall(activity, true) == ArCoreApk.InstallStatus.INSTALLED
      } catch (_: Exception) { false }
    }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { HereboundArView.setForeground(false) }
    OnActivityEntersForeground { HereboundArView.setForeground(true) }
    OnDestroy { HereboundArView.setForeground(false) }
    View(HereboundArView::class) {
      Events("onState", "onInteract", "onTarget")
      Prop("active") { view: HereboundArView, value: Boolean -> view.cameraRequested = value }
      Prop("scene") { view: HereboundArView, value: Map<String, Any?>? ->
        view.sceneId = value?.get("id") as? String
        view.modelKind = value?.get("kind") as? String ?: "lantern"
        view.lit = value?.get("lit") as? Boolean ?: false
      }
      Prop("placement") { view: HereboundArView, value: Int -> view.placement = value }
      OnViewDidUpdateProps { view: HereboundArView -> view.update() }
      OnViewDestroys { view: HereboundArView -> view.destroy() }
    }
  }
}

/** TextureView keeps camera pixels in the normal view hierarchy, including
 * rounded corners and React Native overlays. Only ARCore owns this camera. */
class HereboundArView(context: Context, appContext: AppContext) : ExpoView(context, appContext), TextureView.SurfaceTextureListener {
  companion object {
    private val views = Collections.newSetFromMap(WeakHashMap<HereboundArView, Boolean>())
    private var appForeground = true
    fun setForeground(value: Boolean) { appForeground = value; views.toList().forEach { it.update() } }
  }
  val onState by EventDispatcher()
  val onInteract by EventDispatcher()
  val onTarget by EventDispatcher()
  @Volatile internal var sceneId: String? = null
  @Volatile internal var modelKind = "lantern"
  @Volatile internal var lit = false
  @Volatile internal var placement = 0
  @Volatile internal var touchX = -1f
  @Volatile internal var touchY = -1f
  var cameraRequested = false
  @Volatile internal var failed = false
  @Volatile internal var pixelWidth = 0
  @Volatile internal var pixelHeight = 0
  @Volatile internal var rotation = 0
  private var attached = false
  private var disposed = false
  private val preview = TextureView(context).apply { surfaceTextureListener = this@HereboundArView }
  init {
    preview.setOnTouchListener { _, event ->
      if (event.action == MotionEvent.ACTION_UP) { touchX = event.x; touchY = event.y; true } else true
    }
    views.add(this); addView(preview, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)) }
  internal fun interact(id: String) { post { if (!disposed && attached) onInteract(mapOf("id" to id)) } }
  internal fun target(id: String, x: Float, y: Float, visible: Boolean) {
    post { if (!disposed && attached) onTarget(mapOf("id" to id, "x" to x, "y" to y, "visible" to visible)) }
  }
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    measureChild(preview, widthMeasureSpec, heightMeasureSpec)
    setMeasuredDimension(ViewGroup.resolveSize(preview.measuredWidth, widthMeasureSpec), ViewGroup.resolveSize(preview.measuredHeight, heightMeasureSpec))
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    preview.layout(0, 0, right - left, bottom - top)
  }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); attached = true; update() }
  override fun onDetachedFromWindow() { attached = false; HereboundArEngine.stop(this); super.onDetachedFromWindow() }
  fun update() {
    if (disposed) return
    if (attached && cameraRequested && appForeground && !failed && preview.isAvailable) {
      rotation = display?.rotation ?: 0
      preview.surfaceTexture?.let { HereboundArEngine.start(this, it) }
    } else HereboundArEngine.stop(this)
  }
  fun destroy() { disposed = true; views.remove(this); HereboundArEngine.stop(this) }
  internal fun report(state: String, reason: String = "", ready: Boolean = true, targetId: String? = null) {
    post { if (!disposed && attached) onState(mapOf("state" to state, "reason" to reason, "ready" to ready, "targetId" to (targetId ?: ""))) }
  }
  override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) { pixelWidth = width; pixelHeight = height; update() }
  override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) { pixelWidth = width; pixelHeight = height; rotation = display?.rotation ?: 0 }
  override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
    // Release the texture only after its EGL producer and AR camera have stopped.
    HereboundArEngine.stop(this, surface); return false
  }
  override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit
}
