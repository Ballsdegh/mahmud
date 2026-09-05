
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
