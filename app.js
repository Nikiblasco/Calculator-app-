const $ = (id) => document.getElementById(id);
const statusEl = $("status"), exprEl = $("expr"), goBtn = $("go");
const resultEl = $("result"), historyEl = $("history");
let calc = null;

// ---------- the Python brain ----------
const PY = String.raw`
import json
from sympy import *
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations,
    implicit_multiplication_application, convert_xor)

L = {"e": E, "f": Function("f"), "g": Function("g"), "h": Function("h")}
T = standard_transformations + (implicit_multiplication_application, convert_xor)

def clean(t):
    return (t.replace("π", "pi").replace("√", "sqrt").replace("×", "*")
             .replace("÷", "/").replace("−", "-").replace("°", "*(pi/180)"))

def parse(s):
    return parse_expr(s, transformations=T, local_dict=dict(L))

def calc(text):
    text = clean(text)
    if "=" in text:
        lhs, rhs = text.split("=", 1)
        eq = Eq(parse(lhs), parse(rhs))
        syms = sorted(eq.free_symbols, key=str)
        if not syms:
            return json.dumps({"latex": r"\text{" + str(bool(eq)) + "}"})
        var = next((s for s in syms if str(s) == "x"), syms[0])
        sols = solve(eq, var)
        if not sols:
            return json.dumps({"latex": r"\text{No solution}"})
        out = ",\\; ".join(latex(var) + " = " + latex(s) for s in sols)
        return json.dumps({"latex": out})
    res = parse(text)
    out = {"latex": latex(res)}
    if getattr(res, "is_number", False) and not (getattr(res, "is_Integer", False) or getattr(res, "is_Float", False)):
        approx = str(N(res, 12))
        if "." in approx and "e" not in approx:
            approx = approx.rstrip("0").rstrip(".")
        if approx != str(res):
            out["approx"] = approx
    return json.dumps(out)
`;

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
    await pyodide.runPythonAsync(PY);
    calc = pyodide.globals.get("calc");
    window.pyodide = pyodide;
    setStatus("Ready", "ready");
    exprEl.disabled = false;
    goBtn.disabled = false;
    exprEl.focus();
  } catch (err) {
    console.error(err);
    setStatus("Failed to load. Check connection", "error");
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
    showResult(JSON.parse(calc(text)));
    addHistory(text);
  } catch (err) {
    showError(err);
  }
}

goBtn.addEventListener("click", run);
exprEl.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });


boot();