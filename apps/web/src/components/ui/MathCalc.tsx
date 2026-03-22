"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Math evaluator ────────────────────────────────────────────────────────────
// A safe, sandboxed expression evaluator. Supports:
// - Arithmetic: +, -, *, /, ^, %
// - Constants: pi, e, phi, inf
// - Functions: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh,
//              sqrt, cbrt, abs, log, log2, log10, ln, exp, ceil, floor, round,
//              factorial, nCr, nPr, deg, rad
// - Complex expressions, parentheses, implicit multiplication (2pi, 3sin(x))
// Does NOT use eval() — uses a recursive descent parser.

const CONSTANTS: Record<string, number> = {
  pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2, inf: Infinity,
  π: Math.PI, τ: 2 * Math.PI,
};

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (!Number.isInteger(n)) {
    // Stirling approximation for non-integers (Gamma function approximation)
    return Math.exp(gammaLn(n + 1));
  }
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function gammaLn(z: number): number {
  const g = 7;
  const c = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin:  (x) => Math.sin(x), cos: (x) => Math.cos(x), tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x), acos: (x) => Math.acos(x), atan: (x) => Math.atan(x),
  atan2: (y, x) => Math.atan2(y, x),
  sinh: (x) => Math.sinh(x), cosh: (x) => Math.cosh(x), tanh: (x) => Math.tanh(x),
  sqrt: (x) => Math.sqrt(x), cbrt: (x) => Math.cbrt(x),
  abs:  (x) => Math.abs(x), sign: (x) => Math.sign(x),
  log:  (x) => Math.log10(x), log10: (x) => Math.log10(x),
  log2: (x) => Math.log2(x), ln: (x) => Math.log(x), exp: (x) => Math.exp(x),
  ceil: (x) => Math.ceil(x), floor: (x) => Math.floor(x), round: (x) => Math.round(x),
  trunc: (x) => Math.trunc(x),
  min:  (...args) => Math.min(...args), max: (...args) => Math.max(...args),
  gcd:  (a, b) => { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { [a, b] = [b, a % b]; } return a; },
  lcm:  (a, b) => Math.abs(a * b) / FUNCTIONS.gcd(a, b),
  fact: (n) => factorial(Math.round(n)),
  C:    (n, r) => factorial(Math.round(n)) / (factorial(Math.round(r)) * factorial(Math.round(n - r))),
  P:    (n, r) => factorial(Math.round(n)) / factorial(Math.round(n - r)),
  deg:  (r) => r * 180 / Math.PI,
  rad:  (d) => d * Math.PI / 180,
  pow:  (b, e) => Math.pow(b, e),
  mod:  (a, b) => a % b,
  hypot: (...args) => Math.hypot(...args),
};

