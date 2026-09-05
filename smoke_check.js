'use strict';
/*
 * smoke_check.js — 16 headless checks against game.js (Node, no browser).
 * Run: node smoke_check.js
 */
const { createHarness } = require('./check_harness');

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
}

const hs = createHarness();
hs.load();
const H = hs.H;
const F = hs.F;

/* ---------- 1. boot ---------- */
console.log('1. boot');
const menuTxt = hs.findEl('#menuScr') ? hs.findEl('#menuScr').textContent : hs.body.textContent;
check('state is MENU after boot', F.state === 'MENU');
check('no fatal screen', !hs.byId.fatal.classList.contains('on'));
check('no console errors at boot', H.errCount === 0, H.logs.slice(-5).join(' | '));
check('no "undefined" in UI text', menuTxt.indexOf('undefined') < 0 && menuTxt.indexOf('[object') < 0);

/* ---------- 2. SDK safe no-op (no YaGames outside platform) ---------- */
console.log('2. sdk no-op');
const sdk = F._internals.SDK;
check('SDK.ready true without YaGames', sdk.ready === true);
check('rewarded unavailable offline', sdk.rewardedAvailable() === false);
check('interstitial unavailable offline', sdk.interstitialAvailable() === false);
let rwDone = false;
sdk.showRewarded(function (ok) { rwDone = true; check('showRewarded cb fires with ok=false', ok === false); });
hs.tick(50);
let lbVal = 'unset';
sdk.lbTop(function (v) { lbVal = v; });
hs.tick(50);
check('lbTop resolves null offline', lbVal === null);

/* ---------- 3. i18n RU/EN ---------- */
console.log('3. i18n');
const I18N = F._internals.I18N;
const dict = I18N.dict;
const ruKeys = Object.keys(dict.ru), enKeys = Object.keys(dict.en);
const symA = ruKeys.filter(k => !Object.prototype.hasOwnProperty.call(dict.en, k));
const symB = enKeys.filter(k => !Object.prototype.hasOwnProperty.call(dict.ru, k));
check('RU/EN key sets identical', symA.length === 0 && symB.length === 0, JSON.stringify({ a: symA, b: symB }));
const empty = ruKeys.filter(k => !String(dict.ru[k] || '').trim());
check('no empty translations', empty.length === 0, JSON.stringify(empty));
I18N.set('en');
check('EN play label', hs.byId.btnPlay.textContent === 'PLAY');
I18N.set('ru');
check('RU play label', hs.byId.btnPlay.textContent === 'ИГРАТЬ');

/* ---------- 4. save round-trip ---------- */
console.log('4. save');
const coinsBefore = F.save.coins;
F.giveCoins(1234);
hs.tick(2000); // autosave debounce 1.5s
const raw = hs.localStorage.getItem('fallen_save_v1');
check('save persisted to localStorage', !!raw);
const parsed = raw ? JSON.parse(raw) : null;
check('saved coins include grant', parsed && parsed.coins === coinsBefore + 1234, raw && String(raw.coins));
check('save shape complete', parsed && parsed.upgrades && parsed.settings && Array.isArray(parsed.skinsOwned) && parsed.stats && parsed.daily && parsed.quests && parsed.ach);

/* ---------- 5. upgrades ---------- */
console.log('5. upgrades');
F.giveCoins(60000);
const c0 = F.save.coins;
const okBuy = F.buy('magnet');
const lvl1 = F.save.upgrades.magnet;
check('buy magnet succeeds', okBuy === true && lvl1 === 1);
check('cost 300 deducted', F.save.coins === c0 - 300, String(c0) + ' -> ' + F.save.coins);
const c1 = F.save.coins;
F.buy('magnet');
check('second level costs 354 (300*1.18)', F.save.upgrades.magnet === 2 && F.save.coins === c1 - 354, String(c1) + ' -> ' + F.save.coins);
hs.F.openPanel('upgrades');
hs.tick(30);
const upRows = hs.findEl('.panel .p-body .up-row') || hs.findEl('.up-row');
const upBuyBtns = hs.body.querySelectorAll ? null : null;
const rows = (hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('.up-row') : []);
check('upgrades panel renders rows', rows.length === 6, 'rows=' + rows.length);

