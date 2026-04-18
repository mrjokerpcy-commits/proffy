"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Safe recursive-descent evaluator ─────────────────────────────────────────
function factorial(n: number): number {
  if (n < 0 || !Number.isFinite(n)) return NaN;
  if (!Number.isInteger(n)) return Math.exp(gammaLn(n + 1));
  if (n > 170) return Infinity;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
function gammaLn(z: number): number {
  const g = 7;
  const c = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  z -= 1; let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2, π: Math.PI, τ: 2 * Math.PI, inf: Infinity };

function buildFunctions(deg: boolean) {
  const toRad = (x: number) => deg ? x * Math.PI / 180 : x;
  const toDeg = (x: number) => deg ? x * 180 / Math.PI : x;
  return {
    sin: (x: number) => Math.sin(toRad(x)),
    cos: (x: number) => Math.cos(toRad(x)),
    tan: (x: number) => Math.tan(toRad(x)),
    asin: (x: number) => toDeg(Math.asin(x)),
    acos: (x: number) => toDeg(Math.acos(x)),
    atan: (x: number) => toDeg(Math.atan(x)),
    atan2: (y: number, x: number) => toDeg(Math.atan2(y, x)),
    sinh: (x: number) => Math.sinh(x), cosh: (x: number) => Math.cosh(x), tanh: (x: number) => Math.tanh(x),
    asinh: (x: number) => Math.asinh(x), acosh: (x: number) => Math.acosh(x), atanh: (x: number) => Math.atanh(x),
    sqrt: (x: number) => Math.sqrt(x), cbrt: (x: number) => Math.cbrt(x),
    abs: (x: number) => Math.abs(x), sign: (x: number) => Math.sign(x),
    log: (x: number) => Math.log10(x), log10: (x: number) => Math.log10(x),
    log2: (x: number) => Math.log2(x), ln: (x: number) => Math.log(x),
    exp: (x: number) => Math.exp(x), pow10: (x: number) => Math.pow(10, x),
    ceil: (x: number) => Math.ceil(x), floor: (x: number) => Math.floor(x),
    round: (x: number) => Math.round(x), trunc: (x: number) => Math.trunc(x),
    min: (...a: number[]) => Math.min(...a), max: (...a: number[]) => Math.max(...a),
    gcd: (a: number, b: number) => { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { [a, b] = [b, a % b]; } return a; },
    fact: (n: number) => factorial(Math.round(n)),
    C: (n: number, r: number) => factorial(Math.round(n)) / (factorial(Math.round(r)) * factorial(Math.round(n) - Math.round(r))),
    P: (n: number, r: number) => factorial(Math.round(n)) / factorial(Math.round(n) - Math.round(r)),
    deg: (r: number) => r * 180 / Math.PI,
    rad: (d: number) => d * Math.PI / 180,
    hypot: (...a: number[]) => Math.hypot(...a),
    mod: (a: number, b: number) => a % b,
    inv: (x: number) => 1 / x,
  };
}

class Parser {
  private pos = 0; private expr: string; private fns: Record<string, (...a: number[]) => number>;
  constructor(expr: string, fns: ReturnType<typeof buildFunctions>) {
    this.fns = fns;
    this.expr = expr.replace(/\s+/g, "")
      .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
      .replace(/–/g, "-").replace(/π/g, "pi").replace(/τ/g, "tau")
      .toLowerCase();
  }
  private peek() { return this.expr[this.pos] ?? ""; }
  private eat(c: string) { if (this.expr[this.pos] === c) { this.pos++; return true; } return false; }
  private eatStr(s: string) { if (this.expr.startsWith(s, this.pos)) { this.pos += s.length; return true; } return false; }
  parse(): number {
    // Preprocess implicit multiplication: 2pi → 2*pi, 3sin → 3*sin
    this.expr = this.expr
      .replace(/(\d)(pi|tau|phi|inf|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|abs|log|ln|exp|pow10|fact|ceil|floor|round|trunc|hypot|mod|inv)/g, "$1*$2")
      .replace(/(pi|e|phi|tau)(\d)/g, "$1*$2")
      .replace(/(pi|e|phi|tau)\(/g, "$1*(");
    const v = this.parseAddSub();
    if (this.pos < this.expr.length) throw new Error("Unexpected: " + this.expr.slice(this.pos));
    return v;
  }
  private parseAddSub(): number {
    let l = this.parseMulDiv();
    while (true) {
      if (this.eat("+")) l += this.parseMulDiv();
      else if (this.eat("-")) l -= this.parseMulDiv();
      else break;
    }
    return l;
  }
  private parseMulDiv(): number {
    let l = this.parsePow();
    while (true) {
      if (this.eat("*")) l *= this.parsePow();
      else if (this.eat("/")) { const r = this.parsePow(); l = r === 0 ? Infinity * Math.sign(l || 1) : l / r; }
      else if (this.eat("%")) { const r = this.parsePow(); l = l % r; }
      else break;
    }
    return l;
  }
  private parsePow(): number {
    let base = this.parseUnary();
    if (this.eat("^") || this.eatStr("**")) base = Math.pow(base, this.parseUnary());
    return base;
  }
  private parseUnary(): number {
    if (this.eat("-")) return -this.parsePostfix();
    this.eat("+");
    return this.parsePostfix();
  }
  private parsePostfix(): number {
    let v = this.parsePrimary();
    while (this.eat("!")) v = factorial(Math.round(v));
    return v;
  }
  private parsePrimary(): number {
    if (this.eat("(")) { const v = this.parseAddSub(); if (!this.eat(")")) throw new Error("Missing )"); return v; }
    if (/[\d.]/.test(this.peek())) return this.parseNumber();
    const id = this.parseIdent();
    if (!id) throw new Error("Unexpected: " + this.peek());
    if (id in CONSTANTS) {
      let v = CONSTANTS[id];
      if (/[\d(]/.test(this.peek())) v *= this.parsePrimary();
      return v;
    }
    if (id in this.fns) {
      if (!this.eat("(")) throw new Error("Expected ( after " + id);
      const args = [this.parseAddSub()];
      while (this.eat(",")) args.push(this.parseAddSub());
      if (!this.eat(")")) throw new Error("Missing )");
      return (this.fns as any)[id](...args);
    }
    throw new Error("Unknown: " + id);
  }
  private parseIdent(): string {
    let s = "";
    while (/[a-z_0-9]/.test(this.peek()) && !/^\d/.test(this.peek())) s += this.expr[this.pos++];
    return s;
  }
  private parseNumber(): number {
    let s = "";
    while (/[\d.]/.test(this.peek())) s += this.expr[this.pos++];
    if (this.peek() === "e" && /[\d+\-]/.test(this.expr[this.pos + 1] ?? "")) {
      s += "e"; this.pos++;
      if (this.peek() === "+" || this.peek() === "-") s += this.expr[this.pos++];
      while (/\d/.test(this.peek())) s += this.expr[this.pos++];
    }
    return parseFloat(s);
  }
}

function evaluate(expr: string, deg: boolean, ans: string): string {
  try {
    if (!expr.trim()) return "";
    const e = expr.replace(/\bans\b/gi, ans || "0");
    const fns = buildFunctions(deg);
    const result = new Parser(e, fns).parse();
    if (!isFinite(result)) return result > 0 ? "∞" : result < 0 ? "-∞" : "undefined";
    if (isNaN(result)) return "undefined";
    if (Number.isInteger(result) && Math.abs(result) < 1e15) return result.toString();
    const abs = Math.abs(result);
    if (abs < 1e-10 || abs >= 1e13) return result.toPrecision(10).replace(/\.?0+$/, "").replace(/e\+?(-?)0*(\d+)$/, "×10^$1$2");
    return parseFloat(result.toPrecision(12)).toString();
  } catch (err: any) {
    return "Err: " + (err.message ?? "?");
  }
}

function formatDisplay(v: string) {
  if (v.length <= 13) return v;
  const n = parseFloat(v);
  if (!isNaN(n)) return n.toPrecision(8);
  return v.slice(0, 13) + "…";
}

// ── Button definitions ─────────────────────────────────────────────────────────
type BtnDef = {
  label: string;
  shiftLabel?: string;
  value: string;
  shiftValue?: string;
  color?: "fn" | "op" | "eq" | "del" | "shift" | "mode" | "num";
  action?: "clear" | "back" | "eval" | "shift" | "mode" | "ans" | "negate";
  wide?: boolean;
};

// 5 columns
const ROWS: BtnDef[][] = [
  [
    { label: "SHIFT", value: "", action: "shift", color: "shift" },
    { label: "DEG",   value: "", action: "mode",  color: "mode" },
    { label: "hyp",   value: "sinh(", shiftValue: "asinh(", shiftLabel: "hyp⁻¹", color: "fn" },
    { label: "⌫",     value: "", action: "back",  color: "del" },
    { label: "AC",    value: "", action: "clear", color: "del" },
  ],
  [
    { label: "sin",   value: "sin(",  shiftValue: "asin(", shiftLabel: "sin⁻¹", color: "fn" },
    { label: "cos",   value: "cos(",  shiftValue: "acos(", shiftLabel: "cos⁻¹", color: "fn" },
    { label: "tan",   value: "tan(",  shiftValue: "atan(", shiftLabel: "tan⁻¹", color: "fn" },
    { label: "x²",    value: "^2",    shiftValue: "sqrt(", shiftLabel: "√",     color: "fn" },
    { label: "xⁿ",    value: "^",     shiftValue: "cbrt(", shiftLabel: "ˣ√",    color: "fn" },
  ],
  [
    { label: "log",   value: "log(",  shiftValue: "pow10(", shiftLabel: "10ˣ",  color: "fn" },
    { label: "ln",    value: "ln(",   shiftValue: "exp(",   shiftLabel: "eˣ",   color: "fn" },
    { label: "1/x",   value: "inv(",  shiftValue: "x!",     shiftLabel: "n!",   color: "fn" },
    { label: "(",     value: "(",     color: "op" },
    { label: ")",     value: ")",     color: "op" },
  ],
  [
    { label: "π",     value: "pi",    shiftValue: "e",      shiftLabel: "e",    color: "fn" },
    { label: "nCr",   value: "C(",    shiftValue: "P(",     shiftLabel: "nPr",  color: "fn" },
    { label: "%",     value: "%",     shiftValue: "mod(",   shiftLabel: "mod",  color: "op" },
    { label: "÷",     value: "/",     color: "op" },
    { label: "×",     value: "*",     color: "op" },
  ],
  [
    { label: "7",     value: "7",     color: "num" },
    { label: "8",     value: "8",     color: "num" },
    { label: "9",     value: "9",     color: "num" },
    { label: "−",     value: "-",     color: "op" },
    { label: "+",     value: "+",     color: "op" },
  ],
  [
    { label: "4",     value: "4",     color: "num" },
    { label: "5",     value: "5",     color: "num" },
    { label: "6",     value: "6",     color: "num" },
    { label: "EE",    value: "e",     color: "fn" },
    { label: "ANS",   value: "", action: "ans", color: "fn" },
  ],
  [
    { label: "1",     value: "1",     color: "num" },
    { label: "2",     value: "2",     color: "num" },
    { label: "3",     value: "3",     color: "num" },
    { label: ".",     value: ".",     color: "num" },
    { label: "=",     value: "", action: "eval", color: "eq" },
  ],
  [
    { label: "0",     value: "0",     color: "num", wide: true },
    { label: "+/−",   value: "",      color: "num", action: "negate" },
    { label: "√",     value: "sqrt(", color: "fn" },
    { label: "x!",    value: "!",     color: "fn" },
  ],
];

// ── Color map ──────────────────────────────────────────────────────────────────
const COLORS = {
  fn:    { bg: "rgba(79,142,247,0.15)",  hover: "rgba(79,142,247,0.28)", text: "#7ab3fa" },
  op:    { bg: "rgba(167,139,250,0.15)", hover: "rgba(167,139,250,0.28)", text: "#c4b5fd" },
  eq:    { bg: "linear-gradient(135deg,#4f8ef7,#6366f1)", hover: "linear-gradient(135deg,#6aa3fa,#818cf8)", text: "#fff" },
  del:   { bg: "rgba(248,113,113,0.15)", hover: "rgba(248,113,113,0.28)", text: "#fca5a5" },
  shift: { bg: "rgba(251,191,36,0.18)",  hover: "rgba(251,191,36,0.32)", text: "#fbbf24" },
  mode:  { bg: "rgba(52,211,153,0.15)",  hover: "rgba(52,211,153,0.28)", text: "#6ee7b7" },
  num:   { bg: "rgba(255,255,255,0.07)", hover: "rgba(255,255,255,0.13)", text: "rgba(255,255,255,0.9)" },
};

interface HistEntry { expr: string; result: string; }
interface Props { isOpen?: boolean; onOpenChange?: (v: boolean) => void; topBar?: boolean; }

export default function MathCalc({ isOpen, onOpenChange, topBar = false }: Props) {
  const [expr, setExpr]           = useState("");
  const [preview, setPreview]     = useState("");
  const [history, setHistory]     = useState<HistEntry[]>([]);
  const [showHistory, setShow]    = useState(false);
  const [shifted, setShifted]     = useState(false);
  const [degMode, setDegMode]     = useState(true);   // true = DEG, false = RAD
  const [ans, setAns]             = useState("0");
  const inputRef = useRef<HTMLInputElement>(null);

  const controlled = isOpen !== undefined;
  const [internalOpen, setIO] = useState(false);
  const open = controlled ? isOpen! : internalOpen;
  function setOpen(v: boolean) { controlled ? onOpenChange?.(v) : setIO(v); }

  useEffect(() => {
    if (!expr) { setPreview(""); return; }
    const r = evaluate(expr, degMode, ans);
    setPreview(r.startsWith("Err") || r === expr ? "" : r);
  }, [expr, degMode, ans]);

  const compute = useCallback(() => {
    if (!expr.trim()) return;
    const result = evaluate(expr, degMode, ans);
    setHistory(h => [{ expr, result }, ...h.slice(0, 49)]);
    if (!result.startsWith("Err") && result !== "undefined") setAns(result);
    setExpr(result.startsWith("Err") || result === "undefined" ? expr : result);
    setPreview("");
    setShifted(false);
  }, [expr, degMode, ans]);

  function press(btn: BtnDef) {
    const active = shifted && btn.shiftValue ? { ...btn, value: btn.shiftValue } : btn;
    if (shifted && btn.shiftValue) setShifted(false);

    if (active.action === "clear")  { setExpr(""); setPreview(""); return; }
    if (active.action === "back")   { setExpr(e => e.slice(0, -1)); return; }
    if (active.action === "eval")   { compute(); return; }
    if (active.action === "shift")  { setShifted(s => !s); return; }
    if (active.action === "mode")   { setDegMode(d => !d); return; }
    if (active.action === "ans")    { setExpr(e => e + "ans"); inputRef.current?.focus(); return; }
    if (active.action === "negate") {
      setExpr(e => {
        if (!e) return "-";
        if (e.startsWith("-")) return e.slice(1);
        return "-" + e;
      });
      return;
    }
    setExpr(e => e + active.value);
    inputRef.current?.focus();
  }

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter")     { e.preventDefault(); compute(); }
      if (e.key === "Escape")    { setOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, compute]);

  const pos: React.CSSProperties = topBar
    ? { position: "fixed", top: "60px", right: "116px", zIndex: 9001 }
    : { position: "fixed", bottom: "80px", left: "268px", zIndex: 9001 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="calc"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...pos,
            width: "300px",
            background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px 6px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", gap: "2px" }}>
              {["Calc", "History"].map(t => (
                <button key={t} onClick={() => setShow(t === "History")} style={{
                  padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                  border: "none", cursor: "pointer", transition: "all 0.1s",
                  background: (showHistory ? t === "History" : t === "Calc") ? "rgba(255,255,255,0.1)" : "transparent",
                  color: (showHistory ? t === "History" : t === "Calc") ? "#fff" : "rgba(255,255,255,0.3)",
                }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: degMode ? "#6ee7b7" : "#7ab3fa" }}>
                {degMode ? "DEG" : "RAD"}
              </span>
              {shifted && <span style={{ fontSize: "10px", fontWeight: 700, color: "#fbbf24" }}>SHIFT</span>}
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: "4px", lineHeight: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {showHistory ? (
              <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ maxHeight: "340px", overflowY: "auto", padding: "10px 12px 12px" }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.2)", padding: "28px 0" }}>No calculations yet</div>
                ) : history.map((h, i) => (
                  <div key={i} onClick={() => { setExpr(h.result); setShow(false); inputRef.current?.focus(); }}
                    style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", borderRadius: "6px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.expr}</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#7ab3fa", fontVariantNumeric: "tabular-nums" }}>{h.result}</div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="calc-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* ── Display ── */}
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  margin: "6px 10px",
                  borderRadius: "12px",
                  padding: "8px 14px 10px",
                  border: "1px solid rgba(255,255,255,0.04)",
                  minHeight: "72px",
                }}>
                  {/* Expression row */}
                  <input
                    ref={inputRef}
                    value={expr}
                    onChange={e => setExpr(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && compute()}
                    placeholder="0"
                    spellCheck={false}
                    style={{
                      width: "100%", background: "none", border: "none", outline: "none",
                      fontSize: expr.length > 16 ? "14px" : "18px",
                      fontWeight: 500, color: "rgba(255,255,255,0.55)",
                      textAlign: "right", fontVariantNumeric: "tabular-nums",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      boxSizing: "border-box",
                    }}
                  />
                  {/* Result preview */}
                  <div style={{
                    textAlign: "right", minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "flex-end",
                  }}>
                    {preview ? (
                      <span style={{ fontSize: "26px", fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "-0.02em" }}>
                        {formatDisplay(preview)}
                      </span>
                    ) : (
                      <span style={{ fontSize: "26px", fontWeight: 800, color: "rgba(255,255,255,0.15)", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                        {expr ? "" : "0"}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Button grid ── */}
                <div style={{ padding: "4px 8px 10px", display: "flex", flexDirection: "column", gap: "3px" }}>
                  {ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: "3px" }}>
                      {row.map((btn, bi) => {
                        const isActive = btn.action === "shift" && shifted;
                        const c = COLORS[btn.color ?? "num"];
                        const displayLabel = shifted && btn.shiftLabel ? btn.shiftLabel : btn.label;
                        return (
                          <button
                            key={bi}
                            onClick={() => press(btn)}
                            style={{
                              flex: btn.wide ? 2 : 1,
                              padding: "0",
                              height: "36px",
                              borderRadius: "8px",
                              border: isActive ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.04)",
                              background: isActive ? "rgba(251,191,36,0.25)" : c.bg,
                              color: isActive ? "#fbbf24" : c.text,
                              fontSize: displayLabel.length > 4 ? "10px" : "13px",
                              fontWeight: 700, cursor: "pointer",
                              transition: "background 0.08s, transform 0.06s",
                              letterSpacing: "-0.01em",
                              lineHeight: 1,
                            }}
                            onMouseEnter={e => {
                              if (btn.color === "eq") (e.currentTarget as HTMLButtonElement).style.background = c.hover;
                              else (e.currentTarget as HTMLButtonElement).style.background = c.hover;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = isActive ? "rgba(251,191,36,0.25)" : c.bg;
                            }}
                            onMouseDown={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)"}
                            onMouseUp={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}
                          >
                            {displayLabel}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