class Parser {
  private pos = 0;
  private expr: string;
  constructor(expr: string) {
    this.expr = expr.replace(/\s+/g, "").toLowerCase();
  }
  private peek() { return this.expr[this.pos]; }
  private eat(c: string) { if (this.expr[this.pos] === c) { this.pos++; return true; } return false; }
  private eatStr(s: string) {
    if (this.expr.startsWith(s, this.pos)) { this.pos += s.length; return true; } return false;
  }
  parse(): number { const v = this.parseAddSub(); if (this.pos < this.expr.length) throw new Error("Unexpected: " + this.expr[this.pos]); return v; }
  private parseAddSub(): number {
    let left = this.parseMulDiv();
    while (true) {
      if (this.eat("+")) { left += this.parseMulDiv(); }
      else if (this.eat("-")) { left -= this.parseMulDiv(); }
      else break;
    }
    return left;
  }
  private parseMulDiv(): number {
    let left = this.parsePow();
    while (true) {
      if (this.eat("*")) { left *= this.parsePow(); }
      else if (this.eat("/")) { const r = this.parsePow(); left = r === 0 ? Infinity * Math.sign(left) : left / r; }
      else if (this.eat("%")) { left %= this.parsePow(); }
      else break;
    }
    return left;
  }
  private parsePow(): number {
    let base = this.parseUnary();
    if (this.eat("^") || this.eatStr("**")) {
      const exp = this.parseUnary();
      base = Math.pow(base, exp);
    }
    return base;
  }
  private parseUnary(): number {
    if (this.eat("-")) return -this.parsePostfix();
    if (this.eat("+")) return this.parsePostfix();
    return this.parsePostfix();
  }
  private parsePostfix(): number {
    let v = this.parsePrimary();
    while (this.eat("!")) { v = factorial(Math.round(v)); }
    return v;
  }
  private parsePrimary(): number {
    // Parenthesised
    if (this.eat("(")) {
      const v = this.parseAddSub();
      if (!this.eat(")")) throw new Error("Missing )");
      return v;
    }
    // Number
    if (/\d/.test(this.peek()) || this.peek() === ".") {
      return this.parseNumber();
    }
    // Identifier: function or constant
    const ident = this.parseIdent();
    if (!ident) throw new Error("Unexpected char: " + this.peek());
    // Check constants first
    if (ident in CONSTANTS) {
      // Implicit multiplication: pi2 → 2*pi check: after constant, digit or ( means implicit mul
      let v = CONSTANTS[ident];
      // implicit multiplication after constant: e.g. 2pi or pi2
      if (/\d/.test(this.peek()) || this.peek() === "(") {
        v *= this.parsePrimary();
      }
      return v;
    }
    // Function
    if (ident in FUNCTIONS) {
      if (!this.eat("(")) throw new Error(`Expected ( after ${ident}`);
      const args: number[] = [this.parseAddSub()];
      while (this.eat(",")) args.push(this.parseAddSub());
      if (!this.eat(")")) throw new Error("Missing )");
      return FUNCTIONS[ident](...args);
    }
    throw new Error(`Unknown: ${ident}`);
  }
  private parseIdent(): string {
    let s = "";
    while (/[a-z_]/.test(this.peek())) { s += this.expr[this.pos++]; }
    return s;
  }
  private parseNumber(): number {
    let s = "";
    while (/[\d.]/.test(this.peek())) { s += this.expr[this.pos++]; }
    if (this.peek() === "e") {
      s += "e";
      this.pos++;
      if (this.peek() === "+" || this.peek() === "-") { s += this.expr[this.pos++]; }
      while (/\d/.test(this.peek())) { s += this.expr[this.pos++]; }
    }
    return parseFloat(s);
  }
}

function evaluate(expr: string): string {
  try {
    // Preprocess: handle implicit multiplication between number and identifier (2pi, 3sin)
    // and common notation shortcuts
    let e = expr.trim();
    if (!e) return "";
    // Replace × ÷ with * /
    e = e.replace(/×/g, "*").replace(/÷/g, "/");
    // implicit multiplication: number then identifier like 2pi, 3sin
    e = e.replace(/(\d)(pi|e|phi|τ|π|sin|cos|tan|asin|acos|atan|sqrt|cbrt|abs|log|ln|exp|ceil|floor|round|fact)/g, "$1*$2");
    const result = new Parser(e).parse();
    if (!isFinite(result)) return result > 0 ? "∞" : result < 0 ? "-∞" : "undefined";
    if (isNaN(result)) return "undefined";
    // Format result
    if (Number.isInteger(result) && Math.abs(result) < 1e15) return result.toString();
    // Use toPrecision for small/large numbers
    const abs = Math.abs(result);
    if (abs < 1e-10 || abs > 1e12) return result.toPrecision(10).replace(/\.?0+$/, "");
    return parseFloat(result.toPrecision(12)).toString();
  } catch (err: any) {
    return "Error: " + (err.message ?? "Invalid expression");
  }
}

// ── History ────────────────────────────────────────────────────────────────────
interface HistEntry { expr: string; result: string; }

// ── Button grid definition ────────────────────────────────────────────────────
type BtnDef = { label: string; value: string; color?: string; colspan?: number; action?: "clear" | "back" | "eval" | "toggle-mode"; };

const BUTTONS: BtnDef[][] = [
  [
    { label: "sin", value: "sin(" }, { label: "cos", value: "cos(" }, { label: "tan", value: "tan(" }, { label: "√", value: "sqrt(" },
  ],
  [
    { label: "ln", value: "ln(" }, { label: "log", value: "log(" }, { label: "eˣ", value: "exp(" }, { label: "x²", value: "^2" },
  ],
  [
    { label: "π", value: "pi" }, { label: "e", value: "e" }, { label: "(", value: "(" }, { label: ")", value: ")" },
  ],
  [
    { label: "7", value: "7" }, { label: "8", value: "8" }, { label: "9", value: "9" }, { label: "÷", value: "/" },
  ],
  [
    { label: "4", value: "4" }, { label: "5", value: "5" }, { label: "6", value: "6" }, { label: "×", value: "*" },
  ],
  [
    { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "−", value: "-" },
  ],
  [
    { label: ".", value: "." }, { label: "0", value: "0" }, { label: "xⁿ", value: "^" }, { label: "+", value: "+" },
  ],
  [
    { label: "C", value: "", action: "clear", color: "#f87171" },
    { label: "⌫", value: "", action: "back", color: "#fbbf24" },
    { label: "=", value: "", action: "eval", color: "#4f8ef7", colspan: 2 },
  ],
];

