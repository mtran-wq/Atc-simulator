const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const errs = [];
  for (const [name, vp] of [['phone', {width:390,height:780}], ['desk', {width:1280,height:800}]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    p.on('pageerror', e => errs.push(name+': '+e.message)); p.on('console', m => { if (m.type()==='error') errs.push(name+' console: '+m.text()); });
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(800);
    if (name==='phone') await p.screenshot({ path: 'brief.png' });
    await p.click('[data-act=start]');
    const res = await p.evaluate(() => {
      const A = window.__atc, S = A.S; S.paused = true; const out = {};
      // arrival ILS test
      const a = S.ac.find(x => x.kind==='arr'); a.x=14; a.y=4; a.alt=4000; a.tAlt=3000; a.ias=190; a.tSpd=180; a.hdg=240; a.nav={mode:'hdg',hdg:240};
      A.issue(a,{ils:'27R'});
      // remove other arrivals to isolate
      S.ac = S.ac.filter(x => x===a || x.kind==='dep'); S.nextArr=1e9; S.nextDep=1e9; S.nextEmg=1e9; S.wind.next=1e9;
      const d = S.ac.find(x => x.phase==='hold'); A.issue(d,{takeoff:true}); A.issue(d,{dct:d.exitFix, alt:9000});
      let est=null;
      for (let i=0;i<2400 && !S.over;i++){ A.step(0.5); if(!est && a.nav.mode==='loc') est={t:S.t,d:a.dFin,alt:a.alt}; }
      out.est=est; out.landed=S.stats.landed; out.dep=S.stats.dep; out.ga=S.stats.ga; out.score=S.score; out.over=S.over; out.depState=S.ac.includes(d)?{x:d.x,y:d.y,alt:d.alt,ph:d.phase}:'gone';
      out.log=S.log.map(l=>l.text).slice(-14);
      return out;
    });
    if (name==='phone') console.log(JSON.stringify(res,null,1));
    // free-run stress
    const st = await p.evaluate(() => { const A=window.__atc,S=A.S; S.nextArr=S.t; S.nextDep=S.t; S.nextEmg=S.t+200; S.wind.next=S.t+100; S.cfg.weather=2; S.cfg.traffic=2; S.nextCell=S.t;
      for(let i=0;i<4000&&!S.over;i++){A.step(0.5); if(i===600){const h=S.ac.find(x=>x.phase==='air'&&x.kind==='arr'); if(h){A.issue(h,{hold:'EKKON',alt:6000,spd:200}); A.issue(h,{exp:true});}} }
      return {t:S.t, over:S.over, n:S.ac.length, stats:S.stats, score:S.score}; });
    console.log(name, JSON.stringify(st));
    if (name==='phone') { // fresh game for screenshot
      await p.reload(); await p.waitForTimeout(500); await p.click('[data-act=start]');
      await p.evaluate(()=>{const A=window.__atc,S=A.S; S.paused=true; S.cfg.weather=2; S.cells.push({x:-21,y:-9,r:4.5,v:22}); for(let i=0;i<300;i++)A.step(0.5); const a=S.ac.find(x=>x.kind==='arr'&&x.phase==='air'); A.issue(a,{hdg:120,alt:5000,ils:'27R'}); A.select(a.id); S.paused=false;});
      await p.waitForTimeout(700); await p.screenshot({ path: 'phone.png' });
      await p.click('#aIls'); await p.waitForTimeout(300); await p.screenshot({ path: 'phone2.png' });
    } else {
      await p.reload(); await p.waitForTimeout(500); await p.click('[data-act=start]');
      await p.evaluate(()=>{const A=window.__atc,S=A.S; for(let i=0;i<400;i++)A.step(0.5); const a=S.ac.find(x=>x.kind==='arr'&&x.phase==='air'); A.select(a.id);});
      await p.fill('#cliIn','H 180 A 50 S 210'); await p.press('#cliIn','Enter');
      await p.waitForTimeout(700); await p.screenshot({ path: 'desk.png' });
      console.log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    }
    await p.close();
  }
  console.log('errors', errs);
  await b.close();
})();
