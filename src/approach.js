(() => {
'use strict';
const $ = id => document.getElementById(id);
const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const norm = h => ((h % 360) + 360) % 360;
const adiff = (a, b) => ((b - a + 540) % 360) - 180;          // signed turn from a to b, + = right
const hv = h => [Math.sin(h * D2R), Math.cos(h * D2R)];
const brg = (ax, ay, bx, by) => norm(Math.atan2(bx - ax, by - ay) / D2R);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const p2 = n => String(n).padStart(2, '0');
const p3 = n => String(Math.round(n)).padStart(3, '0');
const fmtH = h => { h = Math.round(norm(h)); if (h === 0) h = 360; return p3(h); };

/* ---------- world ---------- */
const G = 19.8;
const FIX = {
  ERMIN: { x: -G, y: G, t: 'gate' }, KODEL: { x: G, y: G, t: 'gate' }, VELIS: { x: G, y: -G, t: 'gate' }, PAXUM: { x: -G, y: -G, t: 'gate' },
  BRIXA: { x: 0, y: 28, t: 'exit' }, TAMRO: { x: 28, y: 0, t: 'exit' }, SUNDA: { x: 0, y: -28, t: 'exit' }, WOLTE: { x: -28, y: 0, t: 'exit' },
  EKKON: { x: 11, y: 0, t: 'fin' }, WEZEL: { x: -11, y: 0, t: 'fin' }, NIVEK: { x: -2.4, y: 12, t: 'fin' }, SOLEN: { x: -2.4, y: -11.5, t: 'fin' },
};
const GATES = ['ERMIN', 'KODEL', 'VELIS', 'PAXUM'], EXITS = ['BRIXA', 'TAMRO', 'SUNDA', 'WOLTE'];
const RW = {
  '09L': { thr: [-1, 0.6], hdg: 90, surf: 'A', len: 2 }, '27R': { thr: [1, 0.6], hdg: 270, surf: 'A', len: 2 },
  '09R': { thr: [-1, -0.6], hdg: 90, surf: 'B', len: 2 }, '27L': { thr: [1, -0.6], hdg: 270, surf: 'B', len: 2 },
  '18': { thr: [-2.4, 1.3], hdg: 180, surf: 'C', len: 2.2 }, '36': { thr: [-2.4, -0.9], hdg: 0, surf: 'C', len: 2.2 },
};
const FLOWS = {
  W: { name: 'WEST', rwys: ['27R', '27L'], lbl: '27L/R' }, E: { name: 'EAST', rwys: ['09L', '09R'], lbl: '09L/R' },
  N: { name: 'NORTH', rwys: ['36'], lbl: '36' }, S: { name: 'SOUTH', rwys: ['18'], lbl: '18' },
};
const MVA = [{ x: -14, y: 14, r: 5.5, mva: 5000 }, { x: 17, y: -12.5, r: 4.5, mva: 4000 }];
const TYPES = {
  C208: { wake: 'L', vmax: 170, vapp: 90, vmin: 110, climb: 1000, desc: 1200 },
  PC12: { wake: 'L', vmax: 230, vapp: 95, vmin: 120, climb: 1600, desc: 1500 },
  DH8D: { wake: 'M', vmax: 240, vapp: 120, vmin: 140, climb: 1800, desc: 1800 },
  E175: { wake: 'M', vmax: 250, vapp: 130, vmin: 160, climb: 2600, desc: 2200 },
  CRJ9: { wake: 'M', vmax: 250, vapp: 135, vmin: 160, climb: 2600, desc: 2200 },
  A320: { wake: 'M', vmax: 250, vapp: 137, vmin: 160, climb: 2500, desc: 2200 },
  B738: { wake: 'M', vmax: 250, vapp: 142, vmin: 165, climb: 2500, desc: 2200 },
  A21N: { wake: 'M', vmax: 250, vapp: 140, vmin: 165, climb: 2300, desc: 2100 },
  B763: { wake: 'H', vmax: 250, vapp: 140, vmin: 170, climb: 2200, desc: 2000 },
  A359: { wake: 'H', vmax: 250, vapp: 142, vmin: 170, climb: 2400, desc: 2000 },
  B77W: { wake: 'H', vmax: 250, vapp: 149, vmin: 175, climb: 2000, desc: 2000 },
  B748: { wake: 'H', vmax: 250, vapp: 152, vmin: 180, climb: 1800, desc: 1900 },
  A388: { wake: 'J', vmax: 250, vapp: 140, vmin: 175, climb: 1700, desc: 1900 },
};
const AIRLINES = [
  { c: 'MRX', w: 30, t: ['A320', 'B738', 'A21N', 'E175'] }, { c: 'NVA', w: 22, t: ['B738', 'A320', 'B763'] },
  { c: 'SKL', w: 18, t: ['E175', 'CRJ9', 'DH8D'] }, { c: 'PCF', w: 14, t: ['A359', 'B77W', 'A388', 'B763'] },
  { c: 'TRK', w: 8, t: ['B748', 'B763', 'B77W'] }, { c: 'N', w: 8, t: ['C208', 'PC12'] },
];
const WAKE = { J: { H: 6, M: 7, L: 8 }, H: { H: 4, M: 5, L: 6 }, M: { L: 4 } };
const XW_LIM = { L: 15, M: 28, H: 30, J: 30 };
const ARR_INT = [210, 135, 88], DEP_INT = [270, 175, 115];
const C = { scope: '#06131a', ring: 'rgba(126,161,166,.13)', bound: 'rgba(126,161,166,.4)', dim: '#7ea1a6', ink: '#d9ece9', arr: '#ecd27a', dep: '#69d2ee', sel: '#ffffff', warn: '#ff9f2e', alert: '#ff5546', ok: '#7fe3a4', rwy: '#d9ece9', line: '#24495a' };

/* ---------- state ---------- */
let S = null;
let pend = { hdg: null, alt: null, spd: null };
let sheetMode = null;
const view = { cx: 0, cy: 0, s: 8 };
let cvW = 300, cvH = 300, dpr = 1;
let best = 0;
try { best = +localStorage.getItem('meridian.best') || 0; } catch (e) {}

function newState(cfg) {
  return {
    cfg, t: 0, score: 0, pen: 0, ac: [], nid: 1, sel: null, log: [], logN: 0,
    wind: { dir: 280, spd: 11, tDir: 280, tSpd: 11, next: rnd(7, 11) * 60 },
    atis: { l: 0, dir: 280, spd: 11 }, flow: 'W', cells: [], inc: {},
    stats: { landed: 0, dep: 0, sep: 0, wake: 0, ga: 0, terr: 0, wx: 0, lost: 0, emg: 0 },
    nextArr: 50, nextDep: 70, nextEmg: rnd(7, 11) * 60, nextCell: 120,
    rate: 2, paused: true, started: false, over: null, depAlt: 0,
  };
}

/* ---------- radio log ---------- */
function say(who, text) {
  S.log.push({ t: S.t, who, text }); S.logN++;
  if (S.log.length > 80) S.log.shift();
  const spoken = S.started && MER.speak && MER.speak(who, text, S.rate);
  if (who === 'pilot' && !spoken) beep(880, 0.05, 0.015);
}
const sys = t => say('sys', t);
function addScore(n, why) { S.score += n; if (why) sys(`${n >= 0 ? '+' : ''}${n}  ${why}`); }

/* ---------- wind ---------- */
function windAt(alt) { const f = 1 + alt / 9000; const v = hv(S.wind.dir + 180); return [v[0] * S.wind.spd * f, v[1] * S.wind.spd * f]; }
function rwWind(id) { const d = (S.wind.dir - RW[id].hdg) * D2R; return { hw: S.wind.spd * Math.cos(d), xw: Math.abs(S.wind.spd * Math.sin(d)) }; }
function windStr() { return `${fmtH(Math.round(S.wind.dir / 10) * 10)}/${p2(Math.round(S.wind.spd))}`; }
function crab(trk, tas, alt) { const w = windAt(alt), t = hv(trk); const wp = w[0] * t[1] - w[1] * t[0]; return norm(trk + Math.asin(clamp(-wp / Math.max(tas, 60), -0.5, 0.5)) / D2R); }
function bestFlow() { let b = 'W', bv = -99; for (const k in FLOWS) { const v = rwWind(FLOWS[k].rwys[0]).hw + (FLOWS[k].rwys.length > 1 ? 1.5 : 0); if (v > bv) { bv = v; b = k; } } return b; }
function stepWind(dt) {
  const w = S.wind, wm = S.cfg.weather;
  if (wm > 0 && S.t > w.next) {
    w.tDir = norm(w.dir + pick([90, -90, 120, -120, 180, 60, -60])); w.tSpd = rnd(9, 22); w.next = S.t + rnd(9, 15) * 60;
    sys('Wind shift reported. Watch the runway flow.');
  }
  const d = adiff(w.dir, w.tDir); if (Math.abs(d) > 0.2) w.dir = norm(w.dir + Math.sign(d) * Math.min(Math.abs(d), 0.45 * dt));
  if (Math.abs(w.spd - w.tSpd) > 0.05) w.spd += Math.sign(w.tSpd - w.spd) * Math.min(Math.abs(w.tSpd - w.spd), 0.04 * dt);
  const a = S.atis;
  if (Math.abs(adiff(a.dir, w.dir)) > 25 || Math.abs(a.spd - w.spd) > 6) {
    a.l = (a.l + 1) % 26; a.dir = w.dir; a.spd = w.spd;
    sys(`ATIS information ${String.fromCharCode(65 + a.l)}: wind ${windStr()} kt.`);
  }
}
function stepCells(dt) {
  if (S.cfg.weather < 2) return;
  if (S.t > S.nextCell && S.cells.length < 3) {
    const up = hv(S.wind.dir), pr = [up[1], -up[0]], off = rnd(-20, 20);
    S.cells.push({ x: up[0] * 36 + pr[0] * off, y: up[1] * 36 + pr[1] * off, r: rnd(3, 5.5), v: rnd(18, 28) });
    S.nextCell = S.t + rnd(5, 9) * 60;
  }
  const dn = hv(S.wind.dir + 180);
  for (const c of S.cells) { c.x += dn[0] * c.v / 3600 * dt; c.y += dn[1] * c.v / 3600 * dt; }
  S.cells = S.cells.filter(c => Math.hypot(c.x, c.y) < 46);
}

/* ---------- traffic generation ---------- */
function pickFlight() {
  let r = Math.random() * 100, al = AIRLINES[0];
  for (const a of AIRLINES) { if (r < a.w) { al = a; break; } r -= a.w; }
  let cs;
  do {
    cs = al.c === 'N' ? 'N' + Math.floor(rnd(100, 999)) + pick('ABCDEFGHJKLMNPRSTUVWXY') + pick('ABCDEFGHJKLMNPRSTUVWXY') : al.c + Math.floor(rnd(10, al.c === 'TRK' ? 990 : 2900));
  } while (S.ac.some(a => a.cs === cs));
  return { cs, type: pick(al.t) };
}
function baseAc(kind) {
  const f = pickFlight();
  return { id: S.nid++, cs: f.cs, type: f.type, kind, x: 0, y: 0, alt: 0, hdg: 0, ias: 0, vs: 0, gs: 0, gvx: 0, gvy: 0, tAlt: 0, tSpd: 0, nav: { mode: 'hdg', hdg: 0 }, app: null, phase: 'air', rwy: null, assoc: null, exitFix: null, fuel: 9e9, emg: null, emgT: 0, exp: false, trail: [], trailT: 0, born: S.t, conf: 0, wakeW: false, terr: false, wx: false, wait: 0, minf: false };
}
function spawnArr(o = {}) {
  const order = o.gate ? [o.gate] : GATES.slice().sort(() => Math.random() - 0.5);
  for (const g of order) {
    const f = FIX[g], r = o.r || 32.5, k = r / 28, x = f.x * k, y = f.y * k;
    if (S.ac.some(b => b.phase === 'air' && dist(b.x, b.y, x, y) < 8)) continue;
    const a = baseAc('arr'), T = TYPES[a.type];
    a.x = x; a.y = y; a.alt = o.alt || pick([9000, 10000, 11000]); a.tAlt = a.alt;
    a.hdg = brg(x, y, 0, 0); a.ias = Math.min(T.vmax, 250); a.tSpd = a.ias;
    a.nav = r > 28.6 ? { mode: 'dct', fix: g } : { mode: 'hdg', hdg: Math.round(a.hdg) };
    a.gate = g;
    a.fuel = (Math.random() < 0.1 ? rnd(17, 21) : rnd(34, 55)) * 60;
    S.ac.push(a);
    if (!o.quiet) say('pilot', `Meridian Approach, ${a.cs}, ${a.type}, level ${a.alt / 1000 | 0},000 inbound ${g} with ${String.fromCharCode(65 + S.atis.l)}${a.fuel < 1300 ? ', fuel is tight' : ''}.`);
    return a;
  }
  return null;
}
function spawnDep(o = {}) {
  const gnd = S.ac.filter(a => a.kind === 'dep' && a.phase !== 'air');
  if (gnd.length >= 6) return null;
  const rwys = FLOWS[S.flow].rwys;
  const rwy = rwys.slice().sort((p, q) => gnd.filter(a => a.rwy === p).length - gnd.filter(a => a.rwy === q).length)[0];
  const a = baseAc('dep'), T = TYPES[a.type], rw = RW[rwy];
  a.phase = o.ready ? 'hold' : 'taxi'; a.readyT = rnd(25, 60); a.rwy = rwy;
  a.x = rw.thr[0]; a.y = rw.thr[1]; a.hdg = rw.hdg; a.tAlt = 5000; a.tSpd = T.vmax;
  a.nav = { mode: 'hdg', hdg: rw.hdg }; a.exitFix = pick(EXITS);
  S.ac.push(a);
  return a;
}
function stepTraffic() {
  const ramp = Math.max(0.7, 1 - S.t / 3600 * 0.3), tr = S.cfg.traffic;
  if (S.t > S.nextArr) { spawnArr(); S.nextArr = S.t + ARR_INT[tr] * ramp * rnd(0.6, 1.4); }
  if (S.t > S.nextDep) { spawnDep(); S.nextDep = S.t + DEP_INT[tr] * ramp * rnd(0.6, 1.4); }
  if (S.t > S.nextEmg) {
    S.nextEmg = S.t + rnd(8, 14) * 60;
    const deps = S.ac.filter(a => a.kind === 'dep' && a.phase === 'air' && a.alt < 6000 && !a.emg);
    const arrs = S.ac.filter(a => a.kind === 'arr' && a.phase === 'air' && a.nav.mode !== 'loc' && !a.emg);
    if (deps.length && Math.random() < 0.4) {
      const a = pick(deps); a.emg = 'ENG'; a.eng = true; a.emgT = S.t; a.kind = 'arr'; a.exitFix = null; a.fuel = 45 * 60;
      a.tAlt = Math.max(3000, Math.ceil(a.alt / 1000) * 1000); a.tSpd = Math.min(a.tSpd, 200); S.stats.emg++;
      say('pilot', `MAYDAY MAYDAY MAYDAY, ${a.cs}, engine failure, levelling ${a.tAlt / 1000 | 0},000, request immediate return.`); beep(520, 0.5, 0.04);
    } else if (arrs.length) {
      const a = pick(arrs); a.emg = 'MED'; a.emgT = S.t; S.stats.emg++;
      say('pilot', `PAN-PAN, ${a.cs}, medical emergency on board, request priority handling.`); beep(520, 0.5, 0.04);
    }
  }
}

/* ---------- geometry helpers ---------- */
function locGeom(a, rw) { const u = hv(rw.hdg), px = a.x - rw.thr[0], py = a.y - rw.thr[1]; return { d: -(px * u[0] + py * u[1]), xr: px * u[1] - py * u[0] }; }
function occupied(surf, except) { return S.ac.some(a => a !== except && (a.phase === 'lineup' || a.phase === 'roll' || a.phase === 'land') && RW[a.rwy].surf === surf); }
function removeAc(a) { S.ac = S.ac.filter(x => x !== a); if (S.sel === a.id) select(null); }
function gameOver(why) { if (S.over) return; S.over = why; S.paused = true; sys(why); beep(180, 1.2, 0.06); showOv('debrief'); }

/* ---------- commands ---------- */
function goAround(a, why, cmd) {
  const T = TYPES[a.type];
  a.nav = { mode: 'hdg', hdg: RW[a.rwy] ? RW[a.rwy].hdg : Math.round(a.hdg) }; a.app = null; a.tAlt = 3000; a.windChk = false;
  a.tSpd = clamp(200, T.vmin, T.vmax); a.assoc = a.rwy; S.stats.ga++; a.twr = false;
  if (!cmd) { say('pilot', `${a.cs}, going around, ${why}.`); addScore(-30, `${a.cs} went around`); }
}
function issue(a, c) {
  if (!a || !S.started || S.over) return;
  const T = TYPES[a.type], atc = [], rb = [], air = a.phase === 'air';
  const ground = a.phase === 'taxi' || a.phase === 'hold' || a.phase === 'lineup';
  if (a.phase === 'land') return;
  if (c.luaw) {
    if (a.phase !== 'hold') { sys(`${a.cs} is not holding short.`); }
    else if (occupied(RW[a.rwy].surf, a)) { sys(`Runway ${a.rwy} is occupied.`); }
    else { a.phase = 'lineup'; atc.push(`runway ${a.rwy}, line up and wait`); rb.push(`lining up ${a.rwy}`); }
  }
  if (c.takeoff) {
    if (a.phase !== 'hold' && a.phase !== 'lineup') { sys(`${a.cs} is not ready for departure.`); }
    else if (occupied(RW[a.rwy].surf, a)) { sys(`Runway ${a.rwy} is occupied.`); }
    else {
      a.phase = 'roll'; a.ias = 0; a.x = RW[a.rwy].thr[0]; a.y = RW[a.rwy].thr[1]; a.hdg = RW[a.rwy].hdg;
      if (a.wait > 240) addScore(-Math.min(50, Math.round((a.wait - 240) / 6)), `${a.cs} departure delay`);
      atc.push(`wind ${windStr()}, runway ${a.rwy}, cleared for takeoff`); rb.push(`cleared for takeoff ${a.rwy}`);
    }
  }
  if (c.ga && air && (a.app || a.nav.mode === 'loc')) {
    if (!a.rwy) a.rwy = a.app;
    goAround(a, '', true); addScore(-10, `${a.cs} sent around`);
    atc.push('go around, fly runway heading, climb and maintain 3,000'); rb.push('going around, runway heading, 3,000');
  }
  if (c.cancel && a.app) { a.app = null; if (a.nav.mode === 'loc') a.nav = { mode: 'hdg', hdg: Math.round(a.hdg) }; atc.push('cancel approach clearance'); rb.push('approach cancelled'); }
  if (c.hdg != null && isFinite(c.hdg)) {
    const h = norm(Math.round(c.hdg));
    if (a.nav.mode === 'loc') { a.app = null; atc.push('cancel approach clearance'); }
    const dir = c.dir || (adiff(a.hdg, h) >= 0 ? 'R' : 'L');
    a.nav = { mode: 'hdg', hdg: h, dir: c.dir || null };
    if (ground) { atc.push(`after departure fly heading ${fmtH(h)}`); rb.push(`after departure heading ${fmtH(h)}`); }
    else { const w = dir === 'R' ? 'right' : 'left'; atc.push(`turn ${w} heading ${fmtH(h)}`); rb.push(`${w} ${fmtH(h)}`); }
  }
  if (c.dct && FIX[c.dct]) {
    if (a.nav.mode === 'loc') { a.app = null; atc.push('cancel approach clearance'); }
    a.nav = { mode: 'dct', fix: c.dct };
    atc.push(`${ground ? 'after departure ' : ''}proceed direct ${c.dct}`); rb.push(`direct ${c.dct}`);
  }
  if (c.hold && FIX[c.hold] && !ground) {
    if (a.nav.mode === 'loc') { a.app = null; atc.push('cancel approach clearance'); }
    a.nav = { mode: 'hold', fix: c.hold, ph: 0, t: 0, out: 0 };
    atc.push(`hold at ${c.hold}, right turns, one minute legs`); rb.push(`hold at ${c.hold}`);
  }
  if (c.alt != null && isFinite(c.alt)) {
    const v = clamp(Math.round(c.alt / 100) * 100, 2000, 13000);
    if (a.nav.mode === 'loc' && a.nav.gs) { rb.push('unable altitude, established on the glidepath'); }
    else {
      const up = v > a.alt; a.tAlt = v;
      atc.push(`${ground ? 'initial climb' : up ? 'climb and maintain' : 'descend and maintain'} ${v.toLocaleString('en-US')}`);
      rb.push(`${ground ? 'initial' : up ? 'climb' : 'down to'} ${v.toLocaleString('en-US')}`);
    }
  }
  if (c.spd != null && isFinite(c.spd)) {
    const lo = a.nav.mode === 'loc' ? T.vapp : T.vmin, hi = a.eng ? Math.min(T.vmax, 200) : T.vmax;
    const req = Math.round(c.spd / 5) * 5, v = clamp(req, lo, hi);
    a.tSpd = v; atc.push(`${v < a.ias ? 'reduce' : 'increase'} speed to ${req}`);
    rb.push(v === req ? `speed ${v}` : `unable ${req}, ${v < req ? 'best speed' : 'minimum speed'} ${v}`);
  }
  if (c.ils && RW[c.ils] && air) {
    if (a.nav.mode === 'loc' && a.nav.rwy !== c.ils) a.nav = { mode: 'hdg', hdg: Math.round(a.hdg) };
    a.app = c.ils; a.thruNote = false;
    atc.push(`cleared ILS runway ${c.ils} approach`); rb.push(`cleared ILS ${c.ils}`);
  }
  if (c.exp && air) { a.exp = !a.exp; atc.push(a.exp ? 'expedite your altitude change' : 'resume normal rate'); rb.push(a.exp ? 'expediting' : 'normal rate'); }
  if (atc.length) say('atc', `${a.cs}, ${atc.join(', ')}.`);
  if (rb.length) { const s = rb.join(', '); say('pilot', `${s.charAt(0).toUpperCase() + s.slice(1)}, ${a.cs}.`); }
}

/* ---------- aircraft physics ---------- */
function stepAc(a, dt) {
  const T = TYPES[a.type];
  if (a.phase === 'taxi') { a.readyT -= dt; if (a.readyT <= 0) { a.phase = 'hold'; say('pilot', `${a.cs}, holding short runway ${a.rwy}, ready for departure to ${a.exitFix}.`); } return; }
  if (a.phase === 'hold' || a.phase === 'lineup') { a.wait += dt; return; }
  if (a.phase === 'roll') {
    const rw = RW[a.rwy], u = hv(rw.hdg);
    a.ias += 3.2 * dt; a.gs = a.ias; a.x += u[0] * a.ias / 3600 * dt; a.y += u[1] * a.ias / 3600 * dt;
    a.gvx = u[0] * a.ias / 3600; a.gvy = u[1] * a.ias / 3600;
    if (a.ias >= T.vapp + 5) { a.phase = 'air'; a.assoc = a.rwy; a.offT = S.t; }
    return;
  }
  if (a.phase === 'land') {
    const u = hv(RW[a.rwy].hdg);
    a.ias = Math.max(25, a.ias - 4 * dt); a.gs = a.ias; a.x += u[0] * a.ias / 3600 * dt; a.y += u[1] * a.ias / 3600 * dt; a.gvx = a.gvy = 0;
    if (a.ias <= 25) { a.vac = (a.vac || 0) + dt; if (a.vac > 9) removeAc(a); }
    return;
  }
  /* airborne */
  const tas = a.ias * (1 + a.alt / 1000 * 0.017);
  if (a.app && a.nav.mode !== 'loc') {
    const rw = RW[a.app], g = locGeom(a, rw), ia = Math.abs(adiff(a.hdg, rw.hdg));
    const r = (tas / 3600) / (3 * D2R), lead = r * (1 - Math.cos(Math.min(ia, 90) * D2R)) + 0.12;
    if (g.d > 1.5 && g.d < 26 && Math.abs(g.xr) <= lead) {
      if (ia <= 50) { a.nav = { mode: 'loc', rwy: a.app, gs: false }; a.rwy = a.app; a.assoc = a.app; a.windChk = false; say('pilot', `${a.cs}, established localizer ${a.app}.`); }
      else if (!a.thruNote && Math.abs(g.xr) < 0.3) { a.thruNote = true; say('pilot', `${a.cs}, unable to intercept at this angle, flying through the localizer.`); }
    }
  }
  const n = a.nav;
  let dh = a.hdg, altT = a.tAlt, spdT = a.tSpd, descMax = T.desc, force = null, gsMode = false;
  if (n.mode === 'hdg') dh = n.hdg;
  else if (n.mode === 'dct') {
    const f = FIX[n.fix];
    if (dist(a.x, a.y, f.x, f.y) < 0.5) { a.nav = { mode: 'hdg', hdg: Math.round(a.hdg) }; dh = a.hdg; }
    else dh = crab(brg(a.x, a.y, f.x, f.y), tas, a.alt);
  } else if (n.mode === 'hold') {
    const f = FIX[n.fix], b = brg(a.x, a.y, f.x, f.y);
    if (n.ph === 0) { dh = crab(b, tas, a.alt); if (dist(a.x, a.y, f.x, f.y) < 0.5) { n.ph = 1; n.out = norm(a.hdg + 180); } }
    else if (n.ph === 1) { dh = n.out; force = 'R'; if (Math.abs(adiff(a.hdg, n.out)) < 4) { n.ph = 2; n.t = 60; } }
    else if (n.ph === 2) { dh = n.out; n.t -= dt; if (n.t <= 0) n.ph = 3; }
    else { dh = b; force = 'R'; if (Math.abs(adiff(a.hdg, b)) < 12) n.ph = 0; }
  } else if (n.mode === 'loc') {
    const rw = RW[n.rwy], g = locGeom(a, rw), gsAlt = Math.max(0, g.d) * 318;
    a.dFin = g.d;
    dh = crab(norm(rw.hdg - clamp(g.xr * 28, -32, 32)), tas, a.alt);
    if (!n.gs && a.alt >= gsAlt - 40) n.gs = true;
    if (n.gs) { altT = Math.min(a.alt, gsAlt); descMax = Math.max(T.desc * 1.4, 1500); gsMode = true; }
    if (g.d < 6) spdT = T.vapp;
    if (g.d < 8 && !a.twr) { a.twr = true; say('atc', `${a.cs}, contact tower 118.7.`); say('pilot', `Tower 118.7, good day, ${a.cs}.`); }
    if (g.d < 4 && a.alt - gsAlt > 500) { goAround(a, 'too high on the glidepath'); return; }
    if (g.d < 2.5 && a.ias > T.vapp + 22) { goAround(a, 'unstable, too fast'); return; }
    if (g.d < 1 && !a.windChk) {
      a.windChk = true; const w = rwWind(n.rwy);
      if (-w.hw > 10) { goAround(a, `tailwind ${Math.round(-w.hw)} knots, out of limits`); return; }
      if (w.xw > XW_LIM[T.wake]) { goAround(a, `crosswind ${Math.round(w.xw)} knots, out of limits`); return; }
    }
    if (g.d < 0.6 && occupied(rw.surf, a)) { goAround(a, 'runway occupied'); return; }
    if (g.d <= 0.03) {
      a.phase = 'land'; a.alt = 0; a.vs = 0; a.hdg = rw.hdg; a.x = rw.thr[0]; a.y = rw.thr[1]; a.conf = 0;
      S.stats.landed++;
      let pts = a.kind === 'arr' ? Math.max(40, 100 - Math.max(0, Math.round((S.t - a.born - 900) / 6))) : 20;
      if (a.emg) pts += Math.max(40, Math.round(200 - Math.max(0, S.t - a.emgT - 480) * 0.4));
      addScore(pts, `${a.cs} landed ${n.rwy}${a.emg ? ' (emergency)' : ''}`);
      return;
    }
  }
  if (a.offT != null && a.alt < 400) { dh = a.hdg; } else if (a.offT != null && a.alt >= 400) a.offT = null;
  /* turn */
  const df = adiff(a.hdg, dh);
  if (Math.abs(df) > 0.01) {
    let sg = Math.sign(df); const dir = force || n.dir;
    if (dir && Math.abs(df) > 8) sg = dir === 'R' ? 1 : -1; else if (n.dir) n.dir = null;
    const rate = (a.ias > 230 ? 2.4 : 3) * dt;
    a.hdg = (Math.abs(df) <= rate && sg === Math.sign(df)) ? norm(dh) : norm(a.hdg + sg * rate);
  }
  /* speed */
  const lo = n.mode === 'loc' ? T.vapp : T.vmin, hi = a.eng ? Math.min(T.vmax, 200) : T.vmax;
  spdT = clamp(spdT, lo, hi);
  a.ias = a.ias < spdT ? Math.min(spdT, a.ias + 1.6 * dt) : Math.max(spdT, a.ias - 1.3 * dt);
  /* altitude */
  let na;
  if (a.alt < altT) na = Math.min(altT, a.alt + T.climb * (a.eng ? 0.35 : 1) * (a.alt > 8000 ? 0.8 : 1) * (a.exp ? 1.4 : 1) / 60 * dt);
  else na = Math.max(altT, a.alt - descMax * (a.exp && !gsMode ? 1.5 : 1) / 60 * dt);
  a.vs = (na - a.alt) / dt; a.alt = na;
  /* move */
  const w = windAt(a.alt), h = hv(a.hdg);
  a.gvx = (tas * h[0] + w[0]) / 3600; a.gvy = (tas * h[1] + w[1]) / 3600;
  a.x += a.gvx * dt; a.y += a.gvy * dt; a.gs = Math.hypot(a.gvx, a.gvy) * 3600;
  a.trailT += dt; if (a.trailT >= 5) { a.trailT = 0; a.trail.push([a.x, a.y]); if (a.trail.length > 6) a.trail.shift(); }
  if (a.kind === 'dep' && !a.chk && a.alt > 1000) { a.chk = true; say('pilot', `Meridian Departure, ${a.cs}, passing ${(Math.round(a.alt / 100) * 100).toLocaleString('en-US')}, climbing ${a.tAlt.toLocaleString('en-US')}.`); }
  const rr = Math.hypot(a.x, a.y);
  if (a.assoc && n.mode !== 'loc' && (a.alt >= 3000 || rr > 6)) a.assoc = null;
  /* fuel */
  if (a.kind === 'arr') {
    a.fuel -= dt;
    if (!a.minf && a.fuel < 720) { a.minf = true; say('pilot', `${a.cs}, minimum fuel.`); }
    if (a.emg !== 'FUEL' && a.fuel < 330) { if (!a.emg) { a.emgT = S.t; S.stats.emg++; } a.emg = 'FUEL'; say('pilot', `MAYDAY MAYDAY MAYDAY, ${a.cs}, fuel emergency, ${Math.max(1, Math.round(a.fuel / 60))} minutes remaining.`); beep(520, 0.5, 0.04); }
    if (a.fuel <= 0) { gameOver(`${a.cs} ran out of fuel.`); return; }
  }
  /* leaving the sector */
  if (rr > 30.5 && a.x * a.gvx + a.y * a.gvy > 0) {
    if (a.kind === 'dep') {
      const f = FIX[a.exitFix];
      if (dist(a.x, a.y, f.x, f.y) < 6 && a.alt >= 7000) { say('atc', `${a.cs}, contact Meridian Centre 132.4, good day.`); say('pilot', `132.4, good day, ${a.cs}.`); S.stats.dep++; addScore(80, `${a.cs} handed off at ${a.exitFix}`); }
      else { S.stats.lost++; addScore(-60, `${a.cs} left ${a.alt < 7000 ? 'below 7,000' : 'away from ' + a.exitFix}`); }
    } else { S.stats.lost++; addScore(-150, `${a.cs} left your airspace without landing`); }
    removeAc(a);
  }
}

/* ---------- safety nets ---------- */
function towerOwned(a) { return a.alt < 1000 && Math.hypot(a.x, a.y) < 4.5; }
function exempt(a, b) {
  if (towerOwned(a) || towerOwned(b)) return true;
  if (a.assoc && b.assoc) { const ra = RW[a.assoc], rb = RW[b.assoc]; if (ra.surf !== rb.surf && ra.surf !== 'C' && rb.surf !== 'C' && ra.hdg === rb.hdg) return true; }
  return false;
}
function predAlt(a, t) { const v = a.alt + a.vs * t; if (a.nav.mode === 'loc' && a.nav.gs) return Math.max(0, v); return a.vs > 0 ? Math.min(v, a.tAlt) : a.vs < 0 ? Math.max(v, a.tAlt) : v; }
function checkSafety(dt) {
  const air = S.ac.filter(a => a.phase === 'air');
  for (const a of air) { a.conf = 0; a.wakeW = false; a.cw = null; }
  for (let i = 0; i < air.length; i++) for (let j = i + 1; j < air.length; j++) {
    const a = air[i], b = air[j]; if (exempt(a, b)) continue;
    const dl = dist(a.x, a.y, b.x, b.y), dv = Math.abs(a.alt - b.alt), key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id;
    if (dl < 0.15 && dv < 150) { gameOver(`Mid-air collision: ${a.cs} and ${b.cs}.`); return; }
    if (dl < 3 && dv < 950) {
      a.conf = b.conf = 2; a.cw = b.cs; b.cw = a.cs; S.pen += 4 * dt;
      if (!S.inc[key]) { S.inc[key] = 1; S.stats.sep++; addScore(-50, `Separation lost: ${a.cs} / ${b.cs} (${dl.toFixed(1)} nm, ${Math.round(dv / 100) * 100} ft)`); }
    } else {
      if (S.inc[key] && (dl > 3.6 || dv >= 1000)) delete S.inc[key];
      if (dl < 14) for (let t = 10; t <= 70; t += 10) {
        const d2 = dist(a.x + a.gvx * t, a.y + a.gvy * t, b.x + b.gvx * t, b.y + b.gvy * t);
        if (d2 < 3 && Math.abs(predAlt(a, t) - predAlt(b, t)) < 950) { a.conf = Math.max(a.conf, 1); b.conf = Math.max(b.conf, 1); if (!a.cw) a.cw = b.cs; if (!b.cw) b.cw = a.cs; break; }
      }
    }
  }
  /* wake on final */
  for (const id in RW) {
    const l = air.filter(a => a.nav.mode === 'loc' && a.nav.rwy === id).sort((p, q) => p.dFin - q.dFin);
    for (let k = 1; k < l.length; k++) {
      const ld = l[k - 1], f = l[k], req = (WAKE[TYPES[ld.type].wake] || {})[TYPES[f.type].wake] || 3, gap = f.dFin - ld.dFin;
      if (req > 3 && gap < req && !towerOwned(ld)) {
        f.wakeW = true; const key = 'w' + ld.id + '-' + f.id;
        if (gap >= 3 && !S.inc[key]) { S.inc[key] = 1; S.stats.wake++; addScore(-40, `Wake spacing: ${f.cs} is ${gap.toFixed(1)} nm behind ${ld.cs}, needs ${req}`); }
      }
    }
  }
  /* terrain and weather */
  for (const a of air) {
    let terr = false, wx = false;
    if (!(a.nav.mode === 'loc' && a.nav.gs)) for (const m of MVA) if (dist(a.x, a.y, m.x, m.y) < m.r) {
      if (a.alt < m.mva - 1000) { gameOver(`${a.cs} struck terrain.`); return; }
      if (a.alt < m.mva - 50) terr = true;
    }
    for (const c of S.cells) if (dist(a.x, a.y, c.x, c.y) < c.r * 0.75) wx = true;
    if (terr) { S.pen += 3 * dt; if (!a.terr) { S.stats.terr++; sys(`LOW ALTITUDE ALERT ${a.cs}: below the minimum vectoring altitude.`); beep(660, 0.3, 0.04); } }
    if (wx) { S.pen += 2 * dt; if (!a.wx) { S.stats.wx++; say('pilot', `${a.cs}, severe turbulence in this cell, request vectors clear of weather.`); } }
    a.terr = terr; a.wx = wx;
  }
  if (S.pen >= 1) { const n = Math.floor(S.pen); S.pen -= n; S.score -= n; }
}

function setFlow(k) {
  if (!FLOWS[k] || k === S.flow) return;
  S.flow = k; sys(`Runway flow now ${FLOWS[k].name}: departures use ${FLOWS[k].lbl}.`);
  let i = 0;
  for (const a of S.ac) if (a.kind === 'dep' && (a.phase === 'taxi' || a.phase === 'hold')) {
    const r = FLOWS[k].rwys[i++ % FLOWS[k].rwys.length], rw = RW[r];
    if (a.nav.mode === 'hdg' && a.nav.hdg === RW[a.rwy].hdg) a.nav = { mode: 'hdg', hdg: rw.hdg };
    a.rwy = r; a.x = rw.thr[0]; a.y = rw.thr[1]; a.hdg = rw.hdg; a.phase = 'taxi'; a.readyT = rnd(60, 100);
  }
}

function step(dt) {
  S.t += dt;
  stepWind(dt); stepCells(dt); stepTraffic();
  for (const a of S.ac.slice()) { stepAc(a, dt); if (S.over) return; }
  checkSafety(dt);
}

/* ---------- sound ---------- */
let AC = null, sndOn = true, lastCA = 0;
function beep(f, d, v) {
  if (!sndOn || !AC) return;
  try { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.value = v || 0.03; o.connect(g); g.connect(AC.destination); o.start(); g.gain.setTargetAtTime(0, AC.currentTime + d * 0.6, 0.03); o.stop(AC.currentTime + d + 0.15); } catch (e) {}
}

/* ---------- scope drawing ---------- */
const cv = $('scope'), ctx = cv.getContext('2d'), wrap = $('scopeWrap');
const ts = (x, y) => [cvW / 2 + (x - view.cx) * view.s, cvH / 2 - (y - view.cy) * view.s];
const tw = (sx, sy) => [(sx - cvW / 2) / view.s + view.cx, -(sy - cvH / 2) / view.s + view.cy];
function fit() { view.cx = 0; view.cy = 0; view.s = Math.max(3, Math.min(cvW, cvH) / 64); }
function resize() {
  const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  const first = cvW === 300 && cvH === 300;
  cvW = r.width; cvH = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(cvW * dpr); cv.height = Math.round(cvH * dpr);
  if (first) fit();
}
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
function acColor(a) { return a.conf === 2 || a.terr || a.emg ? C.alert : a.conf === 1 || a.wakeW || a.wx ? C.warn : a.kind === 'arr' ? C.arr : C.dep; }
let drag = null;

function draw() {
  const W = cvW, H = cvH, s = view.s, sel = selAc();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.scope; ctx.fillRect(0, 0, W, H);
  const fs = W < 600 ? 10 : 11, mono = `${fs}px "B612 Mono", ui-monospace, Menlo, monospace`;
  ctx.font = mono; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 1;
  const [ox, oy] = ts(0, 0);
  /* range rings */
  for (const r of [10, 20, 30]) {
    ctx.strokeStyle = r === 30 ? C.bound : C.ring; ctx.setLineDash(r === 30 ? [] : [2, 5]); circ(ox, oy, r * s);
    ctx.fillStyle = 'rgba(126,161,166,.5)'; ctx.fillText(String(r), ox + 3, oy - r * s - 3);
  }
  ctx.setLineDash([]);
  /* terrain */
  for (const m of MVA) {
    const [mx, my] = ts(m.x, m.y);
    ctx.fillStyle = 'rgba(190,150,110,.07)'; ctx.beginPath(); ctx.arc(mx, my, m.r * s, 0, 6.3); ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,120,.5)'; ctx.setLineDash([5, 4]); circ(mx, my, m.r * s); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(214,176,138,.8)'; ctx.textAlign = 'center'; ctx.fillText('MVA ' + m.mva / 100, mx, my + 4); ctx.textAlign = 'left';
  }
  /* weather */
  for (const c of S.cells) {
    const [wx, wy] = ts(c.x, c.y), r = c.r * s, g = ctx.createRadialGradient(wx, wy, 0, wx, wy, r);
    g.addColorStop(0, 'rgba(255,80,120,.38)'); g.addColorStop(0.4, 'rgba(240,200,70,.24)'); g.addColorStop(0.75, 'rgba(70,190,120,.17)'); g.addColorStop(1, 'rgba(70,190,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx, wy, r, 0, 6.3); ctx.fill();
  }
  /* extended centrelines + runways */
  const act = FLOWS[S.flow].rwys;
  for (const id in RW) {
    const rw = RW[id], u = hv(rw.hdg), on = act.includes(id) || (sel && (sel.app === id || (sel.nav.mode === 'loc' && sel.nav.rwy === id)));
    const [x0, y0] = ts(rw.thr[0], rw.thr[1]), [x1, y1] = ts(rw.thr[0] - u[0] * 15, rw.thr[1] - u[1] * 15);
    ctx.strokeStyle = on ? 'rgba(217,236,233,.5)' : 'rgba(126,161,166,.16)'; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    if (on) for (const d of [5, 10, 15]) {
      const [tx, ty] = ts(rw.thr[0] - u[0] * d, rw.thr[1] - u[1] * d), k = 0.35 * s;
      ctx.beginPath(); ctx.moveTo(tx - u[1] * k, ty - u[0] * k); ctx.lineTo(tx + u[1] * k, ty + u[0] * k); ctx.stroke();
    }
  }
  ctx.strokeStyle = C.rwy; ctx.lineWidth = Math.max(2, 0.14 * s);
  for (const id of ['09L', '09R', '36']) {
    const rw = RW[id], u = hv(rw.hdg), [x0, y0] = ts(rw.thr[0], rw.thr[1]), [x1, y1] = ts(rw.thr[0] + u[0] * rw.len, rw.thr[1] + u[1] * rw.len);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.lineWidth = 1;
  if (s > 14) { ctx.fillStyle = C.dim; for (const id in RW) { const rw = RW[id], u = hv(rw.hdg), [x, y] = ts(rw.thr[0] - u[0] * 0.5, rw.thr[1] - u[1] * 0.5); ctx.textAlign = 'center'; ctx.fillText(id, x, y + 4); } ctx.textAlign = 'left'; }
  /* fixes */
  for (const nm in FIX) {
    const f = FIX[nm], [fx, fy] = ts(f.x, f.y), hot = sel && (sel.exitFix === nm || (sel.nav.fix === nm));
    ctx.strokeStyle = ctx.fillStyle = hot ? C.sel : f.t === 'gate' ? 'rgba(236,210,122,.6)' : f.t === 'exit' ? 'rgba(105,210,238,.65)' : 'rgba(126,161,166,.8)';
    ctx.beginPath();
    if (f.t === 'fin') { ctx.moveTo(fx - 3, fy - 3); ctx.lineTo(fx + 3, fy + 3); ctx.moveTo(fx + 3, fy - 3); ctx.lineTo(fx - 3, fy + 3); }
    else { ctx.moveTo(fx, fy - 5); ctx.lineTo(fx + 4.5, fy + 3.5); ctx.lineTo(fx - 4.5, fy + 3.5); ctx.closePath(); }
    ctx.stroke(); ctx.fillText(nm, fx + 7, fy + 4);
  }
  /* queued departures at each threshold */
  for (const id in RW) {
    const q = S.ac.filter(a => (a.phase === 'taxi' || a.phase === 'hold') && a.rwy === id).length;
    if (q) { const rw = RW[id], u = hv(rw.hdg), [x, y] = ts(rw.thr[0] - u[0] * 0.2, rw.thr[1] - u[1] * 0.2); ctx.fillStyle = C.dep; ctx.fillText('DEP ' + q, x + (u[0] > 0 ? -44 : 6), y + (rw.surf === 'A' ? -8 : 16)); }
  }
  /* selected: route, halo */
  if (sel && sel.phase === 'air') {
    const [ax, ay] = ts(sel.x, sel.y);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 4]); circ(ax, ay, 3 * s);
    const n = sel.nav; ctx.beginPath(); ctx.moveTo(ax, ay);
    if (n.fix) { const f = FIX[n.fix], [fx, fy] = ts(f.x, f.y); ctx.lineTo(fx, fy); }
    else if (n.mode === 'hdg') { const u = hv(n.hdg); const [hx, hy] = ts(sel.x + u[0] * 8, sel.y + u[1] * 8); ctx.lineTo(hx, hy); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  /* aircraft */
  const placed = [], lh = fs + 2;
  const shown = S.ac.filter(a => a.phase === 'air' || a.phase === 'lineup' || a.phase === 'roll' || a.phase === 'land');
  for (const a of shown) { const p = ts(a.x, a.y); a._sx = p[0]; a._sy = p[1]; placed.push([p[0] - 6, p[1] - 6, 12, 12]); }
  for (const a of shown) {
    const isSel = a.id === S.sel, col = isSel && a.conf < 2 && !a.terr ? C.sel : acColor(a), x = a._sx, y = a._sy;
    if (x < -80 || y < -80 || x > W + 80 || y > H + 80) continue;
    ctx.fillStyle = col; ctx.strokeStyle = col;
    if (a.phase === 'air') {
      ctx.globalAlpha = 0.5; for (let i = 0; i < a.trail.length; i++) { const [tx, ty] = ts(a.trail[i][0], a.trail[i][1]); ctx.fillRect(tx - 1, ty - 1, 2, 2); } ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + a.gvx * 60 * s, y - a.gvy * 60 * s); ctx.stroke();
      if (a.conf) { ctx.strokeStyle = a.conf === 2 ? C.alert : C.warn; circ(x, y, 1.5 * s); ctx.strokeStyle = col; }
    }
    if (a.kind === 'arr') { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 6.3); ctx.fill(); } else ctx.fillRect(x - 3.5, y - 3.5, 7, 7);
    if (isSel) { ctx.strokeStyle = C.sel; ctx.strokeRect(x - 7, y - 7, 14, 14); }
    /* data block */
    const T = TYPES[a.type], lines = [a.cs + (a.emg ? ' EM' : a.minf ? ' MINF' : '')];
    if (a.phase === 'air') {
      const ar = a.vs > 2 ? '↑' : a.vs < -2 ? '↓' : '=';
      lines.push(`${p3(a.alt / 100)}${ar}${p3((a.nav.mode === 'loc' && a.nav.gs ? 0 : a.tAlt) / 100)} ${p2(Math.round(a.gs / 10))}`);
      lines.push(`${a.type}/${T.wake} ${a.kind === 'dep' ? a.exitFix : a.nav.mode === 'loc' ? 'I' + a.nav.rwy : a.app ? '>' + a.app : ''}`);
    } else lines.push(a.phase === 'lineup' ? 'LINED UP' : a.phase === 'roll' ? 'ROLLING' : 'LANDED');
    const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 4, bh = lines.length * lh + 2;
    const cand = [[12, -12 - bh], [12, 10], [-12 - bw, -12 - bh], [-12 - bw, 10], [-bw / 2, -22 - bh], [-bw / 2, 20]];
    let bx = x + cand[0][0], by = y + cand[0][1];
    for (const c of cand) { const rx = x + c[0], ry = y + c[1]; if (!placed.some(p => rx < p[0] + p[2] && rx + bw > p[0] && ry < p[1] + p[3] && ry + bh > p[1])) { bx = rx; by = ry; break; } }
    placed.push([bx, by, bw, bh]);
    ctx.strokeStyle = 'rgba(126,161,166,.5)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(clamp(x, bx, bx + bw), clamp(y, by, by + bh)); ctx.stroke();
    ctx.fillStyle = col; lines.forEach((l, i) => ctx.fillText(l, bx + 2, by + (i + 1) * lh - 2));
  }
  /* tutorial pointer */
  if (S.tut && S.started) {
    const st = TUT[S.tut.i], id = st && st.ring ? S.tut[st.ring] : null, a = id != null && S.ac.find(q => q.id === id);
    if (a && a.phase !== 'taxi' && a.phase !== 'hold') { const [x, y] = ts(a.x, a.y); ctx.strokeStyle = C.arr; ctx.lineWidth = 2; circ(x, y, 17 + 4 * Math.sin(performance.now() / 180)); ctx.lineWidth = 1; }
  }
  /* vector drag preview */
  if (drag && drag.type === 'vec' && drag.moved) {
    const a = S.ac.find(q => q.id === drag.id);
    if (a) {
      const [ax, ay] = ts(a.x, a.y); let ex = drag.x, ey = drag.y, lab;
      if (drag.fix) { const f = FIX[drag.fix]; [ex, ey] = ts(f.x, f.y); lab = 'DIRECT ' + drag.fix; } else lab = 'HDG ' + fmtH(drag.hdg);
      ctx.strokeStyle = C.sel; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = `700 ${fs + 2}px "B612 Mono", ui-monospace, monospace`; const tw2 = ctx.measureText(lab).width;
      const lx = clamp(ex - tw2 / 2, 4, W - tw2 - 8), ly = Math.max(20, ey - 34);
      ctx.fillStyle = 'rgba(6,19,26,.9)'; ctx.fillRect(lx - 4, ly - fs - 4, tw2 + 8, fs + 10); ctx.fillStyle = C.sel; ctx.fillText(lab, lx, ly); ctx.font = mono;
    }
  }
  if (S.paused && S.started && !S.over) { ctx.fillStyle = 'rgba(255,159,46,.9)'; ctx.font = `700 12px "B612", sans-serif`; ctx.textAlign = 'center'; ctx.fillText('PAUSED', W / 2, H - 40); ctx.textAlign = 'left'; }
}

/* ---------- pointer input ---------- */
const ptrs = new Map();
function hitAc(x, y) { let b = null, bd = 26; for (const a of S.ac) { if (a.phase === 'taxi' || a.phase === 'hold') continue; const p = ts(a.x, a.y), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = a; } } return b; }
function hitFix(x, y) { let b = null, bd = 20; for (const nm in FIX) { const p = ts(FIX[nm].x, FIX[nm].y), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = nm; } } return b; }
function ptr(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
cv.addEventListener('pointerdown', e => {
  const [x, y] = ptr(e); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  ptrs.set(e.pointerId, [x, y]);
  if (ptrs.size === 2) { const p = [...ptrs.values()]; drag = { type: 'pinch', d0: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) || 1, s0: view.s, w: tw((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2) }; return; }
  const h = hitAc(x, y);
  if (h && h.phase === 'air') drag = { type: 'vec', id: h.id, x0: x, y0: y, x, y, moved: false };
  else drag = { type: 'pan', x0: x, y0: y, cx0: view.cx, cy0: view.cy, moved: false, hit: h ? h.id : null };
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId) || !drag) return;
  const [x, y] = ptr(e); ptrs.set(e.pointerId, [x, y]);
  if (drag.type === 'pinch') {
    if (ptrs.size < 2) return; const p = [...ptrs.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2;
    view.s = clamp(drag.s0 * d / drag.d0, 3, 60); view.cx = drag.w[0] - (mx - cvW / 2) / view.s; view.cy = drag.w[1] + (my - cvH / 2) / view.s; return;
  }
  if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > (drag.type === 'vec' ? 14 : 7)) { drag.moved = true; if (drag.type === 'vec') select(drag.id); }
  if (!drag.moved) return;
  if (drag.type === 'pan') { view.cx = clamp(drag.cx0 - (x - drag.x0) / view.s, -34, 34); view.cy = clamp(drag.cy0 + (y - drag.y0) / view.s, -34, 34); }
  else { drag.x = x; drag.y = y; const a = S.ac.find(q => q.id === drag.id); if (a) { drag.fix = hitFix(x, y); const w = tw(x, y); drag.hdg = Math.round(brg(a.x, a.y, w[0], w[1]) / 5) * 5; } }
});
function ptrEnd(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  const d = drag; if (!d) return;
  if (d.type === 'pinch') { if (ptrs.size < 2) drag = null; return; }
  drag = null; if (e.type === 'pointercancel') return;
  if (d.type === 'vec') {
    const a = S.ac.find(q => q.id === d.id); if (!a) return;
    if (!d.moved) { select(a.id); return; }
    clearPend(); if (d.fix) issue(a, { dct: d.fix }); else if (d.hdg != null) issue(a, { hdg: d.hdg });
  } else if (!d.moved) select(d.hit);
}
cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
function zoomAt(f, sx, sy) { const w = tw(sx, sy); view.s = clamp(view.s * f, 3, 60); view.cx = w[0] - (sx - cvW / 2) / view.s; view.cy = w[1] + (sy - cvH / 2) / view.s; }
cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = ptr(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
$('zIn').onclick = () => zoomAt(1.35, cvW / 2, cvH / 2); $('zOut').onclick = () => zoomAt(1 / 1.35, cvW / 2, cvH / 2); $('zFit').onclick = fit;

/* ---------- panels ---------- */
const selAc = () => S.sel == null ? null : S.ac.find(a => a.id === S.sel) || null;
function clearPend() { pend = { hdg: null, alt: null, spd: null }; }
function select(id) { if (S.sel !== id) { clearPend(); closeSheet(); } S.sel = id; updUI(true); }
function statusOf(a) {
  if (a.phase === 'taxi') return `TAXI ${a.rwy}`; if (a.phase === 'hold') return `READY ${a.rwy}`;
  if (a.phase === 'lineup') return `LINED UP ${a.rwy}`; if (a.phase === 'roll') return 'ROLLING'; if (a.phase === 'land') return 'LANDED';
  const n = a.nav, ar = a.vs > 2 ? '↑' : a.vs < -2 ? '↓' : '=';
  const nv = n.mode === 'loc' ? `ILS ${n.rwy} ${Math.max(0, a.dFin || 0).toFixed(0)}NM` : n.mode === 'hold' ? `HOLD ${n.fix}` : n.mode === 'dct' ? `>${n.fix}` : `H${fmtH(n.hdg)}`;
  return `${p3(a.alt / 100)}${ar}${p3((n.mode === 'loc' && n.gs ? 0 : a.tAlt) / 100)} ${nv}${a.app && n.mode !== 'loc' ? ' >I' + a.app : ''}`;
}
function flagOf(a) { return a.conf === 2 ? 'CONFLICT' : a.terr ? 'LOW ALT' : a.emg ? (a.emg === 'FUEL' ? 'MAYDAY FUEL' : a.emg === 'ENG' ? 'MAYDAY ENG' : 'PAN MED') : a.conf === 1 ? 'TRAFFIC' : a.wakeW ? 'WAKE' : a.wx ? 'WEATHER' : a.minf ? 'MIN FUEL' : ''; }
const stripEls = new Map();
function updStrips() {
  const box = $('strips'), seen = new Set();
  $('stripsEmpty').hidden = S.ac.length > 0;
  for (const a of S.ac) {
    seen.add(a.id); let el = stripEls.get(a.id);
    if (!el) { el = document.createElement('button'); el.dataset.id = a.id; el.innerHTML = '<span class="s1"><b></b><i></i></span><span class="s2"></span>'; box.appendChild(el); stripEls.set(a.id, el); }
    const flag = flagOf(a), sev = a.conf === 2 || a.terr || a.emg ? ' alert' : flag ? ' warn' : '';
    const cls = `strip ${a.kind}${a.id === S.sel ? ' sel' : ''}${sev}${a.phase === 'hold' ? ' ready' : ''}${tutStrip === a.id ? ' tut-hl' : ''}`;
    if (el.className !== cls) el.className = cls;
    const t1 = a.cs, t2 = `${a.type}/${TYPES[a.type].wake}${a.exitFix ? ' ' + a.exitFix : ''}`, t3 = (flag ? flag + ' ' : '') + statusOf(a);
    const b = el.firstChild.firstChild, i = el.firstChild.lastChild, s2 = el.lastChild;
    if (b.textContent !== t1) b.textContent = t1; if (i.textContent !== t2) i.textContent = t2; if (s2.textContent !== t3) s2.textContent = t3;
    const air = a.phase === 'air';
    const rank = a.conf === 2 || a.terr ? 0 : a.emg ? 1 : a.phase === 'hold' || a.phase === 'lineup' ? 2 : air && a.kind === 'arr' ? 300 + Math.round(Math.hypot(a.x, a.y) * 10) : air ? 700 : a.phase === 'taxi' ? 800 : 900;
    if (el.style.order !== String(rank)) el.style.order = rank;
  }
  for (const [id, el] of stripEls) if (!seen.has(id)) { el.remove(); stripEls.delete(id); }
}
$('strips').addEventListener('click', e => { const el = e.target.closest('.strip'); if (!el) return; const id = +el.dataset.id; select(S.sel === id ? null : id); });

let logSeen = -1;
function updLog() {
  if (logSeen === S.logN) return; logSeen = S.logN;
  const box = $('log'), stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
  box.textContent = '';
  for (const l of S.log.slice(-50)) { const d = document.createElement('div'); d.className = l.who; d.textContent = l.text; box.appendChild(d); }
  if (stick) box.scrollTop = box.scrollHeight;
  const last = S.log[S.log.length - 1], tk = $('ticker');
  if (last) { tk.textContent = last.text; tk.className = 'ticker ' + last.who; tk.hidden = false; } else tk.hidden = true;
}
function updAlerts() {
  const out = [], done = new Set();
  for (const a of S.ac) {
    if (a.conf === 2 && a.cw && !done.has(a.cs)) { out.push(['', `CA ${a.cs} ${a.cw}`]); done.add(a.cw); }
    if (a.terr) out.push(['', `LA ${a.cs}`]);
    if (a.emg) out.push(['', `${a.emg === 'MED' ? 'PAN' : 'MAYDAY'} ${a.cs}`]);
  }
  for (const a of S.ac) { if (a.conf === 1 && a.cw && !done.has(a.cs)) { out.push(['w', `TFC ${a.cs} ${a.cw}`]); done.add(a.cw); } if (a.wakeW) out.push(['w', `WAKE ${a.cs}`]); }
  if (S.started) { const tail = -rwWind(FLOWS[S.flow].rwys[0]).hw; if (tail > 5) out.push(['w', `TAILWIND ${Math.round(tail)}KT RWY ${FLOWS[S.flow].lbl}`]); }
  const html = out.slice(0, 6).map(o => `<span class="${o[0]}">${o[1]}</span>`).join('');
  const box = $('alerts'); if (box.innerHTML !== html) box.innerHTML = html;
  if (out.some(o => o[1].startsWith('CA ')) && !S.paused && performance.now() - lastCA > 1400) { lastCA = performance.now(); beep(1040, 0.12, 0.04); setTimeout(() => beep(780, 0.12, 0.04), 160); }
}
function setTxt(el, t) { if (el.textContent !== t) el.textContent = t; }
function updPanel() {
  const a = selAc(); $('cmdEmpty').hidden = !!a; $('cmdBody').hidden = !a; if (!a) return;
  const T = TYPES[a.type], air = a.phase === 'air', gnd = a.phase === 'taxi' || a.phase === 'hold' || a.phase === 'lineup';
  setTxt($('cCs'), a.cs);
  setTxt($('cInfo'), `${a.type} ${({ L: 'LIGHT', M: 'MEDIUM', H: 'HEAVY', J: 'SUPER' })[T.wake]} ${a.kind === 'arr' ? 'ARR' : 'DEP ' + a.exitFix}`);
  const flag = flagOf(a), st = $('cStat');
  setTxt(st, (flag ? flag + ' · ' : '') + (a.kind === 'arr' && air ? `FUEL ${Math.max(0, Math.round(a.fuel / 60))}M · ` : '') + (air ? `${Math.round(a.ias)}KT` : statusOf(a)));
  st.className = 'cs' + (a.conf === 2 || a.terr || a.emg ? ' alert' : flag ? ' warn' : '');
  const vh = $('vHdg'), n = a.nav;
  const hTxt = pend.hdg != null ? fmtH(pend.hdg) : n.mode === 'hdg' ? fmtH(n.hdg) : n.mode === 'loc' ? 'ILS' : n.fix;
  setTxt(vh, hTxt); vh.className = (pend.hdg != null ? 'pend' : '') + (hTxt.length > 3 ? ' small' : '');
  const va = $('vAlt'); setTxt(va, p3((pend.alt != null ? pend.alt : a.tAlt) / 100)); va.className = pend.alt != null ? 'pend' : '';
  const vs = $('vSpd'); setTxt(vs, String(pend.spd != null ? pend.spd : Math.round(a.tSpd))); vs.className = pend.spd != null ? 'pend' : '';
  const onApp = air && (a.app || n.mode === 'loc');
  $('aIls').hidden = !air; $('aHold').hidden = !air || onApp; $('aExp').hidden = !air; $('aGa').hidden = !onApp;
  $('aLuaw').hidden = !gnd; $('aTo').hidden = !gnd; $('aDct').hidden = a.phase === 'land';
  $('aLuaw').disabled = a.phase !== 'hold'; $('aTo').disabled = a.phase === 'taxi';
  $('aExp').setAttribute('aria-pressed', a.exp ? 'true' : 'false');
  setTxt($('aIls'), a.app ? 'ILS ' + a.app : 'ILS');
  $('aSend').disabled = pend.hdg == null && pend.alt == null && pend.spd == null;
}
function updTop() {
  setTxt($('clock'), (() => { const s = Math.floor(S.t) + 14 * 3600; return `${p2(Math.floor(s / 3600) % 24)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}Z`; })());
  setTxt($('score'), S.score.toLocaleString('en-US'));
  setTxt($('atis'), `${cvW < 600 ? '' : 'INFO '}${String.fromCharCode(65 + S.atis.l)} ${windStr()}KT`);
  const bf = $('bFlow'); setTxt(bf, `RWY ${FLOWS[S.flow].lbl} ▾`); bf.classList.toggle('bad', S.flow !== bestFlow() && -rwWind(FLOWS[S.flow].rwys[0]).hw > 5);
  setTxt($('bPause'), S.paused ? '▶' : 'II'); setTxt($('bRate'), S.rate + 'x'); $('bSnd').setAttribute('aria-pressed', sndOn || (MER.speechOn && MER.speechOn()) ? 'true' : 'false');
}
function updUI() { if (!S) return; updTop(); updCoach(); updStrips(); updPanel(); updLog(); updAlerts(); if (S.tut && S.started) $('ticker').hidden = true; if (sheetMode === 'ils' || sheetMode === 'flow') fillSheet(); }

/* steppers with press-and-hold repeat */
function stepVal(k, d) {
  const a = selAc(); if (!a) return;
  if (k === 'hdg') { const b = pend.hdg != null ? pend.hdg : a.nav.mode === 'hdg' ? a.nav.hdg : Math.round(a.hdg / 10) * 10; pend.hdg = norm(Math.round(b / 10) * 10 + d * 10); }
  if (k === 'alt') { const b = pend.alt != null ? pend.alt : a.tAlt; pend.alt = clamp((d > 0 ? Math.floor(b / 1000) : Math.ceil(b / 1000)) * 1000 + d * 1000, 2000, 13000); }
  if (k === 'spd') { const b = pend.spd != null ? pend.spd : a.tSpd; pend.spd = clamp((d > 0 ? Math.floor(b / 10) : Math.ceil(b / 10)) * 10 + d * 10, 80, 250); }
  updPanel();
}
let rep = null;
document.querySelectorAll('.step button').forEach(b => {
  const k = b.parentElement.dataset.k, d = +b.dataset.d;
  const stop = () => { if (rep) { clearTimeout(rep.t); clearInterval(rep.i); rep = null; } };
  b.addEventListener('pointerdown', e => { e.preventDefault(); stop(); stepVal(k, d); rep = { t: setTimeout(() => { rep.i = setInterval(() => stepVal(k, d), 110); }, 380) }; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepVal(k, d); } });
});
$('aSend').onclick = () => { const a = selAc(); if (!a) return; const c = {}; if (pend.hdg != null) c.hdg = pend.hdg; if (pend.alt != null) c.alt = pend.alt; if (pend.spd != null) c.spd = pend.spd; clearPend(); issue(a, c); updUI(); };
$('cClose').onclick = () => select(null);
$('aExp').onclick = () => { issue(selAc(), { exp: true }); updUI(); };
$('aGa').onclick = () => { issue(selAc(), { ga: true }); updUI(); };
$('aLuaw').onclick = () => { issue(selAc(), { luaw: true }); updUI(); };
$('aTo').onclick = () => { issue(selAc(), { takeoff: true }); updUI(); };
$('aDct').onclick = () => openSheet('dct'); $('aHold').onclick = () => openSheet('hold'); $('aIls').onclick = () => openSheet('ils');
$('bFlow').onclick = () => openSheet(sheetMode === 'flow' ? null : 'flow');
$('shClose').onclick = () => closeSheet();

