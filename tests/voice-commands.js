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

  console.log('parser cases', cases.length, 'failures', fails.length); fails.forEach(f => console.log('FAIL', f));
  console.log('errors', errs);
  await b.close();
  if (fails.length || errs.length) process.exit(1);
})();
