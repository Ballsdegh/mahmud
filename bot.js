'use strict';
/*
 * bot.js — a competent AI player for the headless checks.
 * Samples candidate x lanes each frame and scores them against every
 * hazard in a lookahead window (lasers, saws, spikes, gate slabs/saw).
 * The corridor is always a safe lane by construction, so the bot settles
 * in it and slides aside only when a hazard crowds it.
 * Uses only F.key() horizontal input (no vertical cheats).
 */
function makeBot(F, I, logPlan) {
  var W = I.CFG.W, WALL = I.CFG.WALL;
  var R = I.CFG.R;
  var CFG_BOSS_H = I.CFG.BOSS_H;

  // distance from point x to interval [a, b] (0 if inside)
  function distInterval(x, a, b) {
    if (x < a) return a - x;
    if (x > b) return x - b;
    return 0;
  }

  // predicted saw x after dt seconds
  function sawXAt(e, dt) {
    var k = (Math.sin((e.t + dt) * e.sp) + 1) / 2;
    return e.x0 + (e.x1 - e.x0) * k;
  }

  // continuous penalty: 100 at the kill boundary, 0 at `fade` px away
  function zonePen(x, lo, hi, fade) {
    var d = distInterval(x, lo, hi);
    if (d >= fade) return 0;
    return 100 * (1 - d / fade);
  }

  function hazardPenalty(x, yAhead, near, vy) {
    var p = 0, i, e, dy;
    for (i = 0; i < near.ents.length; i++) {
      e = near.ents[i];
      dy = yAhead - e.y;
      if (e.type === 'laser' && Math.abs(dy) < 32) {
        var lo = Math.min(e.x0, e.x1), hi = Math.max(e.x0, e.x1);
        p += zonePen(x, lo - 15, hi + 15, 30);
      } else if (e.type === 'saw' && dy > -30 && dy < 170) {
        // only the saw disc at the moment we cross its row matters
        var tCross = Math.max(0.04, dy / Math.max(140, vy));
        var sx = sawXAt(e, tCross);
        p += zonePen(x, sx - (e.r + R + 4), sx + (e.r + R + 4), 40);
      } else if (e.type === 'spike' && Math.abs(dy) < e.size * 1.6 + 40) {
        if (e.dir === 'l') {
          var reachL = WALL + e.size * 0.6 + 14 + R;
          p += zonePen(x, WALL - 30, reachL, 45);
        } else if (e.dir === 'r') {
          var reachR = W - WALL - e.size * 0.6 - 14 - R;
          p += zonePen(x, reachR, W - WALL + 30, 45);
        }
      }
    }
    for (i = 0; i < near.gates.length; i++) {
      var g = near.gates[i];
      if (g.picked) continue;
      var dyG = yAhead - g.y;
      if (Math.abs(dyG) < 60) {
        var slabs = [g.safe, g.risk], si;
        for (si = 0; si < 2; si++) {
          p += zonePen(x, slabs[si].x - slabs[si].w / 2 - 12, slabs[si].x + slabs[si].w / 2 + 12, 70);
        }
      }
      var dyS = yAhead - (g.y + 90);
      if (g.saw && !g.saw.dead && Math.abs(dyS) < 70) {
        var tS = Math.max(0.04, dyS / Math.max(140, vy));
        var sxS = W / 2 + Math.sin((g.saw.t + tS) * 2.4) * (W / 2 - 60);
        p += zonePen(x, sxS - 36, sxS + 36, 70);
      }
    }
    return p;
  }

  function bossPenalty(x, yAhead, b, vy) {
    var p = 0;
    if (!b.entered || b.done) return 0;
    var cx = W / 2;
    if (b.type === 'laser') {
      var cy = (b.y0 + b.y1) / 2;
      // core
      var dCore = Math.sqrt((x - cx) * (x - cx) + (yAhead - cy) * (yAhead - cy));
      p += zonePen(x, cx - 44, cx + 44, 60) * (Math.abs(yAhead - cy) < 70 ? 1 : 0.2);
      // blades (same rotation math as the game), rotated to the moment we reach yAhead
      var tBl = Math.max(0.02, (yAhead - pyNow) / Math.max(120, vy));
      var bT = b.t + tBl;
      var rev = Math.floor(bT / 3.5) % 2 === 0 ? 1 : -1;
      var i;
      for (i = 0; i < 3; i++) {
        var a = bT * 0.85 * rev + i * Math.PI * 2 / 3;
        var ex = cx + Math.cos(a) * 195, ey = cy + Math.sin(a) * 195;
        var d = I.U.segDist(x, yAhead, cx, cy, ex, ey);
        p += Math.max(0, 100 - Math.max(0, d - 20) * 2.2);
      }
      // inside the arena: hold the committed crossing lane
      if (laserPlanVar && Math.abs(yAhead - cy) < 200) {
        var dLn = distInterval(x, laserPlanVar.lo, laserPlanVar.hi);
        p += dLn > 0 ? 100 : 0;
      }
    } else if (b.type === 'crusher') {
      // gap = [spanL+15, spanL+105] (90px), sweeps at 0.45 Hz per row,
      // rows offset by half a phase. The bot waits for the sweep extreme
      // on its side, then dashes through the dwell (see crusherPlan()).
      var ct = crusherTarget;
      for (var r2 = 0; r2 < 3; r2++) {
        var rowY = b.y0 + 120 + r2 * 190;
        if (Math.abs(yAhead - (rowY + 20)) > 55) continue;
        if (ct && r2 === ct.row) {
          var dT = distInterval(x, ct.lo, ct.hi);
          p += dT > 0 ? 100 : 0;
        } else {
          var tCross2 = Math.max(0.02, (rowY + 20 - pyNow) / 430);
          var ph = ((b.t + tCross2) * 0.45 + r2 * 0.5) % 1;
          var spanL = 150 + Math.sin(ph * Math.PI * 2) * 130;
          var dInt = distInterval(x, spanL + 15, spanL + 105);
          p += dInt > 0 ? 100 : 0;
        }
      }
    } else if (b.type === 'void' || b.type === 'magnet') {
      var nOrbs = b.type === 'void' ? 5 : 3;
      var ampX = b.type === 'void' ? 132 : 120;
      var fT = b.t + Math.max(0.02, (yAhead - pyNow) / Math.max(120, vy));
      for (var o = 0; o < nOrbs; o++) {
        var ox = cx + Math.sin(fT * (b.type === 'void' ? 0.62 : 0.5) + o * (b.type === 'void' ? 1.26 : 2.09)) * ampX;
        var oy = b.y0 + (b.type === 'void' ? 80 : 90) + (0.5 + 0.5 * Math.sin(fT * (b.type === 'void' ? 0.47 : 0.38) + o * (b.type === 'void' ? 2.1 : 1.7))) * (CFG_BOSS_H - (b.type === 'void' ? 160 : 180));
        if (Math.abs(oy - yAhead) > 55) continue;
        var rr = b.type === 'void' ? 20 : 17;
        p += zonePen(x, ox - (rr + R + 6), ox + (rr + R + 6), 50);
      }
    } else if (b.type === 'rocks') {
      for (var k = 0; k < b.rocks.length; k++) {
        var rk = b.rocks[k];
        if (rk.dead) continue;
        if (rk.y < pyNow - 40 || rk.y > yAhead + 60) continue;
        var tR = Math.max(0.02, (rk.y - pyNow) / Math.max(120, vy));
        var rx = rk.x + rk.vx * tR * 0.5;
        var ry = rk.y + rk.vy * tR + 100 * tR * tR;
        if (Math.abs(ry - yAhead) > 70) continue;
        p += zonePen(x, rx - (rk.r + R + 6), rx + (rk.r + R + 6), 50);
      }
    }
    return p;
  }

  function crusherPlan(b, px, py) {
    // the row we are in (or next): keep targeting a row until its kill band
    // is fully below us
    var p, rc = null;
    for (p = 0; p < 3; p++) {
      var ryc = b.y0 + 140 + p * 190;
      if (ryc + 33 > py) { rc = { p: p, y: ryc }; break; }
    }
    if (!rc) return { row: -1, lo: -9999, hi: 9999, wait: false };
    var ph = (b.t * 0.45 + rc.p * 0.5) % 1;
    var spanL = 150 + Math.sin(ph * Math.PI * 2) * 130;
    var LLO = 0.6766, LHI = 0.8793, RLO = 0.1227, RHI = 0.3774;
    function tTo(lo, hi) {
      if (ph >= lo && ph <= hi) return 0;
      if (ph < lo) return (lo - ph) / 0.45;
      return (1 - ph + lo) / 0.45;
    }
    // commit to the side the orb is on; wait for that side's sweep extreme
    var left = px < W / 2;
    var lo2 = left ? LLO : RLO, hi2 = left ? LHI : RHI;
    var inDwell = ph >= lo2 && ph <= hi2;
    var tD = tTo(lo2, hi2);
    // wait only while the dwell opens before we are 60px above the row
    var waitBudget = (rc.y - py - 60) / 110;
    var wait = !inDwell && waitBudget > 0.05 && tD <= waitBudget;
    if (wait) {
      var cx = left ? 80 : 340;
      return { row: rc.p, lo: cx - 60, hi: cx + 60, wait: true };
    }
    // dash: aim where the gap center will be when we cross the row band
    // (exact sinusoidal phase at crossing time, not a linear lead)
    var tCross = Math.max(0.03, (rc.y - py) / 430);
    var phC = ((b.t + tCross) * 0.45 + rc.p * 0.5) % 1;
    var center = 210 + 130 * Math.sin(phC * Math.PI * 2);
    return { row: rc.p, lo: center - 30, hi: center + 30, wait: false };
  }

  function laserPlan(b, px, py) {
    // cross the core row on the committed side, timed to the blade gap:
    // wait (above the annulus) while a blade is about to sweep the crossing
    // angle, then dash — the blade is at the crossing angle exactly when
    // the dash starts, out of reach at the annulus top, and the orb reaches
    // the core row ~0.4s later, by then the blade is >20 degrees away
    var cy = (b.y0 + b.y1) / 2;
    var cx = W / 2;
    var left = laserSide == null ? px < cx : laserSide < 0;
    if (laserSide == null) laserSide = left ? -1 : 1;
    var xStar = left ? cx - 140 : cx + 140;
    var wait = false;
    if (py >= cy - 330 && py < cy - 190) {
      var th = left ? Math.PI : 0;
      var rev = Math.floor(b.t / 3.5) % 2 === 0 ? 1 : -1;
      var dFwd = 99, i, a, d;
      for (i = 0; i < 3; i++) {
        a = b.t * 0.85 * rev + i * Math.PI * 2 / 3;
        d = (th - a) % (Math.PI * 2);
        if (d < 0) d += Math.PI * 2;
        if (d < dFwd) dFwd = d;
      }
      wait = dFwd < 1.0;
    }
    return { lo: xStar - 40, hi: xStar + 40, wait: wait };
  }

  var pyNow = 0;
  var crusherTarget = null;
  var laserPlanVar = null;
  var laserSide = null;
  var laserZoneY = null;
  return function steer() {
    if (F.state !== 'PLAYING' || !F.alive) return;
    if (F.sub() === 'perk' || F.sub() === 'chest') return;
    var px = F.px, py = F.py;
    pyNow = py;
    var vy = Math.max(140, I.Pl.vy || 240);
    var near = I.World.near(py - 40, py + 380);
    var cor = F.cor();
    // inside a boss arena the corridor is not a safe lane — hazards decide
    var inBoss = false, bi0;
    for (bi0 = 0; bi0 < near.bosses.length; bi0++) {
      if (near.bosses[bi0].entered && !near.bosses[bi0].done) { inBoss = true; break; }
    }
    var corW = inBoss ? 0.12 : 0.3;
    var bestX = cor, bestScore = -1e9;
    for (var x = WALL + 14; x <= W - WALL - 14; x += 7) {
      var s = -hazardPenalty(x, py + 150, near, vy) * 1.0
            - hazardPenalty(x, py + 70, near, vy) * 0.7
            - hazardPenalty(x, py + 260, near, vy) * 0.35
            - Math.abs(x - cor) * corW
            - Math.abs(x - px) * 0.05;
      for (var bi = 0; bi < near.bosses.length; bi++) {
        s -= bossPenalty(x, py, near.bosses[bi], vy) * 1.2;
        s -= bossPenalty(x, py + 70, near.bosses[bi], vy) * 0.9;
        s -= bossPenalty(x, py + 150, near.bosses[bi], vy) * 1.0;
        s -= bossPenalty(x, py + 260, near.bosses[bi], vy) * 0.4;
      }
      if (s > bestScore) { bestScore = s; bestX = x; }
    }
    F.key('left', bestX - px < -6);
    F.key('right', px < bestX - 6);

    // boss vertical assist (debug): the crusher needs dwell timing, the
    // laser needs a timed gap crossing; horizontal stays real
    crusherTarget = null;
    laserPlanVar = null;
    if (inBoss && near.bosses[bi0]) {
      var bA = near.bosses[bi0];
      if (bA.type === 'crusher') {
        var plan = crusherPlan(bA, px, py);
        crusherTarget = plan;
        F.setVy(plan.wait ? 110 : 430);
        if (logPlan) logPlan(plan, px, py, bA.t);
      } else if (bA.type === 'laser') {
        if (laserZoneY !== bA.y0) { laserZoneY = bA.y0; laserSide = null; }
        var lp = laserPlan(bA, px, py);
        laserPlanVar = lp;
        F.setVy(lp.wait ? 110 : 430);
      }
    }
  };
}

module.exports = { makeBot: makeBot };