/* ---------- 6. skins ---------- */
console.log('6. skins');
F.giveCoins(60000);
hs.F.openPanel('skins');
hs.tick(30);
const panel = hs.findEl('.panel');
const skinBtns = panel ? panel.querySelectorAll('.skin-btn') : [];
check('skins panel renders 15 skins', skinBtns.length === 15, 'n=' + skinBtns.length);
// buy NEON (index 1)
const neonBtn = skinBtns[1];
if (neonBtn) { neonBtn.dispatch('click'); hs.tick(30); }
check('neon owned + equipped after buy', F.save.skinsOwned.indexOf('neon') >= 0 && F.save.skin === 'neon');
// buy + equip FIRE (index 2)
const fireBtn = skinBtns[2];
if (fireBtn) { fireBtn.dispatch('click'); hs.tick(30); }
check('fire owned after buy', F.save.skinsOwned.indexOf('fire') >= 0);
if (fireBtn) { fireBtn.dispatch('click'); hs.tick(30); }
check('fire equipped after second click', F.save.skin === 'fire');

/* ---------- 7. daily ---------- */
console.log('7. daily');
const d0 = F.save.coins;
hs.F.openPanel('daily');
hs.tick(30);
const dCells = (hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('.daily-cell') : []);
check('daily grid has 7 cells', dCells.length === 7, 'n=' + dCells.length);
const claimBtn = (hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('.btn.gold') : [])[0];
if (claimBtn) { claimBtn.dispatch('click'); hs.tick(30); }
check('day-1 reward +100 granted', F.save.coins === d0 + 100, d0 + ' -> ' + F.save.coins);
const streak = F.save.daily.streak;
check('streak is 1 after first claim', streak === 1, 'streak=' + streak);
check('day-1 marked claimed', !!F.save.daily.days && Object.keys(F.save.daily.days).length >= 1);

/* ---------- 8. quests / achievements / stats ---------- */
console.log('8. quests/ach');
hs.F.openPanel('quests');
hs.tick(30);
const qRows = (hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('.q-row, .quest-row') : []);
check('quests panel renders 3 quests', qRows.length === 3, 'n=' + qRows.length);
hs.F.openPanel('achievements');
hs.tick(30);
const aRows = (hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('.a-row, .ach-row') : []);
check('achievements panel renders >= 20 rows', aRows.length >= 20, 'n=' + aRows.length);
hs.F.openPanel('stats');
hs.tick(30);
const stRows = (hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('.st-row') : []);
check('stats panel renders rows', stRows.length >= 6, 'n=' + stRows.length);

/* ---------- 9. leaderboard (offline) ---------- */
console.log('9. leaderboard');
hs.F.openPanel('leaderboard');
hs.tick(30);
const lbTxt = (hs.findEl('.panel') ? hs.findEl('.panel').textContent : '');
check('leaderboard shows offline note', lbTxt.indexOf('только внутри Yandex') >= 0 || lbTxt.indexOf('only inside Yandex') >= 0, lbTxt.slice(0, 80));

/* ---------- 10. settings ---------- */
console.log('10. settings');
hs.F.openPanel('settings');
hs.tick(30);
const setPanel = hs.findEl('.panel');
const switches = setPanel ? setPanel.querySelectorAll('.switch') : [];
check('settings renders switches', switches.length >= 3, 'n=' + switches.length);
const musicBefore = F.save.settings.music;
if (switches[0]) { switches[0].dispatch('click'); hs.tick(30); }
check('music toggle flips', F.save.settings.music === (1 - musicBefore), musicBefore + ' -> ' + F.save.settings.music);
// quality LOW -> dpr 1
const qBtns = setPanel ? setPanel.querySelectorAll('.seg-btn[data-q]') : [];
if (qBtns.length >= 3) {
  qBtns[2].dispatch('click'); hs.tick(30);
  check('quality LOW sets dpr 1', F._internals.Cv.dpr === 1, 'dpr=' + F._internals.Cv.dpr);
}
// language EN
const lBtns = setPanel ? setPanel.querySelectorAll('.seg-btn[data-l]') : [];
const enBtn = lBtns.find(b => b.getAttribute('data-l') === 'en');
if (enBtn) { enBtn.dispatch('click'); hs.tick(30); }
check('language switch to EN', F.save.settings.lang === 'en' || I18N.lang === 'en');
if (I18N.lang !== 'ru') { I18N.set('ru'); hs.tick(30); }

