// ===== Niki keypad =====
// Each key is [label, text to insert, style]. "|" marks where the cursor lands.
const D = (c) => [c, c, "num"];

const TABS = [
  { id: "num", label: "123", keys: [
    ["(", "(", "op"], [")", ")", "op"], ["xʸ", "^", "op"], ["÷", "/", "op"],
    D("7"), D("8"), D("9"), ["×", "*", "op"],
    D("4"), D("5"), D("6"), ["−", "-", "op"],
    D("1"), D("2"), D("3"), ["+", "+", "op"],
    D("0"), D("."), ["x", "x", "var"], ["a=b", "=", "op"],
    ["π", "pi", "var"], ["e", "e", "var"], ["y", "y", "var"], [",", ",", "op"],
  ], note: null },

  { id: "func", label: "f(x)", keys: [
    ["√", "sqrt(|)"], ["∛", "cbrt(|)"], ["ⁿ√", "root(|, n)"], ["x²", "^2"], ["x³", "^3"], ["xⁿ", "^(|)"],
    ["1/x", "1/(|)"], ["a/b", "(|)/()"], ["|x|", "Abs(|)"], ["n!", "!"],
    ["eˣ", "exp(|)"], ["10ˣ", "10^(|)"], ["log", "log(|, 10)"], ["ln", "ln(|)"],
    ["log₂", "log(|, 2)"], ["logₐ", "log(|, )"],
    ["⌊x⌋", "floor(|)"], ["⌈x⌉", "ceiling(|)"], ["mod", "Mod(|, )"], ["sign", "sign(|)"],
    ["nCr", "binomial(|, )"], ["nPr", "ff(|, )"], ["gcd", "gcd(|, )"], ["lcm", "lcm(|, )"],
    ["max", "Max(|, )"], ["min", "Min(|, )"],
    ["π", "pi", "var"], ["e", "e", "var"], ["i", "I", "var"], ["∞", "oo", "var"], ["φ", "GoldenRatio", "var"],
  ], note: "Tip: select some text first, then press a function key to wrap it." },

  { id: "trig", label: "Trig", keys: [
    ["sin", "sin(|)"], ["cos", "cos(|)"], ["tan", "tan(|)"], ["°", "°", "op"],
    ["sin⁻¹", "asin(|)"], ["cos⁻¹", "acos(|)"], ["tan⁻¹", "atan(|)"], ["π", "pi", "var"],
    ["csc", "csc(|)"], ["sec", "sec(|)"], ["cot", "cot(|)"], ["atan2", "atan2(|, )"],
    ["sinh", "sinh(|)"], ["cosh", "cosh(|)"], ["tanh", "tanh(|)"],
    ["sinh⁻¹", "asinh(|)"], ["cosh⁻¹", "acosh(|)"], ["tanh⁻¹", "atanh(|)"],
  ], note: "SOH-CAH-TOA: sin = opposite ÷ hypotenuse · cos = adjacent ÷ hypotenuse · tan = opposite ÷ adjacent. Press ° after a number for degrees, e.g. sin(30°). Without it, angles are in radians." },

  { id: "calc", label: "Calculus", keys: [
    ["∫", "integrate(|, x)"], ["∫ₐᵇ", "integrate(|, (x, a, b))"],
    ["d/dx", "diff(|, x)"], ["d²/dx²", "diff(|, x, 2)"], ["∂/∂y", "diff(|, y)"],
    ["lim x→0", "limit(|, x, 0)"], ["lim x→∞", "limit(|, x, oo)"],
    ["Σ", "summation(|, (n, 1, 10))"], ["Π", "product(|, (n, 1, 10))"],
    ["Taylor", "series(|, x, 0, 6)"],
    ["ODE 1st", "dsolve(Eq(diff(f(x), x), |), f(x))"], ["ODE 2nd", "dsolve(Eq(diff(f(x), x, 2), |), f(x))"],
    ["f(x)", "f(x)", "var"], ["x", "x", "var"], ["n", "n", "var"], ["oo", "oo", "var"],
  ], note: "Edit the placeholder letters (x, a, b, n) after inserting. Use f(x) for unknown functions in differential equations." },

  { id: "alg", label: "Algebra", keys: [
    ["solve", "solve(|, x)"], ["system", "solve([|, ], [x, y])"], ["quad", "a x^2 + b x + c = 0"],
    ["factor", "factor(|)"], ["expand", "expand(|)"], ["simplify", "simplify(|)"],
    ["cancel", "cancel(|)"], ["apart", "apart(|)"], ["trigsimp", "trigsimp(|)"],
    ["subs", "(|).subs(x, 2)"], ["N", "N(|, 20)"],
    ["x", "x", "var"], ["y", "y", "var"], ["z", "z", "var"], ["a", "a", "var"],
    ["b", "b", "var"], ["c", "c", "var"], ["n", "n", "var"], ["t", "t", "var"],
  ], note: "Equations: type them with a=b (like 2x+3=11), then press the glowing = button. For systems, move everything to one side: solve([x+y-3, x-y-1], [x, y])." },

  { id: "mat", label: "Matrix", keys: [
    ["2×2", "Matrix([[|, ], [, ]])"], ["3×3", "Matrix([[|, , ], [, , ], [, , ]])"],
    ["det", ".det()"], ["inv", ".inv()"], ["Mᵀ", ".T"], ["rank", ".rank()"],
    ["eigen", ".eigenvals()"], ["trace", ".trace()"], ["dot", ".dot(|)"], ["cross", ".cross(|)"],
    ["norm", ".norm()"], ["I₂", "eye(2)"], ["I₃", "eye(3)"],
    ["[", "[", "op"], ["]", "]", "op"], [",", ", ", "op"],
  ], note: "Press 2×2, fill in the numbers, then add det / inv / Mᵀ after the closing bracket." },
];

