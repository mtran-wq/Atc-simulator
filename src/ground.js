/* ===================== Meridian Ground: airport surface position ===================== */
(() => {
'use strict';
const MER = window.MER, $ = id => document.getElementById(id);
const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const p2 = n => String(n).padStart(2, '0');
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + p2(s % 60); };
const beep = (f, d, v) => MER.beep(f, d, v);
const C = { bg: '#06131a', apron: '#0c222c', rwy: '#26363f', rwyLine: 'rgba(217,236,233,.75)', twy: '#17394a', twyLine: 'rgba(236,210,122,.38)', bld: '#1c3442', dim: '#7ea1a6', ink: '#d9ece9', arr: '#ecd27a', dep: '#69d2ee', sel: '#ffffff', warn: '#ff9f2e', alert: '#ff5546', ok: '#7fe3a4' };

/* ---------- surface graph (1 unit = 100 m) ---------- */
const N = {}, ADJ = {};
function node(id, x, y, t, ex) { N[id] = Object.assign({ id, x, y, t }, ex || {}); ADJ[id] = []; }
function edge(a, b, name, kind) { const len = Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y); ADJ[a].push({ to: b, len, name, kind }); ADJ[b].push({ to: a, len, name, kind }); }
const E = (a, b) => ADJ[a].find(e => e.to === b);
const XS = [-18, -8, 0, 8, 18], LX = [-18, -14, -8, 0, 8, 14, 18], EX = [-14, -8, -4, 0, 4, 8, 14], KX = [-8, -6, -2, 2, 6, 8];
LX.forEach(x => { node('a' + x, x, 7, 'twy'); node('b' + x, x, -7, 'twy'); });
for (let i = 0; i < LX.length - 1; i++) { edge('a' + LX[i], 'a' + LX[i + 1], 'A', 'twy'); edge('b' + LX[i], 'b' + LX[i + 1], 'B', 'twy'); }
XS.forEach((x, i) => {
  const k = i + 1;
  node('hA' + k, x, 8.5, 'hs', { rwy: 'N', conn: 'A' + k, i: k }); node('rN' + k, x, 10, 'rwy', { rwy: 'N', i: k });
  edge('a' + x, 'hA' + k, 'A' + k, 'conn'); edge('hA' + k, 'rN' + k, 'A' + k, 'rx');
  node('hB' + k, x, -8.5, 'hs', { rwy: 'S', conn: 'B' + k, i: k }); node('rS' + k, x, -10, 'rwy', { rwy: 'S', i: k });
  edge('b' + x, 'hB' + k, 'B' + k, 'conn'); edge('hB' + k, 'rS' + k, 'B' + k, 'rx');
});
KX.forEach(x => node('k' + x, x, 13, 'twy'));
for (let i = 0; i < KX.length - 1; i++) edge('k' + KX[i], 'k' + KX[i + 1], 'K', 'twy');
[2, 4].forEach(k => { const x = XS[k - 1]; node('hK' + k, x, 11.5, 'hs', { rwy: 'N', conn: 'K' + k, i: k }); edge('rN' + k, 'hK' + k, 'K' + k, 'rx'); edge('hK' + k, 'k' + x, 'K' + k, 'conn'); });
EX.forEach(x => { node('e' + x, x, 4, 'twy'); node('f' + x, x, -4, 'twy'); });
for (let i = 0; i < EX.length - 1; i++) { edge('e' + EX[i], 'e' + EX[i + 1], 'E', 'twy'); edge('f' + EX[i], 'f' + EX[i + 1], 'F', 'twy'); }
[-14, 14].forEach(x => { const nm = x < 0 ? 'C' : 'D'; edge('a' + x, 'e' + x, nm, 'twy'); edge('e' + x, 'f' + x, nm, 'twy'); edge('f' + x, 'b' + x, nm, 'twy'); });
const GATES = [];
[-8, -4, 0, 4, 8].forEach((x, i) => {
  node('G' + (i + 1), x, 2.2, 'gate', { heavy: i === 0 || i === 4, lane: 'e' + x, cat: 'T', nose: 180 }); edge('e' + x, 'G' + (i + 1), '', 'stem');
  node('G' + (i + 6), x, -2.2, 'gate', { heavy: i === 0 || i === 4, lane: 'f' + x, cat: 'T', nose: 0 }); edge('f' + x, 'G' + (i + 6), '', 'stem');
});
[-6, -2, 2, 6].forEach((x, i) => { node('K' + (i + 1), x, 15, 'gate', { heavy: i === 0 || i === 3, lane: 'k' + x, cat: 'C', nose: 0 }); edge('k' + x, 'K' + (i + 1), '', 'stem'); });
for (const id in N) if (N[id].t === 'gate') GATES.push(id);
const HS = Object.keys(N).filter(id => N[id].t === 'hs');
const RY = { N: 10, S: -10 };
const LABELS = [['A', -11, 7], ['A', 11, 7], ['B', -11, -7], ['B', 11, -7], ['C', -14, 0], ['D', 14, 0], ['E', -11, 4], ['E', 11, 4], ['F', -11, -4], ['F', 11, -4], ['K', 0, 13]];

const CLS = { L: { to: 10, ld: 7, sz: 0.36, nm: 'LIGHT' }, M: { to: 20, ld: 13, sz: 0.52, nm: 'MEDIUM' }, H: { to: 28, ld: 19, sz: 0.74, nm: 'HEAVY' }, J: { to: 30, ld: 21, sz: 0.84, nm: 'SUPER' } };
const TW = { C208: 'L', PC12: 'L', DH8D: 'M', E175: 'M', CRJ9: 'M', A320: 'M', B738: 'M', A21N: 'M', B763: 'H', A359: 'H', B77W: 'H', B748: 'H', A388: 'J' };
const AIRLINES = [
  { c: 'MRX', w: 30, t: ['A320', 'B738', 'A21N', 'E175'] }, { c: 'NVA', w: 22, t: ['B738', 'A320', 'B763'] },
  { c: 'SKL', w: 18, t: ['E175', 'CRJ9', 'DH8D'] }, { c: 'PCF', w: 12, t: ['A359', 'B77W', 'A388', 'B763'] },
  { c: 'TRK', w: 10, t: ['B748', 'B763', 'B77W'] }, { c: 'N', w: 8, t: ['C208', 'PC12'] },
];
const DUAL = new Set(['A', 'B', 'C', 'D']), LANE = new Set(['E', 'F', 'K']);
const VT = 0.15, SEP = 1.15, STOP = 0.9, VPUSH = 0.05, ACC = 0.022;
const ARR_INT = [175, 120, 85], DEP_INT = [260, 180, 125];

let S = null, sheetMode = null, best = 0;
try { best = +localStorage.getItem('meridian.gbest') || 0; } catch (e) {}
MER.gBest = () => best;
const view = { cx: 0, cy: 2.5, s: 8 };
let cvW = 300, cvH = 300, dpr = 1, drag = null;

/* ---------- helpers ---------- */
const flowDir = f => (f === 'W' ? -1 : 1);
const rwName = (rw, f) => ((f || S.flow) === 'W' ? (rw === 'N' ? '27R' : '27L') : (rw === 'N' ? '09L' : '09R'));
const availAt = (hs, f) => { const x = N[hs].x; return flowDir(f || S.flow) < 0 ? x + 18 : 18 - x; };
const onG = a => a.from != null;
function say(who, text) { S.log.push({ who, text }); S.logN++; if (S.log.length > 80) S.log.shift(); const spoken = S.started && MER.speak && MER.speak(who, text, S.rate); if (who === 'pilot' && !spoken) beep(880, 0.05, 0.015); }
const sys = t => say('sys', t);
function addScore(n, why) { S.score += n; if (why) sys(`${n >= 0 ? '+' : ''}${n}  ${why}`); }
function gameOver(why) { if (S.over) return; S.over = why; S.paused = true; sys(why); beep(180, 1.2, 0.06); showOv('debrief'); }
function rwOf(a) {
  if (a.st === 'lineup' || a.st === 'rollout' || (a.st === 'roll' && !a.air)) return a.rw;
  if (onG(a)) { if (N[a.to].t === 'rwy') return N[a.to].rwy; if (N[a.from].t === 'rwy') return N[a.from].rwy; }
  return null;
}
const rwBusy = (rw, me) => S.ac.some(b => b !== me && rwOf(b) === rw);
const nextArr = rw => { let m = null; for (const b of S.ac) if (b.st === 'final' && b.rw === rw && (!m || b.eta < m.eta)) m = b; return m; };

/* ---------- routing ---------- */
function path(start, dest, ban, noBack) {
  const d = {}, prev = {}, done = {}; d[start] = 0;
  for (;;) {
    let u = null; for (const k in d) if (!done[k] && (u === null || d[k] < d[u])) u = k;
    if (u === null) return null; if (u === dest) break; done[u] = 1;
    if (u !== start && (N[u].t === 'gate')) continue;
    for (const e of ADJ[u]) {
      if (done[e.to]) continue;
      if (u === start && e.to === noBack) continue;
      if (ban && e.name === ban) continue;
      if (e.kind === 'stem' && e.to !== dest && N[u].t !== 'gate') continue;
      if (e.to === dest && e.kind === 'rx') continue;
      if (N[e.to].t === 'rwy' && ADJ[e.to].length < 2) continue;
      const nd = d[u] + e.len + (e.kind === 'rx' ? 3 : 0);
      if (d[e.to] === undefined || nd < d[e.to]) { d[e.to] = nd; prev[e.to] = u; }
    }
  }
  const nodes = [dest]; while (nodes[0] !== start) nodes.unshift(prev[nodes[0]]);
  let len = 0; const names = [];
  for (let i = 1; i < nodes.length; i++) { const e = E(nodes[i - 1], nodes[i]); len += e.len; if (e.name && names[names.length - 1] !== e.name) names.push(e.name); }
  return { nodes, len, names };
}
function startOf(a) { const atHs = N[a.to].t === 'hs' && a.pos >= E(a.from, a.to).len - 0.01; return { start: a.to, noBack: atHs ? null : a.from }; }
function routes(a, dest) {
  const s = startOf(a), base = path(s.start, dest, null, s.noBack); if (!base) return [];
  const out = [base], seen = new Set([base.nodes.join()]);
  for (const b of ['A', 'B', 'C', 'D', 'E', 'F', 'K']) if (base.names.includes(b)) { const p = path(s.start, dest, b, s.noBack); if (p && !seen.has(p.nodes.join())) { seen.add(p.nodes.join()); out.push(p); } }
  return out.sort((p, q) => p.len - q.len).slice(0, 3);
}

