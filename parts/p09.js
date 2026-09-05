
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
