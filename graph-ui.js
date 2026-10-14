// ===== Niki graph UI: view switch, function list, sliders, gallery, interaction =====
(function () {
  "use strict";

  var PAL = ["#5ef2ff", "#ff4fd8", "#8b5cff", "#3dffa2", "#ffc857", "#ff7a59", "#7aa2ff", "#e0e0ff"];
  var KIND = {
    cart: "y = f(x)", cartY: "x = f(y)", polar: "polar  r(θ)", param: "parametric  (x(t), y(t))",
    implicit: "implicit curve", ineq: "inequality (shaded)", point: "point",
    surf: "surface  z = f(x, y)", psurf: "parametric surface  (x(u,v), y(u,v), z(u,v))",
    curve3: "3D curve  (x(t), y(t), z(t))", point3: "3D point"
  };
  var TWO_PI = 6.2832, SIX_PI = 18.85;
  var PRESETS = [
    { n: "Sine & cosine", tag: "y = f(x)", rows: ["sin(x)", "cos(x)"], sc: 55, pi: true },
    { n: "Intersections", tag: "analysis", rows: ["x^2-2x-3", "x+1"], sc: 45, an: true },
    { n: "Sliders: a·sin(bx+c)", tag: "parameters", rows: ["a*sin(b*x+c)"], sc: 45 },
    { n: "Circle & ellipse", tag: "implicit", rows: ["x^2+y^2=25", "x^2/16+y^2/9=1"], sc: 40 },
    { n: "Hyperbola", tag: "implicit", rows: ["x^2/4-y^2/9=1", "y=1.5x", "y=-1.5x"], sc: 25 },
    { n: "Heart", tag: "implicit", rows: ["(x^2+y^2-1)^3 = x^2*y^3"], sc: 120 },
    { n: "Inequalities", tag: "shaded", rows: ["y>x^2-4", "x^2+y^2<=25"], sc: 40 },
    { n: "Rose", tag: "polar", rows: ["r=4cos(3θ)"], sc: 45, t: [0, TWO_PI] },
    { n: "Cardioid", tag: "polar", rows: ["r=2(1-cos(θ))"], sc: 45, t: [0, TWO_PI] },
    { n: "Spiral", tag: "polar", rows: ["r=θ/3"], sc: 25, t: [0, SIX_PI] },
    { n: "Lissajous", tag: "parametric", rows: ["(4sin(3t), 4sin(2t))"], sc: 45, t: [0, TWO_PI] },
    { n: "Epicycle", tag: "parametric", rows: ["(5cos(t)-cos(5t), 5sin(t)-sin(5t))"], sc: 28, t: [0, TWO_PI] },
    { n: "Tangent & asymptotes", tag: "y = f(x)", rows: ["tan(x)"], sc: 50, pi: true },
    { n: "Piecewise", tag: "y = f(x)", rows: ["(x<0)*(-x)+(x>=0)*x^2"], sc: 40 },
    { n: "Damped wave", tag: "y = f(x)", rows: ["e^(-x/5)*sin(3x)", "e^(-x/5)", "-e^(-x/5)"], sc: 35 },
    { n: "Taylor series of sin", tag: "y = f(x)", rows: ["sin(x)", "x-x^3/6+x^5/120", "x-x^3/6"], sc: 40 },
    { n: "Saddle", tag: "3D surface", dim: 3, rows: ["z = x^2 - y^2"], R: 3 },
    { n: "Ripples", tag: "3D surface", dim: 3, rows: ["z = 3sin(sqrt(x^2+y^2))/sqrt(x^2+y^2+1)"], R: 8, res: 44 },
    { n: "Egg crate", tag: "3D surface", dim: 3, rows: ["z = sin(x)*cos(y)"], R: 6 },
    { n: "Gaussian hill", tag: "3D surface", dim: 3, rows: ["z = 4e^(-(x^2+y^2)/4)"], R: 5 },
    { n: "Monkey saddle", tag: "3D surface", dim: 3, rows: ["z = x^3 - 3x*y^2"], R: 2 },
    { n: "Cone & plane", tag: "3D surface", dim: 3, rows: ["z = sqrt(x^2+y^2)", "z = 2"], R: 4 },
    { n: "Sphere", tag: "3D parametric", dim: 3, rows: ["(2sin(u)cos(v), 2sin(u)sin(v), 2cos(u))"], t: [0, TWO_PI] },
    { n: "Torus", tag: "3D parametric", dim: 3, rows: ["((3+cos(v))cos(u), (3+cos(v))sin(u), sin(v))"], t: [0, TWO_PI] },
    { n: "Möbius strip", tag: "3D parametric", dim: 3, rows: ["((3+(v-π)/π*cos(u/2))cos(u), (3+(v-π)/π*cos(u/2))sin(u), (v-π)/π*sin(u/2))"], t: [0, TWO_PI] },
    { n: "Helix", tag: "3D curve", dim: 3, rows: ["(2cos(t), 2sin(t), t/2)"], t: [0, SIX_PI] }
  ];
  var QUICK = [["x", "x"], ["y", "y"], ["t", "t"], ["π", "π"], ["θ", "θ"], ["^", "^"], ["√", "sqrt(|)"], ["|x|", "abs(|)"],
    ["(", "("], [")", ")"], ["sin", "sin(|)"], ["cos", "cos(|)"], ["tan", "tan(|)"], ["ln", "ln(|)"], ["eˣ", "e^(|)"],
    ["<", "<"], [">", ">"], ["=", "="], ["u", "u"], ["v", "v"]];
  var ANA_NAME = { zero: "Zero", yint: "y-intercept", max: "Local max", min: "Local min", int: "Intersection" };

  // ---------- helpers ----------
  function h(tag, props, kids) {
    var el = document.createElement(tag), k, i;
    if (props) {
      for (k in props) {
        if (k === "class") el.className = props[k];
        else if (k === "text") el.textContent = props[k];
        else if (k === "value") el.value = props[k];
        else if (k === "on") { for (var ev in props.on) el.addEventListener(ev, props.on[ev]); }
        else el.setAttribute(k, props[k]);
      }
    }
    if (kids) for (i = 0; i < kids.length; i++) el.appendChild(kids[i]);
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function hyp(a, b) { return Math.sqrt(a * a + b * b); }
  function r3(v) { return String(parseFloat(v.toFixed(3))); }

  // ---------- state ----------
  var G = {
    dim: 2, rows: [], rows2: [], rows3: [], P: {}, view: { cx: 0, cy: 0, sx: 55, sy: 55, piAxis: false }, lock: true,
    t0: 0, t1: TWO_PI, R: 5, res: 36, cam: { yaw: -0.8, pitch: 0.55, zoom: 1 }, auto: false, wire: false, solid: false,
    gridLines: true, eq: null, trace: false, traceInfo: null, lite: false, markers: [], analysis: false, scene: null, polys: [],
    fast: false, play: {}, phase: {}, pkey: null, pyReady: false
  };
  var W = 0, H = 0, DPR = 1, colorIdx = 0, lastRow = null, lastInput = null;
  var dirty = true, raf = 0, lastT = 0, slow = 0, saveT = 0, anaT = 0, fastT = 0, built = false;
  var gview, stage, canvas, ctx, rowsEl, paramsEl, anaEl, readout, dimBtn, lockBtn, tools = {}, pUI = {}, liteBox, setInputs = {}, pages = {}, tabBtns = {};

  try {
    if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2)) G.lite = true;
  } catch (e0) { /* ignore */ }

  // ---------- rows ----------
  function newRow(text) {
    var r = { text: text || "", color: PAL[colorIdx++ % PAL.length], visible: true, c: null, err: "", ui: null };
    compileRow(r);
    return r;
  }
  function compileRow(r) {
    try { r.c = GE.classify(r.text, G.dim, G.P); r.err = ""; }
    catch (e) { r.c = null; r.err = e && e.message ? e.message : String(e); }
  }
  function usedParams() {
    var seen = {}, out = [], i, j;
    for (i = 0; i < G.rows.length; i++) {
      var c = G.rows[i].c;
      if (!c || !G.rows[i].visible) continue;
      for (j = 0; j < c.params.length; j++) if (!seen[c.params[j]]) { seen[c.params[j]] = 1; out.push(c.params[j]); }
    }
    out.sort();
    return out;
  }

  // ---------- persistence ----------
  var KEY = "niki.graph.v1";
  function ser(rows) { return rows.map(function (r) { return { t: r.text, c: r.color, o: r.visible }; }); }
  function des(list) {
    return list.map(function (o) { var r = newRow(o.t); r.color = o.c || r.color; r.visible = o.o !== false; return r; });
  }
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          d: G.dim, r2: ser(G.rows2), r3: ser(G.rows3), P: G.P, v: G.view, t0: G.t0, t1: G.t1, R: G.R, res: G.res, cam: G.cam
        }));
      } catch (e) { /* storage unavailable */ }
    }, 400);
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (!s) return false;
      if (s.P) G.P = s.P;
      G.dim = s.d === 3 ? 3 : 2;
      G.rows2 = des(s.r2 || []); G.rows3 = des(s.r3 || []);
      if (s.v) { G.view.cx = s.v.cx; G.view.cy = s.v.cy; G.view.sx = s.v.sx; G.view.sy = s.v.sy; G.view.piAxis = !!s.v.piAxis; }
      if (typeof s.t0 === "number") { G.t0 = s.t0; G.t1 = s.t1; }
      if (typeof s.R === "number") G.R = s.R;
      if (typeof s.res === "number") G.res = s.res;
      if (s.cam) G.cam = s.cam;
      return true;
    } catch (e) { return false; }
  }

  // ---------- python helpers (derivative / integral rows) ----------
  var GPY = [
    "def g_calc(kind, text):",
    "    x = Symbol('x')",
    "    e = parse(clean(text))",
    "    if kind == 'd':",
    "        r = diff(e, x)",
    "    elif kind == 'd2':",
    "        r = diff(e, x, 2)",
    "    else:",
    "        r = integrate(e, x)",
    "    return str(r).replace('**', '^')"
  ].join("\n");
  function pyCalc(kind, expr) {
    var py = window.pyodide;
    if (!py) throw new Error("Python is still loading. Try again in a moment.");
    if (!G.pyReady) { py.runPython(GPY); G.pyReady = true; }
    return py.globals.get("g_calc")(kind, expr);
  }

  // ---------- render loop ----------
  function visible() { return document.body.dataset.view === "graph"; }
  function invalidate() { dirty = true; if (!raf && visible()) raf = requestAnimationFrame(frame); }
  function anyPlaying() { for (var k in G.play) if (G.play[k]) return true; return false; }
  function stepParams(dt) {
    for (var n in G.play) {
      if (!G.play[n] || !pUI[n]) continue;
      var ui = pUI[n], lo = parseFloat(ui.range.min), hi = parseFloat(ui.range.max);
      G.phase[n] = ((G.phase[n] || 0) + dt / 2500) % 2;
      var ph = G.phase[n], tri = ph < 1 ? ph : 2 - ph, v = lo + (hi - lo) * tri;
      G.P[n] = v;
      ui.range.value = String(v);
      ui.num.value = r3(v);
    }
    G.scene = null;
    scheduleAnalysis();
  }
  function frame(ts) {
    raf = 0;
    if (!visible()) return;
    var dt = lastT ? Math.min(ts - lastT, 100) : 16;
    lastT = ts;
    var spin = G.auto && G.dim === 3, play = anyPlaying();
    if (spin) { G.cam.yaw += dt * 0.0004; dirty = true; }
    if (play) { stepParams(dt); dirty = true; }
    if (dirty) { dirty = false; render(); }
    if (spin || play) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function res3() { return G.lite ? Math.min(G.res, 24) : G.res; }
  function render() {
    if (!W) return;
    var t = now();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (G.dim === 2) {
      var out = GD.draw2D(ctx, W, H, {
        view: G.view, rows: G.rows, t0: G.t0, t1: G.t1, lite: G.lite, fast: G.fast,
        markers: G.analysis ? G.markers : null, trace: G.traceInfo
      });
      G.polys = out.lines;
    } else {
      if (!G.scene) G.scene = GD.build3D(G.rows, { R: G.R, res: res3(), t0: G.t0, t1: G.t1, equal: G.eq });
      GD.draw3D(ctx, W, H, G.scene, G.cam, { wire: G.wire, lite: G.lite, fast: G.fast, solid: G.solid, lines: G.gridLines });
    }
    var ms = now() - t;
    slow = ms > 36 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 10 && !G.lite) { G.lite = true; slow = 0; if (liteBox) liteBox.checked = true; G.scene = null; resize(true); invalidate(); }
  }
  function resize(force) {
    if (!stage || !visible()) return;
    var rect = stage.getBoundingClientRect();
    var w = Math.max(120, Math.floor(rect.width)), hh = Math.max(120, Math.floor(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, G.lite ? 1.5 : 2);
    if (!force && w === W && hh === H && dpr === DPR) return;
    W = w; H = hh; DPR = dpr;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    invalidate();
  }
  function pulseFast() {
    G.fast = true;
    clearTimeout(fastT);
    fastT = setTimeout(function () { G.fast = false; invalidate(); }, 170);
  }

  // ---------- analysis ----------
  function scheduleAnalysis() {
    if (G.dim !== 2 || !G.analysis || !W) return;
    clearTimeout(anaT);
    anaT = setTimeout(function () {
      var v = G.view;
      G.markers = GE.analyse(G.rows, v.cx - W / 2 / v.sx, v.cx + W / 2 / v.sx);
      renderAnalysis();
      invalidate();
    }, 120);
  }
  function renderAnalysis() {
    clear(anaEl);
    if (G.dim !== 2) { anaEl.appendChild(h("div", { class: "ghint", text: "Analysis works on 2D  y = f(x)  graphs." })); return; }
    if (!G.analysis) { anaEl.appendChild(h("div", { class: "ghint", text: "Turn this on to mark zeros, peaks, valleys, y-intercepts and intersections of your y = f(x) curves." })); return; }
    if (!G.markers.length) { anaEl.appendChild(h("div", { class: "ghint", text: "Nothing found in the visible window. Try zooming out." })); return; }
    G.markers.forEach(function (m) {
      anaEl.appendChild(h("button", {
        class: "gmark", text: (ANA_NAME[m.type] || m.type) + "   (" + GE.fmt(m.x) + ", " + GE.fmt(m.y) + ")",
        on: { click: function () { G.view.cx = m.x; G.view.cy = m.y; viewChanged(); } }
      }));
    });
  }

  // ---------- view changes / interaction ----------
  function viewChanged() { G.traceInfo = null; invalidate(); scheduleAnalysis(); save(); }
  function zoom2D(fx, fy, ax, ay) {
    var v = G.view;
    var wx = v.cx + (ax - W / 2) / v.sx, wy = v.cy - (ay - H / 2) / v.sy;
    v.sx = clamp(v.sx * fx, 1e-3, 1e8);
    v.sy = clamp(v.sy * fy, 1e-3, 1e8);
    v.cx = wx - (ax - W / 2) / v.sx;
    v.cy = wy + (ay - H / 2) / v.sy;
    viewChanged();
  }
  function zoomBy(f) {
    if (G.dim === 3) { G.cam.zoom = clamp(G.cam.zoom * f, 0.3, 6); invalidate(); save(); }
    else zoom2D(f, f, W / 2, H / 2);
  }
  function resetView() {
    if (G.dim === 3) { G.cam = { yaw: -0.8, pitch: 0.55, zoom: 1 }; invalidate(); }
    else { G.view.cx = 0; G.view.cy = 0; G.view.sx = 55; G.view.sy = 55; viewChanged(); }
    save();
  }
  function doTrace(px, py) {
    if (G.dim !== 2) return;
    var v = G.view, best = null, bd = 3600, i, j, d2, wx, wy, r;
    if (G.analysis) {
      for (i = 0; i < G.markers.length; i++) {
        var m = G.markers[i], sx = W / 2 + (m.x - v.cx) * v.sx, sy = H / 2 - (m.y - v.cy) * v.sy;
        d2 = (sx - px) * (sx - px) + (sy - py) * (sy - py);
        if (d2 < 400 && d2 < bd) { bd = d2; best = { sx: sx, sy: sy, wx: m.x, wy: m.y, color: "#fff", tag: ANA_NAME[m.type] }; }
      }
    }
    wx = v.cx + (px - W / 2) / v.sx;
    for (i = 0; i < G.rows.length; i++) {
      r = G.rows[i];
      if (!r.visible || !r.c || r.c.kind !== "cart") continue;
      var y = r.c.f(wx, 0, 0, 0, 0);
      if (!isFinite(y)) continue;
      var syy = H / 2 - (y - v.cy) * v.sy;
      d2 = (syy - py) * (syy - py);
      if (d2 < bd) { bd = d2; best = { sx: px, sy: syy, wx: wx, wy: y, color: r.color }; }
    }
    for (i = 0; i < G.polys.length; i++) {
      var L = G.polys[i], row = G.rows[L.ri];
      if (L.kind === "cart") continue;
      var stp = L.seg ? 4 : 2;
      for (j = 0; j < L.pts.length; j += stp) {
        var qx = L.pts[j], qy = L.pts[j + 1];
        if (qx !== qx) continue;
        d2 = (qx - px) * (qx - px) + (qy - py) * (qy - py);
        if (d2 < bd) { bd = d2; best = { sx: qx, sy: qy, wx: v.cx + (qx - W / 2) / v.sx, wy: v.cy - (qy - H / 2) / v.sy, color: row.color }; }
      }
    }
    if (best) {
      var txt = (best.tag ? best.tag + "  " : "") + "(" + GE.fmt(best.wx) + ", " + GE.fmt(best.wy) + ")";
      G.traceInfo = { sx: best.sx, sy: best.sy, text: txt, color: best.color };
      readout.textContent = txt;
    } else { G.traceInfo = null; readout.textContent = ""; }
    invalidate();
  }

  function wireInteraction() {
    var ptrs = {}, last = null;
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function count() { return Object.keys(ptrs).length; }
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      var p = pos(e);
      ptrs[e.pointerId] = { x: p.x, y: p.y, type: e.pointerType };
      last = null;
      G.fast = true; clearTimeout(fastT);
      if (G.dim === 2 && G.trace && count() === 1) doTrace(p.x, p.y);
    });
    canvas.addEventListener("pointermove", function (e) {
      var p = pos(e), q = ptrs[e.pointerId];
      if (!q) { if (e.pointerType === "mouse" && G.dim === 2 && G.trace) doTrace(p.x, p.y); return; }
      var dx = p.x - q.x, dy = p.y - q.y;
      q.x = p.x; q.y = p.y;
      var ids = Object.keys(ptrs);
      if (ids.length === 1) {
        if (G.dim === 3) { G.cam.yaw += dx * 0.01; G.cam.pitch = clamp(G.cam.pitch + dy * 0.01, -1.5, 1.5); invalidate(); }
        else if (G.trace && q.type !== "mouse") doTrace(p.x, p.y);
        else { G.view.cx -= dx / G.view.sx; G.view.cy += dy / G.view.sy; viewChanged(); }
      } else if (ids.length >= 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var dist = hyp(a.x - b.x, a.y - b.y), ddx = Math.abs(a.x - b.x), ddy = Math.abs(a.y - b.y);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (last && last.dist > 10) {
          var f = clamp(dist / last.dist, 0.5, 2);
          if (G.dim === 3) { G.cam.zoom = clamp(G.cam.zoom * f, 0.3, 6); invalidate(); }
          else {
            var fx = f, fy = f;
            if (!G.lock) {
              if (last.ddx > 30 && ddx > 30) fx = clamp(ddx / last.ddx, 0.5, 2);
              if (last.ddy > 30 && ddy > 30) fy = clamp(ddy / last.ddy, 0.5, 2);
            }
            zoom2D(fx, fy, mx, my);
            G.view.cx -= (mx - last.mx) / G.view.sx;
            G.view.cy += (my - last.my) / G.view.sy;
            viewChanged();
          }
        }
        last = { dist: dist, ddx: ddx, ddy: ddy, mx: mx, my: my };
      }
    });
    function up(e) {
      delete ptrs[e.pointerId];
      last = null;
      if (!count()) pulseFast();
    }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var p = pos(e), f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
      pulseFast();
      if (G.dim === 3) { G.cam.zoom = clamp(G.cam.zoom * f, 0.3, 6); invalidate(); return; }
      var fx = f, fy = f;
      if (e.shiftKey) { fy = 1; setLock(false); }
      else if (e.altKey) { fx = 1; setLock(false); }
      zoom2D(fx, fy, p.x, p.y);
    }, { passive: false });
  }

  // ---------- UI building ----------
  function toolBtn(id, glyph, title, cls, fn) {
    var b = h("button", { class: "gtool " + (cls || ""), title: title, text: glyph, on: { click: fn } });
    tools[id] = b;
    return b;
  }
  function setLock(v) {
    G.lock = v;
    if (v) { G.view.sy = G.view.sx; viewChanged(); }
    syncUI();
  }
  function syncUI() {
    if (!built) return;
    tools.trace.classList.toggle("on", G.trace);
    tools.pi.classList.toggle("on", G.view.piAxis);
    tools.auto.classList.toggle("on", G.auto);
    tools.wire.classList.toggle("on", G.wire);
    tools.col.classList.toggle("on", G.solid);
    var eqOn = G.dim === 3 ? (G.eq === null ? !!(G.scene && G.scene.equal) : G.eq) : G.lock;
    tools.eq.classList.toggle("on", eqOn);
    dimBtn.textContent = G.dim === 2 ? "3D" : "2D";
    gview.setAttribute("data-dim", String(G.dim));
    if (setInputs.t0) { setInputs.t0.value = r3(G.t0); setInputs.t1.value = r3(G.t1); setInputs.R.value = r3(G.R); setInputs.res.value = String(G.res); }
    if (liteBox) liteBox.checked = G.lite;
    if (setInputs.an) setInputs.an.classList.toggle("on", G.analysis);
    if (setInputs.an) setInputs.an.textContent = G.analysis ? "Points of interest: ON" : "Points of interest: OFF";
  }
  function setDim(d) {
    G.dim = d;
    G.rows = d === 2 ? G.rows2 : G.rows3;
    var i;
    for (i = 0; i < G.rows.length; i++) compileRow(G.rows[i]);
    G.scene = null; G.traceInfo = null; readout.textContent = "";
    renderRows(); refreshParams(true); renderAnalysis(); syncUI(); scheduleAnalysis(); invalidate(); save();
  }
  function changed() { G.scene = null; refreshParams(false); scheduleAnalysis(); invalidate(); save(); }

  function setInfo(r) {
    if (!r.ui) return;
    r.ui.info.className = r.err ? "gerr" : "ginfo";
    r.ui.info.textContent = r.err || (r.c ? KIND[r.c.kind] : "");
  }
  function insertInto(input, row, raw) {
    var mark = raw.indexOf("|"), s = input.selectionStart, e = input.selectionEnd;
    if (s === null || s === undefined) { s = e = input.value.length; }
    if (mark >= 0 && s !== e) {
      var sel = input.value.slice(s, e);
      input.setRangeText(raw.slice(0, mark) + sel + raw.slice(mark + 1), s, e, "end");
    } else {
      input.setRangeText(raw.replace("|", ""), s, e, "end");
      if (mark >= 0) input.setSelectionRange(s + mark, s + mark);
    }
    row.text = input.value;
    compileRow(row); setInfo(row); changed();
    input.focus();
  }
  function addRow(text, at, focus) {
    var r = newRow(text);
    G.rows.splice(at === undefined ? G.rows.length : at, 0, r);
    renderRows();
    if (focus && r.ui) r.ui.input.focus();
    changed();
    return r;
  }
  function transform(r, kind) {
    try {
      if (!r.c || r.c.kind !== "cart") throw new Error("Works on  y = f(x)  rows");
      var out = String(pyCalc(kind, r.c.expr)).trim();
      var words = out.toLowerCase().match(/[a-z]+/g) || [], i;
      for (i = 0; i < words.length; i++) if (!GE.isKnownWord(words[i])) throw new Error("Result uses " + words[i] + "( … ), which can't be graphed");
      addRow(out, G.rows.indexOf(r) + 1, false);
    } catch (e) { r.err = e && e.message ? e.message : String(e); setInfo(r); }
  }
  function rowEl(r) {
    var dot = h("button", { class: "gdot" + (r.visible ? "" : " off"), title: "Show / hide", style: "--c:" + r.color });
    var input = h("input", {
      class: "gin", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
      placeholder: G.dim === 2 ? "sin(x),  x^2+y^2=9,  r=2cos(3θ) …" : "z = sin(x)*cos(y),  (x(u,v), y(u,v), z(u,v)) …", value: r.text
    });
    var info = h("div", { class: "ginfo" });
    var bd = h("button", { class: "gb only2", title: "Add derivative (uses Python)", text: "f′" });
    var bi = h("button", { class: "gb only2", title: "Add integral (uses Python)", text: "∫" });
    var bx = h("button", { class: "gb", title: "Remove", text: "✕" });
    r.ui = { input: input, info: info, dot: dot };
    dot.addEventListener("click", function () { r.visible = !r.visible; dot.classList.toggle("off", !r.visible); changed(); });
    input.addEventListener("focus", function () { lastRow = r; lastInput = input; });
    input.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); addRow("", G.rows.indexOf(r) + 1, true); }
    });
    input.addEventListener("input", function () { r.text = input.value; compileRow(r); setInfo(r); changed(); });
    bd.addEventListener("click", function () { transform(r, "d"); });
    bi.addEventListener("click", function () { transform(r, "i"); });
    bx.addEventListener("click", function () {
      var i = G.rows.indexOf(r);
      if (i >= 0) G.rows.splice(i, 1);
      renderRows(); changed();
    });
    setInfo(r);
    return h("div", { class: "grow" }, [dot, input, h("div", { class: "gbtns" }, [bd, bi, bx]), info]);
  }
  function renderRows() {
    clear(rowsEl);
    for (var i = 0; i < G.rows.length; i++) rowsEl.appendChild(rowEl(G.rows[i]));
    if (!G.rows.length) rowsEl.appendChild(h("div", { class: "ghint", text: "Nothing here yet. Tap + Add, or open the Gallery." }));
  }

  function refreshParams(force) {
    var names = usedParams(), key = names.join(",");
    if (!force && key === G.pkey) return;
    G.pkey = key;
    var n;
    for (n in G.play) if (names.indexOf(n) < 0) delete G.play[n];
    clear(paramsEl);
    pUI = {};
    if (!names.length) {
      paramsEl.appendChild(h("div", { class: "ghint", text: "Use letters like a, b, k in an expression (for example  a*sin(b*x) ) and a slider appears here." }));
      return;
    }
    names.forEach(function (name) { paramsEl.appendChild(paramEl(name)); });
  }
  function paramEl(n) {
    var val = G.P[n], m = Math.max(10, Math.ceil(Math.abs(val) * 1.5));
    var range = h("input", { type: "range", min: String(-m), max: String(m), step: "0.01", value: String(val), class: "grange" });
    var num = h("input", { type: "number", step: "any", value: r3(val), class: "gnum" });
    var play = h("button", { class: "gplay", title: "Animate", text: G.play[n] ? "⏸" : "▶" });
    function set(v) {
      G.P[n] = v; G.scene = null; scheduleAnalysis(); invalidate(); save();
    }
    range.addEventListener("input", function () { var v = parseFloat(range.value); num.value = r3(v); set(v); });
    num.addEventListener("input", function () {
      var v = parseFloat(num.value);
      if (isNaN(v)) return;
      var mm = Math.max(10, Math.ceil(Math.abs(v) * 1.5));
      if (mm > parseFloat(range.max)) { range.min = String(-mm); range.max = String(mm); }
      range.value = String(v);
      set(v);
    });
    play.addEventListener("click", function () { G.play[n] = !G.play[n]; play.textContent = G.play[n] ? "⏸" : "▶"; invalidate(); });
    pUI[n] = { range: range, num: num, play: play };
    return h("div", { class: "gparam" }, [h("span", { class: "gname", text: n }), range, num, play]);
  }

  function field(label, input) { return h("label", { class: "gfield" }, [h("span", { text: label }), input]); }
  function numInput(key, onSet) {
    var inp = h("input", { type: "number", step: "any", class: "gnum" });
    inp.addEventListener("input", function () { var v = parseFloat(inp.value); if (!isNaN(v)) onSet(v); });
    setInputs[key] = inp;
    return inp;
  }
  function loadPreset(p) {
    var dim = p.dim || 2, i, list = [];
    for (i = 0; i < p.rows.length; i++) { var r = newRow(p.rows[i]); r.color = PAL[i % PAL.length]; list.push(r); }
    if (dim === 2) {
      G.rows2 = list; G.view.cx = 0; G.view.cy = 0; G.view.sx = G.view.sy = p.sc || 50;
      G.view.piAxis = !!p.pi; G.analysis = !!p.an; G.markers = []; G.lock = true;
    } else {
      G.rows3 = list; G.R = p.R || 5; if (p.res) G.res = p.res; G.cam = { yaw: -0.8, pitch: 0.55, zoom: 1 }; G.eq = null;
    }
    if (p.t) { G.t0 = p.t[0]; G.t1 = p.t[1]; }
    setDim(dim);
    showPage("fn");
  }
  function showPage(name) {
    for (var k in pages) { pages[k].classList.toggle("active", k === name); tabBtns[k].classList.toggle("active", k === name); }
  }
  function savePNG() {
    var tmp = document.createElement("canvas");
    tmp.width = canvas.width; tmp.height = canvas.height;
    var t = tmp.getContext("2d");
    t.fillStyle = "#0b0a18"; t.fillRect(0, 0, tmp.width, tmp.height);
    t.drawImage(canvas, 0, 0);
    var a = document.createElement("a");
    a.href = tmp.toDataURL("image/png"); a.download = "niki-graph.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function build() {
    var app = document.querySelector(".app"), header = document.querySelector("header");

    // view switch in the header
    var bCalc = h("button", { class: "active", text: "Calc" }), bGraph = h("button", { text: "Graph" });
    header.insertBefore(h("div", { class: "viewswitch" }, [bCalc, bGraph]), document.getElementById("status"));
    function setView(v) {
      document.body.setAttribute("data-view", v);
      bCalc.classList.toggle("active", v === "calc");
      bGraph.classList.toggle("active", v === "graph");
      if (v === "graph") { resize(true); invalidate(); }
    }
    bCalc.addEventListener("click", function () { setView("calc"); });
    bGraph.addEventListener("click", function () { setView("graph"); resize(true); });
    document.body.setAttribute("data-view", "calc");

    // stage: canvas + tools
    canvas = h("canvas", { class: "gcanvas" });
    ctx = canvas.getContext("2d");
    readout = h("div", { class: "greadout" });
    dimBtn = toolBtn("dim", "3D", "Switch 2D / 3D", "gdim", function () { setDim(G.dim === 2 ? 3 : 2); });
    var toolsEl = h("div", { class: "gtools" }, [
      dimBtn,
      toolBtn("zin", "+", "Zoom in", "", function () { zoomBy(1.3); }),
      toolBtn("zout", "−", "Zoom out", "", function () { zoomBy(1 / 1.3); }),
      toolBtn("home", "⌂", "Reset view", "", resetView),
      toolBtn("trace", "◎", "Trace a curve (tap or hover)", "only2", function () { G.trace = !G.trace; if (!G.trace) { G.traceInfo = null; readout.textContent = ""; } syncUI(); invalidate(); }),
      toolBtn("eq", "1:1", "Equal axes", "", function () {
        if (G.dim === 2) setLock(!G.lock);
        else { G.eq = !(G.eq === null ? !!(G.scene && G.scene.equal) : G.eq); G.scene = null; syncUI(); invalidate(); }
      }),
      toolBtn("pi", "π", "Label the x-axis in multiples of π", "only2", function () { G.view.piAxis = !G.view.piAxis; syncUI(); viewChanged(); }),
      toolBtn("auto", "⟳", "Auto-rotate", "only3", function () { G.auto = !G.auto; syncUI(); invalidate(); }),
      toolBtn("wire", "▦", "Wireframe", "only3", function () { G.wire = !G.wire; syncUI(); invalidate(); }),
      toolBtn("col", "◐", "Colour: height gradient / solid", "only3", function () { G.solid = !G.solid; syncUI(); invalidate(); }),
      toolBtn("save", "⤓", "Save as image", "", savePNG)
    ]);
    stage = h("div", { class: "gstage" }, [canvas, toolsEl, readout]);

    // panel pages
    rowsEl = h("div", { class: "grows" });
    var keys = h("div", { class: "gkeys" });
    QUICK.forEach(function (q) {
      keys.appendChild(h("button", { class: "gkey", text: q[0], on: { click: function () {
        var row = lastRow && G.rows.indexOf(lastRow) >= 0 ? lastRow : G.rows[G.rows.length - 1];
        if (!row) row = addRow("", 0, false);
        insertInto(row.ui.input, row, q[1]);
      } } }));
    });
    keys.addEventListener("mousedown", function (e) { e.preventDefault(); });
    var addBtn = h("button", { class: "gadd", text: "+ Add", on: { click: function () { addRow("", undefined, true); } } });
    pages.fn = h("div", { class: "gpage active" }, [rowsEl, h("div", { class: "gactions" }, [addBtn]), keys]);

    paramsEl = h("div", { class: "gparams" });
    liteBox = h("input", { type: "checkbox" });
    liteBox.addEventListener("change", function () { G.lite = liteBox.checked; G.scene = null; resize(true); invalidate(); });
    var resInput = h("input", { type: "range", min: "12", max: "80", step: "4", class: "grange" });
    setInputs.res = resInput;
    resInput.addEventListener("input", function () { G.res = parseInt(resInput.value, 10); G.scene = null; invalidate(); save(); });
    var settings = h("div", { class: "gsettings" }, [
      h("div", { class: "gh", text: "Ranges" }),
      field("t, θ, u, v from", numInput("t0", function (v) { G.t0 = v; G.scene = null; invalidate(); save(); })),
      field("to", numInput("t1", function (v) { G.t1 = v; G.scene = null; invalidate(); save(); })),
      h("div", { class: "gfield only3" }, [h("span", { text: "3D domain  ±" }), numInput("R", function (v) { if (v > 0) { G.R = v; G.scene = null; invalidate(); save(); } })]),
      h("div", { class: "gfield only3" }, [h("span", { text: "3D detail" }), resInput]),
      h("label", { class: "gfield" }, [h("span", { text: "Lite mode (faster on old phones)" }), liteBox])
    ]);
    pages.par = h("div", { class: "gpage" }, [h("div", { class: "gh", text: "Sliders" }), paramsEl, settings]);

    var gal = h("div", { class: "ggal" });
    PRESETS.forEach(function (p) {
      gal.appendChild(h("button", { class: "gtile", on: { click: function () { loadPreset(p); } } },
        [h("b", { text: p.n }), h("small", { text: p.tag })]));
    });
    pages.gal = h("div", { class: "gpage" }, [gal]);

    anaEl = h("div", { class: "ganalist" });
    var anaBtn = h("button", { class: "gadd", text: "Points of interest: OFF", on: { click: function () {
      G.analysis = !G.analysis; G.markers = []; renderAnalysis(); syncUI(); scheduleAnalysis(); invalidate();
    } } });
    setInputs.an = anaBtn;
    pages.ana = h("div", { class: "gpage" }, [anaBtn, anaEl]);

    var tabs = h("div", { class: "gtabs" });
    [["fn", "Functions"], ["par", "Sliders"], ["gal", "Gallery"], ["ana", "Analyse"]].forEach(function (t) {
      var b = h("button", { class: t[0] === "fn" ? "active" : "", text: t[1], on: { click: function () { showPage(t[0]); } } });
      tabBtns[t[0]] = b; tabs.appendChild(b);
    });
    var panel = h("div", { class: "gpanel" }, [tabs, h("div", { class: "gpages" }, [pages.fn, pages.par, pages.gal, pages.ana])]);

    gview = h("section", { class: "gview glass", "data-dim": "2" }, [stage, panel]);
    app.appendChild(gview);
    built = true;

    wireInteraction();
    if (window.ResizeObserver) new ResizeObserver(function () { resize(false); }).observe(stage);
    window.addEventListener("resize", function () { resize(false); });
  }

  // ---------- init ----------
  function init() {
    build();
    if (!load()) {
      G.rows2 = [newRow("sin(x)"), newRow("x^2/8")];
      G.rows3 = [newRow("z = sin(x)*cos(y)")];
    }
    if (!G.rows2.length) G.rows2 = [newRow("sin(x)")];
    if (!G.rows3.length) G.rows3 = [newRow("z = sin(x)*cos(y)")];
    G.lock = Math.abs(G.view.sx - G.view.sy) < 1e-9;
    setDim(G.dim);
  }
  init();

  window.NikiGraph = { state: G, presets: PRESETS };
})();