/* ---------- traffic ---------- */
function pickFlight(cargo) {
  let al;
  if (cargo === true) al = AIRLINES[Math.random() < 0.6 ? 4 : 5];
  else if (cargo === false) { let r = Math.random() * 82; al = AIRLINES[0]; for (const a of AIRLINES.slice(0, 4)) { if (r < a.w) { al = a; break; } r -= a.w; } }
  else { let r = Math.random() * 100; al = AIRLINES[0]; for (const a of AIRLINES) { if (r < a.w) { al = a; break; } r -= a.w; } }
  return { al, type: pick(al.t) };
}
function newCs(c) { let cs; do { cs = c === 'N' ? 'N' + Math.floor(rnd(100, 999)) + pick('ABCDEFGHJKLMNPRSTUVWXY') + pick('ABCDEFGHJKLMNPRSTUVWXY') : c + Math.floor(rnd(10, c === 'TRK' ? 990 : 2900)); } while (S.ac.some(a => a.cs === cs)); return cs; }
function baseAc(kind, f) {
  const w = TW[f.type];
  return { id: S.nid++, cs: newCs(f.al.c), al: f.al.c, type: f.type, w, kind, cargo: f.al.c === 'TRK' || f.al.c === 'N', st: '', from: null, to: null, pos: 0, route: [], dest: null, names: [], alt: 0, claim: null, hold: false, crossOK: false, wantCross: false, x: 0, y: 0, hdg: 0, gate: null, rw: null, rx: 0, rv: 0, dir: -1, air: false, eta: 0, t0: null, stuck: 0, timer: 0, incT: -99 };
}
function gateFree(id, a) { const g = S.gates[id]; return g.occ == null && (g.res == null || (a && g.res === a.id)); }
function gateFits(id, a) { const n = N[id]; return (n.cat === 'C') === a.cargo && (n.heavy || (a.w !== 'H' && a.w !== 'J')); }
function spawnDepAt(gid, ready, cargo, type, alc) {
  const f = pickFlight(cargo); if (alc) f.al = AIRLINES.find(x => x.c === alc); if (type) f.type = type;
  const a = baseAc('dep', f); if (!gateFits(gid, a)) { const ok = f.al.t.filter(t => N[gid].heavy || (TW[t] !== 'H' && TW[t] !== 'J')); if (!ok.length) return null; a.type = pick(ok); a.w = TW[a.type]; }
  a.st = 'gate'; a.gate = gid; a.timer = ready; S.gates[gid].occ = a.id; S.ac.push(a); place(a); return a;
}
function spawnArr(eta, rw) {
  if (!rw) rw = S.lastEta.N <= S.lastEta.S ? 'N' : 'S';
  const f = pickFlight(), a = baseAc('arr', f);
  a.st = 'final'; a.rw = rw; a.dir = flowDir(S.flow); a.eta = Math.max(eta || 150, S.lastEta[rw] - S.t + 115); S.lastEta[rw] = S.t + a.eta;
  S.ac.push(a); place(a);
  say('pilot', `${a.cs}, ${a.type}, on final runway ${rwName(rw)}, ${mmss(a.eta)} out.`);
  return a;
}
function stepTraffic(dt) {
  const tr = S.cfg.traffic;
  if (S.t > S.nextArr) { S.nextArr = S.t + ARR_INT[tr] * rnd(0.7, 1.3); if (!S.flowNext && S.ac.length < 17) spawnArr(); }
  if (S.t > S.nextDep) {
    S.nextDep = S.t + DEP_INT[tr] * rnd(0.7, 1.3);
    const cargo = Math.random() < 0.2, free = GATES.filter(g => (N[g].cat === 'C') === cargo && gateFree(g));
    if (free.length >= (cargo ? 2 : 4) && S.ac.length < 17) spawnDepAt(pick(free), rnd(20, 70), cargo);
  }
  /* runway direction change */
  if (S.cfg.gwx && !S.flowNext && S.t > S.nextShift) {
    S.flowNext = S.flow === 'W' ? 'E' : 'W'; S.flowT = S.t + 150; S.wind.tDir = S.flowNext === 'W' ? rnd(250, 290) : rnd(70, 110);
    sys(`Wind is backing round. Runway change to ${S.flowNext === 'W' ? '27' : '09'} in about ${mmss(150)}. No new arrivals until then.`); beep(520, 0.4, 0.04);
  }
  if (S.flowNext && S.t > S.flowT && !S.ac.some(a => a.st === 'final' || a.st === 'rollout' || a.st === 'roll' || a.st === 'lineup' || a.st === 'lining')) {
    S.flow = S.flowNext; S.flowNext = null; S.nextShift = S.t + rnd(9, 14) * 60; S.atis = (S.atis + 1) % 26; S.lastEta.N = S.lastEta.S = S.t; S.nextArr = S.t + 20;
    sys(`Runways ${S.flow === 'W' ? '27L and 27R' : '09L and 09R'} now in use. Departures holding at the old end must taxi to the other end.`);
  }
  const d = ((S.wind.tDir - S.wind.dir + 540) % 360) - 180; if (Math.abs(d) > 0.5) S.wind.dir = (S.wind.dir + Math.sign(d) * Math.min(Math.abs(d), 1.2 * dt) + 360) % 360;
}

