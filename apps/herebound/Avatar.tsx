import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { Appearance, Item, Skin } from '../../packages/herebound-sdk';

const palettes = {
  base: { cloth:'#667f75', light:'#afbf9f', shade:'#263f38', lining:'#243b38', trim:'#d6b875', glow:'#a9d8c0' },
  forest: { cloth:'#357969', light:'#8bb997', shade:'#133f37', lining:'#163d31', trim:'#d6c58a', glow:'#b6efb5' },
  storm: { cloth:'#385b80', light:'#8fafc2', shade:'#202c4c', lining:'#1b2440', trim:'#c6dce0', glow:'#bce8ff' },
  ember: { cloth:'#a45538', light:'#e0a264', shade:'#592d38', lining:'#402731', trim:'#f5ce81', glow:'#ffdc98' },
};
/** Layered character presentation. Equipment and skins come from saved ownership,
 * never from a second inventory. This illustration is the first avatar renderer. */
export function Avatar({ appearance, skin, equipment = [], animated = true, height = 420 }: { appearance: Appearance; skin?: Skin | null; equipment?: Item[]; animated?: boolean; height?: number }) {
  const [motion, setMotion] = useState(false), [active, setActive] = useState(AppState.currentState !== 'background');
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => { let alive=true; void AccessibilityInfo.isReduceMotionEnabled().then(reduce=>{if(alive)setMotion(!reduce);}); const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',reduce=>setMotion(!reduce)); const app=AppState.addEventListener('change',s=>setActive(s==='active'));return()=>{alive=false;sub.remove();app.remove();}; },[]);
  useEffect(()=>{if(!motion || !animated || !active)return; const loop=Animated.loop(Animated.sequence([Animated.timing(breath,{toValue:1,duration:2400,useNativeDriver:true}),Animated.timing(breath,{toValue:0,duration:2400,useNativeDriver:true})]));loop.start();return()=>{loop.stop();breath.setValue(0);};},[motion,animated,active]);
  const p=palettes[skin?.style ?? 'base'], woman=appearance.body==='woman';
  const skinTone={light:['#f0c9a5','#c38c71'],warm:['#cf936a','#975b43'],deep:['#84533d','#503328']}[appearance.skin];
  const hair={dark:['#28302f','#4b5046'],copper:['#793f2c','#be7950'],silver:['#aebdc0','#e5e4ce']}[appearance.hair];
  const staff=equipment.some(i=>i.wearable?.visual==='staff'), bag=equipment.some(i=>i.wearable?.visual==='satchel'), charm=equipment.some(i=>i.wearable?.visual==='lantern');
  return <View style={{height,overflow:'hidden'}} accessibilityLabel={`${woman?'Kvinne':'Mann'}, ${skin?.name ?? 'Vandrer'}, ${equipment.map(i=>i.name).join(', ') || 'uten ekstra utstyr'}`} accessible>
    <Animated.View style={{flex:1,transform:[{translateY:breath.interpolate({inputRange:[0,1],outputRange:[0,-3]})}]}}>
    <Svg width="100%" height="100%" viewBox="0 0 340 440">
      <Defs>
        <LinearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={p.light}/><Stop offset=".3" stopColor={p.cloth}/><Stop offset="1" stopColor={p.shade}/></LinearGradient>
        <LinearGradient id="face" x1="0" y1="0" x2="1" y2=".6"><Stop offset="0" stopColor={skinTone[0]}/><Stop offset="1" stopColor={skinTone[1]}/></LinearGradient>
        <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#fff0bf"/><Stop offset=".45" stopColor={p.trim}/><Stop offset="1" stopColor="#8e6a3f"/></LinearGradient>
        <LinearGradient id="cape" x1="0" y1="0" x2="1" y2=".7"><Stop offset="0" stopColor={p.cloth}/><Stop offset="1" stopColor={p.lining}/></LinearGradient>
      </Defs>
      <Circle cx="170" cy="187" r="137" fill="none" stroke={p.trim} strokeWidth=".6" opacity=".24"/>
      <Circle cx="170" cy="187" r="123" fill="none" stroke={p.trim} strokeWidth=".5" strokeDasharray="2 13" opacity=".32"/>
      <Path d="M170 35 L174 47 170 59 166 47Z M30 185 L42 189 30 193 18 189Z M310 185 L322 189 310 193 298 189Z" fill={p.trim} opacity=".55"/>
      <Path d="M40 350 Q100 304 170 333 T320 322 M20 369 Q90 345 150 365 T320 348" fill="none" stroke={p.trim} opacity=".12"/>
      <Ellipse cx="175" cy="413" rx="83" ry="13" fill="#071c19" opacity=".7"/>
      <Ellipse cx="175" cy="413" rx="63" ry="8" fill={p.glow} opacity=".12"/>
      {/* Cape silhouette and lining */}
      <Path d={skin?.style==='storm'?'M125 133 Q86 166 80 250 L66 371 111 350 146 382 179 350 217 381 267 360 Q239 238 220 145Z':'M127 136 Q104 158 101 214 L78 355 Q118 383 173 367 Q228 387 260 348 L233 221 Q236 162 212 139Z'} fill="url(#cape)" stroke={p.trim} strokeWidth="1.2"/>
      <Path d="M126 161 Q116 260 96 352 M215 160 Q227 278 244 349 M104 358 Q178 382 247 354" fill="none" stroke={p.light} opacity=".32" strokeWidth="2"/>
      {skin?.style==='forest' && <G fill={p.trim} opacity=".4">{[0,1,2,3,4].map(i=><Path key={i} d={`M${93+i*3} ${332-i*19} q-13 -12 0 -20 q14 10 0 20Z`}/>)}</G>}
      {skin?.style==='ember' && <G stroke={p.glow} strokeWidth="1.5" fill="none" opacity=".7"><Path d="M90 329 l5 -13 7 11 -7 14Z M98 302 l4 -12 6 9 -5 14Z M239 330 l5 -13 7 11 -7 14Z"/><Circle cx="82" cy="310" r="2"/><Circle cx="254" cy="299" r="2"/></G>}
      {/* Backpack is visible over the shoulder, with a bedroll */}
      {bag && <G><Path d="M202 173 Q238 157 249 182 L257 268 Q232 290 211 270Z" fill="#835535" stroke="#d4ac71" strokeWidth="2"/><Rect x="216" y="154" width="40" height="24" rx="12" fill="#b5b693" stroke="#777e68" strokeWidth="2"/><Path d="M222 157 V176 M247 157 V176 M228 181 L239 262" fill="none" stroke="#422e25" strokeWidth="5"/><Path d="M225 219 Q242 210 251 216 L254 245 230 249Z" fill="#a26c42" stroke="#d5a96e"/></G>}
      {/* Boots and legs */}
      <Path d="M137 255 L169 259 167 339 156 383 124 384 129 326Z M175 260 L208 253 214 326 216 382 184 387 175 334Z" fill="#354140"/>
      <Path d="M138 274 L150 324 140 359 M192 277 L199 321 201 360" fill="none" stroke="#829087" opacity=".5" strokeWidth="3"/>
      <Path d="M128 340 L164 343 157 393 Q160 406 149 409 L109 407 Q102 399 117 390Z M181 344 L214 340 220 389 Q238 398 229 407 L189 409 Q180 403 184 390Z" fill="#624734" stroke="#a9865c" strokeWidth="1.5"/>
      <Path d="M129 353 L159 357 M126 367 L157 370 M184 357 L214 353 M186 370 L217 366" stroke="#342d27" strokeWidth="5"/>
      <Path d="M108 404 L152 407 M188 407 L231 403" stroke="#282d2a" strokeWidth="5"/>
      {/* Tunic silhouette differs subtly with body choice */}
      <Path d={woman?'M134 145 Q117 161 128 200 L140 223 121 283 Q171 308 218 282 L201 225 212 199 Q225 161 204 145Z':'M125 144 Q108 155 119 204 L130 229 119 284 Q172 306 224 282 L210 229 220 198 Q234 152 211 144Z'} fill="url(#cloth)" stroke={p.light} strokeWidth="1.3"/>
      <Path d="M169 158 L173 286 M130 269 Q174 289 215 269" stroke={p.trim} opacity=".8" strokeWidth="2" fill="none"/>
      <Path d="M151 166 L158 216 M189 166 L184 217 M143 242 L137 274 M198 242 L205 273" stroke={p.shade} opacity=".6" strokeWidth="3" fill="none"/>
      {/* Arms, layered shoulder guards and cuffs */}
      <Path d="M127 151 Q109 144 101 170 L86 225 103 237 132 191Z M210 151 Q231 146 239 170 L257 224 239 239 209 194Z" fill="url(#cloth)" stroke={p.shade} strokeWidth="2"/>
      <Path d="M100 165 Q112 149 135 155 L134 177 Q109 173 97 185Z M211 155 Q237 150 242 175 L242 185 Q228 175 209 179Z" fill={skin?.style==='storm'?'#78929d':'#77634a'} stroke={p.trim} strokeWidth="2"/>
      <Path d="M88 219 L108 226 100 251 80 244Z M236 229 L255 217 266 243 245 252Z" fill="#6e4e37" stroke={p.trim} strokeWidth="1.5"/>
      <Path d="M82 243 Q72 254 78 267 Q85 273 92 263 L99 249Z M246 250 Q245 264 253 270 Q264 273 270 262 L263 243Z" fill="url(#face)" stroke={skinTone[1]}/>
      {/* Staff belongs to the shared inventory */}
      {staff && <G><Path d="M263 402 L263 115 Q250 99 261 83 Q274 65 284 83 Q288 98 273 105" fill="none" stroke="#382d29" strokeWidth="10" strokeLinecap="round"/><Path d="M263 400 L265 113 Q255 94 267 83" fill="none" stroke="#b9925f" strokeWidth="4" strokeLinecap="round"/><Path d="M259 249 L269 249 M259 257 L269 257 M260 122 L270 122" stroke={p.trim} strokeWidth="3"/><Path d="M264 84 L274 73 281 85 274 97Z" fill={p.glow}/><Circle cx="273" cy="85" r="17" fill={p.glow} opacity=".12"/></G>}
      {/* Belt, satchel strap, collar and chest ornament */}
      <Path d="M129 224 Q170 239 211 225 L214 241 Q168 250 127 240Z" fill="#4d392c" stroke="#ad8755"/>
      <Rect x="163" y="230" width="22" height="17" rx="3" fill="url(#metal)"/><Rect x="168" y="234" width="12" height="9" rx="1" fill="#4d392c"/>
      {bag && <Path d="M216 160 L135 238" stroke="#b48c58" strokeWidth="10"/>}
      <Path d="M143 139 Q172 122 202 139 L199 159 174 181 140 155Z" fill={p.lining} stroke={p.trim} strokeWidth="2"/>
      <Path d="M149 130 L150 146 Q169 163 188 146 L188 129Z" fill="url(#face)"/>
      <Path d="M145 149 L169 168 156 174 136 154Z M193 149 L174 168 188 176 207 154Z" fill={p.cloth} stroke={p.trim}/>
      <Circle cx="173" cy="172" r="9" fill="url(#metal)"/><Path d="M173 165 L177 172 173 179 169 172Z" fill={p.glow}/>
      {charm && <G><Path d="M199 240 L211 270" stroke={p.trim} strokeWidth="2"/><Circle cx="214" cy="280" r="20" fill="#ffc56b" opacity=".14"/><Path d="M204 267 L221 267 225 290 204 292Z" fill="#674d36" stroke="#f6cf83" strokeWidth="2"/><Path d="M210 271 L218 271 220 286 209 287Z" fill="#ffdf92"/><Path d="M207 266 Q207 255 217 262" fill="none" stroke={p.trim} strokeWidth="2"/></G>}
      {/* Head, ears and three interchangeable hairstyles */}
      {appearance.hairStyle==='braids' && <G fill={hair[0]} stroke={hair[1]} strokeWidth="2"><Path d="M136 92 Q119 135 137 165 L146 149 140 101Z"/><Path d="M199 95 Q222 140 201 168 L193 149 197 103Z"/></G>}
      <Ellipse cx="137" cy="111" rx="7" ry="12" fill="url(#face)"/><Ellipse cx="202" cy="111" rx="7" ry="12" fill="url(#face)"/>
      <Path d={woman?'M138 88 Q168 66 199 88 L199 115 Q195 141 170 149 Q143 139 138 115Z':'M136 88 Q167 65 202 88 L200 122 187 141 168 147 148 138 138 120Z'} fill="url(#face)"/>
      <Path d="M147 109 Q154 104 160 109 M178 109 Q186 104 192 109" fill="none" stroke="#3b332f" strokeWidth="2" strokeLinecap="round"/>
      <Path d="M147 114 Q154 110 161 114 M179 114 Q186 110 192 114" stroke="#fff2ce" strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="155" cy="114" r="2.8" fill="#243d38"/><Circle cx="184" cy="114" r="2.8" fill="#243d38"/><Circle cx="156" cy="113" r=".8" fill="white"/><Circle cx="185" cy="113" r=".8" fill="white"/>
      <Path d="M169 114 L166 124 172 125" fill="none" stroke={skinTone[1]} strokeWidth="1.5" strokeLinecap="round"/>
      <Path d="M160 132 Q170 138 180 131" fill="none" stroke="#774633" strokeWidth="2" strokeLinecap="round"/>
      <Path d="M158 137 Q170 143 181 136" fill="none" stroke={skinTone[0]} opacity=".4"/>
      {appearance.hairStyle==='short' ? <G><Path d="M135 112 L130 87 138 65 150 70 163 58 174 66 189 62 205 79 207 111 196 94 195 85 166 92 145 86Z" fill={hair[0]}/><Path d="M141 78 L158 77 168 69 M175 78 L187 73" stroke={hair[1]} strokeWidth="3"/></G> : appearance.hairStyle==='swept' ? <G><Path d="M136 118 Q123 91 138 72 Q159 52 187 66 Q212 72 206 112 L196 101 196 83 Q180 111 140 101Z" fill={hair[0]}/><Path d="M140 92 Q169 91 188 73 M143 83 Q165 72 179 72" stroke={hair[1]} strokeWidth="3" fill="none"/></G> : <G><Path d="M134 113 Q121 72 152 65 Q183 56 202 78 L207 114 195 103 190 82 Q170 97 144 87 L143 112Z" fill={hair[0]}/><Path d="M139 80 Q166 91 190 76 M132 125 L143 131 M133 138 L144 144 M199 126 L210 132 M199 140 L208 146" fill="none" stroke={hair[1]} strokeWidth="3"/><Path d="M136 156 L143 157 M199 158 L207 155" stroke={p.trim} strokeWidth="4"/></G>}
      {skin?.style==='storm' && <Path d="M141 94 Q168 105 196 93 L193 99 171 106 146 100Z" fill={p.trim}/>}
      {skin?.style==='ember' && <G fill={p.glow}><Circle cx="114" cy="308" r="2"/><Circle cx="229" cy="142" r="2"/><Circle cx="97" cy="189" r="1.5"/><Path d="M278 162 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3Z" opacity=".7"/></G>}
    </Svg>
    </Animated.View>
  </View>;
}