function closeSheet() { sheetMode = null; $('sheet').hidden = true; }
function openSheet(m) { if (!m) return closeSheet(); sheetMode = m; $('sheet').hidden = false; fillSheet(true); }
function windTag(id) { const w = rwWind(id), tail = -w.hw; return { txt: `${tail > 0.5 ? 'TAIL ' + Math.round(tail) : 'HEAD ' + Math.round(Math.max(0, w.hw))} · X ${Math.round(w.xw)}`, bad: tail > 10, good: tail <= 2 && w.xw < 15 }; }
let sheetSig = '';
function fillSheet(force) {
  const a = selAc(), body = $('shBody'); let html = '', title = '';
  if (sheetMode === 'dct' || sheetMode === 'hold') {
    if (!a) return closeSheet();
    title = sheetMode === 'dct' ? `${a.cs} DIRECT TO` : `${a.cs} HOLD AT`;
    for (const nm in FIX) { const f = FIX[nm]; html += `<button data-v="${nm}" class="${a.exitFix === nm ? 'hot' : ''}${tutSheet === nm ? ' tut-hl' : ''}">${nm}<small>${f.t === 'gate' ? 'arrival gate' : f.t === 'exit' ? (a.exitFix === nm ? 'filed exit' : 'exit') : 'final fix'}</small></button>`; }
  } else if (sheetMode === 'ils') {
    if (!a) return closeSheet(); title = `${a.cs} CLEARED ILS`;
    for (const id in RW) { const w = windTag(id); html += `<button data-v="${id}" class="${w.bad ? 'bad' : w.good ? 'good' : ''}${tutSheet === id ? ' tut-hl' : ''}">RWY ${id}<small>${w.txt}</small></button>`; }
    if (a.app) html += `<button data-v="cancel">CANCEL<small>approach clearance</small></button>`;
  } else if (sheetMode === 'flow') {
    title = `RUNWAY FLOW · WIND ${windStr()}KT`;
    for (const k in FLOWS) { const w = windTag(FLOWS[k].rwys[0]); html += `<button data-v="${k}" class="${w.bad ? 'bad' : w.good ? 'good' : ''}" aria-pressed="${S.flow === k}">${FLOWS[k].name} ${FLOWS[k].lbl}<small>${w.txt}</small></button>`; }
  }
  if (!force && html === sheetSig) return; sheetSig = html;
  $('shTitle').textContent = title; body.innerHTML = html;
}
$('shBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v, a = selAc(), m = sheetMode;
  closeSheet();
  if (m === 'dct') issue(a, { dct: v }); else if (m === 'hold') issue(a, { hold: v });
  else if (m === 'ils') issue(a, v === 'cancel' ? { cancel: true } : { ils: v }); else if (m === 'flow') setFlow(v);
  updUI();
});

