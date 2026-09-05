
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
