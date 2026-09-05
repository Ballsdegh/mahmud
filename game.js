/* ============================================================
   FALLEN — Tower of Fortune
   game.js — main game (single-file build)
   parts/p01.js — utils, config, zones, skins, perks, upgrades
   ============================================================ */
(function () {
'use strict';

var IS_DEV = false;
try { IS_DEV = /[?&]dev(=|&|$)/.exec(location.search) !== null; } catch (e) {}

function showFatal() {
  try {
    var f = document.getElementById('fatal');
    if (f) f.classList.add('on');
    var h = f.querySelector('h2');
    var p = f.querySelector('p');
    try {
      if (h && typeof I18N !== 'undefined' && I18N.t) h.textContent = I18N.t('fatal_title');
      if (p && typeof I18N !== 'undefined' && I18N.t) p.textContent = I18N.t('fatal_sub');
    } catch (e2) {}
  } catch (e) {}
}
window.__fallenShowFatal = showFatal;

/* ---------------- utils ---------------- */
var U = {
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp: function (a, b, k) { return a + (b - a) * k; },
  dist2: function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  segDist: function (px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? U.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
    return Math.sqrt(U.dist2(px, py, x1 + t * dx, y1 + t * dy));
  },
  pad: function (n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  },
  el: function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },
  fmt: function (n) {
    n = Math.floor(Math.abs(n));
    var s = String(n), out = '';
    while (s.length > 3) { out = ' ' + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }
};

/* ---------------- config ---------------- */
var CFG = {
  W: 420,            // logical play-field width
  FLOOR_H: 520,      // world units per floor
  R: 13,             // player radius
  WALL: 16,          // wall thickness
  GRAV: 1500,
  MAXFALL_BASE: 235, MAXFALL_GROW: 0.85, MAXFALL_CAP: 620,
  BOUNCE: 265,
  MAXVX: 430, ACCEL: 2600,
  CHUNKS_AHEAD: 3, CHUNKS_BEHIND: 3,
  FLOOR_COINS: 10,
  MILESTONE10: 150, MILESTONE50: 500,
  GATE_EVERY: 25, GATE_FROM: 25,
  SAFE_REWARD: 500, RISK_REWARD: 3000,
  PERK_EVERY: 20, PERK_FROM: 20,
  BOSS_EVERY: 100, BOSS_H: 640, BOSS_REWARD: 1500,
  CHEST_BASE: 0.10, CHEST_LUCK: 0.011, CHEST_CAP: 0.22,
  FRAG_VALUE: 200,
  COST_POW: 1.18,
  OFFLINE_MIN: 600,        // seconds away before offline reward
  OFFLINE_PER_SEC: 0.05,   // coins per second away
  OFFLINE_CAP: 10800,
  INTER_COOLDOWN: 100000,  // ms between interstitials
  INTER_MIN_SESSION: 25000,
  MAXDT: 0.05
};

var QUALITY = {
  high:   { parts: 420, dpr: 2,   glow: true,  trail: 26 },
  medium: { parts: 240, dpr: 1.5, glow: true,  trail: 16 },
  low:    { parts: 110, dpr: 1,   glow: false, trail: 8 }
};

/* ---------------- zones ---------------- */
var ZONES = [
  { id: 'neon',    bg0: '#070b1c', bg1: '#0d1638', line: '#1b2c66', acc: '#4dd8ff', acc2: '#ff4dd8', part: '#7ce7ff', bpm: 112, scale: [0, 3, 5, 7, 10],  bass: 45, style: 'city' },
  { id: 'ind',     bg0: '#120d08', bg1: '#241609', line: '#3a2712', acc: '#ffb84d', acc2: '#ff6b35', part: '#ffcf8a', bpm: 120, scale: [0, 2, 4, 7, 9],  bass: 43, style: 'ind' },
  { id: 'lava',    bg0: '#160505', bg1: '#2b0a06', line: '#471408', acc: '#ff5e3d', acc2: '#ffd75e', part: '#ff9a5e', bpm: 116, scale: [0, 3, 5, 7, 10], bass: 41, style: 'lava' },
  { id: 'frozen',  bg0: '#06121f', bg1: '#0b2038', line: '#12395c', acc: '#9fe8ff', acc2: '#ffffff', part: '#d8f4ff', bpm: 100, scale: [0, 2, 4, 7, 9],  bass: 45, style: 'ice' },
  { id: 'cyber',   bg0: '#0a0618', bg1: '#170b2e', line: '#2a1752', acc: '#b06bff', acc2: '#4dffc4', part: '#cf9dff', bpm: 124, scale: [0, 3, 6, 8, 11], bass: 43, style: 'cyber' },
  { id: 'crystal', bg0: '#071310', bg1: '#0c241e', line: '#134034', acc: '#4dffc4', acc2: '#7ce7ff', part: '#a8ffe0', bpm: 104, scale: [0, 2, 5, 7, 10], bass: 45, style: 'crystal' },
  { id: 'space',   bg0: '#03040c', bg1: '#0a1024', line: '#14204a', acc: '#7c9dff', acc2: '#ffffff', part: '#c8d8ff', bpm: 96,  scale: [0, 4, 5, 7, 11], bass: 41, style: 'space' },
  { id: 'dark',    bg0: '#0a0510', bg1: '#160a24', line: '#2a1444', acc: '#ffd75e', acc2: '#b06bff', part: '#ffe9a8', bpm: 108, scale: [0, 1, 4, 6, 10], bass: 40, style: 'dark' }
];
var BOSS_TYPES = ['laser', 'crusher', 'void', 'magnet', 'rocks'];

/* ---------------- skins ---------------- */
var SKINS = [
  { id: 'classic', cost: 0,     core: '#ffffff', mid: '#9fd8ff', glow: '#4dd8ff', trail: '#4dd8ff', fx: 'none' },
  { id: 'neon',    cost: 500,   core: '#ffffff', mid: '#ff9df0', glow: '#ff4dd8', trail: '#ff4dd8', fx: 'ring' },
  { id: 'fire',    cost: 800,   core: '#fff6d8', mid: '#ffd75e', glow: '#ff6b35', trail: '#ff9a3d', fx: 'fire' },
  { id: 'ice',     cost: 800,   core: '#ffffff', mid: '#d8f4ff', glow: '#7ce7ff', trail: '#a8ecff', fx: 'frost' },
  { id: 'galaxy',  cost: 1500,  core: '#ffffff', mid: '#cf9dff', glow: '#6c3bff', trail: '#b06bff', fx: 'stars' },
  { id: 'gold',    cost: 2500,  core: '#fff8e0', mid: '#ffd75e', glow: '#ffb300', trail: '#ffd75e', fx: 'shimmer' },
  { id: 'cyber',   cost: 1500,  core: '#eafff4', mid: '#4dffc4', glow: '#0fbf9f', trail: '#4dffc4', fx: 'hex' },
  { id: 'toxic',   cost: 1500,  core: '#f4ffe0', mid: '#a8ff4d', glow: '#57e31c', trail: '#8dff4d', fx: 'toxic' },
  { id: 'void',    cost: 2500,  core: '#3a2f58', mid: '#6c3bff', glow: '#b06bff', trail: '#8a5cff', fx: 'void' },
  { id: 'crystal', cost: 3000,  core: '#ffffff', mid: '#a8ffe0', glow: '#4dffc4', trail: '#7cffe0', fx: 'facet' },
  { id: 'rainbow', cost: 4000,  core: '#ffffff', mid: '#ffffff', glow: '#ffffff', trail: '#ffffff', fx: 'rainbow' },
  { id: 'shadow',  cost: 3000,  core: '#4a5470', mid: '#141a2c', glow: '#8fa3c8', trail: '#5a6a94', fx: 'shadow' },
  { id: 'solar',   cost: 5000,  core: '#fffdf2', mid: '#ffe14d', glow: '#ff9f1c', trail: '#ffd75e', fx: 'rays' },
  { id: 'plasma',  cost: 6000,  core: '#ffffff', mid: '#ff9df0', glow: '#4d8aff', trail: '#ff9df0', fx: 'plasma' },
  { id: 'legend',  cost: 10000, core: '#ffffff', mid: '#ffe9a8', glow: '#ffd75e', trail: '#ffd75e', fx: 'legend' }
];
function skinById(id) {
  for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
  return SKINS[0];
}

/* ---------------- in-run perks (last for one run only) ---------------- */
var PERKS = [
  { id: 'magnet',   rar: 'common',    icon: 'magnet', dur: 20,  w: 30 },
  { id: 'double',   rar: 'common',    icon: 'coin',   dur: 20,  w: 30 },
  { id: 'shield2',   rar: 'rare',      icon: 'shield', dur: 0,   w: 20 },
  { id: 'slow',     rar: 'rare',      icon: 'pause',  dur: 8,   w: 18 },
  { id: 'lucky',    rar: 'rare',      icon: 'luck',   dur: 15,  w: 18 },
  { id: 'ghost',    rar: 'epic',      icon: 'star',   dur: 8,   w: 10 },
  { id: 'blaze',    rar: 'epic',      icon: 'speed',  dur: 6,   w: 10 },
  { id: 'feather',  rar: 'epic',      icon: 'safe',   dur: 10,  w: 9  },
  { id: 'golden',   rar: 'legendary', icon: 'crown',  dur: 10,  w: 4  },
  { id: 'over',     rar: 'legendary', icon: 'star',   dur: 10,  w: 3  }
];

/* ---------------- permanent upgrades ---------------- */
var UPGRADES = [
  { id: 'magnet', icon: 'magnet', name: 'up_magnet', base: 300 },
  { id: 'boost',  icon: 'speed',  name: 'up_boost',  base: 250 },
  { id: 'shield', icon: 'shield', name: 'up_shield', base: 400 },
  { id: 'luck',   icon: 'luck',   name: 'up_luck',   base: 350 },
  { id: 'coin',   icon: 'coin',   name: 'up_coin',   base: 500 },
  { id: 'revive', icon: 'revive', name: 'up_revive', base: 600 }
];
var UPG_MAX = 20;
function upgById(id) {
  for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].id === id) return UPGRADES[i];
  return null;
}
function upCost(id, lvl) {
  var u = upgById(id);
  if (!u) return 0;
  return Math.round(u.base * Math.pow(CFG.COST_POW, lvl));
}

/* ---------------- chest rarities ---------------- */
var CHEST_RARS = [
  { id: 'wood',      w: 55, coins: [80, 220],    frag: 0.3,  fragN: 1,      skin: 0    },
  { id: 'rare',      w: 30, coins: [220, 550],   frag: 0.55, fragN: [1, 2], skin: 0.02 },
  { id: 'epic',      w: 12, coins: [550, 1300],  frag: 0.85, fragN: [2, 4], skin: 0.06 },
  { id: 'legendary', w: 3,  coins: [1300, 3200], frag: 1,    fragN: [4, 8], skin: 0.15 }
];
function rarById(id) {
  for (var i = 0; i < CHEST_RARS.length; i++) if (CHEST_RARS[i].id === id) return CHEST_RARS[i];
  return CHEST_RARS[0];
}

/* ---------------- daily quests pool ---------------- */
var QUEST_POOL = [
  { id: 'qf30',  type: 'floor',  target: 30,   icon: 'star',  reward: 150,  key: 'q_f30' },
  { id: 'qf50',  type: 'floor',  target: 50,   icon: 'star',  reward: 250,  key: 'q_f50' },
  { id: 'qf100', type: 'floor',  target: 100,  icon: 'crown', reward: 600,  key: 'q_f100' },
  { id: 'qc300', type: 'coins',  target: 300,  icon: 'coin',  reward: 120,  key: 'q_c300' },
  { id: 'qc600', type: 'coins',  target: 600,  icon: 'coin',  reward: 250,  key: 'q_c600' },
  { id: 'qc1200',type: 'coins',  target: 1200, icon: 'coin',  reward: 500,  key: 'q_c1200' },
  { id: 'qch1',  type: 'chests', target: 1,    icon: 'chest', reward: 150,  key: 'q_ch1' },
  { id: 'qch3',  type: 'chests', target: 3,    icon: 'chest', reward: 400,  key: 'q_ch3' },
  { id: 'qr2',   type: 'risks',  target: 2,    icon: 'risk',  reward: 300,  key: 'q_r2' },
  { id: 'qs3',   type: 'safe',   target: 3,    icon: 'safe',  reward: 200,  key: 'q_s3' },
  { id: 'qb1',   type: 'bosses', target: 1,    icon: 'crown', reward: 500,  key: 'q_b1' },
  { id: 'qr5',   type: 'runs',   target: 5,    icon: 'play',  reward: 250,  key: 'q_r5' }
];

/* ---------------- achievements ---------------- */
var ACHIEVEMENTS = [
  { id: 'first', icon: 'play',      reward: 100,   key: 'a_first',  cond: function (s) { return s.stats.runs >= 1; } },
  { id: 'f10',   icon: 'star',      reward: 100,   key: 'a_f10',    cond: function (s) { return s.bestFloor >= 10; } },
  { id: 'f50',   icon: 'star',      reward: 150,   key: 'a_f50',    cond: function (s) { return s.bestFloor >= 50; } },
  { id: 'f100',  icon: 'crown',     reward: 600,   key: 'a_f100',   cond: function (s) { return s.bestFloor >= 100; } },
  { id: 'f200',  icon: 'crown',     reward: 1000,  key: 'a_f200',   cond: function (s) { return s.bestFloor >= 200; } },
  { id: 'f300',  icon: 'crown',     reward: 1500,  key: 'a_f300',   cond: function (s) { return s.bestFloor >= 300; } },
  { id: 'f500',  icon: 'crown',     reward: 3000,  key: 'a_f500',   cond: function (s) { return s.bestFloor >= 500; } },
  { id: 'f750',  icon: 'crown',     reward: 5000,  key: 'a_f750',   cond: function (s) { return s.bestFloor >= 750; } },
  { id: 'f1000', icon: 'crown',     reward: 10000, key: 'a_f1000',  cond: function (s) { return s.bestFloor >= 1000; } },
  { id: 'c1k',   icon: 'coin',      reward: 200,   key: 'a_c1k',    cond: function (s) { return s.stats.coinsEarned >= 1000; } },
  { id: 'c10k',  icon: 'coin',      reward: 500,   key: 'a_c10k',   cond: function (s) { return s.stats.coinsEarned >= 10000; } },
  { id: 'c100k', icon: 'coin',      reward: 1500,  key: 'a_c100k',  cond: function (s) { return s.stats.coinsEarned >= 100000; } },
  { id: 'c1m',   icon: 'coin',      reward: 5000,  key: 'a_c1m',    cond: function (s) { return s.stats.coinsEarned >= 1000000; } },
  { id: 'ch1',   icon: 'chest',     reward: 200,   key: 'a_ch1',    cond: function (s) { return s.stats.chests >= 1; } },
  { id: 'chr5',  icon: 'chest',     reward: 200,   key: 'a_chr5',   cond: function (s) { return s.chestsOpened.rare >= 5; } },
  { id: 'che1',  icon: 'chest',     reward: 800,   key: 'a_che1',   cond: function (s) { return s.chestsOpened.epic >= 1; } },
  { id: 'chl1',  icon: 'chest',     reward: 2000,  key: 'a_chl1',   cond: function (s) { return s.chestsOpened.legendary >= 1; } },
  { id: 'rk10',  icon: 'risk',      reward: 1000,  key: 'a_rk10',   cond: function (s) { return s.stats.risksWon >= 10; } },
  { id: 'rk50',  icon: 'risk',      reward: 3000,  key: 'a_rk50',   cond: function (s) { return s.stats.risksWon >= 50; } },
  { id: 'sf50',  icon: 'safe',      reward: 1000,  key: 'a_sf50',   cond: function (s) { return s.stats.safeWins >= 50; } },
  { id: 'up5',   icon: 'upgrade',   reward: 1500,  key: 'a_up5',    cond: function (s) { var u = s.upgrades, ok = true; for (var k in u) if (u[k] < 5) { ok = false; break; } return ok; } },
  { id: 'sk5',   icon: 'skin',      reward: 800,   key: 'a_sk5',    cond: function (s) { return s.skinsOwned.length >= 5; } },
  { id: 'skall', icon: 'skin',      reward: 5000,  key: 'a_skall',  cond: function (s) { return s.skinsOwned.length >= SKINS.length; } },
  { id: 'cb15',  icon: 'star',      reward: 500,   key: 'a_cb15',   cond: function (s) { return s.stats.maxCombo >= 15; } },
  { id: 'rv10',  icon: 'revive',    reward: 1000,  key: 'a_rv10',   cond: function (s) { return s.stats.revives >= 10; } },
  { id: 'rn100', icon: 'play',      reward: 1000,  key: 'a_rn100',  cond: function (s) { return s.stats.runs >= 100; } },
  { id: 'bs1',   icon: 'crown',     reward: 500,   key: 'a_bs1',    cond: function (s) { return s.stats.bosses >= 1; } },
  { id: 'bs5',   icon: 'crown',     reward: 2000,  key: 'a_bs5',    cond: function (s) { return s.stats.bosses >= 5; } }
];

/* ---------------- 7-day daily rewards ---------------- */
var DAILY_REWARDS = [100, 150, 200, 300, 400, 600, 1000];

/* ---------------- progression ---------------- */
function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + U.pad(d.getMonth() + 1, 2) + '-' + U.pad(d.getDate(), 2);
}

var Prog = {
  buyUpgrade: function (id) {
    var s = Save.data;
    var lvl = s.upgrades[id] || 0;
    if (lvl >= UPG_MAX) return false;
    var cost = upCost(id, lvl);
    if (s.coins < cost) return false;
    s.coins -= cost;
    s.upgrades[id] = lvl + 1;
    Audio.sfx('upgrade');
    Save.markDirty();
    return true;
  },

  dailyList: function () {
    var s = Save.data;
    var t = todayStr();
    if (s.quests.date === t && s.quests.list.length === 3) return s.quests.list;
    // deterministic pick of 3 for the day
    var seed = 0, str = 'fallen-' + t;
    for (var i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) % 100000;
    var pool = QUEST_POOL.slice(), out = [];
    while (out.length < 3 && pool.length) {
      seed = (seed * 1103515245 + 12345) % 100000;
      var idx = seed % pool.length;
      out.push({ id: pool[idx].id, type: pool[idx].type, target: pool[idx].target, icon: pool[idx].icon, reward: pool[idx].reward, key: pool[idx].key, progress: 0, claimed: false });
      pool.splice(idx, 1);
    }
    s.quests = { date: t, list: out };
    Save.markDirty();
    return out;
  },

  questAdd: function (type, n) {
    var s = Save.data;
    if (!s.quests || s.quests.date !== todayStr()) return;
    for (var i = 0; i < s.quests.list.length; i++) {
      var q = s.quests.list[i];
      if (q.type === type && !q.claimed) q.progress = Math.min(q.target, q.progress + n);
    }
  },

  claimQuest: function (i) {
    var s = Save.data;
    var q = s.quests && s.quests.list && s.quests.list[i];
    if (!q || q.claimed || q.progress < q.target) return false;
    q.claimed = true;
    s.coins += q.reward;
    Audio.sfx('coin');
    Save.markDirty();
    return true;
  },

  dailyStreak: function () {
    // pure read: how much the player could claim today
    var s = Save.data;
    var t = todayStr();
    if (s.daily.last === t) return { claimed: true, streak: s.daily.streak, today: t };
    var d = new Date();
    var yest = new Date(d.getTime() - 86400000);
    var ystr = yest.getFullYear() + '-' + U.pad(yest.getMonth() + 1, 2) + '-' + U.pad(yest.getDate(), 2);
    var streak = s.daily.last === ystr ? (s.daily.streak % 7) + 1 : 1;
    return { claimed: false, streak: streak, reward: DAILY_REWARDS[(streak - 1) % 7], today: t };
  },

  dailyClaim: function () {
    var st = this.dailyStreak();
    if (st.claimed) return false;
    var s = Save.data;
    s.daily.streak = st.streak;
    s.daily.last = st.today;
    s.daily.days = s.daily.days || {};
    s.daily.days[st.today] = st.reward;
    s.coins += st.reward;
    s.stats.coinsEarned += st.reward;
    Save.markDirty();
    return true;
  },

  dailyClaimedToday: function () {
    var s = Save.data;
    return !!(s.daily.days && s.daily.days[todayStr()]);
  },

  checkAch: function () {
    var s = Save.data, fresh = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (s.ach.unlocked[a.id]) continue;
      var ok = false;
      try { ok = a.cond(s); } catch (e) {}
      if (ok) { s.ach.unlocked[a.id] = 1; fresh.push(a.id); }
    }
    if (fresh.length) Save.markDirty();
    return fresh;
  },

  achClaimable: function (id) {
    var s = Save.data;
    return !!(s.ach.unlocked[id] && !s.ach.claimed[id]);
  },

  claimAch: function (id) {
    var s = Save.data;
    if (!Prog.achClaimable(id)) return 0;
    var a = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) if (ACHIEVEMENTS[i].id === id) { a = ACHIEVEMENTS[i]; break; }
    if (!a) return 0;
    s.ach.claimed[id] = 1;
    s.coins += a.reward;
    Audio.sfx('coin');
    Save.markDirty();
    return a.reward;
  },

  offlineInfo: function () {
    var s = Save.data;
    var sec = Save.offlineSec || 0;
    if (sec < CFG.OFFLINE_MIN) return null;
    var capped = Math.min(sec, CFG.OFFLINE_CAP);
    return { sec: Math.floor(sec), coins: Math.floor(capped * CFG.OFFLINE_PER_SEC) };
  }
};