/* typed commands */
function runCli(str) {
  const tk = str.trim().toUpperCase().split(/\s+/).filter(Boolean); if (!tk.length) return;
  let a = S.ac.find(x => x.cs === tk[0]); if (a) { tk.shift(); select(a.id); } else a = selAc();
  if (!a) { sys('No aircraft selected. Start with a callsign.'); return; }
  const c = {};
  for (let i = 0; i < tk.length; i++) {
    const k = tk[i], v = tk[i + 1];
    if (k === 'H' || k === 'L' || k === 'R') { if (!isFinite(+v)) return sys('Heading needs a number.'); c.hdg = norm(+v); if (k !== 'H') c.dir = k; i++; }
    else if (k === 'A') { let n = +v; if (!isFinite(n)) return sys('Altitude needs a number.'); if (n < 200) n *= 100; c.alt = n; i++; }
    else if (k === 'S') { if (!isFinite(+v)) return sys('Speed needs a number.'); c.spd = +v; i++; }
    else if (k === 'D') { if (!FIX[v]) return sys(`Unknown fix ${v || ''}.`); c.dct = v; i++; }
    else if (k === 'I' || k === 'ILS') { if (!RW[v]) return sys(`Unknown runway ${v || ''}.`); c.ils = v; i++; }
    else if (k === 'HOLD') { if (!FIX[v]) return sys(`Unknown fix ${v || ''}.`); c.hold = v; i++; }
    else if (k === 'TO') c.takeoff = true; else if (k === 'LU') c.luaw = true; else if (k === 'GA') c.ga = true; else if (k === 'X') c.exp = true; else if (k === 'CA') c.cancel = true;
    else return sys(`Unknown command ${k}.`);
  }
  issue(a, c);
}
$('cli').addEventListener('submit', e => { e.preventDefault(); const i = $('cliIn'); if (S.started) runCli(i.value); i.value = ''; updUI(); });
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); togglePause(); }
  else if (e.key === 'Escape') { if (sheetMode) closeSheet(); else select(null); }
  else if (e.key === '/') { e.preventDefault(); $('cliIn').focus(); }
});

