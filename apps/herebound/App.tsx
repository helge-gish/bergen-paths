import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Session, entryStatus, canMeet, carryCapacity, inventoryWeight, canEnter, progressFor, isRevealed, freshPosition, gamesNearby, metersBetween, nearby, stockKey } from '../../packages/herebound-sdk';
import type { Account, Action, Encounter, GamePack, GameRegistry, Persistence, PositionFix } from '../../packages/herebound-sdk';
import { registry } from './registry';
import { persistence } from './storage';
import { PortalArt, WorldMap } from './Map';
import { GamePortal } from './GamePortal';
import { FieldCamera } from './FieldCamera';
import { CharacterScreen } from './CharacterScreen';
import { FieldScene } from './FieldScene';
import { FieldMap } from './FieldMap';

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
  const [arEncounter, setArEncounter] = useState<string | null>(null), [arRequested, setArRequested] = useState<string | null>(null);
  const [tab, setTab] = useState<'world' | 'journal' | 'character'>('world');
  const [previewCamera, setPreviewCamera] = useState(false);
  const [selected, setSelected] = useState<string | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [fix, setFix] = useState<PositionFix | null>(null), [locating, setLocating] = useState(false), [locationMessage, setLocationMessage] = useState('');
  const [watching, setWatching] = useState(false), [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [now, setNow] = useState(Date.now());
  const arExpires = useRef(0), lastGps = useRef(0);
  const inFlight = useRef(false), commandNo = useRef(0), locationAttempt = useRef(0);
  const pack = account?.currentGame ? games.get(account.currentGame) : undefined;
  const progress = account ? progressFor(account) : undefined;
  const field = account?.activeMode === 'field' && !!pack;
  const encounter = pack?.encounters.find(e => e.id === selected);
  const previewPack = preview ? games.get(preview) : undefined;
  const visible = gamesNearby(games, fix, now);
  const simulation = !field && (fix?.source === 'simulation' || !!pack);
  const live = foreground && freshPosition(fix, now) && fix.source === 'gps' && fix.accuracy <= 30;
  const present = (e: Encounter) => !!pack && !!progress && (field ? foreground && canMeet(e,fix,now) : nearby(pack, progress.position, e));
  const money = (amount: number) => `${amount * (pack?.currency?.unitsPerCredit ?? 1)} ${pack?.currency?.name ?? 'mynt'}`;

  useEffect(() => { let alive = true;
    session.load().then(value => { if (alive) { setAccount(value); setWatching(value?.activeMode === 'field' && !!value.currentGame); setLoadFailed(false); } }).catch(e => { if (alive) { setError(errorText(e)); setLoadFailed(true); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; locationAttempt.current++; };
  }, [session]);
  useEffect(() => {
    // Capture once: a later timestamp in the queued updater looks like a
    // future GPS fix and used to hide the catalogue / disable entry.
    const refreshClock = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (arExpires.current && timestamp > arExpires.current) { setArEncounter(null); session.closeArEncounter(); arExpires.current=0; }
      setFix(current => current?.source === 'simulation' ? { ...current, timestamp } : current);
    };
    const timer = setInterval(refreshClock, 5000);
    const sub = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state !== 'active') { session.setPosition(null); session.closeArEncounter(); setArEncounter(null); } if (state === 'active') refreshClock(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  function acceptGps(next: PositionFix) { if(next.timestamp < lastGps.current)return; lastGps.current=next.timestamp; session.setPosition(next); setFix(next); setNow(Date.now()); }
  useEffect(() => {
    if (!watching || !foreground) { session.setPosition(null); return; }
    let cancelled = false; let subscription: Location.LocationSubscription | undefined;
    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;
      if (!permission.granted) { setLocationMessage('Tillat posisjon for å spille ute.'); return; }
      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 0 }, result => {
        if (cancelled) return;
        acceptGps({ latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy ?? Infinity, timestamp: result.timestamp, source: 'gps' });
      }, reason => { if (!cancelled) setLocationMessage(`GPS: ${reason}`); });
      if (cancelled) sub.remove(); else subscription = sub;
    })().catch(e => { if (!cancelled) setLocationMessage(errorText(e)); });
    return () => { cancelled = true; subscription?.remove(); session.setPosition(null); };
  }, [watching, foreground, session]);
  useEffect(() => {
    if (!field || !account || !live || !fix || fix.timestamp <= (progress?.lastObservedAt ?? 0) || inFlight.current) return;
    inFlight.current = true;
    void session.dispatch({ id: `observe-${Date.now()}-${++commandNo.current}`, expectedRevision: account.revision, action: { type: 'observe' } })
      .then(result => { setAccount(result.account); setLocationMessage(''); })
      .catch(e => setLocationMessage(errorText(e)))
      .finally(() => { inFlight.current = false; });
  }, [fix, account?.revision, field, live]);
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
  async function startSimulation(game: GamePack) {
    if (inFlight.current) return;
    const timestamp = Date.now();
    setWatching(false); session.setPosition(null);
    const position = account?.games[game.id]?.position ?? game.start.position;
    const startFix: PositionFix = { ...position, timestamp, accuracy: 0, source: 'simulation' };
    // Simulator entry is independent of a pending or rejected GPS request.
    locationAttempt.current++;
    setFix(startFix); setNow(timestamp); setLocating(false); setLocationMessage('');
    await act({ type: 'enter', gameId: game.id, fix: startFix });
  }
  async function locate() {
    const attempt = ++locationAttempt.current;
    setLocating(true); setLocationMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (attempt !== locationAttempt.current) return;
      if (!permission.granted) throw new Error('Tillat posisjon for å finne spill nær deg. Du kan også prøve simulatoren.');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Fant ikke posisjonen. Prøv igjen ute med fri sikt.')), 15_000); }),
      ]).finally(() => clearTimeout(timer));
      if (attempt !== locationAttempt.current) return;
      const next: PositionFix = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy ?? Infinity, timestamp: result.timestamp, source: 'gps' };
      acceptGps(next); setWatching(true);
      if (!freshPosition(next, Date.now())) setLocationMessage('Posisjonen er for usikker. Prøv igjen når GPS har bedre dekning.');
      return next;
    } catch (e) { if (attempt === locationAttempt.current) setLocationMessage(errorText(e)); }
    finally { if (attempt === locationAttempt.current) setLocating(false); }
  }
  async function enterField(game: GamePack) {
    if (locating || inFlight.current) return;
    let position = fix;
    if (!position || position.source !== 'gps' || !freshPosition(position, Date.now()) || !canEnter(game,position,Date.now(),!!account?.fieldGames?.[game.id])) position = await locate() ?? null;
    const status = entryStatus(game, position, Date.now(), !!account?.fieldGames?.[game.id]);
    if (!status.ready || !position) { setLocationMessage(status.text); return; }
    session.setPosition(position);
    await act({type:'enter',gameId:game.id,mode:'field',fix:position});
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
  const choose = (e: Encounter) => {
    session.closeArEncounter(); setArEncounter(null); setArRequested(null); setMessage('');
    if (field || !account || !pack) { setSelected(e.id); return; }
    // One tap opens a simulator meeting. No intermediate move/inspect screen that
    // can disappear under the next tap when its content changes height.
    void run(async()=>{
      let current = account;
      for (const action of [{type:'travel',position:e.position},{type:'discover',encounterId:e.id}] as Action[]) {
        const result=await session.dispatch({id:`cmd-${Date.now()}-${++commandNo.current}`,expectedRevision:current.revision,action}); current=result.account;
      }
      setAccount(current);setSelected(e.id);
    });
  };
  const chooseAr = (e: Encounter) => { session.openArEncounter(e.id); arExpires.current=Date.now()+5*60_000; setArEncounter(e.id); setArRequested(null); setSelected(e.id); setMessage(''); };
  const header = <View style={s.header}><Text accessibilityRole="header" style={s.logo}>◈ herebound</Text><Text style={s.version}>0.3.1 · TEST</Text></View>;
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
  else if (tab === 'character') body = <CharacterScreen account={account} registry={games} onAction={act} busy={busy} error={error} onExport={()=>void exportSave()}/>;
  else if (tab === 'journal') body = <><Eyebrow>DINE OPPDAGELSER</Eyebrow><Text style={s.pageTitle}>Journal</Text>
    {Object.entries(account.activeMode === 'field' ? account.fieldGames ?? {} : account.games).every(([, p]) => p.journal.length === 0) && <View style={s.card}><Text style={s.body}>Foreløpig blanke sider. Spør dem du møter, og undersøk det du finner.</Text></View>}
    {Object.entries(account.activeMode === 'field' ? account.fieldGames ?? {} : account.games).map(([gameId, p]) => p.journal.length ? <View key={gameId}><Text style={s.sectionTitle}>{games.get(gameId)?.title ?? gameId}</Text>{p.journal.map(j => <View key={j.id} style={s.card}><Text style={s.title}>{j.title}</Text><Text style={s.body}>{j.text}</Text></View>)}</View> : null)}
  </>;
  else if (pack && progress) body = <>
    <View style={s.row}><Pressable accessibilityRole="button" onPress={() => void act({ type: 'leave' })} disabled={busy}><Text style={s.link}>← Spilloversikt</Text></Pressable><Text style={s.small}>{money(account.character.credits)} · {account.character.xp} XP</Text></View>
    <Eyebrow>{pack.title} · {field ? 'UTE' : 'SIMULATOR'}</Eyebrow><Text style={s.pageTitle}>{pack.subtitle}</Text>
    {field && <><Text style={s.small}>{locationMessage || (live ? `GPS ±${Math.round(fix!.accuracy)} m` : 'Venter på fersk GPS. Kjente steder er bevart.')}</Text>{!live && <Button title={locating ? 'Finner GPS …' : 'Oppdater GPS'} disabled={locating} secondary onPress={() => void locate()}/>}</>}
    {!encounter ? <>
      {field ? <FieldScene pack={pack} progress={progress} fix={fix?.source === 'gps' ? fix : null} now={now} onSelect={choose} onArSelect={chooseAr} initialTarget={arRequested}/> : <WorldMap pack={pack} position={progress.position} discovered={progress.discovered} onSelect={choose}/>}
      <Text style={s.small}>{field ? 'Gå for å avdekke verdenen. Trykk på et funn for å se mer.' : 'Simulert posisjon. Velg fritt hvor du vil gå.'}</Text>
      <Text style={s.sectionTitle}>{field ? 'Oppdaget på kartet' : 'Rykter i landskapet'}</Text>
      {pack.encounters.filter(e => !field || progress.discovered.includes(e.id) || isRevealed(pack, progress, e.position)).map((e, i) => <Pressable key={e.id} accessibilityRole="button" onPress={() => choose(e)} style={({ pressed }) => [s.location, pressed && s.pressed]}><View style={s.number}><Text style={s.numberText}>{progress.discovered.includes(e.id) ? i + 1 : '?'}</Text></View><View style={s.flex}><Text style={s.itemTitle}>{progress.discovered.includes(e.id) ? e.name : e.mapLabel ?? e.rumor}</Text><Text style={s.small}>{distance(metersBetween(progress.position, e.position))} unna · {e.interaction && progress.journal.some(j=>j.id===e.interaction!.clue.id) ? 'Fullført' : progress.discovered.includes(e.id) ? 'Oppdaget' : 'Nytt funn'}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}
    </> : <>
      <Pressable accessibilityRole="button" onPress={() => { setSelected(null); setMessage(''); }}><Text style={s.link}>← Tilbake til verdenen</Text></Pressable>
      {field && arEncounter !== encounter.id && <Button title="Finn dette i AR" disabled={!present(encounter)} onPress={()=>{setArRequested(encounter.id);setSelected(null);setMessage('');}}/>}
      <View style={s.card}><Eyebrow>{distance(metersBetween(field && fix ? fix : progress.position, encounter.position))} UNNA</Eyebrow><Text style={s.pageTitle}>{progress.discovered.includes(encounter.id) ? encounter.name : encounter.rumor}</Text>
        {!present(encounter) ? <><Text style={s.body}>Kom nærmere for å undersøke stedet.</Text>{!field && <Button title="Gå hit i simulatoren" disabled={busy} onPress={() => void act({ type: 'travel', position: encounter.position })}/>}{field && progress.discovered.includes(encounter.id) && <><Text style={s.body}>{encounter.description}</Text><Text style={s.small}>Du kjenner dette stedet. Kom tilbake for å samhandle.</Text></>}</> : !progress.discovered.includes(encounter.id) ? <><Text style={s.body}>Du er fremme. Hva skjuler seg her?</Text><Button title="Undersøk stedet" disabled={busy || (field && arEncounter !== encounter.id)} onPress={() => void act({ type: 'discover', encounterId: encounter.id })}/></> : <>
          <Text style={s.body}>{encounter.description}</Text><View style={s.dialogue}><Text style={s.dialogueText}>{message || (encounter.interaction && progress.journal.some(j=>j.id===encounter.interaction!.clue.id) ? encounter.interaction.clue.text : encounter.greeting)}</Text></View>
          {encounter.interaction && <><Button title={progress.journal.some(j=>j.id===encounter.interaction!.clue.id) ? 'Fullført ✓' : encounter.interaction.label} disabled={busy || (field && arEncounter !== encounter.id) || progress.journal.some(j=>j.id===encounter.interaction!.clue.id) || (!!encounter.interaction.requires && !progress.journal.some(j=>j.id===encounter.interaction!.requires))} onPress={()=>void act({type:'interact', encounterId:encounter.id})}/>{encounter.interaction.requires && !progress.journal.some(j=>j.id===encounter.interaction!.requires) && <Text style={s.small}>Undersøk stedet for å lære hvordan.</Text>}</>}
          {encounter.recruit && (!encounter.recruit.requires || progress.journal.some(j => j.id === encounter.recruit!.requires)) && <Button title={account.character.helpers[encounter.recruit.helperId] ? 'Med i reisefølget ditt' : 'Spør om å slå følge'} disabled={busy || (field && arEncounter !== encounter.id) || !!account.character.helpers[encounter.recruit.helperId]} onPress={() => void act({ type: 'recruit', encounterId: encounter.id })}/>}
          {encounter.topics.filter(t => !t.requires || progress.journal.some(j => j.id === t.requires)).map(t => <Button key={t.id} title={t.label} secondary disabled={busy || (field && arEncounter !== encounter.id)} onPress={() => void act({ type: 'talk', encounterId: encounter.id, topicId: t.id })}/>)}
        </>}
      </View>
      {present(encounter) && (!field || arEncounter === encounter.id) && progress.discovered.includes(encounter.id) && encounter.shop && <View style={s.card}><View style={s.row}><Text style={s.title}>Handel</Text><Text style={s.gold}>{money(account.character.credits)}</Text></View>
        {encounter.shop.map(offer => { const item = account.items[offer.itemId], owned = account.character.inventory[offer.itemId] ?? 0, stock = progress.stock[stockKey(encounter.id, offer.itemId)]; return <View key={offer.itemId} style={s.item}>
          <Text style={s.itemTitle}>{item.name}</Text><Text style={s.small}>Du har {owned} · {stock} i boden · {item.weightGrams} g/stk.</Text><View style={s.tradeRow}><View style={s.flex}><Button title={`Kjøp · ${money(offer.buy)}`} disabled={busy || stock < 1 || account.character.credits < offer.buy || inventoryWeight(account) + item.weightGrams > carryCapacity(account)} onPress={() => void act({ type: 'trade', encounterId: encounter.id, itemId: item.id, direction: 'buy', quantity: 1 })}/></View><View style={s.flex}><Button title={`Selg · ${money(offer.sell)}`} secondary disabled={busy || owned < 1 || offer.sell < 1} onPress={() => void act({ type: 'trade', encounterId: encounter.id, itemId: item.id, direction: 'sell', quantity: 1 })}/></View></View>
        </View>; })}
      </View>}
    </>}
  </>;
  else if (previewPack) body = <>
    <Pressable accessibilityRole="button" onPress={() => setPreview(null)}><Text style={s.link}>← Spilloversikt</Text></Pressable>
    <Eyebrow>{previewPack.areaName}</Eyebrow><Text style={s.pageTitle}>{previewPack.title}</Text>
    <View style={s.card}><View style={s.row}><View style={s.flex}><Eyebrow>STARTSONE</Eyebrow><Text style={s.title}>{previewPack.start.name}</Text><Text style={s.small}>{previewPack.start.radiusMeters} meter rundt portalen</Text></View><GamePortal start={previewPack.start}/></View>
      {!previewPack.simulationOnly && <>
        <Text accessibilityLiveRegion="polite" style={s.body}>{entryStatus(previewPack,fix,now,!!account.fieldGames?.[previewPack.id]).text}</Text>
        {fix?.source==='gps'&&<Text style={s.small}>GPS ±{Math.round(fix.accuracy)} m · oppdatert for {Math.max(0,Math.round((now-fix.timestamp)/1000))} s siden</Text>}
        {!!locationMessage&&<Text style={s.small}>{locationMessage}</Text>}
        <Button title={locating?'Sjekker GPS …':account.fieldGames?.[previewPack.id]?'Fortsett ute':'Start ute'} disabled={busy||locating} onPress={()=>void enterField(previewPack)}/>
        <Button title="Oppdater GPS" disabled={locating||busy} secondary onPress={()=>void locate()}/>
      </>}
      <View style={s.row}><Button title="Startkart" secondary={previewCamera} onPress={()=>setPreviewCamera(false)}/><Button title="Test kamera · AR" secondary={!previewCamera} onPress={()=>setPreviewCamera(true)}/></View>
      <View style={{height:360,borderRadius:16,overflow:'hidden'}}>{previewCamera?<FieldCamera demo encounter={previewPack.encounters[0]} lit={false} onSelect={()=>{}} emptyMessage="Her kan du teste AR-kameraet. Spillfigurer åpnes etter at du har startet i spillområdet."/>:<FieldMap pack={previewPack} position={fix?.source==='gps' ? fix : null} navigation/>}</View>
      <Button title="Vis startpunkt på kart" secondary onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${previewPack.start.position.latitude}&mlon=${previewPack.start.position.longitude}#map=17/${previewPack.start.position.latitude}/${previewPack.start.position.longitude}`).catch(e => setError(errorText(e)))}/>
      <Text style={s.small}>Du kan også prøve historien hjemme med simulerte posisjoner.</Text>
      <Button title={account.games[previewPack.id] ? 'Fortsett prøve' : 'Start prøve'} disabled={busy} onPress={() => void startSimulation(previewPack)}/>
    </View>
  </>;
  else body = <>
    <Eyebrow>SPILL DER DU ER</Eyebrow><Text style={s.pageTitle}>En annen verden.{ '\n'}Rett i nærheten.</Text>
    <Text style={s.body}>Oppdag spill innen 5 km. Hvert eventyr har sitt eget startsted.</Text>
    <View style={s.locationPanel}><View style={s.row}><Text style={s.itemTitle}>{simulation ? '◈ Simulert posisjon' : '◎ Posisjonen din'}</Text>{locating && <ActivityIndicator color="#254b3c"/>}</View>
      {locationMessage ? <Text style={s.body}>{locationMessage}</Text> : fix && freshPosition(fix, now) ? <Text style={s.body}>{simulation ? 'Prøver spillområdet uten å være der fysisk.' : `GPS funnet · omtrent ${Math.round(fix.accuracy)} m nøyaktighet`}</Text> : <Text style={s.body}>{fix ? 'Oppdater posisjonen for å se spill i nærheten.' : 'Bruk posisjonen din for å finne spill.'}</Text>}
      <Button title={locating ? 'Finner posisjon …' : 'Finn spill nær meg'} disabled={locating || busy} onPress={() => void locate()}/>
    </View>
    {visible.length === 0 && fix && freshPosition(fix, now) && <View style={s.card}><Text style={s.title}>Ingen spill her ennå</Text><Text style={s.body}>Det finnes foreløpig ingen tilgjengelige spill innen 5 km fra deg.</Text></View>}
    {visible.map(game => <View key={game.id} style={s.gameCard}><View style={s.gameArt}><PortalArt/></View><View style={s.cardInterior}><Eyebrow>{game.areaName} · {distance(metersBetween(fix!, game.area.center))}</Eyebrow><Text style={s.gameTitle}>{game.title}</Text><Text style={s.title}>{game.subtitle}</Text><Text style={s.body}>{game.description}</Text><Button title="Se startsted →" disabled={busy} onPress={() => setPreview(game.id)}/></View></View>)}
    {[...games.values()].map(game => <View key={game.id} style={s.card}>
      <Eyebrow>HJEMMEPRØVE</Eyebrow><Text style={s.title}>{game.title}</Text>
      <Text style={s.body}>Prøvespill ved {game.start.name}. Du flytter deg med knapper i simulatoren.</Text>
      <Button title={account.games[game.id] ? 'Fortsett prøve' : 'Start prøve'} secondary disabled={busy} onPress={() => void startSimulation(game)}/><Button title="Startsted og AR-kamera" secondary onPress={()=>{setPreviewCamera(false);setPreview(game.id);}}/>
    </View>)}
    {games.size === 0 && <Text style={s.body}>Ingen spillpakker er installert. Herebound er klar når et spill legges til.</Text>}
  </>;

  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}><StatusBar style="dark"/>{header}
    {!!error && <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setError('')}><Text style={s.link}>Lukk</Text></Pressable></View>}
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" key={`${tab}-${pack?.id ?? 'catalogue'}-${selected ?? ''}-${preview ?? ''}`}>
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