/* ---------------- i18n ---------------- */
var I18N = {
  lang: 'ru',
  dict: {
    ru: {
      app_name: 'FALLEN', app_sub: 'БАШНЯ УДАЧИ', loading: 'ЗАГРУЗКА',
      play: 'ИГРАТЬ', best: 'РЕКОРД', floor: 'ЭТАЖ', coins: 'МОНЕТЫ',
      back: 'НАЗАД', close: 'ЗАКРЫТЬ', max: 'МАКС', level: 'УР.', buy: 'КУПИТЬ',
      own: 'ЕСТЬ', equip: 'ОДЕТЬ', equipped: 'НАДЕТО', day: 'ДЕНЬ',
      claim: 'ЗАБРАТЬ', claimed: 'ЗАБРАНО', today: 'СЕГОДНЯ', continue_b: 'ПРОДОЛЖИТЬ',
      restart: 'ЗАНОВО', pause_game: 'ПАУЗА', resume: 'ПРОДОЛЖИТЬ', to_menu: 'В МЕНЮ',
      quality: 'КАЧЕСТВО', q_high: 'ВЫСОКОЕ', q_medium: 'СРЕДНЕЕ', q_low: 'НИЗКОЕ',
      language: 'ЯЗЫК', sound: 'ЗВУК', music: 'МУЗЫКА', reduce_flash: 'МЕНЬШЕ МЕРЦАНИЯ',
      reset_data: 'СБРОСИТЬ ДАННЫЕ', reset_q: 'Сбросить весь прогресс? Действие необратимо.',
      stats: 'СТАТИСТИКА', runs: 'Забеги', total_coins: 'Заработано монет', best_floor: 'Лучший этаж',
      chests_opened: 'Сундуков открыто', risks_won: 'Рисков выиграно', safe_wins: 'SAFE пройдено',
      revives_used: 'Возрождений', bosses_beaten: 'Боссов побеждено', play_time: 'Время в игре', max_combo: 'Макс. комбо',
      upg_title: 'УСИЛЕНИЯ',
      up_magnet: 'Магнит', up_magnet_d: 'Притягивает монеты к шарику',
      up_boost: 'Ускорение', up_boost_d: 'Быстрее падение и старт',
      up_shield: 'Щит', up_shield_d: 'Щиты в начале забега (каждые 4 ур.)',
      up_luck: 'Удача', up_luck_d: 'Больше сундуков и бонусов',
      up_coin: 'Множитель монет', up_coin_d: '+10% монет за уровень',
      up_revive: 'Возрождение', up_revive_d: 'Бесплатное возрождение с 5 ур.',
      skins_title: 'СКИНЫ', skins_sub: 'Оформи шарик по-своему',
      chests_title: 'СУНДУКИ', chests_sub: 'Находите в башне. Оскалки можно обменять на монеты.',
      frag: 'Оскалки', free_chest: 'Сундук за рекламу',
      quests_title: 'ЗАДАНИЯ', quest_sub: '3 ежедневных задания',
      ach_title: 'ДОСТИЖЕНИЯ', ach_sub: 'Показатели игрока',
      daily_title: 'ЕЖЕДНЕВНО', daily_sub: 'Забирайте награду каждый день',
      streak: 'Серия', daily_x2: '×2 за рекламу',
      lb_title: 'ТОП ИГРОКОВ', lb_unavail: 'Лидерборд доступен только внутри Yandex Games', lb_you: 'ВЫ',
      run_complete: 'ЗАБЕГ ЗАВЕРШЁН', new_best: 'НОВЫЙ РЕКОРД', upg_btn: 'УСИЛЕНИЯ',
      take: 'ВОЗЬМУ', risk_x2: 'РИСК ×2',
      gamble_title: 'ДВОЙНОЕ ИЛИ НИЧЕГО', gamble_sub: 'Одёрнуть риск? Монеты удвоятся… или сгорят.',
      gamble_win: 'УДАЧА! МОНЕТЫ ×2', gamble_lose: 'ПОТЕРЯ ПОЛОВИНЫ',
      revive_free: 'БЕСПЛАТНО', revive_ad: 'СМОТРЕТЬ РЕКЛАМУ', revive_sub: 'Возродиться и продолжить',
      choose_perk: 'ВЫБЕРИ БОНУС',
      p_magnet: 'Магнит — монеты летят к тебе',
      p_double: 'Двойные монеты 20 c',
      p_shield2: 'Щит — выдержит один удар',
      p_slow: 'Замедление врагов 8 c',
      p_lucky: 'Удача — чаще сундуки',
      p_ghost: 'Призрак — шипы не вредят',
      p_blaze: 'Пламя — неуязвимость 6 c',
      p_feather: 'Перо — медленное падение',
      p_golden: 'Золото — монеты ×5',
      p_over: 'Овердрайв — скорость + магнит + ×2',
      p_shield: 'ЩИТ!',
      zone_neon: 'НЕОНОВЫЙ ГОРОД', zone_ind: 'ПРОМЫШЛЕННЫЙ', zone_lava: 'ЛАВА',
      zone_frozen: 'МЁРЗЛЫЙ БЕЗДНА', zone_cyber: 'СИБЕР ПУСТОТА', zone_crystal: 'КРИСТАЛЛЫ',
      zone_space: 'ОРБИТА', zone_dark: 'ТЁМНОЕ ИЗМЕРЕНИЕ',
      boss_title: 'БОСС', boss_laser: 'ЛАЗЕРНАЯ БУРЯ', boss_crusher: 'ДРОБИЛКА',
      boss_void: 'ПУСТОТА', boss_magnet: 'МАГНИТНЫЙ ЦИКЛОН', boss_rocks: 'ГРОТ',
      boss_defeated: 'БОСС ПОБЕЖДЁН!',
      tut_1: 'СВАЙП, ЧТОБЫ ДВИГАТЬСЯ', tut_2: 'СОБИРАЙ МОНЕТЫ', tut_3: 'ВЫБЕРИ СВОЙ ПУТЬ',
      bonus: 'БОНУС', near_miss: 'МИМО!', combo: 'КОМБО',
      welcome_back: 'СВОБОДНАЯ МИНУТА', offline_sub: 'Пока тебя не было, монеты падали сами',
      offline_x2: '×2 за рекламу',
      fatal_title: 'УПС', fatal_sub: 'Что-то пошло не так. Обновите страницу.',
      sync: 'Синхронизация', synced: 'Синхронизировано',
      yandex_id_sub: 'ID Yandex — только добровольно. Нужен для облачного сохранения и топа игроков. Без него игра работает полностью.',
      opt_in: 'РАЗРЕШИТЬ', opt_later: 'ПОЗЖЕ',
      sec: 'сек', h: 'ч', m: 'мин'
    },
    en: {
      app_name: 'FALLEN', app_sub: 'TOWER OF FORTUNE', loading: 'LOADING',
      play: 'PLAY', best: 'BEST', floor: 'FLOOR', coins: 'COINS',
      back: 'BACK', close: 'CLOSE', max: 'MAX', level: 'LVL', buy: 'BUY',
      own: 'OWNED', equip: 'WEAR', equipped: 'WORN', day: 'DAY',
      claim: 'CLAIM', claimed: 'CLAIMED', today: 'TODAY', continue_b: 'CONTINUE',
      restart: 'RESTART', pause_game: 'PAUSED', resume: 'RESUME', to_menu: 'MENU',
      quality: 'QUALITY', q_high: 'HIGH', q_medium: 'MEDIUM', q_low: 'LOW',
      language: 'LANGUAGE', sound: 'SOUND', music: 'MUSIC', reduce_flash: 'REDUCE FLASHING',
      reset_data: 'RESET DATA', reset_q: 'Reset all progress? This cannot be undone.',
      stats: 'STATS', runs: 'Runs', total_coins: 'Coins earned', best_floor: 'Best floor',
      chests_opened: 'Chests opened', risks_won: 'Risks won', safe_wins: 'SAFE gates',
      revives_used: 'Revives', bosses_beaten: 'Bosses beaten', play_time: 'Play time', max_combo: 'Max combo',
      upg_title: 'UPGRADES',
      up_magnet: 'Magnet', up_magnet_d: 'Pulls coins to the orb',
      up_boost: 'Boost', up_boost_d: 'Faster fall and start',
      up_shield: 'Shield', up_shield_d: 'Shields at run start (per 4 lvl)',
      up_luck: 'Luck', up_luck_d: 'More chests and bonuses',
      up_coin: 'Coin multiplier', up_coin_d: '+10% coins per level',
      up_revive: 'Revive', up_revive_d: 'Free revive from lvl 5',
      skins_title: 'SKINS', skins_sub: 'Style your orb',
      chests_title: 'CHESTS', chests_sub: 'Find them in the tower. Fragments can be sold for coins.',
      frag: 'Fragments', free_chest: 'Chest for ad',
      quests_title: 'QUESTS', quest_sub: '3 daily quests',
      ach_title: 'ACHIEVEMENTS', ach_sub: 'Player milestones',
      daily_title: 'DAILY', daily_sub: 'Claim a reward every day',
      streak: 'Streak', daily_x2: '×2 for ad',
      lb_title: 'TOP PLAYERS', lb_unavail: 'Leaderboard is only available inside Yandex Games', lb_you: 'YOU',
      run_complete: 'RUN COMPLETE', new_best: 'NEW BEST', upg_btn: 'UPGRADES',
      take: 'TAKE', risk_x2: 'RISK ×2',
      gamble_title: 'DOUBLE OR NOTHING', gamble_sub: 'Take the risk? Coins double… or half burns away.',
      gamble_win: 'LUCKY! COINS ×2', gamble_lose: 'HALF LOST',
      revive_free: 'FREE', revive_ad: 'WATCH AD', revive_sub: 'Revive and continue',
      choose_perk: 'PICK A BONUS',
      p_magnet: 'Magnet — coins fly to you',
      p_double: 'Double coins for 20s',
      p_shield2: 'Shield — blocks one hit',
      p_slow: 'Slow obstacles for 8s',
      p_lucky: 'Lucky — more chests',
      p_ghost: 'Ghost — spikes do no harm',
      p_blaze: 'Blaze — invincible for 6s',
      p_feather: 'Feather — slow fall',
      p_golden: 'Golden — coins ×5',
      p_over: 'Overdrive — speed + magnet + ×2',
      p_shield: 'SHIELD!',
      zone_neon: 'NEON CITY', zone_ind: 'INDUSTRIAL', zone_lava: 'LAVA CORE',
      zone_frozen: 'FROZEN ABYSS', zone_cyber: 'CYBER VOID', zone_crystal: 'CRYSTAL CAVE',
      zone_space: 'ORBIT', zone_dark: 'DARK DIMENSION',
      boss_title: 'BOSS', boss_laser: 'LASER STORM', boss_crusher: 'CRUSHER',
      boss_void: 'THE VOID', boss_magnet: 'MAGNET CYCLONE', boss_rocks: 'GROTT',
      boss_defeated: 'BOSS DEFEATED!',
      tut_1: 'SWIPE TO MOVE', tut_2: 'COLLECT COINS', tut_3: 'CHOOSE YOUR PATH',
      bonus: 'BONUS', near_miss: 'NEAR MISS!', combo: 'COMBO',
      welcome_back: 'WELCOME BACK', offline_sub: 'Coins were falling while you were away',
      offline_x2: '×2 for ad',
      fatal_title: 'OOPS', fatal_sub: 'Something went wrong. Please refresh the page.',
      sync: 'Syncing', synced: 'Synced',
      yandex_id_sub: 'Yandex ID is optional. Needed for cloud save and the player top. The game works fully without it.',
      opt_in: 'ALLOW', opt_later: 'LATER',
      sec: 's', h: 'h', m: 'min'
    }
  },
  init: function () {
    var saved = Save.data && Save.data.settings && Save.data.settings.lang;
    if (saved === 'ru' || saved === 'en') this.lang = saved;
    else {
      try { this.lang = (navigator.language || 'ru').slice(0, 2) === 'ru' ? 'ru' : 'en'; } catch (e) { this.lang = 'ru'; }
    }
    var html = document.documentElement;
    if (html) html.lang = this.lang;
  },
  set: function (lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    this.lang = lang;
    if (Save.data) { Save.data.settings.lang = lang; Save.markDirty(); }
    var html = document.documentElement;
    if (html) html.lang = lang;
    try { if (typeof UI !== 'undefined' && UI.refreshTexts) UI.refreshTexts(); } catch (e) {}
  },
  t: function (key) {
    var d = this.dict[this.lang] || this.dict.ru;
    var v = d[key];
    if (v === undefined) v = (this.dict.ru[key] !== undefined) ? this.dict.ru[key] : key;
    return v;
  },
  fmt: function (n) { return U.fmt(n); }
};

/* ---------------- Yandex SDK adapter ----------------
   All SDK calls live here. The game never touches window.YaGames
   directly, so the game keeps working outside the platform. */
var SDK = {
  ready: false,
  _yg: null,
  _loading: null,
  _lb: null,
  _lbOk: false,

  init: function () {
    var self = this;
    function done() { if (!self.ready) self.ready = true; }
    try {
      if (typeof YaGames === 'undefined' || !YaGames.init) { done(); return; }
      YaGames.init().then(function (yg) {
        self._yg = yg;
        try {
          if (yg.getFeature) {
            yg.getFeature('LoadingAPI').then(function (l) { self._loading = l; }, function () {});
            yg.getFeature('LeaderboardAPI').then(function (lb) { self._lb = lb; self._lbOk = true; }, function () {});
          }
        } catch (e) {}
        done();
      }).catch(done);
    } catch (e) { done(); }
  },

  readyNow: function () {
    try { if (this._loading) this._loading.ready(); } catch (e) {}
  },

  startGameplay: function () { try { if (this._yg && this._yg.gameplay) this._yg.gameplay.start(); } catch (e) {} },
  stopGameplay: function () { try { if (this._yg && this._yg.gameplay) this._yg.gameplay.stop(); } catch (e) {} },

  _canShow: function (type) {
    try {
      if (!this._yg || !this._yg.adv || !this._yg.AdTypes) return false;
      var t = this._yg.AdTypes[type];
      return this._yg.adv.canShowAdv(t);
    } catch (e) { return false; }
  },

  rewardedAvailable: function () { return this._canShow('REWARDED'); },
  interstitialAvailable: function () { return this._canShow('INTERSTITIAL'); },

  showRewarded: function (cb) {
    var done = false;
    function fin(ok) { if (!done) { done = true; cb(!!ok); } }
    try {
      if (!this.rewardedAvailable()) { fin(false); return; }
      this._yg.adv.showAdv(this._yg.AdTypes.REWARDED, {
        onSuccess: function () { fin(true); },
        onError: function () { fin(false); }
      });
      setTimeout(function () { fin(false); }, 90000);
    } catch (e) { fin(false); }
  },

  showInterstitial: function (cb) {
    var done = false;
    function fin(ok) { if (!done) { done = true; cb(!!ok); } }
    try {
      if (!this.interstitialAvailable()) { fin(false); return; }
      this._yg.adv.showAdv(this._yg.AdTypes.INTERSTITIAL, {
        onSuccess: function () { fin(true); },
        onError: function () { fin(false); }
      });
      setTimeout(function () { fin(false); }, 90000);
    } catch (e) { fin(false); }
  },

  saveCloud: function (obj) {
    try {
      if (!this._yg || !this._yg.getPlayer) return;
      this._yg.getPlayer().then(function (p) {
        try { p.setData(JSON.stringify(obj), 'save').then(function () {}, function () {}); } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  },

  loadCloud: function (cb) {
    function fin(v) { try { cb(v || null); } catch (e) {} }
    try {
      if (!this._yg || !this._yg.getPlayer) { fin(null); return; }
      this._yg.getPlayer().then(function (p) {
        return p.getDataKeys().then(function (keys) {
          if (!keys || keys.indexOf('save') < 0) return null;
          return p.getData('save');
        }).then(function (d) {
          try { fin(d ? JSON.parse(d) : null); } catch (e) { fin(null); }
        }).catch(function () { fin(null); });
      }).catch(function () { fin(null); });
    } catch (e) { fin(null); }
  },

  lbSubmit: function (score) {
    try { if (this._lb) this._lb.setLeaderboardValue('fallen_best', { value: Math.floor(score) }).then(function () {}, function () {}); } catch (e) {}
  },
  lbTop: function (cb) {
    function fin(v) { try { cb(v); } catch (e) {} }
    try {
      if (!this._lb) { fin(null); return; }
      this._lb.getTop(10).then(function (t) { fin(t && t.values ? t.values : null); }).catch(function () { fin(null); });
    } catch (e) { fin(null); }
  },
  lbAvailable: function () { return !!this._lbOk; },

  fullscreen: function () { try { if (this._yg && this._yg.fullscreen) this._yg.fullscreen(); } catch (e) {} },
  getID: function (cb) {
    function fin(v) { try { cb(!!v); } catch (e) {} }
    try {
      if (!this._yg || !this._yg.getID) { fin(false); return; }
      this._yg.getID().then(function (id) { fin(id); }).catch(function () { fin(false); });
    } catch (e) { fin(false); }
  }
};

/* ---------------- save ---------------- */
var Save = {
  KEY: 'fallen_save_v1',
  data: null,
  offlineSec: 0,
  _dirty: 0,

  def: function () {
    return {
      v: 1,
      coins: 0,
      bestFloor: 0,
      upgrades: { magnet: 0, boost: 0, shield: 0, luck: 0, coin: 0, revive: 0 },
      skin: 'classic',
      skinsOwned: ['classic'],
      fragments: 0,
      chestsOpened: { wood: 0, rare: 0, epic: 0, legendary: 0 },
      stats: { runs: 0, coinsEarned: 0, chests: 0, risksWon: 0, safeWins: 0, revives: 0, bosses: 0, maxCombo: 0, playTime: 0 },
      daily: { last: '', streak: 0, days: {} },
      quests: { date: '', list: [] },
      ach: { unlocked: {}, claimed: {} },
      settings: { music: 1, sfx: 1, quality: 'high', lang: '', flash: 1 },
      tutorialDone: 0,
      lastSeen: Date.now()
    };
  },

  migrate: function (d) {
    var base = this.def();
    for (var k in base) {
      if (d[k] === undefined) d[k] = base[k];
      else if (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) && !Array.isArray(d[k])) {
        for (var k2 in base[k]) {
          if (d[k][k2] === undefined) d[k][k2] = base[k][k2];
          else if (typeof base[k][k2] === 'object' && base[k][k2] !== null) {
            for (var k3 in base[k][k2]) if (d[k][k2][k3] === undefined) d[k][k2][k3] = base[k][k2][k3];
          }
        }
      }
    }
    return d;
  },

  load: function () {
    var raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) {}
    var data = null;
    if (raw) { try { data = JSON.parse(raw); } catch (e) {} }
    this.data = this.migrate(data || this.def());
    this.offlineSec = Math.max(0, (Date.now() - (this.data.lastSeen || Date.now())) / 1000);
    this.data.lastSeen = Date.now();
  },

  save: function () {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
    SDK.saveCloud(this.data);
  },

  markDirty: function () {
    if (this._dirty) return;
    var self = this;
    this._dirty = setTimeout(function () { self._dirty = 0; self.save(); }, 1500);
  },

  mergeCloud: function (c) {
    if (!c || typeof c !== 'object') return;
    var s = this.data;
    if (c.bestFloor > s.bestFloor) s.bestFloor = c.bestFloor;
    if (c.coins > s.coins) s.coins = c.coins;
    if (c.skinsOwned && c.skinsOwned.length > s.skinsOwned.length) s.skinsOwned = c.skinsOwned;
    if (c.stats) {
      for (var k in s.stats) {
        if (typeof s.stats[k] === 'number' && typeof c.stats[k] === 'number' && c.stats[k] > s.stats[k]) s.stats[k] = c.stats[k];
      }
    }
    if (c.upgrades) for (var u in s.upgrades) if (c.upgrades[u] > s.upgrades[u]) s.upgrades[u] = c.upgrades[u];
    if (c.fragments > s.fragments) s.fragments = c.fragments;
    if (c.ach) {
      for (var a in c.ach.unlocked) if (!s.ach.unlocked[a]) s.ach.unlocked[a] = 1;
    }
    this.save();
  },

  resetAll: function () {
    this.data = this.def();
    this.save();
  }
};

/* ---------------- audio manager (fully procedural, no files) ---------------- */
var Audio = {
  ctx: null,
  master: null,
  musGain: null,
  sfxGain: null,
  musicOn: true,
  sfxOn: true,
  _seq: 0,
  _zone: 0,
  _intensity: 1,
  _step: 0,
  _nextT: 0,

  init: function () {
    if (this.ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musGain = this.ctx.createGain();
      this.musGain.gain.value = this.musicOn ? 0.8 : 0;
      this.musGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);
    } catch (e) { this.ctx = null; }
  },

  resume: function () {
    try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {}
  },

  setMusic: function (b) {
    this.musicOn = !!b;
    try { if (this.musGain) this.musGain.gain.value = b ? 0.8 : 0; } catch (e) {}
    if (b) this._restart();
  },
  setSfx: function (b) { this.sfxOn = !!b; },

  duck: function (on) {
    try { if (this.master) this.master.gain.value = on ? 0.0001 : 0.5; } catch (e) {}
  },

  vibrate: function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} },

  _tone: function (freq, dur, type, vol, when, dest, slideTo) {
    var c = this.ctx;
    if (!c) return;
    try {
      var t0 = when || c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(dest || this.sfxGain);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) {}
  },

  _noise: function (dur, vol, when) {
    var c = this.ctx;
    if (!c) return;
    try {
      var t0 = when || c.currentTime;
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource();
      src.buffer = buf;
      var g = c.createGain();
      g.gain.value = vol;
      var f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 700;
      src.connect(f); f.connect(g); g.connect(this.sfxGain);
      src.start(t0);
    } catch (e) {}
  },

  sfx: function (name) {
    if (!this.ctx || !this.sfxOn) return;
    var now = this.ctx.currentTime;
    var i;
    switch (name) {
      case 'click':
        this._tone(620, 0.06, 'square', 0.12, now);
        break;
      case 'back':
        this._tone(330, 0.08, 'triangle', 0.12, now);
        break;
      case 'coin':
        this._tone(920, 0.07, 'sine', 0.16, now);
        this._tone(1380, 0.1, 'sine', 0.12, now + 0.05);
        break;
      case 'combo':
        this._tone(1180, 0.08, 'sine', 0.16, now);
        this._tone(1560, 0.12, 'sine', 0.13, now + 0.06);
        break;
      case 'bounce':
        this._tone(170, 0.09, 'triangle', 0.2, now, this.sfxGain, 90);
        break;
      case 'shield':
        this._tone(520, 0.16, 'sawtooth', 0.1, now, this.sfxGain, 260);
        this._noise(0.08, 0.08, now);
        break;
      case 'death':
        this._tone(300, 0.5, 'sawtooth', 0.2, now, this.sfxGain, 55);
        this._noise(0.35, 0.16, now);
        break;
      case 'chest':
        for (i = 0; i < 4; i++) this._tone(520 + i * 160, 0.1, 'triangle', 0.13, now + i * 0.06);
        break;
      case 'gamble_win':
        for (i = 0; i < 5; i++) this._tone(660 + i * 130, 0.12, 'square', 0.1, now + i * 0.07);
        break;
      case 'gamble_lose':
        for (i = 0; i < 4; i++) this._tone(420 - i * 70, 0.14, 'sawtooth', 0.1, now + i * 0.09);
        break;
      case 'boss':
        for (i = 0; i < 3; i++) {
          this._tone(220, 0.16, 'square', 0.14, now + i * 0.34);
          this._tone(330, 0.16, 'square', 0.12, now + i * 0.34 + 0.17);
        }
        break;
      case 'near':
        this._tone(1500, 0.06, 'sine', 0.1, now);
        break;
      case 'milestone':
        this._tone(660, 0.1, 'triangle', 0.14, now);
        this._tone(880, 0.1, 'triangle', 0.14, now + 0.09);
        this._tone(1100, 0.16, 'triangle', 0.14, now + 0.18);
        break;
      case 'perk':
        for (i = 0; i < 3; i++) this._tone(780 + i * 220, 0.09, 'sine', 0.12, now + i * 0.05);
        break;
      case 'zone':
        this._tone(392, 0.3, 'sine', 0.12, now);
        this._tone(523, 0.3, 'sine', 0.1, now + 0.05);
        break;
      case 'upgrade':
        this._tone(440, 0.08, 'square', 0.1, now);
        this._tone(660, 0.08, 'square', 0.1, now + 0.07);
        this._tone(880, 0.14, 'square', 0.1, now + 0.14);
        break;
      case 'open':
        this._tone(500, 0.1, 'triangle', 0.1, now);
        break;
      case 'error':
        this._tone(140, 0.18, 'sawtooth', 0.12, now);
        break;
    }
  },

  /* procedural music: 8-step sequence per zone (bass + arp), boss intensity adds drive */
  startMusic: function (zoneIdx, intensity) {
    this._zone = zoneIdx | 0;
    this._intensity = intensity || 1;
    this._restart();
  },

  stopMusic: function () {
    if (this._seq) { clearInterval(this._seq); this._seq = 0; }
  },

  _restart: function () {
    if (!this.ctx) return;
    if (this._seq) clearInterval(this._seq);
    this._step = 0;
    this._nextT = this.ctx.currentTime + 0.1;
    var self = this;
    this._seq = setInterval(function () {
      if (!self.ctx || !self.musicOn) return;
      var zone = ZONES[self._zone] || ZONES[0];
      var stepDur = 30 / (zone.bpm || 110); // 8th notes
      while (self._nextT < self.ctx.currentTime + 0.35) {
        self._playStep(zone, stepDur, self._nextT);
        self._nextT += stepDur;
        self._step = (self._step + 1) % 32;
      }
    }, 120);
  },

  _playStep: function (zone, stepDur, t) {
    var s = this._step;
    var scale = zone.scale || [0, 3, 5, 7, 10];
    var base = zone.bass || 44;
    if (s % 4 === 0) {
      var oct = (s % 16 < 8) ? 1 : 0.5;
      this._tone(base * oct * 2, stepDur * 1.6, 'triangle', this._intensity > 1 ? 0.2 : 0.15, t, this.musGain);
      if (this._intensity > 1) this._tone(base * oct * 2.02, stepDur * 1.4, 'sawtooth', 0.06, t, this.musGain);
    }
    if (s % 2 === 0) {
      var deg = scale[(s / 2) % scale.length];
      var oct2 = 440 * Math.pow(2, (deg - 12) / 12);
      this._tone(oct2, stepDur * 0.9, 'square', 0.045, t, this.musGain);
    }
    if (s % 8 === 6) this._noiseBurst(stepDur * 0.3, 0.02, t);
  },

  _noiseBurst: function (dur, vol, t) {
    var c = this.ctx;
    if (!c) return;
    try {
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource();
      src.buffer = buf;
      var g = c.createGain();
      g.gain.value = vol;
      var f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6000;
      src.connect(f); f.connect(g); g.connect(this.musGain);
      src.start(t);
    } catch (e) {}
  }
};