/* top rail */
function togglePause() { if (!S.started || S.over) return; S.paused = !S.paused; if (S.paused && MER.hush) MER.hush(); updTop(); }
$('bPause').onclick = togglePause;
$('bRate').onclick = () => { S.rate = ({ 1: 2, 2: 4, 4: 8, 8: 1 })[S.rate] || 1; updTop(); };
$('bSnd').onclick = () => { if (MER.showAudio) MER.showAudio(); else { sndOn = !sndOn; updTop(); } };
$('bHelp').onclick = () => { if (S.over) return showOv('debrief'); if (S.started) S.paused = true; showOv(S.started ? 'help' : 'brief'); };

/* ---------- briefing / debrief ---------- */
const cfg = { traffic: 1, weather: 1, pos: 0, gwx: 1 };
try { cfg.pos = localStorage.getItem('meridian.pos') === '1' ? 1 : 0; } catch (e) {}
const MER = window.MER = { cfg, mode: 'app', ac: () => AC, beep: (f, d, v) => beep(f, d, v), snd: () => sndOn, toggleSnd: () => { sndOn = !sndOn; return sndOn; },
  audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (er) {} },
  enterGround() { MER.mode = 'gnd'; $('app').hidden = true; $('gapp').hidden = false; $('ov').hidden = true; },
  toBrief() { MER.mode = 'app'; $('gapp').hidden = true; $('app').hidden = false; initShift({ traffic: cfg.traffic, weather: cfg.weather }); showOv('brief'); resize(); updUI(); } };
