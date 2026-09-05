
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