/* ---------- surface movement ---------- */
function nodeBusy(n, me) {
  for (const b of S.ac) {
    if (b === me || !onG(b)) continue;
    if (b.claim === n) return true;
    if (b.to === n && E(b.from, b.to).len - b.pos < 0.5) return true;
    if (b.from === n && b.pos < 0.9) return true;
  }
  return false;
}
function canEnter(a, n, nx) {
  if (nodeBusy(n, a)) return false;
  if (N[nx].t === 'gate') { const g = S.gates[nx]; if (g.occ != null && g.occ !== a.id) return false; }
  const e0 = E(n, nx), dual = e0.kind === 'twy' && DUAL.has(e0.name);
  for (const b of S.ac) {
    if (b === a || !onG(b)) continue;
    if (!dual && b.from === nx && b.to === n) return false;
    if (!dual && b.claim === nx && b.route[0] === n) return false;
    if (b.from === n && b.to === nx && b.pos < SEP) return false;
  }
  /* single apron lanes: look down the whole lane for anything coming the other way before committing */
  if (LANE.has(e0.name)) {
    let p = n, q = nx, i = 0;
    for (;;) {
      for (const b of S.ac) { if (b === a || !onG(b)) continue; if ((b.from === q && b.to === p) || (b.claim === q && b.route[0] === p)) return false; }
      const nq = a.route[++i]; if (!nq || E(q, nq).name !== e0.name) break; p = q; q = nq;
    }
  }
  return true;
}
function enterRunway(a, rw) {
  let bad = false;
  for (const b of S.ac) {
    if (b === a || b.rw !== rw) continue;
    const ahead = (a.x - b.rx) * b.dir > -0.5;
    if ((b.st === 'roll' && !b.air && ahead) || (b.st === 'rollout' && b.rv > 0.35 && ahead) || (b.st === 'final' && b.committed)) bad = true;
  }
  if (bad) { a.incT = S.t; S.stats.inc++; addScore(-200, `RUNWAY INCURSION: ${a.cs} entered runway ${rwName(rw)} in front of traffic`); beep(1040, 0.4, 0.05); }
}
function moveTaxi(a, dt) {
  const e = E(a.from, a.to), rem = e.len - a.pos, nx = a.route[0];
  let limit = Infinity;
  for (const b of S.ac) if (b !== a && b.from === a.from && b.to === a.to && b.pos > a.pos) limit = Math.min(limit, b.pos - a.pos - SEP);
  if (nx == null) limit = Math.min(limit, rem);
  else {
    let pass = a.claim === a.to;
    const clr = N[a.to].t === 'hs' && N[nx].t === 'rwy';
    if (!pass && rem < 1.05) {
      if (clr && !a.crossOK) { if (rem < 0.02 && !a.wantCross && a.st === 'taxi') { a.wantCross = true; say('pilot', `${a.cs}, holding short runway ${rwName(N[a.to].rwy)} on ${N[a.to].conn}, request crossing.`); } }
      else if (canEnter(a, a.to, nx)) { a.claim = a.to; pass = true; }
    }
    if (!pass) limit = Math.min(limit, rem - (clr ? 0 : STOP));
  }
  const d = Math.max(0, Math.min((a.hold ? 0 : VT) * dt, limit));
  a.pos += d; a.moved = d > 1e-5;
  if (a.pos >= e.len - 1e-6) {
    if (nx == null) { a.pos = e.len; arrive(a); return; }
    if (a.claim === a.to) {
      const was = a.from; a.pos = Math.max(0, a.pos - e.len); a.from = a.to; a.to = a.route.shift();
      if (N[a.to].t === 'rwy') { place(a); enterRunway(a, N[a.to].rwy); }
      if (N[a.from].t === 'hs' && N[was].t === 'rwy') { a.crossOK = false; a.wantCross = false; }
    } else a.pos = e.len;
  }
  if (a.claim && a.from === a.claim && a.pos > 0.9) a.claim = null;
}
function arrive(a) {
  const n = N[a.to];
  if (a.st === 'lining') {
    a.rw = n.rwy; a.rx = n.x; a.dir = flowDir(S.flow); a.from = a.to = null; a.claim = null; a.route = []; a.crossOK = false;
    if (a.tkof) { a.st = 'roll'; a.rv = 0; a.rolled = 0; } else a.st = 'lineup';
  } else if (n.t === 'hs') {
    if (a.st !== 'short') { a.st = 'short'; a.claim = null; say('pilot', `${a.cs}, holding short runway ${rwName(n.rwy)} at ${n.conn}, ready for departure.`); }
  } else if (n.t === 'gate') {
    a.st = 'parked'; a.gate = a.to; S.gates[a.to].occ = a.id; S.gates[a.to].res = null; a.from = a.to = null; a.claim = null; a.timer = S.tut ? 1e6 : rnd(110, 200);
    S.stats.arr++; const late = Math.max(0, S.t - a.t0 - 210);
    addScore(Math.round(clamp(100 - late / 5, 30, 100)), `${a.cs} on stand ${a.gate}`);
  }
}
function exitFree(r, h, side) {
  if (nodeBusy(h, null) || nodeBusy(r, null)) return false;
  for (const b of S.ac) if (onG(b) && ((b.from === r && b.to === h) || (b.from === h && b.to === r) || (b.from === h && b.to === side) || (b.from === side && b.to === h))) return false;
  return true;
}
function place(a) {
  if (a.st === 'push') {
    const g = N[a.gate], L = N[a.to], nb = N[a.from], stem = Math.hypot(g.x - L.x, g.y - L.y), d = a.pd;
    const fh = a.face === 'E' ? 90 : 270;
    if (d < stem) { const t = d / stem; a.x = g.x + (L.x - g.x) * t; a.y = g.y + (L.y - g.y) * t; a.hdg = g.nose; }
    else { const t = Math.min(1, (d - stem) / 0.7), ux = Math.sign(nb.x - L.x); a.x = L.x + ux * 0.7 * t; a.y = L.y; a.hdg = g.nose + ((((fh - g.nose) + 540) % 360) - 180) * t; }
  } else if (onG(a)) {
    const p = N[a.from], q = N[a.to], e = E(a.from, a.to), t = a.pos / e.len, off = e.kind === 'twy' && DUAL.has(e.name) ? 0.24 / e.len : 0;
    a.x = p.x + (q.x - p.x) * t + (q.y - p.y) * off; a.y = p.y + (q.y - p.y) * t - (q.x - p.x) * off; a.hdg = Math.atan2(q.x - p.x, q.y - p.y) / D2R;
  } else if (a.st === 'gate' || a.st === 'pushreq' || a.st === 'pushwait' || a.st === 'parked') { const g = N[a.gate]; a.x = g.x; a.y = g.y; a.hdg = g.nose; }
  else if (a.st === 'final') { a.rx = -a.dir * 18 - a.dir * a.eta * 0.75; a.x = a.rx; a.y = RY[a.rw]; a.hdg = a.dir < 0 ? 270 : 90; }
  else { a.x = a.rx; a.y = RY[a.rw]; a.hdg = a.dir < 0 ? 270 : 90; }
}
function tryPush(a) {
  const g = N[a.gate], L = g.lane, nbs = ADJ[L].filter(e => e.kind === 'twy').map(e => e.to);
  const nb = nbs.find(n => (a.face === 'E' ? N[n].x < N[L].x : N[n].x > N[L].x));
  if (nodeBusy(L, a)) return false;
  for (const b of S.ac) {
    if (b === a || !onG(b)) continue;
    if (b.to === L && E(b.from, b.to).len - b.pos < 2.6) return false;
    if (b.from === L && b.pos < 1.6) return false;
    if (b.from === L && b.to === nb) return false;
    const eb = E(b.from, b.to), f = a.face === 'E' ? 1 : -1;
    if (LANE.has(eb.name) && Math.abs(N[b.to].y - N[L].y) < 0.1 && Math.sign(N[b.to].x - N[b.from].x) === -f && (b.x - N[L].x) * f > -0.5) return false;
  }
  a.st = 'push'; a.from = nb; a.to = L; a.pos = E(nb, L).len - 0.7; a.claim = L; a.route = []; a.pd = 0; return true;
}
function stepAc(a, dt) {
  const k = CLS[a.w];
  switch (a.st) {
    case 'gate': a.timer -= dt; if (a.timer <= 0) { a.st = 'pushreq'; a.t0 = S.t; say('pilot', `Meridian Ground, ${a.cs}, stand ${a.gate}, request push and start.`); } break;
    case 'pushwait': tryPush(a); break;
    case 'push': {
      const stem = E(a.to, a.gate).len; a.pd += VPUSH * dt;
      if (a.pd >= stem && S.gates[a.gate].occ === a.id) S.gates[a.gate].occ = null;
      if (a.pd >= stem + 0.7) { a.st = 'start'; a.claim = null; a.timer = 28; }
      break; }
    case 'start': a.timer -= dt; if (a.timer <= 0) { a.st = 'taxireq'; say('pilot', `${a.cs}, push complete, request taxi.`); } break;
    case 'turning': a.timer -= dt; if (a.timer <= 0) { const e = E(a.from, a.to); const f = a.from; a.from = a.to; a.to = f; a.pos = e.len - a.pos; a.route = []; a.claim = null; a.st = 'taxi'; a.hold = true; if (a.dest) taxi(a, a.dest, 0); } break;
    case 'taxi': case 'lining':
      moveTaxi(a, dt);
      if (a.st === 'taxi' && !a.hold && !a.wantCross) { a.stuck = a.moved ? 0 : a.stuck + dt; } else a.stuck = 0;
      break;
    case 'exiting':
      moveTaxi(a, dt);
      if (onG(a) && N[a.from].t === 'hs' && a.pos >= 0.7) { a.st = 'vacated'; a.claim = null; a.route = []; a.t0 = S.t; say('pilot', `Ground, ${a.cs}, clear of runway ${rwName(a.rw)} on ${N[a.from].conn}, request stand.`); }
      break;
    case 'roll': {
      a.rv += ACC * dt; a.rx += a.dir * a.rv * dt; a.rolled += a.rv * dt;
      if (!a.air) {
        for (const c of S.ac) if (c !== a && rwOf(c) === a.rw) { const dx = ((onG(c) ? c.x : c.rx) - a.rx) * a.dir; if (dx > 0 && dx < 0.7) { gameOver(`Collision on runway ${rwName(a.rw)}: ${a.cs} and ${c.cs}.`); return; } }
        if (a.rolled >= k.to) { a.air = true; S.lastDep[a.rw] = { t: S.t, w: a.w }; say('atc', `${a.cs}, contact departure 124.3.`); say('pilot', `124.3, good day, ${a.cs}.`); }
      } else a.alt += dt;
      if (Math.abs(a.rx) > 25) {
        S.stats.dep++; const late = Math.max(0, S.t - a.t0 - 430);
        addScore(Math.round(clamp(100 - late / 5, 30, 100)), `${a.cs} departed runway ${rwName(a.rw)}`); remove(a);
      }
      break; }
    case 'final':
      a.eta -= dt;
      if (!a.ctl && a.eta < 60 && !rwBusy(a.rw, a)) { a.ctl = true; say('atc', `${a.cs}, runway ${rwName(a.rw)}, cleared to land.`); say('pilot', `Cleared to land ${rwName(a.rw)}, ${a.cs}.`); }
      if (!a.committed && a.eta < 12) {
        if (rwBusy(a.rw, a)) {
          a.eta = Math.max(300, S.lastEta[a.rw] - S.t + 115); S.lastEta[a.rw] = S.t + a.eta; S.stats.ga++; a.ctl = false;
          say('pilot', `${a.cs}, going around, runway ${rwName(a.rw)} occupied.`); addScore(-80, `${a.cs} went around`); beep(660, 0.3, 0.04);
        } else a.committed = true;
      }
      if (a.eta <= 0) { a.st = 'rollout'; a.rx = -a.dir * 18; a.rv = 0.7; a.exitI = a.dir < 0 ? 4 : 2; a.committed = false; }
      break;
    case 'rollout': {
      a.rv = Math.max(0.3, a.rv - (0.2 / k.ld) * dt);
      let blocked = false;
      for (const c of S.ac) if (c !== a && rwOf(c) === a.rw) {
        const dx = ((onG(c) ? c.x : c.rx) - a.rx) * a.dir;
        if (dx > 0 && dx < 0.7 && a.rv > 0.35) { gameOver(`Collision on runway ${rwName(a.rw)}: ${a.cs} and ${c.cs}.`); return; }
        if (dx > 0 && dx < 1.4) blocked = true;
      }
      if (blocked && a.rv <= 0.35) break;
      const xe = XS[a.exitI - 1], step = a.rv * dt, gap = (xe - a.rx) * a.dir;
      if (gap <= step) {
        const last = a.dir < 0 ? a.exitI === 1 : a.exitI === 5;
        if (a.rv <= 0.31) {
          const r = 'r' + a.rw + a.exitI, kSide = a.cargo && a.rw === 'N' && (a.exitI === 2 || a.exitI === 4);
          let h = (a.rw === 'N' ? 'hA' : 'hB') + a.exitI, side = (a.rw === 'N' ? 'a' : 'b') + xe;
          if (kSide && exitFree(r, 'hK' + a.exitI, 'k' + xe)) { h = 'hK' + a.exitI; side = 'k' + xe; }
          a.rx = xe;
          if (exitFree(r, h, side)) { a.from = r; a.to = h; a.pos = 0; a.route = [side]; a.st = 'exiting'; a.claim = null; }
          else if (!last) { a.exitI += a.dir; a.rx += a.dir * 0.01; }
        } else if (!last) { a.rx += a.dir * step; a.exitI += a.dir; }
        else { a.rx = xe; a.rv = 0.3; }
      } else a.rx += a.dir * step;
      break; }
    case 'parked':
      a.timer -= dt;
      if (a.timer <= 0) { a.kind = 'dep'; a.cs = newCs(a.al); a.st = 'gate'; a.timer = rnd(25, 70); a.t0 = null; a.rw = null; a.dest = null; a.names = []; a.hold = false; }
      break;
  }
  if (S.ac.includes(a)) place(a);
}
function remove(a) { S.ac = S.ac.filter(x => x !== a); if (S.sel === a.id) select(null); }
function step(dt) {
  S.t += dt; stepTraffic(dt);
  for (const a of S.ac.slice()) { stepAc(a, dt); if (S.over) return; }
}

