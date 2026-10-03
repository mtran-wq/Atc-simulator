const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const errs = [];
  for (const [name, vp] of [['phone', {width:390,height:780}], ['desk', {width:1280,height:800}]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    p.on('pageerror', e => errs.push(name+': '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console', m => { if (m.type()==='error' && !/ERR_TUNNEL/.test(m.text())) errs.push(name+' console: '+m.text()); });
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.click('[data-seg=pos] [data-i="1"]'); await p.waitForTimeout(200);
    if (name==='phone') await p.screenshot({ path: 'gbrief.png' });
    await p.click('[data-act=g-start]'); await p.waitForTimeout(400);
    const res = await p.evaluate(() => {
      const G = window.__gnd, S = G.S, N = G.N; S.paused = true; const ev = []; const seen = {};
      const hsList = Object.keys(N).filter(k => N[k].t === 'hs'), gates = Object.keys(N).filter(k => N[k].t === 'gate');
      const dirx = () => S.flow === 'W' ? -1 : 1;
      const avail = h => dirx() < 0 ? N[h].x + 18 : 18 - N[h].x;
      const need = { L: 10, M: 20, H: 28, J: 30 };
      const eta = rw => Math.min(999, ...S.ac.filter(a => a.st === 'final' && a.rw === rw).map(a => a.eta));
      const busy = (rw, me) => S.ac.some(b => b !== me && (b.st === 'lineup' || b.st === 'rollout' || (b.st === 'roll' && !b.air) || (b.from && (N[b.to].t === 'rwy' || N[b.from].t === 'rwy')) ) && (b.rw === rw || (b.from && (N[b.to].rwy === rw || N[b.from].rwy === rw))));
      let maxStuck = 0, stuckWho = '', turns = 0;
      for (let i = 0; i < 4 * 60 * 45 && !S.over; i++) {
        G.step(0.25);
        if (i % 8 === 0) for (const a of S.ac.slice()) {
          if (a.st === 'pushreq') G.cmd(a, { push: window.__dumb ? (Math.random() < 0.5 ? 'E' : 'W') : (S.flow === 'W' ? 'E' : 'W') });
          else if (a.st === 'taxireq') { const opts = hsList.filter(h => avail(h) >= need[a.w]).map(h => [h, G.routes(a, h)[0]]).filter(o => o[1]).sort((p, q) => p[1].len - q[1].len); if (opts.length) G.cmd(a, { taxi: opts[0][0] }); }
          else if (a.st === 'short') { const rw = N[a.to].rwy; if (avail(a.to) < need[a.w]) { const opts = hsList.filter(h => avail(h) >= need[a.w]).map(h => [h, G.routes(a, h)[0]]).filter(o => o[1]).sort((p, q) => p[1].len - q[1].len); if (opts.length) G.cmd(a, { taxi: opts[0][0] }); } else if (eta(rw) > 75 && !busy(rw, a)) G.cmd(a, { takeoff: true }); }
          else if (a.st === 'vacated') { const opts = gates.filter(g => (N[g].cat === 'C') === a.cargo && (N[g].heavy || (a.w !== 'H' && a.w !== 'J')) && S.gates[g].occ == null && S.gates[g].res == null).map(g => [g, G.routes(a, g)[0]]).filter(o => o[1]).sort((p, q) => p[1].len - q[1].len); if (opts.length) G.cmd(a, { taxi: opts[0][0] }); }
          else if (a.st === 'taxi' && a.wantCross) { const rw = N[a.to].rwy; if (eta(rw) > 40 && !busy(rw, a)) G.cmd(a, { cross: true }); }
          else if (a.st === 'taxi' && a.stuck > 120 && !a.hold && !seen['t' + a.id + ':' + Math.floor(S.t / 120)]) { seen['t' + a.id + ':' + Math.floor(S.t / 120)] = 1; turns++; G.cmd(a, { turn: true }); }
          else if (a.st === 'taxi' && a.stuck > 90 && a.nAlt > 1 && !seen[a.id + ':' + Math.floor(S.t / 60)]) { seen[a.id + ':' + Math.floor(S.t / 60)] = 1; G.cmd(a, { altRoute: true }); }
          if (a.stuck > maxStuck) { maxStuck = a.stuck; stuckWho = a.cs + ' ' + a.from + '>' + a.to + ' ' + a.route.join(','); }
        }
      }
      return { turns, t: Math.round(S.t), over: S.over, stats: S.stats, score: S.score, n: S.ac.length, flow: S.flow, maxStuck: Math.round(maxStuck), stuckWho, states: S.ac.map(a => a.cs + ':' + a.st + (a.stuck > 40 ? '!' + Math.round(a.stuck) : '')).join(' ') };
    });
    console.log(name, JSON.stringify(res));
    await p.evaluate(() => { const S = window.__gnd.S; const a = S.ac.find(x => x.st === 'taxi') || S.ac.find(x => x.st==='short') || S.ac[0]; window.__gnd.select(a.id); S.paused = false; });
    await p.waitForTimeout(700); await p.screenshot({ path: 'g' + name + '.png' });
    console.log('overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await p.close();
  }
  console.log('errors', errs); await b.close();
})();
