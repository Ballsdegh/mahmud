
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