/* ---------- commands ---------- */
function needTxt(a) { return a.w === 'L' ? 'at least 1,000 m' : a.w === 'M' ? 'at least 2,000 m' : 'full length'; }
function taxi(a, dest, alt) {
  const rs = routes(a, dest); if (!rs.length) { sys(`No taxi route from there to ${N[dest].t === 'gate' ? 'stand ' + dest : N[dest].conn}.`); return; }
  const r = rs[(alt || 0) % rs.length], s = startOf(a);
  if (a.dest && N[a.dest] && N[a.dest].t === 'gate' && S.gates[a.dest].res === a.id) S.gates[a.dest].res = null;
  let nodes = r.nodes.slice(1);
  if (nodes[0] === a.from && s.noBack == null) { a.from = a.to; a.to = nodes.shift(); a.pos = 0; }
  a.route = nodes; a.dest = dest; a.alt = alt || 0; a.names = r.names; a.nAlt = rs.length; a.st = 'taxi'; a.hold = false; a.wantCross = false; a.crossOK = false; a.stuck = 0; a.claim = a.claim === a.to ? a.claim : null;
  const via = r.names.length ? ` via ${r.names.join(', ')}` : '';
  if (N[dest].t === 'gate') { S.gates[dest].res = a.id; say('atc', `${a.cs}, taxi to stand ${dest}${via}.`); say('pilot', `Stand ${dest}${via}, ${a.cs}.`); }
  else { const n = N[dest]; say('atc', `${a.cs}, taxi to holding point ${n.conn}, runway ${rwName(n.rwy)}${via}.`); say('pilot', `Holding point ${n.conn}${via}, ${a.cs}.`); }
}
function cmd(a, c) {
  if (!a || !S.started || S.over) return;
  if (c.push && a.st === 'pushreq') {
    a.face = c.push; say('atc', `${a.cs}, push and start approved, face ${c.push === 'E' ? 'east' : 'west'}.`); say('pilot', `Push approved, facing ${c.push === 'E' ? 'east' : 'west'}, ${a.cs}.`);
    if (!tryPush(a)) { a.st = 'pushwait'; sys(`${a.cs} will push once the taxiway behind is clear.`); }
  }
  if (c.taxi && ['taxireq', 'taxi', 'short', 'vacated'].includes(a.st)) taxi(a, c.taxi, c.alt);
  if (c.altRoute && a.st === 'taxi' && a.dest) taxi(a, a.dest, (a.alt || 0) + 1);
  if (c.hold && a.st === 'taxi') { a.hold = !a.hold; say('atc', `${a.cs}, ${a.hold ? 'hold position' : 'continue taxi'}.`); say('pilot', `${a.hold ? 'Holding position' : 'Continuing'}, ${a.cs}.`); }
  if (c.turn && a.st === 'taxi' && onG(a)) {
    const e = E(a.from, a.to);
    if (e.kind !== 'twy') say('pilot', `${a.cs}, unable, no room to turn round here.`);
    else if (a.claim || S.ac.some(b => b !== a && onG(b) && ((b.from === a.from && b.to === a.to) || (!DUAL.has(e.name) && b.from === a.to && b.to === a.from)))) say('pilot', `${a.cs}, unable, traffic too close to turn round.`);
    else { a.st = 'turning'; a.timer = 40; a.hold = false; a.stuck = 0; say('atc', `${a.cs}, hold position, a tug will turn you round.`); say('pilot', `Holding for the tug, ${a.cs}.`); }
  }
  if (c.cross && a.st === 'taxi' && a.wantCross) { const n = N[a.to]; a.crossOK = true; a.wantCross = false; say('atc', `${a.cs}, cross runway ${rwName(n.rwy)} on ${n.conn}.`); say('pilot', `Crossing ${rwName(n.rwy)}, ${a.cs}.`); }
  if ((c.luaw || c.takeoff) && (a.st === 'short' || (c.takeoff && a.st === 'lineup'))) {
    const hs = a.st === 'short' ? a.to : null, rw = hs ? N[hs].rwy : a.rw, name = rwName(rw);
    const avail = hs ? availAt(hs) : (a.dir < 0 ? a.rx + 18 : 18 - a.rx), need = CLS[a.w].to;
    if (hs && availAt(hs) <= 0.5) { say('pilot', `${a.cs}, unable, this is the far end of runway ${name}.`); return; }
    if (avail < need) { say('pilot', `${a.cs}, unable from here, we need ${needTxt(a)} and have ${Math.round(avail * 100).toLocaleString('en-US')} m.`); return; }
    if (c.takeoff) {
      if (rwBusy(rw, a)) { say('pilot', `${a.cs}, unable, runway ${name} is not clear.`); return; }
      const ld = S.lastDep[rw];
      if (ld && S.t - ld.t < 120 && 'LMHJ'.indexOf(ld.w) > 'LMHJ'.indexOf(a.w) && ld.w !== 'M') { S.stats.wake++; addScore(-50, `Wake spacing: ${a.cs} cleared ${mmss(S.t - ld.t)} behind a ${CLS[ld.w].nm.toLowerCase()}`); }
      say('atc', `${a.cs}, runway ${name}, cleared for takeoff.`); say('pilot', `Cleared for takeoff ${name}, ${a.cs}.`);
      if (a.st === 'lineup') { a.st = 'roll'; a.rv = 0; a.rolled = 0; a.dir = flowDir(S.flow); }
      else { a.tkof = true; a.st = 'lining'; a.crossOK = true; a.route = ['r' + rw + N[hs].i]; }
    } else {
      if (S.ac.some(b => b !== a && rwOf(b) === rw && Math.abs((onG(b) ? b.x : b.rx) - N[hs].x) < 1.2)) { say('pilot', `${a.cs}, unable, traffic on the runway at ${N[hs].conn}.`); return; }
      say('atc', `${a.cs}, runway ${name}, line up and wait.`); say('pilot', `Lining up ${name}, ${a.cs}.`);
      a.tkof = false; a.st = 'lining'; a.crossOK = true; a.route = ['r' + rw + N[hs].i];
    }
  }
}

/* ---------- drawing ---------- */
const cv = $('gScope'), ctx = cv.getContext('2d'), wrap = $('gWrap');
const ts = (x, y) => [cvW / 2 + (x - view.cx) * view.s, cvH / 2 - (y - view.cy) * view.s];
const tw = (sx, sy) => [(sx - cvW / 2) / view.s + view.cx, -(sy - cvH / 2) / view.s + view.cy];
function fit() { view.cx = 0; view.cy = 2.5; view.s = Math.max(4, Math.min(cvW / 50, cvH / 32)); }
let sized = false;
function resize() { const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return; cvW = r.width; cvH = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2.5); cv.width = Math.round(cvW * dpr); cv.height = Math.round(cvH * dpr); if (!sized) { sized = true; fit(); } }
const selAc = () => (S.sel == null ? null : S.ac.find(a => a.id === S.sel) || null);
const needsYou = a => a.st === 'pushreq' || a.st === 'taxireq' || a.st === 'vacated' || a.st === 'short' || a.st === 'lineup' || a.wantCross;
function colorOf(a) { return S.t - a.incT < 12 ? C.alert : a.stuck > 40 ? C.warn : a.kind === 'arr' ? C.arr : C.dep; }
function rect(x0, y0, x1, y1) { const [a, b] = ts(x0, y1), [c, d] = ts(x1, y0); ctx.fillRect(a, b, c - a, d - b); return [a, b, c - a, d - b]; }
const PLANE = [[0, -0.5], [0.07, -0.3], [0.07, -0.08], [0.5, 0.12], [0.5, 0.2], [0.07, 0.1], [0.06, 0.36], [0.2, 0.46], [0.2, 0.52], [0, 0.47]];
function drawPlane(x, y, hdg, L, col, selected) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(hdg * D2R); ctx.beginPath();
  PLANE.forEach((p, i) => (i ? ctx.lineTo(p[0] * L, p[1] * L) : ctx.moveTo(p[0] * L, p[1] * L)));
  for (let i = PLANE.length - 1; i >= 0; i--) ctx.lineTo(-PLANE[i][0] * L, PLANE[i][1] * L);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); if (selected) { ctx.strokeStyle = C.sel; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
  ctx.restore();
}
function draw() {
  const W = cvW, H = cvH, s = view.s, sel = selAc();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const fs = W < 600 ? 10 : 11, mono = `${fs}px "B612 Mono", ui-monospace, Menlo, monospace`; ctx.font = mono; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 1;
  /* aprons and buildings */
  ctx.fillStyle = C.apron; rect(-15.5, -5.6, 15.5, 5.6); rect(-9.6, 12.2, 9.6, 17.6);
  ctx.fillStyle = C.bld; const tb = rect(-9.4, -1.1, 9.4, 1.1), cb = rect(-7.4, 16.1, 7.4, 17.3);
  ctx.fillStyle = C.dim; ctx.textAlign = 'center';
  if (s > 11) { ctx.fillText('TERMINAL', tb[0] + tb[2] / 2, tb[1] + tb[3] / 2 + 4); ctx.fillText('CARGO', cb[0] + cb[2] / 2, cb[1] + cb[3] / 2 + 4); }
  /* runways */
  for (const rw of ['N', 'S']) {
    const y = RY[rw]; ctx.fillStyle = C.rwy; rect(-18.7, y - 0.5, 18.7, y + 0.5);
    const [x0, y0] = ts(-17.2, y), [x1] = ts(17.2, y); ctx.strokeStyle = C.rwyLine; ctx.setLineDash([Math.max(3, 0.6 * s), Math.max(3, 0.5 * s)]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.ink; const act = S.flow === 'W';
    const [lx, ly] = ts(-20.6, y), [rx2] = ts(20.6, y);
    ctx.globalAlpha = act ? 0.45 : 1; ctx.fillText(rw === 'N' ? '09L' : '09R', lx, ly + 4); ctx.globalAlpha = act ? 1 : 0.45; ctx.fillText(rw === 'N' ? '27R' : '27L', rx2, ly + 4); ctx.globalAlpha = 1;
  }
  /* taxiways */
  const tww = Math.max(3, 0.42 * s);
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? C.twyLine : C.twy; ctx.lineWidth = pass ? 1 : tww; ctx.lineCap = 'round';
    for (const a in ADJ) for (const e of ADJ[a]) {
      if (a > e.to) continue; if (pass && e.kind === 'stem') continue;
      const [x0, y0] = ts(N[a].x, N[a].y), [x1, y1] = ts(N[e.to].x, N[e.to].y), dual = e.kind === 'twy' && DUAL.has(e.name);
      if (!pass) { ctx.lineWidth = dual ? tww * 2 : tww; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      else for (const o of dual ? [-0.24, 0.24] : [0]) { const ox = -(y1 - y0) / (e.len * s) * o * s, oy = (x1 - x0) / (e.len * s) * o * s; ctx.beginPath(); ctx.moveTo(x0 + ox, y0 + oy); ctx.lineTo(x1 + ox, y1 + oy); ctx.stroke(); }
    }
  }
  ctx.lineCap = 'butt'; ctx.lineWidth = 2; ctx.strokeStyle = C.arr;
  for (const h of HS) { const [x, y] = ts(N[h].x, N[h].y); ctx.beginPath(); ctx.moveTo(x - tww * 0.9, y); ctx.lineTo(x + tww * 0.9, y); ctx.stroke(); }
  ctx.lineWidth = 1;
  /* labels */
  if (s > 6.5) {
    ctx.fillStyle = 'rgba(126,161,166,.85)';
    for (const l of LABELS) { const [x, y] = ts(l[1], l[2]); ctx.fillText(l[0], x, y - tww * 0.5 - 3); }
    for (const h of HS) { const [x, y] = ts(N[h].x, N[h].y); ctx.textAlign = 'left'; ctx.fillText(N[h].conn, x + tww * 0.9 + 3, y + 4); }
    ctx.textAlign = 'center';
    for (const g of GATES) { const n = N[g], [x, y] = ts(n.x, n.y), free = gateFree(g); ctx.fillStyle = free ? 'rgba(127,227,164,.9)' : 'rgba(126,161,166,.6)'; ctx.fillText(g, x, y - (n.cat === 'C' || n.y < 0 ? 1 : -1) * s + 4); }
  }
  ctx.textAlign = 'left';
  /* selected route */
  if (sel && onG(sel) && (sel.st === 'taxi' || sel.st === 'lining')) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); const [x0, y0] = ts(sel.x, sel.y); ctx.moveTo(x0, y0);
    for (const n of [sel.to].concat(sel.route)) { const [x, y] = ts(N[n].x, N[n].y); ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
  }
  /* aircraft */
  const placed = [], lh = fs + 2;
  for (const a of S.ac) { const p = ts(a.st === 'final' ? -a.dir * (18 + 6.5 * (1 - Math.exp(-a.eta / 45))) : a.x, a.y); a._sx = p[0]; a._sy = p[1]; }
  for (const a of S.ac) {
    const x = a._sx, y = a._sy, isSel = a.id === S.sel, col = colorOf(a), L = Math.max(10 + 'LMHJ'.indexOf(a.w) * 1.5, CLS[a.w].sz * s * 1.25);
    if (a.st === 'final' && a.eta > 60) ctx.globalAlpha = 0.7;
    drawPlane(x, y, a.hdg, L * (a.air ? 1 + Math.min(0.5, a.alt / 20) : 1), col, isSel); ctx.globalAlpha = 1;
    if (needsYou(a) && !isSel) { ctx.strokeStyle = C.ok; ctx.beginPath(); ctx.arc(x, y, L * 0.75 + 2 + Math.sin(performance.now() / 220), 0, 6.3); ctx.stroke(); }
    if (a.hold) { ctx.strokeStyle = C.warn; ctx.strokeRect(x - L * 0.7, y - L * 0.7, L * 1.4, L * 1.4); }
    placed.push([x - L / 2, y - L / 2, L, L]);
  }
  for (const a of S.ac) {
    const quiet = (a.st === 'gate' || a.st === 'parked' || a.st === 'start' || a.st === 'push') && a.id !== S.sel && s < 15;
    if (quiet) continue;
    const x = a._sx, y = a._sy, isSel = a.id === S.sel, col = isSel ? C.sel : colorOf(a), lines = [a.cs];
    if (a.st === 'final') lines.push(`${rwName(a.rw)} ${mmss(a.eta)}`);
    else if (isSel || needsYou(a)) lines.push(shortStat(a));
    const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 4, bh = lines.length * lh + 2;
    const cand = [[10, -10 - bh], [10, 8], [-10 - bw, -10 - bh], [-10 - bw, 8], [-bw / 2, -18 - bh], [-bw / 2, 16]];
    let bx = x + cand[0][0], by = y + cand[0][1];
    for (const c of cand) { const rx = x + c[0], ry = y + c[1]; if (!placed.some(p => rx < p[0] + p[2] && rx + bw > p[0] && ry < p[1] + p[3] && ry + bh > p[1])) { bx = rx; by = ry; break; } }
    placed.push([bx, by, bw, bh]);
    ctx.fillStyle = 'rgba(6,19,26,.72)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = col; lines.forEach((l, i) => ctx.fillText(l, bx + 2, by + (i + 1) * lh - 2));
  }
  /* tutorial pointer */
  if (S.tut && S.started) { const st = TUT[S.tut.i], id = st && st.ring ? S.tut[st.ring] : null, a = id != null && S.ac.find(q => q.id === id); if (a) { ctx.strokeStyle = C.arr; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a._sx, a._sy, 18 + 4 * Math.sin(performance.now() / 180), 0, 6.3); ctx.stroke(); ctx.lineWidth = 1; } }
  /* drag preview */
  if (drag && drag.type === 'vec' && drag.moved) {
    const a = S.ac.find(q => q.id === drag.id);
    if (a) {
      let ex = drag.x, ey = drag.y, lab = 'Drop on a holding point or stand';
      if (drag.dst) { [ex, ey] = ts(N[drag.dst].x, N[drag.dst].y); lab = N[drag.dst].t === 'gate' ? 'STAND ' + drag.dst : `${N[drag.dst].conn} RWY ${rwName(N[drag.dst].rwy)}`; ctx.strokeStyle = C.sel; ctx.beginPath(); ctx.arc(ex, ey, 10, 0, 6.3); ctx.stroke(); }
      ctx.strokeStyle = C.sel; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a._sx, a._sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = `700 ${fs + 1}px "B612 Mono", ui-monospace, monospace`; const w2 = ctx.measureText(lab).width, lx = clamp(ex - w2 / 2, 4, W - w2 - 8), ly = Math.max(20, ey - 30);
      ctx.fillStyle = 'rgba(6,19,26,.92)'; ctx.fillRect(lx - 4, ly - fs - 4, w2 + 8, fs + 10); ctx.fillStyle = C.sel; ctx.fillText(lab, lx, ly); ctx.font = mono;
    }
  }
  if (S.paused && S.started && !S.over) { ctx.fillStyle = 'rgba(255,159,46,.9)'; ctx.font = '700 12px "B612", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', W / 2, H - 40); ctx.textAlign = 'left'; }
}

