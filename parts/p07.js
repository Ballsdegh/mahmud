
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
