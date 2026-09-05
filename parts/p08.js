
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
