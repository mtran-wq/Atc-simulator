// Voice commands: the phraseology parser, and push to talk driven by a stand-in SpeechRecognition
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const errs = [], fails = [];
  const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  // a recogniser that "hears" whatever the test puts in window.__said
  await p.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { setTimeout(() => this.onresult && this.onresult({ results: [Object.assign([{ transcript: window.__said }], { isFinal: true })] }), 10); }
      stop() { setTimeout(() => this.onend && this.onend(), 10); }
    };
  });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(500);

  const cs = ['MRX482', 'NVA1203', 'SKL77', 'N123AB', 'TRK310'];
  const cases = [
    ['Meridian four eight two, turn left heading two seven zero, descend and maintain four thousand', 'MRX482', 'L 270 A 4000'],
    ['Meridian 482 turn right heading 090 climb and maintain 7000', 'MRX482', 'R 090 A 7000'],
    ['MRX482 fly heading 180 reduce speed to 210 knots', 'MRX482', 'H 180 S 210'],
    ['Nova 1203, proceed direct EKKON', 'NVA1203', 'D EKKON'],
    ['Nova one two zero three, direct weasel', 'NVA1203', 'D WEZEL'],
    ['Skylark 77 direct Sunday', 'SKL77', 'D SUNDA'],
    ['Sky lark seven seven, hold at Nivek', 'SKL77', 'HOLD NIVEK'],
    ['November one two three alpha bravo cleared ILS runway two seven right approach', 'N123AB', 'I 27R'],
    ['Meridian 482 cleared I L S 27L', 'MRX482', 'I 27L'],
    ['Trans cargo 310, runway 27R, line up and wait', 'TRK310', 'LU'],
    ['Trans Cargo 310 wind 280 at 11 runway 27 right cleared for takeoff', 'TRK310', 'TO'],
    ['Meridian 482 go around', 'MRX482', 'GA'],
    ['Meridian 482 maintain 180 knots', 'MRX482', 'S 180'],
    ['Meridian 482 descend to four thousand five hundred expedite', 'MRX482', 'A 4500 X'],
    ['Meridian 482 climb flight level one one zero', 'MRX482', 'A 110'],
    ['Meridian 482 cancel approach clearance', 'MRX482', 'CA'],
    ['Meridian 482 speed two ten', 'MRX482', 'S 210'],
    ['Meridian 482 cleared ILS runway one eight', 'MRX482', 'I 18'],
    ['Meridien 482, direct echo kilo kilo oscar november', 'MRX482', 'D EKKON'],
    ['Pacific 482 turn left heading 270', 'MRX482', 'L 270'],        // airline misheard, flight number unique
    ['turn left heading 300', null, 'L 300'],                         // no callsign: goes to the selected aircraft
  ];
  const got = await p.evaluate(([cases, cs]) => cases.map(([t]) => window.MER.parseSpeech(t, cs)), [cases, cs]);
  cases.forEach(([t, wantCs, wantCmd], i) => {
    const r = got[i]; if (r.cs !== wantCs || r.cmd !== wantCmd) fails.push(`"${t}" -> ${r.cs} "${r.cmd}" (${r.err || ''}), want ${wantCs} "${wantCmd}"`);
  });
  const amb = await p.evaluate(cs => window.MER.parseSpeech('Meridian 482 cleared ILS runway 27', cs), cs);
  if (!/left or right/.test(amb.err || '')) fails.push('ambiguous runway not reported: ' + JSON.stringify(amb));
  const none = await p.evaluate(cs => window.MER.parseSpeech('Nova 999 turn left heading 270', cs), cs);
  if (none.cs || !/No aircraft NVA999/.test(none.err || '')) fails.push('unknown callsign not reported: ' + JSON.stringify(none));

  const gcases = [
    ['Meridian 482, push and start approved, face west', 'MRX482', { push: 'W' }],
    ['Nova 1203 pushback approved facing east', 'NVA1203', { push: 'E' }],
    ['Meridian 482 taxi to holding point alpha two', 'MRX482', { hp: 'A2' }],
    ['Meridian 482, taxi to holding point B3 via Echo, Charlie', 'MRX482', { hp: 'B3' }],
    ['Meridian 482 taxi to runway 27 right', 'MRX482', { rwy: '27R' }],
    ['Skylark 77 taxi to stand golf 3', 'SKL77', { stand: 'G3' }],
    ['Skylark 77 taxi stand 10', 'SKL77', { stand: 'G10' }],
    ['Trans cargo 310 taxi to cargo stand 2', 'TRK310', { stand: 'K2' }],
    ['November one two three alpha bravo, stand kilo four', 'N123AB', { stand: 'K4' }],
    ['Meridian 482 taxi to K2', 'MRX482', { spot: 'K2' }],
    ['Meridian 482 hold position', 'MRX482', { holdPos: true }],
    ['Meridian 482 continue taxi', 'MRX482', { holdPos: false }],
    ['Meridian 482 other route', 'MRX482', { altRoute: true }],
    ['Meridian 482 hold position, a tug will turn you round', 'MRX482', { holdPos: true, turn: true }],
    ['Meridian 482 cross runway 27 right on alpha 2', 'MRX482', { cross: true }],
    ['Meridian 482 runway 27 left line up and wait', 'MRX482', { luaw: true }],
    ['Meridian 482 runway 27 left cleared for takeoff', 'MRX482', { takeoff: true }],
    ['Meridian 482 taxi to holding point alpha 2, hold short runway 27 right', 'MRX482', { hp: 'A2' }],
  ];
  const ggot = await p.evaluate(([cases, cs]) => cases.map(([t]) => window.MER.parseGroundSpeech(t, cs)), [gcases, cs]);
  gcases.forEach(([t, wantCs, want], i) => {
    const r = ggot[i]; if (r.cs !== wantCs || JSON.stringify(r.c) !== JSON.stringify(want)) fails.push(`ground "${t}" -> ${r.cs} ${JSON.stringify(r.c)} (${r.err || ''}), want ${wantCs} ${JSON.stringify(want)}`);
  });
  const gwhere = await p.evaluate(cs => window.MER.parseGroundSpeech('Meridian 482 taxi', cs), cs);
  if (!/Taxi to where/.test(gwhere.err || '')) fails.push('taxi without destination not reported: ' + JSON.stringify(gwhere));

  // end to end: hold MIC, speak, release; the aircraft gets the clearance
  await p.click('[data-act=start]');
  const a = await p.evaluate(() => { const A = window.__atc, S = A.S; for (let i = 0; i < 300; i++) A.step(0.5); const a = S.ac.find(x => x.kind === 'arr' && x.phase === 'air' && !x.app); S.paused = true; return { cs: a.cs, tel: window.MER._toSpeech(a.cs) }; });
  await p.evaluate(t => { window.__said = t + ', turn right heading 123, descend and maintain 5000'; }, a.tel);
  const box = await p.locator('#bMic').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up(); await p.waitForTimeout(300);
  const st = await p.evaluate(cs => { const a = window.__atc.S.ac.find(x => x.cs === cs); return { nav: a.nav, tAlt: a.tAlt, sel: window.__atc.S.sel === a.id, heard: document.getElementById('heard').textContent, log: window.__atc.S.log.slice(-2).map(l => l.text) }; }, a.cs);
  console.log('spoke:', a.tel, '->', st.heard); console.log(st.log.join('\n'));
  if (st.nav.mode !== 'hdg' || st.nav.hdg !== 123 || st.nav.dir !== 'R' || st.tAlt !== 5000 || !st.sel) fails.push('push to talk did not reach the aircraft: ' + JSON.stringify(st));
  await p.screenshot({ path: 'voice.png' });

  // ground end to end: push, taxi, take off, all by voice
  const talk = async (id, text) => { await p.evaluate(t => { window.__said = t; }, text); const bx = await p.locator(id).boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.up(); await p.waitForTimeout(250); return p.$eval(id === '#gMic' ? '#gHeard' : '#heard', e => e.textContent); };
  await p.reload(); await p.waitForTimeout(400);
  await p.click('[data-seg=pos] [data-i="1"]'); await p.click('[data-act=g-start]'); await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const G = window.__gnd; G.S.paused = true; for (let i = 0; i < 800 && !G.S.ac.some(x => x.st === 'pushreq'); i++) G.step(0.25); const a = G.S.ac.find(x => x.st === 'pushreq'); return { cs: a.cs, tel: window.MER._toSpeech(a.cs) }; });
  const gst = () => p.evaluate(cs => { const a = window.__gnd.S.ac.find(x => x.cs === cs); return a ? { st: a.st, face: a.face, dest: a.dest } : { st: 'gone' }; }, g.cs);
  const run = n => p.evaluate(n => { const G = window.__gnd; for (let i = 0; i < n; i++) G.step(0.25); }, n);
  console.log('ground:', await talk('#gMic', `${g.tel}, push and start approved, face east`), JSON.stringify(await gst()));
  if ((await gst()).face !== 'E') fails.push('ground push by voice failed');
  const wrong = await talk('#gMic', `${g.tel}, cleared for takeoff`);
  if (!/not holding short/.test(wrong)) fails.push('ground: takeoff from the stand was not refused: ' + wrong);
  await run(4 * 95); console.log('state', JSON.stringify(await gst()));
  console.log('ground:', await talk('#gMic', `${g.tel}, taxi to runway 27 right`), JSON.stringify(await gst()));
  const gs = await gst(); if (gs.st !== 'taxi' || !/^hA/.test(gs.dest || '')) fails.push('ground taxi by voice failed: ' + JSON.stringify(gs));
  await p.evaluate(cs => { const G = window.__gnd, a = G.S.ac.find(x => x.cs === cs); let n = 0; while (a.st !== 'short' && n++ < 4000) G.step(0.25); G.S.ac = G.S.ac.filter(x => x === a); G.S.nextArr = 1e9; }, g.cs);
  console.log('ground:', await talk('#gMic', `${g.tel}, runway 27 right, cleared for takeoff`), JSON.stringify(await gst()));
  if (!['lining', 'roll', 'air', 'gone'].includes((await gst()).st)) fails.push('ground takeoff by voice failed: ' + JSON.stringify(await gst()) + ' ' + JSON.stringify(await p.evaluate(() => window.__gnd.S.log.slice(-4).map(l => l.text))));
  await p.screenshot({ path: 'gvoice.png' });

  console.log('parser cases', cases.length + gcases.length, 'failures', fails.length); fails.forEach(f => console.log('FAIL', f));
  console.log('errors', errs);
  await b.close();
  if (fails.length || errs.length) process.exit(1);
})();