/* ---------- 11. start run ---------- */
console.log('11. start run');
F.startRun();
hs.tick(50);
check('state PLAYING', F.state === 'PLAYING');
check('floor 1', F.floor === 1);
check('orb alive', F.alive === true);
check('substate null', F.sub() === null);

/* ---------- 12. bot descent ---------- */
console.log('12. bot descent (40s sim)');
let botDeaths = 0;
function botFrame() {
  if (F.state !== 'PLAYING') return;
  if (F.sub() === 'perk') {
    const opt = hs.findEl('.perk-opt');
    if (opt) { opt.dispatch('click'); hs.tick(16.7); }
    return;
  }
  if (F.sub() === 'chest') {
    const b = hs.byId.btnChestClose;
    if (b && b.style.display !== 'none') { b.dispatch('click'); hs.tick(16.7); }
    return;
  }
  const px = F.px, py = F.py;
  const ah = F.ahead();
  // delay at active lasers
  for (const e of ah) {
    if (e.type === 'laser' && e.on && e.y > py - 15 && e.y < py + 240) { F.setVy(70); break; }
  }
  // steer: nearest coin in reach, else corridor centre
  let target = F.cor();
  let best = null, bestD = 260;
  for (const e of ah) {
    if (e.type === 'coin' && !e.taken && e.y > py - 10 && e.y < py + bestD) {
      const dy = e.y - py;
      const dx = Math.abs(e.x - px);
      if (dx < 120 && (!best || dy < bestD)) { best = e; bestD = dy; }
    }
  }
  if (best) target = best.x;
  F.key('left', target - px < -8);
  F.key('right', px < target - 8);
}
let simT = 0;
const STEP = 250; // ms of sim per loop
while (simT < 40000 && F.alive && F.state === 'PLAYING') {
  hs.tick(STEP);
  simT += STEP;
  for (let k = 0; k < Math.round(STEP / 16.7); k++) botFrame();
  if (!F.alive) { botDeaths++; break; }
}
check('bot survived 40s (no death)', F.alive && F.state === 'PLAYING', 'floor=' + F.floor + ' py=' + F.py.toFixed(0));
check('bot reached floor >= 8', F.floor >= 8, 'floor=' + F.floor);
const hudCoins = parseInt(String(hs.byId.hudCoinsEl.textContent).replace(/\D/g, ''), 10) || 0;
check('bot collected >= 100 run coins', hudCoins >= 100, 'hud=' + hudCoins);
check('no errors during descent', H.errCount === 0, H.logs.filter(l => l.indexOf('ERROR') === 0).slice(-3).join(' | '));
check('world kept generating (chunks exist)', F._internals.World.chunks[F.floor] !== undefined);

/* ---------- 13. death ---------- */
console.log('13. death');
const runsBefore = F.save.stats.runs;
let kills = 0;
while (F.alive && kills < 5 && F.state === 'PLAYING') { F.kill(); hs.tick(120); kills++; }
hs.tick(2500);
check('orb dead after kill', F.alive === false || F.state === 'DEAD');
check('state DEAD', F.state === 'DEAD', F.state);
const deadOn = hs.byId.deadScr && hs.byId.deadScr.classList.contains('on');
check('death screen visible', !!deadOn);
check('runs stat incremented', F.save.stats.runs === runsBefore + 1, runsBefore + ' -> ' + F.save.stats.runs);
check('best floor recorded', F.save.bestFloor >= 8, 'best=' + F.save.bestFloor);