const tabsEl = $("tabs"), padEl = $("pad");

function insertText(raw) {
  const mark = raw.indexOf("|");
  const s = exprEl.selectionStart, e = exprEl.selectionEnd;
  if (mark >= 0 && s !== e) {
    // wrap the selected text: "sin(|)" -> "sin(selection)"
    const selected = exprEl.value.slice(s, e);
    exprEl.setRangeText(raw.slice(0, mark) + selected + raw.slice(mark + 1), s, e, "end");
  } else {
    exprEl.setRangeText(raw.replace("|", ""), s, e, "end");
    if (mark >= 0) exprEl.setSelectionRange(s + mark, s + mark);
  }
  exprEl.focus();
}

function backspace() {
  const s = exprEl.selectionStart, e = exprEl.selectionEnd;
  if (s !== e) exprEl.setRangeText("", s, e, "end");
  else if (s > 0) exprEl.setRangeText("", s - 1, s, "end");
  exprEl.focus(); 
}

function renderTab(id) {
  const tab = TABS.find((t) => t.id === id);
  tabsEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  padEl.dataset.mode = id === "num" ? "num" : "grid";
  padEl.innerHTML = "";
  padEl.scrollTop = 0;
  tab.keys.forEach(([label, insert, style]) => {
    const b = document.createElement("button");
    b.className = "key " + (style || "fn") + (label.length > 5 ? " sm" : "");
    b.textContent = label;
    b.dataset.insert = insert;
    padEl.append(b);
  });
  if (tab.note) {
    const p = document.createElement("p");
    p.className = "padnote";
    p.textContent = tab.note;
    padEl.append(p);
  }
}

TABS.forEach((t) => {
  const b = document.createElement("button");
  b.textContent = t.label;
  b.dataset.tab = t.id;
  tabsEl.append(b);
});

tabsEl.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) renderTab(b.dataset.tab);
});

padEl.addEventListener("click", (e) => {
  const b = e.target.closest(".key");
  if (b) insertText(b.dataset.insert);
});

$("del").addEventListener("click", backspace);
$("clr").addEventListener("click", () => { exprEl.value = ""; exprEl.focus(); });

// Keep the caret in the input when tapping keys
$("keypad").addEventListener("mousedown", (e) => e.preventDefault());

// Phones: hide the system keyboard, with a ⌨ button to bring it back
const kbdBtn = $("kbd");
if (matchMedia("(pointer: coarse)").matches) exprEl.inputMode = "none";
kbdBtn.addEventListener("click", () => {
  exprEl.inputMode = exprEl.inputMode === "none" ? "text" : "none";
  kbdBtn.classList.toggle("on", exprEl.inputMode !== "none");
  exprEl.blur();
  exprEl.focus();
});

renderTab("num");