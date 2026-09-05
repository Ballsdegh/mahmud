/* ---------------- entity drawing ---------------- */
var Draw = {
  platform: function (e, ctx) {
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    ctx.fillStyle = 'rgba(77,216,255,0.14)';
    ctx.fillRect(e.x - e.w / 2, e.y - 3, e.w, 8);
    ctx.strokeStyle = '#4dd8ff';
    ctx.lineWidth = 2;
    if (glow) { ctx.shadowColor = '#4dd8ff'; ctx.shadowBlur = 10; }
    ctx.strokeRect(e.x - e.w / 2, e.y - 3, e.w, 8);
    ctx.shadowBlur = 0;
  },

  coin: function (e, ctx, time) {
    var pulse = 1 + Math.sin(time * 4 + e.y * 0.05) * 0.08;
    var r = 9 * pulse;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    if (glow) { ctx.shadowColor = '#ffd75e'; ctx.shadowBlur = 12; }
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  },

  spike: function (e, ctx, zone) {
    var color = zone.acc2;
    ctx.fillStyle = color;
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
    var i, x0, x1, y0;
    if (e.dir === 'l') {
      x0 = CFG.WALL + e.size * 0.15; x1 = CFG.WALL + e.size * 0.6;
      for (i = 0; i < e.n; i++) {
        y0 = e.y + i * e.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0 + e.size * 0.3);
        ctx.lineTo(x0, y0 + e.size * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    } else if (e.dir === 'r') {
      x0 = CFG.W - CFG.WALL - e.size * 0.15; x1 = CFG.W - CFG.WALL - e.size * 0.6;
      for (i = 0; i < e.n; i++) {
        y0 = e.y + i * e.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0 + e.size * 0.3);
        ctx.lineTo(x0, y0 + e.size * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      for (i = 0; i < e.n; i++) {
        var sx = e.x + i * e.size * 0.95;
        ctx.beginPath();
        ctx.moveTo(sx, e.y + e.size);
        ctx.lineTo(sx + e.size * 0.475, e.y);
        ctx.lineTo(sx + e.size * 0.95, e.y + e.size);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  },

  laser: function (e, ctx, time, zone) {
    var on = laserOn(e);
    var warn = laserWarn(e);
    ctx.fillStyle = '#8fa3c8';
    ctx.fillRect(e.x0 - 6, e.y - 6, 12, 12);
    ctx.fillRect(e.x1 - 6, e.y - 6, 12, 12);
    var grad = ctx.createLinearGradient(e.x0, 0, e.x1, 0);
    grad.addColorStop(0, zone.acc2);
    grad.addColorStop(1, '#ffffff');
    ctx.strokeStyle = grad;
    if (on) {
      if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = zone.acc2; ctx.shadowBlur = 16; }
      ctx.lineWidth = 6 + Math.sin(time * 30) * 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x0, e.y);
      ctx.lineTo(e.x1, e.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (warn) {
      ctx.globalAlpha = 0.3 + Math.sin(time * 24) * 0.2;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(e.x0, e.y);
      ctx.lineTo(e.x1, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  },

  saw: function (e, ctx, time) {
    var r = e.r;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff5e7a'; ctx.shadowBlur = 12; }
    ctx.fillStyle = '#3a2f58';
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a1 = i / 10 * Math.PI * 2;
      var a2 = a1 + Math.PI / 10;
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.7, Math.sin(a2) * r * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff5e7a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff5e7a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  chest: function (e, ctx, time) {
    if (e.opened) return;
    var colors = { wood: '#c8935a', rare: '#4dd8ff', epic: '#b06bff', legendary: '#ffd75e' };
    var c = colors[e.rar] || colors.wood;
    var bob = Math.sin(time * 2 + e.x * 0.1) * 4;
    ctx.save();
    ctx.translate(e.x, e.y + bob);
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = c; ctx.shadowBlur = 18; }
    ctx.fillStyle = 'rgba(10,14,28,0.9)';
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(-16, -12, 32, 24);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(16, -2);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  portal: function (e, ctx, time) {
    if (e.used) return;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    for (var i = 0; i < 3; i++) {
      var k = (time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.strokeStyle = '#4dffc4';
      ctx.lineWidth = 3 - k * 2;
      if (glow) { ctx.shadowColor = '#4dffc4'; ctx.shadowBlur = 14; }
      ctx.beginPath();
      ctx.arc(e.x, e.y, 14 + k * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4dffc4';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
    ctx.fill();
  },

  gate: function (g, ctx, time, zone) {
    var slabs = [
      { s: g.safe, label: 'SAFE', c: '#4dd8ff' },
      { s: g.risk, label: 'RISK', c: '#ff5e7a' }
    ];
    for (var i = 0; i < 2; i++) {
      var it = slabs[i];
      ctx.fillStyle = 'rgba(77,216,255,0.10)';
      ctx.fillRect(it.s.x - it.s.w / 2, it.s.y - 3, it.s.w, 8);
      ctx.strokeStyle = it.c;
      ctx.lineWidth = 2;
      if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = it.c; ctx.shadowBlur = 10; }
      ctx.strokeRect(it.s.x - it.s.w / 2, it.s.y - 3, it.s.w, 8);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = g.picked ? 0.4 : (0.7 + Math.sin(time * 3 + i) * 0.3);
      ctx.fillStyle = it.c;
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(it.label, it.s.x, it.s.y - 14);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(143,163,200,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(CFG.W / 2, g.y - 46);
    ctx.lineTo(CFG.W / 2, g.y + 60);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  piston: function (x, y, w, zc, time) {
    var ctx = Cv.ctx;
    var h = 40;
    var grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#ff5e7a');
    grad.addColorStop(1, '#7a2540');
    ctx.fillStyle = grad;
    if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff5e7a'; ctx.shadowBlur = 12; }
    ctx.fillRect(x, y - h / 2, w, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y - h / 2, w, 4);
  },

  voidOrb: function (x, y, r, time) {
    var ctx = Cv.ctx;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    if (glow) { ctx.shadowColor = '#b06bff'; ctx.shadowBlur = 18; }
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#b06bff');
    g.addColorStop(1, 'rgba(108,59,255,0.1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(176,107,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 5 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  },

  magnetOrb: function (x, y, r, time) {
    var ctx = Cv.ctx;
    var glow = (QUALITY[Cv.quality] || QUALITY.high).glow;
    if (glow) { ctx.shadowColor = '#4d8aff'; ctx.shadowBlur = 16; }
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#4d8aff');
    g.addColorStop(1, 'rgba(77,138,255,0.08)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(77,138,255,0.7)';
    ctx.lineWidth = 2;
    for (var i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6 + i * 7 + Math.sin(time * 6 + i) * 2, time * 2 + i, time * 2 + i + Math.PI * 1.2);
      ctx.stroke();
    }
  },

  rock: function (x, y, r, rot) {
    var ctx = Cv.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#4a3b52';
    ctx.strokeStyle = '#ff9a5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < 7; i++) {
      var a = i / 7 * Math.PI * 2;
      var rr = r * (0.75 + hashN(i * 3.3 + Math.floor(rot * 10)) * 0.3);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  boss: function (b, ctx, camY, time) {
    var cx = CFG.W / 2;
    var yMid = (b.y0 + b.y1) / 2 - camY;
    switch (b.type) {
      case 'laser': {
        if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff4dd8'; ctx.shadowBlur = 24; }
        var g = ctx.createRadialGradient(cx, yMid, 2, cx, yMid, 34);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#ff4dd8');
        g.addColorStop(1, 'rgba(255,77,216,0.05)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, yMid, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        var rev = Math.floor(b.t / 3.5) % 2 === 0 ? 1 : -1;
        ctx.strokeStyle = '#ff4dd8';
        ctx.lineWidth = 5;
        if ((QUALITY[Cv.quality] || QUALITY.high).glow) { ctx.shadowColor = '#ff4dd8'; ctx.shadowBlur = 14; }
        for (var i = 0; i < 3; i++) {
          var a = b.t * 0.85 * rev + i * Math.PI * 2 / 3;
          ctx.beginPath();
          ctx.moveTo(cx, yMid);
          ctx.lineTo(cx + Math.cos(a) * 195, yMid + Math.sin(a) * 195);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      }
      case 'crusher': {
        for (var p = 0; p < 3; p++) {
          var py = b.y0 + 120 + p * 190 - camY;
          var ph = (b.t * 0.45 + p * 0.5) % 1;
          var spanL = 150 + Math.sin(ph * Math.PI * 2) * 130;
          var spanR = 300 - spanL;
          Draw.piston(0, py, spanL, camY, time);
          Draw.piston(CFG.W - spanR, py, spanR, camY, time);
        }
        break;
      }
      case 'void': {
        for (var v = 0; v < 5; v++) {
          var ox = CFG.W / 2 + Math.sin(b.t * 0.62 + v * 1.26) * 132;
          var oy = b.y0 + 80 + (0.5 + 0.5 * Math.sin(b.t * 0.47 + v * 2.1)) * (CFG.BOSS_H - 160);
          Draw.voidOrb(ox, oy - camY, 20, time + v);
        }
        break;
      }
      case 'magnet': {
        for (var m = 0; m < 3; m++) {
          var mx = CFG.W / 2 + Math.sin(b.t * 0.5 + m * 2.09) * 120;
          var my = b.y0 + 90 + (0.5 + 0.5 * Math.sin(b.t * 0.38 + m * 1.7)) * (CFG.BOSS_H - 180);
          Draw.magnetOrb(mx, my - camY, 17, time + m * 0.6);
        }
        break;
      }
      case 'rocks': {
        for (var rk = 0; rk < b.rocks.length; rk++) {
          var rock = b.rocks[rk];
          if (rock.dead) continue;
          Draw.rock(rock.x, rock.y - camY, rock.r, rock.rot);
        }
        break;
      }
    }
  },

  /* the player orb with skin + trail + fx */
  orb: function (ctx, pl, camY, time) {
    var skin = skinById(Save.data.skin || 'classic');
    var q = QUALITY[Cv.quality] || QUALITY.high;
    var glow = q.glow;
    var x = pl.x, y = pl.y - camY, r = pl.r;
    var aliveA = pl.alive ? 1 : 0.35;
    // trail
    var tl = pl.trail || [];
    var maxT = q.trail;
    for (var i = maxT - 1; i >= 0; i--) {
      var tp = tl[i];
      if (!tp) continue;
      var k = 1 - i / maxT;
      ctx.globalAlpha = aliveA * k * 0.35;
      ctx.fillStyle = skin.trail;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y - camY, Math.max(1, r * k * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = aliveA;

    if (glow) { ctx.shadowColor = skin.glow; ctx.shadowBlur = 18; }

    var fx = skin.fx;
    if (fx === 'ring') {
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 7 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx === 'stars') {
      for (var st = 0; st < 3; st++) {
        var sa = time * 2.4 + st * Math.PI * 2 / 3;
        ctx.fillStyle = skin.trail;
        ctx.beginPath();
        ctx.arc(x + Math.cos(sa) * (r + 8), y + Math.sin(sa) * (r + 8), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (fx === 'rays' || fx === 'legend') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 0.8);
      ctx.strokeStyle = skin.trail;
      ctx.globalAlpha = aliveA * 0.5;
      ctx.lineWidth = 2;
      var nr = fx === 'legend' ? 12 : 8;
      for (var ry = 0; ry < nr; ry++) {
        var ra = ry / nr * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * (r + 4), Math.sin(ra) * (r + 4));
        ctx.lineTo(Math.cos(ra) * (r + 11), Math.sin(ra) * (r + 11));
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = aliveA;
    } else if (fx === 'hex') {
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 1.4);
      ctx.beginPath();
      for (var hx = 0; hx < 6; hx++) {
        var ha = hx / 6 * Math.PI * 2;
        ctx.lineTo(Math.cos(ha) * (r + 8), Math.sin(ha) * (r + 8));
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    } else if (fx === 'plasma') {
      for (var pz = 0; pz < 2; pz++) {
        ctx.strokeStyle = pz ? skin.glow : skin.trail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 6 + pz * 5, time * (3 + pz) + pz * 2, time * (3 + pz) + pz * 2 + Math.PI * 1.4);
        ctx.stroke();
      }
    } else if (fx === 'shadow') {
      ctx.fillStyle = 'rgba(10,14,28,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // body
    var hueShift = (fx === 'rainbow' || fx === 'shimmer') ? (time * 80) % 360 : 0;
    var g2 = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r);
    g2.addColorStop(0, skin.core);
    g2.addColorStop(1, skin.mid);
    if (hueShift) ctx.filter = 'hue-rotate(' + hueShift + 'deg)';
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (hueShift) ctx.filter = 'none';
    ctx.shadowBlur = 0;

    if (fx === 'fire') {
      ctx.globalAlpha = aliveA * (0.4 + Math.sin(time * 18) * 0.25);
      ctx.fillStyle = skin.glow;
      ctx.beginPath();
      ctx.arc(x, y, r + 3 + Math.sin(time * 22) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'frost') {
      ctx.globalAlpha = aliveA * 0.4;
      ctx.strokeStyle = skin.trail;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'facet') {
      ctx.globalAlpha = aliveA * 0.7;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - r * 0.6);
      ctx.lineTo(x + r * 0.3, y - r * 0.2);
      ctx.lineTo(x - r * 0.2, y + r * 0.5);
      ctx.stroke();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'void') {
      ctx.globalAlpha = aliveA * 0.5;
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, time * 3, time * 3 + Math.PI * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r + 5, time * 3 + Math.PI, time * 3 + Math.PI * 1.8);
      ctx.stroke();
      ctx.globalAlpha = aliveA;
    }
    if (fx === 'toxic') {
      ctx.globalAlpha = aliveA * 0.5;
      ctx.fillStyle = skin.trail;
      for (var td = 0; td < 3; td++) {
        var ty = y + r + ((time * 30 + td * 10) % 22);
        ctx.beginPath();
        ctx.arc(x + (td - 1) * 6, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = aliveA;
    }

    if (pl.shield > 0) {
      ctx.strokeStyle = '#4dd8ff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = aliveA * (0.6 + Math.sin(time * 6) * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (pl.ghost > 0) ctx.globalAlpha = aliveA * 0.55;
    if (pl.blaze > 0) {
      ctx.globalAlpha = aliveA * (0.5 + Math.sin(time * 20) * 0.3);
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

/* laser duty-cycle helpers (shared by draw + collision) */
function laserCycle(e) { return 2.2 / (e.speed || 1); }
function laserOn(e) {
  var c = laserCycle(e);
  var t = (e.t || 0) % c;
  return t > c * 0.45 && t < c * 0.85;
}
function laserWarn(e) {
  var c = laserCycle(e);
  var t = (e.t || 0) % c;
  return t > c * 0.25 && t <= c * 0.45;
}
