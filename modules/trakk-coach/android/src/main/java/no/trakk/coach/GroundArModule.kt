package no.trakk.coach

import android.content.Context
import android.graphics.SurfaceTexture
import android.view.TextureView
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

class GroundArModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TrakkGroundAr")
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
    OnActivityEntersBackground { GroundArView.setForeground(false) }
    OnActivityEntersForeground { GroundArView.setForeground(true) }
    OnDestroy { GroundArView.setForeground(false) }
    View(GroundArView::class) {
      Events("onState")
      Prop("active") { view: GroundArView, value: Boolean -> view.cameraRequested = value }
      Prop("guide") { view: GroundArView, value: Map<String, Any?>? ->
        view.guide = value?.let {
          val id = it["id"] as? String
          val bearing = (it["bearing"] as? Number)?.toDouble()
          val heading = (it["heading"] as? Number)?.toDouble()
          val until = (it["validUntil"] as? Number)?.toDouble()
          if (id != null && bearing != null && heading != null && until != null) GroundGuide(id, bearing, heading, until) else null
        }
      }
      OnViewDidUpdateProps { view: GroundArView -> view.update() }
      OnViewDestroys { view: GroundArView -> view.destroy() }
    }
  }
}

/** TextureView keeps camera pixels in the normal view hierarchy, including
 * rounded corners and React Native overlays. Only ARCore owns this camera. */
class GroundArView(context: Context, appContext: AppContext) : ExpoView(context, appContext), TextureView.SurfaceTextureListener {
  companion object {
    private val views = Collections.newSetFromMap(WeakHashMap<GroundArView, Boolean>())
    private var appForeground = true
    fun setForeground(value: Boolean) { appForeground = value; views.toList().forEach { it.update() } }
  }
  val onState by EventDispatcher()
  @Volatile internal var guide: GroundGuide? = null
  var cameraRequested = false
  @Volatile internal var failed = false
  @Volatile internal var pixelWidth = 0
  @Volatile internal var pixelHeight = 0
  @Volatile internal var rotation = 0
  private var attached = false
  private var disposed = false
  private val preview = TextureView(context).apply { surfaceTextureListener = this@GroundArView }
  init { views.add(this); addView(preview, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)) }
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    measureChild(preview, widthMeasureSpec, heightMeasureSpec)
    setMeasuredDimension(ViewGroup.resolveSize(preview.measuredWidth, widthMeasureSpec), ViewGroup.resolveSize(preview.measuredHeight, heightMeasureSpec))
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    preview.layout(0, 0, right - left, bottom - top)
  }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); attached = true; update() }
  override fun onDetachedFromWindow() { attached = false; GroundArEngine.stop(this); super.onDetachedFromWindow() }
  fun update() {
    if (disposed) return
    if (attached && cameraRequested && appForeground && !failed && preview.isAvailable) {
      rotation = display?.rotation ?: 0
      preview.surfaceTexture?.let { GroundArEngine.start(this, it) }
    } else GroundArEngine.stop(this)
  }
  fun destroy() { disposed = true; views.remove(this); GroundArEngine.stop(this) }
  internal fun report(state: String, reason: String = "", ready: Boolean = true, targetId: String? = null) {
    post { if (!disposed && attached) onState(mapOf("state" to state, "reason" to reason, "ready" to ready, "targetId" to (targetId ?: ""))) }
  }
  override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) { pixelWidth = width; pixelHeight = height; update() }
  override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) { pixelWidth = width; pixelHeight = height; rotation = display?.rotation ?: 0 }
  override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
    // Release the texture only after its EGL producer and AR camera have stopped.
    GroundArEngine.stop(this, surface); return false
  }
  override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit
}
