package no.gatekampen.app;
import android.app.Application;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=28, application=Application.class)
public class LauncherManifestTest {
  @Test
  public void originalLauncherIconResolvesToIsolatedRecoveryProcess() {
    android.content.Context context=RuntimeEnvironment.getApplication();
    android.content.Intent launcher=new android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_LAUNCHER).setPackage(context.getPackageName());
    android.content.pm.ResolveInfo resolved=context.getPackageManager().resolveActivity(launcher,0);
    assertNotNull(resolved);
    assertEquals("no.gatekampen.app.MainActivity",resolved.activityInfo.name);
    assertEquals("no.gatekampen.app.GatekampenRecoveryActivity",resolved.activityInfo.targetActivity);
    assertTrue(resolved.activityInfo.processName.endsWith(":diagnostics"));
  }
}
