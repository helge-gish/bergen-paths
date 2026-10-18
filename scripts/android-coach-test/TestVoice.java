package no.trakk.coachtest;
import android.speech.tts.*;
import android.media.AudioFormat;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
/** Test-only TTS sink. Captures exact requests without network/downloaded voices. */
public class TestVoice extends TextToSpeechService {
  public static final List<String> spoken = new CopyOnWriteArrayList<>();
  protected int onIsLanguageAvailable(String l,String c,String v) { return TextToSpeech.LANG_COUNTRY_AVAILABLE; }
  protected String[] onGetLanguage() { return new String[]{"nob","NOR",""}; }
  protected int onLoadLanguage(String l,String c,String v) { return TextToSpeech.LANG_COUNTRY_AVAILABLE; }
  protected void onStop() {}
  public List<Voice> onGetVoices() { return Collections.singletonList(new Voice("test-nb",Locale.forLanguageTag("nb-NO"),300,100,false,Collections.emptySet())); }
  public int onIsValidVoiceName(String n) { return TextToSpeech.SUCCESS; }
  public int onLoadVoice(String n) { return TextToSpeech.SUCCESS; }
  public String onGetDefaultVoiceNameFor(String l,String c,String v) { return "test-nb"; }
  protected void onSynthesizeText(SynthesisRequest req,SynthesisCallback cb) {
    spoken.add(req.getCharSequenceText().toString());
    cb.start(16000,AudioFormat.ENCODING_PCM_16BIT,1);byte[] data=new byte[1600];cb.audioAvailable(data,0,data.length);cb.done();
  }
}