const HOWTO = `<ol>
<li><b>Arrivals</b> come in over the corner gates at 9,000 to 11,000 ft. Turn them onto a final, step them down, slow them, then clear the ILS.</li>
<li>The localizer captures at an intercept of 50&deg; or less, from at or below the glidepath. Be at 180 kt or less by 6 nm or they go around.</li>
<li><b class="d">Departures</b> wait at the runway. Line up, clear takeoff, then send each one direct to its filed exit fix, leaving at 7,000 ft or above.</li>
<li>Keep 3 nm or 1,000 ft between everything airborne. On final, leave 4 to 8 nm behind heavier aircraft for wake.</li>
<li>Stay above the MVA inside the terrain rings, steer around storm cells, and watch fuel states.</li>
<li>The wind shifts. A tailwind over 10 kt forces go-arounds, so change the runway flow in time.</li>
</ol>
<p>Tap a target or strip to select. Drag from a target to turn it, or drop on a fix for direct. Set heading, altitude and speed with the steppers, then SEND. Pinch or scroll to zoom.</p>
<p class="keys">Typed commands: <kbd>MRX482 H 270 A 40 S 210</kbd> <kbd>L 090</kbd> <kbd>D EKKON</kbd> <kbd>I 27R</kbd> <kbd>HOLD NIVEK</kbd> <kbd>LU</kbd> <kbd>TO</kbd> <kbd>GA</kbd> <kbd>X</kbd>. <kbd>Space</kbd> pauses, <kbd>/</kbd> focuses the command line.</p>`;
function seg(name, labels) { return `<div class="seg" data-seg="${name}">${labels.map((l, i) => `<button data-i="${i}" aria-pressed="${cfg[name] === i}">${l}</button>`).join('')}</div>`; }
function showOv(mode) {
  if (MER.hush) MER.hush();
  const card = $('ovCard'); $('ov').hidden = false; let h = '';
  const posSeg = `<div class="opts"><span class="lbl">POSITION</span>${seg('pos', ['Approach radar', 'Ground'])}</div>`;
  if (mode === 'brief' && cfg.pos === 1) {
    h = `<h1>MERIDIAN GROUND</h1>${posSeg}<p>You work the airport surface: pushbacks, taxi routes, stands, and every movement onto the two runways.</p>${MER.gHow || ''}
    <div class="opts"><span class="lbl">TRAFFIC</span>${seg('traffic', ['Light', 'Moderate', 'Heavy'])}<span class="lbl">RUNWAY</span>${seg('gwx', ['Fixed direction', 'Wind shifts'])}</div>
    ${MER.gTutDone && !MER.gTutDone() ? '<p>First time on Ground? The tutorial walks you through a pushback, a landing, a takeoff and a runway crossing in about four minutes.</p>' : ''}
    <div class="cta">${MER.gTutDone && !MER.gTutDone() ? '<button class="pri" data-act="g-tut">START TUTORIAL</button><button data-act="g-start">SKIP TO A FULL SHIFT</button>' : '<button class="pri" data-act="g-start">START GROUND SHIFT</button><button data-act="g-tut">REPLAY TUTORIAL</button>'}</div>${MER.gBest ? `<p>Best ground shift so far: ${MER.gBest().toLocaleString('en-US')} points.</p>` : ''}`;
  } else if (mode === 'brief') {
    h = `<h1>MERIDIAN APPROACH</h1>${posSeg}<p>You are the approach controller for a 30 nm terminal sector around a three-runway airport. Land the arrivals, launch the departures, keep everyone apart.</p>${HOWTO}
    <div class="opts"><span class="lbl">TRAFFIC</span>${seg('traffic', ['Light', 'Moderate', 'Heavy'])}<span class="lbl">WEATHER</span>${seg('weather', ['Steady wind', 'Shifting wind', 'Storms'])}</div>
    ${tutDone ? '' : '<p>First time on position? The tutorial walks you through one landing and one departure in about three minutes.</p>'}
    <div class="cta">${tutDone ? '<button class="pri" data-act="start">START SHIFT</button><button data-act="tut">REPLAY TUTORIAL</button>' : '<button class="pri" data-act="tut">START TUTORIAL</button><button data-act="start">SKIP TO A FULL SHIFT</button>'}</div>${best ? `<p>Best shift so far: ${best.toLocaleString('en-US')} points.</p>` : ''}`;
  } else if (mode === 'help') {
    h = `<h1>SHIFT PAUSED</h1>${HOWTO}<div class="cta"><button class="pri" data-act="resume">RESUME</button><button data-act="end">END SHIFT</button></div>`;
  } else {
    const st = S.stats, ops = st.landed + st.dep, bad = st.sep * 3 + st.wake + st.terr * 2 + st.wx * 0.5 + st.ga * 0.5 + st.lost * 2, r = bad / Math.max(1, ops);
    const crash = S.over && S.over !== 'Shift ended.';
    const grade = crash ? 'Accident on your frequency' : ops < 5 ? 'Too short a shift to rate' : r <= 0.05 ? 'A · Textbook' : r <= 0.15 ? 'B · Solid' : r <= 0.3 ? 'C · Busy but legal-ish' : r <= 0.5 ? 'D · Needs retraining' : 'E · Report to the supervisor';
    const newBest = !S.tut && S.score > best; if (newBest) { best = S.score; try { localStorage.setItem('meridian.best', String(best)); } catch (e) {} }
    const cell = (v, l) => `<div><b>${v}</b><span class="lbl">${l}</span></div>`;
    h = `<h1>${crash ? 'SHIFT OVER' : 'SHIFT DEBRIEF'}</h1><p>${crash ? S.over : `You worked ${Math.floor(S.t / 60)} minutes on position.`}</p>
    <div class="grade">${grade}${newBest && S.score > 0 ? ' · new best' : ''}</div>
    <div class="stats">${cell(S.score.toLocaleString('en-US'), 'SCORE')}${cell(st.landed, 'LANDED')}${cell(st.dep, 'DEPARTED')}${cell(st.sep, 'SEPARATION LOSSES')}${cell(st.wake, 'WAKE BUSTS')}${cell(st.ga, 'GO-AROUNDS')}${cell(st.terr, 'LOW ALTITUDE ALERTS')}${cell(st.wx, 'WEATHER ENCOUNTERS')}${cell(st.lost, 'MISSED HANDOFFS')}${cell(st.emg, 'EMERGENCIES')}</div>
    <div class="cta"><button class="pri" data-act="new">NEW SHIFT</button></div>`;
  }
  card.innerHTML = h;
}
$('ovCard').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const sg = b.closest('.seg');
  if (sg) { cfg[sg.dataset.seg] = +b.dataset.i; sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); if (sg.dataset.seg === 'pos') { try { localStorage.setItem('meridian.pos', String(cfg.pos)); } catch (er) {} showOv('brief'); } return; }
  const act = b.dataset.act;
  if (!act || act.startsWith('g-')) return;
  if (act === 'start' || act === 'tut') MER.audio();
  if (act === 'tut') { initTutorial(); S.started = true; S.paused = false; $('ov').hidden = true; sys('Tutorial shift. Follow the prompts at the bottom of the scope.'); tutGo(0); }
  else if (act === 'start') {
    markTut(); initShift({ traffic: cfg.traffic, weather: cfg.weather }); S.started = true; S.paused = false; $('ov').hidden = true;
    sys(`Shift started. ATIS information A: wind ${windStr()} kt, landing and departing ${FLOWS[S.flow].lbl}.`);
  } else if (act === 'resume') { S.paused = false; $('ov').hidden = true; }
  else if (act === 'end') { S.over = 'Shift ended.'; S.paused = true; showOv('debrief'); }
  else if (act === 'new') { initShift({ traffic: cfg.traffic, weather: cfg.weather }); showOv('brief'); }
  updUI();
});