/* ---------- status text ---------- */
function shortStat(a) {
  switch (a.st) {
    case 'gate': return `STAND ${a.gate} BOARDING`;
    case 'pushreq': return `STAND ${a.gate} PUSH?`;
    case 'pushwait': return 'PUSH APPROVED, WAITING';
    case 'push': return 'PUSHING BACK';
    case 'start': return 'STARTING';
    case 'taxireq': return 'TAXI?';
    case 'turning': return 'TUG TURNING IT';
    case 'taxi': return a.wantCross ? `CROSS ${rwName(N[a.to].rwy)}?` : a.hold ? 'HOLDING POSITION' : a.stuck > 40 ? 'WAITING' : `TAXI ${N[a.dest].t === 'gate' ? a.dest : N[a.dest].conn}`;
    case 'short': return `READY ${rwName(N[a.to].rwy)} ${N[a.to].conn}`;
    case 'lining': return 'LINING UP';
    case 'lineup': return `LINED UP ${rwName(a.rw)}`;
    case 'roll': return a.air ? 'AIRBORNE' : 'ROLLING';
    case 'final': return `FINAL ${rwName(a.rw)} ${mmss(a.eta)}`;
    case 'rollout': return 'LANDING ROLL';
    case 'exiting': return 'VACATING';
    case 'vacated': return 'STAND?';
    case 'parked': return `ON STAND ${a.gate}`;
  }
  return '';
}
function hintOf(a) {
  const arrTxt = rw => { const n = nextArr(rw); return (rwBusy(rw, a) ? ' The runway is occupied right now.' : '') + (n ? ` Next landing on ${rwName(rw)} in ${mmss(n.eta)}.` : ` Nothing on final for ${rwName(rw)}.`); };
  switch (a.st) {
    case 'gate': return `Boarding on stand ${a.gate}. It will call for pushback in about ${mmss(a.timer)}.`;
    case 'pushreq': return `Ready to push from stand ${a.gate}. Choose which way it should face: it can only taxi forwards from there. The push blocks taxiway ${N[a.gate].cat === 'C' ? 'K' : N[a.gate].y > 0 ? 'E' : 'F'} for about a minute.`;
    case 'pushwait': return 'Push approved. The tug is waiting for traffic on the taxiway behind to pass.';
    case 'push': return 'Pushing back. The taxiway behind it is blocked until the tug disconnects.';
    case 'start': return 'Engines starting. It will call for taxi in a moment.';
    case 'taxireq': return `Ready to taxi, facing ${a.face === 'E' ? 'east' : 'west'}. Pick a holding point: this ${CLS[a.w].nm.toLowerCase()} needs ${needTxt(a)} of runway.`;
    case 'taxi':
      if (a.wantCross) return `Holding short of runway ${rwName(N[a.to].rwy)} on ${N[a.to].conn}, waiting to cross.` + arrTxt(N[a.to].rwy);
      if (a.hold) return 'Holding position on your instruction. Press CONTINUE to release it.';
      if (a.stuck > 40) return 'Stopped for other traffic. If it is nose to nose with someone, give one of them another route or have a tug turn it round.';
      return `Taxiing to ${N[a.dest].t === 'gate' ? 'stand ' + a.dest : N[a.dest].conn + ' for runway ' + rwName(N[a.dest].rwy)}${a.names.length ? ' via ' + a.names.join(', ') : ''}.${a.nAlt > 1 ? ' OTHER ROUTE cycles the alternatives.' : ''}`;
    case 'turning': return `A tug is turning it round, about ${mmss(a.timer)} left. It will then re-route to the same destination.`;
    case 'short': {
      const rw = N[a.to].rwy, av = availAt(a.to), ld = S.lastDep[rw];
      if (av <= 0.5) return `This is now the far end of runway ${rwName(rw)}. Taxi it to the other end.`;
      const wake = ld && S.t - ld.t < 120 && 'LMHJ'.indexOf(ld.w) > 'LMHJ'.indexOf(a.w) && ld.w !== 'M' ? ` Wake: wait ${mmss(120 - (S.t - ld.t))} behind the ${CLS[ld.w].nm.toLowerCase()}.` : '';
      return `Holding short of ${rwName(rw)} at ${N[a.to].conn}, ${Math.round(av * 100).toLocaleString('en-US')} m available.${av < CLS[a.w].to ? ' Not enough for this type.' : ''}${arrTxt(rw)}${wake}`; }
    case 'lining': return 'Entering the runway.';
    case 'lineup': return `Lined up on ${rwName(a.rw)}. The runway is blocked until it goes.` + arrTxt(a.rw);
    case 'roll': return a.air ? 'Airborne.' : 'Takeoff roll.';
    case 'final': return `On final for ${rwName(a.rw)}, landing in ${mmss(a.eta)}. It needs the runway clear 12 seconds before touchdown or it goes around.`;
    case 'rollout': return 'Landing roll. It takes the first exit it can stop for that is not blocked.';
    case 'exiting': return 'Vacating the runway.';
    case 'vacated': return `Clear of the runway on ${N[a.from].conn}, blocking that exit. Give it a stand: ${a.cargo ? 'cargo apron K1 to K4' : 'terminal G1 to G10'}${a.w === 'H' || a.w === 'J' ? ', heavy stands only' : ''}.`;
    case 'parked': return S.tut ? `On stand ${a.gate}.` : `On stand ${a.gate}. It turns round and departs again in about ${mmss(a.timer)}.`;
  }
  return '';
}

