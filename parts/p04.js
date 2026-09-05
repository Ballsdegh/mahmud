
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
