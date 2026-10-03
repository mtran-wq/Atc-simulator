/* ===================== Voice commands: push to talk, spoken phraseology to a typed command ===================== */
(() => {
'use strict';
const MER = window.MER, $ = id => document.getElementById(id);

/* ---------- words to tokens ---------- */
const UNIT = { zero: 0, oh: 0, one: 1, two: 2, three: 3, tree: 3, four: 4, five: 5, fife: 5, six: 6, seven: 7, eight: 8, nine: 9, niner: 9 };
const TEEN = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const PHON = { alpha: 'A', alfa: 'A', bravo: 'B', charlie: 'C', delta: 'D', echo: 'E', foxtrot: 'F', golf: 'G', hotel: 'H', india: 'I', juliet: 'J', juliett: 'J', kilo: 'K', lima: 'L', mike: 'M', november: 'N', oscar: 'O', papa: 'P', quebec: 'Q', romeo: 'R', sierra: 'S', tango: 'T', uniform: 'U', victor: 'V', whiskey: 'W', whisky: 'W', xray: 'X', yankee: 'Y', zulu: 'Z' };
const AIRLINE = { meridian: 'MRX', meridien: 'MRX', nova: 'NVA', novo: 'NVA', skylark: 'SKL', pacifica: 'PCF', pacific: 'PCF', transcargo: 'TRK' };
/* what recognisers tend to write for the fix names */
const FIX_ALIAS = { weasel: 'WEZEL', weasels: 'WEZEL', sunday: 'SUNDA', ermine: 'ERMIN', solon: 'SOLEN', sullen: 'SOLEN', icon: 'EKKON', volta: 'WOLTE', tamra: 'TAMRO', velez: 'VELIS', kodak: 'KODEL', nevik: 'NIVEK', brixa: 'BRIXA' };
const isNum = t => t && typeof t === 'object';

function tokenize(text) {
  let s = ' ' + String(text).toLowerCase() + ' ';
  s = s.replace(/(\d),(?=\d{3}\b)/g, '$1')                    // 4,000
    .replace(/\bi\s*\.?\s*l\s*\.?\s*s\b\.?/g, ' ils ')         // I.L.S. / I L S
    .replace(/\bx-ray\b/g, 'xray').replace(/\btake-?off\b/g, 'takeoff').replace(/\bgo-around\b/g, 'go around')
    .replace(/\b(trans) (cargo)\b/g, '$1$2').replace(/\b(sky) (lark)\b/g, '$1$2')
    .replace(/\b(\d{1,2})([lrc])\b/g, '$1 $2')                  // 27R
    .replace(/\b([a-z])(\d{1,2})\b/g, '$1 $2')                   // G3, A2
    .replace(/[.,;:!?]/g, ' | ').replace(/[^a-z0-9| ]+/g, ' ');
  const w = s.split(/\s+/).filter(Boolean), out = [];
  for (let i = 0; i < w.length; i++) {
    const startsNum = /^\d+$/.test(w[i]) || w[i] in UNIT || w[i] in TEEN || w[i] in TENS;
    if (!startsNum) { out.push(w[i]); continue; }
    let str = '', total = 0, j = i;
    for (; j < w.length; j++) {
      const t = w[j];
      if (/^\d+$/.test(t)) str += t;
      else if (t in UNIT) str += UNIT[t];
      else if (t in TEEN) str += TEEN[t];
      else if (t in TENS) { if (UNIT[w[j + 1]] > 0) { str += TENS[t] + UNIT[w[j + 1]]; j++; } else str += TENS[t]; }
      else if (t === 'thousand') { total += (str ? +str : 1) * 1000; str = ''; }
      else if (t === 'hundred' && str) { total += +str * 100; str = ''; }
      else break;
    }
    out.push(total ? { n: String(total + (str ? +str : 0)), v: total + (str ? +str : 0) } : { n: str, v: +str });
    i = j - 1;
  }
  return out;
}

/* ---------- fix names: alias table, spelled out, or the closest sounding name ---------- */
const key = s => s.toUpperCase().replace(/[^A-Z]/g, '').replace(/PH/g, 'F').replace(/CK|C|Q/g, 'K').replace(/X/g, 'KS').replace(/Z/g, 'S')
  .replace(/W/g, 'V').replace(/Y/g, 'I').replace(/EE/g, 'I').replace(/([^AEIOU])H/g, '$1').replace(/(.)\1+/g, '$1');
function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
function readFix(tk, i) {   // returns [fix, tokens used] or null
  const fixes = MER.fixes || [];
  let sp = '', k = i;
  while (typeof tk[k] === 'string' && PHON[tk[k]]) sp += PHON[tk[k++]];
  if (sp.length === 5 && fixes.includes(sp)) return [sp, k - i];
  let best = null;
  for (let n = 1; n <= 3; n++) {
    const ws = tk.slice(i, i + n); if (ws.length < n || ws.some(x => typeof x !== 'string' || x === '|')) break;
    const joined = ws.join('');
    if (n === 1 && FIX_ALIAS[joined]) return [FIX_ALIAS[joined], 1];
    if (fixes.includes(joined.toUpperCase())) return [joined.toUpperCase(), n];
    for (const f of fixes) {
      const d = lev(key(joined), key(f)), tol = Math.max(1, Math.floor(key(f).length * 0.4));
      if (d <= tol && (!best || d < best.d || (d === best.d && n < best.n))) best = { f, n, d };
    }
  }
  return best ? [best.f, best.n] : null;
}

/* runway: a number then left / right; 9 reads as 09 */
function readRwy(tk, i) {
  const t = tk[i]; if (!isNum(t)) return null;
  const num = t.n.length === 1 ? '0' + t.n : t.n, side = tk[i + 1];
  const s = side === 'left' || side === 'l' ? 'L' : side === 'right' || side === 'r' ? 'R' : '';
  const rws = MER.runways || [];
  if (rws.includes(num + s)) return { id: num + s, used: s ? 2 : 1 };
  if (!s && rws.some(r => r.startsWith(num))) return { err: `Which runway, ${num} left or right?`, used: 1 };
  return { err: `Unknown runway ${num}${s}.`, used: s ? 2 : 1 };
}

/* ---------- the callsign: airline name + number, November + number + two letters, or written as MRX482 ---------- */
const FILL = new Set(['and', 'to', 'maintain', 'at', 'the', 'your', 'turn', 'fly', 'proceed', 'cleared', 'for', 'please', 'now', 'immediately']);
function readCall(text, callsigns, extraFill) {
  const tk = tokenize(text), used = new Set();
  let cs = null, spokenCs = null, err = null;
  for (let i = 0; i < tk.length && !spokenCs; i++) {
    const t = tk[i];
    if (typeof t !== 'string') continue;
    if (/^[a-z]{3}\d{2,4}$/.test(t) || /^n\d{3}[a-z]{2}$/.test(t)) { spokenCs = t.toUpperCase(); used.add(i); }
    else if (AIRLINE[t] && isNum(tk[i + 1])) { spokenCs = AIRLINE[t] + tk[i + 1].n; used.add(i).add(i + 1); }
    else if ((t === 'november' || t === 'n') && isNum(tk[i + 1]) && tk[i + 1].n.length === 3) {
      const a = tk[i + 2], b = tk[i + 3], l = x => typeof x === 'string' ? PHON[x] || (/^[a-z]$/.test(x) ? x.toUpperCase() : '') : '';
      if (l(a) && l(b)) { spokenCs = 'N' + tk[i + 1].n + l(a) + l(b); [i, i + 1, i + 2, i + 3].forEach(x => used.add(x)); }
    }
  }
  if (spokenCs) {
    const list = callsigns || [];
    cs = list.find(c => c === spokenCs) || null;
    if (!cs) {   // an airline name misheard: fall back on the flight number if only one aircraft has it
      const dg = (spokenCs.match(/\d+/) || [''])[0], hits = list.filter(c => (c.match(/\d+/) || [''])[0] === dg);
      if (hits.length === 1) cs = hits[0]; else err = `No aircraft ${spokenCs} on frequency.`;
    }
  }
  const W = i => (used.has(i) ? null : tk[i]);
  const skip = (i, extra) => { while (i < tk.length && typeof W(i) === 'string' && (FILL.has(W(i)) || (extraFill && extraFill.includes(W(i))) || (extra && extra.includes(W(i))))) i++; return i; };
  return { tk, cs, spokenCs, err, W, skip };
}

/* ---------- approach: a transmission to a typed command ---------- */
function parse(text, callsigns) {
  const o = readCall(text, callsigns), { tk, cs, spokenCs, W, skip } = o, out = [];
  let err = o.err;
  for (let i = 0; i < tk.length; i++) {
    const t = W(i); if (typeof t !== 'string') continue;
    if ((t === 'left' || t === 'right') && !(isNum(W(i - 1)))) {
      const j = skip(i + 1, ['heading']); if (isNum(W(j))) { out.push(`${t === 'left' ? 'L' : 'R'} ${W(j).n}`); i = j; }
    } else if (t === 'heading') {
      if (W(i - 1) === 'runway') continue;
      const j = skip(i + 1); if (isNum(W(j))) { out.push(`H ${W(j).n}`); i = j; }
    } else if (t === 'climb' || t === 'descend' || t === 'altitude' || t === 'level' || (t === 'maintain' && !['speed', 'knots'].includes(W(i - 1)))) {
      const j = skip(i + 1, ['climb', 'descend', 'altitude', 'flight', 'level', 'and']);
      if (isNum(W(j))) {
        if (W(j + 1) === 'knots') out.push(`S ${W(j).v}`);
        else if (t !== 'maintain' || W(j).v >= 1000 || W(j).v < 140) out.push(`A ${W(j).v}`);
        i = j;
      }
    } else if (t === 'speed' || t === 'reduce' || t === 'increase' || t === 'slow') {
      const j = skip(i + 1, ['speed', 'down', 'up', 'reduce', 'increase']); if (isNum(W(j))) { out.push(`S ${W(j).v}`); i = j + (W(j + 1) === 'knots' ? 1 : 0); }
    } else if (t === 'direct' || t === 'dct') {
      const j = skip(i + 1, ['direct']), f = readFix(tk, j);
      if (f) { out.push(`D ${f[0]}`); i = j + f[1] - 1; } else err = err || 'Direct to which fix?';
    } else if (t === 'hold' || t === 'holding') {
      const j = skip(i + 1, ['over', 'as', 'published']), f = readFix(tk, j);
      if (f) { out.push(`HOLD ${f[0]}`); i = j + f[1] - 1; } else err = err || 'Hold at which fix?';
    } else if (t === 'cancel') {
      out.push('CA'); i = skip(i + 1, ['approach', 'clearance']) - 1;
    } else if (t === 'ils' || t === 'localizer' || t === 'approach') {
      const j = skip(i + 1, ['ils', 'runway', 'approach', 'localizer']);
      if (isNum(W(j))) { const r = readRwy(tk, j); if (r.id) out.push(`I ${r.id}`); else err = err || r.err; i = j + r.used - 1; }
    } else if (t === 'runway' || t === 'wind') {   // a runway or wind mentioned in passing, e.g. with a takeoff clearance
      let j = i + 1; while (isNum(W(j)) || ['left', 'right', 'l', 'r', 'at', 'degrees', 'knots'].includes(W(j))) j++; i = j - 1;
    } else if (t === 'line' && W(i + 1) === 'up') { out.push('LU'); i = skip(i + 2, ['wait']) - 1; }
    else if (t === 'takeoff' || (t === 'take' && W(i + 1) === 'off')) { out.push('TO'); if (t === 'take') i++; }
    else if (t === 'go' && W(i + 1) === 'around') { out.push('GA'); i++; }
    else if (t === 'expedite') out.push('X');
  }
  const seen = new Set(), cmd = out.filter(c => { const k = c.split(' ')[0]; if (seen.has(k)) return false; seen.add(k); return true; }).join(' ');
  return { cs, spokenCs, cmd, err, score: (cs ? 2 : 0) + out.length - (err ? 1 : 0) };
}
MER.parseSpeech = parse;

/* ---------- ground: a transmission to a clearance for MER.gnd.run ---------- */
const SPOT = { a: 'A', alpha: 'A', alfa: 'A', b: 'B', bravo: 'B', g: 'G', golf: 'G', gulf: 'G', k: 'K', kilo: 'K' };
function parseGround(text, callsigns) {
  const o = readCall(text, callsigns), { tk, cs, spokenCs, W, skip } = o, c = {};
  let err = o.err, taxi = false, rwy = null;
  const spot = i => (SPOT[W(i)] && isNum(W(i + 1)) ? SPOT[W(i)] + +W(i + 1).n : null);
  for (let i = 0; i < tk.length; i++) {
    const t = W(i); if (typeof t !== 'string') continue;
    if (t === 'push' || t === 'pushback' || t === 'pushing' || t === 'face' || t === 'facing') {
      let j = i + 1; while (j < Math.min(tk.length, i + 9) && W(j) !== 'east' && W(j) !== 'west' && W(j) !== 'taxi') j++;
      if (W(j) === 'east' || W(j) === 'west') { c.push = W(j) === 'east' ? 'E' : 'W'; i = j; } else if (!c.push) err = err || 'Push facing east or west?';
    } else if (t === 'taxi') taxi = true;
    else if (t === 'stand' || t === 'gate' || t === 'parking' || t === 'cargo') {
      const j = skip(i + 1, ['stand', 'gate', 'parking', 'cargo', 'apron', 'position']), sp = spot(j);
      if (sp) { c.stand = sp; i = j + 1; } else if (isNum(W(j))) { c.stand = (t === 'cargo' ? 'K' : 'G') + +W(j).n; i = j; }
    } else if (t === 'holding' && W(i + 1) === 'point') {
      const j = skip(i + 2), sp = spot(j); if (sp) { c.hp = sp; i = j + 1; } else err = err || 'Which holding point?';
    } else if (t === 'hold') {
      if (W(i + 1) === 'short') i++; else { c.holdPos = true; if (W(i + 1) === 'position') i++; }
    } else if (t === 'continue') c.holdPos = false;
    else if (['other', 'alternative', 'alternate', 'different', 'another'].includes(t) && W(i + 1) === 'route') { c.altRoute = true; i++; }
    else if ((t === 'turn' && (W(i + 1) === 'round' || W(i + 1) === 'around')) || t === 'tug') { c.turn = true; if (t === 'turn') i++; }
    else if (t === 'cross') c.cross = true;
    else if (t === 'line' && W(i + 1) === 'up') { c.luaw = true; i = skip(i + 2, ['wait']) - 1; }
    else if (t === 'takeoff' || (t === 'take' && W(i + 1) === 'off')) { c.takeoff = true; if (t === 'take') i++; }
    else if (t === 'runway') { if (isNum(W(i + 1))) { const r = readRwy(tk, i + 1); if (r.id) rwy = r.id; i += r.used; } }
    else if (t === 'on' && spot(i + 1)) i += 2;   // "cross on A2": where it is, not where it goes
    else if (spot(i) && !c.stand && !c.hp && !c.spot) { c.spot = spot(i); i++; }
  }
  const dest = c.stand || c.hp || c.spot;
  if (taxi && !dest && rwy && !c.luaw && !c.takeoff && !c.cross) c.rwy = rwy;
  if (taxi && !dest && !c.rwy) err = err || 'Taxi to where? Give a stand, a holding point or a runway.';
  if (c.luaw && c.takeoff) delete c.luaw;
  const parts = [];
  if (c.push) parts.push(`PUSH FACE ${c.push === 'E' ? 'EAST' : 'WEST'}`);
  if (c.stand) parts.push(`TAXI STAND ${c.stand}`); if (c.hp) parts.push(`TAXI HOLDING POINT ${c.hp}`); if (c.spot) parts.push(`TAXI ${c.spot}`); if (c.rwy) parts.push(`TAXI RWY ${c.rwy}`);
  if (c.altRoute) parts.push('OTHER ROUTE'); if (c.holdPos === true) parts.push('HOLD POSITION'); if (c.holdPos === false) parts.push('CONTINUE TAXI');
  if (c.turn) parts.push('TURN ROUND'); if (c.cross) parts.push('CROSS'); if (c.luaw) parts.push('LINE UP'); if (c.takeoff) parts.push('TAKEOFF');
  return { cs, spokenCs, c, line: parts.join(' · '), err, score: (cs ? 2 : 0) + parts.length - (err ? 1 : 0) };
}
MER.parseGroundSpeech = parseGround;

/* ---------- push to talk ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let rec = null, on = false, holding = false, finals = [], interim = '', quietT = 0, hideT = 0, failed = '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const gnd = () => MER.mode === 'gnd';
function show(html, cls, ms) {
  const el = $(gnd() ? 'gHeard' : 'heard'), other = $(gnd() ? 'heard' : 'gHeard'); if (other) other.hidden = true; if (!el) return;
  clearTimeout(hideT); el.className = 'heard ' + (cls || ''); el.innerHTML = html; el.hidden = false;
  if (ms) hideT = setTimeout(() => { el.hidden = true; }, ms);
}
const hide = () => { ['heard', 'gHeard'].forEach(id => { if ($(id)) $(id).hidden = true; }); };
function setBtn() { ['bMic', 'gMic'].forEach(id => { const b = $(id); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
function quiet(ms) { clearTimeout(quietT); if (!holding) quietT = setTimeout(stop, ms); }
function start(hold) {
  if (!(gnd() ? MER.gnd && MER.gnd.live() : MER.live && MER.live())) return show('Start a shift first, then hold MIC to talk.', 'err', 3000);
  if (!SR) return show('Voice commands need Chrome, Edge or Safari. Firefox has no speech recognition.', 'err', 5000);
  holding = !!hold; if (on) return;
  if (MER.audio) MER.audio(); if (MER.hush) MER.hush();
  finals = []; interim = ''; failed = '';
  try {
    rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onresult = e => {
      finals = []; interim = '';
      for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finals.push(Array.from(r, x => x.transcript)); else interim += r[0].transcript; }
      show(`<span class="lbl">LISTENING</span> ${esc(finals.map(f => f[0]).join(' ') + ' ' + interim)}`, 'live'); quiet(1500);
    };
    rec.onerror = e => {
      failed = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone access is blocked. Allow it for this site in the browser settings.'
        : e.error === 'no-speech' ? 'Heard nothing. Hold MIC while you speak.' : e.error === 'network' ? 'Speech recognition needs an internet connection.' : e.error === 'aborted' ? '' : `Speech recognition error: ${e.error}.`;
    };
    rec.onend = () => { on = false; rec = null; clearTimeout(quietT); setBtn(); finish(); };
    rec.start(); on = true; setBtn(); show('<span class="lbl">LISTENING</span>', 'live'); quiet(6000);
  } catch (e) { on = false; rec = null; setBtn(); show('Could not start the microphone.', 'err', 4000); }
}
function stop() { holding = false; clearTimeout(quietT); if (rec && on) { try { rec.stop(); } catch (e) {} } }
function finish() {
  const texts = [];
  for (let k = 0; k < 3; k++) { const t = finals.map(f => f[k] || f[0]).join(' ').trim(); if (t && !texts.includes(t)) texts.push(t); }
  if (!texts.length && interim.trim()) texts.push(interim.trim());
  if (!texts.length) return failed ? show(esc(failed), 'err', 4000) : hide();
  const g = gnd(), list = g ? (MER.gnd ? MER.gnd.callsigns() : []) : MER.callsigns ? MER.callsigns() : [];
  const cands = texts.map(t => ({ t, r: (g ? parseGround : parse)(t, list) })).sort((a, b) => b.r.score - a.r.score), { t, r } = cands[0];
  const said = `&ldquo;${esc(t)}&rdquo;`, what = g ? r.line : r.cmd;
  if ((r.err && !what) || (r.spokenCs && !r.cs)) return show(`${said}<br>${esc(r.err)}`, 'err', 5000);
  if (!what && !r.cs) return show(`${said}<br>No instruction recognised. Try &ldquo;${g ? 'Meridian 482, push and start approved, face west' : 'Meridian 482, turn left heading 270'}&rdquo;.`, 'err', 5000);
  const line = ((r.cs || '') + ' ' + what).trim();
  if (g) {
    const no = MER.gnd.run(r.cs, r.c);
    show(`${said}<br>&rarr; <b>${esc(line)}</b>${no || r.err ? '<br>' + esc(no || r.err) : ''}`, no ? 'err' : 'ok', no ? 5000 : 4000);
    return;
  }
  show(`${said}<br>&rarr; <b>${esc(line)}</b>${r.err ? ' &middot; ' + esc(r.err) : ''}`, 'ok', 4000);
  if (MER.command) MER.command(line);
}

['bMic', 'gMic'].forEach(id => {
  const b = $(id); if (!b) return;
  let downT = 0;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); downT = performance.now(); try { b.setPointerCapture(e.pointerId); } catch (er) {}
    if (on && !holding) { stop(); downT = 0; return; }   // second tap ends a tapped transmission
    start(true);
  });
  const up = () => { if (!downT) return; const held = performance.now() - downT; downT = 0; if (!on) return; if (held > 400) stop(); else { holding = false; quiet(6000); } };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
/* hold T to talk on a keyboard */
document.addEventListener('keydown', e => {
  if (e.key !== 't' && e.key !== 'T') return; if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if ((MER.mode !== 'app' && MER.mode !== 'gnd') || !$('ov').hidden || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  e.preventDefault(); start(true);
});
document.addEventListener('keyup', e => { if ((e.key === 't' || e.key === 'T') && holding) stop(); });
})();