/* ---------- panels ---------- */
function setTxt(el, t) { if (el.textContent !== t) el.textContent = t; }
function select(id) { if (S.sel !== id) closeSheet(); S.sel = id; updUI(); }
const stripEls = new Map();
function updStrips() {
  const box = $('gStrips'), seen = new Set();
  for (const a of S.ac) {
    seen.add(a.id); let el = stripEls.get(a.id);
    if (!el) { el = document.createElement('button'); el.dataset.id = a.id; el.innerHTML = '<span class="s1"><b></b><i></i></span><span class="s2"></span>'; box.appendChild(el); stripEls.set(a.id, el); }
    const al = S.t - a.incT < 12, cls = `strip ${a.kind}${a.id === S.sel ? ' sel' : ''}${al ? ' alert' : a.stuck > 40 || a.hold ? ' warn' : ''}${needsYou(a) ? ' ready' : ''}${tutStrip === a.id ? ' tut-hl' : ''}`;
    if (el.className !== cls) el.className = cls;
    const b = el.firstChild.firstChild, i = el.firstChild.lastChild, s2 = el.lastChild;
    setTxt(b, a.cs); setTxt(i, `${a.type}/${a.w}${a.cargo ? ' CGO' : ''}`); setTxt(s2, shortStat(a));
    const rank = al ? 0 : needsYou(a) ? 10 : a.st === 'final' ? 100 + Math.round(a.eta) : a.st === 'taxi' || a.st === 'lining' || a.st === 'exiting' || a.st === 'rollout' ? 500 : a.st === 'roll' ? 600 : a.st === 'push' || a.st === 'start' || a.st === 'pushwait' ? 700 : a.st === 'gate' ? 800 + Math.round(a.timer) : 2000;
    if (el.style.order !== String(rank)) el.style.order = rank;
  }
  for (const [id, el] of stripEls) if (!seen.has(id)) { el.remove(); stripEls.delete(id); }
}
$('gStrips').addEventListener('click', e => { const el = e.target.closest('.strip'); if (!el) return; const id = +el.dataset.id; select(S.sel === id ? null : id); });
let logSeen = -1;
function updLog() {
  if (logSeen === S.logN) return; logSeen = S.logN;
  const box = $('gLog'), stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 30; box.textContent = '';
  for (const l of S.log.slice(-50)) { const d = document.createElement('div'); d.className = l.who; d.textContent = l.text; box.appendChild(d); }
  if (stick) box.scrollTop = box.scrollHeight;
  const last = S.log[S.log.length - 1], tk = $('gTicker'); if (last) { tk.textContent = last.text; tk.className = 'ticker ' + last.who; tk.hidden = false; } else tk.hidden = true;
}
function updAlerts() {
  const out = [];
  for (const a of S.ac) {
    if (S.t - a.incT < 12) out.push(['', `RWY INCURSION ${a.cs}`]);
    if (a.st === 'final' && !a.committed && a.eta < 35 && rwBusy(a.rw, a)) out.push(['w', `${rwName(a.rw)} OCCUPIED, ${a.cs} ${mmss(a.eta)}`]);
    if (a.st === 'rollout' && a.rv <= 0.3 && (a.dir < 0 ? a.exitI === 1 : a.exitI === 5) && Math.abs(a.rx) > 17.9) out.push(['', `${a.cs} STUCK ON ${rwName(a.rw)}`]);
    if (a.stuck > 40) out.push(['w', `WAITING ${a.cs}`]);
  }
  if (S.flowNext) out.push(['w', `RUNWAY CHANGE TO ${S.flowNext === 'W' ? '27' : '09'}${S.t < S.flowT ? ' IN ' + mmss(S.flowT - S.t) : ' PENDING'}`]);
  const html = out.slice(0, 5).map(o => `<span class="${o[0]}">${o[1]}</span>`).join(''), box = $('gAlerts'); if (box.innerHTML !== html) box.innerHTML = html;
}
function updPanel() {
  const a = selAc(); $('gEmpty').hidden = !!a; $('gBody').hidden = !a; if (!a) return;
  setTxt($('gCs'), a.cs); setTxt($('gInfo'), `${a.type} ${CLS[a.w].nm} ${a.kind === 'arr' ? 'ARR' : 'DEP'}${a.cargo ? ' CARGO' : ''}`);
  const st = $('gStat'); setTxt(st, shortStat(a)); st.className = 'cs' + (S.t - a.incT < 12 ? ' alert' : a.stuck > 40 ? ' warn' : '');
  setTxt($('gHint'), hintOf(a));
  $('gPushW').hidden = $('gPushE').hidden = a.st !== 'pushreq';
  const canTaxi = ['taxireq', 'taxi', 'short', 'vacated'].includes(a.st);
  $('gTaxi').hidden = !canTaxi; setTxt($('gTaxi'), a.kind === 'arr' ? (a.st === 'taxi' ? 'CHANGE STAND' : 'ASSIGN STAND') : a.st === 'taxireq' ? 'TAXI TO' : 'RE-ROUTE TO');
  $('gAlt').hidden = !(a.st === 'taxi' && a.nAlt > 1);
  $('gHold').hidden = a.st !== 'taxi' || a.wantCross; setTxt($('gHold'), a.hold ? 'CONTINUE' : 'HOLD'); $('gHold').setAttribute('aria-pressed', a.hold ? 'true' : 'false');
  $('gCross').hidden = !a.wantCross;
  $('gTurn').hidden = !(a.st === 'taxi' && !a.wantCross && (a.hold || a.stuck > 15));
  $('gLuaw').hidden = a.st !== 'short'; $('gTo').hidden = !(a.st === 'short' || a.st === 'lineup');
}
function updTop() {
  const s = Math.floor(S.t) + 14 * 3600; setTxt($('gClock'), `${p2(Math.floor(s / 3600) % 24)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}Z`);
  setTxt($('gScore'), S.score.toLocaleString('en-US'));
  const f = $('gFlow'); setTxt(f, `RWY ${S.flow === 'W' ? '27L/R' : '09L/R'}`); f.classList.toggle('chg', !!S.flowNext);
  const wd = Math.round(S.wind.dir / 10) * 10 || 360; setTxt($('gAtis'), `${cvW < 600 ? '' : 'INFO '}${String.fromCharCode(65 + S.atis)} ${String(wd).padStart(3, '0')}/${p2(S.wind.spd)}KT`);
  setTxt($('gPause'), S.paused ? '▶' : 'II'); setTxt($('gRate'), S.rate + 'x'); $('gSnd').setAttribute('aria-pressed', MER.snd() || (MER.speechOn && MER.speechOn()) ? 'true' : 'false');
}
function updUI() { if (!S) return; updTop(); updCoach(); updStrips(); updPanel(); updLog(); updAlerts(); if (S.tut && S.started) $('gTicker').hidden = true; if (sheetMode) fillSheet(); }

/* destination sheet */
function closeSheet() { sheetMode = null; $('gSheet').hidden = true; }
let sheetSig = '';
function destsFor(a) {
  if (a.kind === 'arr') return GATES.filter(g => gateFits(g, a)).map(g => { const free = gateFree(g, a), r = free ? routes(a, g)[0] : null; return { id: g, top: 'STAND ' + g, sub: free ? (r ? `${Math.round(r.len * 100).toLocaleString('en-US')} m taxi` : 'no route') : 'occupied', ok: free && !!r, len: r ? r.len : 999 }; }).sort((p, q) => p.len - q.len);
  const need = CLS[a.w].to;
  return HS.filter(h => availAt(h) >= 10).map(h => { const av = availAt(h), r = routes(a, h)[0]; return { id: h, top: `${rwName(N[h].rwy)} at ${N[h].conn}`, sub: !r ? 'no route' : av < need ? `${Math.round(av * 100).toLocaleString('en-US')} m, too short` : `${av >= 35.5 ? 'full length' : Math.round(av * 100).toLocaleString('en-US') + ' m'}, ${(r.len / 10).toFixed(1)} km taxi`, ok: !!r, bad: av < need, len: (r ? r.len : 999) + (av < need ? 500 : 0) }; }).sort((p, q) => p.len - q.len);
}
function fillSheet(force) {
  const a = selAc(); if (!a || !['taxireq', 'taxi', 'short', 'vacated'].includes(a.st)) return closeSheet();
  const html = destsFor(a).map(d => `<button data-v="${d.id}" class="${d.bad ? 'bad' : ''}${a.dest === d.id ? ' hot' : ''}${tutSheet && tutSheet(d.id) && d.ok ? ' tut-hl' : ''}"${d.ok ? '' : ' disabled'}>${d.top}<small>${d.sub}</small></button>`).join('');
  if (!force && html === sheetSig) return; sheetSig = html;
  $('gShTitle').textContent = a.kind === 'arr' ? `${a.cs} TAXI TO STAND` : `${a.cs} TAXI TO HOLDING POINT`; $('gShBody').innerHTML = html || '<p class="hint">No stand of the right kind exists for this aircraft.</p>';
}
$('gShBody').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; const a = selAc(); closeSheet(); cmd(a, { taxi: b.dataset.v }); updUI(); });
$('gShClose').onclick = closeSheet;
$('gTaxi').onclick = () => { if (sheetMode) return closeSheet(); sheetMode = 'dest'; $('gSheet').hidden = false; fillSheet(true); };
$('gPushW').onclick = () => { cmd(selAc(), { push: 'W' }); updUI(); };
$('gPushE').onclick = () => { cmd(selAc(), { push: 'E' }); updUI(); };
$('gAlt').onclick = () => { cmd(selAc(), { altRoute: true }); updUI(); };
$('gHold').onclick = () => { cmd(selAc(), { hold: true }); updUI(); };
$('gTurn').onclick = () => { cmd(selAc(), { turn: true }); updUI(); };
$('gCross').onclick = () => { cmd(selAc(), { cross: true }); updUI(); };
$('gLuaw').onclick = () => { cmd(selAc(), { luaw: true }); updUI(); };
$('gTo').onclick = () => { cmd(selAc(), { takeoff: true }); updUI(); };
$('gClose').onclick = () => select(null);

