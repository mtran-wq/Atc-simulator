/* ===================== Spoken radio (text to speech) and the audio settings card ===================== */
(() => {
'use strict';
const MER = window.MER, $ = id => document.getElementById(id);
const syn = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null;
const V = { mode: 2, coach: 0, fx: 1, rate: 1.2, vol: 0.9, atc: '', pil: '', v: 2 };
try { const o = JSON.parse(localStorage.getItem('meridian.voice') || '{}'); if (o.v !== 2) { if (o.mode === 1) delete o.mode; o.v = 2; } Object.assign(V, o); } catch (e) {}
const save = () => { try { localStorage.setItem('meridian.voice', JSON.stringify(V)); } catch (e) {} };

/* ---------- radio phraseology for the synthesiser ---------- */
const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
const digs = s => String(s).split('').map(d => DIG[+d]).join(' ');
const PH = { A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu' };
const TEL = { MRX: 'Meridian', NVA: 'Nova', SKL: 'Skylark', PCF: 'Pacifica', TRK: 'Trans cargo' };
const TYPE = { A320: 'Airbus three twenty', B738: 'Boeing seven thirty-seven', A21N: 'Airbus three twenty-one', E175: 'Embraer one seventy-five', CRJ9: 'C R J nine hundred', DH8D: 'Dash eight', B763: 'Boeing seven sixty-seven', A359: 'Airbus three fifty', B77W: 'Boeing triple seven', B748: 'Boeing seven forty-seven', A388: 'Airbus three eighty', C208: 'Caravan', PC12: 'Pilatus' };
function toSpeech(t) {
  t = t.replace(/\b(A320|B738|A21N|E175|CRJ9|DH8D|B763|A359|B77W|B748|A388|C208|PC12)\b/g, m => TYPE[m]);
  t = t.replace(/\b(MRX|NVA|SKL|PCF|TRK)(\d{2,4})\b/g, (m, a, n) => TEL[a] + ' ' + digs(n));
  t = t.replace(/\bN(\d{3})([A-Z])([A-Z])\b/g, (m, n, a, b) => 'November ' + digs(n) + ' ' + PH[a] + ' ' + PH[b]);
  t = t.replace(/(\d+):(\d\d)/g, (m, a, b) => (+a ? `${+a} minute${+a > 1 ? 's' : ''}${+b ? ' ' + +b : ''}` : `${+b} seconds`));
  t = t.replace(/(\d{3})\/(\d{2})/g, (m, a, b) => digs(a) + ' at ' + digs(b));
  t = t.replace(/\b(\d{1,2}),(\d)00\b/g, (m, a, h) => digs(a) + ' thousand' + (+h ? ' ' + DIG[+h] + ' hundred' : ''));
  t = t.replace(/\b(09|27)([LR])\b/g, (m, a, s) => digs(a) + (s === 'L' ? ' left' : ' right'));
  t = t.replace(/\b(runway|ILS|localizer|takeoff|up) (18|36|09|27)\b/gi, (m, w, a) => w + ' ' + digs(a));
  t = t.replace(/\bstand G(\d+)/gi, 'stand $1').replace(/\bstand K(\d)/gi, 'cargo stand $1');
  t = t.replace(/\b([A-FK])(\d)\b/g, (m, a, n) => PH[a] + ' ' + DIG[+n]);
  t = t.replace(/\bvia ([^.]*)/g, (m, seg) => 'via ' + seg.replace(/\b([A-K])\b/g, c => PH[c]));
  t = t.replace(/\b(with|information) ([A-Z])\b/g, (m, w, c) => (w === 'with' ? 'with information ' : 'information ') + PH[c]);
  t = t.replace(/\bILS\b/g, 'I L S').replace(/\bPAN-PAN\b/g, 'Pan pan');
  t = t.replace(/\b(\d{3})\.(\d)\b/g, (m, a, b) => digs(a) + ' decimal ' + DIG[+b]);
  t = t.replace(/\b(\d{3})\b/g, m => digs(m));
  t = t.replace(/(\d|hundred|thousand) m\b/g, '$1 metres').replace(/ km\b/g, ' kilometres').replace(/ kt\b/g, ' knots').replace(/ ft\b/g, ' feet').replace(/ nm\b/g, ' miles');
  t = t.replace(/\b[A-Z]{4,}\b/g, m => m[0] + m.slice(1).toLowerCase());
  return t;
}

/* ---------- speech queue ---------- */
let voices = [], q = [], cur = null, curT = 0, cardOpen = false;
function loadVoices() { if (!syn) return; let all = []; try { all = syn.getVoices() || []; } catch (e) {} const en = all.filter(v => /^en/i.test(v.lang)); voices = en.length ? en : all; if (cardOpen) render(); }
if (syn) { loadVoices(); try { syn.addEventListener('voiceschanged', loadVoices); } catch (e) { try { syn.onvoiceschanged = loadVoices; } catch (er) {} } }
/* VHF colour: a key click, a bed of static while someone is transmitting, and a squelch tail when they let go */
let noiseBuf = null, bed = null;
function noise(ac) { if (noiseBuf) return noiseBuf; const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (noiseBuf = b); }
function burst(dur, gain, freq) {
  const ac = MER.ac && MER.ac(); if (!ac || !V.fx) return;
  try { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise(ac); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = gain * V.vol; g.gain.setTargetAtTime(0, ac.currentTime + dur * 0.5, dur * 0.25); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(0, Math.random() * 0.5); s.stop(ac.currentTime + dur + 0.2); } catch (e) {}
}
function bedOn() {
  const ac = MER.ac && MER.ac(); if (!ac || !V.fx || bed) return;
  try { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise(ac); s.loop = true; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.6; g.gain.value = 0.014 * V.vol; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); bed = { s, g }; burst(0.04, 0.07, 2600); } catch (e) {}
}
function bedOff(tail) { if (!bed) return; const b = bed; bed = null; try { b.g.gain.setTargetAtTime(0, b.s.context.currentTime, 0.02); b.s.stop(b.s.context.currentTime + 0.1); } catch (e) {} if (tail) burst(0.11, 0.05, 1500); }
const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const voiceBy = uri => voices.find(v => v.voiceURI === uri) || null;
function pump() {
  if (!syn || cur) return;
  const it = q.shift(); if (!it) return;
  let u; try { u = new SpeechSynthesisUtterance(toSpeech(it.text)); } catch (e) { return; }
  u.rate = Math.max(0.5, Math.min(2.5, V.rate)); u.volume = Math.max(0, Math.min(1, V.vol)); u.pitch = 1;
  if (it.who === 'pilot') {
    const cs = (it.text.match(/\b(?:[A-Z]{3}\d{2,4}|N\d{3}[A-Z]{2})\b/) || ['x'])[0], h = hash(cs);
    const v = V.pil ? voiceBy(V.pil) : voices.length ? voices[h % voices.length] : null; if (v) u.voice = v;
    u.pitch = 0.8 + (h % 6) * 0.09;
  } else { const v = voiceBy(V.atc); if (v) u.voice = v; }
  u.onend = u.onerror = () => { if (cur === u) { cur = null; bedOff(true); setTimeout(pump, 180); } };
  cur = u; curT = performance.now();
  try { syn.speak(u); if (it.who !== 'coach') bedOn(); } catch (e) { cur = null; }
}
MER.speak = (who, text, gameRate) => {
  if (!syn || who === 'sys' || !text) return;
  if (who === 'coach') { if (!V.coach) return; } else if (V.mode === 0 || (who === 'atc' && V.mode < 2)) return;
  if (cur && performance.now() - curT > 25000) { try { syn.cancel(); } catch (e) {} cur = null; bedOff(false); }
  if (who === 'coach') { q.length = 0; if (cur) { try { syn.cancel(); } catch (e) {} cur = null; bedOff(false); } }
  const cap = gameRate >= 4 ? 1 : 3; while (q.length >= cap) q.shift();
  q.push({ who, text }); pump(); return true;
};
MER.hush = () => { q.length = 0; if (syn) { try { syn.cancel(); } catch (e) {} } cur = null; bedOff(false); };
MER.speechOn = () => !!syn && (V.mode > 0 || !!V.coach);
MER._toSpeech = toSpeech;

/* ---------- settings card ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const vseg = (k, labels, val) => `<div class="vseg" data-k="${k}">${labels.map((l, i) => `<button data-i="${i}" aria-pressed="${val === i}">${l}</button>`).join('')}</div>`;
function render() {
  const opt = sel => voices.map(v => `<option value="${esc(v.voiceURI)}"${v.voiceURI === sel ? ' selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  const note = !syn ? 'Speech is not available in this view. Opening the page in a browser such as Chrome or Safari usually enables it. Sound effects still work.'
    : !voices.length ? 'No voices have loaded yet. The device default voice will be used; press TEST to check it.'
    : 'Calls are read in radio phraseology, with a different voice for each aircraft. At 4x and 8x only the newest call is read, so play at 1x or 2x to hear both sides of every exchange.';
  $('ovCard').innerHTML = `<h1>SOUND AND SPEECH</h1>
  <div class="opts">
    <span class="lbl">ALERTS</span>${vseg('beeps', ['Off', 'On'], MER.snd() ? 1 : 0)}
    <span class="lbl">SPEECH</span>${vseg('mode', ['Off', 'Pilots', 'Pilots and you'], V.mode)}
    <span class="lbl">RADIO</span>${vseg('fx', ['Clean', 'Static and clicks'], V.fx)}
    <span class="lbl">TUTORIAL</span>${vseg('coach', ['Silent', 'Read aloud'], V.coach)}
    <span class="lbl">SPEED</span><div class="vstep"><button data-act="v-rate" data-d="-1" aria-label="Slower">&minus;</button><output>${V.rate.toFixed(2)}x</output><button data-act="v-rate" data-d="1" aria-label="Faster">+</button></div>
    <span class="lbl">VOLUME</span><div class="vstep"><button data-act="v-vol" data-d="-1" aria-label="Quieter">&minus;</button><output>${Math.round(V.vol * 100)}%</output><button data-act="v-vol" data-d="1" aria-label="Louder">+</button></div>
    <label class="lbl" for="vAtc">YOUR VOICE</label><select id="vAtc"${voices.length ? '' : ' disabled'}><option value="">Device default</option>${opt(V.atc)}</select>
    <label class="lbl" for="vPil">PILOTS</label><select id="vPil"${voices.length ? '' : ' disabled'}><option value="">Varied, one per aircraft</option>${opt(V.pil)}</select>
  </div>
  <p>${note}</p>
  <div class="cta"><button data-act="v-test"${syn ? '' : ' disabled'}>TEST</button><button class="pri" data-act="v-close">DONE</button></div>`;
}
MER.showAudio = () => { MER.audio(); cardOpen = true; MER.hold = true; render(); $('ov').hidden = false; };
$('ovCard').addEventListener('click', e => {
  if (!cardOpen) return; const b = e.target.closest('button'); if (!b) return;
  const sg = b.closest('.vseg'), act = b.dataset.act;
  if (sg) {
    const k = sg.dataset.k, i = +b.dataset.i;
    if (k === 'beeps') { if (MER.snd() !== !!i) MER.toggleSnd(); } else { V[k] = i; if (k === 'mode' && i === 0) MER.hush(); }
    save(); render();
  } else if (act === 'v-rate') { V.rate = Math.max(0.7, Math.min(2, Math.round((V.rate + 0.15 * +b.dataset.d) * 100) / 100)); save(); render(); }
  else if (act === 'v-vol') { V.vol = Math.max(0.1, Math.min(1, Math.round((V.vol + 0.1 * +b.dataset.d) * 10) / 10)); save(); render(); }
  else if (act === 'v-test') {
    MER.hush(); const m = V.mode, c = V.coach; V.mode = 2;
    MER.speak('atc', 'MRX482, turn left heading 270, descend and maintain 4,000, cleared ILS runway 27R approach.');
    MER.speak('pilot', 'Left 270, down to 4,000, cleared ILS 27R, MRX482.'); V.mode = m; V.coach = c;
  } else if (act === 'v-close') { cardOpen = false; MER.hold = false; $('ov').hidden = true; if (MER.afterAudio) MER.afterAudio(); }
});
$('ovCard').addEventListener('change', e => { if (!cardOpen) return; if (e.target.id === 'vAtc') V.atc = e.target.value; else if (e.target.id === 'vPil') V.pil = e.target.value; else return; save(); });
})();