function resetShift(c) {
  S = newState(c); clearPend(); closeSheet(); logSeen = -1;
  for (const [, el] of stripEls) el.remove(); stripEls.clear();
}
function primeVel() { S.ac.forEach(a => { if (a.phase === 'air') { const w = windAt(a.alt), h = hv(a.hdg), tas = a.ias * (1 + a.alt / 1000 * 0.017); a.gvx = (tas * h[0] + w[0]) / 3600; a.gvy = (tas * h[1] + w[1]) / 3600; a.gs = Math.hypot(a.gvx, a.gvy) * 3600; } }); }

/* ---------- tutorial: one scripted landing and one departure ---------- */
let tutDone = false, tutStrip = null, tutSheet = null, hlEl = null;
try { tutDone = localStorage.getItem('meridian.tut') === '1'; } catch (e) {}
function markTut() { tutDone = true; try { localStorage.setItem('meridian.tut', '1'); } catch (e) {} }
const tA = () => S.ac.find(a => a.id === S.tut.arr), tD = () => S.ac.find(a => a.id === S.tut.dep);
const stepEl = k => document.querySelector(`.step[data-k="${k}"]`);
const TUT = [
  { hold: 1, strip: 'arr', ring: 'arr', done: () => S.sel === S.tut.arr,
    txt: () => `The sand-coloured dot north-east of the airport is arrival ${tA().cs}. Tap it on the scope, or tap its strip below.` },
  { hold: 1, next: 1, need: 'arr', ring: 'arr',
    txt: () => { const a = tA(); return `Its data block reads ${p3(a.alt / 100)}=${p3(a.tAlt / 100)} ${p2(Math.round(a.gs / 10))}: at ${a.alt.toLocaleString('en-US')} ft, level, cleared to ${a.tAlt.toLocaleString('en-US')}, groundspeed ${Math.round(a.gs / 10) * 10} kt. The line ahead of it shows where it will be in one minute.`; } },
  { hold: 1, need: 'arr', hl: () => pend.alt === 3000 ? $('aSend') : stepEl('alt'), done: () => tA().tAlt <= 3000,
    txt: () => 'Descend it. Tap the minus under ALT until it shows 030 (3,000 ft), then press SEND. Nothing is transmitted until you send.' },
  { hold: 1, need: 'arr', hl: () => pend.spd === 180 ? $('aSend') : stepEl('spd'), done: () => tA().tSpd <= 180,
    txt: () => 'Slow it down. Set SPEED to 180 and SEND. Arrivals must be at 180 kt or less by 6 nm from the runway, or they go around.' },
  { hold: 1, need: 'arr', ring: 'arr', hl: () => pend.hdg != null && pend.hdg >= 230 && pend.hdg <= 245 ? $('aSend') : stepEl('hdg'),
    done: () => { const n = tA().nav; return n.mode === 'hdg' && n.hdg >= 230 && n.hdg <= 245; },
    txt: () => { const n = tA().nav; return (n.mode !== 'hdg' || n.hdg !== 220 ? 'That will not meet the final at a workable angle. ' : 'Now aim it at the final. The dashed line running east from the airport is the runway 27R localizer. ') + 'Set HEADING to 240 and SEND, or drag from the target and release when the label reads HDG 240.'; } },
  { hold: 1, need: 'arr', hl: () => sheetMode === 'ils' ? null : $('aIls'), sheet: '27R', done: () => { const a = tA(); return a.app === '27R' || (a.nav.mode === 'loc' && a.nav.rwy === '27R'); },
    txt: () => (tA().app && tA().app !== '27R' ? 'Wrong runway for this heading. ' : '') + 'Clear the approach: press ILS and choose RWY 27R. It holds heading 240 until it meets the localizer, then turns onto it by itself.' },
  { hold: 1, strip: 'dep', done: () => S.sel === S.tut.dep,
    txt: () => `While that one flies in, launch a departure. Blue strips are departures. Tap ${tD().cs}, showing READY 27L.` },
  { hold: 1, need: 'dep', hl: () => sheetMode === 'dct' ? null : $('aDct'), sheet: 'SUNDA', done: () => { const n = tD().nav; return n.mode === 'dct' && n.fix === 'SUNDA'; },
    txt: () => 'Give it a route before it rolls. Its strip shows the filed exit, SUNDA. Press DIRECT and choose SUNDA.' },
  { hold: 1, need: 'dep', hl: () => pend.alt != null && pend.alt >= 7000 ? $('aSend') : stepEl('alt'), done: () => tD().tAlt >= 7000,
    txt: () => 'Departures must leave your airspace at 7,000 ft or above. Raise ALT to 090 and SEND.' },
  { hold: 1, need: 'dep', hl: () => $('aTo'), done: () => { const d = tD(); return !d || d.phase === 'roll' || d.phase === 'air'; },
    txt: () => 'Press TAKEOFF. In a real shift, check first that nobody is on short final for that runway.' },
  { rate: 4, ring: 'arr', done: () => { const a = tA(); return !a || a.nav.mode === 'loc' || a.phase === 'land'; },
    txt: () => S.t - S.tut.t0 > 260 ? `${tA().cs} has not captured yet. Turn it to cross the dashed line at a shallow angle, at 3,000 ft, and clear the ILS again.` : `Time is moving again. Watch ${tA().cs} descend, slow down, and turn onto the dashed line when it reaches it.` },
  { rate: 8, ring: 'arr', done: () => !tA() || tA().phase === 'land',
    txt: () => { const a = tA(); return a.nav.mode === 'loc' ? 'Established on the localizer. From here it follows the glidepath down and slows to landing speed by itself. The rate button sets time compression and II pauses.' : `${a.cs} is off the approach. Turn it back to cross the final at a shallow angle, descend to 3,000 ft and clear the ILS again.`; } },
  { rate: 8, ring: 'dep', done: () => !tD(),
    txt: () => `${S.stats.landed ? 'Landed, and the points are on the board. ' : ''}Now watch ${tD().cs} climb out to SUNDA. Crossing the 30 nm ring near its exit fix, above 7,000 ft, hands it off.` },
  { hold: 1, next: 1, last: 1,
    txt: () => 'That is the basic loop. A full shift adds what makes it hard: several aircraft to keep 3 nm or 1,000 ft apart, wake spacing behind heavies, terrain rings, storm cells, fuel states, emergencies, and wind shifts that force a runway change. The ? button reopens the briefing at any time.' },
];
function initTutorial() {
  resetShift({ traffic: 0, weather: 0 });
  S.wind.spd = S.wind.tSpd = 8; S.atis.spd = 8; S.nextArr = S.nextDep = S.nextEmg = S.nextCell = 1e9; S.wind.next = 1e9;
  const a = baseAc('arr'); a.cs = 'MRX482'; a.type = 'A320'; a.x = 19; a.y = 5; a.alt = a.tAlt = 5000; a.hdg = 220; a.ias = a.tSpd = 230; a.nav = { mode: 'hdg', hdg: 220 }; a.fuel = 45 * 60; S.ac.push(a);
  const d = baseAc('dep'); d.cs = 'NVA215'; d.type = 'B738'; d.phase = 'hold'; d.rwy = '27L'; d.x = RW['27L'].thr[0]; d.y = RW['27L'].thr[1]; d.hdg = 270; d.tAlt = 5000; d.tSpd = 250; d.nav = { mode: 'hdg', hdg: 270 }; d.exitFix = 'SUNDA'; S.ac.push(d);
  primeVel(); S.tut = { i: 0, arr: a.id, dep: d.id, t0: 0 };
}
function tutGo(i) { const t = S.tut; t.i = i; t.t0 = S.t; const st = TUT[i]; if (st && st.rate) S.rate = st.rate; if (st && st.last) markTut(); updUI(); if (st && MER.speak) { try { MER.speak('coach', st.txt()); } catch (e) {} } }
function tutTick() { const t = S.tut; if (!t || !S.started || S.over) return; const st = TUT[t.i]; if (!st || st.next) return; let ok; try { ok = st.done(); } catch (e) { ok = true; } if (ok) tutGo(t.i + 1); }
const tutHold = () => !!(S.tut && TUT[S.tut.i] && TUT[S.tut.i].hold);
function setHl(el) { if (hlEl === el) return; if (hlEl) hlEl.classList.remove('tut-hl'); hlEl = el || null; if (hlEl) hlEl.classList.add('tut-hl'); }
function updCoach() {
  const box = $('coach'), t = S.tut, st = t && TUT[t.i];
  if (!st || !S.started || S.over) { box.hidden = true; setHl(null); tutStrip = null; tutSheet = null; return; }
  box.hidden = false;
  const needId = st.need ? t[st.need] : null, who = needId != null ? S.ac.find(a => a.id === needId) : null, lost = !!who && S.sel !== needId;
  setTxt($('coN'), `TUTORIAL \u00b7 ${t.i + 1} OF ${TUT.length}`);
  let msg = null; try { msg = lost ? `Select ${who.cs} again to carry on.` : st.txt(); } catch (e) {} if (msg != null) setTxt($('coTxt'), msg);
  $('coNext').hidden = !st.next; setTxt($('coNext'), st.last ? 'START A FULL SHIFT' : 'NEXT'); $('coSkip').hidden = !!st.last;
  setTxt($('coNote'), st.next ? '' : st.hold ? 'Time is frozen until you do this.' : `Time is running at ${S.rate}x.`);
  tutStrip = lost ? needId : st.strip ? t[st.strip] : null; tutSheet = lost ? null : st.sheet || null;
  let he = null; try { he = lost || !st.hl ? null : st.hl(); } catch (e) {} setHl(he);
}
function endTutorial() { markTut(); initShift({ traffic: cfg.traffic, weather: cfg.weather }); showOv('brief'); updUI(); }
$('coNext').onclick = () => { const st = S.tut && TUT[S.tut.i]; if (!st) return; if (st.last) endTutorial(); else tutGo(S.tut.i + 1); };
$('coSkip').onclick = endTutorial;

