
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
