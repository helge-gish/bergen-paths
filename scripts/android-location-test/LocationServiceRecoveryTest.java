package expo.modules.location;

import android.app.Service;
import android.app.Notification;
import android.content.*;
import android.os.*;
import expo.modules.location.services.LocationTaskService;
import expo.modules.location.taskConsumers.LocationTaskConsumer;
import expo.modules.interfaces.taskManager.TaskInterface;
import java.lang.reflect.*;
import java.util.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.*;
import org.robolectric.shadows.ShadowService;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=28, manifest=Config.NONE, shadows=LocationServiceRecoveryTest.RejectableService.class)
public class LocationServiceRecoveryTest {
  @Implements(Service.class)
  public static class RejectableService extends ShadowService {
    static boolean reject;
    @Implementation protected void startForeground(int id, Notification notification) {
      if(reject)throw new SecurityException("Activity no longer eligible for location FGS");
      super.startForeground(id,notification);
    }
  }
  static class BindingContext extends ContextWrapper {
    ServiceConnection connection; LocationTaskService service; boolean failStart, bind=true; int starts,stops,unbounds;
    BindingContext(){super(RuntimeEnvironment.getApplication());service=Robolectric.buildService(LocationTaskService.class).create().get();}
    @Override public ComponentName startForegroundService(Intent i){throw new AssertionError("Must not arm the fatal FGS timeout before async binding");}
    @Override public ComponentName startService(Intent i){starts++;if(failStart)throw new IllegalStateException("App went to background");service.onStartCommand(i,0,1);return new ComponentName(this,LocationTaskService.class);}
    @Override public boolean bindService(Intent i,ServiceConnection c,int flags){connection=c;return bind;}
    @Override public void unbindService(ServiceConnection c){unbounds++;}
    @Override public boolean stopService(Intent i){stops++;return true;}
    void connect(){connection.onServiceConnected(new ComponentName(this,LocationTaskService.class),service.onBind(new Intent()));}
  }
  BindingContext context;LocationTaskConsumer consumer;String error;
  @Before public void setup() throws Exception {
    RejectableService.reject=false;AppForegroundedSingleton.INSTANCE.setForegrounded(true);
    context=new BindingContext();consumer=new LocationTaskConsumer(context,null);
    Map<String,Object> serviceOptions=new HashMap<>();serviceOptions.put("notificationTitle","Gatekampen");serviceOptions.put("notificationBody","Registrerer");
    Map<String,Object> options=new HashMap<>();options.put("foregroundService",serviceOptions);
    TaskInterface task=(TaskInterface)Proxy.newProxyInstance(getClass().getClassLoader(),new Class[]{TaskInterface.class},(p,m,a)->{
      switch(m.getName()) {case "getName":return "gatekampen-walking-v1";case "getAppScopeKey":return "gatekampen";case "getOptions":return options;case "execute":if(a[1]!=null)error=((Error)a[1]).getMessage();return null;default:return null;}
    });
    field("mTask").set(consumer,task);
  }
  Field field(String name)throws Exception{Field f=LocationTaskConsumer.class.getDeclaredField(name);f.setAccessible(true);return f;}
  void start()throws Exception{Method m=LocationTaskConsumer.class.getDeclaredMethod("maybeStartForegroundService");m.setAccessible(true);try{m.invoke(consumer);}catch(InvocationTargetException e){throw new AssertionError(e.getCause());}}
  @Test public void rejectedPromotionSurvivesAndCanRetry()throws Exception{
    start();RejectableService.reject=true;context.connect();assertNotNull(error);assertNull(field("mService").get(consumer));assertEquals(1,context.unbounds);assertEquals(1,context.stops);
    RejectableService.reject=false;error=null;start();context.connect();assertNotNull(field("mService").get(consumer));assertNull(error);assertEquals(2,context.starts);
  }
  @Test public void synchronousDenialAndNullBindingDoNotEscape()throws Exception{
    context.failStart=true;start();assertNotNull(error);assertNull(field("mServiceConnection").get(consumer));
    context.failStart=false;error=null;start();context.connection.onNullBinding(new ComponentName(context,LocationTaskService.class));assertNotNull(error);assertNull(field("mServiceConnection").get(consumer));
  }
  @Test public void duplicateStartDoesNotCreateTwoPendingBindingsAndStopDiscardsLateCallback()throws Exception{
    start();start();assertEquals(1,context.starts);ServiceConnection late=context.connection;
    Method m=LocationTaskConsumer.class.getDeclaredMethod("stopForegroundService");m.setAccessible(true);m.invoke(consumer);
    late.onServiceConnected(new ComponentName(context,LocationTaskService.class),context.service.onBind(new Intent()));assertNull(field("mService").get(consumer));
  }
  @Test public void serviceNotificationIsSafeBeforeStartCommandAndNullRestartIsNotSticky(){
    LocationTaskService service=Robolectric.buildService(LocationTaskService.class).create().get();Bundle options=new Bundle();options.putString("notificationTitle","Gatekampen");service.startForeground(options);
    assertEquals(Service.START_NOT_STICKY,service.onStartCommand(null,0,1));
  }
}