function initShift(c) {
  resetShift(c);
  if (c.weather === 0) { S.wind.spd = S.wind.tSpd = 8; S.atis.spd = 8; }
  spawnArr({ gate: 'KODEL', r: 21, alt: 8000, quiet: true }); spawnArr({ gate: 'PAXUM', r: 25, alt: 10000, quiet: true }); spawnArr({ gate: 'ERMIN', r: 31.5, quiet: true });
  spawnDep({ ready: true }); spawnDep();
  if (c.weather === 2) S.cells.push({ x: -21, y: -9, r: 4.5, v: 22 });
  primeVel();
}

/* ---------- main loop ---------- */
let lastT = 0, uiT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (MER.mode !== 'app') { lastT = now; return; }
  const real = Math.min(0.1, (now - lastT) / 1000 || 0); lastT = now;
  tutTick();
  if (S.started && !S.paused && !S.over && !tutHold() && !MER.hold) {
    const sim = real * S.rate, n = Math.max(1, Math.ceil(sim / 0.5));
    for (let i = 0; i < n && !S.over; i++) step(sim / n);
  }
  draw();
  if (now - uiT > 200) { uiT = now; updUI(); }
}
function start(data) {
  if (data && data.S && data.S.ac) { S = data.S; if (data.view) Object.assign(view, data.view); $('ov').hidden = !S.over && S.started; if (S.over) showOv('debrief'); else if (!S.started) showOv('brief'); else S.paused = true; }
  else { initShift({ traffic: 1, weather: 1 }); showOv('brief'); }
  new ResizeObserver(resize).observe(wrap); resize(); if (data && data.view) Object.assign(view, data.view);
  updUI(); requestAnimationFrame(frame);
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ S, view: { cx: view.cx, cy: view.cy, s: view.s } })); } catch (e) {}
window.__atc = { get S() { return S; }, issue, step, select, runCli };
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();
