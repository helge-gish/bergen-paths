package no.trakk.coachtest;
import android.app.Instrumentation;
import android.os.*;
import android.content.Context;
import dalvik.system.PathClassLoader;
import org.json.*;
import java.lang.reflect.*;
import java.io.*;
public class Check extends Instrumentation {
  private Object coach; private Class<?> type; private JSONObject template; private String id="native-test";
  @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
  private Object call(String name,Class<?>[] types,Object...args) throws Exception {
    Method method=type.getDeclaredMethod(name,types);method.setAccessible(true);return method.invoke(coach,args);
  }
  private void configure(long elapsed,boolean running,boolean audio) throws Exception {
    JSONObject j=new JSONObject(template.toString());j.put("id",id);j.put("elapsedMs",elapsed);j.put("runningSince",System.currentTimeMillis());j.put("running",running);j.put("audio",audio);j.put("routeAudio",audio);j.put("voice","test-nb");
    final String raw=j.toString();runOnMainSync(()->{try{call("configure",new Class[]{Context.class,String.class},getContext(),raw);}catch(Exception e){throw new RuntimeException(e);}});
  }
  private void stopCoach() { runOnMainSync(()->{try{call("configure",new Class[]{Context.class,String.class},getContext(),null);}catch(Exception e){throw new RuntimeException(e);}}); }
  private java.util.List<String> spoken() {
    try { JSONArray values=new JSONArray(getContext().getSharedPreferences("tts-spoken",0).getString("lines","[]"));java.util.List<String> lines=new java.util.ArrayList<>();for(int i=0;i<values.length();i++)lines.add(values.getString(i));return lines; } catch(Exception e) { throw new RuntimeException(e); }
  }
  private String debug() {
    try { Field ready=type.getDeclaredField("ready");ready.setAccessible(true);return " ready="+ready.get(coach)+" error="+call("getError",new Class[]{})+" elapsed="+call("elapsed",new Class[]{}); }catch(Exception e){return e.toString();}
  }
  private void check(boolean ok,String message) { if(!ok)throw new AssertionError(message+debug()+" spoken="+spoken()); }
  @Override public void onStart() {
    Bundle result=new Bundle();
    try {
      String apk=getContext().getPackageManager().getApplicationInfo("no.trakk.app",0).sourceDir;
      type=Class.forName("no.trakk.coach.Coach",true,new PathClassLoader(apk,getContext().getClassLoader()));
      Field field=type.getDeclaredField("INSTANCE");field.setAccessible(true);coach=field.get(null);
      ParcelFileDescriptor plan=getUiAutomation().executeShellCommand("cat /sdcard/trakk-coach-plan.json");
      ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream input=new ParcelFileDescriptor.AutoCloseInputStream(plan)){byte[] buf=new byte[4096];int n;while((n=input.read(buf))!=-1)bytes.write(buf,0,n);}
      template=new JSONObject(bytes.toString("UTF-8"));
      getContext().getSharedPreferences("tts-spoken",0).edit().clear().commit();
      getContext().getSharedPreferences("trakk-coach",0).edit().clear().commit();
      configure(295000,true,true);SystemClock.sleep(2000);
      runOnMainSync(()->{try{call("offer",new Class[]{String.class,String.class},"Du ligger 12 sekunder foran skyggen.","ghost");}catch(Exception e){throw new RuntimeException(e);}});
      getUiAutomation().executeShellCommand("input keyevent 223").close();SystemClock.sleep(6000);
      check(spoken().stream().anyMatch(s->s.contains("Runde 1 av fire")&&s.contains("12 sekunder foran")),"Expected single combined transition + ghost while locked");
      int count=spoken().size();configure(310000,false,true);SystemClock.sleep(2000);
      check(spoken().size()==count,"Pause must silence trainer");
      long elapsed=(Long)call("elapsed",new Class[]{});check(elapsed==310000,"Paused native clock moved");
      configure(538000,true,false);SystemClock.sleep(4000);
      check(spoken().size()==count,"Muted transition spoke");
      configure(543000,true,true);SystemClock.sleep(1000);
      check(spoken().size()==count+1&&spoken().get(count).contains("Rolig gange"),"Unmute must give current phase once");
      stopCoach();count=spoken().size();SystemClock.sleep(1000);
      check(!(Boolean)call("offer",new Class[]{String.class,String.class},"old ghost","ghost"),"Stopped trainer retained route audio");
      check(spoken().size()==count,"Stop leaked audio");
      configure(543000,true,true);SystemClock.sleep(1500);
      check(spoken().size()==count,"Recreation replayed consumed cue");stopCoach();
      id="complete-test";configure(2098000,true,true);SystemClock.sleep(4000);
      check(spoken().stream().filter(s->s.contains("fire ganger fire fullført")).count()==1,"Completion cue missing/duplicated");
      Field wake=type.getDeclaredField("wake");wake.setAccessible(true);check(wake.get(coach)==null,"Completion retained wakelock");
      stopCoach();
      result.putString("result","PASS: final APK native clock, locked screen, combined ghost+transition, pause, mute, resume, stop, completion, wakelock release and durable cue cursor");
      result.putString("spoken",spoken().toString());finish(-1,result);
    } catch(Throwable e) { result.putString("error",e.toString());result.putString("spoken",spoken().toString());finish(0,result); }
    finally { if(coach!=null)stopCoach();try{getUiAutomation().executeShellCommand("input keyevent 224").close();}catch(Exception ignored){} }
  }
}