/* ---------------- canvas / renderer core ---------------- */
var Cv = {
  canvas: null,
  ctx: null,
  cssW: 0,
  cssH: 0,
  dpr: 1,
  s: 1,
  ox: 0,
  quality: 'high',
  shake: 0,

  init: function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  },

  resize: function () {
    var q = QUALITY[this.quality] || QUALITY.high;
    this.cssW = window.innerWidth;
    this.cssH = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
    this.canvas.width = Math.max(1, Math.round(this.cssW * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.cssH * this.dpr));
    this.canvas.style.width = this.cssW + 'px';
    this.canvas.style.height = this.cssH + 'px';
    this.s = Math.min(this.cssW / CFG.W, this.cssH / 820);
    this.ox = (this.cssW - CFG.W * this.s) / 2;
    console.log('[FALLEN] resize', this.cssW, this.cssH, 'scale', this.s.toFixed(2));
  },

  setQuality: function (q) {
    if (QUALITY[q]) this.quality = q;
    this.resize();
  },

  addShake: function (n) { this.shake = Math.max(this.shake, n); }
};

/* ---------------- particles ---------------- */
var Particles = {
  pool: [],
  burst: function (x, y, n, color, speed, life, size) {
    var cap = (QUALITY[Cv.quality] || QUALITY.high).parts;
    for (var i = 0; i < n; i++) {
      if (this.pool.length >= cap) return;
      var a = Math.random() * Math.PI * 2;
      var v = speed * (0.3 + Math.random() * 0.7);
      this.pool.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: life * (0.5 + Math.random() * 0.5),
        t: 0,
        r: size * (0.5 + Math.random()),
        c: color
      });
    }
  },
  update: function (dt) {
    var p = this.pool;
    for (var i = p.length - 1; i >= 0; i--) {
      var e = p[i];
      e.t += dt;
      if (e.t >= e.life) { p.splice(i, 1); continue; }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 500 * dt;
      e.vx *= Math.pow(0.1, dt);
    }
  },
  draw: function (ctx, camY) {
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    for (var i = 0; i < this.pool.length; i++) {
      var e = this.pool[i];
      var k = 1 - e.t / e.life;
      ctx.globalAlpha = k * 0.9;
      ctx.fillStyle = e.c;
      if (glow) { ctx.shadowColor = e.c; ctx.shadowBlur = 8; }
      ctx.beginPath();
      ctx.arc(e.x, e.y - camY, Math.max(0.5, e.r * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
};

/* ---------------- floating text ---------------- */
var FloatText = {
  list: [],
  add: function (x, y, txt, color, size) {
    if (this.list.length > 24) this.list.shift();
    this.list.push({ x: x, y: y, txt: txt, c: color, s: size || 14, t: 0, life: 1.1 });
  },
  update: function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var e = this.list[i];
      e.t += dt;
      if (e.t >= e.life) this.list.splice(i, 1);
    }
  },
  draw: function (ctx, camY) {
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      var k = e.t / e.life;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.fillStyle = e.c;
      ctx.font = '900 ' + e.s + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.txt, e.x, e.y - camY - k * 46);
    }
    ctx.globalAlpha = 1;
  }
};

