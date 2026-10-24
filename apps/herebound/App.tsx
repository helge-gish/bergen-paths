import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Session, carryCapacity, inventoryWeight, canEnter, freshPosition, gamesNearby, metersBetween, nearby, stockKey } from '../../packages/herebound-sdk';
import type { Account, Action, Encounter, GamePack, GameRegistry, Persistence, PositionFix } from '../../packages/herebound-sdk';
import { registry } from './registry';
import { persistence } from './storage';
import { PortalArt, WorldMap } from './Map';

const distance = (m: number) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress(): void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, disabled && s.disabled, pressed && s.pressed]}>
    <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
  </Pressable>;
}
function Eyebrow({ children }: { children: React.ReactNode }) { return <Text style={s.eyebrow}>{children}</Text>; }

export function Herebound({ games, store }: { games: GameRegistry; store: Persistence }) {
  const session = useMemo(() => new Session(games, store), [games, store]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [name, setName] = useState('');
  const [tab, setTab] = useState<'world' | 'journal' | 'character'>('world');
  const [selected, setSelected] = useState<string | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [fix, setFix] = useState<PositionFix | null>(null), [locating, setLocating] = useState(false), [locationMessage, setLocationMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const inFlight = useRef(false), commandNo = useRef(0), locationAttempt = useRef(0);
  const pack = account?.currentGame ? games.get(account.currentGame) : undefined;
  const progress = pack && account?.games[pack.id];
  const encounter = pack?.encounters.find(e => e.id === selected);
  const previewPack = preview ? games.get(preview) : undefined;
  const visible = gamesNearby(games, fix, now);
  const simulation = fix?.source === 'simulation' || !!pack;

  useEffect(() => { let alive = true;
    session.load().then(value => { if (alive) { setAccount(value); setLoadFailed(false); } }).catch(e => { if (alive) { setError(errorText(e)); setLoadFailed(true); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; locationAttempt.current++; };
  }, [session]);
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); setFix(current => current?.source === 'simulation' ? { ...current, timestamp: Date.now() } : current); }, 5000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  async function run(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await work(); } catch (e) { setError(errorText(e)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function act(action: Action) {
    if (!account) return;
    await run(async () => {
      const result = await session.dispatch({ id: `cmd-${Date.now()}-${++commandNo.current}`, expectedRevision: account.revision, action });
      setAccount(result.account); setMessage(result.message);
      if (action.type === 'enter' || action.type === 'leave') { setSelected(null); setPreview(null); setTab('world'); setMessage(''); }
    });
  }
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (busy) return true;
    if (selected) { setSelected(null); setMessage(''); return true; }
    if (preview) { setPreview(null); return true; }
    if (tab !== 'world') { setTab('world'); return true; }
    if (pack) { void act({ type: 'leave' }); return true; }
    return false;
  }); return () => sub.remove(); }, [selected, preview, tab, pack, busy, account]);
  function simulatedPosition(position: { latitude: number; longitude: number }) {
    locationAttempt.current++;
    setFix({ ...position, timestamp: Date.now(), accuracy: 0, source: 'simulation' }); setNow(Date.now()); setLocating(false); setLocationMessage(''); setPreview(null);
  }
  async function locate() {
    const attempt = ++locationAttempt.current;
    setLocating(true); setLocationMessage(''); setFix(null); setPreview(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Tillat posisjon for å finne spill nær deg. Du kan også prøve simulatoren.');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Fant ikke posisjonen. Prøv igjen ute med fri sikt.')), 15_000); }),
      ]).finally(() => clearTimeout(timer));
      if (attempt !== locationAttempt.current) return;
      const next: PositionFix = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy ?? Infinity, timestamp: result.timestamp, source: 'gps' };
      setFix(next); setNow(Date.now());
      if (!freshPosition(next, Date.now())) setLocationMessage('Posisjonen er for usikker. Prøv igjen når GPS har bedre dekning.');
    } catch (e) { if (attempt === locationAttempt.current) setLocationMessage(errorText(e)); }
    finally { if (attempt === locationAttempt.current) setLocating(false); }
  }
  async function exportSave() {
    await run(async () => {
      const raw = await store.read();
      if (!raw) throw new Error('Ingen lagret figur å eksportere.');
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'herebound-figur.json'; a.click(); URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, 'herebound-figur.json'); file.create({ overwrite: true }); file.write(raw);
        if (!await Sharing.isAvailableAsync()) throw new Error('Fildeling er ikke tilgjengelig på denne enheten.');
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Eksporter Herebound-figur' });
      }
      setMessage('Lagringen er klar for eksport.');
    });
  }
  const choose = (e: Encounter) => { setSelected(e.id); setMessage(''); };
  const header = <View style={s.header}><Text accessibilityRole="header" style={s.logo}>◈ herebound</Text><Text style={s.version}>PRØVE 01</Text></View>;
  const tabs = account && <View style={s.tabs}>{([{ id: 'world', title: pack ? 'Verden' : 'Spill' }, { id: 'journal', title: 'Journal' }, { id: 'character', title: 'Figur & sekk' }] as const).map(t => <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} onPress={() => { setTab(t.id); setSelected(null); setMessage(''); }} style={[s.tab, tab === t.id && s.tabActive]}><Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.title}</Text></Pressable>)}</View>;

  let body: React.ReactNode;
  if (loading) body = <View style={s.card}><ActivityIndicator color="#254b3c"/><Text style={s.body}>Åpner sekken din …</Text></View>;
  else if (loadFailed) body = <View style={s.card}><Text style={s.title}>Lagringen er bevart</Text><Text style={s.body}>Denne versjonen klarer ikke å lese figuren. Eksporter filen så vi kan undersøke den.</Text><Button title="Eksporter lagring" onPress={() => void exportSave()} disabled={busy}/></View>;
  else if (!account) body = <>
    <View style={s.hero}><PortalArt/><View style={s.heroWords}><Eyebrow>VERDEN ER SPILLEBRETTET</Eyebrow><Text style={s.heroTitle}>Eventyret er{ '\n'}der du er.</Text><Text style={s.heroCopy}>Én figur. Én sekk. Nye verdener å gå inn i.</Text></View></View>
    <View style={s.card}><Text style={s.title}>Hva heter du, vandrer?</Text><TextInput accessibilityLabel="Figurens navn" value={name} onChangeText={setName} maxLength={30} placeholder="Ditt navn" placeholderTextColor="#7a8177" style={s.input} autoCapitalize="words"/>
      <Button title="Opprett prøvefigur →" disabled={busy || !name.trim()} onPress={() => void run(async () => { setAccount(await session.create(name)); })}/>
      <Text style={s.small}>Figuren lagres på denne enheten. Dette er en lokal spillprøve; ingen konto kreves.</Text></View>
  </>;
  else if (tab === 'character') body = <>
    <View style={s.hero}><View style={s.heroWords}><Eyebrow>DIN HEREBOUND-FIGUR</Eyebrow><Text style={s.heroTitle}>{account.character.name}</Text><Text style={s.heroCopy}>Nivå {account.character.level} · {account.character.xp} erfaring · {account.character.gold} gull</Text></View></View>
    <View style={s.card}><Text style={s.title}>Sekken din</Text><Text style={s.gold}>{(inventoryWeight(account) / 1000).toFixed(1).replace('.', ',')} / {carryCapacity(account) / 1000} kg</Text><Text style={s.body}>Følger deg mellom spill. Hvert spill bestemmer hva tingene kan brukes til.</Text>
      {Object.entries(account.character.inventory).filter(([, count]) => count > 0).length === 0 && <Text style={s.empty}>Sekken er tom. Finn en handelsmann i verdenen.</Text>}
      {Object.entries(account.character.inventory).filter(([, count]) => count > 0).map(([id, count]) => <View key={id} style={s.item}><Text style={s.itemTitle}>{account.items[id]?.name ?? id} <Text style={s.count}>× {count}</Text></Text><Text style={s.small}>{account.items[id]?.description}</Text></View>)}
    </View>
    <View style={s.card}><Text style={s.title}>Reisefølget ditt</Text>{Object.keys(account.character.helpers).length === 0 ? <Text style={s.body}>Ingen hjelpere ennå. Kanskje noen du møter vil slå følge?</Text> : Object.values(account.character.helpers).map(h => <View key={h.id} style={s.item}><Text style={s.itemTitle}>{h.name} · +{h.carryGrams / 1000} kg</Text><Text style={s.body}>{h.description}</Text><Text style={s.small}>Følger deg mellom spill og steder.</Text></View>)}</View>
    <View style={s.card}><Eyebrow>EGENSKAPER</Eyebrow><View style={s.stats}>{Object.entries(account.character.attributes).map(([key, value], i) => <View key={key} style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.small}>{['Styrke', 'Smidighet', 'Utholdenhet', 'Intelligens', 'Visdom', 'Karisma'][i]}</Text></View>)}</View><Text style={s.small}>Første prøve tester utforsking og handel. Nivåstigning, magi og kamp kommer i neste del.</Text></View>
    <Button title="Eksporter figuren" secondary disabled={busy} onPress={() => void exportSave()}/>
  </>;
  else if (tab === 'journal') body = <><Eyebrow>DINE OPPDAGELSER</Eyebrow><Text style={s.pageTitle}>Journal</Text>
    {Object.entries(account.games).every(([, p]) => p.journal.length === 0) && <View style={s.card}><Text style={s.body}>Foreløpig blanke sider. Spør dem du møter, og undersøk det du finner.</Text></View>}
    {Object.entries(account.games).map(([gameId, p]) => p.journal.length ? <View key={gameId}><Text style={s.sectionTitle}>{games.get(gameId)?.title ?? gameId}</Text>{p.journal.map(j => <View key={j.id} style={s.card}><Text style={s.title}>{j.title}</Text><Text style={s.body}>{j.text}</Text></View>)}</View> : null)}
  </>;
  else if (pack && progress) body = <>
    <View style={s.row}><Pressable accessibilityRole="button" onPress={() => void act({ type: 'leave' })} disabled={busy}><Text style={s.link}>← Spilloversikt</Text></Pressable><Text style={s.small}>{account.character.gold} gull · {account.character.xp} XP</Text></View>
    <Eyebrow>{pack.title} · SIMULATOR</Eyebrow><Text style={s.pageTitle}>{pack.subtitle}</Text>
    {!encounter ? <>
      <WorldMap pack={pack} position={progress.position} discovered={progress.discovered} onSelect={choose}/>
      <Text style={s.small}>Prøveplasser, ikke befarte møtesteder. Velg fritt hvor du vil gå.</Text>
      <Text style={s.sectionTitle}>Rykter i landskapet</Text>
      {pack.encounters.map((e, i) => <Pressable key={e.id} accessibilityRole="button" onPress={() => choose(e)} style={({ pressed }) => [s.location, pressed && s.pressed]}><View style={s.number}><Text style={s.numberText}>{progress.discovered.includes(e.id) ? i + 1 : '?'}</Text></View><View style={s.flex}><Text style={s.itemTitle}>{progress.discovered.includes(e.id) ? e.name : e.rumor}</Text><Text style={s.small}>{distance(metersBetween(progress.position, e.position))} unna · {progress.discovered.includes(e.id) ? 'Oppdaget' : 'Uutforsket'}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}
    </> : <>
      <Pressable accessibilityRole="button" onPress={() => { setSelected(null); setMessage(''); }}><Text style={s.link}>← Tilbake til verdenen</Text></Pressable>
      <View style={s.card}><Eyebrow>{distance(metersBetween(progress.position, encounter.position))} UNNA</Eyebrow><Text style={s.pageTitle}>{progress.discovered.includes(encounter.id) ? encounter.name : encounter.rumor}</Text>
        {!nearby(pack, progress.position, encounter) ? <><Text style={s.body}>Kom nærmere for å undersøke stedet.</Text><Button title="Gå hit i simulatoren" disabled={busy} onPress={() => void act({ type: 'travel', position: encounter.position })}/></> : !progress.discovered.includes(encounter.id) ? <><Text style={s.body}>Du er fremme. Hva skjuler seg her?</Text><Button title="Undersøk stedet" disabled={busy} onPress={() => void act({ type: 'discover', encounterId: encounter.id })}/></> : <>
          <Text style={s.body}>{encounter.description}</Text><View style={s.dialogue}><Text style={s.dialogueText}>{message || encounter.greeting}</Text></View>
          {encounter.recruit && (!encounter.recruit.requires || progress.journal.some(j => j.id === encounter.recruit!.requires)) && <Button title={account.character.helpers[encounter.recruit.helperId] ? 'Med i reisefølget ditt' : 'Spør om å slå følge'} disabled={busy || !!account.character.helpers[encounter.recruit.helperId]} onPress={() => void act({ type: 'recruit', encounterId: encounter.id })}/>}
          {encounter.topics.filter(t => !t.requires || progress.journal.some(j => j.id === t.requires)).map(t => <Button key={t.id} title={t.label} secondary disabled={busy} onPress={() => void act({ type: 'talk', encounterId: encounter.id, topicId: t.id })}/>)}
        </>}
      </View>
      {nearby(pack, progress.position, encounter) && progress.discovered.includes(encounter.id) && encounter.shop && <View style={s.card}><View style={s.row}><Text style={s.title}>Handel</Text><Text style={s.gold}>{account.character.gold} gull</Text></View>
        {encounter.shop.map(offer => { const item = account.items[offer.itemId], owned = account.character.inventory[offer.itemId] ?? 0, stock = progress.stock[stockKey(encounter.id, offer.itemId)]; return <View key={offer.itemId} style={s.item}>
          <Text style={s.itemTitle}>{item.name}</Text><Text style={s.small}>Du har {owned} · {stock} i boden · {item.weightGrams} g/stk.</Text><View style={s.tradeRow}><View style={s.flex}><Button title={`Kjøp · ${offer.buy} gull`} disabled={busy || stock < 1 || account.character.gold < offer.buy || inventoryWeight(account) + item.weightGrams > carryCapacity(account)} onPress={() => void act({ type: 'trade', encounterId: encounter.id, itemId: item.id, direction: 'buy', quantity: 1 })}/></View><View style={s.flex}><Button title={`Selg · ${offer.sell} gull`} secondary disabled={busy || owned < 1 || offer.sell < 1} onPress={() => void act({ type: 'trade', encounterId: encounter.id, itemId: item.id, direction: 'sell', quantity: 1 })}/></View></View>
        </View>; })}
      </View>}
    </>}
  </>;
  else body = <>
    <Eyebrow>SPILL DER DU ER</Eyebrow><Text style={s.pageTitle}>En annen verden.{ '\n'}Rett i nærheten.</Text>
    <Text style={s.body}>Oppdag spill innen 5 km. Hvert eventyr har sitt eget startsted.</Text>
    <View style={s.locationPanel}><View style={s.row}><Text style={s.itemTitle}>{simulation ? '◈ Simulert posisjon' : '◎ Posisjonen din'}</Text>{locating && <ActivityIndicator color="#254b3c"/>}</View>
      {locationMessage ? <Text style={s.body}>{locationMessage}</Text> : fix && freshPosition(fix, now) ? <Text style={s.body}>{simulation ? 'Prøver spillområdet uten å være der fysisk.' : `GPS funnet · omtrent ${Math.round(fix.accuracy)} m nøyaktighet`}</Text> : <Text style={s.body}>{fix ? 'Oppdater posisjonen for å se spill i nærheten.' : 'Bruk posisjonen din for å finne spill.'}</Text>}
      <Button title={locating ? 'Finner posisjon …' : 'Finn spill nær meg'} secondary disabled={locating || busy} onPress={() => void locate()}/>
      {simulation && fix && <Button title="Oppdater simulert posisjon" secondary disabled={busy} onPress={() => simulatedPosition(fix)}/>}
    </View>
    {visible.length === 0 && fix && freshPosition(fix, now) && <View style={s.card}><Text style={s.title}>Ingen spill her ennå</Text><Text style={s.body}>Det finnes foreløpig ingen tilgjengelige spill innen 5 km fra deg.</Text></View>}
    {visible.map(game => <View key={game.id} style={s.gameCard}><View style={s.gameArt}><PortalArt/></View><View style={s.cardInterior}><Eyebrow>{game.areaName} · {distance(metersBetween(fix!, game.area.center))}</Eyebrow><Text style={s.gameTitle}>{game.title}</Text><Text style={s.title}>{game.subtitle}</Text><Text style={s.body}>{game.description}</Text><Button title="Se startsted →" disabled={busy} onPress={() => setPreview(game.id)}/></View></View>)}
    {previewPack && visible.some(g => g.id === previewPack.id) && <View style={s.card}><Eyebrow>HER BEGYNNER EVENTYRET</Eyebrow><Text style={s.title}>{previewPack.start.name}</Text><Text style={s.body}>{distance(metersBetween(fix!, previewPack.start.position))} til start · kom innen {previewPack.start.radiusMeters} m</Text>
      <Text style={s.small}>{previewPack.start.position.latitude.toFixed(6)}, {previewPack.start.position.longitude.toFixed(6)}</Text>
      <Button title="Vis startpunkt på kart" secondary onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${previewPack.start.position.latitude}&mlon=${previewPack.start.position.longitude}#map=17/${previewPack.start.position.latitude}/${previewPack.start.position.longitude}`).catch(e => setError(errorText(e)))}/>
      {simulation ? <>{!canEnter(previewPack, fix, now, !!account.games[previewPack.id]) && <Button title="Gå til start i simulatoren" secondary onPress={() => { simulatedPosition(previewPack.start.position); setPreview(previewPack.id); }}/>}<Button title={account.games[previewPack.id] ? 'Fortsett eventyret' : 'Begynn eventyret'} disabled={busy || !canEnter(previewPack, fix, now, !!account.games[previewPack.id])} onPress={() => void act({ type: 'enter', gameId: previewPack.id, fix: fix! })}/></> : <Text style={s.body}>Denne første spillprøven åpnes i simulatoren. Møteplassene må prøves ute før felttesten.</Text>}
    </View>}
    <View style={s.separator}/><Text style={s.small}>PRØV UTEN Å REISE</Text>
    {[...games.values()].slice(0, 1).map(game => <Button key={game.id} title="Åpne prøvemodus" secondary disabled={busy || locating} onPress={() => simulatedPosition({ latitude: game.area.center.latitude, longitude: game.area.center.longitude - .02 })}/>)}
    {games.size === 0 && <Text style={s.body}>Ingen spillpakker er installert. Herebound er klar når et spill legges til.</Text>}
  </>;

  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}><StatusBar style="dark"/>{header}
    {busy && <View style={s.saving}><ActivityIndicator size="small" color="#254b3c"/><Text style={s.small}>Lagrer …</Text></View>}
    {!!error && <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setError('')}><Text style={s.link}>Lukk</Text></Pressable></View>}
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" key={`${tab}-${pack?.id ?? 'catalogue'}-${selected ?? ''}`}>
      {body}
      {!!message && !encounter && <Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text>}
    </ScrollView>{tabs}
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Herebound games={registry} store={persistence}/></SafeAreaProvider>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f3e9' }, header: { paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e3d6' },
  logo: { fontSize: 26, fontWeight: '800', letterSpacing: -1, color: '#213b31' }, version: { fontSize: 10, letterSpacing: 2, color: '#757b6a' },
  content: { padding: 22, gap: 16, paddingBottom: 32, maxWidth: 650, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: '#193b30', borderRadius: 22, overflow: 'hidden' }, heroWords: { padding: 24, gap: 12 }, heroTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 39, lineHeight: 44, color: '#fbf4df' }, heroCopy: { fontSize: 16, lineHeight: 24, color: '#d0d9ca' },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, fontWeight: '700', color: '#9b7b35', lineHeight: 16 },
  pageTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 32, lineHeight: 38, color: '#253c31' },
  title: { fontSize: 21, fontWeight: '700', color: '#253c31', lineHeight: 28 }, sectionTitle: { fontSize: 20, fontWeight: '700', color: '#253c31', marginTop: 10, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 25, color: '#5b655b' }, small: { fontSize: 13, lineHeight: 20, color: '#70776a' },
  card: { backgroundColor: '#fffdf5', padding: 20, borderWidth: 1, borderColor: '#dfdfd0', borderRadius: 20, gap: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#bbc3ae', borderRadius: 12, padding: 16, fontSize: 18, color: '#213b31', backgroundColor: '#fff' },
  button: { minHeight: 50, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#254b3c', justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#fff9e8', textAlign: 'center' }, secondary: { backgroundColor: '#e8ecdf' }, secondaryText: { color: '#284735' }, disabled: { opacity: .4 }, pressed: { opacity: .7 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#dce1d2', padding: 8, gap: 6, backgroundColor: '#f6f3e9' }, tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 12 }, tabActive: { backgroundColor: '#e2e9d9' }, tabText: { fontSize: 14, color: '#737c6b' }, tabTextActive: { color: '#234735', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, flex: { flex: 1 }, link: { color: '#36583e', fontSize: 14, fontWeight: '700', paddingVertical: 8 },
  locationPanel: { padding: 18, borderRadius: 16, backgroundColor: '#eaeddf', gap: 12 }, location: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#dce0cf' },
  number: { borderWidth: 1, borderColor: '#a8b19c', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, numberText: { fontFamily: 'serif', fontSize: 23, color: '#526047' }, arrow: { fontSize: 26, color: '#56714b' },
  item: { gap: 6, paddingVertical: 12, borderTopWidth: 1, borderColor: '#e3e4d8' }, itemTitle: { fontSize: 17, fontWeight: '700', color: '#263f32' }, count: { color: '#9a7631' }, empty: { paddingVertical: 16, color: '#78806f', fontSize: 16, lineHeight: 24 },
  dialogue: { padding: 18, borderLeftWidth: 3, borderColor: '#bc994b', backgroundColor: '#f0eddf', borderRadius: 4 }, dialogueText: { fontSize: 17, lineHeight: 27, color: '#3c4b3c', fontStyle: 'italic' },
  tradeRow: { flexDirection: 'row', gap: 8, marginTop: 8 }, gold: { color: '#94702e', fontWeight: '700', fontSize: 16 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, stat: { width: '44%', paddingVertical: 8 }, statValue: { fontSize: 26, color: '#314d36', fontFamily: 'serif' },
  gameCard: { borderRadius: 20, borderWidth: 1, borderColor: '#dedfce', overflow: 'hidden', backgroundColor: '#fffdf5' }, gameArt: { backgroundColor: '#233d30' }, cardInterior: { padding: 20, gap: 14 }, gameTitle: { fontFamily: 'serif', fontSize: 34, letterSpacing: 3, color: '#304a37' },
  separator: { height: 1, backgroundColor: '#dfe2d2', marginTop: 8 }, error: { margin: 12, padding: 14, borderRadius: 10, backgroundColor: '#f6dfd2', gap: 6 }, errorText: { fontSize: 15, color: '#813b29', lineHeight: 22 },
  saving: { flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 6 }, notice: { fontSize: 15, lineHeight: 23, color: '#36583e', backgroundColor: '#e5ead9', padding: 14, borderRadius: 10 },
});
