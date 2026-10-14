// ===== Niki graph engine: expression compiler, row classifier, analysis =====
// Pure logic (no DOM). Written in plain ES5-style JS so it runs on old phones.
var GE = (function () {
  "use strict";

  function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
      1.5056327351493116e-7];
    var x = c[0];
    for (var i = 1; i < 9; i++) x += c[i] / (z + i);
    var t = z + 7.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  var F = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    sec: function (x) { return 1 / Math.cos(x); },
    csc: function (x) { return 1 / Math.sin(x); },
    cot: function (x) { return 1 / Math.tan(x); },
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log,
    log: function (x, b) { return b === undefined ? Math.log(x) : Math.log(x) / Math.log(b); },
    log10: Math.log10, log2: Math.log2,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sign: Math.sign, atan2: Math.atan2, min: Math.min, max: Math.max,
    mod: function (a, b) { return ((a % b) + b) % b; },
    pow: Math.pow,
    root: function (x, n) { return x < 0 && n % 2 !== 0 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n); },
    gamma: gamma,
    fact: function (n) {
      if (n >= 0 && n <= 170 && Math.abs(n - Math.round(n)) < 1e-12) {
        var r = 1; for (var i = 2; i <= Math.round(n); i++) r *= i; return r;
      }
      return gamma(n + 1);
    },
    frac: function (x) { return x - Math.floor(x); }
  };
  var ALIAS = { arcsin: "asin", arccos: "acos", arctan: "atan", ceiling: "ceil", sgn: "sign" };
  var VARS = { x: 1, y: 1, t: 1, u: 1, v: 1 };

  var NAMES = Object.keys(F).concat(Object.keys(ALIAS), ["pi", "tau", "theta"]);
  NAMES.sort(function (a, b) { return b.length - a.length; });

  function isFunc(n) { return Object.prototype.hasOwnProperty.call(F, ALIAS[n] || n); }

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/π/g, "pi").replace(/θ/g, "theta").replace(/τ/g, "tau")
      .replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-")
      .replace(/√/g, "sqrt").replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/\*\*/g, "^").replace(/≤/g, "<=").replace(/≥/g, ">=")
      .replace(/[\[{]/g, "(").replace(/[\]}]/g, ")");
  }

  function splitWord(w) {
    var out = [], i = 0;
    while (i < w.length) {
      var hit = null;
      for (var k = 0; k < NAMES.length; k++) {
        if (w.substr(i, NAMES[k].length) === NAMES[k]) { hit = NAMES[k]; break; }
      }
      if (!hit) hit = w.charAt(i);
      out.push(hit);
      i += hit.length;
    }
    return out;
  }

  function tokenize(src) {
    var s = norm(src), i = 0, toks = [], bars = 0, m, c, rest;
    while (i < s.length) {
      c = s.charAt(i);
      rest = s.slice(i);
      if (c === " " || c === "\t") { i++; continue; }
      if ((c >= "0" && c <= "9") || c === ".") {
        m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(rest);
        if (!m) throw new Error("Bad number");
        toks.push({ t: "num", v: m[0] });
        i += m[0].length;
        continue;
      }
      if (c >= "a" && c <= "z") {
        var w = /^[a-z]+/.exec(rest)[0];
        i += w.length;
        var m2 = (w === "log" || w === "atan") ? /^(10|2)(?=\()/.exec(s.slice(i)) : null;
        if (m2 && isFunc(w + m2[0])) { toks.push({ t: "id", v: w + m2[0] }); i += m2[0].length; continue; }
        var parts = splitWord(w);
        for (var p = 0; p < parts.length; p++) toks.push({ t: "id", v: parts[p] });
        continue;
      }
      if (c === "<" || c === ">") {
        if (s.charAt(i + 1) === "=") { toks.push({ t: "op", v: c + "=" }); i += 2; }
        else { toks.push({ t: "op", v: c }); i++; }
        continue;
      }
      if ("+-*/^(),!=".indexOf(c) >= 0) { toks.push({ t: "op", v: c }); i++; continue; }
      if (c === "|") {
        var prev = toks[toks.length - 1];
        var opening = bars === 0 || (prev && prev.t === "op" && prev.v !== ")" && prev.v !== "!");
        if (opening) { toks.push({ t: "id", v: "abs" }, { t: "op", v: "(" }); bars++; }
        else { toks.push({ t: "op", v: ")" }); bars--; }
        i++;
        continue;
      }
      throw new Error("Unexpected '" + c + "'");
    }
    if (bars) throw new Error("Unmatched |");
    return toks;
  }

  function implicit(toks) {
    var out = [];
    for (var i = 0; i < toks.length; i++) {
      var cur = toks[i], prev = out[out.length - 1];
      if (prev) {
        var prevFunc = prev.t === "id" && isFunc(prev.v);
        if (prevFunc && !(cur.t === "op" && cur.v === "(")) throw new Error("Use brackets: " + prev.v + "( … )");
        var enders = prev.t === "num" || (prev.t === "id" && !prevFunc) ||
          (prev.t === "op" && (prev.v === ")" || prev.v === "!"));
        var starts = cur.t === "num" || cur.t === "id" || (cur.t === "op" && cur.v === "(");
        if (enders && starts) out.push({ t: "op", v: "*" });
      }
      out.push(cur);
    }
    var last = out[out.length - 1];
    if (last && last.t === "id" && isFunc(last.v)) throw new Error("Use brackets: " + last.v + "( … )");
    return out;
  }

  function parseTokens(toks, st) {
    var i = 0;
    function isOp(v) { var k = toks[i]; return !!k && k.t === "op" && k.v === v; }
    function expect(v) { if (!isOp(v)) throw new Error("Missing '" + v + "'"); i++; }
    function cmp() {
      var a = add();
      while (isOp("<") || isOp(">") || isOp("<=") || isOp(">=")) {
        var op = toks[i++].v, b = add();
        a = "(+(" + a + op + b + "))";
      }
      return a;
    }
    function add() {
      var a = mul();
      while (isOp("+") || isOp("-")) { var op = toks[i++].v, b = mul(); a = "(" + a + op + b + ")"; }
      return a;
    }
    function mul() {
      var a = unary();
      while (isOp("*") || isOp("/")) { var op = toks[i++].v, b = unary(); a = "(" + a + op + b + ")"; }
      return a;
    }
    function unary() {
      if (isOp("-")) { i++; return "(-" + unary() + ")"; }
      if (isOp("+")) { i++; return unary(); }
      return power();
    }
    function power() {
      var a = postfix();
      if (isOp("^")) { i++; var b = unary(); return "Math.pow(" + a + "," + b + ")"; }
      return a;
    }
    function postfix() {
      var a = atom();
      while (isOp("!")) { i++; a = "F.fact(" + a + ")"; }
      return a;
    }
    function atom() {
      var k = toks[i++];
      if (!k) throw new Error("Incomplete expression");
      if (k.t === "num") return k.v;
      if (k.t === "op" && k.v === "(") { var e = cmp(); expect(")"); return "(" + e + ")"; }
      if (k.t === "id") {
        var n = ALIAS[k.v] || k.v;
        if (isFunc(n)) {
          expect("(");
          var args = [cmp()];
          while (isOp(",")) { i++; args.push(cmp()); }
          expect(")");
          return "F." + n + "(" + args.join(",") + ")";
        }
        if (n === "pi") return "Math.PI";
        if (n === "tau") return "(2*Math.PI)";
        if (n === "e") return "Math.E";
        if (n === "theta") { st.used.t = true; return "t"; }
        if (VARS[n]) { st.used[n] = true; return n; }
        st.params[n] = true;
        return "P." + n;
      }
      throw new Error("Unexpected '" + k.v + "'");
    }
    var code = cmp();
    if (i < toks.length) throw new Error("Unexpected '" + toks[i].v + "'");
    return code;
  }

  // compile(src, P) -> { fn(x,y,t,u,v), used:{x,y,t,u,v}, params:[names] }
  function compile(src, P) {
    var toks = implicit(tokenize(src));
    if (!toks.length) throw new Error("Empty expression");
    var st = { used: {}, params: {} };
    var code = parseTokens(toks, st);
    var names = Object.keys(st.params);
    for (var i = 0; i < names.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(P, names[i])) P[names[i]] = 1;
    }
    var fn = new Function("F", "P", "return function(x,y,t,u,v){return " + code + ";};")(F, P);
    return { fn: fn, used: st.used, params: names };
  }

  // ---------- row classification ----------
  function wrapped(s) {
    if (s.charAt(0) !== "(") return false;
    var d = 0;
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) === "(") d++;
      else if (s.charAt(i) === ")") { d--; if (d === 0) return i === s.length - 1; }
    }
    return false;
  }
  function splitTuple(s) {
    if (!wrapped(s)) return null;
    var inner = s.slice(1, -1), parts = [], d = 0, start = 0;
    for (var i = 0; i < inner.length; i++) {
      var c = inner.charAt(i);
      if (c === "(") d++;
      else if (c === ")") d--;
      else if (c === "," && d === 0) { parts.push(inner.slice(start, i)); start = i + 1; }
    }
    parts.push(inner.slice(start));
    return parts.length > 1 ? parts : null;
  }
  function findRelations(s) {
    var out = [], d = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === "(") d++;
      else if (c === ")") d--;
      else if (d === 0 && (c === "=" || c === "<" || c === ">")) {
        var op = c;
        if ((c === "<" || c === ">") && s.charAt(i + 1) === "=") op = c + "=";
        else if (c === "=" && s.charAt(i + 1) === "=") op = "==";
        out.push({ i: i, op: op === "==" ? "=" : op, len: op.length });
        i += op.length - 1;
      }
    }
    return out;
  }
  function mk(kind, obj, comps) {
    var seen = {}, names = [];
    for (var i = 0; i < comps.length; i++) {
      for (var j = 0; j < comps[i].params.length; j++) {
        if (!seen[comps[i].params[j]]) { seen[comps[i].params[j]] = 1; names.push(comps[i].params[j]); }
      }
    }
    obj.kind = kind;
    obj.params = names;
    return obj;
  }
  function lhsKind(l) {
    if (l === "y" || /^[a-z]\(x\)$/.test(l)) return "y";
    if (l === "x") return "x";
    if (l === "r" || /^r\((theta|t)\)$/.test(l)) return "r";
    return null;
  }
  function strip(s) { return s.replace(/\s+/g, ""); }

  function classify2(s, P) {
    var tup = splitTuple(s), a, b;
    if (tup) {
      if (tup.length === 3) throw new Error("Three values need 3D mode (tap 3D)");
      if (tup.length !== 2) throw new Error("Use (x, y) or (x(t), y(t))");
      a = compile(tup[0], P); b = compile(tup[1], P);
      return mk(a.used.t || b.used.t ? "param" : "point", { fx: a.fn, fy: b.fn }, [a, b]);
    }
    var rels = findRelations(s);
    if (rels.length > 1) throw new Error("Use only one  =  <  >  per row");
    if (!rels.length) {
      a = compile(s, P);
      if (a.used.y) return mk("implicit", { f: a.fn, op: "=" }, [a]);
      return mk("cart", { f: a.fn, expr: s }, [a]);
    }
    var rel = rels[0], L = s.slice(0, rel.i).trim(), R = s.slice(rel.i + rel.len).trim();
    if (!L || !R) throw new Error("Missing a side of " + rel.op);
    if (rel.op === "=") {
      var k = lhsKind(strip(L)), tmp;
      if (!k && lhsKind(strip(R))) { tmp = L; L = R; R = tmp; k = lhsKind(strip(L)); }
      if (k) {
        a = compile(R, P);
        if (k === "y" && !a.used.y) return mk("cart", { f: a.fn, expr: R }, [a]);
        if (k === "x" && !a.used.x) return mk("cartY", { f: a.fn }, [a]);
        if (k === "r" && !a.used.x && !a.used.y) return mk("polar", { f: a.fn }, [a]);
      }
    }
    a = compile("(" + L + ")-(" + R + ")", P);
    return mk(rel.op === "=" ? "implicit" : "ineq", { f: a.fn, op: rel.op }, [a]);
  }

  function classify3(s, P) {
    var tup = splitTuple(s), a, b, c;
    if (tup) {
      if (tup.length !== 3) throw new Error("In 3D use three values: (x, y, z)");
      a = compile(tup[0], P); b = compile(tup[1], P); c = compile(tup[2], P);
      var uv = a.used.u || a.used.v || b.used.u || b.used.v || c.used.u || c.used.v;
      var tt = a.used.t || b.used.t || c.used.t;
      return mk(uv ? "psurf" : (tt ? "curve3" : "point3"), { fx: a.fn, fy: b.fn, fz: c.fn }, [a, b, c]);
    }
    var rels = findRelations(s);
    if (rels.length > 1) throw new Error("Use only one = per row");
    if (!rels.length) { a = compile(s, P); return mk("surf", { f: a.fn }, [a]); }
    var rel = rels[0], L = s.slice(0, rel.i).trim(), R = s.slice(rel.i + rel.len).trim();
    if (rel.op !== "=") throw new Error("Inequalities are 2D only");
    var l = strip(L), r = strip(R), tmp;
    if (!(l === "z" || /^[a-z]\(x,y\)$/.test(l))) {
      if (r === "z") { tmp = L; L = R; R = tmp; }
      else throw new Error("In 3D write  z = f(x, y)");
    }
    a = compile(R, P);
    return mk("surf", { f: a.fn }, [a]);
  }

  function classify(text, dim, P) {
    var s = norm(text).trim();
    if (!s) return null;
    return dim === 3 ? classify3(s, P) : classify2(s, P);
  }

  // ---------- numeric analysis (y = f(x) rows) ----------
  function findRoots(g, a, b, n) {
    var out = [], dx = (b - a) / n, x0 = a, y0 = g(x0);
    if (y0 === 0) out.push(x0);
    for (var i = 1; i <= n; i++) {
      var x1 = a + i * dx, y1 = g(x1);
      if (isFinite(y0) && isFinite(y1)) {
        if (y1 === 0) out.push(x1);
        else if (y0 * y1 < 0) {
          var lo = x0, hi = x1, flo = y0;
          for (var k = 0; k < 55; k++) {
            var mid = (lo + hi) / 2, fm = g(mid);
            if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
          }
          var r = (lo + hi) / 2, gr = g(r);
          if (Math.abs(gr) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) out.push(r);
        }
      }
      x0 = x1; y0 = y1;
    }
    return out;
  }

  function findExtrema(g, a, b, n) {
    var h = (b - a) / n, res = [];
    function d(x) { var e = 1e-6 * Math.max(1, Math.abs(x)); return (g(x + e) - g(x - e)) / (2 * e); }
    var x0 = a, d0 = d(x0);
    for (var i = 1; i <= n; i++) {
      var x1 = a + i * h, d1 = d(x1);
      if (isFinite(d0) && isFinite(d1) && d0 * d1 < 0) {
        var lo = x0, hi = x1, dlo = d0;
        for (var k = 0; k < 45; k++) {
          var m = (lo + hi) / 2, dm = d(m);
          if (dlo * dm <= 0) hi = m; else { lo = m; dlo = dm; }
        }
        var xs = (lo + hi) / 2, ys = g(xs), yl = g(xs - h), yr = g(xs + h);
        var tol = 1e-9 * (1 + Math.abs(ys));
        var big = 50 * Math.max(Math.abs(yl), Math.abs(yr)) + 1e-6;
        if (isFinite(ys) && isFinite(yl) && isFinite(yr) && Math.abs(ys) < 1e12 && Math.abs(ys) < big) {
          if (ys > yl + tol && ys > yr + tol) res.push({ x: xs, y: ys, t: "max" });
          else if (ys < yl - tol && ys < yr - tol) res.push({ x: xs, y: ys, t: "min" });
        }
      }
      x0 = x1; d0 = d1;
    }
    return res;
  }

  // rows: [{visible, c}] -> markers [{x,y,type,row,row2}]
  function analyse(rows, a, b) {
    var out = [], n = 1200, span = b - a, tol = span * 1e-5, cart = [], i, j;
    function add(m) {
      if (out.length >= 90 || !isFinite(m.x) || !isFinite(m.y)) return;
      if (Math.abs(m.x) < span * 1e-7) m.x = 0;
      if (Math.abs(m.y) < 1e-9) m.y = 0;
      for (var q = 0; q < out.length; q++) {
        var o = out[q];
        if (o.type === m.type && o.row === m.row && o.row2 === m.row2 && Math.abs(o.x - m.x) < tol) return;
      }
      out.push(m);
    }
    for (i = 0; i < rows.length; i++) {
      if (rows[i].visible && rows[i].c && rows[i].c.kind === "cart") {
        (function (idx, f) { cart.push({ i: idx, g: function (x) { return f(x, 0, 0, 0, 0); } }); })(i, rows[i].c.f);
      }
    }
    for (i = 0; i < cart.length; i++) {
      var g = cart[i].g, r = cart[i].i, zs = findRoots(g, a, b, n), ex = findExtrema(g, a + span * 1.2345e-4, b, n);
      for (j = 0; j < zs.length; j++) add({ x: zs[j], y: 0, type: "zero", row: r });
      for (j = 0; j < ex.length; j++) {
        add({ x: ex[j].x, y: ex[j].y, type: ex[j].t, row: r });
        if (Math.abs(ex[j].y) < 1e-9) add({ x: ex[j].x, y: 0, type: "zero", row: r });
      }
      if (a <= 0 && b >= 0) { var y0 = g(0); if (isFinite(y0)) add({ x: 0, y: y0, type: "yint", row: r }); }
    }
    for (i = 0; i < cart.length; i++) {
      for (j = i + 1; j < cart.length; j++) {
        var gi = cart[i].g, gj = cart[j].g;
        var xs = findRoots(function (x) { return gi(x) - gj(x); }, a, b, n);
        for (var k = 0; k < xs.length; k++) add({ x: xs[k], y: gi(xs[k]), type: "int", row: cart[i].i, row2: cart[j].i });
      }
    }
    return out;
  }

  // ---------- formatting helpers ----------
  function fmt(x) {
    if (!isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-12) return "0";
    var a = Math.abs(x);
    if (a >= 1e7 || a < 1e-4) return x.toExponential(3).replace(/\.?0+e/, "e");
    return String(parseFloat(x.toPrecision(7)));
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }
  var PI_STEPS = [1 / 12, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 6, 12, 24, 60, 120, 600];
  function piStep(raw) {
    for (var i = 0; i < PI_STEPS.length; i++) if (PI_STEPS[i] * Math.PI >= raw) return PI_STEPS[i] * Math.PI;
    return niceStep(raw / Math.PI) * Math.PI;
  }
  function piLabel(v) {
    var k = v / Math.PI, qs = [1, 2, 3, 4, 6, 12];
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i], p = Math.round(k * q);
      if (Math.abs(k * q - p) < 1e-6) {
        if (p === 0) return "0";
        var sg = p < 0 ? "−" : "", ap = Math.abs(p);
        var num = ap === 1 ? "π" : ap + "π";
        return sg + (q === 1 ? num : num + "/" + q);
      }
    }
    return fmt(v);
  }

  function isKnownWord(w) {
    return w.length === 1 || isFunc(w) || w === "pi" || w === "tau" || w === "theta";
  }

  return {
    isKnownWord: isKnownWord, classify: classify, compile: compile, findRoots: findRoots, findExtrema: findExtrema,
    analyse: analyse, fmt: fmt, niceStep: niceStep, piStep: piStep, piLabel: piLabel, FUNCS: F
  };
})();
if (typeof module !== "undefined") module.exports = GE;