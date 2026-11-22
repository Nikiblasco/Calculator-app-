const $ = (id) => document.getElementById(id);
const statusEl = $("status"), exprEl = $("expr"), goBtn = $("go");
const resultEl = $("result"), historyEl = $("history");
let calc = null;
let angleMode = "deg"; // "deg" or "rad"

// ---------- the Python brain ----------
const PY_TEMPLATE = `
import json
from sympy import *
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations,
    implicit_multiplication_application, convert_xor)

L = {"e": E, "f": Function("f"), "g": Function("g"), "h": Function("h")}
T = standard_transformations + (implicit_multiplication_application, convert_xor)

D = pi / 180
DEG = {
    "sin": lambda a: sin(a*D),  "cos": lambda a: cos(a*D),  "tan": lambda a: tan(a*D),
    "csc": lambda a: csc(a*D),  "sec": lambda a: sec(a*D),  "cot": lambda a: cot(a*D),
    "asin": lambda a: asin(a)/D, "acos": lambda a: acos(a)/D, "atan": lambda a: atan(a)/D,
    "acsc": lambda a: acsc(a)/D, "asec": lambda a: asec(a)/D, "acot": lambda a: acot(a)/D,
}

def clean(t, mode="rad"):
    deg = "" if mode == "deg" else "*(pi/180)"   # in DEG mode, ° is already implied
    return t.replace("π", "pi").replace("√", "sqrt").replace("×", "*")\\
         .replace("÷", "/").replace("−", "-").replace("°", deg)

def parse(s, mode="rad"):
    d = dict(L)
    if mode == "deg":
        d.update(DEG)
    return parse_expr(s, transformations=T, local_dict=d)

def calc(text, mode="rad"):
    text = clean(text, mode)
    if "=" in text:
        lhs, rhs = text.split("=", 1)
        eq = Eq(parse(lhs, mode), parse(rhs, mode))
        syms = sorted(eq.free_symbols, key=str)
        if not syms:
            return json.dumps({"latex": r"\\text{" + str(bool(eq)) + "}"})
        var = next((s for s in syms if str(s) == "x"), syms[0])
        sols = solve(eq, var)
        if not sols:
            return json.dumps({"latex": r"\\text{No solution}"})
        out = r",\\; ".join(latex(var) + " = " + latex(s) for s in sols)
        return json.dumps({"latex": out})
    res = parse(text, mode)
    out = {"latex": latex(res)}
    if getattr(res, "is_number", False) and not (getattr(res, "is_Integer", False) or getattr(res, "is_Float", False)):
        approx = str(N(res, 12))
        if "." in approx and "e" not in approx:
            approx = approx.rstrip("0").rstrip(".")
        if approx != str(res):
            out["approx"] = approx
    return json.dumps(out)
`;

function getPY() {
  return PY_TEMPLATE;
}

// ---------- boot ----------
function setStatus(text, state = "loading") {
  statusEl.className = "status " + state;
  statusEl.querySelector("span").textContent = text;
}

async function boot() {
  try {
    setStatus("Loading Python…");
    const pyodide = await loadPyodide();
    setStatus("Loading SymPy…");
    await pyodide.loadPackage("sympy");
    await pyodide.runPythonAsync(getPY());
    calc = pyodide.globals.get("calc");
    window.pyodide = pyodide;
    setStatus("Ready", "ready");
    exprEl.disabled = false;
    goBtn.disabled = false;
    exprEl.focus();

    setupAngleToggle();

    // Load angle mode from localStorage (after setup so UI is ready)
    const savedMode = localStorage.getItem("nikiAngleMode");
    if (savedMode) {
      setAngleMode(savedMode);
    }
  } catch (err) {
    console.error(err);
    setStatus("Failed to load. Check connection", "error");
  }
}

function setupAngleToggle() {
  const angleToggle = $("angleMode");
  if (!angleToggle) return;

  angleToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (btn) {
      setAngleMode(btn.dataset.mode);
    }
  });
}

function setAngleMode(mode) {
  angleMode = mode;
  localStorage.setItem("nikiAngleMode", mode);

  // Update UI
  const angleToggle = $("angleMode");
  if (angleToggle) {
    angleToggle.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
  }

  // Dispatch custom event for graph UI and other listeners
  window.dispatchEvent(new CustomEvent("nikiAngleModeChange", { detail: { mode: mode } }));

  // Re-evaluate current expression if any
  if (exprEl.value.trim() && calc) {
    run();
  }
}

// ---------- UI ----------
function showResult({ latex, approx }) {
  resultEl.innerHTML = "";
  const main = document.createElement("div");
  main.className = "main";
  katex.render(latex, main, { displayMode: true, throwOnError: false });
  resultEl.append(main);
  if (approx) {
    const a = document.createElement("div");
    a.className = "approx";
    a.textContent = "≈ " + approx;
    resultEl.append(a);
  }
}

function showError(err) {
  const lines = String(err.message || err).split("\n").filter(Boolean);
  resultEl.innerHTML = "";
  const d = document.createElement("div");
  d.className = "error";
  d.textContent = lines[lines.length - 1];
  resultEl.append(d);
}

function addHistory(text) {
  const b = document.createElement("button");
  b.textContent = text;
  b.addEventListener("click", () => { exprEl.value = text; run(); });
  historyEl.prepend(b);
  while (historyEl.children.length > 20) historyEl.lastChild.remove();
}

function run() {
  const text = exprEl.value.trim();
  if (!text || !calc) return;
  try {
    showResult(JSON.parse(calc(text, angleMode)));
    addHistory(text);
  } catch (err) {
    showError(err);
  }
}

goBtn.addEventListener("click", run);
exprEl.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });


boot();