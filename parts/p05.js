
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