/* ---------------- zone background ---------------- */
function hashN(n) {
  var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawBG(ctx, zone, camY, time, viewW, viewH) {
  var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
  var g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, zone.bg0);
  g.addColorStop(1, zone.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(0, camY - 4, viewW, viewH + 8);

  // horizontal depth lines
  ctx.strokeStyle = zone.line;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  var lh = 130;
  var start = Math.floor(camY / lh) * lh;
  for (var y = start; y < camY + viewH + lh; y += lh) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewW, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // style-specific silhouettes (deterministic per band)
  var band = 260;
  var b0 = Math.floor(camY / band), b1 = Math.floor((camY + viewH) / band) + 1;
  for (var b = b0; b <= b1; b++) {
    var by = b * band;
    var h1 = hashN(b * 7.3);
    var h2 = hashN(b * 3.1 + 9);
    if (zone.style === 'city') {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var bx = 0; bx < viewW; bx += 76) {
        var bh = 60 + hashN(b * 13 + bx) * 160;
        ctx.fillRect(bx + 6, by + band - bh, 60, bh);
      }
      ctx.fillStyle = zone.acc;
      ctx.globalAlpha = 0.25;
      for (var wx = 0; wx < viewW; wx += 30) {
        if (hashN(b * 31 + wx * 1.7) > 0.72) ctx.fillRect(wx + 8, by + 30 + hashN(wx + b) * (band - 60), 4, 6);
      }
      ctx.globalAlpha = 1;
    } else if (zone.style === 'ind') {
      ctx.strokeStyle = 'rgba(255,184,77,0.12)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(viewW * 0.15, by - 20);
      ctx.lineTo(viewW * 0.15, by + band + 20);
      ctx.moveTo(viewW * 0.82, by - 20);
      ctx.lineTo(viewW * 0.82, by + band + 20);
      ctx.stroke();
    } else if (zone.style === 'lava') {
      ctx.fillStyle = 'rgba(255,94,61,' + (0.05 + h1 * 0.05) + ')';
      for (var lb = 0; lb < 3; lb++) {
        var lx = hashN(b * 5 + lb) * viewW;
        var lr = 20 + hashN(b * 9 + lb) * 60;
        ctx.beginPath();
        ctx.arc(lx, by + h2 * band, lr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (zone.style === 'ice' || zone.style === 'crystal') {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      for (var cr = 0; cr < 4; cr++) {
        var cxp = hashN(b * 17 + cr * 3) * viewW;
        var cyp = by + hashN(b * 23 + cr) * band;
        ctx.beginPath();
        ctx.moveTo(cxp, cyp - 26);
        ctx.lineTo(cxp + 14, cyp);
        ctx.lineTo(cxp, cyp + 26);
        ctx.lineTo(cxp - 14, cyp);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (zone.style === 'cyber') {
      ctx.strokeStyle = 'rgba(176,107,255,0.08)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < viewW; gx += 42) {
        ctx.beginPath();
        ctx.moveTo(gx, by);
        ctx.lineTo(gx, by + band);
        ctx.stroke();
      }
    } else if (zone.style === 'space') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (var st = 0; st < 14; st++) {
        var sx = hashN(b * 101 + st * 7) * viewW;
        var sy = by + hashN(b * 53 + st * 13) * band;
        var sr = hashN(st * 3 + b) > 0.85 ? 2 : 1;
        ctx.globalAlpha = 0.25 + hashN(st + b) * 0.5;
        ctx.fillRect(sx, sy, sr, sr);
      }
      ctx.globalAlpha = 1;
    } else if (zone.style === 'dark') {
      ctx.fillStyle = 'rgba(188,95,255,0.04)';
      var fg = ctx.createLinearGradient(0, by, 0, by + band);
      fg.addColorStop(0, 'rgba(188,95,255,0)');
      fg.addColorStop(0.5, 'rgba(188,95,255,' + (0.05 + h1 * 0.05) + ')');
      fg.addColorStop(1, 'rgba(188,95,255,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, by, viewW, band);
    }
  }

  // ambient floating particles
  var q = QUALITY[Cv.quality] || QUALITY.high;
  var n = q.glow ? 26 : 12;
  ctx.fillStyle = zone.part;
  for (var p = 0; p < n; p++) {
    var px = hashN(p * 3.7) * viewW + Math.sin(time * 0.4 + p) * 14;
    var pyMod = (hashN(p * 9.1) * (camY + viewH + 200) + time * (12 + hashN(p) * 20)) % (viewH + 200);
    var py2 = camY + pyMod - 100;
    ctx.globalAlpha = 0.12 + hashN(p * 5.5) * 0.2;
    ctx.fillRect(px, py2, 2, 2);
  }
  ctx.globalAlpha = 1;

  // side walls
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, camY - 4, CFG.WALL, viewH + 8);
  ctx.fillRect(CFG.W - CFG.WALL, camY - 4, CFG.WALL, viewH + 8);
  ctx.fillStyle = zone.acc;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(CFG.WALL - 2, camY - 4, 2, viewH + 8);
  ctx.fillRect(CFG.W - CFG.WALL, camY - 4, 2, viewH + 8);
  ctx.globalAlpha = 1;
}
/* ---------------- entity drawing ---------------- */
var Draw = {
  platform: function (e, ctx) {
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    ctx.fillStyle = 'rgba(77,216,255,0.14)';
    ctx.fillRect(e.x - e.w / 2, e.y - 3, e.w, 8);
    ctx.strokeStyle = '#4dd8ff';
    ctx.lineWidth = 2;
    if (glow) { ctx.shadowColor = '#4dd8ff'; ctx.shadowBlur = 10; }
    ctx.strokeRect(e.x - e.w / 2, e.y - 3, e.w, 8);
    ctx.shadowBlur = 0;
  },

  coin: function (e, ctx, time) {
    var pulse = 1 + Math.sin(time * 4 + e.y * 0.05) * 0.08;
    var r = 9 * pulse;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    if (glow) { ctx.shadowColor = '#ffd75e'; ctx.shadowBlur = 12; }
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  },

  spike: function (e, ctx, zone) {
    var color = zone.acc2;
    ctx.fillStyle = color;
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
    var i, x0, x1, y0;
    if (e.dir === 'l') {
      x0 = CFG.WALL + e.size * 0.15; x1 = CFG.WALL + e.size * 0.6;
      for (i = 0; i < e.n; i++) {
        y0 = e.y + i * e.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0 + e.size * 0.3);
        ctx.lineTo(x0, y0 + e.size * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    } else if (e.dir === 'r') {
      x0 = CFG.W - CFG.WALL - e.size * 0.15; x1 = CFG.W - CFG.WALL - e.size * 0.6;
      for (i = 0; i < e.n; i++) {
        y0 = e.y + i * e.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0 + e.size * 0.3);
        ctx.lineTo(x0, y0 + e.size * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      for (i = 0; i < e.n; i++) {
        var sx = e.x + i * e.size * 0.95;
        ctx.beginPath();
        ctx.moveTo(sx, e.y + e.size);
        ctx.lineTo(sx + e.size * 0.475, e.y);
        ctx.lineTo(sx + e.size * 0.95, e.y + e.size);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  },

  laser: function (e, ctx, time, zone) {
    var on = laserOn(e);
    var warn = laserWarn(e);
    ctx.fillStyle = '#8fa3c8';
    ctx.fillRect(e.x0 - 6, e.y - 6, 12, 12);
    ctx.fillRect(e.x1 - 6, e.y - 6, 12, 12);
    var grad = ctx.createLinearGradient(e.x0, 0, e.x1, 0);
    grad.addColorStop(0, zone.acc2);
    grad.addColorStop(1, '#ffffff');
    ctx.strokeStyle = grad;
    if (on) {
      if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = zone.acc2; ctx.shadowBlur = 16; }
      ctx.lineWidth = 6 + Math.sin(time * 30) * 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x0, e.y);
      ctx.lineTo(e.x1, e.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (warn) {
      ctx.globalAlpha = 0.3 + Math.sin(time * 24) * 0.2;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(e.x0, e.y);
      ctx.lineTo(e.x1, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  },

  saw: function (e, ctx, time) {
    var r = e.r;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff5e7a'; ctx.shadowBlur = 12; }
    ctx.fillStyle = '#3a2f58';
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a1 = i / 10 * Math.PI * 2;
      var a2 = a1 + Math.PI / 10;
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.7, Math.sin(a2) * r * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff5e7a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff5e7a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  chest: function (e, ctx, time) {
    if (e.opened) return;
    var colors = { wood: '#c8935a', rare: '#4dd8ff', epic: '#b06bff', legendary: '#ffd75e' };
    var c = colors[e.rar] || colors.wood;
    var bob = Math.sin(time * 2 + e.x * 0.1) * 4;
    ctx.save();
    ctx.translate(e.x, e.y + bob);
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = c; ctx.shadowBlur = 18; }
    ctx.fillStyle = 'rgba(10,14,28,0.9)';
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(-16, -12, 32, 24);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(16, -2);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  portal: function (e, ctx, time) {
    if (e.used) return;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    for (var i = 0; i < 3; i++) {
      var k = (time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.strokeStyle = '#4dffc4';
      ctx.lineWidth = 3 - k * 2;
      if (glow) { ctx.shadowColor = '#4dffc4'; ctx.shadowBlur = 14; }
      ctx.beginPath();
      ctx.arc(e.x, e.y, 14 + k * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4dffc4';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
    ctx.fill();
  },

  gate: function (g, ctx, time, zone) {
    var slabs = [
      { s: g.safe, label: 'SAFE', c: '#4dd8ff' },
      { s: g.risk, label: 'RISK', c: '#ff5e7a' }
    ];
    for (var i = 0; i < 2; i++) {
      var it = slabs[i];
      ctx.fillStyle = 'rgba(77,216,255,0.10)';
      ctx.fillRect(it.s.x - it.s.w / 2, it.s.y - 3, it.s.w, 8);
      ctx.strokeStyle = it.c;
      ctx.lineWidth = 2;
      if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = it.c; ctx.shadowBlur = 10; }
      ctx.strokeRect(it.s.x - it.s.w / 2, it.s.y - 3, it.s.w, 8);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = g.picked ? 0.4 : (0.7 + Math.sin(time * 3 + i) * 0.3);
      ctx.fillStyle = it.c;
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(it.label, it.s.x, it.s.y - 14);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(143,163,200,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(CFG.W / 2, g.y - 46);
    ctx.lineTo(CFG.W / 2, g.y + 60);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  piston: function (x, y, w, zc, time) {
    var ctx = Cv.ctx;
    var h = 40;
    var grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#ff5e7a');
    grad.addColorStop(1, '#7a2540');
    ctx.fillStyle = grad;
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff5e7a'; ctx.shadowBlur = 12; }
    ctx.fillRect(x, y - h / 2, w, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y - h / 2, w, 4);
  },

  voidOrb: function (x, y, r, time) {
    var ctx = Cv.ctx;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    if (glow) { ctx.shadowColor = '#b06bff'; ctx.shadowBlur = 18; }
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#b06bff');
    g.addColorStop(1, 'rgba(108,59,255,0.1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(176,107,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 5 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  },

  magnetOrb: function (x, y, r, time) {
    var ctx = Cv.ctx;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    if (glow) { ctx.shadowColor = '#4d8aff'; ctx.shadowBlur = 16; }
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#4d8aff');
    g.addColorStop(1, 'rgba(77,138,255,0.08)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(77,138,255,0.7)';
    ctx.lineWidth = 2;
    for (var i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6 + i * 7 + Math.sin(time * 6 + i) * 2, time * 2 + i, time * 2 + i + Math.PI * 1.2);
      ctx.stroke();
    }
  },

  rock: function (x, y, r, rot) {
    var ctx = Cv.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#4a3b52';
    ctx.strokeStyle = '#ff9a5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < 7; i++) {
      var a = i / 7 * Math.PI * 2;
      var rr = r * (0.75 + hashN(i * 3.3 + Math.floor(rot * 10)) * 0.3);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  boss: function (b, ctx, camY, time) {
    var cx = CFG.W / 2;
    var yMid = (b.y0 + b.y1) / 2 - camY;
    switch (b.type) {
      case 'laser': {
        if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff4dd8'; ctx.shadowBlur = 24; }
        var g = ctx.createRadialGradient(cx, yMid, 2, cx, yMid, 34);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#ff4dd8');
        g.addColorStop(1, 'rgba(255,77,216,0.05)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, yMid, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        var rev = Math.floor(b.t / 3.5) % 2 === 0 ? 1 : -1;
        ctx.strokeStyle = '#ff4dd8';
        ctx.lineWidth = 5;
        if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff4dd8'; ctx.shadowBlur = 14; }
        for (var i = 0; i < 3; i++) {
          var a = b.t * 0.85 * rev + i * Math.PI * 2 / 3;
          ctx.beginPath();
          ctx.moveTo(cx, yMid);
          ctx.lineTo(cx + Math.cos(a) * 195, yMid + Math.sin(a) * 195);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      }
      case 'crusher': {
        for (var p = 0; p < 3; p++) {
          var py = b.y0 + 120 + p * 190 - camY;
          var ph = (b.t * 0.45 + p * 0.5) % 1;
          var spanL = 150 + Math.sin(ph * Math.PI * 2) * 130;
          var spanR = 300 - spanL;
          Draw.piston(0, py, spanL, camY, time);
          Draw.piston(CFG.W - spanR, py, spanR, camY, time);
        }
        break;
      }
      case 'void': {
        for (var v = 0; v < 5; v++) {
          var ox = CFG.W / 2 + Math.sin(b.t * 0.62 + v * 1.26) * 132;
          var oy = b.y0 + 80 + (0.5 + 0.5 * Math.sin(b.t * 0.47 + v * 2.1)) * (CFG.BOSS_H - 160);
          Draw.voidOrb(ox, oy - camY, 20, time + v);
        }
        break;
      }
      case 'magnet': {
        for (var m = 0; m < 3; m++) {
          var mx = CFG.W / 2 + Math.sin(b.t * 0.5 + m * 2.09) * 120;
          var my = b.y0 + 90 + (0.5 + 0.5 * Math.sin(b.t * 0.38 + m * 1.7)) * (CFG.BOSS_H - 180);
          Draw.magnetOrb(mx, my - camY, 17, time + m * 0.6);
        }
        break;
      }
      case 'rocks': {
        for (var rk = 0; rk < b.rocks.length; rk++) {
          var rock = b.rocks[rk];
          if (rock.dead) continue;
          Draw.rock(rock.x, rock.y - camY, rock.r, rock.rot);
        }
        break;
      }
    }
  },

  /* the player orb with skin + trail + fx */
  orb: function (ctx, pl, camY, time) {
    var skin = skinById(Save.data.skin || 'classic');
    var q = QUALITY[Cv.quality] || QUALITY.high;
    var glow = q.glow;
    var x = pl.x, y = pl.y - camY, r = pl.r;
    var aliveA = pl.alive ? 1 : 0.35;
    // trail
    var tl = pl.trail || [];
    var maxT = q.trail;
    for (var i = maxT - 1; i >= 0; i--) {
      var tp = tl[i];
      if (!tp) continue;
      var k = 1 - i / maxT;
      ctx.globalAlpha = aliveA * k * 0.35;
      ctx.fillStyle = skin.trail;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y - camY, Math.max(1, r * k * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = aliveA;

    if (glow) { ctx.shadowColor = skin.glow; ctx.shadowBlur = 18; }

    var fx = skin.fx;
    if (fx === 'ring') {
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 7 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx === 'stars') {
      for (var st = 0; st < 3; st++) {
        var sa = time * 2.4 + st * Math.PI * 2 / 3;
        ctx.fillStyle = skin.trail;
        ctx.beginPath();
        ctx.arc(x + Math.cos(sa) * (r + 8), y + Math.sin(sa) * (r + 8), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (fx === 'rays' || fx === 'legend') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 0.8);
      ctx.strokeStyle = skin.trail;
      ctx.globalAlpha = aliveA * 0.5;
      ctx.lineWidth = 2;
      var nr = fx === 'legend' ? 12 : 8;
      for (var ry = 0; ry < nr; ry++) {
        var ra = ry / nr * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * (r + 4), Math.sin(ra) * (r + 4));
        ctx.lineTo(Math.cos(ra) * (r + 11), Math.sin(ra) * (r + 11));
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = aliveA;
    } else if (fx === 'hex') {
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 1.4);
      ctx.beginPath();
      for (var hx = 0; hx < 6; hx++) {
        var ha = hx / 6 * Math.PI * 2;
        ctx.lineTo(Math.cos(ha) * (r + 8), Math.sin(ha) * (r + 8));
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    } else if (fx === 'plasma') {
      for (var pz = 0; pz < 2; pz++) {
        ctx.strokeStyle = pz ? skin.glow : skin.trail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 6 + pz * 5, time * (3 + pz) + pz * 2, time * (3 + pz) + pz * 2 + Math.PI * 1.4);
        ctx.stroke();
      }
    } else if (fx === 'shadow') {
      ctx.fillStyle = 'rgba(10,14,28,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // body
    var hueShift = (fx === 'rainbow' || fx === 'shimmer') ? (time * 80) % 360 : 0;
    var g2 = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r);
    g2.addColorStop(0, skin.core);
    g2.addColorStop(1, skin.mid);
    if (hueShift) ctx.filter = 'hue-rotate(' + hueShift + 'deg)';
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (hueShift) ctx.filter = 'none';
    ctx.shadowBlur = 0;

    if (fx === 'fire') {
      ctx.globalAlpha = aliveA * (0.4 + Math.sin(time * 18) * 0.25);
      ctx.fillStyle = skin.glow;
      ctx.beginPath();
      ctx.arc(x, y, r + 3 + Math.sin(time * 22) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'frost') {
      ctx.globalAlpha = aliveA * 0.4;
      ctx.strokeStyle = skin.trail;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'facet') {
      ctx.globalAlpha = aliveA * 0.7;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - r * 0.6);
      ctx.lineTo(x + r * 0.3, y - r * 0.2);
      ctx.lineTo(x - r * 0.2, y + r * 0.5);
      ctx.stroke();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'void') {
      ctx.globalAlpha = aliveA * 0.5;
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, time * 3, time * 3 + Math.PI * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r + 5, time * 3 + Math.PI, time * 3 + Math.PI * 1.8);
      ctx.stroke();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'toxic') {
      ctx.globalAlpha = aliveA * 0.5;
      ctx.fillStyle = skin.trail;
      for (var td = 0; td < 3; td++) {
        var ty = y + r + ((time * 30 + td * 10) % 22);
        ctx.beginPath();
        ctx.arc(x + (td - 1) * 6, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = aliveA;
    }

    if (pl.shield > 0) {
      ctx.strokeStyle = '#4dd8ff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = aliveA * (0.6 + Math.sin(time * 6) * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (pl.ghost > 0) ctx.globalAlpha = aliveA * 0.55;
    if (pl.blaze > 0) {
      ctx.globalAlpha = aliveA * (0.5 + Math.sin(time * 20) * 0.3);
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

/* laser duty-cycle helpers (shared by draw + collision) */
function laserCycle(e) { return 2.2 / (e.speed || 1); }
function laserOn(e) {
  var c = laserCycle(e);
  var t = (e.t || 0) % c;
  return t > c * 0.45 && t < c * 0.85;
}
function laserWarn(e) {
  var c = laserCycle(e);
  var t = (e.t || 0) % c;
  return t > c * 0.25 && t <= c * 0.45;
}

/* ---------------- procedural world ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var World = {
  chunks: {},
  nextGen: 0,
  corX: CFG.W / 2,
  camY: 0,
  rng: Math.random,

  reset: function (seed) {
    this.chunks = {};
    this.nextGen = 0;
    this.corX = CFG.W / 2;
    this.rng = mulberry32(seed || 1);
  },

  zoneFor: function (floor) {
    return Math.floor(Math.max(0, floor - 1) / 50) % ZONES.length;
  },

  diffFor: function (floor) {
    var d;
    if (floor <= 20) d = 0.12 + floor / 200;
    else d = 0.22 + Math.min(0.73, (floor - 20) / 900);
    return U.clamp(d, 0, 0.95);
  },

  chunkAt: function (i) {
    if (!this.chunks[i]) this.chunks[i] = this.genChunk(i);
    return this.chunks[i];
  },

  genAhead: function () {
    var viewH = Cv.cssH / Cv.s;
    var target = Math.floor((this.camY + viewH) / CFG.FLOOR_H) + CFG.CHUNKS_AHEAD;
    while (this.nextGen <= target) {
      this.chunks[this.nextGen] = this.genChunk(this.nextGen);
      this.nextGen++;
    }
  },

  prune: function (camY) {
    var minI = Math.floor(camY / CFG.FLOOR_H) - CFG.CHUNKS_BEHIND;
    for (var k in this.chunks) {
      if (parseInt(k, 10) < minI) delete this.chunks[k];
    }
  },

  mkCoin: function (rng, x, y) {
    return { type: 'coin', x: U.clamp(x, CFG.WALL + 14, CFG.W - CFG.WALL - 14), y: y, taken: false };
  },

  genChunk: function (i) {
    var y0 = i * CFG.FLOOR_H;
    var floor = i + 1;
    var zone = this.zoneFor(floor);
    var rng = this.rng;
    var c = { i: i, y0: y0, zone: zone, ents: [], gate: null, boss: null, portal: null };

    // corridor walk (guaranteed passable lane)
    var prevCor = this.corX;
    this.corX += (rng() - 0.5) * 80;
    this.corX = U.clamp(this.corX, 95, CFG.W - 95);
    c.corX = this.corX;

    var isBoss = floor % CFG.BOSS_EVERY === 0;
    var tutGate = (typeof Run !== 'undefined' && Run && Run.isTutorial) && floor === 3;
    var inCooldown = (floor % CFG.BOSS_EVERY) >= 94 && (floor % CFG.BOSS_EVERY) <= 4;

    if (isBoss) {
      var bossIdx = Math.floor(floor / CFG.BOSS_EVERY) - 1;
      c.boss = {
        type: BOSS_TYPES[bossIdx % BOSS_TYPES.length],
        y0: y0 + 50,
        y1: y0 + CFG.BOSS_H,
        t: 0,
        entered: false,
        done: false,
        rocks: [],
        rockTimer: 0
      };
      // a few coins leading into the boss
      for (var k = 0; k < 3; k++) c.ents.push(this.mkCoin(rng, c.corX + (rng() - 0.5) * 60, y0 + 60 + k * 30));
      return c;
    }

    // coins along the corridor
    var nCoins = 4 + Math.floor(rng() * 4);
    for (var ci = 0; ci < nCoins; ci++) {
      var cy = y0 + 50 + (440 / nCoins) * ci + rng() * 24;
      var cx = c.corX + Math.sin(ci * 0.9 + rng() * 2) * 34;
      c.ents.push(this.mkCoin(rng, cx, cy));
    }

    // gate
    if (!inCooldown && floor >= CFG.GATE_FROM && floor % CFG.GATE_EVERY === 0) {
      var gw = tutGate ? 150 : 120;
      c.gate = {
        y: y0 + 260,
        safe: { x: CFG.W * 0.28, y: y0 + 260, w: gw, cool: 0 },
        risk: { x: CFG.W * 0.72, y: y0 + 260, w: gw, cool: 0 },
        saw: { t: rng() * 6, dead: tutGate },
        picked: null
      };
    }

    // hazard placement (never blocks the corridor centre)
    if (!inCooldown && floor > 2) {
      var d = this.diffFor(floor);
      var nHaz = 1 + Math.floor(d * 3.2 + rng());
      for (var hi = 0; hi < nHaz; hi++) {
        var hy = y0 + 70 + (380 / nHaz) * hi + rng() * 30;
        if (c.gate && Math.abs(hy - (y0 + 260)) < 110) continue;
        var roll = rng();
        if (roll < 0.30) {
          // wall spikes
          var dir = rng() < 0.5 ? 'l' : 'r';
          var size = 58 + d * 42;
          var n = 2 + Math.floor(d * 3);
          c.ents.push({ type: 'spike', dir: dir, y: hy - size * 0.4, size: size, n: n });
        } else if (roll < 0.52) {
          // horizontal laser — keeps the whole corridor transition segment
          // (previous corridor .. current corridor) open; takes the longer side
          var segLo = Math.min(prevCor, c.corX) - 78;
          var segHi = Math.max(prevCor, c.corX) + 78;
          var spanL = segLo - CFG.WALL;
          var spanR = (CFG.W - CFG.WALL) - segHi;
          var fromLeft = spanL >= spanR;
          var laserEnd = fromLeft ? segLo : segHi;
          c.ents.push({
            type: 'laser', y: hy,
            x0: fromLeft ? CFG.WALL : laserEnd,
            x1: fromLeft ? laserEnd : CFG.W - CFG.WALL,
            t: rng() * 4, speed: 0.9 + d * 1.3
          });
        } else if (roll < 0.78) {
          // moving saw (path avoids the corridor centre)
          var r = 16 + d * 14;
          var side = rng() < 0.5 ? -1 : 1;
          var wPath = 90 + d * 120;
          // the saw lives in a wall region that never approaches the
          // corridor lane — including the transition segment between the
          // previous and the current corridor (the player's path)
          var loW = CFG.WALL + r, hiW = CFG.W - CFG.WALL - r;
          var halfBand = 24 + r + (r + CFG.R - 2) + 8;
          var minCor = Math.min(prevCor, c.corX), maxCor = Math.max(prevCor, c.corX);
          var rgA, rgB;
          if (side < 0) { rgA = loW; rgB = Math.min(hiW, minCor - halfBand); }
          else { rgA = Math.max(loW, maxCor + halfBand); rgB = hiW; }
          if (rgB - rgA < 24) {
            side = -side;
            if (side < 0) { rgA = loW; rgB = Math.min(hiW, minCor - halfBand); }
            else { rgA = Math.max(loW, maxCor + halfBand); rgB = hiW; }
          }
          var sw = Math.min(wPath, Math.max(24, rgB - rgA));
          var cxPath = c.corX + side * (60 + rng() * 50);
          var sx0 = U.clamp(cxPath - sw / 2, rgA, rgB - sw);
          c.ents.push({
            type: 'saw', r: r, y: hy,
            x0: sx0, x1: sx0 + sw,
            t: rng() * 6, sp: 1 + d * 1.6, rot: 0
          });
        } else {
          // bounce platform inside the corridor
          c.ents.push({
            type: 'plat',
            x: U.clamp(c.corX + (rng() - 0.5) * 80, CFG.WALL + 70, CFG.W - CFG.WALL - 70),
            y: hy, w: 130, cool: 0
          });
        }
      }
    }

    // chest
    var luck = (typeof Save !== 'undefined' && Save && Save.data) ? (Save.data.upgrades.luck || 0) : 0;
    var chestChance = Math.min(CFG.CHEST_BASE + luck * CFG.CHEST_LUCK, CFG.CHEST_CAP);
    if (!inCooldown && !c.gate && rng() < chestChance) {
      var rarRoll = rng() * 100, acc = 0, rarId = 'wood';
      for (var ri = 0; ri < CHEST_RARS.length; ri++) {
        acc += CHEST_RARS[ri].w;
        if (rarRoll < acc) { rarId = CHEST_RARS[ri].id; break; }
      }
      c.ents.push({
        type: 'chest',
        x: U.clamp(c.corX + (rng() - 0.5) * 80, CFG.WALL + 24, CFG.W - CFG.WALL - 24),
        y: y0 + 200 + rng() * 200,
        rar: rarId, opened: false, t: 0
      });
    }

    /* perk portal */
    if (!inCooldown && !c.gate && floor >= CFG.PERK_FROM && floor % CFG.PERK_EVERY === 0) {
      var bz2 = (floor % CFG.BOSS_EVERY) >= 94 && (floor % CFG.BOSS_EVERY) <= 4;
      if (!bz2) c.portal = { x: c.corX, y: y0 + 130, used: false };
    }

    return c;
  },

  /* entities in a world-y range (for collision + draw) */
  near: function (y0, y1, out) {
    out = out || { ents: [], gates: [], bosses: [] };
    var i0 = Math.floor(y0 / CFG.FLOOR_H) - 1;
    var i1 = Math.floor(y1 / CFG.FLOOR_H) + 1;
    for (var i = i0; i <= i1; i++) {
      var c = this.chunks[i];
      if (!c) continue;
      for (var e = 0; e < c.ents.length; e++) out.ents.push(c.ents[e]);
      if (c.gate) out.gates.push(c.gate);
      if (c.boss) out.bosses.push(c.boss);
    }
    return out;
  },

  update: function (dt, time) {
    var camY = this.camY;
    var viewH = Cv.cssH / Cv.s;
    var i0 = Math.floor((camY - 100) / CFG.FLOOR_H);
    var i1 = Math.floor((camY + viewH + 100) / CFG.FLOOR_H);
    for (var i = i0; i <= i1; i++) {
      var c = this.chunks[i];
      if (!c) continue;
      var ents = c.ents;
      for (var e = 0; e < ents.length; e++) {
        var en = ents[e];
        if (en.type === 'laser') en.t += dt;
        else if (en.type === 'saw') {
          en.t += dt;
          en.rot += dt * 6;
          var k = (Math.sin(en.t * en.sp) + 1) / 2;
          en.x = U.lerp(en.x0, en.x1, k);
        }
        else if (en.type === 'plat') en.cool = Math.max(0, en.cool - dt);
        else if (en.type === 'chest') en.t += dt;
        else if (en.type === 'coin') {
          // magnet pull
          var mr = Run.magnetRadius();
          if (mr > 0 && !en.taken && Pl.alive) {
            var d2 = U.dist2(en.x, en.y, Pl.x, Pl.y);
            if (d2 < mr * mr) {
              var d = Math.sqrt(d2) || 1;
              var pull = (1 - d / mr) * 900 * dt;
              en.x += (Pl.x - en.x) / d * pull;
              en.y += (Pl.y - en.y) / d * pull;
            }
          }
        }
      }
      if (c.gate) {
        var g = c.gate;
        g.safe.cool = Math.max(0, g.safe.cool - dt);
        g.risk.cool = Math.max(0, g.risk.cool - dt);
        if (g.saw && !g.saw.dead) g.saw.t += dt;
      }
      if (c.boss) this.updateBoss(c.boss, dt, time);
    }
  },

  updateBoss: function (b, dt, time) {
    if (b.entered && !b.done) {
      b.t += dt;
      if (b.type === 'rocks') {
        b.rockTimer -= dt;
        if (b.rockTimer <= 0 && b.rocks.length < 6) {
          b.rockTimer = 0.9;
          var rx = 60 + Math.random() * (CFG.W - 120);
          b.rocks.push({
            x: rx, y: b.y0 - 40,
            vx: (Pl.x - rx) * 0.6, vy: 120 + Math.random() * 80,
            r: 16 + Math.random() * 10,
            rot: 0, dead: false
          });
        }
        for (var i = 0; i < b.rocks.length; i++) {
          var rk = b.rocks[i];
          if (rk.dead) continue;
          rk.vy += 200 * dt;
          rk.x += rk.vx * dt;
          rk.y += rk.vy * dt;
          rk.rot += dt * 3;
          if (rk.x < CFG.WALL + rk.r) { rk.x = CFG.WALL + rk.r; rk.vx = -rk.vx; }
          if (rk.x > CFG.W - CFG.WALL - rk.r) { rk.x = CFG.W - CFG.WALL - rk.r; rk.vx = -rk.vx; }
          if (rk.y > b.y1 + 120) rk.dead = true;
        }
      }
    }
  },

  draw: function (ctx, camY, time, viewH) {
    var i0 = Math.floor((camY - 120) / CFG.FLOOR_H);
    var i1 = Math.floor((camY + viewH + 120) / CFG.FLOOR_H);
    for (var i = i0; i <= i1; i++) {
      var c = this.chunks[i];
      if (!c) continue;
      var zone = ZONES[c.zone];
      // floor line + label
      ctx.strokeStyle = 'rgba(143,163,200,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CFG.WALL, c.y0);
      ctx.lineTo(CFG.W - CFG.WALL, c.y0);
      ctx.stroke();
      if (i % 5 === 0 && i > 0) {
        ctx.fillStyle = 'rgba(143,163,200,0.3)';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(i + 1), CFG.WALL + 8, c.y0 - 6);
      }
      var ents = c.ents;
      for (var e = 0; e < ents.length; e++) {
        var en = ents[e];
        if (en.type === 'plat') Draw.platform(en, ctx);
        else if (en.type === 'coin' && !en.taken) Draw.coin(en, ctx, time);
        else if (en.type === 'spike') Draw.spike(en, ctx, zone);
        else if (en.type === 'laser') Draw.laser(en, ctx, time, zone);
        else if (en.type === 'saw') Draw.saw(en, ctx, time);
        else if (en.type === 'chest') Draw.chest(en, ctx, time);
      }
      if (c.gate) Draw.gate(c.gate, ctx, time, zone);
      if (c.portal) Draw.portal(c.portal, ctx, time);
      if (c.boss) Draw.boss(c.boss, ctx, camY, time);
    }
  }
};

/* ---------------- player ---------------- */
var Pl = {
  x: CFG.W / 2,
  y: 160,
  r: CFG.R,
  vx: 0,
  vy: 0,
  prevBottom: 0,
  alive: true,
  inv: 0,
  ghost: 0,
  blaze: 0,
  shield: 0,
  wallCd: 0,
  trail: [],

  reset: function () {
    this.x = CFG.W / 2;
    this.y = 160;
    this.vx = 0;
    this.vy = 0;
    this.prevBottom = 160 + this.r;
    this.alive = true;
    this.inv = 1.2;
    this.ghost = 0;
    this.blaze = 0;
    this.shield = Math.floor((Save.data.upgrades.shield || 0) / 4);
    this.wallCd = 0;
    this.trail = [];
  },

  maxFall: function (floor) {
    var v = CFG.MAXFALL_BASE + CFG.MAXFALL_GROW * Math.min(floor, 400);
    var e = Run.effects();
    if (e.boost) v *= 1 + 0.02 * e.boost;
    if (e.feather) v *= 0.55;
    if (e.over) v *= 1.25;
    return Math.min(CFG.MAXFALL_CAP, v);
  },

  update: function (dt) {
    var floor = Run.floor;
    this.wallCd = Math.max(0, this.wallCd - dt);
    if (this.inv > 0) this.inv -= dt;
    if (this.ghost > 0) this.ghost -= dt;
    if (this.blaze > 0) this.blaze -= dt;

    /* --- horizontal input --- */
    if (Input.pointer.down) {
      var target = Input.pointer.wx;
      var dx = target - this.x;
      this.vx = U.clamp(dx * 13, -560, 560);
      if (Math.abs(dx) < 2) this.vx *= 0.8;
    } else if (Input.keys.left || Input.keys.right) {
      var dir = (Input.keys.right ? 1 : 0) - (Input.keys.left ? 1 : 0);
      this.vx += dir * CFG.ACCEL * dt;
      this.vx = U.clamp(this.vx, -CFG.MAXVX, CFG.MAXVX);
    } else {
      this.vx *= Math.pow(0.02, dt);
      if (Math.abs(this.vx) < 4) this.vx = 0;
    }

    /* --- vertical: gravity --- */
    this.vy += CFG.GRAV * dt;
    var mf = this.maxFall(floor);
    if (this.vy > mf) this.vy = mf;

    /* --- integrate --- */
    var prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.prevBottom = prevY + this.r;

    /* --- trail --- */
    this.trail.unshift({ x: this.x, y: this.y });
    var maxT = (QUALITY[Cv.quality] || QUALITY.high).trail;
    if (this.trail.length > maxT) this.trail.length = maxT;

    /* --- walls --- */
    var left = CFG.WALL + this.r, right = CFG.W - CFG.WALL - this.r;
    if (this.x < left) {
      this.x = left;
      if (this.vx < -60 && this.wallCd <= 0) { this.wallCd = 0.18; Cv.addShake(3); Audio.sfx('bounce'); }
      this.vx = -this.vx * 0.55;
    } else if (this.x > right) {
      this.x = right;
      if (this.vx > 60 && this.wallCd <= 0) { this.wallCd = 0.18; Cv.addShake(3); Audio.sfx('bounce'); }
      this.vx = -this.vx * 0.55;
    }

    /* --- camera follows down only (world y grows downwards) --- */
    var viewH = Cv.cssH / Cv.s;
    var targetCam = this.y - viewH * 0.36;
    if (targetCam > Game.camY) Game.camY = targetCam;
    World.camY = Game.camY;

    if (this.alive) this.collide();
  },

  rectHit: function (x0, y0, x1, y1) {
    var cx = U.clamp(this.x, x0, x1), cy = U.clamp(this.y, y0, y1);
    return U.dist2(this.x, this.y, cx, cy) < this.r * this.r * 0.8;
  },

  collide: function () {
    var near = World.near(this.y - 90, this.y + 90);
    var ents = near.ents;
    var i, en, d2;

    for (i = 0; i < ents.length; i++) {
      en = ents[i];
      if (en.type === 'coin') {
        if (en.taken) continue;
        d2 = U.dist2(this.x, this.y, en.x, en.y);
        if (d2 < 22 * 22) {
          en.taken = true;
          Run.collectCoin(en);
        }
      } else if (en.type === 'chest') {
        if (en.opened) continue;
        d2 = U.dist2(this.x, this.y, en.x, en.y);
        if (d2 < 28 * 28) {
          en.opened = true;
          Run.openChest(en.rar, en.x, en.y);
        }
      } else if (en.type === 'plat') {
        if (this.vy > 0 && this.prevBottom <= en.y + 6 && this.y + this.r >= en.y &&
            Math.abs(this.x - en.x) <= en.w / 2 + this.r * 0.6 && en.cool <= 0) {
          en.cool = 1.0;
          this.vy = -CFG.BOUNCE;
          this.y = en.y - this.r;
          Audio.sfx('bounce');
          Cv.addShake(2);
          Particles.burst(this.x, en.y, 10, '#4dd8ff', 140, 0.4, 2);
        }
      } else if (en.type === 'spike') {
        if (this.spikeHit(en)) this.hurt('spike');
      } else if (en.type === 'laser') {
        if (laserOn(en) && this.rectHit(Math.min(en.x0, en.x1), en.y - 6, Math.max(en.x0, en.x1), en.y + 6)) this.hurt('laser');
      } else if (en.type === 'saw') {
        d2 = U.dist2(this.x, this.y, en.x, en.y);
        if (d2 < (en.r + this.r - 2) * (en.r + this.r - 2)) this.hurt('saw');
        else Run.nearMissCheck(en, this.x, this.y, en.r + this.r + 26);
      }
    }

    // gate slabs + lane reward
    for (i = 0; i < near.gates.length; i++) {
      var g = near.gates[i];
      var slabs = [g.safe, g.risk];
      for (var si = 0; si < 2; si++) {
        var s = slabs[si];
        if (this.vy > 0 && this.prevBottom <= s.y + 6 && this.y + this.r >= s.y &&
            Math.abs(this.x - s.x) <= s.w / 2 + this.r * 0.6 && s.cool <= 0) {
          s.cool = 1.0;
          this.vy = -CFG.BOUNCE;
          this.y = s.y - this.r;
          Audio.sfx('bounce');
          Cv.addShake(2);
        }
      }
      // risk saw
      if (g.saw && !g.saw.dead) {
        var sawX = CFG.W / 2 + Math.sin(g.saw.t * 2.4) * (CFG.W / 2 - 60);
        var sawY = g.y + 90;
        d2 = U.dist2(this.x, this.y, sawX, sawY);
        if (d2 < (24 + this.r - 2) * (24 + this.r - 2)) this.hurt('saw');
      }
      // lane reward when passing below the slabs
      if (!g.picked && this.y > g.y + 60) {
        g.picked = this.x < CFG.W / 2 ? 'safe' : 'risk';
        if (g.picked === 'safe') {
          Run.addCoins(CFG.SAFE_REWARD, this.x, this.y, false);
          Save.data.stats.safeWins++;
          Prog.questAdd('safe', 1);
          FloatText.add(this.x, this.y - 40, I18N.t('bonus') + ' +' + CFG.SAFE_REWARD, '#4dd8ff', 16);
          Audio.sfx('milestone');
        } else {
          Run.addCoins(CFG.RISK_REWARD, this.x, this.y, false);
          Save.data.stats.risksWon++;
          Prog.questAdd('risks', 1);
          FloatText.add(this.x, this.y - 40, I18N.t('bonus') + ' +' + CFG.RISK_REWARD, '#ffd75e', 18);
          Audio.sfx('milestone');
          Cv.addShake(6);
        }
      }
    }

    // boss collision
    for (i = 0; i < near.bosses.length; i++) {
      var b = near.bosses[i];
      if (b.entered && !b.done) Run.bossCollide(b);
    }
  },

  spikeHit: function (en) {
    var pad = 4;
    if (en.dir === 'l') {
      var x0 = CFG.WALL + en.size * 0.15, x1 = CFG.WALL + en.size * 0.6;
      for (var i = 0; i < en.n; i++) {
        var y0 = en.y + i * en.size * 0.9 + pad, y1 = en.y + i * en.size * 0.9 + en.size * 0.9 - pad;
        if (this.rectHit(x0, y0, x1, y1)) return true;
      }
    } else if (en.dir === 'r') {
      var x2 = CFG.W - CFG.WALL - en.size * 0.6, x3 = CFG.W - CFG.WALL - en.size * 0.15;
      for (var j = 0; j < en.n; j++) {
        var y2 = en.y + j * en.size * 0.9 + pad, y3 = en.y + j * en.size * 0.9 + en.size * 0.9 - pad;
        if (this.rectHit(x2, y2, x3, y3)) return true;
      }
    } else {
      var x4 = en.x + en.size * 0.2, x5 = en.x + (en.n - 1) * en.size * 0.95 + en.size * 0.75;
      if (this.rectHit(x4, en.y + pad, x5, en.y + en.size)) return true;
    }
    return false;
  },

  hurt: function (source) {
    if (!this.alive || this.inv > 0) return;
    if (this.blaze > 0) return;
    if (source === 'spike' && this.ghost > 0) return;
    if (this.shield > 0) {
      this.shield--;
      this.inv = 1.7;
      Audio.sfx('shield');
      Cv.addShake(9);
      Particles.burst(this.x, this.y, 26, '#4dd8ff', 260, 0.7, 3);
      FloatText.add(this.x, this.y - 30, I18N.t('p_shield'), '#4dd8ff', 14);
      return;
    }
    Run.die();
  }
};

/* ---------------- input ---------------- */
var Input = {
  keys: { left: false, right: false },
  pointer: { down: false, wx: 0, sx: 0, swx: 0 },

  init: function () {
    var self = this;
    window.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ф' || k === 'Ф') { self.keys.left = true; e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'в' || k === 'В') { self.keys.right = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ф' || k === 'Ф') self.keys.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'в' || k === 'В') self.keys.right = false;
    });
    function downX(clientX) {
      self.pointer.down = true;
      self.pointer.sx = clientX;
      self.pointer.swx = self.worldX(clientX);
      self.pointer.wx = self.pointer.swx;
    }
    function moveX(clientX) {
      if (!self.pointer.down) return;
      var dx = clientX - self.pointer.sx;
      self.pointer.wx = U.clamp(self.pointer.swx + dx * 1.4, CFG.WALL + 10, CFG.W - CFG.WALL - 10);
    }
    function up() { self.pointer.down = false; }

    var cv = document.getElementById('game');
    if (cv) {
      cv.addEventListener('touchstart', function (e) { e.preventDefault(); if (e.touches.length) downX(e.touches[0].clientX); }, { passive: false });
      cv.addEventListener('touchmove', function (e) { e.preventDefault(); if (e.touches.length) moveX(e.touches[0].clientX); }, { passive: false });
      cv.addEventListener('touchend', function (e) { e.preventDefault(); up(); }, { passive: false });
      cv.addEventListener('mousedown', function (e) { downX(e.clientX); });
      window.addEventListener('mousemove', function (e) { moveX(e.clientX); });
      window.addEventListener('mouseup', up);
      window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
  },

  worldX: function (clientX) {
    return (clientX - Cv.ox) / Cv.s;
  }
};

/* ---------------- run controller ---------------- */
var Run = {
  floor: 1,
  time: 0,
  worldTime: 0,
  coins: 0,
  combo: 0,
  zoneIdx: 0,
  isTutorial: false,
  chestQueue: [],
  chestBusy: false,
  reviveUsed: false,
  freeReviveUsed: false,
  gambleDone: false,
  deathT: 0,
  deathDone: false,
  lastBossType: null,
  timers: {},

  start: function (tutorial) {
    this.isTutorial = !!tutorial && !Save.data.tutorialDone;
    this.floor = 1;
    this.time = 0;
    this.worldTime = 0;
    this.coins = 0;
    this.combo = 0;
    this.zoneIdx = 0;
    this.chestQueue = [];
    this.chestBusy = false;
    this.reviveUsed = false;
    this.freeReviveUsed = false;
    this.gambleDone = false;
    this.deathT = 0;
    this.deathDone = false;
    this.timers = {};
    Pl.reset();
    World.reset((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    Game.camY = -140;
    World.camY = Game.camY;
    World.genAhead();
    Audio.startMusic(0, 1);
    if (this.isTutorial) UI.tutorialStart();
  },

  magnetRadius: function () {
    var r = (Save.data.upgrades.magnet || 0) * 12;
    var e = this.effects();
    if (e.magnet) r += 150;
    if (e.over) r += 140;
    return r;
  },

  coinMult: function () {
    var m = 1 + 0.1 * (Save.data.upgrades.coin || 0);
    var e = this.effects();
    if (e.golden) m *= 5;
    else if (e.double) m *= 2;
    else if (e.over) m *= 2;
    return m;
  },

  effects: function () {
    var e = { boost: Save.data.upgrades.boost || 0 };
    for (var k in this.timers) {
      if (this.timers[k] > 0) e[k] = this.timers[k];
    }
    return e;
  },

  tickPerks: function (dt) {
    var changed = false;
    for (var k in this.timers) {
      if (this.timers[k] > 0) {
        this.timers[k] -= dt;
        if (this.timers[k] < 0) this.timers[k] = 0;
        changed = true;
      }
    }
    if (changed) UI.hudPerks(this);
  },

  rollPerks: function (n) {
    var lucky = this.timers.lucky > 0 ? 1.5 : 1;
    var pool = [], i, p;
    for (i = 0; i < PERKS.length; i++) {
      var w = PERKS[i].w;
      if (PERKS[i].rar === 'legendary') w *= lucky;
      if (PERKS[i].rar === 'epic') w *= Math.sqrt(lucky);
      for (var j = 0; j < Math.max(1, Math.round(w)); j++) pool.push(PERKS[i]);
    }
    var out = [];
    while (out.length < n && pool.length) {
      var idx = Math.floor(Math.random() * pool.length);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  },

  choosePerk: function (p) {
    if (!p) return;
    if (p.id === 'shield2') {
      Pl.shield++;
      Particles.burst(Pl.x, Pl.y, 24, '#4dd8ff', 240, 0.8, 3);
    } else {
      this.timers[p.id] = Math.max(this.timers[p.id] || 0, p.dur);
    }
    if (p.id === 'ghost') Pl.ghost = Math.max(Pl.ghost, p.dur);
    if (p.id === 'blaze') Pl.blaze = Math.max(Pl.blaze, p.dur);
    Audio.sfx('perk');
    FloatText.add(Pl.x, Pl.y - 40, I18N.t('p_' + p.id), '#4dffc4', 15);
    UI.hudPerks(this);
  },

  addCoins: function (n, x, y, silent) {
    if (!n) return;
    n = Math.max(1, Math.round(n * this.coinMult()));
    this.coins += n;
    Save.data.coins += n;
    Save.data.stats.coinsEarned += n;
    if (!silent) {
      FloatText.add(x, y - 24, '+' + I18N.fmt(n), '#ffd75e', 13);
      Audio.sfx('coin');
    }
    Save.markDirty();
  },

  collectCoin: function (en) {
    this.combo++;
    if (this.combo > Save.data.stats.maxCombo) Save.data.stats.maxCombo = this.combo;
    var bonus = 1;
    if (this.combo > 0 && this.combo % 10 === 0) {
      bonus = 5;
      FloatText.add(en.x, en.y - 40, I18N.t('combo') + ' ×' + this.combo, '#4dffc4', 16);
      Audio.sfx('combo');
    }
    this.addCoins(bonus * 2, en.x, en.y, false);
    Particles.burst(en.x, en.y, 6, '#ffd75e', 160, 0.35, 2);
    UI.hudCoins(this.coins);
  },

  openChest: function (rar, x, y) {
    Save.data.stats.chests++;
    Save.data.chestsOpened[rar] = (Save.data.chestsOpened[rar] || 0) + 1;
    Prog.questAdd('chests', 1);
    Audio.sfx('chest');
    Cv.addShake(5);
    this.chestQueue.push(rar);
    if (!this.chestBusy && Game.substate === null && Game.state === 'PLAYING') {
      this.chestBusy = true;
      UI.showChest(this.chestQueue.shift(), this);
    }
  },

  nearMissCheck: function (en, x, y, margin) {
    if (!en || en.nearDone) return;
    var d2 = U.dist2(x, y, en.x, en.y);
    if (d2 < margin * margin) {
      en.nearDone = true;
      this.addCoins(25, x, y - 30, false);
      FloatText.add(x, y - 50, I18N.t('near_miss'), '#ff9a5e', 13);
      Audio.sfx('near');
    }
  },

  onFloor: function (f) {
    this.floor = f;
    UI.hudFloor(f);
    this.addCoins(CFG.FLOOR_COINS, undefined, undefined, true);
    if (f % 10 === 0) {
      this.addCoins(CFG.MILESTONE10, Pl.x, Pl.y - 30, false);
      FloatText.add(Pl.x, Pl.y - 50, I18N.t('bonus') + ' ' + f, '#4dd8ff', 15);
      Audio.sfx('milestone');
    }
    if (f % 50 === 0) {
      this.addCoins(CFG.MILESTONE50, Pl.x, Pl.y - 30, false);
      FloatText.add(Pl.x, Pl.y - 50, I18N.t('bonus') + ' ' + f, '#ffd75e', 18);
      Audio.sfx('milestone');
      Cv.addShake(6);
    }
    var z = World.zoneFor(f);
    if (z !== this.zoneIdx && f > 1) {
      this.zoneIdx = z;
      Audio.startMusic(z, 1);
      Audio.sfx('zone');
      UI.zoneBanner(z);
      Save.markDirty();
    }
    // perk portal
    var chunk = World.chunks[f - 1];
    if (chunk && chunk.portal && !chunk.portalUsed) {
      chunk.portalUsed = true;
      chunk.portal.used = true;
      UI.showPerks();
      return;
    }
    if (this.isTutorial && f >= 1) UI.tutorialTick(f);
    Save.markDirty();
  },

  update: function (dt) {
    if (!Pl.alive) {
      if (!this.deathDone) {
        this.deathT -= dt;
        if (this.deathT <= 0) {
          this.deathDone = true;
          Game.timeScale = 1;
          this.finish();
        }
      }
      return;
    }
    this.time += dt;
    this.worldTime += dt;
    Save.data.stats.playTime += dt;
    if (Save.data.stats.playTime % 5 < dt) Save.markDirty();

    this.tickPerks(dt);
    var dtObs = this.timers.slow > 0 ? dt * 0.45 : dt;
    Pl.update(dt);
    World.update(dtObs, this.worldTime);
    // floor crossings
    var f = Math.floor(Pl.y / CFG.FLOOR_H) + 1;
    if (f > this.floor && Pl.alive) {
      var guard = 0;
      while (this.floor < f && guard++ < 8) this.onFloor(this.floor + 1);
    }
    // boss enter/defeat (zone can extend into the next chunk, so check both)
    if (Pl.alive) {
      var ci = Math.floor(Pl.y / CFG.FLOOR_H);
      for (var bi = 0; bi < 2; bi++) {
        var ch = World.chunks[ci - bi];
        if (ch && ch.boss) {
          var b = ch.boss;
          if (!b.entered && Pl.y > b.y0 - 60) this.bossEnter(b);
          if (b.entered && !b.done && Pl.y > b.y1) this.bossDefeat(b);
        }
      }
    }
    // chest queue
    if (this.chestQueue.length && Game.substate === null && Game.state === 'PLAYING') {
      var rar = this.chestQueue.shift();
      UI.showChest(rar, this);
    }
  },

  /* ---- boss ---- */
  bossCollide: function (b) {
    var r = Pl.r;
    if (b.type === 'laser') {
      var cx = CFG.W / 2, cy = (b.y0 + b.y1) / 2;
      if (U.dist2(Pl.x, Pl.y, cx, cy) < (30 + r - 2) * (30 + r - 2)) { Pl.hurt('boss'); return; }
      var rev = Math.floor(b.t / 3.5) % 2 === 0 ? 1 : -1;
      for (var i = 0; i < 3; i++) {
        var a = b.t * 0.85 * rev + i * Math.PI * 2 / 3;
        var ex = cx + Math.cos(a) * 195, ey = cy + Math.sin(a) * 195;
        if (U.segDist(Pl.x, Pl.y, cx, cy, ex, ey) < r + 5) { Pl.hurt('boss'); return; }
      }
    } else if (b.type === 'crusher') {
      for (var p = 0; p < 3; p++) {
        var rowY = b.y0 + 120 + p * 190;
        if (Math.abs(Pl.y - (rowY + 20)) < r + 20) {
          var ph = (b.t * 0.45 + p * 0.5) % 1;
          var spanL = 150 + Math.sin(ph * Math.PI * 2) * 130;
          var spanR = 300 - spanL;
          if (Pl.x - r < spanL + 2 || Pl.x + r > CFG.W - spanR - 2) { Pl.hurt('boss'); return; }
          if (!b.nearRow) b.nearRow = [false, false, false];
          if (!b.nearRow[p] && (Pl.x - spanL < 26 || (CFG.W - spanR) - Pl.x < 26)) {
            b.nearRow[p] = true;
            this.nearMissCheck({ x: Pl.x, y: rowY + 20, nearDone: false }, Pl.x, Pl.y, 60);
          }
        }
      }
    } else if (b.type === 'void') {
      for (var v = 0; v < 5; v++) {
        var ox = CFG.W / 2 + Math.sin(b.t * 0.62 + v * 1.26) * 132;
        var oy = b.y0 + 80 + (0.5 + 0.5 * Math.sin(b.t * 0.47 + v * 2.1)) * (CFG.BOSS_H - 160);
        if (U.dist2(Pl.x, Pl.y, ox, oy) < (20 + r - 2) * (20 + r - 2)) { Pl.hurt('boss'); return; }
      }
    } else if (b.type === 'magnet') {
      for (var m = 0; m < 3; m++) {
        var mx = CFG.W / 2 + Math.sin(b.t * 0.5 + m * 2.09) * 120;
        var my = b.y0 + 90 + (0.5 + 0.5 * Math.sin(b.t * 0.38 + m * 1.7)) * (CFG.BOSS_H - 180);
        if (U.dist2(Pl.x, Pl.y, mx, my) < (17 + r - 2) * (17 + r - 2)) { Pl.hurt('boss'); return; }
        var d2 = U.dist2(Pl.x, Pl.y, mx, my);
        var d = Math.sqrt(d2) || 1;
        if (d < 170) {
          var f = 900 * (1 - d / 170) * 0.016;
          Pl.vx += (mx - Pl.x) / d * f * 60 * 0.016 * 60 * 0.02;
          Pl.vy += (my - Pl.y) / d * f * 60 * 0.016 * 60 * 0.02;
        }
      }
    } else if (b.type === 'rocks') {
      for (var rk = 0; rk < b.rocks.length; rk++) {
        var rock = b.rocks[rk];
        if (rock.dead) continue;
        if (U.dist2(Pl.x, Pl.y, rock.x, rock.y) < (rock.r + r - 2) * (rock.r + r - 2)) { Pl.hurt('boss'); return; }
        this.nearMissCheck(rock, Pl.x, Pl.y, rock.r + r + 20);
      }
    }
  },

  bossEnter: function (b) {
    b.entered = true;
    Audio.sfx('boss');
    Cv.addShake(8);
    Audio.vibrate([40, 30, 40]);
    Audio.startMusic(World.zoneFor(this.floor), 2);
    UI.bossBanner(b.type);
  },

  bossDefeat: function (b) {
    b.done = true;
    this.lastBossType = b.type;
    Audio.startMusic(World.zoneFor(this.floor), 1);
    this.addCoins(CFG.BOSS_REWARD, Pl.x, Pl.y - 40, false);
    FloatText.add(Pl.x, Pl.y - 90, I18N.t('boss_defeated'), '#ff5e7a', 20);
    Particles.burst(Pl.x, Pl.y, 60, '#ff5e7a', 320, 1, 4);
    Cv.addShake(14);
    Save.data.stats.bosses++;
    Prog.questAdd('bosses', 1);
    Save.markDirty();
  },

  canFreeRevive: function () {
    return (Save.data.upgrades.revive || 0) >= 5 && !this.freeReviveUsed;
  },

  revive: function (free) {
    Pl.alive = true;
    Pl.y -= 260;
    Pl.vy = 120;
    Pl.inv = 2.5;
    this.deathDone = true;
    this.deathT = 0;
    Game.timeScale = 1;
    this.reviveUsed = true;
    if (free) this.freeReviveUsed = true;
    Save.data.stats.revives++;
    Prog.questAdd('revives', 1);
    UI.deadScr.classList.remove('on');
    Game.setState('PLAYING');
    Audio.sfx('perk');
    Particles.burst(Pl.x, Pl.y, 40, '#4dd8ff', 300, 0.9, 3);
    Save.markDirty();
  },

  die: function () {
    if (!Pl.alive) return;
    Pl.alive = false;
    this.deathT = 0.95;
    this.deathDone = false;
    Game.timeScale = 0.22;
    Cv.addShake(16);
    Audio.sfx('death');
    Audio.vibrate([70, 40, 90]);
    Particles.burst(Pl.x, Pl.y, 50, '#ff5e7a', 340, 1, 4);
    Particles.burst(Pl.x, Pl.y, 30, '#ffffff', 220, 0.7, 2);
  },

  finish: function () {
    var s = Save.data;
    s.stats.runs++;
    if (this.floor > s.bestFloor) {
      s.bestFloor = this.floor;
      SDK.lbSubmit(this.floor);
    }
    UI.hudBest(s.bestFloor);
    UI.hudCoins(s.coins);
    var fresh = Prog.checkAch();
    if (fresh.length) UI.achToast(fresh.length);
    Game.setState('DEAD');
    UI.showDead();
    Save.markDirty();
  }
};

/* ---------------- ads ----------------
   Interstitial: only in logical pauses (after a run ends), with an own
   cooldown and minimum session length. GameplayAPI.stop/start around it.
   Rewarded: only after a deliberate user click on a specific button. */
var Ads = {
  lastInter: 0,
  sessionStart: Date.now(),

  maybeInterstitial: function () {
    var self = this;
    var now = Date.now();
    if (!SDK.ready) return;
    if (now - this.lastInter < CFG.INTER_COOLDOWN) return;
    if (now - this.sessionStart < CFG.INTER_MIN_SESSION) return;
    if (!SDK.interstitialAvailable()) return;
    this.lastInter = now;
    SDK.stopGameplay();
    Audio.duck(true);
    SDK.showInterstitial(function () {
      Audio.duck(false);
      SDK.startGameplay();
      self.sessionStart = Date.now();
    });
  },

  showRewarded: function (cb) {
    var self = this;
    SDK.stopGameplay();
    Audio.duck(true);
    SDK.showRewarded(function (ok) {
      Audio.duck(false);
      if (ok) {
        cb(true);
      } else {
        SDK.startGameplay();
        cb(false);
      }
    });
  }
};

/* ---------------- game controller / main loop ---------------- */
var Game = {
  state: 'LOADING',
  camY: -140,
  timeScale: 1,
  substate: null,
  lastT: 0,
  attractT: 0,

  setStateRaw: function (s) { this.state = s; },

  setState: function (s) {
    this.state = s;
    console.log('[FALLEN] state -> ' + s);
    if (s === 'PLAYING') SDK.startGameplay();
    if (s === 'MENU' || s === 'DEAD') SDK.stopGameplay();
    if (s === 'DEAD') Ads.maybeInterstitial();
  },

  startRun: function () {
    if (this.state === 'PLAYING') return;
    Audio.resume();
    this.timeScale = 1;
    this.substate = null;
    Run.start(true);
    UI.hudReset();
    this.setState('PLAYING');
  },

  toMenu: function () {
    Audio.stopMusic();
    this.timeScale = 1;
    this.substate = null;
    UI.closePanel(true);
    this.setState('MENU');
    UI.onMenu();
  },

  pause: function (reason) {
    if (this.state !== 'PLAYING') return;
    if (this.substate === 'perk' || this.substate === 'chest') return;
    this.setStateRaw('PAUSED');
    console.log('[FALLEN] state -> PAUSED');
    SDK.stopGameplay();
    Audio.duck(true);
    UI.showPause();
  },

  resume: function () {
    if (this.state !== 'PAUSED') return;
    Audio.duck(false);
    this.lastT = performance.now();
    this.setState('PLAYING');
    UI.hidePause();
  },

  onVisibility: function () {
    if (document.hidden && this.state === 'PLAYING') this.pause('focus');
  },

  update: function (dt, time) {
    this.attractT += dt;
    if (this.state === 'MENU') {
      this.camY += 55 * dt;
      World.update(dt, time);
      this.genAhead();
      World.prune(this.camY);
    } else if (this.state === 'PLAYING') {
      // freeze world + orb while a modal (perk / chest) is open
      if (!this.substate) {
        Run.update(dt);
        this.genAhead();
        World.prune(this.camY);
      }
    } else if (this.state === 'DEAD') {
      World.update(dt, time);
    }
    Particles.update(dt);
    FloatText.update(dt);
    if (Cv.shake > 0) Cv.shake = Math.max(0, Cv.shake - 60 * dt);
  },

  genAhead: function () {
    World.camY = this.camY;
    World.genAhead();
  },

  render: function (time) {
    var ctx = Cv.ctx;
    if (!ctx) return;
    ctx.setTransform(Cv.dpr, 0, 0, Cv.dpr, 0, 0);
    ctx.clearRect(0, 0, Cv.cssW, Cv.cssH);

    var sx = 0, sy = 0;
    if (Cv.shake > 0) {
      sx = (Math.random() - 0.5) * Cv.shake;
      sy = (Math.random() - 0.5) * Cv.shake;
    }
    var viewH = Cv.cssH / Cv.s;
    var obsTime = (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'DEAD') ? Run.worldTime : this.attractT;
    var zone = ZONES[World.zoneFor(this.state === 'MENU' ? Math.max(1, Math.floor(this.camY / CFG.FLOOR_H) + 1) : Run.floor)] || ZONES[0];

    ctx.save();
    ctx.translate((Cv.ox + sx) / Cv.s, sy / Cv.s);
    ctx.scale(Cv.s, Cv.s);

    drawBG(ctx, zone, this.camY, obsTime, CFG.W, viewH);
    World.draw(ctx, this.camY, obsTime, viewH);
    if (this.state !== 'MENU') Draw.orb(ctx, Pl, this.camY, obsTime);
    Particles.draw(ctx, this.camY);
    FloatText.draw(ctx, this.camY);

    ctx.restore();
  },

  frame: function (t) {
    var self = this;
    requestAnimationFrame(function (tt) { self.frame(tt); });
    var now = performance.now();
    var dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (dt <= 0) dt = 0.016;
    if (dt > CFG.MAXDT) dt = CFG.MAXDT;
    try {
      this.update(dt * this.timeScale, now / 1000);
      this.render(now / 1000);
    } catch (err) {
      if (IS_DEV) console.error('[FALLEN] frame', err);
      this.timeScale = 1;
      this.setStateRaw('MENU');
    }
  }
};

/* focus / blur: pause + mute */
window.addEventListener('blur', function () {
  if (Game.state === 'PLAYING') Game.pause('focus');
});
document.addEventListener('visibilitychange', function () { Game.onVisibility(); });

/* ---------------- UI core ---------------- */
var UI = {
  root: null,

  init: function () {
    this.root = document.getElementById('ui');
    this.buildHud();
    this.buildMenu();
    this.buildDead();
    this.buildPause();
    this.buildPerk();
    this.buildChest();
    this.buildTutorial();
    this.buildToasts();
    UI.initPanels();
    this.refreshTexts();
    this.hudReset();
    var self = this;
    this.root.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.btn')) {
        Audio.sfx('click');
        try { self.click(); } catch (err) { if (IS_DEV) console.error('[FALLEN] click', err); }
      }
    });
  },

  click: function () { Audio.sfx('click'); },

  /* ---------------- HUD ---------------- */
  buildHud: function () {
    var s = U.el('div', 'screen on hud');
    s.id = 'hud';
    s.innerHTML =
      '<div class="hud-top">' +
      '  <div class="hud-best"><span class="hud-lbl"></span><span class="hud-val" id="hudBestEl">0</span></div>' +
      '  <div class="hud-floor"><span class="hud-lbl"></span><span class="hud-val big" id="hudFloorEl">1</span></div>' +
      '  <div class="hud-coins"><img class="ico" src="assets/icons/coin.svg" alt=""><span id="hudCoinsEl">0</span></div>' +
      '</div>' +
      '<div class="hud-combo" id="hudCombo" style="display:none"></div>' +
      '<div class="hud-perks" id="hudPerks"></div>' +
      '<button class="icon-btn hud-pause" id="hudPause"><img src="assets/icons/pause.svg" alt=""></button>';
    this.root.appendChild(s);
    this.hudBestEl = s.querySelector('#hudBestEl');
    this.hudFloorEl = s.querySelector('#hudFloorEl');
    this.hudCoinsEl = s.querySelector('#hudCoinsEl');
    this.hudComboEl = s.querySelector('#hudCombo');
    this.hudPerksEl = s.querySelector('#hudPerks');
    this.hudPauseBtn = s.querySelector('#hudPause');
    s.querySelector('.hud-best .hud-lbl').textContent = I18N.t('best');
    s.querySelector('.hud-floor .hud-lbl').textContent = I18N.t('floor');
    var self = this;
    this.hudPauseBtn.addEventListener('click', function () {
      if (Game.state === 'PLAYING') Game.pause('user');
      else if (Game.state === 'PAUSED') Game.resume();
    });
  },

  hudReset: function () {
    this.hudFloorEl.textContent = '1';
    this.hudCoinsEl.textContent = '0';
    this.hudBestEl.textContent = I18N.fmt(Save.data.bestFloor);
    this.hudComboEl.style.display = 'none';
    this.hudPerksEl.innerHTML = '';
  },

  hudFloor: function (f) { this.hudFloorEl.textContent = f; },
  hudCoins: function (c) {
    this.hudCoinsEl.textContent = I18N.fmt(c);
    if (Run.combo >= 10) {
      this.hudComboEl.textContent = I18N.t('combo') + ' ×' + Run.combo;
      this.hudComboEl.style.display = '';
    }
  },
  hudBest: function (b) { this.hudBestEl.textContent = I18N.fmt(b); },

  hudPerks: function (run) {
    if (!this.hudPerksEl) return;
    var html = '';
    for (var i = 0; i < PERKS.length; i++) {
      var p = PERKS[i];
      var t = run.timers[p.id] || 0;
      if (t > 0) {
        html += '<span class="perk-chip r-' + p.rar + '"><img src="assets/icons/' + p.icon + '.svg" alt="">' + Math.ceil(t) + 's</span>';
      }
    }
    this.hudPerksEl.innerHTML = html;
  },

  /* ---------------- menu ---------------- */
  buildMenu: function () {
    var s = U.el('div', 'screen');
    s.id = 'menuScr';
    s.innerHTML =
      '<div class="menu-wrap">' +
      '  <div class="logo-sm">FALLEN</div>' +
      '  <div class="logo-sub-sm"></div>' +
      '  <button class="btn play-btn" id="btnPlay"><img src="assets/icons/play.svg" alt=""> <span></span></button>' +
      '  <div class="menu-best" id="menuBest"></div>' +
      '  <div class="menu-grid">' +
      '    <button class="grid-btn" data-panel="upgrades"><img src="assets/icons/upgrade.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="skins"><img src="assets/icons/skin.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="chests"><img src="assets/icons/chest.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="quests"><img src="assets/icons/quest.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="achievements"><img src="assets/icons/achievement.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="daily"><img src="assets/icons/daily.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="leaderboard"><img src="assets/icons/crown.svg" alt=""><span></span></button>' +
      '    <button class="grid-btn" data-panel="settings"><img src="assets/icons/settings.svg" alt=""><span></span></button>' +
      '  </div>' +
      '  <div class="menu-offline" id="offlineBox" style="display:none"></div>' +
      '</div>';
    this.root.appendChild(s);
    this.menuScr = s;
    this.btnPlay = s.querySelector('#btnPlay span');
    this.menuBestEl = s.querySelector('#menuBest');
    this.offlineBox = s.querySelector('#offlineBox');
    var self = this;
    s.querySelector('#btnPlay').addEventListener('click', function () { Game.startRun(); });
    var grid = s.querySelectorAll('.grid-btn');
    for (var i = 0; i < grid.length; i++) {
      (function (b) {
        b.addEventListener('click', function () { UI.openPanel(b.getAttribute('data-panel')); });
      })(grid[i]);
    }
  },

  onMenu: function () {
    this.menuBestEl.textContent = I18N.t('best') + ': ' + I18N.fmt(Save.data.bestFloor);
    this.showOfflineBack();
  },

  showOfflineBack: function () {
    if (!this.offlineBox) return;
    var info = Prog.offlineInfo();
    if (!info) { this.offlineBox.style.display = 'none'; return; }
    var self = this;
    var x2ok = SDK.rewardedAvailable();
    this.offlineBox.innerHTML =
      '<div class="ob-title"></div>' +
      '<div class="ob-sub"></div>' +
      '<div class="ob-amt"></div>' +
      '<div class="ob-btns">' +
      '<button class="btn gold ob-take"></button>' +
      (x2ok ? '<button class="btn ghost ob-x2"></button>' : '') +
      '</div>';
    this.offlineBox.style.display = '';
    this.offlineBox.querySelector('.ob-title').textContent = I18N.t('welcome_back');
    this.offlineBox.querySelector('.ob-sub').textContent = I18N.t('offline_sub') + ' (' + Math.floor(info.sec / 60) + ' ' + I18N.t('m') + ')';
    var shown = info.coins;
    this.offlineBox.querySelector('.ob-amt').textContent = '+' + I18N.fmt(shown) + ' ' + I18N.t('coins');
    this.offlineBox.querySelector('.ob-take').textContent = I18N.t('claim');
    this.offlineBox.querySelector('.ob-x2') && (this.offlineBox.querySelector('.ob-x2').textContent = I18N.t('offline_x2'));
    this.offlineBox.querySelector('.ob-take').addEventListener('click', function () {
      Save.data.coins += shown;
      Save.data.stats.coinsEarned += shown;
      Save.markDirty();
      Audio.sfx('coin');
      self.offlineBox.style.display = 'none';
    });
    var x2b = this.offlineBox.querySelector('.ob-x2');
    if (x2b) x2b.addEventListener('click', function () {
      Ads.showRewarded(function (ok) {
        var amt = ok ? shown * 2 : shown;
        Save.data.coins += amt;
        Save.data.stats.coinsEarned += amt;
        Save.markDirty();
        Audio.sfx('coin');
        self.offlineBox.style.display = 'none';
      });
    });
  },

  /* ---------------- death screen ---------------- */
  buildDead: function () {
    var s = U.el('div', 'screen');
    s.id = 'deadScr';
    s.innerHTML =
      '<div class="dim-veil"></div>' +
      '<div class="dead-card">' +
      '  <div class="dead-title"></div>' +
      '  <div class="dead-new" id="deadNew" style="display:none"></div>' +
      '  <div class="dead-stats">' +
      '    <div class="dead-stat"><div class="ds-lbl" id="deadFloorLbl"></div><div class="ds-val" id="deadFloorEl">0</div></div>' +
      '    <div class="dead-stat"><div class="ds-lbl"></div><div class="ds-val gold" id="deadCoinsEl">+0</div></div>' +
      '    <div class="dead-stat"><div class="ds-lbl"></div><div class="ds-val" id="deadBestEl">0</div></div>' +
      '  </div>' +
      '  <div class="gamble-box" id="gambleBox" style="display:none">' +
      '    <div class="g-title"></div>' +
      '    <div class="g-sub"></div>' +
      '    <div class="g-btns"><button class="btn ghost" id="gTake" style="--btn-w:48%"></button><button class="btn red" id="gRisk" style="--btn-w:48%"></button></div>' +
      '  </div>' +
      '  <button class="btn revive" id="btnRevive"><img src="assets/icons/revive.svg" alt=""><span class="rv-lbl"></span><span class="rv-tag"></span></button>' +
      '  <div class="dead-row">' +
      '    <button class="btn ghost" id="btnAgain" style="--btn-w:48%"></button>' +
      '    <button class="btn ghost" id="btnMenu2" style="--btn-w:48%"></button>' +
      '  </div>' +
      '  <button class="btn link" id="deadUpg"><img src="assets/icons/upgrade.svg" alt=""> <span></span></button>' +
      '</div>';
    this.root.appendChild(s);
    this.deadScr = s;
    this.deadTitleEl = s.querySelector('.dead-title');
    this.deadNewEl = s.querySelector('#deadNew');
    this.deadFloorLblEl = s.querySelector('#deadFloorLbl');
    this.deadFloorEl = s.querySelector('#deadFloorEl');
    this.deadCoinsEl = s.querySelector('#deadCoinsEl');
    this.deadBestEl = s.querySelector('#deadBestEl');
    var lbls = s.querySelectorAll('.dead-stat .ds-lbl');
    if (lbls.length >= 3) {
      lbls[1].textContent = I18N.t('coins');
      lbls[2].textContent = I18N.t('best');
    }
    this.gambleBox = s.querySelector('#gambleBox');
    this.gTake = s.querySelector('#gTake');
    this.gRisk = s.querySelector('#gRisk');
    this.reviveBtn = s.querySelector('#btnRevive');
    this.reviveTag = this.reviveBtn.querySelector('.rv-tag');
    this.reviveLbl = this.reviveBtn.querySelector('.rv-lbl');
    this.deadAgain = s.querySelector('#btnAgain');
    this.deadMenu = s.querySelector('#btnMenu2');
    this.deadUpg = s.querySelector('#deadUpg span');

    var self = this;
    this.gTake.addEventListener('click', function () {
      if (Run.gambleDone) return;
      self.click();
      self.finishGamble(null);
    });
    this.gRisk.addEventListener('click', function () {
      if (Run.gambleDone) return;
      self.click();
      var win = Math.random() < 0.5;
      self.finishGamble(win);
    });
    this.reviveBtn.addEventListener('click', function () {
      if (Run.reviveUsed) return;
      self.click();
      if (Run.canFreeRevive()) {
        Run.revive(true);
      } else {
        var btn = self.reviveBtn;
        btn.classList.add('off');
        Ads.showRewarded(function (ok) {
          btn.classList.remove('off');
          if (ok) Run.revive(false);
        });
      }
    });
    this.deadAgain.addEventListener('click', function () { Game.startRun(); });
    this.deadMenu.addEventListener('click', function () { Game.toMenu(); });
    this.deadUpg.addEventListener('click', function () {
      self.click();
      self.deadScr.classList.remove('on');
      Game.setStateRaw('DEAD');
      UI.openPanel('upgrades', true);
    });
  },

  finishGamble: function (win) {
    if (win === null) { Run.gambleDone = true; this.gambleBox.style.display = 'none'; return; }
    Run.gambleDone = true;
    this.gambleBox.style.display = 'flex';
    if (win) {
      var bonus = Run.coins;
      Run.addCoins(bonus);
      this.gambleBox.querySelector('.g-title').textContent = I18N.t('gamble_win');
      this.gambleBox.querySelector('.g-title').style.color = '#57e389';
      Audio.sfx('gamble_win');
      this.deadCoinsEl.textContent = '+' + I18N.fmt(Run.coins);
      Cv.addShake(6);
    } else {
      var half = Math.ceil(Run.coins / 2);
      Run.coins -= half;
      Save.data.coins = Math.max(0, Save.data.coins - half);
      Save.markDirty();
      this.gambleBox.querySelector('.g-title').textContent = I18N.t('gamble_lose');
      this.gambleBox.querySelector('.g-title').style.color = '#ff5e7a';
      Audio.sfx('gamble_lose');
      this.deadCoinsEl.textContent = '+' + I18N.fmt(Run.coins);
    }
    this.gTake.style.display = 'none';
    this.gRisk.style.display = 'none';
  },

  showDead: function () {
    var self = this;
    this.deadTitleEl.textContent = I18N.t('run_complete');
    this.deadFloorLblEl.textContent = I18N.t('floor');
    this.deadNewEl.textContent = I18N.t('new_best');
    this.deadAgain.textContent = I18N.t('restart');
    this.deadMenu.textContent = I18N.t('to_menu');
    this.deadUpg.textContent = I18N.t('upg_btn');
    this.gTake.textContent = I18N.t('take');
    this.gRisk.textContent = I18N.t('risk_x2');
    this.gambleBox.querySelector('.g-title').textContent = I18N.t('gamble_title');
    this.gambleBox.querySelector('.g-title').style.color = '';
    this.gambleBox.querySelector('.g-sub').textContent = I18N.t('gamble_sub');
    this.gambleBox.style.display = 'none';
    var canGamble = Run.coins > 100 && !Run.gambleDone;
    this.gTake.style.display = canGamble ? '' : 'none';
    this.gRisk.style.display = canGamble ? '' : 'none';
    var newBest = Run.floor >= Save.data.bestFloor && Run.floor > 0;
    this.deadBestEl.textContent = I18N.fmt(Save.data.bestFloor);
    this.deadNewEl.style.display = newBest ? 'inline-block' : 'none';
    // revive availability
    if (!Run.reviveUsed && (Run.canFreeRevive() || SDK.rewardedAvailable())) {
      this.reviveBtn.style.display = '';
      this.reviveLbl.textContent = Run.canFreeRevive() ? I18N.t('revive_sub') : I18N.t('revive_ad');
      this.reviveTag.textContent = Run.canFreeRevive() ? I18N.t('revive_free') : '';
    } else {
      this.reviveBtn.style.display = 'none';
    }
    // count-up
    var f = Run.floor, c = Run.coins;
    var t0 = performance.now();
    (function count() {
      var k = U.clamp((performance.now() - t0) / 750, 0, 1);
      k = 1 - Math.pow(1 - k, 3);
      self.deadFloorEl.textContent = I18N.fmt(Math.floor(f * k));
      self.deadCoinsEl.textContent = '+' + I18N.fmt(Math.floor(c * k));
      if (k < 1) requestAnimationFrame(count);
    })();
    this.deadScr.classList.add('on');
  },

  /* ---------------- pause ---------------- */
  buildPause: function () {
    var s = U.el('div', 'screen');
    s.id = 'pauseScr';
    s.innerHTML =
      '<div class="dim-veil"></div>' +
      '<div class="pause-card">' +
      '  <div class="pause-title"></div>' +
      '  <div class="pause-sounds">' +
      '    <button class="icon-btn" id="psMusic" title="music"><img src="assets/icons/music.svg" alt=""></button>' +
      '    <button class="icon-btn" id="psSfx" title="sfx"><img src="assets/icons/sound.svg" alt=""></button>' +
      '  </div>' +
      '  <button class="btn" id="btnResume"></button>' +
      '  <div class="pause-row">' +
      '    <button class="btn ghost" id="btnRestart" style="--btn-w:48%"></button>' +
      '    <button class="btn ghost" id="btnMenu1" style="--btn-w:48%"></button>' +
      '  </div>' +
      '</div>';
    this.root.appendChild(s);
    this.pauseScr = s;
    var self = this;
    s.querySelector('.pause-title').textContent = I18N.t('pause_game');
    s.querySelector('#btnResume').textContent = I18N.t('resume');
    s.querySelector('#btnRestart').textContent = I18N.t('restart');
    s.querySelector('#btnMenu1').textContent = I18N.t('to_menu');
    s.querySelector('#btnResume').addEventListener('click', function () { Game.resume(); });
    s.querySelector('#btnRestart').addEventListener('click', function () { Game.startRun(); });
    s.querySelector('#btnMenu1').addEventListener('click', function () { Game.toMenu(); });
    s.querySelector('#psMusic').addEventListener('click', function () {
      var v = Save.data.settings.music ? 0 : 1;
      Save.data.settings.music = v;
      Audio.setMusic(!!v);
      Save.markDirty();
      self.syncSoundIcons();
    });
    s.querySelector('#psSfx').addEventListener('click', function () {
      var v = Save.data.settings.sfx ? 0 : 1;
      Save.data.settings.sfx = v;
      Audio.setSfx(!!v);
      Save.markDirty();
      self.syncSoundIcons();
    });
    this.psMusic = s.querySelector('#psMusic');
    this.psSfx = s.querySelector('#psSfx');
  },

  syncSoundIcons: function () {
    this.psMusic.classList.toggle('off', !Save.data.settings.music);
    this.psSfx.classList.toggle('off', !Save.data.settings.sfx);
  },

  showPause: function () {
    this.syncSoundIcons();
    this.pauseScr.classList.add('on');
  },
  hidePause: function () { this.pauseScr.classList.remove('on'); },

  /* ---------------- perk overlay ---------------- */
  buildPerk: function () {
    var s = U.el('div', 'screen');
    s.id = 'perkScr';
    s.innerHTML =
      '<div class="dim-veil"></div>' +
      '<div class="perk-card">' +
      '  <div class="perk-title"></div>' +
      '  <div class="perk-row"></div>' +
      '</div>';
    this.root.appendChild(s);
    this.perkScr = s;
    this.perkTitle = s.querySelector('.perk-title');
    this.perkRow = s.querySelector('.perk-row');
  },

  showPerks: function () {
    if (Game.substate === 'perk') return;
    Game.substate = 'perk';
    this.perkTitle.textContent = I18N.t('choose_perk');
    this.perkRow.innerHTML = '';
    var opts = Run.rollPerks(3);
    var self = this;
    opts.forEach(function (p) {
      var c = U.el('div', 'perk-opt r-' + p.rarity);
      c.innerHTML = '<img src="assets/icons/' + p.icon + '.svg" alt=""><div class="p-name"></div><div class="p-desc"></div>';
      c.querySelector('.p-name').textContent = p.rar.toUpperCase();
      c.querySelector('.p-desc').textContent = I18N.t('p_' + p.id);
      c.addEventListener('click', function () {
        Run.choosePerk(p);
        Game.substate = null;
        self.perkScr.classList.remove('on');
        Game.lastT = performance.now();
      });
      self.perkRow.appendChild(c);
    });
    this.perkScr.classList.add('on');
  },

  /* ---------------- chest overlay ---------------- */
  buildChest: function () {
    var s = U.el('div', 'screen');
    s.id = 'chestScr';
    s.innerHTML =
      '<div class="dim-veil"></div>' +
      '<div class="chest-card">' +
      '  <div class="chest-art" id="chestArt"></div>' +
      '  <div class="chest-reward" id="chestReward" style="display:none"></div>' +
      '  <button class="btn gold" id="btnChestClose" style="display:none"></button>' +
      '</div>';
    this.root.appendChild(s);
    this.chestScr = s;
    this.chestArt = s.querySelector('#chestArt');
    this.chestReward = s.querySelector('#chestReward');
    this.btnChestClose = s.querySelector('#btnChestClose');
    var self = this;
    this.btnChestClose.addEventListener('click', function () {
      Game.substate = null;
      Run.chestBusy = false;
      self.chestScr.classList.remove('on', 'open');
      Game.lastT = performance.now();
    });
  },

  showChest: function (rar, run) {
    if (Game.substate === 'chest') return;
    Game.substate = 'chest';
    Run.chestBusy = true;
    var colors = { wood: '#c8935a', rare: '#4dd8ff', epic: '#b06bff', legendary: '#ffd75e' };
    this.chestArt.innerHTML = '<div class="chest-ico" style="--c:' + colors[rar] + '"><img src="assets/icons/chest.svg" alt=""></div>';
    this.chestReward.style.display = 'none';
    this.btnChestClose.style.display = 'none';
    this.chestScr.classList.add('on');
    var self = this;
    setTimeout(function () {
      self.chestScr.classList.add('open');
      var r = rarById(rar);
      var roll = Math.random();
      var html = '<div class="cr-rar" style="--c:' + colors[rar] + '">' + rar.toUpperCase() + '</div><div class="cr-items"></div>';
      var items = [];
      var luck = Save.data.upgrades.luck || 0;
      if (roll < 0.12 && Math.random() < r.skin) {
        // random unowned skin
        var unowned = [];
        for (var i = 0; i < SKINS.length; i++) {
          if (Save.data.skinsOwned.indexOf(SKINS[i].id) < 0) unowned.push(SKINS[i]);
        }
        if (unowned.length) {
          var sk = unowned[Math.floor(Math.random() * unowned.length)];
          Save.data.skinsOwned.push(sk.id);
          items.push('<div class="cr-item"><span class="cr-name" style="color:' + sk.glow + '">' + sk.id.toUpperCase() + '</span></div>');
          if (IS_DEV) console.log('[FALLEN] skin from chest:', sk.id);
        }
      } else {
        var coins = Math.round(r.coins[0] + Math.random() * (r.coins[1] - r.coins[0]));
        coins = Math.round(coins * (1 + luck * 0.02));
        Save.data.coins += coins;
        Save.data.stats.coinsEarned += coins;
        items.push('<div class="cr-item coin"><img src="assets/icons/coin.svg" alt=""> +' + I18N.fmt(coins) + '</div>');
      }
      if (Math.random() < r.frag) {
        var n = Array.isArray(r.fragN) ? r.fragN[0] + Math.floor(Math.random() * (r.fragN[1] - r.fragN[0] + 1)) : r.fragN;
        Save.data.fragments += n;
        items.push('<div class="cr-item frag"><img src="assets/icons/star.svg" alt=""> +' + n + ' ' + I18N.t('frag') + '</div>');
      }
      if (Math.random() < 0.2) {
        var pk = PERKS[Math.floor(Math.random() * 4)];
        items.push('<div class="cr-item perk"><img src="assets/icons/' + pk.icon + '.svg" alt=""> ' + I18N.t('p_' + pk.id) + '</div>');
        Run.timers[pk.id] = Math.max(Run.timers[pk.id] || 0, pk.dur || 0);
        if (pk.id === 'shield2') Pl.shield++;
      }
      self.chestReward.innerHTML = html;
      self.chestReward.querySelector('.cr-items').innerHTML = items.join('');
      self.chestReward.style.display = '';
      self.btnChestClose.style.display = '';
      self.btnChestClose.textContent = I18N.t('close');
      Audio.sfx('chest');
      Cv.addShake(6);
      Save.markDirty();
      UI.hudCoins(Save.data.coins);
    }, 900);
  },

  /* ---------------- tutorial ---------------- */
  buildTutorial: function () {
    var s = U.el('div', 'screen');
    s.id = 'tutScr';
    s.innerHTML = '<div class="tut-box" id="tutBox"><div class="tut-txt"></div><div class="tut-arrow"></div></div>';
    this.root.appendChild(s);
    this.tutScr = s;
    this.tutBox = s.querySelector('#tutBox');
    this.tutTxt = s.querySelector('.tut-txt');
    this.tutStep = 0;
  },

  tutorialStart: function () {
    this.tutStep = 0;
    this.tutorialTick(1);
  },

  tutorialTick: function (f) {
    if (!Run.isTutorial) return;
    var steps = [1, 2, 3];
    if (f === steps[this.tutStep] && this.tutStep < 3) {
      this.tutTxt.textContent = I18N.t('tut_' + (this.tutStep + 1));
      this.tutScr.classList.add('on');
      var self = this;
      setTimeout(function () {
        self.tutScr.classList.remove('on');
        self.tutStep++;
        if (self.tutStep >= 3) {
          Save.data.tutorialDone = 1;
          Run.isTutorial = false;
          Save.markDirty();
        }
      }, 2600);
    }
  },

  /* ---------------- banners & toasts ---------------- */
  buildToasts: function () {
    var s = U.el('div', 'toasts');
    s.id = 'toasts';
    this.root.appendChild(s);
    this.toastsEl = s;
    var b = U.el('div', 'banner');
    b.id = 'banner';
    this.root.appendChild(b);
    this.bannerEl = b;
  },

  zoneBanner: function (z) {
    var zone = ZONES[z];
    this.bannerEl.innerHTML = '<div class="b-zone"></div><div class="b-name" style="color:' + zone.acc + '"></div>';
    this.bannerEl.querySelector('.b-zone').textContent = I18N.t('zone_' + zone.id);
    this.bannerEl.querySelector('.b-name').textContent = zone.id.toUpperCase();
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
  },

  bossBanner: function (type) {
    var self = this;
    this.bannerEl.innerHTML = '<div class="b-zone" style="color:#ff5e7a"></div><div class="b-name" style="color:#ff5e7a"></div>';
    this.bannerEl.querySelector('.b-zone').textContent = I18N.t('boss_title');
    this.bannerEl.querySelector('.b-name').textContent = I18N.t('boss_' + type);
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    setTimeout(function () { self.bannerEl.classList.remove('show'); }, 2600);
  },

  achToast: function (n) {
    var t = U.el('div', 'toast');
    t.innerHTML = '<img src="assets/icons/achievement.svg" alt=""> <span></span>';
    t.querySelector('span').textContent = I18N.t('ach_title') + (n > 1 ? ' ×' + n : '');
    this.toastsEl.appendChild(t);
    var self = this;
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 500); }, 3200);
  },

  /* ---------------- loading ---------------- */
  setLoad: function (pct) {
    try {
      var f = document.getElementById('loadFill');
      var p = document.getElementById('loadPct');
      if (f) f.style.width = pct + '%';
      if (p) p.textContent = Math.round(pct) + '%';
    } catch (e) {}
  },

  hideLoading: function () {
    try {
      var l = document.getElementById('loading');
      if (l) l.classList.remove('on');
    } catch (e) {}
  },

  iconsReady: function () { this.setLoad(100); },

  refreshTexts: function () {
    // re-apply all translatable static labels
    var m = this.menuScr;
    if (!m) return;
    m.querySelector('.logo-sub-sm').textContent = I18N.t('app_sub');
    this.btnPlay.textContent = I18N.t('play');
    var labels = { upgrades: 'upg_title', skins: 'skins_title', chests: 'chests_title', quests: 'quests_title', achievements: 'ach_title', daily: 'daily_title', leaderboard: 'lb_title', settings: 'settings' };
    var grid = m.querySelectorAll('.grid-btn');
    for (var i = 0; i < grid.length; i++) {
      var p = grid[i].getAttribute('data-panel');
      grid[i].querySelector('span').textContent = I18N.t(labels[p] || p);
    }
    if (this.deadScr) {
      this.deadAgain.textContent = I18N.t('restart');
      this.deadMenu.textContent = I18N.t('to_menu');
      this.deadUpg.textContent = I18N.t('upg_btn');
    }
    if (this.pauseScr) {
      this.pauseScr.querySelector('.pause-title').textContent = I18N.t('pause_game');
      this.pauseScr.querySelector('#btnResume').textContent = I18N.t('resume');
      this.pauseScr.querySelector('#btnRestart').textContent = I18N.t('restart');
      this.pauseScr.querySelector('#btnMenu1').textContent = I18N.t('to_menu');
    }
    var lb = document.getElementById('lbPanel');
    if (lb) UI.renderPanel('leaderboard');
  }
};

/* ---------------- generic panel + all screens ---------------- */
UI.initPanels = function () {
  var self = this;
  var back = U.el('div', 'panel-backdrop');
  back.id = 'panelBack';
  this.root.appendChild(back);
  this.panelBack = back;
  var card = U.el('div', 'panel');
  card.innerHTML =
    '<div class="p-head">' +
    '  <button class="icon-btn p-close"><img src="assets/icons/home.svg" alt=""></button>' +
    '  <div class="p-title"></div>' +
    '  <div class="p-coins"><img src="assets/icons/coin.svg" alt=""> <span></span></div>' +
    '</div>' +
    '<div class="p-body"></div>';
  back.appendChild(card);
  this.panelEl = card;
  this.panelTitleEl = card.querySelector('.p-title');
  this.panelCoinsEl = card.querySelector('.p-coins span');
  this.panelBodyEl = card.querySelector('.p-body');
  card.querySelector('.p-close').addEventListener('click', function () { UI.closePanel(false); });
  back.addEventListener('click', function (e) { if (e.target === back) UI.closePanel(false); });
  this._panelOpen = null;
  this._fromDead = false;
};

UI.openPanel = function (name, fromDead) {
  this._fromDead = !!fromDead || Game.state === 'DEAD';
  this._panelOpen = name;
  this.panelTitleEl.textContent = this.panelName(name);
  this.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
  this.renderPanel(name);
  this.panelBack.classList.add('on');
  this.panelBodyEl.scrollTop = 0;
  Audio.sfx('open');
};

UI.closePanel = function (toMenu) {
  if (this._panelOpen) {
    this.panelBack.classList.remove('on');
    this._panelOpen = null;
    if (this._fromDead && !toMenu) {
      // restore the death screen
      this.deadScr.classList.add('on');
    }
    this._fromDead = false;
  }
  if (toMenu) return; // caller (Game.toMenu) handles the transition
  Audio.sfx('back');
};

UI.panelName = function (name) {
  var map = { upgrades: 'upg_title', skins: 'skins_title', chests: 'chests_title', quests: 'quests_title', achievements: 'ach_title', daily: 'daily_title', leaderboard: 'lb_title', settings: 'settings' };
  return I18N.t(map[name] || 'close');
};

UI.renderPanel = function (name) {
  var b = this.panelBodyEl;
  b.innerHTML = '';
  switch (name) {
    case 'upgrades': this._pUpgrades(b); break;
    case 'skins': this._pSkins(b); break;
    case 'chests': this._pChests(b); break;
    case 'quests': this._pQuests(b); break;
    case 'achievements': this._pAch(b); break;
    case 'daily': this._pDaily(b); break;
    case 'settings': this._pSettings(b); break;
    case 'leaderboard': this._pLeaderboard(b); break;
    case 'stats': this._pStats(b); break;
  }
  this.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
};

UI._pUpgrades = function (b) {
  var self = this;
  for (var i = 0; i < UPGRADES.length; i++) {
    var u = UPGRADES[i];
    var lvl = Save.data.upgrades[u.id] || 0;
    var maxed = lvl >= UPG_MAX;
    var cost = maxed ? 0 : upCost(u.id, lvl);
    var afford = !maxed && Save.data.coins >= cost;
    var row = U.el('div', 'up-row');
    row.innerHTML =
      '<div class="up-ico"><img src="assets/icons/' + u.icon + '.svg" alt=""></div>' +
      '<div class="up-info"><div class="up-name"></div><div class="up-desc"></div>' +
      '<div class="up-bar"><div class="up-fill" style="width:' + (lvl / UPG_MAX * 100) + '%"></div></div></div>' +
      '<button class="btn up-buy' + (maxed ? ' maxed' : '') + '"></button>';
    row.querySelector('.up-name').textContent = I18N.t(u.name);
    row.querySelector('.up-desc').textContent = I18N.t(u.name + '_d') + ' · ' + I18N.t('level') + ' ' + lvl + '/' + UPG_MAX;
    var btn = row.querySelector('.up-buy');
    btn.innerHTML = maxed ? I18N.t('max') : '<img src="assets/icons/coin.svg" alt=""> ' + I18N.fmt(cost);
    btn.disabled = maxed || !afford;
    btn.addEventListener('click', function () {
      if (Prog.buyUpgrade(u.id)) {
        Audio.sfx('upgrade');
        self.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
        self._pUpgrades(self.panelBodyEl);
      }
    });
    b.appendChild(row);
  }
};

UI._pSkins = function (b) {
  var self = this;
  var grid = U.el('div', 'skin-grid');
  for (var i = 0; i < SKINS.length; i++) {
    (function (sk) {
      var owned = Save.data.skinsOwned.indexOf(sk.id) >= 0;
      var equipped = Save.data.skin === sk.id;
      var cell = U.el('div', 'skin-cell' + (equipped ? ' equipped' : ''));
      cell.innerHTML =
        '<div class="skin-orb" style="--c1:' + sk.core + ';--c2:' + sk.mid + ';--c3:' + sk.glow + ';--c4:' + sk.trail + '"></div>' +
        '<div class="skin-name"></div>' +
        '<button class="btn skin-btn' + (owned ? '' : (Save.data.coins >= sk.cost ? '' : ' poor')) + '"></button>';
      cell.querySelector('.skin-name').textContent = sk.id.toUpperCase();
      var btn = cell.querySelector('.skin-btn');
      if (equipped) { btn.textContent = I18N.t('equipped'); btn.disabled = true; }
      else if (owned) { btn.textContent = I18N.t('equip'); }
      else { btn.innerHTML = '<img src="assets/icons/coin.svg" alt=""> ' + I18N.fmt(sk.cost); btn.disabled = Save.data.coins < sk.cost; }
      btn.addEventListener('click', function () {
        if (owned) {
          Save.data.skin = sk.id;
          Save.markDirty();
          Audio.sfx('upgrade');
        } else if (Prog._buySkin(sk)) {
          Save.data.skin = sk.id;
          Audio.sfx('upgrade');
        }
        self._pSkins(self.panelBodyEl);
      });
      grid.appendChild(cell);
    })(SKINS[i]);
  }
  b.appendChild(grid);
};
Prog._buySkin = function (sk) {
  if (Save.data.coins < sk.cost) return false;
  Save.data.coins -= sk.cost;
  Save.data.skinsOwned.push(sk.id);
  Save.markDirty();
  return true;
};

UI._pChests = function (b) {
  var sub = U.el('div', 'p-sub');
  sub.textContent = I18N.t('chests_sub');
  b.appendChild(sub);
  var colors = { wood: '#c8935a', rare: '#4dd8ff', epic: '#b06bff', legendary: '#ffd75e' };
  for (var i = 0; i < CHEST_RARS.length; i++) {
    var r = CHEST_RARS[i];
    var row = U.el('div', 'ch-row');
    row.innerHTML =
      '<div class="ch-ico" style="--c:' + colors[r.id] + '"><img src="assets/icons/chest.svg" alt=""></div>' +
      '<div class="ch-info"><div class="ch-name" style="color:' + colors[r.id] + '"></div><div class="ch-count"></div></div>';
    row.querySelector('.ch-name').textContent = r.id.toUpperCase();
    row.querySelector('.ch-count').textContent = I18N.t('chests_opened') + ': ' + (Save.data.chestsOpened[r.id] || 0);
    b.appendChild(row);
  }
  var frag = U.el('div', 'frag-row');
  frag.innerHTML = '<img src="assets/icons/star.svg" alt=""> <span class="fr-lbl"></span> <b id="fragCount">' + Save.data.fragments + '</b> <span class="fr-val"></span>';
  frag.querySelector('.fr-lbl').textContent = I18N.t('frag') + ':';
  frag.querySelector('.fr-val').textContent = '1 × ' + CFG.FRAG_VALUE + ' ' + I18N.t('coins');
  b.appendChild(frag);
  var sell = U.el('button', 'btn ghost');
  sell.textContent = I18N.t('claim');
  sell.disabled = Save.data.fragments < 1;
  sell.addEventListener('click', function () {
    if (Save.data.fragments > 0) {
      Save.data.coins += Save.data.fragments * CFG.FRAG_VALUE;
      Save.data.fragments = 0;
      Save.markDirty();
      Audio.sfx('coin');
      UI.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
      UI._pChests(UI.panelBodyEl);
    }
  });
  b.appendChild(sell);
  if (SDK.rewardedAvailable()) {
    var free = U.el('button', 'btn gold');
    free.innerHTML = '<img src="assets/icons/chest.svg" alt=""> ' + I18N.t('free_chest');
    free.addEventListener('click', function () {
      Ads.showRewarded(function (ok) {
        if (ok) Run.openChest(Math.random() < 0.25 ? 'rare' : 'wood', Pl.x, Pl.y);
      });
    });
    b.appendChild(free);
  }
};

UI._pQuests = function (b) {
  var sub = U.el('div', 'p-sub');
  sub.textContent = I18N.t('quest_sub');
  b.appendChild(sub);
  var list = Prog.dailyList();
  for (var i = 0; i < list.length; i++) {
    (function (q, i) {
      var done = q.progress >= q.target;
      var row = U.el('div', 'q-row' + (q.claimed ? ' claimed' : ''));
      row.innerHTML =
        '<div class="q-ico"><img src="assets/icons/' + q.icon + '.svg" alt=""></div>' +
        '<div class="q-info"><div class="q-name"></div>' +
        '<div class="q-bar"><div class="q-fill" style="width:' + Math.min(100, q.progress / q.target * 100) + '%"></div></div></div>' +
        '<button class="btn q-claim"></button>';
      row.querySelector('.q-name').textContent = I18N.t(q.key) + ' · ' + q.progress + '/' + q.target;
      var btn = row.querySelector('.q-claim');
      if (q.claimed) { btn.textContent = I18N.t('claimed'); btn.disabled = true; }
      else if (done) { btn.innerHTML = '<img src="assets/icons/coin.svg" alt=""> ' + I18N.fmt(q.reward); }
      else { btn.textContent = '—'; btn.disabled = true; }
      btn.addEventListener('click', function () {
        if (Prog.claimQuest(i)) {
          UI.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
          UI._pQuests(UI.panelBodyEl);
        }
      });
      b.appendChild(row);
    })(list[i], i);
  }
  var st = U.el('button', 'btn ghost st-link');
  st.textContent = I18N.t('stats');
  st.addEventListener('click', function () { UI.openPanel('stats'); });
  b.appendChild(st);
};

UI._pAch = function (b) {
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    (function (a) {
      var unlocked = !!Save.data.ach.unlocked[a.id];
      var claimed = !!Save.data.ach.claimed[a.id];
      var row = U.el('div', 'a-row' + (unlocked ? (claimed ? '' : ' new') : ' locked'));
      row.innerHTML =
        '<div class="a-ico"><img src="assets/icons/' + a.icon + '.svg" alt=""></div>' +
        '<div class="a-name"></div>' +
        '<div class="a-right">' + (unlocked && !claimed ? '<button class="btn a-claim"></button>' : '<span class="a-mark"></span>') + '</div>';
      row.querySelector('.a-name').textContent = I18N.t(a.key);
      var mark = row.querySelector('.a-mark');
      if (mark) mark.textContent = claimed ? '✓' : (unlocked ? '' : '·');
      var btn = row.querySelector('.a-claim');
      if (btn) {
        btn.innerHTML = '<img src="assets/icons/coin.svg" alt=""> ' + I18N.fmt(a.reward);
        btn.addEventListener('click', function () {
          if (Prog.claimAch(a.id)) {
            UI.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
            UI._pAch(UI.panelBodyEl);
          }
        });
      }
      b.appendChild(row);
    })(ACHIEVEMENTS[i]);
  }
};

UI._pDaily = function (b) {
  var sub = U.el('div', 'p-sub');
  sub.textContent = I18N.t('daily_sub');
  b.appendChild(sub);
  var streak = Prog.dailyStreak();
  var claimed = Prog.dailyClaimedToday();
  var grid = U.el('div', 'daily-grid');
  for (var i = 0; i < 7; i++) {
    var day = U.el('div', 'daily-cell' + (i + 1 < streak.streak || claimed ? ' past' : (i + 1 === streak.streak ? ' now' : '')));
    day.innerHTML = '<div class="d-num"></div><div class="d-rew"></div>';
    day.querySelector('.d-num').textContent = I18N.t('day') + ' ' + (i + 1);
    day.querySelector('.d-rew').innerHTML = '<img src="assets/icons/coin.svg" alt=""> ' + I18N.fmt(DAILY_REWARDS[i]);
    grid.appendChild(day);
  }
  b.appendChild(grid);
  var info = U.el('div', 'd-info');
  info.textContent = I18N.t('streak') + ': ' + streak.streak + ' / 7';
  b.appendChild(info);
  var btn = U.el('button', 'btn gold');
  if (claimed) { btn.textContent = I18N.t('claimed'); btn.disabled = true; }
  else {
    btn.innerHTML = '<img src="assets/icons/coin.svg" alt=""> ' + I18N.t('claim') + ' ' + I18N.fmt(streak.reward);
    btn.addEventListener('click', function () {
      if (Prog.dailyClaim()) {
        Audio.sfx('coin');
        UI.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
        UI._pDaily(UI.panelBodyEl);
      }
    });
    if (SDK.rewardedAvailable()) {
      var x2 = U.el('button', 'btn ghost');
      x2.textContent = I18N.t('daily_x2');
      x2.addEventListener('click', function () {
        Ads.showRewarded(function (ok) {
          var base = streak.reward;
          if (!Prog.dailyClaim()) return;
          if (ok) {
            Save.data.coins += base;
            Save.data.stats.coinsEarned += base;
            Save.markDirty();
          }
          Audio.sfx('coin');
          UI.panelCoinsEl.textContent = I18N.fmt(Save.data.coins);
          UI._pDaily(UI.panelBodyEl);
        });
      });
      b.appendChild(x2);
    }
  }
  b.appendChild(btn);
};

UI._pSettings = function (b) {
  var s = Save.data.settings;
  function row(labelKey, extra) {
    var r = U.el('div', 'set-row');
    r.innerHTML = '<span class="set-lbl"></span><span class="set-extra"></span>';
    r.querySelector('.set-lbl').textContent = I18N.t(labelKey);
    r.querySelector('.set-extra').innerHTML = extra;
    b.appendChild(r);
    return r;
  }
  var lr = row('language',
    '<div class="seg"><button class="seg-btn' + (I18N.lang === 'ru' ? ' on' : '') + '" data-l="ru">RU</button><button class="seg-btn' + (I18N.lang === 'en' ? ' on' : '') + '" data-l="en">EN</button></div>');
  var lbtns = lr.querySelectorAll('.seg-btn');
  for (var li = 0; li < lbtns.length; li++) {
    (function (btn) {
      btn.addEventListener('click', function () { I18N.set(btn.getAttribute('data-l')); UI.renderPanel('settings'); });
    })(lbtns[li]);
  }
  var qr = row('quality',
    '<div class="seg"><button class="seg-btn' + (s.quality === 'high' ? ' on' : '') + '" data-q="high">HIGH</button><button class="seg-btn' + (s.quality === 'medium' ? ' on' : '') + '" data-q="medium">MED</button><button class="seg-btn' + (s.quality === 'low' ? ' on' : '') + '" data-q="low">LOW</button></div>');
  var qbtns = qr.querySelectorAll('.seg-btn');
  for (var qi = 0; qi < qbtns.length; qi++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        s.quality = btn.getAttribute('data-q');
        Cv.setQuality(s.quality);
        Save.markDirty();
        UI.renderPanel('settings');
      });
    })(qbtns[qi]);
  }
  function toggleRow(labelKey, key) {
    var r = row(labelKey, '<div class="switch' + (s[key] ? ' on' : '') + '"></div>');
    r.querySelector('.switch').addEventListener('click', function () {
      s[key] = s[key] ? 0 : 1;
      Save.markDirty();
      if (key === 'music') Audio.setMusic(!!s.music);
      if (key === 'sfx') Audio.setSfx(!!s.sfx);
      document.body.classList.toggle('no-flash', !s.flash);
      UI.renderPanel('settings');
    });
  }
  toggleRow('music', 'music');
  toggleRow('sound', 'sfx');
  toggleRow('reduce_flash', 'flash');
  var yid = U.el('div', 'set-note');
  yid.textContent = I18N.t('yandex_id_sub');
  b.appendChild(yid);
  if (SDK.ready) {
    var sync = U.el('button', 'btn ghost');
    sync.textContent = I18N.t('sync');
    sync.addEventListener('click', function () {
      Save.save();
      sync.textContent = I18N.t('synced');
      setTimeout(function () { sync.textContent = I18N.t('sync'); }, 1500);
    });
    b.appendChild(sync);
  }
  var rst = U.el('button', 'btn red');
  rst.textContent = I18N.t('reset_data');
  rst.addEventListener('click', function () {
    if (window.confirm(I18N.t('reset_q'))) {
      Save.resetAll();
      location.reload();
    }
  });
  b.appendChild(rst);
};

UI._pLeaderboard = function (b) {
  var self = this;
  if (!SDK.lbAvailable()) {
    var d = U.el('div', 'lb-empty');
    d.textContent = I18N.t('lb_unavail');
    b.appendChild(d);
    return;
  }
  var d2 = U.el('div', 'lb-list');
  d2.innerHTML = '<div class="lb-row"><span class="lb-rank">…</span></div>';
  b.appendChild(d2);
  SDK.lbTop(function (vals) {
    if (!self._panelOpen) return;
    var html = '';
    if (!vals || !vals.length) {
      html = '<div class="lb-empty">' + I18N.t('lb_unavail') + '</div>';
    } else {
      for (var i = 0; i < vals.length; i++) {
        html += '<div class="lb-row"><span class="lb-rank">' + (i + 1) + '</span><span class="lb-name"></span><span class="lb-val">' + I18N.fmt(vals[i].value) + '</span></div>';
      }
    }
    d2.innerHTML = html;
    if (vals && vals.length) {
      var names = d2.querySelectorAll('.lb-name');
      for (var j = 0; j < names.length; j++) {
        names[j].textContent = (vals[j].id && vals[j].id.name) ? vals[j].id.name : 'Player ' + (j + 1);
      }
    }
  });
};

UI._pStats = function (b) {
  var s = Save.data.stats;
  var rows = [
    ['runs', s.runs],
    ['best_floor', I18N.fmt(Save.data.bestFloor)],
    ['total_coins', I18N.fmt(s.coinsEarned)],
    ['chests_opened', s.chests],
    ['safe_wins', s.safeWins],
    ['risks_won', s.risksWon],
    ['revives_used', s.revives],
    ['bosses_beaten', s.bosses],
    ['max_combo', '×' + s.maxCombo]
  ];
  var pt = s.playTime;
  var ph = Math.floor(pt / 3600), pm = Math.floor(pt % 3600 / 60), ps = Math.floor(pt % 60);
  rows.push(['play_time', (ph ? ph + I18N.t('h') + ' ' : '') + (pm ? pm + I18N.t('m') + ' ' : '') + ps + I18N.t('sec')]);
  for (var i = 0; i < rows.length; i++) {
    var r = U.el('div', 'st-row');
    r.innerHTML = '<span class="st-lbl"></span><span class="st-val"></span>';
    r.querySelector('.st-lbl').textContent = I18N.t(rows[i][0]);
    r.querySelector('.st-val').textContent = rows[i][1];
    b.appendChild(r);
  }
  var back = U.el('button', 'btn ghost');
  back.textContent = I18N.t('back');
  back.addEventListener('click', function () { UI.openPanel('quests'); });
  b.appendChild(back);
};

/* ---------------- boot ---------------- */
var ICONS = ['coin', 'magnet', 'shield', 'luck', 'speed', 'chest', 'upgrade', 'skin', 'settings', 'sound', 'music', 'pause', 'play', 'home', 'achievement', 'quest', 'daily', 'revive', 'risk', 'safe', 'crown', 'star'];

function boot() {
  try {
    Save.load();
    I18N.init();
    Cv.init(document.getElementById('game'));
    Cv.setQuality(Save.data.settings.quality || 'high');
    Cv.resize();
    Audio.init();
    Audio.setMusic(!!Save.data.settings.music);
    Audio.setSfx(!!Save.data.settings.sfx);
    document.body.classList.toggle('no-flash', !Save.data.settings.flash);
    SDK.init();
    Input.init();
    UI.init();
    World.reset((Date.now() % 2147483647) >>> 0);
    World.genAhead();
    Game.camY = -140;
    World.camY = Game.camY;
    Game.setState('MENU');
    UI.onMenu();

    // preload icons (non-blocking, drives the loading bar)
    var loaded = 0, total = ICONS.length;
    ICONS.forEach(function (n) {
      var img = new Image();
      img.onload = img.onerror = function () { if (++loaded === total) UI.iconsReady(); };
      img.src = 'assets/icons/' + n + '.svg';
    });
    UI.setLoad(18);
    setTimeout(function () {
      UI.setLoad(70);
      SDK.loadCloud(function (c) {
        if (c) Save.mergeCloud(c);
        UI.setLoad(100);
        setTimeout(function () {
          UI.hideLoading();
          SDK.readyNow();
        }, 350);
      });
    }, 450);

    Game.lastT = performance.now();
    requestAnimationFrame(function (t) { Game.frame(t); });
  } catch (err) {
    if (IS_DEV) console.error('[FALLEN] boot', err);
    showFatal();
  }
}

/* developer access (hidden from players) */
window.FALLEN_DEBUG = {
  get state() { return Game.state; },
  get floor() { return Run.floor; },
  get runTime() { return Run.time; },
  get save() { return Save.data; },
  sdkReady: function () { return SDK.ready; },
  startRun: function () { Game.startRun(); },
  kill: function () { if (Pl.alive) Pl.hurt('saw'); },
  pause: function () { Game.pause('user'); },
  resume: function () { Game.resume(); },
  giveCoins: function (n) { Save.data.coins += n; Save.markDirty(); },
  buy: function (id) { return Prog.buyUpgrade(id); },
  toMenu: function () { Game.toMenu(); },
  key: function (dir, down) { Input.keys[dir] = !!down; },
  sub: function () { return Game.substate; },
  endPerk: function () { Game.substate = null; UI.perkScr.classList.remove('on'); Game.lastT = performance.now(); },
  closeChest: function () { UI.chestScr.classList.remove('on', 'open'); Game.substate = null; Game.lastT = performance.now(); },
  openPanel: function (n) { UI.openPanel(n); },
  get px() { return Pl.x; },
  get py() { return Pl.y; },
  get alive() { return Pl.alive; },
  cor: function () { var c = World.chunks[Math.floor(Pl.y / CFG.FLOOR_H)]; return c ? c.corX : CFG.W / 2; },
  nudge: function (vx) { Pl.vx = vx; },
  setVy: function (v) { Pl.vy = v; },
  bossChunk: function () {
    var ci = Math.floor(Pl.y / CFG.FLOOR_H);
    for (var o = 0; o < 3; o++) {
      var c = World.chunks[ci - o];
      if (c && c.boss) return c;
    }
    return null;
  },
  boss: function () { var c = this.bossChunk(); return c && c.boss ? { entered: c.boss.entered, done: c.boss.done } : null; },
  bossInfo: function () {
    var c = this.bossChunk();
    if (!c || !c.boss) return null;
    var b = c.boss, gap = null;
    if (b.type === 'crusher') {
      for (var p = 0; p < 3; p++) {
        var rowY = b.y0 + 120 + p * 190;
        if (Pl.y > rowY - 60) {
          var ph = (b.t * 0.45 + p * 0.5) % 1;
          var spanL = 150 + Math.sin(ph * Math.PI * 2) * 130;
          gap = spanL + 50;
          break;
        }
      }
    }
    return { type: b.type, entered: b.entered, done: b.done, t: b.t, gap: gap };
  },
  bossGeom: function () {
    var c = this.bossChunk();
    if (!c || !c.boss) return null;
    var b = c.boss, cx = CFG.W / 2, cy = (b.y0 + b.y1) / 2;
    var rev = Math.floor(b.t / 3.5) % 2 === 0 ? 1 : -1;
    var blades = [];
    for (var i = 0; i < 3; i++) blades.push(b.t * 0.85 * rev + i * Math.PI * 2 / 3);
    return { cx: cx, cy: cy, R: 195, y0: b.y0, y1: b.y1, blades: blades, type: b.type, t: b.t };
  },
  ahead: function () {
    // debug-only hazard snapshot (checks / bot steering; unused by the game UI)
    var out = [];
    var near = World.near(Pl.y - 80, Pl.y + 680);
    var i, e, o;
    for (i = 0; i < near.ents.length; i++) {
      e = near.ents[i];
      o = { type: e.type, y: e.y };
      if (e.type === 'laser') { o.on = laserOn(e); o.warn = laserWarn(e); o.x0 = Math.min(e.x0, e.x1); o.x1 = Math.max(e.x0, e.x1); o.t = e.t; o.speed = e.speed; }
      else if (e.type === 'saw') { o.x = e.x; o.r = e.r; o.t = e.t; o.sp = e.sp; o.x0 = e.x0; o.x1 = e.x1; }
      else if (e.type === 'coin') { o.x = e.x; o.taken = e.taken; }
      else if (e.type === 'plat') { o.x = e.x; o.w = e.w; }
      else if (e.type === 'spike') { o.dir = e.dir; o.size = e.size; }
      else if (e.type === 'chest') { o.x = e.x; o.opened = e.opened; o.rar = e.rar; }
      out.push(o);
    }
    for (i = 0; i < near.gates.length; i++) {
      var g = near.gates[i];
      out.push({
        type: 'gate', y: g.y, picked: g.picked,
        sawX: (g.saw && !g.saw.dead) ? CFG.W / 2 + Math.sin(g.saw.t * 2.4) * (CFG.W / 2 - 60) : null,
        sawY: g.y + 90, safeX: g.safe.x, riskX: g.risk.x
      });
    }
    for (i = 0; i < near.bosses.length; i++) {
      var b = near.bosses[i];
      var bo = { type: 'boss', kind: b.type, y0: b.y0, y1: b.y1, entered: b.entered, done: b.done, t: b.t };
      if (b.type === 'rocks') {
        bo.rocks = [];
        for (i = 0; i < b.rocks.length; i++) {
          if (!b.rocks[i].dead) bo.rocks.push({ x: b.rocks[i].x, y: b.rocks[i].y, r: b.rocks[i].r });
        }
      }
      out.push(bo);
    }
    return out;
  },
  jumpFloor: function (n) {
    Pl.y = n * CFG.FLOOR_H + 100;
    Pl.vy = 200;
    Pl.x = CFG.W / 2;
    Game.camY = Pl.y - (Cv.cssH / Cv.s) * 0.36;
    World.camY = Game.camY;
  }
};

// debug-only: direct handles for automated checks (never used by the UI)
window.FALLEN_DEBUG._internals = {
  SDK: SDK, I18N: I18N, Save: Save, World: World, Pl: Pl, Run: Run,
  Game: Game, Cv: Cv, Audio: Audio, Ads: Ads, UI: UI, Input: Input,
  U: U, CFG: CFG, ZONES: ZONES, SKINS: SKINS, PERKS: PERKS, UPGRADES: UPGRADES,
  UPG_MAX: UPG_MAX, CHEST_RARS: CHEST_RARS, ACHIEVEMENTS: ACHIEVEMENTS,
  QUEST_POOL: QUEST_POOL, DAILY_REWARDS: DAILY_REWARDS, Prog: Prog,
  laserOn: laserOn, laserWarn: laserWarn
};

/* go */
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
} catch (err) {
  showFatal();
}

})();
