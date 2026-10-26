package no.gatekampen.app;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.Button;
import android.view.View;
import android.view.ViewGroup;
import java.io.File;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=28, application=Application.class, manifest=Config.NONE)
public class StartupRecoveryTest {
  Context context; GatekampenDiagnostics diagnostics=GatekampenDiagnostics.INSTANCE;
  @Before public void setup() {
    context=RuntimeEnvironment.getApplication();
    context.getSharedPreferences("GatekampenRecovery",0).edit().clear().commit();
    context.getSharedPreferences("TaskManagerModule",0).edit().clear().commit();
    File folder=new File(context.getNoBackupFilesDir(),"gatekampen-diagnostics");
    File[] files=folder.listFiles();if(files!=null)for(File f:files)f.delete();
  }
  @Test public void retiresOnlyLegacyTaskOnceAndNeverTouchesWalkDatabase()throws Exception {
    SharedPreferences prefs=context.getSharedPreferences("TaskManagerModule",0);
    String legacy="{\"appUrl\":\"app\",\"tasks\":{\"gatekampen-walking-v1\":{\"consumerClass\":\"LocationTaskConsumer\"},\"other\":{\"keep\":true}}}";
    prefs.edit().putString("scope",legacy).putString("unrelated","untouched").commit();
    File db=context.getDatabasePath("gatekampen-v1.db");db.getParentFile().mkdirs();Files.write(db.toPath(),new byte[]{1,2,3});
    diagnostics.retireLegacyTask(context);
    JSONObject tasks=new JSONObject(prefs.getString("scope","")).getJSONObject("tasks");assertFalse(tasks.has("gatekampen-walking-v1"));assertTrue(tasks.has("other"));assertEquals("untouched",prefs.getString("unrelated",""));assertArrayEquals(new byte[]{1,2,3},Files.readAllBytes(db.toPath()));
    prefs.edit().putString("scope",legacy).commit();diagnostics.retireLegacyTask(context);assertEquals(legacy,prefs.getString("scope",""));
  }
  @Test public void crashCaptureDelegatesToAndroidAndNextOpenShowsReport()throws Exception {
    Thread.UncaughtExceptionHandler original=Thread.getDefaultUncaughtExceptionHandler();AtomicReference<Throwable> received=new AtomicReference<>();
    try {
      diagnostics.acknowledge(context);assertFalse(diagnostics.needsRecovery(context));
      Thread.setDefaultUncaughtExceptionHandler((t,e)->received.set(e));diagnostics.install(context);
      RuntimeException crash=new RuntimeException("test native startup failure");Thread.getDefaultUncaughtExceptionHandler().uncaughtException(Thread.currentThread(),crash);
      assertSame(crash,received.get());assertTrue(diagnostics.needsRecovery(context));assertTrue(diagnostics.report(context).contains("test native startup failure"));
      diagnostics.acknowledge(context);assertFalse(diagnostics.needsRecovery(context));
      diagnostics.record(context,new IllegalStateException("second crash"));assertTrue(diagnostics.needsRecovery(context));
    } finally {Thread.setDefaultUncaughtExceptionHandler(original);}
  }
  @Test public void recoveryActivityDisplaysFailureWithoutStartingReact() {
    diagnostics.record(context,new IllegalStateException("visible diagnostic"));
    GatekampenRecoveryActivity activity=Robolectric.buildActivity(GatekampenRecoveryActivity.class).setup().get();
    assertNull(shadowOf(activity).getNextStartedActivity());
    assertNotNull(findButton(activity.getWindow().getDecorView(),"Kopier feilrapport"));
    assertNotNull(findButton(activity.getWindow().getDecorView(),"Åpne Gatekampen"));
  }
  @Test public void firstLaunchExplainsTestAndReportIsBounded() {
    assertTrue(diagnostics.needsRecovery(context));
    diagnostics.record(context,new RuntimeException(new String(new char[50000]).replace('\0','a')));
    assertTrue(diagnostics.report(context).length()<=24000);
  }
  private Button findButton(View view,String title){if(view instanceof Button&&title.contentEquals(((Button)view).getText()))return (Button)view;if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){Button found=findButton(group.getChildAt(i),title);if(found!=null)return found;}}return null;}
}