/* ---------- pointer input ---------- */
const ptrs = new Map();
function hitAc(x, y) { let b = null, bd = 26; for (const a of S.ac) { if (a._sx == null) continue; const d = Math.hypot(a._sx - x, a._sy - y); if (d < bd) { bd = d; b = a; } } return b; }
function hitDest(a, x, y) {
  const list = a.kind === 'arr' ? GATES.filter(g => gateFits(g, a) && gateFree(g, a)) : HS.filter(h => availAt(h) >= 10);
  let b = null, bd = 26; for (const id of list) { const p = ts(N[id].x, N[id].y), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = id; } } return b;
}
function ptr(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
cv.addEventListener('pointerdown', e => {
  const [x, y] = ptr(e); try { cv.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, [x, y]);
  if (ptrs.size === 2) { const p = [...ptrs.values()]; drag = { type: 'pinch', d0: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) || 1, s0: view.s, w: tw((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2) }; return; }
  const h = hitAc(x, y);
  if (h && ['taxireq', 'taxi', 'short', 'vacated'].includes(h.st)) drag = { type: 'vec', id: h.id, x0: x, y0: y, x, y, moved: false };
  else drag = { type: 'pan', x0: x, y0: y, cx0: view.cx, cy0: view.cy, moved: false, hit: h ? h.id : null };
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId) || !drag) return; const [x, y] = ptr(e); ptrs.set(e.pointerId, [x, y]);
  if (drag.type === 'pinch') { if (ptrs.size < 2) return; const p = [...ptrs.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2; view.s = clamp(drag.s0 * d / drag.d0, 4, 60); view.cx = drag.w[0] - (mx - cvW / 2) / view.s; view.cy = drag.w[1] + (my - cvH / 2) / view.s; return; }
  if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > (drag.type === 'vec' ? 14 : 7)) { drag.moved = true; if (drag.type === 'vec') select(drag.id); }
  if (!drag.moved) return;
  if (drag.type === 'pan') { view.cx = clamp(drag.cx0 - (x - drag.x0) / view.s, -26, 26); view.cy = clamp(drag.cy0 + (y - drag.y0) / view.s, -14, 19); }
  else { drag.x = x; drag.y = y; const a = S.ac.find(q => q.id === drag.id); drag.dst = a ? hitDest(a, x, y) : null; }
});
function ptrEnd(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); const d = drag; if (!d) return;
  if (d.type === 'pinch') { if (ptrs.size < 2) drag = null; return; }
  drag = null; if (e.type === 'pointercancel') return;
  if (d.type === 'vec') { const a = S.ac.find(q => q.id === d.id); if (!a) return; if (!d.moved) return select(a.id); if (d.dst) { cmd(a, { taxi: d.dst }); updUI(); } }
  else if (!d.moved) select(d.hit);
}
cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
function zoomAt(f, sx, sy) { const w = tw(sx, sy); view.s = clamp(view.s * f, 4, 60); view.cx = w[0] - (sx - cvW / 2) / view.s; view.cy = w[1] + (sy - cvH / 2) / view.s; }
cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = ptr(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
$('gzIn').onclick = () => zoomAt(1.35, cvW / 2, cvH / 2); $('gzOut').onclick = () => zoomAt(1 / 1.35, cvW / 2, cvH / 2); $('gzFit').onclick = fit;

/* ---------- top rail, overlay ---------- */
function togglePause() { if (!S.started || S.over) return; S.paused = !S.paused; if (S.paused && MER.hush) MER.hush(); updTop(); }
$('gPause').onclick = togglePause;
$('gRate').onclick = () => { S.rate = ({ 1: 2, 2: 4, 4: 8, 8: 1 })[S.rate] || 1; updTop(); };
$('gSnd').onclick = () => { if (MER.showAudio) MER.showAudio(); else { MER.toggleSnd(); updTop(); } };
$('gHelp').onclick = () => { if (S.over) return showOv('debrief'); S.paused = true; showOv('help'); };
document.addEventListener('keydown', e => { if (MER.mode !== 'gnd' || e.target.tagName === 'INPUT') return; if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); togglePause(); } else if (e.key === 'Escape') { if (sheetMode) closeSheet(); else select(null); } });
MER.gHow = `<ol>
<li><b class="d">Departures</b> call for pushback from their stand. Approve it facing east or west: they can only taxi forwards from there, and the push blocks that apron taxiway for about a minute.</li>
<li>When they call for taxi, pick a runway holding point. The route is drawn on the map and OTHER ROUTE cycles the alternatives. Heavies need the full length, mediums 2,000 m, lights 1,000 m.</li>
<li><b>Arrivals</b> show a countdown on final, land by themselves, and stop on the exit until you give them a stand. Heavies need G1, G5, G6, G10, K1 or K4. Cargo and light aircraft use the apron north of the runway, so they often have to cross it.</li>
<li>The runways are yours. LINE UP, TAKEOFF and CROSS only when nothing is close: a landing that finds the runway occupied 12 seconds out goes around, and entering in front of a rolling aircraft is a runway incursion.</li>
<li>Taxiways A, B, C and D are two-way. The apron lanes E, F and K are single file: aircraft wait outside rather than meet head on, so keep each lane flowing one way with your push directions and routes. If two do end up nose to nose, a tug can turn one round.</li>
<li>Leave two minutes after a heavy before sending a lighter type off the same runway.</li>
</ol>
<p>Tap an aircraft or strip to select it; a green ring means it is waiting for you. Drag from an aircraft to a holding point or a stand to taxi it there. Pinch or scroll to zoom.</p>
<p>Or talk: hold <b>MIC</b> (or <kbd>T</kbd>) and say it, for example &ldquo;Meridian 482, push and start approved, face west&rdquo;, &ldquo;taxi to holding point alpha 2&rdquo;, &ldquo;taxi to stand golf 3&rdquo;, &ldquo;cross runway 27 right&rdquo;, &ldquo;cleared for takeoff&rdquo;.</p>`;
function showOv(mode) {
  if (MER.hush) MER.hush();
  const card = $('ovCard'); $('ov').hidden = false; let h;
  if (mode === 'help') h = `<h1>GROUND PAUSED</h1>${MER.gHow}<div class="cta"><button class="pri" data-act="g-resume">RESUME</button><button data-act="g-end">END SHIFT</button></div>`;
  else {
    const st = S.stats, ops = st.dep + st.arr, bad = st.inc * 4 + st.ga * 1.5 + st.wake, r = bad / Math.max(1, ops), crash = S.over && S.over !== 'Shift ended.';
    const grade = crash ? 'Accident on your runway' : ops < 5 ? 'Too short a shift to rate' : r <= 0.05 ? 'A · Textbook' : r <= 0.15 ? 'B · Solid' : r <= 0.3 ? 'C · Untidy' : r <= 0.5 ? 'D · Needs retraining' : 'E · Report to the supervisor';
    const nb = !S.tut && S.score > best; if (nb) { best = S.score; try { localStorage.setItem('meridian.gbest', String(best)); } catch (e) {} }
    const cell = (v, l) => `<div><b>${v}</b><span class="lbl">${l}</span></div>`;
    h = `<h1>${crash ? 'SHIFT OVER' : 'GROUND DEBRIEF'}</h1><p>${crash ? S.over : `You worked ${Math.floor(S.t / 60)} minutes on position.`}</p><div class="grade">${grade}${nb && S.score > 0 ? ' · new best' : ''}</div>
    <div class="stats">${cell(S.score.toLocaleString('en-US'), 'SCORE')}${cell(st.dep, 'DEPARTED')}${cell(st.arr, 'ON STAND')}${cell(st.inc, 'RUNWAY INCURSIONS')}${cell(st.ga, 'GO-AROUNDS')}${cell(st.wake, 'WAKE BUSTS')}</div>
    <div class="cta"><button class="pri" data-act="g-new">NEW SHIFT</button></div>`;
  }
  card.innerHTML = h;
}
$('ovCard').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const act = b.dataset.act; if (!act || !act.startsWith('g-')) return;
  if (act === 'g-tut') { MER.audio(); initTutorial(); MER.enterGround(); S.started = true; S.paused = false; sized = false; resize(); sys('Ground tutorial. Follow the prompts at the bottom of the map.'); if (!loop) { loop = true; requestAnimationFrame(frame); } tutGo(0); }
  else if (act === 'g-start') { markTut(); MER.audio(); init({ traffic: MER.cfg.traffic, gwx: MER.cfg.gwx }); MER.enterGround(); S.started = true; S.paused = false; sized = false; resize(); sys(`Ground shift started. Runways ${S.flow === 'W' ? '27L and 27R' : '09L and 09R'} in use.`); if (!loop) { loop = true; requestAnimationFrame(frame); } }
  else if (act === 'g-resume') { S.paused = false; $('ov').hidden = true; }
  else if (act === 'g-end') { S.over = 'Shift ended.'; S.paused = true; showOv('debrief'); }
  else if (act === 'g-new') { MER.toBrief(); return; }
  updUI();
});