interface Props {
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function MathCalc({ isOpen, onOpenChange }: Props) {
  const [expr, setExpr] = useState("");
  const [preview, setPreview] = useState("");
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const controlled = isOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? isOpen : internalOpen;
  function setOpen(v: boolean) { controlled ? onOpenChange?.(v) : setInternalOpen(v); }

  // Live preview
  useEffect(() => {
    if (!expr) { setPreview(""); return; }
    const r = evaluate(expr);
    setPreview(r.startsWith("Error") ? "" : r !== expr ? r : "");
  }, [expr]);

  const compute = useCallback(() => {
    if (!expr) return;
    const result = evaluate(expr);
    setHistory(h => [{ expr, result }, ...h.slice(0, 29)]);
    setExpr(result.startsWith("Error") || result === "undefined" ? expr : result);
    setPreview("");
  }, [expr]);

  function press(btn: BtnDef) {
    if (btn.action === "clear") { setExpr(""); setPreview(""); return; }
    if (btn.action === "back") { setExpr(e => e.slice(0, -1)); return; }
    if (btn.action === "eval") { compute(); return; }
    setExpr(e => e + btn.value);
    inputRef.current?.focus();
  }

  const cardStyle: React.CSSProperties = {
    position: "fixed", bottom: "80px", left: "268px", zIndex: 9001,
    width: "280px",
    background: "rgba(14,16,28,0.98)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px",
    boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
    backdropFilter: "blur(18px)",
    overflow: "hidden",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="calc"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={cardStyle}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 0" }}>
            <div style={{ display: "flex", gap: "2px" }}>
              <button onClick={() => setShowHistory(false)} style={tabBtn(!showHistory)}>Calc</button>
              <button onClick={() => setShowHistory(true)} style={tabBtn(showHistory)}>History</button>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "4px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {showHistory ? (
              <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "10px 12px 12px", maxHeight: "280px", overflowY: "auto" }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.25)", padding: "20px 0" }}>No calculations yet</div>
                ) : history.map((h, i) => (
                  <div key={i} onClick={() => { setExpr(h.result); setShowHistory(false); }}
                    style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.expr}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#4f8ef7", fontVariantNumeric: "tabular-nums" }}>{h.result}</div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="calc-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Display */}
                <div style={{ padding: "6px 12px 4px" }}>
                  <input
                    ref={inputRef}
                    value={expr}
                    onChange={e => setExpr(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") compute(); }}
                    placeholder="0"
                    style={{
                      width: "100%", background: "none", border: "none", outline: "none",
                      fontSize: "22px", fontWeight: 800, color: "#fff", textAlign: "right",
                      fontVariantNumeric: "tabular-nums", fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                  {preview && (
                    <div style={{ textAlign: "right", fontSize: "13px", color: "#4f8ef7", fontVariantNumeric: "tabular-nums", paddingBottom: "4px" }}>
                      = {preview}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div style={{ padding: "4px 8px 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {BUTTONS.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: "4px" }}>
                      {row.map(btn => (
                        <button
                          key={btn.label}
                          onClick={() => press(btn)}
                          style={{
                            flex: btn.colspan ?? 1,
                            padding: "9px 4px",
                            borderRadius: "7px",
                            border: "none",
                            background: btn.color
                              ? btn.action === "eval"
                                ? `linear-gradient(135deg,${btn.color},#a78bfa)`
                                : btn.color + "22"
                              : "rgba(255,255,255,0.06)",
                            color: btn.color ? btn.color : "rgba(255,255,255,0.75)",
                            fontSize: "13px", fontWeight: 700, cursor: "pointer",
                            transition: "all 0.1s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = btn.color ? btn.color + "44" : "rgba(255,255,255,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = btn.color
                            ? btn.action === "eval" ? `linear-gradient(135deg,${btn.color},#a78bfa)` : btn.color + "22"
                            : "rgba(255,255,255,0.06)")}
                        >
                          {btn.label}
                        </button>
                      ))}
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

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.15s",
    background: active ? "rgba(255,255,255,0.1)" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.3)",
  };
}
