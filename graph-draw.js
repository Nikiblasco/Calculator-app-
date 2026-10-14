// ===== Niki graph renderer: 2D (curves, implicit, inequalities) + 3D (software renderer) =====
// Uses only the plain Canvas 2D API (no WebGL), so it also runs on older phones.
var GD = (function () {
  "use strict";

  function clampN(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function isBad(y) { return y !== y || y === Infinity || y === -Infinity; }

  // ================= 2D =================
  function drawGrid(ctx, W, H, v) {
    var left = v.cx - W / 2 / v.sx, right = v.cx + W / 2 / v.sx;
    var bottom = v.cy - H / 2 / v.sy, top = v.cy + H / 2 / v.sy;
    var stX = v.piAxis ? GE.piStep(90 / v.sx) : GE.niceStep(90 / v.sx);
    var stY = GE.niceStep(80 / v.sy);
    function subsOf(st, pi) {
      if (pi) return 2;
      var m = st / Math.pow(10, Math.floor(Math.log(st) / Math.LN10));
      return m < 1.5 ? 5 : m < 3 ? 4 : 5;
    }
    var subX = subsOf(stX, v.piAxis), subY = subsOf(stY, false);
    var k, k0, k1, x, y, ms;
    var sx0 = W / 2 - v.cx * v.sx, sy0 = H / 2 + v.cy * v.sy;

    // minor + major grid lines
    var drawMinorX = stX / subX * v.sx >= 14, drawMinorY = stY / subY * v.sy >= 14;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (drawMinorX) { ms = stX / subX; k0 = Math.ceil(left / ms); k1 = Math.floor(right / ms);
      for (k = k0; k <= k1; k++) if (k % subX !== 0) { x = Math.round(W / 2 + (k * ms - v.cx) * v.sx) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); } }
    if (drawMinorY) { ms = stY / subY; k0 = Math.ceil(bottom / ms); k1 = Math.floor(top / ms);
      for (k = k0; k <= k1; k++) if (k % subY !== 0) { y = Math.round(H / 2 - (k * ms - v.cy) * v.sy) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); } }
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.stroke();

    ctx.beginPath();
    k0 = Math.ceil(left / stX); k1 = Math.floor(right / stX);
    for (k = k0; k <= k1; k++) { x = Math.round(W / 2 + (k * stX - v.cx) * v.sx) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    k0 = Math.ceil(bottom / stY); k1 = Math.floor(top / stY);
    for (k = k0; k <= k1; k++) { y = Math.round(H / 2 - (k * stY - v.cy) * v.sy) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.strokeStyle = "rgba(255,255,255,0.11)";
    ctx.stroke();

    // axes
    ctx.beginPath();
    if (sx0 >= 0 && sx0 <= W) { ctx.moveTo(Math.round(sx0) + 0.5, 0); ctx.lineTo(Math.round(sx0) + 0.5, H); }
    if (sy0 >= 0 && sy0 <= H) { ctx.moveTo(0, Math.round(sy0) + 0.5); ctx.lineTo(W, Math.round(sy0) + 0.5); }
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // labels
    ctx.font = "11px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(238,240,255,0.7)";
    ctx.textAlign = "center";
    var ly = clampN(sy0 + 14, 14, H - 6);
    k0 = Math.ceil(left / stX); k1 = Math.floor(right / stX);
    for (k = k0; k <= k1; k++) {
      if (k === 0) continue;
      x = k * stX;
      ctx.fillText(v.piAxis ? GE.piLabel(x) : GE.fmt(x), W / 2 + (x - v.cx) * v.sx, ly);
    }
    ctx.textAlign = "right";
    var lx = clampN(sx0 - 6, 34, W - 4);
    k0 = Math.ceil(bottom / stY); k1 = Math.floor(top / stY);
    for (k = k0; k <= k1; k++) {
      if (k === 0) continue;
      y = k * stY;
      ctx.fillText(GE.fmt(y), lx, H / 2 - (y - v.cy) * v.sy + 4);
    }
    if (sx0 >= 0 && sx0 <= W && sy0 >= 0 && sy0 <= H) ctx.fillText("0", sx0 - 6, sy0 + 14);
    ctx.textAlign = "left";
  }

  function brk(pts) { var l = pts.length; if (l && pts[l - 1] === pts[l - 1]) pts.push(NaN, NaN); }

  function sampleCart(f, v, W, H, step) {
    var pts = [], pen = false, py = 0, pyw = 0, n = Math.ceil(W / step);
    for (var i = 0; i <= n; i++) {
      var sx = i * step, x = v.cx + (sx - W / 2) / v.sx, y = f(x, 0, 0, 0, 0);
      if (isBad(y)) { pen = false; brk(pts); continue; }
      var sy = H / 2 - (y - v.cy) * v.sy;
      if (pen) {
        var d = Math.abs(sy - py);
        if ((d > H && y * pyw < 0) || d > 8 * H) brk(pts);
      }
      pts.push(sx, clampN(sy, -4 * H, 5 * H));
      pen = true; py = sy; pyw = y;
    }
    return pts;
  }

  function sampleCartY(f, v, W, H, step) {
    var pts = [], pen = false, px = 0, pxw = 0, n = Math.ceil(H / step);
    for (var i = 0; i <= n; i++) {
      var sy = i * step, y = v.cy + (H / 2 - sy) / v.sy, x = f(0, y, 0, 0, 0);
      if (isBad(x)) { pen = false; brk(pts); continue; }
      var sx = W / 2 + (x - v.cx) * v.sx;
      if (pen) {
        var d = Math.abs(sx - px);
        if ((d > W && x * pxw < 0) || d > 8 * W) brk(pts);
      }
      pts.push(clampN(sx, -4 * W, 5 * W), sy);
      pen = true; px = sx; pxw = x;
    }
    return pts;
  }

  function sampleTParam(c, polar, v, W, H, t0, t1, lite) {
    var n = clampN(Math.ceil((t1 - t0) * 60), 400, 4000);
    if (lite) n = Math.ceil(n / 2);
    var pts = [], dt = (t1 - t0) / n;
    for (var i = 0; i <= n; i++) {
      var t = t0 + i * dt, X, Y;
      if (polar) { var r = c.f(0, 0, t, 0, 0); X = r * Math.cos(t); Y = r * Math.sin(t); }
      else { X = c.fx(0, 0, t, 0, 0); Y = c.fy(0, 0, t, 0, 0); }
      if (isBad(X) || isBad(Y)) { brk(pts); continue; }
      pts.push(clampN(W / 2 + (X - v.cx) * v.sx, -4 * W, 5 * W), clampN(H / 2 - (Y - v.cy) * v.sy, -4 * H, 5 * H));
    }
    return pts;
  }

  function pathFlat(ctx, p) {
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i < p.length; i += 2) {
      var x = p[i];
      if (x !== x) { pen = false; continue; }
      if (!pen) { ctx.moveTo(x, p[i + 1]); pen = true; } else ctx.lineTo(x, p[i + 1]);
    }
  }

  // marching squares ---------------------------------------------------
  var _a, _b, _c, _d, _x0, _y0, _cs;
  function ex(e) {
    return e === 0 ? _x0 + _cs * _a / (_a - _b) : e === 1 ? _x0 + _cs : e === 2 ? _x0 + _cs * _d / (_d - _c) : _x0;
  }
  function ey(e) {
    return e === 0 ? _y0 : e === 1 ? _y0 + _cs * _b / (_b - _c) : e === 2 ? _y0 + _cs : _y0 + _cs * _a / (_a - _d);
  }
  var SEG = [[], [3, 0], [0, 1], [3, 1], [1, 2], null, [0, 2], [3, 2], [2, 3], [0, 2], null, [1, 2], [1, 3], [0, 1], [3, 0], []];

  function implicitGrid(c, v, W, H, cs) {
    var nx = Math.ceil(W / cs) + 1, ny = Math.ceil(H / cs) + 1, vals = new Float32Array(nx * ny), i, j, f = c.f;
    for (j = 0; j < ny; j++) {
      var y = v.cy + (H / 2 - j * cs) / v.sy, row = j * nx;
      for (i = 0; i < nx; i++) vals[row + i] = f(v.cx + (i * cs - W / 2) / v.sx, y, 0, 0, 0);
    }
    return { nx: nx, ny: ny, vals: vals };
  }

  function contourSegs(g, cs) {
    var segs = [], nx = g.nx, vals = g.vals;
    for (var j = 0; j < g.ny - 1; j++) {
      for (var i = 0; i < nx - 1; i++) {
        var a = vals[j * nx + i], b = vals[j * nx + i + 1], c = vals[(j + 1) * nx + i + 1], d = vals[(j + 1) * nx + i];
        if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d))) continue;
        var idx = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        _a = a; _b = b; _c = c; _d = d; _x0 = i * cs; _y0 = j * cs; _cs = cs;
        var s = SEG[idx], list;
        if (s === null) {
          var mid = (a + b + c + d) / 4;
          if (idx === 5) list = mid > 0 ? [0, 1, 2, 3] : [3, 0, 1, 2];
          else list = mid > 0 ? [3, 0, 1, 2] : [0, 1, 2, 3];
        } else list = s;
        for (var q = 0; q < list.length; q += 2) segs.push(ex(list[q]), ey(list[q]), ex(list[q + 1]), ey(list[q + 1]));
      }
    }
    return segs;
  }

  function shadeCells(ctx, g, cs, op, rgb) {
    var nx = g.nx, vals = g.vals, pos = op === ">" || op === ">=";
    ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.2)";
    for (var j = 0; j < g.ny - 1; j++) {
      var start = -1;
      for (var i = 0; i < nx; i++) {
        var on = false;
        if (i < nx - 1) {
          var m = (vals[j * nx + i] + vals[j * nx + i + 1] + vals[(j + 1) * nx + i] + vals[(j + 1) * nx + i + 1]) / 4;
          on = isFinite(m) && (pos ? m > 0 : m < 0);
        }
        if (on && start < 0) start = i;
        if (!on && start >= 0) { ctx.fillRect(start * cs, j * cs, (i - start) * cs + 0.5, cs + 0.5); start = -1; }
      }
    }
  }

  function strokeSegs(ctx, segs, color, lw, glow, dash) {
    ctx.beginPath();
    for (var k = 0; k < segs.length; k += 4) { ctx.moveTo(segs[k], segs[k + 1]); ctx.lineTo(segs[k + 2], segs[k + 3]); }
    ctx.strokeStyle = color;
    if (dash && ctx.setLineDash) ctx.setLineDash([7, 6]);
    if (glow) { ctx.globalAlpha = 0.18; ctx.lineWidth = lw + 6; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.lineWidth = lw;
    ctx.stroke();
    if (dash && ctx.setLineDash) ctx.setLineDash([]);
  }

  function strokeFlat(ctx, pts, color, lw, glow) {
    pathFlat(ctx, pts);
    ctx.strokeStyle = color;
    if (glow) { ctx.globalAlpha = 0.18; ctx.lineWidth = lw + 6; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  function dot(ctx, x, y, r, fill, ring) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function label(ctx, text, x, y) {
    ctx.font = "11px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(7,6,15,0.85)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#eef0ff";
    ctx.fillText(text, x, y);
  }

  var MARK_COLOR = { zero: "#5ef2ff", yint: "#5ef2ff", max: "#ff4fd8", min: "#ff4fd8", int: "#ffc857" };

  // st: {view, rows:[{c,color,visible}], t0, t1, lite, fast, markers, trace}
  function draw2D(ctx, W, H, st) {
    var v = st.view, lines = [], rows = st.rows, i, r, c, pts, segs, lite = st.lite, fast = st.fast;
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H, v);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    var glow = !lite && !fast, lw = 2.4;
    var cs = fast ? 10 : (lite ? 8 : 5);

    for (i = 0; i < rows.length; i++) {          // shaded inequalities first
      r = rows[i];
      if (!r.visible || !r.c || r.c.kind !== "ineq") continue;
      var g = implicitGrid(r.c, v, W, H, cs);
      shadeCells(ctx, g, cs, r.c.op, hexRgb(r.color));
      segs = contourSegs(g, cs);
      strokeSegs(ctx, segs, r.color, lw, glow, r.c.op === "<" || r.c.op === ">");
      lines.push({ ri: i, pts: segs, seg: true });
    }
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!r.visible || !r.c) continue;
      c = r.c;
      if (c.kind === "cart") pts = sampleCart(c.f, v, W, H, fast || lite ? 3 : 1.5);
      else if (c.kind === "cartY") pts = sampleCartY(c.f, v, W, H, fast || lite ? 3 : 1.5);
      else if (c.kind === "polar") pts = sampleTParam(c, true, v, W, H, st.t0, st.t1, lite || fast);
      else if (c.kind === "param") pts = sampleTParam(c, false, v, W, H, st.t0, st.t1, lite || fast);
      else if (c.kind === "implicit") {
        segs = contourSegs(implicitGrid(c, v, W, H, cs), cs);
        strokeSegs(ctx, segs, r.color, lw, glow, false);
        lines.push({ ri: i, pts: segs, seg: true });
        continue;
      }
      else if (c.kind === "point") {
        var X = c.fx(0, 0, 0, 0, 0), Y = c.fy(0, 0, 0, 0, 0);
        if (!isBad(X) && !isBad(Y)) {
          var px = W / 2 + (X - v.cx) * v.sx, py = H / 2 - (Y - v.cy) * v.sy;
          dot(ctx, px, py, 5.5, r.color, "rgba(7,6,15,0.9)");
          label(ctx, "(" + GE.fmt(X) + ", " + GE.fmt(Y) + ")", px + 9, py - 9);
          lines.push({ ri: i, pts: [px, py] });
        }
        continue;
      }
      else continue;
      strokeFlat(ctx, pts, r.color, lw, glow);
      lines.push({ ri: i, pts: pts, kind: c.kind });
    }

    var m = st.markers;
    if (m && m.length) {
      ctx.textAlign = "left";
      for (i = 0; i < m.length; i++) {
        var mx = W / 2 + (m[i].x - v.cx) * v.sx, my = H / 2 - (m[i].y - v.cy) * v.sy;
        if (mx < -10 || mx > W + 10 || my < -10 || my > H + 10) continue;
        dot(ctx, mx, my, 4.5, MARK_COLOR[m[i].type] || "#fff", "rgba(7,6,15,0.9)");
        if (m.length <= 14) label(ctx, "(" + GE.fmt(m[i].x) + ", " + GE.fmt(m[i].y) + ")", mx + 8, my - 8);
      }
    }
    var tr = st.trace;
    if (tr) {
      ctx.save();
      if (ctx.setLineDash) ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tr.sx + 0.5, 0); ctx.lineTo(tr.sx + 0.5, H);
      ctx.moveTo(0, tr.sy + 0.5); ctx.lineTo(W, tr.sy + 0.5);
      ctx.stroke();
      ctx.restore();
      dot(ctx, tr.sx, tr.sy, 6, tr.color || "#fff", "#07060f");
      ctx.textAlign = "left";
      var tx = tr.sx + 12, ty = tr.sy - 12;
      if (tx > W - 130) tx = tr.sx - 130;
      if (ty < 16) ty = tr.sy + 24;
      label(ctx, tr.text, tx, ty);
    }
    return { lines: lines };
  }

  // ================= 3D =================
  var C1 = [94, 242, 255], C2 = [139, 92, 255], C3 = [255, 79, 216];
  var tmpRgb = [0, 0, 0];
  function grad(t) {
    var a, b, k;
    if (t < 0.5) { a = C1; b = C2; k = t * 2; } else { a = C2; b = C3; k = (t - 0.5) * 2; }
    tmpRgb[0] = a[0] + (b[0] - a[0]) * k; tmpRgb[1] = a[1] + (b[1] - a[1]) * k; tmpRgb[2] = a[2] + (b[2] - a[2]) * k;
    return tmpRgb;
  }

  // o: {R, res, t0, t1, equal(null|bool)} -> scene
  function build3D(rows, o) {
    var N = o.res, R = o.R, meshes = [], hasNon = false, i, j, k, r, c;
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    function upd(x, y, z) {
      if (x < mn[0]) mn[0] = x; if (x > mx[0]) mx[0] = x;
      if (y < mn[1]) mn[1] = y; if (y > mx[1]) mx[1] = y;
      if (z < mn[2]) mn[2] = z; if (z > mx[2]) mx[2] = z;
    }
    for (var q = 0; q < rows.length; q++) {
      r = rows[q];
      if (!r.visible || !r.c) continue;
      c = r.c;
      var n, X, Y, Z, idx;
      if (c.kind === "surf" || c.kind === "psurf") {
        n = (N + 1) * (N + 1);
        X = new Float32Array(n); Y = new Float32Array(n); Z = new Float32Array(n);
        var zs = [], span = o.t1 - o.t0;
        for (j = 0; j <= N; j++) {
          for (i = 0; i <= N; i++) {
            idx = j * (N + 1) + i;
            if (c.kind === "surf") {
              X[idx] = -R + 2 * R * i / N; Y[idx] = -R + 2 * R * j / N;
              Z[idx] = c.f(X[idx], Y[idx], 0, 0, 0);
            } else {
              var u = o.t0 + span * i / N, vv = o.t0 + span * j / N;
              X[idx] = c.fx(0, 0, 0, u, vv); Y[idx] = c.fy(0, 0, 0, u, vv); Z[idx] = c.fz(0, 0, 0, u, vv);
            }
            if (isFinite(Z[idx])) zs.push(Z[idx]);
          }
        }
        if (c.kind === "surf" && zs.length > 8) {
          zs.sort(function (a, b) { return a - b; });
          var lo = zs[0], hi = zs[zs.length - 1];
          var p05 = zs[Math.floor(zs.length * 0.05)], p95 = zs[Math.floor(zs.length * 0.95)];
          if (hi - lo > 4 * (p95 - p05) + 1e-12) {
            lo = zs[Math.floor(zs.length * 0.02)]; hi = zs[Math.floor(zs.length * 0.98)];
            var pad = (hi - lo) * 0.25 + 1e-9;
            lo -= pad; hi += pad;
            for (k = 0; k < n; k++) if (Z[k] < lo || Z[k] > hi) Z[k] = NaN;
          }
        }
        if (c.kind === "psurf") hasNon = true;
        meshes.push({ type: "grid", nx: N + 1, ny: N + 1, n: n, X: X, Y: Y, Z: Z, color: r.color });
      } else if (c.kind === "curve3") {
        hasNon = true;
        var M = Math.max(300, N * 10);
        n = M + 1;
        X = new Float32Array(n); Y = new Float32Array(n); Z = new Float32Array(n);
        for (i = 0; i <= M; i++) {
          var t = o.t0 + (o.t1 - o.t0) * i / M;
          X[i] = c.fx(0, 0, t, 0, 0); Y[i] = c.fy(0, 0, t, 0, 0); Z[i] = c.fz(0, 0, t, 0, 0);
        }
        meshes.push({ type: "curve", n: n, X: X, Y: Y, Z: Z, color: r.color });
      } else if (c.kind === "point3") {
        hasNon = true;
        X = new Float32Array(1); Y = new Float32Array(1); Z = new Float32Array(1);
        X[0] = c.fx(0, 0, 0, 0, 0); Y[0] = c.fy(0, 0, 0, 0, 0); Z[0] = c.fz(0, 0, 0, 0, 0);
        meshes.push({ type: "point", n: 1, X: X, Y: Y, Z: Z, color: r.color });
      }
    }
    var m, any = false;
    for (m = 0; m < meshes.length; m++) {
      var ms = meshes[m];
      for (k = 0; k < ms.n; k++) {
        if (isFinite(ms.X[k]) && isFinite(ms.Y[k]) && isFinite(ms.Z[k])) { upd(ms.X[k], ms.Y[k], ms.Z[k]); any = true; }
        else { ms.X[k] = NaN; ms.Y[k] = NaN; ms.Z[k] = NaN; }
      }
    }
    if (!any) return { empty: true, meshes: [], box: [1, 1, 1], bounds: { xmin: -1, xmax: 1, ymin: -1, ymax: 1, zmin: -1, zmax: 1 } };
    var h = [], cen = [];
    for (k = 0; k < 3; k++) {
      if (mx[k] - mn[k] < 1e-9) { mn[k] -= 1; mx[k] += 1; }
      h.push((mx[k] - mn[k]) / 2); cen.push((mn[k] + mx[k]) / 2);
    }
    var equal = (o.equal === null || o.equal === undefined) ? hasNon : o.equal;
    var hm = Math.max(h[0], h[1], h[2]);
    var hn = equal ? [hm, hm, hm] : h;
    for (m = 0; m < meshes.length; m++) {
      var s = meshes[m], len = s.n;
      s.NX = new Float32Array(len); s.NY = new Float32Array(len); s.NZ = new Float32Array(len); s.T = new Float32Array(len);
      s.PX = new Float32Array(len); s.PY = new Float32Array(len); s.PD = new Float32Array(len);
      s.CX = new Float32Array(len); s.CY = new Float32Array(len);
      for (k = 0; k < len; k++) {
        s.NX[k] = (s.X[k] - cen[0]) / hn[0]; s.NY[k] = (s.Y[k] - cen[1]) / hn[1]; s.NZ[k] = (s.Z[k] - cen[2]) / hn[2];
        s.T[k] = clampN((s.Z[k] - mn[2]) / (mx[2] - mn[2]), 0, 1);
      }
    }
    return {
      empty: false, meshes: meshes, equal: equal,
      box: [h[0] / hn[0], h[1] / hn[1], h[2] / hn[2]],
      bounds: { xmin: mn[0], xmax: mx[0], ymin: mn[1], ymax: mx[1], zmin: mn[2], zmax: mx[2] }
    };
  }

  var LIGHT = (function () { var l = [-0.35, 0.55, -0.76], n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();

  // cam: {yaw, pitch, zoom}; opt: {wire, lite, fast, solid, lines}
  function draw3D(ctx, W, H, scene, cam, opt) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (scene.empty) {
      ctx.fillStyle = "rgba(238,240,255,0.6)";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Type  z = f(x, y)  or a parametric (x, y, z)  to see it here", W / 2, H / 2);
      ctx.textAlign = "left";
      return;
    }
    var cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var S = Math.min(W, H) * 0.3 * cam.zoom, D = 4.2, m, k, i, j;
    var box = scene.box;
    function pr(x, y, z) {
      var x1 = x * cyw - y * syw, y1 = x * syw + y * cyw, d = y1 * cp - z * sp, f = D / (D + d);
      return [W / 2 + x1 * f * S, H / 2 - (y1 * sp + z * cp) * f * S, d];
    }

    // floor grid + box
    var p, p2;
    ctx.beginPath();
    for (i = 0; i <= 8; i++) {
      var gx = -box[0] + 2 * box[0] * i / 8, gy = -box[1] + 2 * box[1] * i / 8;
      p = pr(gx, -box[1], -box[2]); p2 = pr(gx, box[1], -box[2]); ctx.moveTo(p[0], p[1]); ctx.lineTo(p2[0], p2[1]);
      p = pr(-box[0], gy, -box[2]); p2 = pr(box[0], gy, -box[2]); ctx.moveTo(p[0], p[1]); ctx.lineTo(p2[0], p2[1]);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    for (i = 0; i < 8; i++) {
      for (j = 0; j < 3; j++) {
        if (!(i & (1 << j))) {
          var a = [(i & 1) ? box[0] : -box[0], (i & 2) ? box[1] : -box[1], (i & 4) ? box[2] : -box[2]];
          var b = [a[0], a[1], a[2]];
          b[j] = -b[j];
          p = pr(a[0], a[1], a[2]); p2 = pr(b[0], b[1], b[2]);
          ctx.moveTo(p[0], p[1]); ctx.lineTo(p2[0], p2[1]);
        }
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.stroke();

    // project mesh vertices
    for (m = 0; m < scene.meshes.length; m++) {
      var s = scene.meshes[m];
      for (k = 0; k < s.n; k++) {
        var x = s.NX[k];
        if (x !== x) { s.PX[k] = NaN; continue; }
        var y = s.NY[k], z = s.NZ[k];
        var x1 = x * cyw - y * syw, y1 = x * syw + y * cyw, camy = y1 * sp + z * cp, d = y1 * cp - z * sp, f = D / (D + d);
        s.PX[k] = W / 2 + x1 * f * S; s.PY[k] = H / 2 - camy * f * S; s.PD[k] = d; s.CX[k] = x1; s.CY[k] = camy;
      }
    }

    // gather drawable items, sorted back to front
    var itD = [], itM = [], itV = [];
    for (m = 0; m < scene.meshes.length; m++) {
      var s2 = scene.meshes[m], PX = s2.PX, PD = s2.PD;
      if (s2.type === "grid") {
        var nx = s2.nx;
        for (j = 0; j < s2.ny - 1; j++) {
          for (i = 0; i < nx - 1; i++) {
            k = j * nx + i;
            if (PX[k] !== PX[k] || PX[k + 1] !== PX[k + 1] || PX[k + nx] !== PX[k + nx] || PX[k + nx + 1] !== PX[k + nx + 1]) continue;
            itD.push(PD[k] + PD[k + 1] + PD[k + nx] + PD[k + nx + 1]); itM.push(m); itV.push(k);
          }
        }
      } else if (s2.type === "curve") {
        for (k = 0; k < s2.n - 1; k++) {
          if (PX[k] !== PX[k] || PX[k + 1] !== PX[k + 1]) continue;
          itD.push((PD[k] + PD[k + 1]) * 2); itM.push(m); itV.push(k);
        }
      } else if (PX[0] === PX[0]) { itD.push(PD[0] * 4); itM.push(m); itV.push(0); }
    }
    var ord = new Array(itD.length);
    for (i = 0; i < ord.length; i++) ord[i] = i;
    ord.sort(function (a, b) { return itD[b] - itD[a]; });

    var rgbBase = [], wire = opt.wire, solid = opt.solid, fast = opt.fast, lite = opt.lite;
    for (m = 0; m < scene.meshes.length; m++) rgbBase.push(hexRgb(scene.meshes[m].color));
    var lineCol = "rgba(7,6,15,0.30)";
    for (i = 0; i < ord.length; i++) {
      var it = ord[i], s3 = scene.meshes[itM[it]], v0 = itV[it];
      if (s3.type === "grid") {
        var nxx = s3.nx, v1 = v0 + 1, v3 = v0 + nxx, v2 = v3 + 1;
        var rgb;
        if (solid) rgb = rgbBase[itM[it]];
        else rgb = grad((s3.T[v0] + s3.T[v1] + s3.T[v2] + s3.T[v3]) / 4);
        var ax = s3.CX[v1] - s3.CX[v0], ay = s3.CY[v1] - s3.CY[v0], az = s3.PD[v1] - s3.PD[v0];
        var bx = s3.CX[v3] - s3.CX[v0], by = s3.CY[v3] - s3.CY[v0], bz = s3.PD[v3] - s3.PD[v0];
        var nX = ay * bz - az * by, nY = az * bx - ax * bz, nZ = ax * by - ay * bx;
        var nl = Math.sqrt(nX * nX + nY * nY + nZ * nZ) || 1;
        var sh = 0.42 + 0.58 * Math.abs((nX * LIGHT[0] + nY * LIGHT[1] + nZ * LIGHT[2]) / nl);
        var col = "rgb(" + ((rgb[0] * sh) | 0) + "," + ((rgb[1] * sh) | 0) + "," + ((rgb[2] * sh) | 0) + ")";
        ctx.beginPath();
        ctx.moveTo(s3.PX[v0], s3.PY[v0]); ctx.lineTo(s3.PX[v1], s3.PY[v1]);
        ctx.lineTo(s3.PX[v2], s3.PY[v2]); ctx.lineTo(s3.PX[v3], s3.PY[v3]);
        ctx.closePath();
        if (wire) { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke(); }
        else {
          ctx.fillStyle = col; ctx.fill();
          if (!fast && !lite) {
            if (opt.lines) { ctx.strokeStyle = lineCol; ctx.lineWidth = 0.7; } else { ctx.strokeStyle = col; ctx.lineWidth = 0.6; }
            ctx.stroke();
          }
        }
      } else if (s3.type === "curve") {
        ctx.beginPath();
        ctx.moveTo(s3.PX[v0], s3.PY[v0]); ctx.lineTo(s3.PX[v0 + 1], s3.PY[v0 + 1]);
        ctx.strokeStyle = s3.color; ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(s3.PX[0], s3.PY[0], 5.5, 0, Math.PI * 2);
        ctx.fillStyle = s3.color; ctx.fill();
        ctx.strokeStyle = "#07060f"; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    // axis edges + labels
    var c0 = pr(0, 0, 0), bd = scene.bounds;
    ctx.font = "11px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    function lab(text, pt, push, color) {
      var dx = pt[0] - c0[0], dy = pt[1] - c0[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      ctx.fillStyle = color || "rgba(238,240,255,0.75)";
      ctx.fillText(text, pt[0] + dx / len * push, pt[1] + dy / len * push + 4);
    }
    function axis(a, b, mid, lo, hi, name, color) {
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
      lab(lo, a, 14); lab(hi, b, 14); lab(name, mid, 26, color);
    }
    var ysg = pr(0, -box[1], -box[2])[2] < pr(0, box[1], -box[2])[2] ? -box[1] : box[1];
    axis(pr(-box[0], ysg, -box[2]), pr(box[0], ysg, -box[2]), pr(0, ysg, -box[2]), GE.fmt(bd.xmin), GE.fmt(bd.xmax), "x", "#5ef2ff");
    var xsg = pr(-box[0], 0, -box[2])[2] < pr(box[0], 0, -box[2])[2] ? -box[0] : box[0];
    axis(pr(xsg, -box[1], -box[2]), pr(xsg, box[1], -box[2]), pr(xsg, 0, -box[2]), GE.fmt(bd.ymin), GE.fmt(bd.ymax), "y", "#ff4fd8");
    var bestC = null, bestX = 1e9;
    for (i = 0; i < 4; i++) {
      var cx_ = (i & 1) ? box[0] : -box[0], cy_ = (i & 2) ? box[1] : -box[1], pp = pr(cx_, cy_, -box[2]);
      if (pp[0] < bestX) { bestX = pp[0]; bestC = [cx_, cy_]; }
    }
    axis(pr(bestC[0], bestC[1], -box[2]), pr(bestC[0], bestC[1], box[2]), pr(bestC[0], bestC[1], 0), GE.fmt(bd.zmin), GE.fmt(bd.zmax), "z", "#8b5cff");
    ctx.textAlign = "left";
  }

  return { draw2D: draw2D, build3D: build3D, draw3D: draw3D };
})();
if (typeof module !== "undefined") module.exports = GD;