/* ---------- tutorial: one departure, one landing, one runway crossing ---------- */
let tutDone = false, tutStrip = null, tutSheet = null, hlEl = null;
try { tutDone = localStorage.getItem('meridian.gtut') === '1'; } catch (e) {}
MER.gTutDone = () => tutDone;
function markTut() { tutDone = true; try { localStorage.setItem('meridian.gtut', '1'); } catch (e) {} }
const tAc = k => S.ac.find(a => a.id === S.tut[k]);
const TUT = [
  { hold: 1, strip: 'dep', ring: 'dep', done: () => S.sel === S.tut.dep,
    txt: () => `This is the airport surface. Blue aircraft are departures, sand ones are arrivals, and a green ring means one is waiting for you. Tap ${tAc('dep').cs} on stand G3, or tap its strip below.` },
  { hold: 1, need: 'dep', hl: () => $('gPushE'), done: () => tAc('dep').st !== 'pushreq',
    txt: () => 'It is asking to push back. Runway 27 is in use, so departures head for the east end. Press PUSH, FACE EAST. It can only taxi forwards from where the tug leaves it.' },
  { rate: 4, ring: 'arr', done: () => tAc('dep').st === 'taxireq',
    txt: () => `The tug pushes it onto taxiway E and the engines start. That lane is blocked for about a minute. Meanwhile ${tAc('arr').cs} has appeared on final for 27R, off the right-hand end of the runway, with a countdown.` },
  { hold: 1, need: 'dep', hl: () => (sheetMode ? null : $('gTaxi')), sheet: id => id === 'hA5', done: () => { const d = tAc('dep'); return d.st === 'taxi' && d.dest === 'hA5'; },
    txt: () => (tAc('dep').st === 'taxi' ? 'That would work in a real shift, but for this lesson press RE-ROUTE TO and choose 27R at A5. ' : 'Now it wants to taxi. ') + 'Press TAXI TO and choose 27R at A5, the full-length holding point.' },
  { rate: 4, ring: 'arr', done: () => { const a = tAc('arr'); return !a || a.st === 'vacated'; },
    txt: () => `It follows the dashed route by itself and stops at the holding point. Now watch ${tAc('arr').cs} land. Arrivals need nothing from you except a clear runway 12 seconds before touchdown.` },
  { hold: 1, strip: 'arr', ring: 'arr', done: () => S.sel === S.tut.arr,
    txt: () => `${tAc('arr').cs} is clear of the runway and is blocking that exit until you move it. Tap it.` },
  { hold: 1, need: 'arr', hl: () => (sheetMode ? null : $('gTaxi')), sheet: () => true, done: () => { const a = tAc('arr'); return a.st === 'taxi' && !!a.dest; },
    txt: () => 'Give it somewhere to park. Press ASSIGN STAND and choose any stand from the list. The nearest is listed first; occupied ones are greyed out.' },
  { rate: 4, ring: 'dep', done: () => { const d = tAc('dep'); return !d || d.st === 'short'; },
    txt: () => `It taxis there by itself. Now wait for ${tAc('dep').cs} to reach the holding point at the east end.` },
  { hold: 1, strip: 'dep', ring: 'dep', done: () => S.sel === S.tut.dep,
    txt: () => `${tAc('dep').cs} is holding short of 27R at A5 and is ready. Tap it.` },
  { hold: 1, need: 'dep', hl: () => $('gTo'), done: () => { const d = tAc('dep'); return !d || d.st === 'lining' || d.st === 'roll'; },
    txt: () => 'The runways are yours. The panel says nothing is on final for 27R, so press TAKEOFF. LINE UP would put it on the runway to wait, which blocks landings.' },
  { rate: 4, ring: 'dep', done: () => !tAc('dep'),
    txt: () => 'Rolling. Once it is airborne the runway is free again. A lighter aircraft behind a heavy needs a two-minute gap.' },
  { hold: 1, strip: 'cgo', ring: 'cgo', done: () => S.sel === S.tut.cgo,
    txt: () => `Last thing: runway crossings. ${tAc('cgo').cs} landed on 27L and is waiting on exit B4. It is a cargo flight, so it parks north of runway 27R. Tap it.` },
  { hold: 1, need: 'cgo', hl: () => (sheetMode ? null : $('gTaxi')), sheet: () => true, done: () => { const c = tAc('cgo'); return c.st === 'taxi' && !!c.dest; },
    txt: () => 'Press ASSIGN STAND and choose a cargo stand. Only stands it can use are listed.' },
  { rate: 8, ring: 'cgo', done: () => { const c = tAc('cgo'); return !c || c.wantCross || c.st === 'parked'; },
    txt: () => 'Its route crosses runway 27R, so it will stop at the holding point and ask. Time is running fast while it taxis.' },
  { hold: 1, need: 'cgo', ring: 'cgo', hl: () => $('gCross'), done: () => { const c = tAc('cgo'); return !c || !c.wantCross; },
    txt: () => 'It is holding short of 27R. Nothing is on final and nobody is rolling, so press CROSS RUNWAY. Sending one across in front of a landing or a takeoff is a runway incursion.' },
  { rate: 8, ring: 'cgo', done: () => { const c = tAc('cgo'); return !c || c.st === 'parked'; },
    txt: () => 'Across. It carries on to its stand by itself.' },
  { hold: 1, next: 1, last: 1,
    txt: () => 'That is the basic loop. A full shift gives you a dozen at once, single-file apron lanes to keep flowing one way, heavies that need full length and the big stands, landings to fit your takeoffs and crossings between, and wind shifts that reverse the runways. The line under the callsign always says what the selected aircraft needs.' },
];
function initTutorial() {
  init({ traffic: 0, gwx: 0 }, true);
  S.nextArr = S.nextDep = 1e9;
  const d = spawnDepAt('G3', 0, false, 'A320', 'MRX'); d.st = 'pushreq'; d.t0 = 0;
  S.lastEta.N = -999; const a = spawnArr(170, 'N');
  const f = { al: AIRLINES[5], type: 'C208' }, c = baseAc('arr', f); c.st = 'hidden'; c.rw = 'S';
  S.log = []; S.logN = 0; S.tut = { i: 0, dep: d.id, arr: a.id, cgo: c.id, cgoAc: c, t0: 0 };
}
function tutGo(i) {
  const t = S.tut; t.i = i; t.t0 = S.t; const st = TUT[i]; if (st && st.rate) S.rate = st.rate; if (st && st.last) markTut();
  if (st && st.strip === 'cgo' && t.cgoAc) { const c = t.cgoAc; t.cgoAc = null; c.st = 'vacated'; c.from = 'hB4'; c.to = 'b8'; c.pos = 0.7; c.t0 = S.t; S.ac.push(c); place(c); say('pilot', `Ground, ${c.cs}, clear of runway 27L on B4, request stand.`); }
  updUI(); if (st && MER.speak) { try { MER.speak('coach', st.txt()); } catch (e) {} }
}
function tutTick() { const t = S && S.tut; if (!t || !S.started || S.over) return; const st = TUT[t.i]; if (!st || st.next) return; let ok; try { ok = st.done(); } catch (e) { ok = true; } if (ok) tutGo(t.i + 1); }
const tutHold = () => !!(S && S.tut && TUT[S.tut.i] && TUT[S.tut.i].hold);
function setHl(el) { if (hlEl === el) return; if (hlEl) hlEl.classList.remove('tut-hl'); hlEl = el || null; if (hlEl) hlEl.classList.add('tut-hl'); }
function updCoach() {
  const box = $('gCoach'), t = S.tut, st = t && TUT[t.i];
  if (!st || !S.started || S.over) { box.hidden = true; setHl(null); tutStrip = null; tutSheet = null; return; }
  box.hidden = false;
  const needId = st.need ? t[st.need] : null, who = needId != null ? S.ac.find(a => a.id === needId) : null, lost = !!who && S.sel !== needId;
  setTxt($('gcoN'), `TUTORIAL \u00b7 ${t.i + 1} OF ${TUT.length}`);
  let msg = null; try { msg = lost ? `Select ${who.cs} again to carry on.` : st.txt(); } catch (e) {} if (msg != null) setTxt($('gcoTxt'), msg);
  $('gcoNext').hidden = !st.next; setTxt($('gcoNext'), st.last ? 'START A FULL SHIFT' : 'NEXT'); $('gcoSkip').hidden = !!st.last;
  setTxt($('gcoNote'), st.next ? '' : st.hold ? 'Time is frozen until you do this.' : `Time is running at ${S.rate}x.`);
  tutStrip = lost ? needId : st.strip ? t[st.strip] : null; tutSheet = lost ? null : st.sheet || null;
  let he = null; try { he = lost || !st.hl ? null : st.hl(); } catch (e) {} setHl(he);
}
function endTutorial() { markTut(); MER.toBrief(); }
$('gcoNext').onclick = () => { const st = S.tut && TUT[S.tut.i]; if (!st) return; if (st.last) endTutorial(); else tutGo(S.tut.i + 1); };
$('gcoSkip').onclick = endTutorial;

/* ---------- lifecycle ---------- */
function init(cfg, bare) {
  S = { cfg, t: 0, score: 0, ac: [], nid: 1, sel: null, log: [], logN: 0, flow: 'W', flowNext: null, flowT: 0, nextShift: rnd(6, 9) * 60, wind: { dir: 280, tDir: 280, spd: 11 }, atis: 0, gates: {}, lastEta: { N: -999, S: -999 }, lastDep: { N: null, S: null }, nextArr: 95, nextDep: 150, stats: { dep: 0, arr: 0, ga: 0, inc: 0, wake: 0 }, rate: 2, paused: true, started: false, over: null };
  for (const g of GATES) S.gates[g] = { occ: null, res: null };
  for (const [, el] of stripEls) el.remove(); stripEls.clear(); logSeen = -1; closeSheet();
  if (bare) return;
  spawnDepAt('G2', 4, false); spawnDepAt('G4', 55, false); spawnDepAt('G7', 100, false); spawnDepAt('G10', 160, false, 'B763', 'NVA'); spawnDepAt('K1', 75, true, 'B763', 'TRK'); spawnDepAt('K3', 200, true, 'PC12', 'N');
  S.log = []; spawnArr(55, 'N'); spawnArr(125, 'S'); S.log = []; S.logN = 0;
}
let lastT = 0, uiT = 0, loop = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (MER.mode !== 'gnd') { lastT = now; return; }
  const real = Math.min(0.1, (now - lastT) / 1000 || 0); lastT = now;
  tutTick();
  if (S.started && !S.paused && !S.over && !tutHold() && !MER.hold) { const sim = real * S.rate, n = Math.max(1, Math.ceil(sim / 0.25)); for (let i = 0; i < n && !S.over; i++) step(sim / n); }
  draw(); if (now - uiT > 200) { uiT = now; updUI(); }
}
new ResizeObserver(resize).observe(wrap);

/* ---------- voice commands (src/listen.js turns the speech into c) ---------- */
function voiceDest(a, c) {
  let stand = c.stand, hp = c.hp;
  if (c.spot) { if (a.kind === 'arr') stand = c.spot; else hp = c.spot; }
  if (stand) {
    if (a.kind !== 'arr') return { err: `${a.cs} is a departure: give it a holding point.` };
    if (!N[stand] || N[stand].t !== 'gate') return { err: `There is no stand ${stand}.` };
    if (!gateFits(stand, a)) return { err: `Stand ${stand} does not suit ${a.cs}: ${a.cargo && N[stand].cat !== 'C' ? 'it parks on the cargo apron, K1 to K4' : !a.cargo && N[stand].cat === 'C' ? 'the K stands are for cargo and light aircraft' : 'heavies need G1, G5, G6, G10, K1 or K4'}.` };
    if (!gateFree(stand, a)) return { err: `Stand ${stand} is occupied.` };
    return { id: stand };
  }
  if (hp) {
    if (a.kind === 'arr') return { err: `${a.cs} has landed: give it a stand.` };
    const id = 'h' + hp; if (!N[id] || N[id].t !== 'hs') return { err: `There is no holding point ${hp}.` };
    return { id };
  }
  if (c.rwy) {
    if (a.kind === 'arr') return { err: `${a.cs} has landed: give it a stand.` };
    const rw = ['N', 'S'].find(r => rwName(r) === c.rwy);
    if (!rw) return { err: `Runway ${c.rwy} is not in use. Runways ${S.flow === 'W' ? '27L and 27R' : '09L and 09R'} are.` };
    const d = destsFor(a).find(x => x.ok && !x.bad && N[x.id].rwy === rw);
    return d ? { id: d.id } : { err: `No holding point on ${c.rwy} is long enough for ${a.cs}.` };
  }
  return null;
}
MER.gnd = {
  live: () => !!S && S.started && !S.over,
  callsigns: () => S.ac.map(a => a.cs),
  run(cs, c) {   // returns '' once the clearance has gone out, or why it could not
    const a = cs ? S.ac.find(x => x.cs === cs) : selAc();
    if (!a) return 'No aircraft selected. Start with the callsign.';
    if (cs) select(a.id);
    let err = '';
    const no = t => { err = err || t; };
    if (c.push) { if (a.st !== 'pushreq') no(`${a.cs} is not waiting for pushback.`); else cmd(a, { push: c.push }); }
    const d = voiceDest(a, c);
    if (d) {
      if (d.err) no(d.err);
      else if (!['taxireq', 'taxi', 'short', 'vacated'].includes(a.st)) no(`${a.cs} is not ready to taxi.`);
      else cmd(a, { taxi: d.id });
    }
    if (c.altRoute) { if (a.st !== 'taxi' || !a.dest) no(`${a.cs} is not taxiing.`); else cmd(a, { altRoute: true }); }
    if (c.holdPos != null) { if (a.st !== 'taxi') no(`${a.cs} is not taxiing.`); else if (!!a.hold !== c.holdPos) cmd(a, { hold: true }); }
    if (c.turn) { if (a.st !== 'taxi') no(`${a.cs} is not taxiing.`); else cmd(a, { turn: true }); }
    if (c.cross) { if (a.st !== 'taxi' || !a.wantCross) no(`${a.cs} is not waiting to cross a runway.`); else cmd(a, { cross: true }); }
    if (c.luaw || c.takeoff) { if (a.st !== 'short' && !(c.takeoff && a.st === 'lineup')) no(`${a.cs} is not holding short of a runway.`); else cmd(a, { luaw: !!c.luaw && !c.takeoff, takeoff: !!c.takeoff }); }
    updUI(); return err;
  },
};
window.__gnd = { get S() { return S; }, N, cmd, step, select, routes, path };
})();
