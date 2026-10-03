const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const errs = [];
  const p = await b.newPage({ viewport: {width:390,height:780}, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/ERR_TUNNEL/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(600);
  const ti = () => p.evaluate(() => { const S = window.__atc.S; return S.tut ? S.tut.i : -1; });
  const w = () => p.waitForTimeout(350);
  console.log('cta', await p.$$eval('.cta button', e => e.map(x => x.textContent)));
  await p.click('[data-act=tut]'); await w();
  await p.click('.strip.arr'); await w(); console.log('after select', await ti());
  await p.click('#coNext'); await w();
  await p.click('.step[data-k=alt] button[data-d="-1"]'); await p.click('.step[data-k=alt] button[data-d="-1"]'); await w();
  console.log('hl', await p.$$eval('.tut-hl', e => e.map(x => x.id || x.className)));
  await p.click('#aSend'); await w(); console.log('after alt', await ti());
  for (let i=0;i<5;i++) await p.click('.step[data-k=spd] button[data-d="-1"]'); await p.click('#aSend'); await w(); console.log('after spd', await ti());
  await p.click('.step[data-k=hdg] button[data-d="1"]'); await p.click('.step[data-k=hdg] button[data-d="1"]'); await w(); await p.screenshot({ path: 'tut1.png' });
  await p.click('#aSend'); await w(); console.log('after hdg', await ti());
  await p.click('#aIls'); await w(); console.log('sheet hl', await p.$$eval('#shBody .tut-hl', e => e.map(x => x.dataset.v)));
  await p.click('#shBody [data-v="27R"]'); await w(); console.log('after ils', await ti());
  await p.click('.strip.dep'); await w();
  await p.click('#aDct'); await w(); await p.click('#shBody [data-v="SUNDA"]'); await w(); console.log('after dct', await ti());
  for (let i=0;i<4;i++) await p.click('.step[data-k=alt] button[data-d="1"]'); await p.click('#aSend'); await w(); console.log('after dep alt', await ti());
  await p.click('#aTo'); await w(); console.log('after takeoff', await ti(), await p.evaluate(()=>window.__atc.S.rate));
  // fast-forward the watch steps
  const r = await p.evaluate(async () => { const A = window.__atc, S = A.S; const seen = [];
    for (let i = 0; i < 4000 && S.tut.i < 13; i++) { A.step(0.5); await new Promise(r => i % 40 ? r() : requestAnimationFrame(r)); if (seen[seen.length-1] !== S.tut.i) seen.push(S.tut.i, Math.round(S.t)); }
    return { seen, stats: S.stats, score: S.score, n: S.ac.length }; });
  console.log(JSON.stringify(r)); await w();
  console.log('final', await ti(), await p.$eval('#coNext', e => e.textContent), await p.$eval('#coTxt', e => e.textContent.slice(0, 40)));
  await p.click('#coNext'); await w();
  console.log('cta after', await p.$$eval('.cta button', e => e.map(x => x.textContent)), 'coach hidden', await p.$eval('#coach', e => e.hidden), 'tut', await p.evaluate(() => window.__atc.S.tut || null));
  await p.click('[data-act=start]'); await w(); console.log('full shift ac', await p.evaluate(() => window.__atc.S.ac.length), 'ticker hidden', await p.$eval('#ticker', e => e.hidden));
  console.log('errors', errs); await b.close();
})();