/* ---------- 14. gamble (take) ---------- */
console.log('14. gamble');
const runCoinsTxt = String(hs.byId.deadCoinsEl ? hs.byId.deadCoinsEl.textContent : '').replace(/\D/g, '');
const runCoins = parseInt(runCoinsTxt, 10) || 0;
let gambleCheck = true, gambleExtra = 'runCoins=' + runCoins;
if (runCoins > 100) {
  const bankBefore = F.save.coins;
  const gTake = hs.byId.gTake;
  check('gamble UI visible for run coins > 100', !!gTake && String(gTake.style.display || '').indexOf('none') < 0);
  if (gTake) { gTake.dispatch('click'); hs.tick(100); }
  const bankAfter = F.save.coins;
  gambleCheck = bankAfter >= bankBefore + runCoins - 5;
  gambleExtra = 'bank ' + bankBefore + ' -> ' + bankAfter + ' (run ' + runCoins + ')';
} else {
  gambleCheck = false;
}
check('taking coins banks the run amount', gambleCheck, gambleExtra);

/* ---------- 15. pause / resume / focus loss ---------- */
console.log('15. pause & focus');
hs.F.toMenu();
hs.tick(50);
F.startRun();
hs.tick(300);
F.pause();
hs.tick(50);
check('pause sets PAUSED', F.state === 'PAUSED', F.state);
check('pause screen shown', hs.byId.pauseScr && hs.byId.pauseScr.classList.contains('on'));
F.resume();
hs.tick(100);
check('resume sets PLAYING', F.state === 'PLAYING', F.state);
hs.doc.hidden = true;
hs.doc.dispatch('visibilitychange');
hs.tick(50);
check('visibilitychange auto-pauses', F.state === 'PAUSED', F.state);
hs.doc.hidden = false;
F.resume();
hs.tick(100);
check('resume after tab return', F.state === 'PLAYING', F.state);
hs.win.dispatch('blur');
hs.tick(50);
check('blur auto-pauses', F.state === 'PAUSED', F.state);
F.resume();
hs.tick(100);

/* ---------- 16. restart / toMenu / reset ---------- */
console.log('16. restart & reset');
let kills2 = 0;
while (F.alive && kills2 < 5 && F.state === 'PLAYING') { F.kill(); hs.tick(120); kills2++; }
hs.tick(2500);
check('dead again for restart test', F.state === 'DEAD', F.state);
const again = hs.byId.btnAgain;
if (again) { again.dispatch('click'); hs.tick(100); }
check('restart -> PLAYING floor 1', F.state === 'PLAYING' && F.floor === 1, F.state + ' f' + F.floor);
hs.F.toMenu();
hs.tick(100);
check('toMenu -> MENU', F.state === 'MENU', F.state);
const menuBest = String(hs.byId.menuBest ? hs.byId.menuBest.textContent : '');
check('menu shows best floor', /\d/.test(menuBest), menuBest);
// reset data
hs.F.openPanel('settings');
hs.tick(30);
const rst = hs.findEl('.reset-btn, #resetBtn, .danger-btn') || hs.findEl('.set-row .btn');
let resetOk = false, resetExtra = 'reset button not found';
const allBtns = hs.findEl('.panel') ? hs.findEl('.panel').querySelectorAll('button') : [];
const r2 = Array.from(allBtns).find(b => (b.textContent || '').toLowerCase().indexOf('СБРОС') >= 0 || (b.textContent || '').indexOf('RESET') >= 0 || (b.textContent || '') === 'СБРОСИТЬ ДАННЫЕ');
if (r2) {
  const hadCoins = F.save.coins > 1000;
  r2.dispatch('click');
  hs.tick(200);
  resetOk = F.save.coins === 0 && F.save.bestFloor === 0;
  resetExtra = 'coins=' + F.save.coins + ' best=' + F.save.bestFloor + ' had=' + hadCoins;
}
check('reset data wipes save', resetOk, resetExtra);
check('state still MENU after reset', F.state === 'MENU', F.state);

/* ---------- summary ---------- */
console.log('');
console.log('SMOKE RESULT: ' + pass + ' passed, ' + fail + ' failed');
if (fails.length) {
  console.log('Failures:');
  for (const f of fails) console.log('  - ' + f);
  const errs = H.logs.filter(l => l.indexOf('ERROR') === 0);
  if (errs.length) { console.log('Console errors:'); for (const e of errs.slice(0, 10)) console.log('  ' + e.slice(0, 400)); }
  process.exit(1);
}
process.exit(0);
