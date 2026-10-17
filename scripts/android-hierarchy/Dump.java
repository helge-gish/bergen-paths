package no.trakk.hierarchy;
import android.app.Instrumentation;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Rect;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Base64;
import android.util.Xml;
import org.xmlpull.v1.XmlSerializer;
import java.io.StringWriter;
public class Dump extends Instrumentation {
  @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
  @Override public void onStart() {
    Bundle result = new Bundle();
    try {
      AccessibilityNodeInfo root = getUiAutomation().getRootInActiveWindow();
      if (root == null) throw new IllegalStateException("No active window");
      StringWriter out = new StringWriter();
      XmlSerializer xml = Xml.newSerializer();
      xml.setOutput(out); xml.startDocument("UTF-8", true); xml.startTag("", "hierarchy");
      writeNode(xml, root); xml.endTag("", "hierarchy"); xml.endDocument();
      result.putString("hierarchy", Base64.encodeToString(out.toString().getBytes("UTF-8"), Base64.NO_WRAP));
      finish(Activity.RESULT_OK, result);
    } catch (Exception e) { result.putString("error", e.toString()); finish(Activity.RESULT_CANCELED, result); }
  }
  private void writeNode(XmlSerializer xml, AccessibilityNodeInfo node) throws Exception {
    if (!node.isVisibleToUser()) return;
    xml.startTag("", "node");
    xml.attribute("", "text", node.getText() == null ? "" : node.getText().toString());
    xml.attribute("", "content-desc", node.getContentDescription() == null ? "" : node.getContentDescription().toString());
    Rect r = new Rect(); node.getBoundsInScreen(r);
    xml.attribute("", "bounds", "["+r.left+","+r.top+"]["+r.right+","+r.bottom+"]");
    for (int i=0; i<node.getChildCount(); i++) { AccessibilityNodeInfo child=node.getChild(i); if(child!=null) writeNode(xml, child); }
    xml.endTag("", "node");
  }
}
