// ═══════════════════════════════════════════════════════
// DIGITAL LOGISTICS ACADEMY
// Modular enterprise learning platform
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────
const T = {
  // Core palette
  white: "#ffffff",
  bg: "#f4f6f9",
  bgDeep: "#eef1f5",
  surface: "#ffffff",
  surfaceRaised: "#f8fafc",

  // Brand blues
  navy: "#0a1628",
  navyMid: "#1a2d4a",
  blue: "#1565c0",
  blueMid: "#1976d2",
  blueLight: "#e3f0ff",
  blueSoft: "#bbdefb",
  teal: "#0097a7",

  // Status
  green: "#2e7d32",
  greenMid: "#388e3c",
  greenLight: "#e8f5e9",
  greenBorder: "#a5d6a7",
  amber: "#e65100",
  amberMid: "#f57c00",
  amberLight: "#fff3e0",
  amberBorder: "#ffcc80",
  red: "#c62828",
  redMid: "#d32f2f",
  redLight: "#ffebee",
  redBorder: "#ef9a9a",

  // Text
  text: "#0d1b2e",
  textMed: "#334e68",
  textLight: "#627d98",
  textXLight: "#9fb3c8",

  // Borders
  border: "#dde3ec",
  borderMid: "#c5cfe0",

  // Fonts
  fontSans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontDisplay: "'Sora', 'DM Sans', sans-serif",
};

// ─── GLOBAL CSS ─────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }
body {
  background: ${T.bg};
  color: ${T.text};
  font-family: ${T.fontSans};
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

:root {
  --shadow-xs: 0 1px 2px rgba(10,22,40,0.06);
  --shadow-sm: 0 2px 8px rgba(10,22,40,0.08), 0 1px 3px rgba(10,22,40,0.06);
  --shadow-md: 0 4px 16px rgba(10,22,40,0.10), 0 2px 6px rgba(10,22,40,0.07);
  --shadow-lg: 0 8px 32px rgba(10,22,40,0.12), 0 4px 12px rgba(10,22,40,0.08);
  --shadow-xl: 0 20px 60px rgba(10,22,40,0.15), 0 8px 24px rgba(10,22,40,0.10);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${T.borderMid}; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: ${T.textXLight}; }

/* Animations */
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes truckMove { 0% { transform: translateX(0); } 100% { transform: translateX(var(--truck-dist, 200px)); } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes successPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
@keyframes warningPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(214,48,0,0.3); } 50% { box-shadow: 0 0 0 8px rgba(214,48,0,0); } }
@keyframes progressFill { from { width: 0%; } to { width: var(--progress-width, 100%); } }
@keyframes dotBounce { 0%, 80%, 100% { transform: scale(0.6); } 40% { transform: scale(1); } }
@keyframes timelineDrop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes glow { 0%, 100% { box-shadow: 0 0 12px rgba(21, 101, 192, 0.3); } 50% { box-shadow: 0 0 24px rgba(21, 101, 192, 0.6); } }
@keyframes warningPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(198,40,40,0.25); } 50% { box-shadow: 0 0 0 8px rgba(198,40,40,0); } }

.anim-fadeUp { animation: fadeUp 0.5s ease both; }
.anim-fadeIn { animation: fadeIn 0.4s ease both; }
.anim-popIn { animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.anim-slideLeft { animation: slideLeft 0.4s ease both; }

button { cursor: pointer; font-family: inherit; }
button:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }

select { font-family: inherit; }

/* ── Mobile responsive ── */
@media (max-width: 640px) {
  .grid-2col { grid-template-columns: 1fr !important; }
  .hide-mobile { display: none !important; }
  .nav-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; justify-content: flex-start !important; gap: 2px !important; }
  .nav-scroll::-webkit-scrollbar { display: none; }
  .mobile-pad { padding-left: 12px !important; padding-right: 12px !important; }
  .slider-stack { flex-direction: column !important; }
}
`;

// ═══════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════

const ITEMS_DATA = [
  { id: "screws", name: "Anchor Bolt Set", weight: 2.4, dims: "30×20×15 cm", type: "parcel", icon: "🪛", price: 55 },
  { id: "grinder_pal", name: "Grinding System (Pallet)", weight: 42.0, dims: "120×80×90 cm", type: "freight", icon: "⚙️", price: 1850 },
  { id: "rail6", name: "Mounting Rail 6m", weight: 12.5, dims: "600×5×5 cm", type: "long_goods", icon: "📏", price: 145 },
  { id: "battery", name: "Li-Ion Battery Pack", weight: 3.8, dims: "30×15×12 cm", type: "hazmat", icon: "🔋", price: 320, hazmat: { class: "ADR 9", un: "UN3480" } },
];

const SERVICE_LEVELS_DATA = [
  { id: "standard", name: "Standard", desc: "3–5 business days", icon: "📦", cost_mult: 1, sla: 5 },
  { id: "express", name: "Express Next Day", desc: "Next working day", icon: "⚡", cost_mult: 2.4, sla: 1 },
  { id: "time10", name: "Time Option 10:00", desc: "Before 10:00 AM", icon: "🕙", cost_mult: 3.8, sla: 1 },
];

const CARRIERS_DATA = [
  { id: "gls", name: "GLS Parcel", logo: "🔵", base: 11.5, long_goods: false, freight: false, time10: false, hazmat: false, max_dim: 200, countries: ["DE","AT","NL","PL"] },
  { id: "emons", name: "Emons Freight", logo: "🔴", base: 36.0, long_goods: true, freight: true, time10: false, hazmat: false, max_dim: 700, countries: ["DE","AT","PL"] },
  { id: "dachser", name: "Dachser", logo: "🟢", base: 42.0, long_goods: true, freight: true, time10: true, hazmat: true, max_dim: 700, countries: ["DE","AT","PL","NL"] },
  { id: "dhl_express", name: "DHL Express", logo: "🟡", base: 62.0, long_goods: false, freight: false, time10: true, hazmat: false, max_dim: 150, countries: ["DE","AT","NL"] },
  { id: "tdg", name: "TDG Specialist", logo: "☢️", base: 88.0, long_goods: false, freight: true, time10: false, hazmat: true, max_dim: 300, countries: ["DE","AT","NL","PL"] },
];

const WAREHOUSES_DATA = [
  { id: "de_obh", name: "Oberhausen DC", flag: "🇩🇪", items: ["screws","battery","grinder_pal"], capacity: 85, stock: { screws: 3, battery: 2, grinder_pal: 1, rail6: 0 } },
  { id: "de_nbg", name: "Nürnberg DC", flag: "🇩🇪", items: ["grinder_pal","screws"], capacity: 60, stock: { screws: 2, battery: 0, grinder_pal: 3, rail6: 0 } },
  { id: "lg_hub", name: "Long Goods Hub", flag: "🏭", items: ["rail6"], capacity: 70, stock: { screws: 0, battery: 0, grinder_pal: 0, rail6: 4 } },
  { id: "at_vie", name: "Wien DC", flag: "🇦🇹", items: ["screws","grinder_pal"], capacity: 55 },
];

const COUNTRIES_DATA = { DE: "Germany", AT: "Austria", NL: "Netherlands", PL: "Poland" };

const WH_ZONES_DATA = [
  { id: "inbound", name: "Inbound", icon: "🚛", desc: "Goods arrive & scanned into SAP" },
  { id: "storage", name: "Storage", icon: "🗄️", desc: "Items at pick-bin in EWM" },
  { id: "picking", name: "Picking", icon: "🤚", desc: "Transfer order created" },
  { id: "packing", name: "Packing", icon: "📦", desc: "Packed per ORTEC proposal" },
  { id: "staging", name: "Staging", icon: "🏷️", desc: "Labelled shipment staged" },
  { id: "loading", name: "Departure", icon: "🚚", desc: "Loaded, departure scan fires" },
];

const ONBOARDING_STEPS = [
  { id: 0, label: "Order", icon: "🛒", sys: "Webshop" },
  { id: 1, label: "Inventory", icon: "📋", sys: "SAP MM" },
  { id: 2, label: "Delivery Docs", icon: "📄", sys: "SAP SD" },
  { id: 3, label: "Pack Prop.", icon: "📐", sys: "ORTEC" },
  { id: 4, label: "Carrier", icon: "🚛", sys: "TMS" },
  { id: 5, label: "Warehouse", icon: "🏭", sys: "SAP EWM" },
  { id: 6, label: "Delivery", icon: "📍", sys: "Last Mile" },
  { id: 7, label: "Complete", icon: "✅", sys: "POD" },
];

// ═══════════════════════════════════════════════════════
// BUSINESS LOGIC
// ═══════════════════════════════════════════════════════

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function computeCarrierEligibility(items, serviceLevel, country) {
  const hasLong = items.some(i => i.type === "long_goods");
  const hasHazmat = items.some(i => i.type === "hazmat");
  const hasFr = items.some(i => i.type === "freight");
  const isTime10 = serviceLevel === "time10";
  return CARRIERS_DATA.map(c => {
    const reasons = [];
    if (!c.countries.includes(country)) reasons.push(`Not available in ${COUNTRIES_DATA[country]}`);
    if (hasLong && !c.long_goods) reasons.push("Long goods not supported");
    if (hasFr && !c.freight) reasons.push("Pallet freight not supported");
    if (isTime10 && !c.time10) reasons.push("10:00 time option unavailable");
    if (hasHazmat && !c.hazmat) reasons.push("ADR Class 9 not certified");
    return { ...c, eligible: reasons.length === 0, reasons };
  });
}

function computeFreightCost(carrier, items, serviceLevel) {
  const sl = SERVICE_LEVELS_DATA.find(s => s.id === serviceLevel);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const weightFactor = totalWeight > 10 ? 1.4 : 1;
  const hazmatSurcharge = items.some(i => i.type === "hazmat") ? 18 : 0;
  return +(carrier.base * sl.cost_mult * weightFactor + hazmatSurcharge).toFixed(2);
}

function buildDeliveries(quantities) {
  const firstUnits = ITEMS_DATA.filter(item => (quantities[item.id] ?? 0) > 0);
  // Back order only when qty > 2 (extra units beyond 2)
  const backItems = ITEMS_DATA.flatMap(item => {
    const extra = (quantities[item.id] ?? 0) - 2;
    return extra > 0 ? Array(extra).fill(item) : [];
  });
  const longs = firstUnits.filter(i => i.type === "long_goods");
  const freight = firstUnits.filter(i => i.type === "freight");
  const primary = firstUnits.filter(i => i.type !== "long_goods" && i.type !== "freight");
  const d = [];
  if (primary.length) d.push({ id: `8000${rand(10000,99999)}`, wh: "Oberhausen DC", items: primary, flag: "🇩🇪" });
  if (freight.length) d.push({ id: `8000${rand(10000,99999)}`, wh: "Nürnberg DC", items: freight, flag: "🇩🇪" });
  if (longs.length) d.push({ id: `8000${rand(10000,99999)}`, wh: "Long Goods Hub", items: longs, flag: "🏭" });
  if (backItems.length > 0) d.push({ id: `8000${rand(10000,99999)}`, wh: "Oberhausen DC", items: backItems, flag: "🇩🇪", backOrder: true, delayDays: 2 });
  return d;
}

// ═══════════════════════════════════════════════════════
// REUSABLE UI COMPONENTS
// ═══════════════════════════════════════════════════════

// — KPI Badge —
function KPIBadge({ label, value, status = "neutral", sub }) {
  const colors = {
    green: { bg: T.greenLight, border: T.greenBorder, val: T.green, bar: T.green },
    red: { bg: T.redLight, border: T.redBorder, val: T.red, bar: T.red },
    amber: { bg: T.amberLight, border: T.amberBorder, val: T.amber, bar: T.amber },
    blue: { bg: T.blueLight, border: T.blueSoft, val: T.blue, bar: T.blue },
    neutral: { bg: T.surfaceRaised, border: T.border, val: T.text, bar: T.textLight },
  };
  const c = colors[status];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius-md)", padding: "12px 16px", minWidth: 120 }}>
      <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: T.fontMono, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: c.val, fontFamily: T.fontDisplay, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// — Timeline Card —
function TimelineCard({ time, title, subtitle, status = "done", icon, delay = 0, warning }) {
  const statusStyles = {
    done: { dot: T.green, line: T.green, bg: T.surface },
    active: { dot: T.blue, line: T.blue, bg: T.blueLight },
    pending: { dot: T.borderMid, line: T.border, bg: T.surfaceRaised },
    warning: { dot: T.red, line: T.redBorder, bg: T.redLight },
    amber: { dot: T.amber, line: T.amberBorder, bg: T.amberLight },
  };
  const s = statusStyles[status] || statusStyles.done;
  return (
    <div style={{ display: "flex", gap: 14, animation: `timelineDrop 0.4s ease ${delay}s both` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.dot, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white", fontWeight: 700, boxShadow: status === "active" ? `0 0 0 4px ${s.dot}33` : "none", animation: status === "active" ? "glow 2s infinite" : "none" }}>
          {status === "warning" ? "!" : status === "done" ? (icon || "✓") : (icon || "·")}
        </div>
        <div style={{ width: 2, flex: 1, minHeight: 20, background: s.line, marginTop: 4 }} />
      </div>
      <div style={{ background: s.bg, border: `1px solid ${status === "warning" ? T.redBorder : status === "amber" ? T.amberBorder : T.border}`, borderRadius: "var(--radius-md)", padding: "10px 14px", flex: 1, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.textLight, marginBottom: 3 }}>{time}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: status === "warning" ? T.red : status === "amber" ? T.amber : T.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMed, marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
        {warning && <div style={{ marginTop: 8, padding: "6px 10px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-sm)", fontSize: 12, color: T.red, fontWeight: 500 }}>⚠ {warning}</div>}
      </div>
    </div>
  );
}

// — Process Flow Step —
function ProcessStep({ icon, label, system, active, done, index }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: active || done ? 1 : 0.4, transition: "opacity 0.3s" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: done ? T.green : active ? T.blue : T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "all 0.4s", boxShadow: active ? `0 0 0 4px ${T.blueLight}` : done ? `0 0 0 3px ${T.greenLight}` : "none" }}>
        {done ? "✓" : icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: done ? T.green : active ? T.blue : T.textLight, textAlign: "center", maxWidth: 64, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 9, color: T.textXLight, fontFamily: T.fontMono, textAlign: "center" }}>{system}</div>
    </div>
  );
}

// — Info Box —
function InfoBox({ title, children, variant = "info" }) {
  const v = {
    info: { bg: T.blueLight, border: "#90caf9", borderLeft: T.blue, titleColor: T.blue },
    warning: { bg: T.amberLight, border: T.amberBorder, borderLeft: T.amber, titleColor: T.amber },
    error: { bg: T.redLight, border: T.redBorder, borderLeft: T.red, titleColor: T.red },
    success: { bg: T.greenLight, border: T.greenBorder, borderLeft: T.green, titleColor: T.green },
  }[variant];
  return (
    <div style={{ background: v.bg, border: `1px solid ${v.border}`, borderLeft: `4px solid ${v.borderLeft}`, borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 14 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: v.titleColor, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: T.fontMono, marginBottom: 6 }}>{title}</div>}
      <div style={{ fontSize: 13, color: T.textMed, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

// — Section Card —
function Card({ children, style }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

// — Chip / Tag —
function Chip({ label, color = "blue" }) {
  const colors = {
    blue: { bg: T.blueLight, text: T.blue, border: T.blueSoft },
    green: { bg: T.greenLight, text: T.green, border: T.greenBorder },
    red: { bg: T.redLight, text: T.red, border: T.redBorder },
    amber: { bg: T.amberLight, text: T.amber, border: T.amberBorder },
    gray: { bg: T.surfaceRaised, text: T.textMed, border: T.border },
    hazmat: { bg: "#fff8e1", text: "#b45309", border: "#fcd34d" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: T.fontMono, fontWeight: 600, display: "inline-block", margin: "1px" }}>
      {label}
    </span>
  );
}

// — Primary Button —
function Btn({ children, onClick, disabled, variant = "primary", size = "md" }) {
  const v = {
    primary: { bg: T.blue, color: "white", border: T.blue, hover: T.navyMid },
    secondary: { bg: "transparent", color: T.blue, border: T.blue },
    ghost: { bg: "transparent", color: T.textMed, border: T.border },
    danger: { bg: T.red, color: "white", border: T.red },
    success: { bg: T.green, color: "white", border: T.green },
  }[variant];
  const s = { sm: { fontSize: 12, padding: "7px 16px" }, md: { fontSize: 13, padding: "10px 24px" }, lg: { fontSize: 15, padding: "13px 32px" } }[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: disabled ? T.border : v.bg, color: disabled ? T.textLight : v.color, border: `1.5px solid ${disabled ? T.border : v.border}`, borderRadius: "var(--radius-md)", fontWeight: 600, fontFamily: T.fontSans, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 8, ...s }}
    >
      {children}
    </button>
  );
}

// — Step Header —
function StepHeader({ step, title, subtitle, system }) {
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ background: T.blue, color: "white", borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 11, fontWeight: 700, fontFamily: T.fontMono }}>STEP {step}</div>
        {system && <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "var(--radius-sm)", padding: "3px 10px", fontSize: 11, fontFamily: T.fontMono, color: T.textLight }}>{system}</div>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: T.textMed, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

// — Top Navigation —
function TopNav({ view, setView }) {
  return (
    <nav style={{ background: T.navy, color: "white", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, background: T.blue, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, letterSpacing: -1, color: "white" }}>DL</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: T.fontDisplay, letterSpacing: "-0.3px" }}>Digital Logistics Academy</div>
          <div style={{ fontSize: 10, color: "#8eaac8", fontFamily: T.fontMono }}>Enterprise Learning Platform</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }} className="nav-scroll">
        {[
          { id: "home", label: "Home" },
          { id: "onboarding", label: "Onboarding" },
          { id: "exceptions", label: "Exception Lab" },
          { id: "kpi", label: "KPI Understanding" },
          { id: "newkpi", label: "New KPI Logic" },
          { id: "simulator", label: "KPI Simulator" },
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: view === item.id ? T.blue : "transparent", color: view === item.id ? "white" : "#8eaac8", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════
// HOME / LANDING
// ═══════════════════════════════════════════════════════

function HomeScreen({ setView }) {
  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyMid} 50%, #1a3a5c 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>

      {/* ── WIP Disclaimer ── */}
      <div style={{ maxWidth: 900, width: "100%", marginBottom: 32, animation: "fadeUp 0.4s ease both" }}>
        <div style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)", borderLeft: "4px solid #fb923c", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🚧</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fb923c", fontFamily: T.fontMono, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 4 }}>Work in Progress</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              This platform is under active development. Processes, KPI definitions and system flows are <strong style={{ color: "rgba(255,255,255,0.75)" }}>simplified for learning purposes</strong> and may not fully reflect actual company processes, system configurations or KPI definitions. Errors and inaccuracies may be present. Please share feedback directly if you spot any.
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 60, animation: "fadeUp 0.6s ease both" }}>
        <div style={{ fontSize: 13, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>Logistics Onboarding &amp; Advanced Learning</div>
        <h1 style={{ fontSize: 52, fontWeight: 800, color: "white", fontFamily: T.fontDisplay, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1px" }}>
          Digital Logistics<br />
          <span style={{ color: "#60b4ff" }}>Academy</span>
        </h1>
        <p style={{ fontSize: 17, color: "#8eaac8", maxWidth: 520, lineHeight: 1.7, margin: "0 auto" }}>
          Master end-to-end logistics processes through interactive simulations. From standard happy flow to complex operational failures.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900, width: "100%" }} className="grid-2col">
        {/* Onboarding Card */}
        <div
          onClick={() => setView("onboarding")}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32, cursor: "pointer", transition: "all 0.25s", animation: "fadeUp 0.6s 0.1s ease both" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(96,180,255,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ fontSize: 44, marginBottom: 16 }}>🎓</div>
          <div style={{ display: "inline-block", background: "rgba(96,180,255,0.15)", border: "1px solid rgba(96,180,255,0.3)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#60b4ff", fontFamily: T.fontMono, fontWeight: 600, marginBottom: 12 }}>MODULE 1</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: T.fontDisplay, marginBottom: 10 }}>Onboarding</h2>
          <p style={{ fontSize: 14, color: "#8eaac8", lineHeight: 1.7, marginBottom: 20 }}>Learn the standard happy flow. Walk through a complete order from customer click to doorstep delivery across all systems.</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {["SAP S/4HANA","ORTEC","TMS","EWM","Last Mile"].map(s => (
              <span key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "#8eaac8", fontFamily: T.fontMono }}>
                {s}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#60b4ff" }}>
            Start Learning <span>→</span>
          </div>
        </div>

        {/* Exception Lab Card */}
        <div
          onClick={() => setView("exceptions")}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32, cursor: "pointer", transition: "all 0.25s", animation: "fadeUp 0.6s 0.2s ease both" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(251,146,60,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔬</div>
          <div style={{ display: "inline-block", background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#fb923c", fontFamily: T.fontMono, fontWeight: 600, marginBottom: 12 }}>MODULE 2</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: T.fontDisplay, marginBottom: 10 }}>Exception Lab</h2>
          <p style={{ fontSize: 14, color: "#8eaac8", lineHeight: 1.7, marginBottom: 20 }}>Diagnose operational failures. Understand hidden logistics risks that can look green in dashboards but red to customers.</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {["Inbound Cutoff","OTS Loading","Root Cause","KPI Impact","Customer Impact"].map(s => (
              <span key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "#8eaac8", fontFamily: T.fontMono }}>
                {s}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#fb923c" }}>
            Enter Lab <span>→</span>
          </div>
        </div>

        {/* KPI Understanding Card */}
        <div
          onClick={() => setView("kpi")}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32, cursor: "pointer", transition: "all 0.25s", animation: "fadeUp 0.6s 0.3s ease both", gridColumn: "1 / -1" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(96,180,255,0.4)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ fontSize: 44 }}>📊</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "inline-block", background: "rgba(96,180,255,0.15)", border: "1px solid rgba(96,180,255,0.3)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#60b4ff", fontFamily: T.fontMono, fontWeight: 600, marginBottom: 8 }}>MODULE 3</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: T.fontDisplay, marginBottom: 8 }}>KPI Understanding</h2>
              <p style={{ fontSize: 14, color: "#8eaac8", lineHeight: 1.7 }}>Master the measurement windows of CPA, SDPA, WSP, CTE and OTIF. See how each KPI can succeed or fail independently — and how they nest inside the OTIF outer bracket.</p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["CPA","SDPA","WSP","CTE","OTIF"].map(k => (
                <span key={k} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "#8eaac8", fontFamily: T.fontMono, fontWeight: 700 }}>{k}</span>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#60b4ff", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              Explore KPIs <span>→</span>
            </div>
          </div>
        </div>

        {/* KPI Simulator Card */}
        <div
          onClick={() => setView("simulator")}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32, cursor: "pointer", transition: "all 0.25s", animation: "fadeUp 0.6s 0.4s ease both", gridColumn: "1 / -1" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ fontSize: 44 }}>🎛️</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "inline-block", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#34d399", fontFamily: T.fontMono, fontWeight: 600, marginBottom: 8 }}>MODULE 5 · NEW</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: T.fontDisplay, marginBottom: 8 }}>KPI Simulator</h2>
              <p style={{ fontSize: 14, color: "#8eaac8", lineHeight: 1.7 }}>Move event times with sliders — Inbound scan, PGI and POD. Watch the dots shift live inside or outside their KPI windows and see exactly which KPIs flip red.</p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["🚛 Inbound","✅ PGI","📍 POD","Live OTIF"].map(k => (
                <span key={k} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "#8eaac8", fontFamily: T.fontMono, fontWeight: 600 }}>{k}</span>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              Try it <span>→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Process ribbon */}
      <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 0, overflowX: "auto", maxWidth: 900, width: "100%", animation: "fadeUp 0.6s 0.3s ease both", scrollbarWidth: "none", padding: "0 4px" }}>
        {["🛒 Order","📋 SAP MM","📄 SAP SD","📐 ORTEC","🚛 TMS","🏭 EWM","📍 Transit","✅ Delivery"].map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", padding: "6px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, whiteSpace: "nowrap" }}>{step}</div>
            {i < 7 && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, padding: "0 4px" }}>›</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ONBOARDING MODULE
// ═══════════════════════════════════════════════════════

function OnboardingModule() {
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [svcLevel, setSvcLevel] = useState("standard");
  const [country, setCountry] = useState("DE");
  const [deliveries, setDeliveries] = useState([]);
  const [chosenCMap, setChosenCMap] = useState({});
  const [deliveryCarriers, setDeliveryCarriers] = useState({});
  const [ortec, setOrtec] = useState(null);
  const [whPhase, setWhPhase] = useState(0);
  const [trackEvts, setTrackEvts] = useState([]);
  const [randEvt, setRandEvt] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(null);
  const [quizCorrect, setQuizCorrect] = useState(null);

  const selItems = ITEMS_DATA.flatMap(item => Array(quantities[item.id] ?? 0).fill(item));
  const totalQty = selItems.length;

  function setQty(id, qty) { setQuantities(prev => ({ ...prev, [id]: Math.max(0, qty) })); }

  function goToInventory() {
    const d = buildDeliveries(quantities);
    setDeliveries(d);
    setStep(1);
  }

  function goToSAP() { setStep(2); }

  function goToOrtec() {
    const parcelCount = selItems.filter(i => i.type === "parcel").length;
    const freightPallets = selItems.filter(i => i.type === "freight").length;
    const hasLong = selItems.some(i => i.type === "long_goods");
    const hasHz = selItems.some(i => i.type === "hazmat");
    const tw = selItems.reduce((s, i) => s + i.weight, 0);
    setOrtec({ cartons: parcelCount + (hasHz ? 1 : 0), pallets: freightPallets, longGoods: hasLong ? 1 : 0, hasHz, totalWeight: tw, lm: +(tw * 0.04 + (hasLong ? 2.5 : 0)).toFixed(2) });
    setStep(3);
  }

  function goToTMS() {
    const dcMap = {}; const bestMap = {};
    for (const d of deliveries) {
      const el = computeCarrierEligibility(d.items, svcLevel, country);
      dcMap[d.id] = el;
      const eligible = el.filter(c => c.eligible);
      bestMap[d.id] = eligible.sort((a, b) => computeFreightCost(a, d.items, svcLevel) - computeFreightCost(b, d.items, svcLevel))[0] || null;
    }
    setDeliveryCarriers(dcMap); setChosenCMap(bestMap); setStep(4);
  }

  function goToWarehouse() { setWhPhase(0); setStep(5); }

  useEffect(() => {
    if (step !== 5) return;
    if (whPhase >= WH_ZONES_DATA.length) return;
    const t = setTimeout(() => setWhPhase(p => p + 1), 1200);
    return () => clearTimeout(t);
  }, [step, whPhase]);

  function goToDelivery() {
    const sl = SERVICE_LEVELS_DATA.find(s => s.id === svcLevel);
    const evts = [
      { time: "Day 1 · 18:00", desc: "Departure Scan", sub: "Shipment left warehouse", done: true },
      { time: "Day 2 · 02:30", desc: "Hub Arrival", sub: "Carrier sorting hub", done: true },
      { time: "Day 2 · 09:45", desc: "Out for Delivery", sub: "Final mile dispatch", done: true },
      { time: sl.id === "time10" ? "Day 2 · 10:00" : "Day 2 · 12:15", desc: "✅ Delivered", sub: "Proof of delivery confirmed", done: true },
    ];
    setTrackEvts(evts);
    setStep(6);
  }

  function goToComplete() { setStep(7); }

  function reset() {
    setStep(0); setQuantities({}); setSvcLevel("standard"); setCountry("DE");
    setDeliveries([]); setChosenCMap({}); setDeliveryCarriers({}); setOrtec(null);
    setWhPhase(0); setTrackEvts([]); setRandEvt(null); setQuizAnswered(null); setQuizCorrect(null);
  }

  const progress = Math.round((step / 7) * 100);

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
      {/* Module header */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px" }}>Module 1</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.fontDisplay, color: T.text }}>Onboarding – Process &amp; Systems</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>{progress}% complete</div>
              <div style={{ width: 160, height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: T.blue, borderRadius: 3, transition: "width 0.5s ease", animation: "progressFill 0.5s ease" }} />
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none", gap: 0 }}>
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: step > s.id ? T.green : step === s.id ? T.blue : T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: step >= s.id ? "white" : T.textLight, transition: "all 0.3s", boxShadow: step === s.id ? `0 0 0 3px ${T.blueLight}` : "none" }}>
                    {step > s.id ? "✓" : s.id + 1}
                  </div>
                  <div style={{ fontSize: 10, color: step > s.id ? T.green : step === s.id ? T.blue : T.textXLight, fontWeight: step === s.id ? 700 : 400, whiteSpace: "nowrap" }}>{s.label}</div>
                </div>
                {i < ONBOARDING_STEPS.length - 1 && <div style={{ width: 32, height: 2, background: step > s.id ? T.green : T.border, margin: "0 4px", marginBottom: 16, transition: "background 0.4s" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 28px" }}>
        {step === 0 && <OBStep0 quantities={quantities} setQty={setQty} svcLevel={svcLevel} setSvcLevel={setSvcLevel} country={country} setCountry={setCountry} onNext={goToInventory} selItems={selItems} />}
        {step === 1 && <OBStep1 selItems={selItems} deliveries={deliveries} onNext={goToSAP} />}
        {step === 2 && <OBStep2 deliveries={deliveries} selItems={selItems} svc={svcLevel} onNext={goToOrtec} />}
        {step === 3 && <OBStep3 ortec={ortec} deliveries={deliveries} onNext={goToTMS} />}
        {step === 4 && <OBStep4 deliveries={deliveries} deliveryCarriers={deliveryCarriers} chosenCMap={chosenCMap} setChosenCMap={setChosenCMap} svc={svcLevel} onNext={goToWarehouse} />}
        {step === 5 && <OBStep5 whPhase={whPhase} deliveries={deliveries} onNext={goToDelivery} />}
        {step === 6 && <OBStep6 trackEvts={trackEvts} svc={svcLevel} onNext={goToComplete} />}
        {step === 7 && <OBComplete deliveries={deliveries} chosenCMap={chosenCMap} svc={svcLevel} quizAnswered={quizAnswered} quizCorrect={quizCorrect} setQuizAnswered={setQuizAnswered} setQuizCorrect={setQuizCorrect} onRestart={reset} />}
      </div>
    </div>
  );
}

// ─── ONBOARDING STEPS ───────────────────────────────────

function OBStep0({ quantities, setQty, svcLevel, setSvcLevel, country, setCountry, onNext, selItems }) {
  const hasHz = selItems.some(i => i.type === "hazmat");
  const hasLong = selItems.some(i => i.type === "long_goods");
  const hasFr = selItems.some(i => i.type === "freight");
  const tw = selItems.reduce((s, i) => s + i.weight, 0);
  const tv = selItems.reduce((s, i) => s + i.price, 0);
  const totalQty = selItems.length;

  return (
    <div className="anim-fadeUp">
      <StepHeader step="1 of 8" title="Customer Places an Order" subtitle="Select products, delivery country and service level — exactly as a customer would in the online shop." system="Webshop → SAP" />

      <InfoBox title="What happens in this step?">
        The customer visits the online shop and selects items. The <strong>product type</strong> matters enormously: parcel items ship differently from pallet freight or long goods. Hazardous items require ADR-certified handling. Your product mix determines every system downstream.
      </InfoBox>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {ITEMS_DATA.map(item => {
          const qty = quantities[item.id] ?? 0;
          const sel = qty > 0;
          const borderColor = sel ? (item.type === "hazmat" ? "#b45309" : item.type === "freight" ? T.amber : item.type === "long_goods" ? T.blue : T.green) : T.border;
          const bgColor = sel ? (item.type === "hazmat" ? "#fff8e1" : item.type === "freight" ? T.amberLight : item.type === "long_goods" ? T.blueLight : T.greenLight) : T.surface;
          return (
            <div key={item.id} style={{ background: bgColor, border: `2px solid ${borderColor}`, borderRadius: "var(--radius-md)", padding: 14, transition: "all 0.2s", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <Chip label={item.type === "long_goods" ? "LONG GOODS" : item.type === "hazmat" ? "DG/ADR" : item.type === "freight" ? "FREIGHT" : "PARCEL"} color={item.type === "hazmat" ? "hazmat" : item.type === "freight" ? "amber" : item.type === "long_goods" ? "blue" : "green"} />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>{item.weight} kg · {item.dims} · €{item.price}</div>
                  {item.hazmat && <div style={{ fontSize: 10, color: "#b45309", fontFamily: T.fontMono, fontWeight: 600, marginTop: 2 }}>⚠ {item.hazmat.un} · {item.hazmat.class}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${borderColor}33`, paddingTop: 10 }}>
                <span style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quantity</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setQty(item.id, qty - 1)} disabled={qty === 0} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.borderMid}`, background: T.surface, cursor: qty === 0 ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 700, color: T.textMed, display: "flex", alignItems: "center", justifyContent: "center", opacity: qty === 0 ? 0.3 : 1 }}>−</button>
                  <span style={{ fontSize: 16, fontWeight: 800, minWidth: 20, textAlign: "center", color: qty > 0 ? T.blue : T.textLight, fontFamily: T.fontMono }}>{qty}</span>
                  <button onClick={() => setQty(item.id, qty + 1)} disabled={qty >= 9} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.borderMid}`, background: T.surface, cursor: "pointer", fontSize: 16, fontWeight: 700, color: T.textMed, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasHz && <InfoBox title="⚠ Hazardous Goods — ADR Class 9" variant="warning">Battery Pack UN3480 requires a <strong>Dangerous Goods Declaration</strong>, UN-certified packaging, and an <strong>ADR-certified carrier</strong>. This will filter your carrier options in TMS.</InfoBox>}
      {hasFr && <InfoBox title="Freight Article Detected" variant="info">Pallet freight cannot ship via standard parcel carriers. This may cause a <strong>delivery split</strong> if combined with parcel items.</InfoBox>}
      {hasLong && <InfoBox title="Long Goods Detected" variant="info">The 6m mounting rail requires a specialist long-goods carrier and separate loading point — expect a delivery split.</InfoBox>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMed, display: "block", marginBottom: 6 }}>Delivery Country</label>
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${T.borderMid}`, background: T.surface, fontSize: 13, color: T.text }}>
            {Object.entries(COUNTRIES_DATA).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMed, display: "block", marginBottom: 6 }}>Service Level</label>
          <div style={{ display: "flex", gap: 8 }}>
            {SERVICE_LEVELS_DATA.map(sl => (
              <div key={sl.id} onClick={() => setSvcLevel(sl.id)} style={{ flex: 1, border: `2px solid ${svcLevel === sl.id ? T.blue : T.border}`, borderRadius: "var(--radius-md)", padding: "8px", textAlign: "center", cursor: "pointer", background: svcLevel === sl.id ? T.blueLight : T.surface, transition: "all 0.15s" }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{sl.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: svcLevel === sl.id ? T.blue : T.textMed, lineHeight: 1.2 }}>{sl.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalQty > 0 && (
        <Card style={{ marginBottom: 16, background: T.surfaceRaised }}>
          <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Order Summary</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <KPIBadge label="Items" value={totalQty} status="blue" />
            <KPIBadge label="Weight" value={`${tw.toFixed(1)} kg`} status="blue" />
            <KPIBadge label="Value" value={`€${tv.toLocaleString()}`} status="blue" />
            <KPIBadge label="Country" value={country} status="blue" />
            {hasHz && <KPIBadge label="ADR" value="Class 9" status="amber" sub="Hazmat handling" />}
          </div>
        </Card>
      )}

      <Btn onClick={onNext} disabled={totalQty === 0} size="lg">Check Inventory →</Btn>
    </div>
  );
}

function OBStep1({ selItems, deliveries, onNext }) {
  // Any 2+ delivery documents = split. Backorder is also a split.
  const isSplit = deliveries.length > 1;
  const splitCount = deliveries.length - 1; // number of extra documents beyond the first
  const hasBackOrder = deliveries.some(d => d.backOrder);
  const regularSplits = deliveries.filter(d => !d.backOrder).length - 1;

  return (
    <div className="anim-fadeUp">
      <StepHeader step="2 of 8" title="Inventory Check &amp; Plant Selection" subtitle="SAP MM queries all distribution centers. Items are assigned to the closest available plant." system="SAP MM" />
      <InfoBox title="What happens in this step?">
        SAP runs an <strong>availability check</strong> across all warehouses. If products are in different DCs, or if stock is insufficient, SAP automatically creates <strong>multiple delivery documents</strong> — a delivery split. Every additional delivery document beyond the first is a split, including back orders.
      </InfoBox>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        {WAREHOUSES_DATA.map(wh => {
          const hasNeeded = selItems.some(i => wh.items.includes(i.id));
          return (
            <div key={wh.id} style={{ background: T.surface, border: `1px solid ${hasNeeded ? T.blue : T.border}`, borderRadius: "var(--radius-md)", padding: 14, opacity: selItems.length === 0 || hasNeeded ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{wh.flag}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{wh.name}</div>
                  <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>Capacity {wh.capacity}%</div>
                </div>
                {hasNeeded && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: T.green }}>✓ Has stock</span>}
              </div>
              <div style={{ height: 4, background: T.border, borderRadius: 2, marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${wh.capacity}%`, background: wh.capacity > 70 ? T.green : wh.capacity > 40 ? T.amber : T.red, borderRadius: 2 }} />
              </div>
              {/* Column header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 44px", gap: 4, paddingBottom: 5, marginBottom: 4, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 8, color: T.textXLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px" }}>Article</div>
                <div style={{ fontSize: 8, color: T.textXLight, fontFamily: T.fontMono, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order</div>
                <div style={{ fontSize: 8, color: T.textXLight, fontFamily: T.fontMono, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stock</div>
              </div>
              {ITEMS_DATA.map(item => {
                const stock = wh.stock?.[item.id] ?? (wh.items.includes(item.id) ? 1 : 0);
                const ordered = selItems.filter(i => i.id === item.id).reduce((s, i) => s + (i.qty ?? 1), 0);
                // get qty from selItems — fall back to counting occurrences
                const qtyOrdered = selItems.filter(i => i.id === item.id).length > 0
                  ? (selItems.find(i => i.id === item.id)?.qty ?? selItems.filter(i => i.id === item.id).length)
                  : 0;
                const needed = qtyOrdered > 0;
                const hasEnough = stock >= qtyOrdered;
                const stockColor = !needed ? T.textXLight : hasEnough ? T.green : T.red;
                const orderColor = !needed ? T.textXLight : T.blue;
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 44px 44px", gap: 4, padding: "4px 0", opacity: needed ? 1 : 0.35, borderBottom: `1px solid ${T.border}`, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.textMed }}>{item.icon} {item.name.split(" ").slice(0, 2).join(" ")}</span>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontFamily: T.fontMono, fontWeight: 700, color: orderColor }}>{qtyOrdered > 0 ? qtyOrdered : "—"}</span>
                    </div>
                    <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                      {needed && !hasEnough && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.red, flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, fontFamily: T.fontMono, fontWeight: 700, color: stockColor }}>{stock}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {deliveries.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, textTransform: "uppercase", letterSpacing: "1px", fontFamily: T.fontMono, marginBottom: 12 }}>
            SAP Result — {deliveries.length} Delivery Document{deliveries.length > 1 ? "s" : ""} Created
            {isSplit && <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 10, background: T.redLight, color: T.red, border: `1px solid ${T.redBorder}` }}>SPLIT DETECTED</span>}
          </div>
          {deliveries.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: `1px solid ${d.backOrder ? "#ddd6fe" : T.border}`, borderLeft: `4px solid ${d.backOrder ? "#7c3aed" : i === 0 ? T.green : T.amber}`, borderRadius: "var(--radius-md)", marginBottom: 8, background: d.backOrder ? "#f5f3ff" : T.surfaceRaised }}>
              <span style={{ fontSize: 18 }}>{d.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.wh}</div>
                <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>Doc {d.id}</div>
              </div>
              {/* backorder = split too */}
              <Chip
                label={d.backOrder ? `BACK ORDER / SPLIT +${d.delayDays}d` : i === 0 ? "PRIMARY" : "SPLIT"}
                color={d.backOrder ? "blue" : i === 0 ? "green" : "amber"}
              />
            </div>
          ))}

          {isSplit ? (
            <div>
              <InfoBox variant="warning" title={`Delivery Split — ${splitCount} extra document${splitCount > 1 ? "s" : ""} beyond the primary`}>
                <div>SAP created <strong>{deliveries.length} delivery documents</strong> for this order. Every document beyond the first is a split:</div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {regularSplits > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.amber, display: "inline-block", flexShrink: 0 }} />
                      <span><strong>{regularSplits} location split{regularSplits > 1 ? "s" : ""}</strong> — items stored at different DCs</span>
                    </div>
                  )}
                  {hasBackOrder && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", display: "inline-block", flexShrink: 0 }} />
                      <span><strong>Back order split</strong> — insufficient stock, ships later than the primary delivery. This will <strong>fail OTIF</strong> for the affected items.</span>
                    </div>
                  )}
                </div>
              </InfoBox>
            </div>
          ) : (
            <InfoBox variant="success" title="No Split — Single Delivery Document">All items available from a single DC. Optimal outcome — one delivery, minimal cost, no OTIF risk from splits.</InfoBox>
          )}
        </Card>
      )}

      <Btn onClick={onNext} size="lg">Transfer to SAP SD →</Btn>
    </div>
  );
}

function OBStep2({ deliveries, selItems, svc, onNext }) {
  const sl = SERVICE_LEVELS_DATA.find(s => s.id === svc);
  const hasHz = selItems.some(i => i.type === "hazmat");
  const today = new Date();
  const baseDate = new Date(today); baseDate.setDate(today.getDate() + sl.sla);
  return (
    <div className="anim-fadeUp">
      <StepHeader step="3 of 8" title="SAP Creates Delivery Documents" subtitle="One delivery document per shipping point. Hazmat items get an automatic DG compliance flag." system="SAP S/4HANA SD" />
      <InfoBox title="What happens in this step?">
        SAP SD creates <strong>outbound delivery documents</strong> for each shipping point. The system sets planned GI date and delivery date based on the service level SLA. If hazardous goods are present, the <strong>DG flag</strong> is automatically set — this locks the carrier selection in TMS to ADR-certified carriers only.
      </InfoBox>
      {deliveries.map((d, idx) => {
        const deliveryDate = new Date(baseDate);
        if (d.backOrder) deliveryDate.setDate(deliveryDate.getDate() + (d.delayDays ?? 2));
        return (
        <Card key={d.id} style={{ border: `1px solid ${d.backOrder ? "#ddd6fe" : T.border}`, borderLeft: `4px solid ${d.backOrder ? "#7c3aed" : idx === 0 ? T.blue : T.amber}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>{d.flag}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{d.backOrder ? "Back Order Delivery" : `Delivery Document ${idx + 1}`} — {d.wh}</div>
              <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>Document: {d.id}</div>
            </div>
            <Chip label={d.backOrder ? `BACK ORDER` : idx === 0 ? "PRIMARY" : "SPLIT"} color={d.backOrder ? "blue" : idx === 0 ? "green" : "amber"} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            {[
              ["Doc Type", d.backOrder ? "LFN — Back Order" : "LF — Outbound Delivery"],
              ["Service Level", sl.name],
              ["Priority", d.backOrder ? "04 — Back Order" : svc === "standard" ? "03 — Normal" : "01 — Urgent"],
              ["Planned Delivery", deliveryDate.toLocaleDateString("en-GB")],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: "7px 10px", background: T.surfaceRaised, borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono, marginBottom: 2 }}>{k}</div>
                <div style={{ fontWeight: 600, color: k === "Planned Delivery" && d.backOrder ? "#7c3aed" : T.text }}>{v}</div>
              </div>
            ))}
          </div>
          {d.backOrder && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "var(--radius-sm)", fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
              ⏳ Back Order — stock not yet available. Planned delivery is +{d.delayDays} days after the standard SLA. <strong>OTIF will fail for this delivery.</strong>
            </div>
          )}
          {hasHz && d.items.some(i => i.type === "hazmat") && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff8e1", border: "1px solid #fcd34d", borderRadius: "var(--radius-sm)", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
              ⚠ DG Flag SET — UN3480 · ADR Class 9 · DGD Required
            </div>
          )}
        </Card>
        );
      })}
      <Btn onClick={onNext} size="lg">Send to ORTEC →</Btn>
    </div>
  );
}

function OBStep3({ ortec, deliveries, onNext }) {
  if (!ortec) return null;
  return (
    <div className="anim-fadeUp">
      <StepHeader step="4 of 8" title="ORTEC Creates Packing Proposal" subtitle="Optimal packaging per delivery document based on dimensions, weight, and ADR rules." system="ORTEC Pack &amp; Ship" />
      <InfoBox title="What happens in this step?">
        ORTEC receives the delivery document via IDoc from SAP and calculates the <strong>optimal packing plan</strong>. It determines carton count, pallet layout, load meters (LDM), and any special ADR packaging requirements. The proposal flows back into SAP and TMS.
      </InfoBox>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPIBadge label="Total Weight" value={`${ortec.totalWeight.toFixed(1)} kg`} status="blue" />
        <KPIBadge label="Load Meters" value={`${ortec.lm} LDM`} status="blue" />
        <KPIBadge label="Cartons" value={ortec.cartons} status="blue" sub={ortec.hasHz ? "incl. ADR overpack" : "standard"} />
      </div>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, textTransform: "uppercase", letterSpacing: "1px", fontFamily: T.fontMono, marginBottom: 12 }}>Packing Units per Delivery</div>
        {deliveries.map((d, idx) => {
          const p = { cartons: Math.max(0, d.items.filter(i => i.type === "parcel").length + (d.items.some(i => i.type === "hazmat") ? 1 : 0)), pallets: d.items.filter(i => i.type === "freight").length, longs: d.items.filter(i => i.type === "long_goods").length };
          return (
            <div key={d.id} style={{ marginBottom: 12, padding: 12, background: T.surfaceRaised, borderRadius: "var(--radius-md)", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{d.flag} {d.wh} — {d.backOrder ? "Back Order" : `Delivery ${idx + 1}`}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {p.cartons > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 52, height: 52, background: "#fffbeb", border: "2px solid #fde68a", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 20, animation: "popIn 0.3s ease both" }}><span>📦</span><span style={{ fontSize: 8, color: T.textLight }}>carton</span></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>× {p.cartons} {p.cartons === 1 ? "Carton" : "Cartons"}</span>
                  </div>
                )}
                {p.pallets > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 64, height: 56, background: T.amberLight, border: "2px solid #fed7aa", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 20, animation: "popIn 0.3s 0.1s ease both" }}><span>🏗️</span><span style={{ fontSize: 8, color: T.textLight }}>pallet</span></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>× {p.pallets} {p.pallets === 1 ? "Pallet" : "Pallets"}</span>
                  </div>
                )}
                {p.longs > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 110, height: 46, background: T.blueLight, border: `2px solid ${T.blueSoft}`, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 16, animation: "popIn 0.3s 0.2s ease both" }}><span>📏 Long Goods</span></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>× {p.longs}</span>
                  </div>
                )}
                {d.items.some(i => i.type === "hazmat") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 54, height: 54, background: "#fff8e1", border: "3px solid #fcd34d", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "popIn 0.3s 0.15s ease both" }}><span>⚠️</span><span style={{ fontSize: 8, color: "#92400e", fontWeight: 700 }}>ADR</span></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>ADR required</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>
      <Btn onClick={onNext} size="lg">Open TMS — Select Carriers →</Btn>
    </div>
  );
}

function OBStep4({ deliveries, deliveryCarriers, chosenCMap, setChosenCMap, svc, onNext }) {
  const [selDel, setSelDel] = useState(0);
  const activeDel = deliveries[selDel] ?? deliveries[0];
  const carriers = activeDel ? (deliveryCarriers[activeDel.id] ?? []) : [];
  const eligible = carriers.filter(c => c.eligible);
  const bestCost = eligible.length > 0 ? Math.min(...eligible.map(c => computeFreightCost(c, activeDel.items, svc))) : null;
  const allChosen = deliveries.every(d => chosenCMap[d.id] != null);

  return (
    <div className="anim-fadeUp">
      <StepHeader step="5 of 8" title="TMS Selects Carriers" subtitle="Transport Management System assigns the cheapest eligible carrier per delivery document." system="TMS" />
      <InfoBox title="What happens in this step?">
        TMS evaluates all carriers against the delivery requirements: <strong>country coverage, product type (freight/parcel/long goods), service level, and ADR certification</strong>. It ranks eligible carriers by cost and auto-selects the cheapest. You can override the selection.
      </InfoBox>

      {deliveries.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {deliveries.map((d, i) => {
            const chosen = chosenCMap[d.id];
            return (
              <button key={d.id} onClick={() => setSelDel(i)} style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${selDel === i ? (d.backOrder ? "#7c3aed" : T.blue) : T.border}`, background: selDel === i ? (d.backOrder ? "#f5f3ff" : T.blueLight) : T.surface, color: selDel === i ? (d.backOrder ? "#7c3aed" : T.blue) : T.textMed, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {d.flag} {d.backOrder ? "Back Order" : `Delivery ${i + 1}`}
                {chosen ? <span style={{ color: T.green }}>✓</span> : <span style={{ color: T.red, fontSize: 10 }}>pending</span>}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        {carriers.map(c => {
          const cost = c.eligible ? computeFreightCost(c, activeDel.items, svc) : null;
          const isBest = cost !== null && cost === bestCost;
          const isChosen = chosenCMap[activeDel.id]?.id === c.id;
          return (
            <div key={c.id} onClick={() => c.eligible && setChosenCMap(prev => ({ ...prev, [activeDel.id]: c }))} style={{ background: isChosen ? T.greenLight : c.eligible ? T.surface : T.surfaceRaised, border: `2px solid ${isChosen ? T.green : c.eligible ? T.border : T.border}`, borderRadius: "var(--radius-md)", padding: 14, cursor: c.eligible ? "pointer" : "default", opacity: c.eligible ? 1 : 0.4, transition: "all 0.15s", position: "relative" }}>
              {isBest && c.eligible && <div style={{ position: "absolute", top: -8, right: 8, background: T.green, color: "white", fontSize: 9, fontWeight: 700, fontFamily: T.fontMono, padding: "2px 8px", borderRadius: 10 }}>CHEAPEST</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{c.logo}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
              </div>
              {c.eligible ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: T.fontMono, color: isBest ? T.green : T.text, marginBottom: 8 }}>€{cost.toFixed(2)}</div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {c.freight && <Chip label="Freight" color="amber" />}
                    {c.long_goods && <Chip label="Long" color="blue" />}
                    {c.hazmat && <Chip label="ADR" color="hazmat" />}
                    {c.time10 && <Chip label="10:00" color="blue" />}
                  </div>
                  {isChosen && <div style={{ marginTop: 8, fontSize: 11, color: T.green, fontWeight: 700 }}>✓ Selected</div>}
                </>
              ) : (
                <div>{c.reasons.map(r => <div key={r} style={{ fontSize: 10, color: T.red, padding: "3px 0", borderTop: `1px solid ${T.redBorder}`, marginTop: 4 }}>{r}</div>)}</div>
              )}
            </div>
          );
        })}
      </div>

      {allChosen && (
        <InfoBox variant="success" title="All Deliveries Assigned — Carrier Data Flows Back to SAP">
          {deliveries.map((d, i) => { const c = chosenCMap[d.id]; return c ? <div key={d.id} style={{ fontSize: 12, paddingTop: 4 }}>{d.flag} {d.backOrder ? "Back Order" : `Delivery ${i+1}`}: <strong>{c.logo} {c.name}</strong> — €{computeFreightCost(c, d.items, svc).toFixed(2)}</div> : null; })}
        </InfoBox>
      )}

      <Btn onClick={onNext} disabled={!allChosen} size="lg">Confirm &amp; Enter Warehouse →</Btn>
    </div>
  );
}

function OBStep5({ whPhase, deliveries, onNext }) {
  const finished = whPhase >= WH_ZONES_DATA.length;
  const primaryDel = deliveries.find(d => !d.backOrder) ?? deliveries[0];
  const primaryItems = primaryDel?.items ?? [];

  return (
    <div className="anim-fadeUp">
      <StepHeader step="6 of 8" title="Warehouse Execution — SAP EWM" subtitle="Transfer orders drive every physical movement. Automated scanning keeps inventory accurate." system="SAP EWM" />
      <InfoBox title="What happens in this step?">
        SAP EWM creates <strong>transfer orders</strong> for each delivery. Pickers receive routes on their RF scanner. Items move through Inbound → Storage → Picking → Packing → Staging → Loading. Each scan updates SAP in real time.
      </InfoBox>

      <div style={{ background: T.surface, border: `1px solid ${T.borderMid}`, borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ background: T.navyMid, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "white", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px" }}>SAP EWM — Warehouse Flow</span>
          <span style={{ fontSize: 11, color: "#8eaac8" }}>Zone {Math.min(whPhase, WH_ZONES_DATA.length)}/{WH_ZONES_DATA.length}</span>
        </div>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {WH_ZONES_DATA.map((z, idx) => {
            const isDone = idx < whPhase;
            const isActive = idx === whPhase;
            const isPending = idx > whPhase;
            return (
              <div key={z.id} style={{ flex: 1, minWidth: 90, padding: "14px 8px 12px", borderRight: `1px solid ${T.border}`, background: isDone ? T.greenLight : isActive ? T.blueLight : T.surfaceRaised, borderTop: `3px solid ${isDone ? T.green : isActive ? T.blue : "transparent"}`, display: "flex", flexDirection: "column", alignItems: "center", transition: "all 0.4s" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{z.icon}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.textMed, textAlign: "center", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4, lineHeight: 1.3 }}>{z.name}</div>
                <div style={{ fontSize: 8, color: T.textXLight, textAlign: "center", lineHeight: 1.5, marginBottom: 8 }}>{z.desc}</div>
                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: T.fontMono, padding: "2px 8px", borderRadius: 10, background: isDone ? T.greenBorder : isActive ? T.blueSoft : T.border, color: isDone ? T.green : isActive ? T.blue : T.textLight }}>
                  {isDone ? "DONE" : isActive ? "ACTIVE" : "WAITING"}
                </div>
                {(isDone || isActive) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", marginTop: 8 }}>
                    {primaryItems.slice(0, 3).map((item, ii) => (
                      <div key={ii} style={{ width: 20, height: 20, borderRadius: 3, border: "1px solid", background: item.type === "hazmat" ? "#fff8e1" : item.type === "freight" ? T.amberLight : T.blueLight, borderColor: item.type === "hazmat" ? "#fcd34d" : item.type === "freight" ? T.amberBorder : T.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, animation: "popIn 0.3s ease" }}>
                        {item.icon}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!finished && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textLight, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, animation: `dotBounce 1.4s ${i*0.2}s infinite` }} />)}
          </div>
          Processing zone {whPhase + 1} of {WH_ZONES_DATA.length}...
        </div>
      )}

      {finished && (
        <>
          <InfoBox variant="success" title="Warehouse Execution Complete">All items picked, packed, and loaded. Departure scan fired — shipment is en route to the carrier hub.</InfoBox>

          {/* ORTEC vs Actual packing comparison */}
          <Card style={{ border: `1px solid ${T.amberBorder}`, borderLeft: `4px solid ${T.amber}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textMed, marginBottom: 4 }}>📦 ORTEC Proposal vs. Actual Packing Result</div>
            <div style={{ fontSize: 12, color: T.textLight, marginBottom: 14, lineHeight: 1.6 }}>
              ORTEC calculated the optimal packing plan. The warehouse packed one more carton than proposed. This is a common deviation — learn why it happens.
            </div>

            {(() => {
              const primaryDel = deliveries.find(d => !d.backOrder) ?? deliveries[0];
              const primaryItems = primaryDel?.items ?? [];
              const ortecCartons = Math.max(0, primaryItems.filter(i => i.type === "parcel").length + (primaryItems.some(i => i.type === "hazmat") ? 1 : 0));
              const actualCartons = ortecCartons + 1;
              const hasHz = primaryItems.some(i => i.type === "hazmat");
              const pallets = primaryItems.filter(i => i.type === "freight").length;

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* ORTEC plan */}
                  <div style={{ background: T.blueLight, border: `1px solid ${T.blueSoft}`, borderRadius: "var(--radius-md)", padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: T.fontMono, color: T.blue, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>ORTEC Proposal</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {Array(ortecCartons).fill(0).map((_, i) => (
                        <div key={i} style={{ width: 44, height: 44, background: "#fffbeb", border: "2px solid #fde68a", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          <span>📦</span>
                          <span style={{ fontSize: 7, color: T.textLight }}>carton</span>
                        </div>
                      ))}
                      {Array(pallets).fill(0).map((_, i) => (
                        <div key={i} style={{ width: 56, height: 48, background: T.amberLight, border: "2px solid #fed7aa", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          <span>🏗️</span>
                          <span style={{ fontSize: 7, color: T.textLight }}>pallet</span>
                        </div>
                      ))}
                      {hasHz && <div style={{ width: 46, height: 46, background: "#fff8e1", border: "3px solid #fcd34d", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 16 }}><span>⚠️</span><span style={{ fontSize: 7, color: "#92400e", fontWeight: 700 }}>ADR</span></div>}
                      {ortecCartons === 0 && pallets === 0 && !hasHz && (
                        <div style={{ fontSize: 12, color: T.textLight, fontStyle: "italic" }}>No cartons planned</div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: T.fontMono }}>
                      <span style={{ color: T.textLight }}>Cartons: </span>
                      <span style={{ fontWeight: 700, color: T.blue }}>{ortecCartons}</span>
                    </div>
                  </div>

                  {/* Actual result */}
                  <div style={{ background: T.amberLight, border: `2px solid ${T.amberBorder}`, borderRadius: "var(--radius-md)", padding: 14, position: "relative" }}>
                    <div style={{ position: "absolute", top: -10, right: 10, background: T.amber, color: "white", fontSize: 9, fontFamily: T.fontMono, fontWeight: 800, padding: "2px 8px", borderRadius: 8 }}>+1 CARTON</div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: T.fontMono, color: T.amber, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Actual Packing Result</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {Array(actualCartons).fill(0).map((_, i) => (
                        <div key={i} style={{ width: 44, height: 44, background: i < ortecCartons ? "#fffbeb" : T.amberLight, border: `2px solid ${i < ortecCartons ? "#fde68a" : T.amberBorder}`, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 18, animation: i >= ortecCartons ? "popIn 0.4s 0.2s ease both" : "none" }}>
                          <span>📦</span>
                          <span style={{ fontSize: 7, color: i < ortecCartons ? T.textLight : T.amber, fontWeight: i >= ortecCartons ? 700 : 400 }}>{i >= ortecCartons ? "+extra" : "carton"}</span>
                        </div>
                      ))}
                      {Array(pallets).fill(0).map((_, i) => (
                        <div key={i} style={{ width: 56, height: 48, background: T.amberLight, border: "2px solid #fed7aa", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          <span>🏗️</span>
                          <span style={{ fontSize: 7, color: T.textLight }}>pallet</span>
                        </div>
                      ))}
                      {hasHz && <div style={{ width: 46, height: 46, background: "#fff8e1", border: "3px solid #fcd34d", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 16 }}><span>⚠️</span><span style={{ fontSize: 7, color: "#92400e", fontWeight: 700 }}>ADR</span></div>}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: T.fontMono }}>
                      <span style={{ color: T.textLight }}>Cartons: </span>
                      <span style={{ fontWeight: 700, color: T.amber }}>{actualCartons} ⚠ +1 vs. ORTEC</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Why it happens */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "10px 12px", background: "#fff8e1", border: `1px solid #fde68a`, borderLeft: `3px solid ${T.amber}`, borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: T.fontMono, color: T.amber, textTransform: "uppercase", marginBottom: 4 }}>Reason A — Dimension Error</div>
                <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>The item dimensions in ORTEC master data are outdated. The actual product is slightly larger than planned — requiring an extra carton. Root cause: dimension record not updated after a product change.</div>
              </div>
              <div style={{ padding: "10px 12px", background: "#fff8e1", border: `1px solid #fde68a`, borderLeft: `3px solid ${T.amber}`, borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: T.fontMono, color: T.amber, textTransform: "uppercase", marginBottom: 4 }}>Reason B — Pack Potential</div>
                <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>ORTEC's algorithm proposed tight stacking that isn't feasible in practice (fragile items, orientation restrictions). The packer adds a safety carton. Root cause: packing rules not yet trained in ORTEC.</div>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "var(--radius-md)", fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>
              
            </div>
          </Card>

          <Btn onClick={onNext} size="lg">Track Delivery →</Btn>
        </>
      )}
    </div>
  );
}

function OBStep6({ trackEvts, svc, onNext }) {
  const [visible, setVisible] = useState(0);
  const TOTAL_ROWS = 6;

  useEffect(() => {
    if (visible >= TOTAL_ROWS) return;
    const t = setTimeout(() => setVisible(v => v + 1), 1100);
    return () => clearTimeout(t);
  }, [visible]);

  // ── Service level config ──
  const isTime10  = svc === "time10";
  const isExpress = svc === "express";
  // Actual POD time: time10 deliberately delivers at 11:00 (outside window) to demonstrate CTE failure
  const actualPodTime   = isTime10 ? "Day 2 · 11:00" : "Day 2 · 12:15";
  const actualPodLabel  = isTime10 ? "✅ Delivered at 11:00" : "✅ Delivered at 12:15";
  const ctePlanEnd      = isTime10 ? "Day 2 · 10:00 (SLA)" : isExpress ? "Day 2 · 23:59 (Next Day)" : "Day+SLA · 23:59";
  const ctePlanLabel    = isTime10 ? "10:00 AM Time Option" : isExpress ? "Next Day 23:59" : "Standard 23:59";
  const cteActualOk     = !isTime10; // time10 = 11:00 is outside window → CTE fail
  const cteStatusText   = isTime10
    ? "❌ CTE FAIL — delivered 11:00, SLA was 10:00"
    : "✅ CTE OK — delivered within service window";

  // 6 scan events
  const SCAN_ROWS = [
    { time: "Day 1 · Order Created",       title: "SAP Order Confirmed",          sub: "Sales order in SAP SD — OTIF clock starts",       notif: { icon: "📧",   title: "Order Confirmation",               sub: "Sent to customer immediately" } },
    { time: "Day 1 · Delivery Created",    title: "Outbound Delivery Created",    sub: "Delivery document created — WSP clock starts",    notif: null },
    { time: "Day 1 · 17:45 — PGI Scan",   title: "Goods Issue Posted (PGI)",     sub: "Physical scan at warehouse gate — WSP actual end", notif: { icon: "📦🧾", title: "Shipping Notification + Invoice",  sub: "Both triggered by the same PGI scan" } },
    { time: "Day 1 · 18:00 — Carrier Dep.", title: "Carrier Truck Departs",       sub: "Truck leaves DC — CTE clock starts",              notif: null },
    { time: "Day 2 · 09:45",               title: "Hub Departure — Out for Del.", sub: "Final mile dispatch scan",                         notif: { icon: "🚚",   title: "Out for Delivery Alert",           sub: "ACOT notification sent" } },
    { time: actualPodTime,                 title: actualPodLabel,                 sub: isTime10 ? "⚠ 11:00 — outside 10:00 SLA window. CTE fails." : "POD confirmed — CTE ends, OTIF measured", notif: { icon: isTime10 ? "⚠️✅" : "✅", title: isTime10 ? "Delivery Confirmed — but late vs SLA" : "Delivery Confirmation + Survey", sub: isTime10 ? "CTE SLA breached — delivered after 10:00 AM" : "POD + NPS survey sent" } },
  ];

  const showKpi = visible >= TOTAL_ROWS;

  // ── Positions on the timeline ──
  // 6 anchors, TOTAL_POS = 5 gaps
  // 0=Order  1=DelDoc  2=PGI  3=CarrDep  4=OutForDel  5=POD
  const TOTAL_POS = 5;

  // Fractional positions for planned SLA endpoints
  // WSP planned end: 23:59 is between CarrDep (18:00) and OutForDel (09:45 Day2)
  // We'll place it at pos 3.5 (visually between 3 and 4)
  const WSP_PLANNED_END_POS = 3.3;
  // CTE planned end: time10 = halfway between CarrDep and OutForDel (around ~10:00 Day2 = pos 3.6)
  //                  standard/express = end of Day2 = after POD (pos 5.3, capped at edge)
  const CTE_PLANNED_END_POS = isTime10 ? 3.6 : 5.3;

  const ANCHORS = [
    { label: "Order\nCreated",    sub: "Day 1",        col: T.blue,    pos: 0 },
    { label: "Delivery\nDoc",     sub: "Day 1",        col: "#0097a7", pos: 1 },
    { label: "PGI\nScan",         sub: "17:45",        col: "#0097a7", pos: 2 },
    { label: "Carrier\nDep.",     sub: "18:00",        col: "#7c3aed", pos: 3 },
    { label: "Out for\nDel.",     sub: "Day 2 09:45",  col: T.textMed, pos: 4 },
    { label: isTime10 ? "POD\n11:00 ⚠" : "POD\n12:15", sub: isTime10 ? "CTE fail" : "Day 2", col: isTime10 ? T.red : T.green, pos: 5 },
  ];

  return (
    <div className="anim-fadeUp">
      <StepHeader step="7 of 8" title="Last Mile Delivery" subtitle="Scan events, customer notifications, and KPI measurement windows." system="Track &amp; Trace" />
      <InfoBox title="What happens in this step?">
        The <strong>PGI scan</strong> simultaneously posts goods issue in SAP and triggers the invoice + shipping instructions. The carrier departs shortly after. Three KPI clocks run — OTIF brackets the full journey, WSP and CTE sit inside it. Each KPI has a <strong>planned window</strong> and an <strong>actual window</strong>.
        {isTime10 && <span style={{ color: T.red, fontWeight: 700 }}> ⚠ Time Option 10:00 selected — watch for CTE failure when actual delivery is at 11:00.</span>}
      </InfoBox>

      {/* ── 3-COLUMN LAYOUT ── */}
      {visible > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "190px 1fr 1fr", gap: 10, marginBottom: 14 }}>

          {/* ── COL 1: KPI Windows ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.borderMid}`, borderRadius: "var(--radius-lg)", padding: 12, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>KPI Windows</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>

              {ANCHORS.map((a, i) => {
                const isActive = i < visible;
                return (
                  <div key={i} style={{ position: "relative", paddingLeft: 28, paddingBottom: i < ANCHORS.length - 1 ? 12 : 0, opacity: isActive ? 1 : 0.3, transition: "opacity 0.4s" }}>
                    {/* Dot */}
                    <div style={{ position: "absolute", left: 9, top: 3, width: 11, height: 11, borderRadius: "50%", background: isActive ? a.col : T.border, border: "2px solid white", boxShadow: isActive ? `0 0 0 2px ${a.col}44` : "none", transition: "all 0.4s", zIndex: 1 }} />
                    {/* Connector line to next dot — only between anchors, not after last */}
                    {i < ANCHORS.length - 1 && (
                      <div style={{ position: "absolute", left: 14, top: 14, height: "calc(100% - 4px)", width: 2, background: T.border, borderRadius: 1, zIndex: 0 }} />
                    )}
                    <div style={{ fontSize: 8, fontFamily: T.fontMono, fontWeight: 700, color: isActive ? a.col : T.textXLight, lineHeight: 1.3, whiteSpace: "pre-line" }}>{a.label}</div>
                    <div style={{ fontSize: 7, color: T.textXLight, fontFamily: T.fontMono }}>{a.sub}</div>
                    {(() => {
                      const badges = [];
                      if (i === 0) badges.push({ id: "OTIF ▶", color: T.blue });
                      if (i === 1) badges.push({ id: "WSP ▶", color: "#0097a7" });
                      if (i === 2) badges.push({ id: "◀ WSP actual", color: "#0097a7" });
                      if (i === 3) badges.push({ id: "CTE ▶", color: "#7c3aed" });
                      if (i === 5) { badges.push({ id: "◀ CTE", color: isTime10 ? T.red : "#7c3aed" }); badges.push({ id: "◀ OTIF", color: T.blue }); }
                      return badges.length > 0 ? (
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                          {badges.map(b => { const bBorder = isActive ? b.color + "55" : T.border; return <div key={b.id} style={{ padding: "1px 5px", borderRadius: 8, background: isActive ? `${b.color}18` : T.surfaceRaised, border: `1px solid ${bBorder}`, fontSize: 7, fontFamily: T.fontMono, fontWeight: 800, color: isActive ? b.color : T.textXLight }}>{b.id}</div>; })}
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })}

              {/* KPI legend badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                {visible >= 2 && <div style={{ padding: "5px 8px", background: `${T.blue}14`, border: `1px solid ${T.blue}44`, borderLeft: `3px solid ${T.blue}`, borderRadius: "var(--radius-sm)", animation: "fadeIn 0.4s ease" }}><div style={{ fontSize: 8, fontWeight: 800, color: T.blue, fontFamily: T.fontMono }}>OTIF</div><div style={{ fontSize: 7, color: T.textLight, fontFamily: T.fontMono, lineHeight: 1.4 }}>Outer bracket — full journey</div></div>}
                {visible >= 3 && <div style={{ padding: "5px 8px", background: "#0097a714", border: `1px solid #0097a744`, borderLeft: "3px solid #0097a7", borderRadius: "var(--radius-sm)", animation: "fadeIn 0.4s ease" }}><div style={{ fontSize: 8, fontWeight: 800, color: "#0097a7", fontFamily: T.fontMono }}>WSP</div><div style={{ fontSize: 7, color: T.textLight, fontFamily: T.fontMono, lineHeight: 1.4 }}>Del.doc → PGI · planned: 23:59</div></div>}
                {visible >= 5 && (() => { const cteKpiCol = isTime10 ? T.red : "#7c3aed"; return <div style={{ padding: "5px 8px", background: cteKpiCol + "14", border: `1px solid ${cteKpiCol}44`, borderLeft: `3px solid ${cteKpiCol}`, borderRadius: "var(--radius-sm)", animation: "fadeIn 0.4s ease" }}><div style={{ fontSize: 8, fontWeight: 800, color: cteKpiCol, fontFamily: T.fontMono }}>CTE {isTime10 ? "❌" : "✅"}</div><div style={{ fontSize: 7, color: T.textLight, fontFamily: T.fontMono, lineHeight: 1.4 }}>Dep. → POD · plan: {ctePlanLabel}</div></div>; })()}
              </div>
            </div>
          </div>

          {/* ── COL 2: Scan Events ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "var(--radius-lg)", padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.blue, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>🚛 SAP Scan / System Event</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SCAN_ROWS.slice(0, visible).map((row, i) => (
                <div key={i} style={{ background: T.surfaceRaised, border: `1px solid ${i === 5 && isTime10 ? T.redBorder : T.border}`, borderRadius: "var(--radius-md)", padding: "8px 10px", animation: "slideIn 0.35s ease" }}>
                  <div style={{ fontSize: 8, fontFamily: T.fontMono, color: T.textXLight, marginBottom: 2 }}>{row.time}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: i === 5 && isTime10 ? T.red : T.text, lineHeight: 1.3 }}>{row.title}</div>
                  <div style={{ fontSize: 10, color: T.textLight, marginTop: 2, lineHeight: 1.4 }}>{row.sub}</div>
                </div>
              ))}
              {visible < TOTAL_ROWS && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.textXLight, fontSize: 10, padding: "4px 0" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, animation: "pulse 1.5s infinite" }} />
                  Next scan incoming...
                </div>
              )}
            </div>
          </div>

          {/* ── COL 3: Customer Notifications ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.greenBorder}`, borderRadius: "var(--radius-lg)", padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.green, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>📧 Customer Notification</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SCAN_ROWS.slice(0, visible).map((row, i) =>
                row.notif ? (
                  <div key={i} style={{ background: i === 5 && isTime10 ? T.redLight : T.greenLight, border: `1px solid ${i === 5 && isTime10 ? T.redBorder : T.greenBorder}`, borderRadius: "var(--radius-md)", padding: "8px 10px", animation: "slideIn 0.35s 0.1s ease both" }}>
                    <div style={{ fontSize: 8, fontFamily: T.fontMono, color: T.textXLight, marginBottom: 2 }}>{row.time}</div>
                    <div style={{ fontSize: 14, marginBottom: 3 }}>{row.notif.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: i === 5 && isTime10 ? T.red : T.green, lineHeight: 1.3 }}>{row.notif.title}</div>
                    <div style={{ fontSize: 10, color: T.textMed, marginTop: 2, lineHeight: 1.4 }}>{row.notif.sub}</div>
                  </div>
                ) : (
                  <div key={i} style={{ border: `1px dashed ${T.border}`, borderRadius: "var(--radius-md)", padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
                    <span style={{ fontSize: 10, color: T.textXLight, fontStyle: "italic" }}>—</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {visible === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textLight, fontSize: 12, padding: "16px 0" }}>
          <div style={{ display: "flex", gap: 3 }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, animation: `dotBounce 1.4s ${i*0.2}s infinite` }} />)}</div>
          Loading order events...
        </div>
      )}

      {/* ── KPI BRACKET CHART — dot-in-window style ── */}
      {showKpi && (
        <div style={{ background: T.surface, border: `1px solid ${T.borderMid}`, borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14, animation: "fadeUp 0.5s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>KPI Measurement Windows — Planned vs. Actual</div>
          <div style={{ fontSize: 11, color: T.textLight, marginBottom: 14, lineHeight: 1.6 }}>
            Each KPI bar shows the <strong>planned SLA window</strong>. The <strong>coloured dot</strong> is the actual scan — green if inside the window, red if outside. OTIF is the outer bracket.
            {isTime10 && <span style={{ color: T.red, fontWeight: 700 }}> ⚠ Time Option 10:00: CTE dot lands outside its window.</span>}
          </div>
          {(() => {
            const TOTAL = TOTAL_POS;
            const toL  = (pos) => `${(pos / TOTAL) * 100}%`;
            // ANCHORS: 0=Order, 1=DelDoc, 2=PGI, 3=CarrierDep, 4=OutForDel, 5=POD
            // Day 1 = Order through Carrier Departure (pos 0–3, inclusive)
            // Day break AFTER departure at pos 3.15 — departure is still Day 1
            // Day 2 = Out for Delivery through POD (pos 3.15–5)
            const DAY_BREAK = 3.15;
            const DAY_BREAK_PCT = `${(DAY_BREAK / TOTAL) * 100}%`;
            const bands = [
              { from: 0,         to: DAY_BREAK, bg: "rgba(230,81,0,0.07)",   bgL: "rgba(230,81,0,0.04)",   bd: "rgba(230,81,0,0.25)",   col: "#e65100", label: "DAY 1" },
              { from: DAY_BREAK, to: 5,          bg: "rgba(59,130,246,0.08)", bgL: "rgba(59,130,246,0.04)", bd: "rgba(59,130,246,0.22)", col: T.blue,    label: "DAY 2" },
            ];
            const cteOk = cteActualOk;
            const cteColor = cteOk ? "#7c3aed" : T.red;

            // Day-break dashed line overlay — reusable for any positioned container
            const DayBreakLine = () => (
              <div style={{ position: "absolute", left: DAY_BREAK_PCT, top: 0, bottom: 0, zIndex: 5, pointerEvents: "none" }}>
                <div style={{ width: 0, height: "100%", borderLeft: "1.5px dashed rgba(148,163,184,0.65)" }} />
              </div>
            );


            // KPI window + dot definitions
            const KW = [
              { id: "WSP", full: "Warehouse Shipping Performance", color: "#0097a7",
                winFrom: 1, winTo: WSP_PLANNED_END_POS,
                dotPos: 2, dotOk: true, dotLabel: "PGI 17:45" },
              { id: "CTE", full: "Customer Transport Experience",  color: cteColor,
                winFrom: 3, winTo: Math.min(CTE_PLANNED_END_POS, TOTAL),
                dotPos: isTime10 ? 5.1 : 5, dotOk: cteOk, dotLabel: isTime10 ? "11:00 ⚠" : "POD 12:15" },
            ];

            return (
              <div>
                {/* Day band header */}
                <div style={{ display: "flex", borderRadius: "6px 6px 0 0", overflow: "hidden" }}>
                  {bands.map((b, i) => (
                    <div key={i} style={{ width: `${((b.to - b.from) / TOTAL) * 100}%`, background: b.bg, border: `1px solid ${b.bd}`, borderRight: i === 0 ? "none" : undefined, padding: "4px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: b.col }} />
                      <span style={{ fontSize: 8, fontWeight: 800, color: b.col, fontFamily: T.fontMono }}>{b.label}</span>
                    </div>
                  ))}
                </div>

                {/* Anchor row */}
                <div style={{ position: "relative", height: 50 }}>
                  {bands.map((b, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(b.from), top: 0, bottom: 0, width: `${((b.to - b.from) / TOTAL) * 100}%`, background: b.bgL, borderLeft: i > 0 ? "2px dashed rgba(148,163,184,0.4)" : undefined }} />
                  ))}
                  {ANCHORS.map((a, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(a.pos), transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, zIndex: 2 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.col, border: "2px solid white", boxShadow: `0 0 0 2px ${a.col}44` }} />
                      <div style={{ fontSize: 8, fontFamily: T.fontMono, fontWeight: 700, color: a.col, textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{a.label}</div>
                      <div style={{ fontSize: 7, color: T.textXLight, fontFamily: T.fontMono, textAlign: "center" }}>{a.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Spine */}
                <div style={{ position: "relative", height: 16, marginBottom: 20 }}>
                  {bands.map((b, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(b.from), top: 0, bottom: 0, width: `${((b.to - b.from) / TOTAL) * 100}%`, background: b.bgL }} />
                  ))}
                  <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 2, background: T.borderMid }} />
                  {ANCHORS.map((a, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(a.pos), top: 3, width: 10, height: 10, borderRadius: "50%", background: a.col, transform: "translateX(-50%)", border: "2px solid white", zIndex: 2 }} />
                  ))}
                </div>

                {/* OTIF outer bracket */}
                <div style={{ position: "relative", height: 30, marginBottom: 12 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 4, bottom: 4, background: `${T.blue}14`, border: `1.5px solid ${T.blue}44`, borderRadius: 6 }} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: T.blue, borderRadius: "4px 0 0 4px" }} />
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: T.blue, borderRadius: "0 4px 4px 0" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.blue }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.blue, fontFamily: T.fontMono }}>OTIF — Order Created → Requested Delivery Date</span>
                  </div>
                </div>

                {/* KPI window + dot rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {KW.map(kpi => {
                    const lp   = (kpi.winFrom / TOTAL) * 100;
                    const wp   = Math.min(((kpi.winTo - kpi.winFrom) / TOTAL) * 100, 100 - lp);
                    const dotL = Math.min((kpi.dotPos / TOTAL) * 100, 102);
                    const dotInside = kpi.dotOk;
                    const dotCol = dotInside ? T.green : T.red;
                    return (
                      <div key={kpi.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10, background: `${kpi.color}14`, border: `1px solid ${kpi.color}44` }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: kpi.color }} />
                            <span style={{ fontSize: 9, fontWeight: 800, color: kpi.color, fontFamily: T.fontMono }}>{kpi.id}</span>
                          </div>
                          <span style={{ fontSize: 10, color: T.textMed }}>{kpi.full}</span>
                          <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: `${dotCol}14`, border: `1px solid ${dotCol}44`, color: dotCol }}>
                            {dotInside ? "✅ MET" : "❌ BREACHED"}
                          </span>
                        </div>
                        {/* Window bar + dot */}
                        <div style={{ position: "relative", height: 26, background: T.surfaceRaised, borderRadius: 5, border: `1px solid ${T.border}`, overflow: "visible" }}>
                          {/* Day band tint inside bar */}
                          {bands.map((b, i) => (
                            <div key={i} style={{ position: "absolute", left: `${(b.from / TOTAL) * 100}%`, top: 0, bottom: 0, width: `${((b.to - b.from) / TOTAL) * 100}%`, background: b.bgL, borderRadius: i === 0 ? "5px 0 0 5px" : "0 5px 5px 0" }} />
                          ))}
                          {/* Inactive hatching left */}
                          {lp > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: `${lp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.025) 3px,rgba(0,0,0,0.025) 6px)", zIndex: 1, borderRadius: "5px 0 0 5px" }} />}
                          {/* Planned window */}
                          <div style={{ position: "absolute", left: `${lp}%`, width: `${wp}%`, top: 3, bottom: 3, background: `${kpi.color}18`, border: `1.5px solid ${kpi.color}55`, borderRadius: 4, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 7.5, color: kpi.color, fontFamily: T.fontMono, fontWeight: 700, opacity: 0.8 }}>Planned window</span>
                          </div>
                          {/* Inactive hatching right */}
                          {lp + wp < 100 && <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, width: `${100 - lp - wp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.025) 3px,rgba(0,0,0,0.025) 6px)", zIndex: 1, borderRadius: "0 5px 5px 0" }} />}
                          {/* Window start/end ticks */}
                          <div style={{ position: "absolute", left: `${lp}%`,      top: 0, bottom: 0, width: 2, background: kpi.color, opacity: 0.5, zIndex: 3 }} />
                          <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, bottom: 0, width: 2, background: kpi.color, opacity: 0.5, zIndex: 3 }} />
                          {/* Actual scan dot */}
                          <div style={{ position: "absolute", left: `${Math.min(dotL, 98)}%`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 6 }}>
                            {!dotInside && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: `${T.red}20`, border: `1.5px solid ${T.red}55`, animation: "pulse 2s infinite" }} />}
                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: dotCol, border: "2.5px solid white", boxShadow: `0 0 0 2px ${dotCol}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 7.5, color: "white", fontWeight: 900 }}>{dotInside ? "✓" : "✗"}</span>
                            </div>
                          </div>
                        </div>
                        {/* Dot label */}
                        <div style={{ fontSize: 9, color: dotCol, fontFamily: T.fontMono, marginTop: 3, marginLeft: `calc(${Math.min(dotL, 96)}% - 20px)`, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {dotInside ? "✓ " : "✗ "}{kpi.dotLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textLight }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.green, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 6.5, color: "white", fontWeight: 900 }}>✓</span></div>
                    Scan inside window — KPI met
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textLight }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.red, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 6.5, color: "white", fontWeight: 900 }}>✗</span></div>
                    Scan outside window — KPI failed
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textLight }}>
                    <div style={{ width: 28, height: 10, background: "rgba(0,0,0,0)", border: "1.5px solid #7c3aed88", borderRadius: 2 }} />
                    Planned SLA window
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {visible >= TOTAL_ROWS && (
        <Btn onClick={onNext} size="lg">View Completion Report →</Btn>
      )}
    </div>
  );
}
function OBComplete({ deliveries, chosenCMap, svc, quizAnswered, quizCorrect, setQuizAnswered, setQuizCorrect, onRestart }) {
  const quizQ = "Why does adding a 6m Mounting Rail to an order always trigger a delivery split?";
  const quizOpts = [
    { id: "a", text: "Because it weighs more than 10kg" },
    { id: "b", text: "Because long goods are stored in a specialist hub, separate from standard parcel DCs" },
    { id: "c", text: "Because the carrier cannot handle both in one booking" },
    { id: "d", text: "Because SAP cannot process more than one item type" },
  ];
  const correctQ = "b";

  const hasBackOrder = deliveries.some(d => d.backOrder);
  const splitCount = deliveries.length - 1; // every document beyond the first is a split — including backorders
  const otifFail = hasBackOrder; // back order = late delivery = OTIF fail

  function handleAnswer(id) {
    setQuizAnswered(id);
    setQuizCorrect(id === correctQ);
  }

  return (
    <div className="anim-fadeUp">
      {/* Success / Partial Hero */}
      <div style={{ textAlign: "center", padding: "40px 0 32px", animation: "fadeUp 0.6s ease" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: otifFail ? T.amber : splitCount > 0 ? T.amber : T.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 36, animation: "successPop 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}>
          {otifFail || splitCount > 0 ? "⚠" : "✓"}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: T.fontDisplay, marginBottom: 8 }}>
          {otifFail ? "Partial Delivery — Back Order Late" : splitCount > 0 ? "Delivered — With Splits" : "Customer Promise Achieved"}
        </div>
        <div style={{ fontSize: 16, color: otifFail ? T.amber : splitCount > 0 ? T.amber : T.green, fontWeight: 600, marginBottom: 8 }}>
          {otifFail
            ? "OTIF Fail — Back Order delivery exceeds promised SLA 📋"
            : splitCount > 0
            ? `${deliveries.length} delivery documents — ${splitCount} split${splitCount > 1 ? "s" : ""} created`
            : "OTIF Delivery Successful 🎉"}
        </div>
        <div style={{ fontSize: 13, color: T.textMed, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
          {otifFail
            ? "The primary delivery was fulfilled on time. However, a back order shipment is delayed beyond the original promised delivery date — this counts as an OTIF failure for the affected items."
            : splitCount > 0
            ? `The order was fulfilled across ${deliveries.length} separate deliveries. Each split means additional transport cost, additional warehouse processing, and additional customer touchpoints.`
            : "The order has completed its full journey — from the webshop through SAP, ORTEC, TMS, EWM, and last-mile delivery. The customer received their goods on time, in full."}
        </div>
      </div>

      {/* Split summary — shown whenever there is more than 1 delivery doc */}
      {splitCount > 0 && (
        <Card style={{ border: `1px solid ${T.amberBorder}`, borderLeft: `4px solid ${T.amber}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.amber, marginBottom: 10 }}>📦 Delivery Split Summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {deliveries.map((d, i) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: d.backOrder ? "#f5f3ff" : i === 0 ? T.surfaceRaised : T.amberLight, border: `1px solid ${d.backOrder ? "#ddd6fe" : i === 0 ? T.border : T.amberBorder}`, borderRadius: "var(--radius-md)" }}>
                <span style={{ fontSize: 16 }}>{d.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{d.wh}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>
                    {d.items.map(item => item.name).join(", ")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Chip
                    label={d.backOrder ? `SPLIT / BACK ORDER +${d.delayDays}d` : i === 0 ? "PRIMARY" : "SPLIT"}
                    color={d.backOrder ? "blue" : i === 0 ? "green" : "amber"}
                  />
                  {d.backOrder && <div style={{ fontSize: 10, color: T.red, fontWeight: 700, marginTop: 4 }}>⛔ OTIF fail</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "var(--radius-md)", fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>
            💡 <strong>Split Rate KPI:</strong> Any order with more than 1 delivery document counts as a split — regardless of whether the extra delivery is a location split or a back order. Both increase cost and reduce customer experience.
          </div>
        </Card>
      )}

      {/* Back order OTIF explanation */}
      {otifFail && (
        <Card style={{ border: `1px solid ${T.amberBorder}`, borderLeft: `4px solid ${T.amber}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.amber, marginBottom: 10 }}>⚠ Why the Back Order Causes an OTIF Failure</div>
          {deliveries.filter(d => d.backOrder).map(d => {
            const sl = SERVICE_LEVELS_DATA.find(s => s.id === svc);
            const today = new Date();
            const promisedDate = new Date(today); promisedDate.setDate(today.getDate() + sl.sla);
            const actualDate = new Date(promisedDate); actualDate.setDate(promisedDate.getDate() + (d.delayDays ?? 2));
            return (
              <div key={d.id} style={{ padding: "10px 12px", background: T.amberLight, border: `1px solid ${T.amberBorder}`, borderRadius: "var(--radius-md)", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20 }}>{d.flag}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Back Order — {d.wh}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div style={{ padding: "6px 10px", background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: "var(--radius-sm)" }}>
                        <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>CUSTOMER PROMISED</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{promisedDate.toLocaleDateString("en-GB")}</div>
                      </div>
                      <div style={{ padding: "6px 10px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-sm)" }}>
                        <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono }}>ACTUAL DELIVERY</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.red }}>{actualDate.toLocaleDateString("en-GB")} (+{d.delayDays}d late)</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>
                      Items: {d.items.map(i => i.name).join(", ")} — stock was not available at order placement. SAP created a back order which ships when stock becomes available — but this exceeds the promised delivery date, causing an OTIF violation.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Systems visited */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, textTransform: "uppercase", letterSpacing: "1px", fontFamily: T.fontMono, marginBottom: 14 }}>Systems You Just Worked With</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { sys: "Webshop", desc: "Order entry & product selection", icon: "🛒" },
            { sys: "SAP MM", desc: "Inventory availability check", icon: "📋" },
            { sys: "SAP SD", desc: "Delivery document creation", icon: "📄" },
            { sys: "ORTEC", desc: "Pack & Ship optimization", icon: "📐" },
            { sys: "TMS", desc: "Carrier selection & booking", icon: "🚛" },
            { sys: "SAP EWM", desc: "Warehouse execution", icon: "🏭" },
            { sys: "Track & Trace", desc: "Customer communication", icon: "📍" },
            { sys: "ADR Compliance", desc: "Hazmat handling & docs", icon: "⚠️" },
            { sys: "Carrier API", desc: "EDI freight confirmation", icon: "🔗" },
          ].map(({ sys, desc, icon }) => (
            <div key={sys} style={{ padding: "10px 12px", background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "var(--radius-md)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div><div style={{ fontSize: 12, fontWeight: 700 }}>{sys}</div><div style={{ fontSize: 11, color: T.textLight }}>{desc}</div></div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quiz */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>📝 Knowledge Check</div>
        <div style={{ fontSize: 13, color: T.textMed, marginBottom: 14 }}>{quizQ}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quizOpts.map(opt => {
            let bg = T.surface; let border = T.border; let textColor = T.text;
            if (quizAnswered === opt.id) {
              if (quizCorrect && opt.id === correctQ) { bg = T.greenLight; border = T.green; textColor = T.green; }
              else if (!quizCorrect && opt.id === quizAnswered) { bg = T.redLight; border = T.red; textColor = T.red; }
            } else if (quizAnswered && opt.id === correctQ) { bg = T.greenLight; border = T.green; textColor = T.green; }
            return (
              <button key={opt.id} onClick={() => !quizAnswered && handleAnswer(opt.id)} style={{ textAlign: "left", padding: "10px 14px", borderRadius: "var(--radius-md)", border: `1.5px solid ${border}`, background: bg, color: textColor, fontSize: 13, cursor: quizAnswered ? "default" : "pointer", transition: "all 0.2s" }}>
                <strong>{opt.id.toUpperCase()}.</strong> {opt.text}
              </button>
            );
          })}
        </div>
        {quizAnswered && <div style={{ marginTop: 12, padding: "10px 14px", background: quizCorrect ? T.greenLight : T.redLight, border: `1px solid ${quizCorrect ? T.greenBorder : T.redBorder}`, borderRadius: "var(--radius-md)", fontSize: 13, color: quizCorrect ? T.green : T.red, fontWeight: 600 }}>
          {quizCorrect ? "✓ Correct! Long goods (>2m) are stored in specialist hubs and cannot be combined with standard parcel shipments." : "✗ Incorrect. Long goods are stored in specialist long-goods hubs, physically separate from standard DCs — this always requires a separate delivery document."}
        </div>}
      </Card>

      <div style={{ display: "flex", gap: 12 }}>
        <Btn onClick={onRestart} size="lg">↺ New Scenario</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EXCEPTION LAB — UNIFIED 5-SECTION FRAMEWORK
// ═══════════════════════════════════════════════════════

const EXCEPTION_SCENARIOS = [
  {
    id: "inbound_cutoff",
    title: "Inbound After Cutoff",
    subtitle: "Late putaway — missed network injection",
    icon: "⏰",
    severity: "high",
    category: "Warehouse Timing",
    tags: ["WSP","CPA","CTE","OTIF"],
    desc: "Goods arrive before the customer orders — but are not yet pickable. The gap between physical arrival and system availability breaks the Next Day promise.",
  },
  {
    id: "ots_loading",
    title: "OTS — Wrong Truck",
    subtitle: "Correct goods, wrong transport relation",
    icon: "🚚",
    severity: "high",
    category: "Transport Execution",
    tags: ["OTS","WSP","CTE","OTIF"],
    desc: "The shipment left the warehouse on time — but entered the wrong transport flow, losing an entire delivery day while all operational KPIs stayed green.",
  },
  {
    id: "best_plant_split",
    title: "Best Plant — Split Delivery",
    subtitle: "Stock gap forces a costly distance penalty",
    icon: "🏭",
    severity: "medium",
    category: "Inventory & Plant Logic",
    tags: ["Split Rate","Freight Cost","CTE"],
    desc: "One order, two articles, two plants. The freight item is out of stock at the nearest DC — forcing a long-distance split with double cost and double customer touchpoints.",
  },
  {
    id: "cs2",
    title: "CPA Overpromise",
    subtitle: "Committed delivery date cannot be kept",
    icon: "📅",
    severity: "medium",
    category: "Promise Logic",
    tags: ["CDA","ATP","CTE"],
    desc: "ATP check approves a delivery date the physical network cannot fulfill.",
    comingSoon: true,
  },
  {
    id: "cs3",
    title: "Carrier Delay Cascade",
    subtitle: "Hub disruption amplifies across the network",
    icon: "⛈️",
    severity: "high",
    category: "Transport Resilience",
    tags: ["OTIF","CTE","Exception Handling"],
    desc: "A single hub delay propagates to affect hundreds of deliveries simultaneously.",
    comingSoon: true,
  },
  {
    id: "cs4",
    title: "Manual Routing Override",
    subtitle: "Human intervention overrides optimized routing",
    icon: "✋",
    severity: "medium",
    category: "System Integrity",
    tags: ["TMS","Audit","Cost Impact"],
    desc: "Well-intentioned manual routing changes create invisible cost and compliance issues.",
    comingSoon: true,
  },
];

// ── 5 universal section tabs ──────────────────────────
const SECTION_TABS = [
  { id: "promise",  label: "Customer Promise", icon: "🎯", color: "#1565c0" },
  { id: "reality",  label: "Process Reality",  icon: "🏭", color: "#e65100" },
  { id: "kpis",     label: "KPI Reality",      icon: "📊", color: "#c62828" },
  { id: "failure",  label: "Hidden Failure",   icon: "🔍", color: "#6d28d9" },
  { id: "steering", label: "Better Steering",  icon: "🧭", color: "#2e7d32" },
];

// ── Shared scenario shell ─────────────────────────────
function ScenarioShell({ sc, children, onBack, activeSection, setSection }) {
  const sev = sc.severity === "high";
  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
      <div style={{ background: T.navyMid }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 20px 0" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#8eaac8", fontSize: 12, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>← Exception Lab</button>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: sev ? "rgba(198,40,40,0.25)" : "rgba(230,81,0,0.25)", border: `1px solid ${sev ? "rgba(198,40,40,0.4)" : "rgba(230,81,0,0.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{sc.icon}</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#8eaac8", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px" }}>{sc.category}</span>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: sev ? "rgba(198,40,40,0.3)" : "rgba(230,81,0,0.3)", color: sev ? "#fca5a5" : "#fdba74", fontFamily: T.fontMono, fontWeight: 700 }}>{sev ? "HIGH IMPACT" : "MEDIUM IMPACT"}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: T.fontDisplay, lineHeight: 1.2 }}>{sc.title}</div>
              <div style={{ fontSize: 13, color: "#8eaac8", marginTop: 3 }}>{sc.subtitle}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", marginBottom: -1 }}>
            {SECTION_TABS.map((tab) => {
              const active = activeSection === tab.id;
              return (
                <button key={tab.id} onClick={() => setSection(tab.id)} style={{ flexShrink: 0, padding: "10px 14px", background: active ? T.bg : "transparent", color: active ? tab.color : "#8eaac8", border: "none", borderBottom: active ? `3px solid ${tab.color}` : "3px solid transparent", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px" }}>
        {children}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          {(() => {
            const idx = SECTION_TABS.findIndex(t => t.id === activeSection);
            const prev = SECTION_TABS[idx - 1];
            const next = SECTION_TABS[idx + 1];
            return (
              <>
                {prev ? <Btn onClick={() => setSection(prev.id)} variant="ghost" size="sm">← {prev.label}</Btn> : <div />}
                {next ? <Btn onClick={() => setSection(next.id)} size="sm">{next.label} →</Btn> : <Btn onClick={onBack} variant="secondary" size="sm">← Back to Lab</Btn>}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Shared section sub-components ────────────────────

function SectionTitle({ icon, title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ fontSize: 18, fontWeight: 700, color: color || T.textMed, fontFamily: T.fontDisplay }}>{title}</div>
      </div>
      {subtitle && <div style={{ fontSize: 12.5, color: T.textLight, lineHeight: 1.6 }}>{subtitle}</div>}
    </div>
  );
}

function PromiseCard({ service, promise, orderedAt, color }) {
  const c = color || T.blue;
  return (
    <div style={{ background: `linear-gradient(135deg, ${c}18 0%, ${c}08 100%)`, border: `2px solid ${c}44`, borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 10, fontFamily: T.fontMono, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Customer Expectation</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: T.fontDisplay, marginBottom: 6 }}>{service}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${c}18`, border: `1px solid ${c}44`, borderRadius: 20, padding: "4px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{promise}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {orderedAt.map(([label, value, highlight]) => (
            <div key={label} style={{ background: "white", border: `1px solid ${T.border}`, borderRadius: "var(--radius-md)", padding: "8px 14px", minWidth: 110 }}>
              <div style={{ fontSize: 9, color: T.textXLight, fontFamily: T.fontMono, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? c : T.text }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, fullName, status, value, reason, sla }) {
  const cfg = {
    green:  { bg: T.greenLight,    border: T.greenBorder,  col: T.green,       icon: "✅" },
    red:    { bg: T.redLight,      border: T.redBorder,    col: T.red,         icon: "❌" },
    amber:  { bg: T.amberLight,    border: T.amberBorder,  col: T.amber,       icon: "⚠️" },
    idle:   { bg: T.surfaceRaised, border: T.border,       col: T.textXLight,  icon: "–"  },
  }[status] || { bg: T.surfaceRaised, border: T.border, col: T.textXLight, icon: "–" };
  return (
    <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: "var(--radius-md)", padding: 13, position: "relative", marginBottom: 10 }}>
      {sla && <div style={{ position: "absolute", top: -9, right: 8, background: "#78350f", color: "white", fontSize: 8, fontFamily: T.fontMono, fontWeight: 800, padding: "2px 7px", borderRadius: 8 }}>{sla}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, fontFamily: T.fontMono, color: cfg.col }}>{label}</div>
          <div style={{ fontSize: 9, color: T.textLight, fontFamily: T.fontMono, lineHeight: 1.3 }}>{fullName}</div>
        </div>
        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: cfg.col, marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textMed, lineHeight: 1.5 }}>{reason}</div>
    </div>
  );
}

function ExTimeline({ events }) {
  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 6, top: 10, bottom: 0, width: 2, background: T.border, borderRadius: 1 }} />
      {events.map((e, i) => {
        const col   = e.status === "red" ? T.red : e.status === "amber" ? T.amber : e.status === "green" ? T.green : T.blue;
        const bg    = e.status === "red" ? T.redLight : e.status === "amber" ? T.amberLight : e.status === "green" ? T.greenLight : T.blueLight;
        const bord  = e.status === "red" ? T.redBorder : e.status === "amber" ? T.amberBorder : e.status === "green" ? T.greenBorder : T.blueSoft;
        return (
          <div key={i} style={{ position: "relative", marginBottom: 10, animation: `timelineDrop 0.35s ${i * 0.07}s ease both` }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: col, position: "absolute", left: -23, top: 6, border: "2px solid white", boxShadow: e.status === "red" ? `0 0 0 3px ${T.redBorder}` : "none" }} />
            <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: "var(--radius-md)", padding: "9px 12px" }}>
              <div style={{ fontSize: 10, fontFamily: T.fontMono, color: T.textXLight, marginBottom: 2 }}>{e.time}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{e.title}</div>
              {e.sub  && <div style={{ fontSize: 11, color: T.textMed, marginTop: 2, lineHeight: 1.5 }}>{e.sub}</div>}
              {e.warn && <div style={{ marginTop: 6, padding: "5px 8px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-sm)", fontSize: 11, color: T.red, fontWeight: 600 }}>⚠ {e.warn}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SteeringItem({ icon, title, desc }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.greenLight, border: `1px solid ${T.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        <div style={{ fontSize: 12, color: T.textMed, marginTop: 3, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function FailureChain({ title, chain }) {
  return (
    <div style={{ background: "#f5f3ff", border: "2px solid #ddd6fe", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {chain.map(([label, col], i) => {
          const bg    = col === "green" ? T.greenLight  : col === "red"  ? T.redLight    : col === "amber"  ? T.amberLight  : col === "purple" ? "#ede9fe" : T.blueLight;
          const bord  = col === "green" ? T.greenBorder : col === "red"  ? T.redBorder   : col === "amber"  ? T.amberBorder : col === "purple" ? "#ddd6fe" : T.blueSoft;
          const text  = col === "green" ? T.green       : col === "red"  ? T.red         : col === "amber"  ? T.amber       : col === "purple" ? "#6d28d9"  : T.blue;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ padding: "5px 10px", borderRadius: 20, background: bg, border: `1px solid ${bord}`, fontSize: 11, fontWeight: 700, color: text, whiteSpace: "nowrap" }}>{label}</div>
              {i < chain.length - 1 && <span style={{ color: T.textXLight, fontSize: 12 }}>→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// SCENARIO 1 — INBOUND AFTER CUTOFF
// ─────────────────────────────────────────────────────
function ScenarioInboundCutoff({ onBack }) {
  const [section, setSection] = useState("promise");
  const [phase, setPhase]     = useState(0);
  const [truckGone, setTruckGone] = useState(false);
  const sc = EXCEPTION_SCENARIOS.find(s => s.id === "inbound_cutoff");

  function advance() {
    const next = Math.min(phase + 1, 6);
    setPhase(next);
    if (next === 6) setTimeout(() => setTruckGone(true), 500);
  }

  const IC_EVT = [
    { time: "12:30", title: "Goods Physically Arrive",        sub: "Truck docks at Gate 3. Goods unloaded inside the building.", status: "green" },
    { time: "12:35", title: "Inbound Scan Completed",         sub: "SAP EWM status: IN INBOUND AREA. Not yet at pick location.", status: "amber" },
    { time: "13:00", title: "Customer Places Next Day Order", sub: "ATP check runs — physical stock found → Next Day promise confirmed.", status: "blue" },
    { time: "14:00", title: "⛔ Next Day Cutoff Passes",      sub: "All articles must be pickable NOW. Putaway still not complete.", status: "red",   warn: "Article still in inbound area. Delivery creation blocked." },
    { time: "15:00", title: "Putaway Completed — 1h Too Late",sub: "Article now at pick location. But 1h after the cutoff.",        status: "amber", warn: "Chain (pick → pack → stage → load) cannot complete before 18:00." },
    { time: "18:00", title: "Long-Distance Truck Departs",    sub: "KNX1 departs. Shipment NOT loaded.",                           status: "red",   warn: "Network injection missed. No re-run until tomorrow." },
  ];

  const sec = {
    promise: (
      <div>
        <SectionTitle icon="🎯" title="Customer Promise" color={T.blue} subtitle="What the customer saw when placing the order at 13:00." />
        <PromiseCard service="Next Day Delivery" promise="Delivery Tomorrow — Guaranteed" color={T.blue}
          orderedAt={[["Order time","13:00",true],["Service","Next Day",false],["Promised date","Tomorrow",true],["ATP result","Stock found ✓",false]]} />
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Customer View vs. ATP Reality</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: "var(--radius-md)", padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.green, fontFamily: T.fontMono, marginBottom: 8 }}>CUSTOMER VIEW</div>
              {[["Service","Next Day"],["Promise","Delivery Tomorrow"],["Status","✓ Confirmed 😊"]].map(([k,v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.greenBorder}`, fontSize: 12 }}><span style={{ color: T.textLight }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
              ))}
            </div>
            <div style={{ background: T.amberLight, border: `1px solid ${T.amberBorder}`, borderRadius: "var(--radius-md)", padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, fontFamily: T.fontMono, marginBottom: 8 }}>WHAT ATP ACTUALLY CHECKED</div>
              {[["Physical stock","Yes — 12:30 ✓"],["Inbound scan","Yes — 12:35 ✓"],["Pickable stock","NOT VERIFIED ⚠"],["At pick location","NOT VERIFIED ⚠"]].map(([k,v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.amberBorder}`, fontSize: 12 }}><span style={{ color: T.textLight }}>{k}</span><span style={{ fontWeight: 700, color: v.includes("⚠") ? T.amber : T.green, fontSize: 11 }}>{v}</span></div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", border: `1px solid #fde68a`, borderLeft: `4px solid ${T.amber}`, borderRadius: "var(--radius-md)", fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
            💡 <strong>ATP checked physical presence — not pickable availability.</strong> The promise was made on incomplete information.
          </div>
        </Card>
      </div>
    ),

    reality: (
      <div>
        <SectionTitle icon="🏭" title="Process Reality" color={T.amber} subtitle="What actually happened in the warehouse between 12:30 and 18:00." />
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed }}>Step-by-step reveal</div>
            {phase < 6 ? <Btn onClick={advance} size="sm">{phase === 0 ? "▶ Start" : `Reveal ${IC_EVT[phase]?.time} →`}</Btn>
              : <div style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>🚨 Failure locked in</div>}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
            {IC_EVT.map((e, i) => {
              const done = phase > i; const act = phase === i + 1;
              const col  = done ? T.green : act ? (e.status === "red" ? T.red : T.blue) : T.border;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", transition: "all 0.3s", boxShadow: act ? `0 0 0 3px ${col}33` : "none" }}>{done ? "✓" : i + 1}</div>
                    <div style={{ fontSize: 8, fontFamily: T.fontMono, color: done ? T.green : act ? col : T.textXLight, fontWeight: act ? 700 : 400 }}>{e.time}</div>
                  </div>
                  {i < IC_EVT.length - 1 && <div style={{ width: 16, height: 2, background: done ? T.green : T.border, margin: "0 3px", marginBottom: 10, transition: "background 0.3s" }} />}
                </div>
              );
            })}
          </div>
          {phase > 0 && <ExTimeline events={IC_EVT.slice(0, phase)} />}
        </div>

        {phase >= 1 && (
          <Card style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, marginBottom: 14 }}>Stock Availability States</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", gap: 8, alignItems: "center" }}>
              <div style={{ background: phase >= 2 ? T.greenLight : T.surfaceRaised, border: `2px solid ${phase >= 2 ? T.greenBorder : T.border}`, borderRadius: "var(--radius-lg)", padding: 14, textAlign: "center", transition: "all 0.5s" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🚛</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: phase >= 2 ? T.green : T.textLight }}>Inbound Area</div>
                <div style={{ fontSize: 11, color: T.textLight, margin: "4px 0 8px", lineHeight: 1.4 }}>Physically in warehouse</div>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: T.fontMono, color: phase >= 2 ? T.green : T.textXLight }}>{phase >= 2 ? "✓ SCANNED 12:35" : "—"}</div>
              </div>
              <div style={{ textAlign: "center", fontSize: 16, color: phase >= 5 ? T.green : phase >= 3 ? T.red : T.textXLight, transition: "color 0.4s" }}>→</div>
              <div style={{ background: phase >= 5 ? T.greenLight : phase >= 3 ? T.redLight : T.surfaceRaised, border: `2px solid ${phase >= 5 ? T.greenBorder : phase >= 3 ? T.redBorder : T.border}`, borderRadius: "var(--radius-lg)", padding: 14, textAlign: "center", transition: "all 0.5s", position: "relative" }}>
                {phase >= 3 && phase < 5 && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: T.red, color: "white", fontSize: 9, fontWeight: 800, fontFamily: T.fontMono, padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>NOT PICKABLE</div>}
                {phase >= 5 && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: phase >= 6 ? T.amber : T.green, color: "white", fontSize: 9, fontWeight: 800, fontFamily: T.fontMono, padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{phase >= 6 ? "TOO LATE ⚠" : "PICKABLE ✓"}</div>}
                <div style={{ fontSize: 28, marginBottom: 6 }}>📦</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: phase >= 5 ? (phase >= 6 ? T.amber : T.green) : phase >= 3 ? T.red : T.textLight }}>Pick Location</div>
                <div style={{ fontSize: 11, color: T.textLight, margin: "4px 0 8px", lineHeight: 1.4 }}>Available for pick &amp; pack</div>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: T.fontMono, color: phase >= 5 ? (phase >= 6 ? T.amber : T.green) : phase >= 3 ? T.red : T.textXLight }}>{phase >= 5 ? "PUTAWAY 15:00" : phase >= 3 ? "⛔ BLOCKED" : "—"}</div>
              </div>
            </div>
            {phase >= 2 && phase < 5 && <div style={{ marginTop: 10, padding: "9px 12px", background: "#fff8e1", border: `1px solid #fde68a`, borderLeft: `4px solid ${T.amber}`, borderRadius: "var(--radius-md)", fontSize: 12, color: "#78350f", fontWeight: 600 }}>💡 Physical presence ≠ system availability. The goods are in the building but not yet processable.</div>}
            {phase >= 6 && <div style={{ marginTop: 10, padding: "9px 12px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderLeft: `4px solid ${T.red}`, borderRadius: "var(--radius-md)", fontSize: 12, color: T.red, fontWeight: 700 }}>🚨 Pickable at 15:00 — 1h past cutoff. Downstream chain cannot complete. Truck departed without shipment.</div>}
          </Card>
        )}

        {phase >= 6 && (
          <Card style={{ border: `2px solid ${T.redBorder}`, animation: "fadeUp 0.4s ease", overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 12 }}>18:00 — Network Injection Missed</div>
            <div style={{ background: "linear-gradient(180deg,#e8f4fd,#f0f4f8)", borderRadius: "var(--radius-md)", position: "relative", overflow: "hidden", height: 90, marginBottom: 12 }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24, background: "#4a5568" }} />
              <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, height: 4, background: "repeating-linear-gradient(90deg,#f6e05e 0,#f6e05e 20px,transparent 20px,transparent 40px)" }} />
              <div style={{ position: "absolute", left: 12, bottom: 24, width: 48, height: 46, background: "#718096", borderRadius: "3px 3px 0 0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏭</div>
              <div style={{ position: "absolute", left: 66, bottom: 26, animation: "pulse 2s infinite" }}>
                <div style={{ background: T.amberLight, border: `2px solid ${T.amber}`, borderRadius: 5, padding: "3px 7px", fontSize: 10, fontWeight: 700, color: T.amber, whiteSpace: "nowrap" }}>📦 Still packing!</div>
              </div>
              <div style={{ position: "absolute", bottom: 24, left: truckGone ? "calc(100% + 20px)" : "52%", transition: "left 2.5s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 8, fontFamily: T.fontMono, fontWeight: 800, color: "white", background: T.navy, padding: "2px 5px", borderRadius: 3, marginBottom: 3, whiteSpace: "nowrap" }}>KNX1 18:00</div>
                <span style={{ fontSize: 28 }}>🚛</span>
              </div>
              <div style={{ position: "absolute", top: 8, right: 10, background: T.red, color: "white", borderRadius: 5, padding: "3px 8px", fontSize: 11, fontFamily: T.fontMono, fontWeight: 800 }}>18:00</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px 14px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.red, fontFamily: T.fontDisplay }}>+1 Delivery Day Late</div>
              <div style={{ fontSize: 12, color: T.textMed, marginTop: 4 }}>Next Day promise became Day After Tomorrow. The customer will not understand why.</div>
            </div>
          </Card>
        )}
      </div>
    ),

    kpis: (
      <div>
        <SectionTitle icon="📊" title="KPI Reality" color={T.red} subtitle="How today's standard dashboard looks — and what it hides." />
        <div style={{ padding: "10px 14px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderLeft: `4px solid ${T.red}`, borderRadius: "var(--radius-md)", marginBottom: 16, fontSize: 12, color: T.textMed, lineHeight: 1.7 }}>
          <strong style={{ color: T.red }}>The dangerous pattern:</strong> CPA and WSP are green. OTIF turns red only after the customer is already waiting for a late delivery.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <KpiCard label="CPA" fullName="Customer Product Availability" status="green" value="GREEN — Stock physically present" reason="Product in warehouse since 12:30. CPA does not distinguish inbound area from pick location." />
          <KpiCard label="WSP" fullName="Warehouse Shipping Performance" status="green" value="GREEN — Putaway done by 23:59" reason="Putaway at 15:00 is within the 23:59 SLA. The actual required cutoff for Next Day articles is 14:00." sla="SLA: 23:59 ⚠" />
          <KpiCard label="CTE" fullName="Customer Transport Experience" status="red" value="RED — Delivery +1 day late" reason="Network injection missed. Customer receives delivery the day after tomorrow." />
          <KpiCard label="OTIF" fullName="On Time In Full" status="red" value="RED — Too late to act" reason="OTIF turns red at delivery confirmation — hours after the truck departed without the shipment." />
        </div>
        <Card style={{ border: `1px solid ${T.amberBorder}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>⚠ The WSP SLA Problem</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: 12, background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.red, fontFamily: T.fontMono, marginBottom: 6 }}>TODAY'S WSP SLA</div>
              <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>Putaway measured vs. <strong>23:59</strong>. Putaway at 15:00 = ✅ green. No awareness of the 14:00 Next Day dependency.</div>
            </div>
            <div style={{ padding: 12, background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.green, fontFamily: T.fontMono, marginBottom: 6 }}>CORRECT WSP SLA</div>
              <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.6 }}>For Next Day articles: putaway measured vs. <strong>order cutoff (14:00)</strong>. Different service levels, different SLA targets.</div>
            </div>
          </div>
        </Card>
      </div>
    ),

    failure: (
      <div>
        <SectionTitle icon="🔍" title="Hidden Failure" color="#6d28d9" subtitle="The synchronization gap that no standard dashboard shows." />
        <FailureChain title="Where synchronization broke down"
          chain={[["Goods arrive 12:30","green"],["Scan 12:35","green"],["Order 13:00","blue"],["ATP: stock ✓","green"],["Promise made","green"],["Cutoff 14:00","red"],["Putaway 15:00 — late","amber"],["Chain blocked","red"],["Truck 18:00","red"],["Day+2 delivery","red"]]} />
        <Card style={{ border: "2px solid #ddd6fe" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>The Real Problem</div>
          {[
            { icon: "📦", title: "Physical ≠ Pickable Stock", desc: "SAP ATP confirmed the promise based on physical stock presence — without verifying that the article was at the pick location and processable. These are two different availability states." },
            { icon: "⏰", title: "Priority Blindness at Inbound", desc: "When goods arrive, the warehouse has no signal about which articles have open Next Day orders. Putaway is prioritised by space and logistics — not by outbound urgency." },
            { icon: "🔗", title: "System Synchronization Gap", desc: "EWM inbound and SAP SD/ATP operate in isolation. The outbound order cutoff is not communicated to the inbound process — so the warehouse cannot prioritise accordingly." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div><div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12, color: T.textMed, marginTop: 3, lineHeight: 1.6 }}>{desc}</div></div>
            </div>
          ))}
        </Card>
      </div>
    ),

    steering: (
      <div>
        <SectionTitle icon="🧭" title="Better Steering Logic" color={T.green} subtitle="How the network should be steered — not who is to blame." />
        <Card style={{ border: `1px solid ${T.greenBorder}`, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, fontFamily: T.fontMono, textTransform: "uppercase", marginBottom: 4 }}>Steering Principle</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>"The network must synchronize inbound urgency with outbound promise. Arrival of goods should immediately trigger a prioritisation signal if they are needed for a live customer commitment."</div>
        </Card>
        <SteeringItem icon="🔗" title="Connect ATP to Pickable Availability" desc="SAP ATP must check pickable stock at the pick location — not just physical warehouse presence — before confirming a Next Day date. Physical presence ≠ processable." />
        <SteeringItem icon="⚡" title="Priority-Aware Putaway" desc="When an article arrives with an open Next Day order, automatically create a high-priority putaway task in EWM with a time target before the order cutoff." />
        <SteeringItem icon="📏" title="Article-Specific WSP SLA" desc="Split WSP into 'WSP Standard' (23:59) and 'WSP Priority' (order cutoff). Different service levels require different putaway urgency targets." />
        <SteeringItem icon="📡" title="Real-Time Cutoff Risk Signal" desc="If putaway is pending at T-2h before cutoff with an open Next Day order: (1) escalate to warehouse supervisor, (2) notify customer of potential delay before it becomes a missed delivery." />
      </div>
    ),
  };

  return (
    <ScenarioShell sc={sc} onBack={onBack} activeSection={section} setSection={setSection}>
      {sec[section]}
    </ScenarioShell>
  );
}

// ─────────────────────────────────────────────────────
// SCENARIO 2 — OTS: WRONG TRUCK
// ─────────────────────────────────────────────────────
function ScenarioOTSLoading({ onBack }) {
  const [section, setSection] = useState("promise");
  const [phase, setPhase]     = useState(0);
  const sc = EXCEPTION_SCENARIOS.find(s => s.id === "ots_loading");

  const OTS_EVT = [
    { time: "17:10", title: "Shipment Packed & Staged",                sub: "All items picked, packed, labelled. Staged at Gate 7.",                 status: "green" },
    { time: "17:55", title: "⚠ Loaded at Gate 7 — Not Cross-Checked", sub: "Forklift loads shipment onto Gate 7 truck. No system verification.",   status: "amber" },
    { time: "18:00", title: "KNX1 Departs — WITHOUT Shipment",         sub: "Correct long-distance truck departs. Shipment missed.",                status: "red", warn: "Long-distance network injection window has closed." },
    { time: "18:10", title: "Oversight Identified — Too Late",         sub: "Shift leader notices mismatch. KNX1 already on motorway.",             status: "amber" },
    { time: "22:00", title: "Loaded onto Local Departure",             sub: "Shipment loaded onto same-carrier local departure.",                   status: "amber", warn: "Local route cannot fulfil Next Day SLA." },
    { time: "Day+2", title: "Customer Receives — 1 Day Late",          sub: "Delivery arrives Day+2 instead of Day+1.",                            status: "red" },
  ];

  const sec = {
    promise: (
      <div>
        <SectionTitle icon="🎯" title="Customer Promise" color={T.blue} subtitle="What the customer was promised and what they expected." />
        <PromiseCard service="Next Day Delivery" promise="Delivery Tomorrow — Guaranteed" color={T.blue}
          orderedAt={[["Order placed","Yesterday 14:00",true],["Service","Next Day",false],["Promised date","Today (Day+1)",true],["Status","In preparation ✓",false]]} />
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>What Was Correctly Executed</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[["Picking","Done ✓","green"],["Packing","Done ✓","green"],["Staging","Done ✓","green"],["Freight booking","EDI confirmed ✓","green"],["Departure","Left at 22:00 ✓","green"],["PGI","SAP confirmed ✓","green"]].map(([k,v,c]) => (
              <div key={k} style={{ padding: "8px 10px", background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderLeft: `4px solid ${T.red}`, borderRadius: "var(--radius-md)", fontSize: 12, color: T.textMed, lineHeight: 1.7 }}>
            <strong style={{ color: T.red }}>Everything looked correct.</strong> Pick, pack, stage, EDI, departure — all green. Yet the customer promise was broken.
          </div>
        </Card>
      </div>
    ),

    reality: (
      <div>
        <SectionTitle icon="🏭" title="Process Reality" color={T.amber} subtitle="What happened at the loading gates between 17:00 and 22:00." />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed }}>Event timeline</div>
          {phase < 6 ? <Btn onClick={() => setPhase(p => Math.min(p+1,6))} size="sm">{phase===0?"▶ Start":"Reveal Next →"}</Btn>
            : <div style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>Timeline complete</div>}
        </div>
        {phase > 0 && <ExTimeline events={OTS_EVT.slice(0, phase)} />}

        <Card style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Planned vs. Actual Transport Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ border: `2px solid ${T.greenBorder}`, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div style={{ background: T.greenLight, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: T.green }}>✅ Planned: KNX1 18:00</div>
              <div style={{ padding: 12 }}>
                {[["Departure","18:00 (long-distance)"],["Route","Direct → Northern Hub"],["Delivery","Day+1 · 11:00 ✅"],["SLA","Met — Next Day"]].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}><span style={{ color: T.textLight }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
                ))}
              </div>
            </div>
            <div style={{ border: `2px solid ${T.redBorder}`, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div style={{ background: T.redLight, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: T.red }}>❌ Actual: Gate 7 Local 22:00</div>
              <div style={{ padding: 12 }}>
                {[["Departure","22:00 (local)"],["Route","Local → Regional Hub"],["Delivery","Day+2 · 14:00 ❌"],["SLA","FAILED — 1 day late"]].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}><span style={{ color: T.textLight }}>{k}</span><span style={{ fontWeight: 700, color: v.includes("❌")||v.includes("FAIL") ? T.red : T.text }}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Planned", steps: [["🏭 Warehouse","blue"],["✅ KNX1 18:00","green"],["🎯 Day+1","green"]] },
              { label: "Actual",  steps: [["🏭 Warehouse","blue"],["❌ Local 22:00","red"],["⚠ Regional Hub","amber"],["😞 Day+2","red"]] },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontFamily: T.fontMono, color: T.textLight, width: 44 }}>{row.label}</span>
                {row.steps.map(([s,c],i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: c==="blue"?T.blueLight:c==="green"?T.greenLight:c==="red"?T.redLight:T.amberLight, color: c==="blue"?T.blue:c==="green"?T.green:c==="red"?T.red:T.amber, fontWeight: 600, border: `1px solid ${c==="blue"?T.blueSoft:c==="green"?T.greenBorder:c==="red"?T.redBorder:T.amberBorder}`, whiteSpace: "nowrap" }}>{s}</span>
                    {i < row.steps.length-1 && <span style={{ color: T.textXLight, fontSize: 12 }}>›</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    ),

    kpis: (
      <div>
        <SectionTitle icon="📊" title="KPI Reality" color={T.red} subtitle="5 KPIs green. 1 red. The failure hides between WSP and OTS." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <KpiCard label="CPA" fullName="Customer Product Availability" status="green" value="GREEN — Picked, packed, dispatched" reason="Product was available and correctly fulfilled. CPA has no visibility into which truck was used." />
          <KpiCard label="WSP" fullName="Warehouse Shipping Performance" status="green" value="GREEN — Departed before 23:59" reason="Shipment left the warehouse at 22:00 — within today's SLA. WSP does not check the transport relation." sla="SLA: BY 23:59 ⚠" />
          <KpiCard label="CTE" fullName="Customer Transport Experience" status="red" value="RED — +1 delivery day" reason="Wrong transport relation. Local route cannot meet Next Day SLA. Delivery slips to Day+2." />
          <KpiCard label="OTS" fullName="On-Time Shipping (correct relation)" status="red" value="RED — Wrong transport relation" reason="NEW KPI — verifies departure on the planned transport relation. KNX1 18:00 required; local 22:00 used." sla="NEW KPI" />
        </div>
        <KpiCard label="OTIF" fullName="On Time In Full" status="red" value="RED — Day+2 instead of Day+1" reason="Confirmed at delivery — hours after the wrong truck departed. No early intervention possible." />
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef3c7", border: `1px solid ${T.amberBorder}`, borderLeft: `4px solid ${T.amber}`, borderRadius: "var(--radius-md)", fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
          <strong>The WSP–OTS gap:</strong> WSP = "did the shipment leave the warehouse?" OTS = "did the shipment enter the correct transport relation?" Without OTS, this failure was invisible until the customer complained on Day+2.
        </div>
      </div>
    ),

    failure: (
      <div>
        <SectionTitle icon="🔍" title="Hidden Failure" color="#6d28d9" subtitle="The shipment was correct. The transport relation was wrong. No system caught it." />
        <FailureChain title="Transport synchronization breakdown"
          chain={[["Pick ✓","green"],["Pack ✓","green"],["Stage ✓","green"],["Gate assigned","amber"],["Wrong truck loaded","red"],["KNX1 departs empty","red"],["Local 22:00","amber"],["Network missed","red"],["Day+2 delivery","red"]]} />
        <Card style={{ border: "2px solid #ddd6fe" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>The Real Problem</div>
          {[
            { icon: "🚪", title: "Gate Assignment Not Enforced", desc: "Loading gate assignment exists in TMS but was not enforced at the physical loading point. The forklift operator had no system-side confirmation that the shipment was on the correct truck." },
            { icon: "🔗", title: "PGI Without Network Verification", desc: "SAP posted Goods Issue after the shipment left the warehouse. No check was performed on whether the shipment was on the correct planned transport relation." },
            { icon: "⏱", title: "Detection Window Too Narrow", desc: "The oversight was noticed at 18:10 — 10 minutes after KNX1 departed. Without an automated check at the departure window, human escalation came too late." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div><div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12, color: T.textMed, marginTop: 3, lineHeight: 1.6 }}>{desc}</div></div>
            </div>
          ))}
        </Card>
      </div>
    ),

    steering: (
      <div>
        <SectionTitle icon="🧭" title="Better Steering Logic" color={T.green} subtitle="How gate assignment and transport verification should be controlled." />
        <Card style={{ border: `1px solid ${T.greenBorder}`, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, fontFamily: T.fontMono, textTransform: "uppercase", marginBottom: 4 }}>Steering Principle</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>"Physical departure from the warehouse is not the same as successful network injection. The system must verify the correct transport relation — not just that the shipment left the building."</div>
        </Card>
        <SteeringItem icon="🔒" title="Gate-Lock Verification in EWM" desc="Block PGI confirmation unless the shipment scan matches the planned transport relation in TMS. The system must enforce — not merely suggest — correct gate assignment." />
        <SteeringItem icon="📡" title="Automated Departure Window Alert" desc="At T-30 minutes before a long-distance departure, verify all planned shipments have scanned onto the correct truck. Missing shipments trigger an immediate supervisor alert." />
        <SteeringItem icon="📊" title="Introduce OTS as a Standing KPI" desc="OTS (On-Time Shipping on correct transport relation) should be a daily operational KPI — bridging the gap between WSP (left the warehouse) and OTIF (arrived at customer)." />
        <SteeringItem icon="🔁" title="Departure Synchronization Protocol" desc="TMS should automatically cross-check confirmed freight bookings against loading scans at departure time. Any mismatch triggers an immediate re-routing decision." />
      </div>
    ),
  };

  return (
    <ScenarioShell sc={sc} onBack={onBack} activeSection={section} setSection={setSection}>
      {sec[section]}
    </ScenarioShell>
  );
}

// ─────────────────────────────────────────────────────
// SCENARIO 3 — BEST PLANT: SPLIT DELIVERY
// ─────────────────────────────────────────────────────
function ScenarioBestPlantSplit({ onBack }) {
  const [section, setSection] = useState("promise");
  const sc = EXCEPTION_SCENARIOS.find(s => s.id === "best_plant_split");

  const PARCEL  = { name: "Anchor Bolt Set",           icon: "🪛",  weight: 2.4,  price: 55,   type: "parcel"  };
  const FREIGHT = { name: "Grinding System (Pallet)",  icon: "⚙️",  weight: 42.0, price: 1850, type: "freight" };
  const PARCEL_COST = 11.50;
  const FRT_NBG = 142.00;
  const FRT_OBH =  38.00;
  const TOTAL_ACTUAL = PARCEL_COST + FRT_NBG;
  const TOTAL_OBH    = PARCEL_COST + FRT_OBH;
  const EXTRA        = TOTAL_ACTUAL - TOTAL_OBH;

  const sec = {
    promise: (
      <div>
        <SectionTitle icon="🎯" title="Customer Promise" color={T.blue} subtitle="One order, two articles, one delivery address in Düsseldorf." />
        <PromiseCard service="Standard Delivery" promise="Single shipment — both articles together" color={T.blue}
          orderedAt={[["Customer","Mustermann GmbH",false],["Ship-to","Düsseldorf",true],["Articles","2 items",false],["Expected","One delivery",true]]} />
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Order Items</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[PARCEL, FREIGHT].map(item => (
              <div key={item.name} style={{ background: item.type === "parcel" ? T.blueLight : T.amberLight, border: `2px solid ${item.type === "parcel" ? T.blueSoft : T.amberBorder}`, borderRadius: "var(--radius-md)", padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 26 }}>{item.icon}</span>
                  <div><div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono }}>{item.weight} kg · €{item.price.toLocaleString()}</div></div>
                </div>
                <Chip label={item.type === "parcel" ? "📦 PARCEL — flat rate" : "🏗️ FREIGHT — weight × distance"} color={item.type === "parcel" ? "blue" : "amber"} />
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 14px", background: T.blueLight, border: `1px solid ${T.blueSoft}`, borderLeft: `4px solid ${T.blue}`, borderRadius: "var(--radius-md)", fontSize: 12, color: T.textMed, lineHeight: 1.7 }}>
            📌 <strong>Nearest plant: Oberhausen DC</strong> — ~38 km from Düsseldorf. Customer expects both articles to ship from here.
          </div>
        </Card>
      </div>
    ),

    reality: (
      <div>
        <SectionTitle icon="🏭" title="Process Reality" color={T.amber} subtitle="SAP MM availability check reveals a stock gap — and the split logic kicks in." />
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>SAP MM Availability Check</div>
          {[
            { wh: "🇩🇪 Oberhausen DC", dist: "~38 km", parcelOk: true, freightOk: false, label: "NEAREST PLANT", lCol: "green" },
            { wh: "🇩🇪 Nürnberg DC",   dist: "~420 km", parcelOk: false, freightOk: true, label: "BEST PLANT AVAILABLE", lCol: "amber" },
          ].map(row => (
            <div key={row.wh} style={{ border: `2px solid ${row.lCol === "green" ? T.amberBorder : T.amberBorder}`, borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ background: row.lCol === "green" ? T.greenLight : T.amberLight, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{row.wh.split(" ")[0]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: row.lCol === "green" ? T.green : T.amber }}>{row.wh.split(" ").slice(1).join(" ")}</div>
                  <div style={{ fontSize: 11, color: T.textMed }}>{row.dist} from Düsseldorf</div>
                </div>
                <Chip label={row.label} color={row.lCol} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
                {[[PARCEL, row.parcelOk],[FREIGHT, row.freightOk]].map(([item, ok]) => (
                  <div key={item.name} style={{ display: "flex", gap: 10, padding: "8px 10px", background: ok ? T.greenLight : T.redLight, border: `1px solid ${ok ? T.greenBorder : T.redBorder}`, borderRadius: "var(--radius-md)", alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{item.name.split(" ").slice(0,2).join(" ")}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ok ? T.green : T.red, marginTop: 2 }}>{ok ? "✓ In stock" : "✗ Out of stock"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <InfoBox title="Result: Delivery Split — 2 Documents, 2 Flows" variant="warning">
          SAP cannot fulfill both articles from one plant. Two outbound delivery documents are created. The customer receives <strong>two separate deliveries</strong>.
        </InfoBox>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Two Parallel Transport Flows</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Flow 1 — Parcel",  from: "Oberhausen", carrier: "🔵 GLS",   dist: "~38 km",  cost: `€${PARCEL_COST.toFixed(2)} (flat)`,      transit: "Next Day",    col: T.blue },
              { label: "Flow 2 — Freight", from: "Nürnberg",   carrier: "🔴 Emons",  dist: "~420 km", cost: `€${FRT_NBG.toFixed(2)} (wt×dist)`,       transit: "1–2 days",   col: T.amber },
            ].map(f => (
              <div key={f.label} style={{ border: `2px solid ${f.col}44`, borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div style={{ background: `${f.col}18`, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: f.col }}>{f.label}</div>
                <div style={{ padding: 12 }}>
                  {[["From",f.from],["Carrier",f.carrier],["Distance",f.dist],["Cost",f.cost],["Transit",f.transit]].map(([k,v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}><span style={{ color: T.textLight }}>{k}</span><span style={{ fontWeight: 600, fontFamily: T.fontMono, fontSize: 11 }}>{v}</span></div>
                  ))}
                  <div style={{ marginTop: 8, padding: "5px 8px", background: `${f.col}18`, borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 600, color: f.col }}>👤 Customer touchpoint {f.col === T.blue ? "#1" : "#2"}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    ),

    kpis: (
      <div>
        <SectionTitle icon="📊" title="KPI Reality" color={T.amber} subtitle="Most KPIs look fine. The split cost and experience penalty are invisible." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <KpiCard label="CPA" fullName="Customer Product Availability" status="green" value="GREEN — Both articles available" reason="Stock exists across the network. CPA reports full availability — no penalty for being at different plants." />
          <KpiCard label="WSP" fullName="Warehouse Shipping Performance" status="green" value="GREEN — Both DCs ship on time" reason="Both Oberhausen and Nürnberg execute within SLA. Two separate green results." />
          <KpiCard label="CTE" fullName="Customer Transport Experience" status="green" value="GREEN — Both deliveries arrived on time" reason="CTE only measures whether the delivery landed within the agreed transport window — not whether a split occurred. Both flows arrived on their planned dates. CTE is green. The experience impact is captured by Split Rate, not CTE." />
          <KpiCard label="OTIF" fullName="On Time In Full" status="green" value="GREEN — Both delivered on time" reason="OTIF only fails if a delivery is late. A split that arrives on its planned date is green — even if the customer experience is degraded." />
        </div>
        <Card style={{ border: `1px solid ${T.amberBorder}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>⚠ The KPI Blind Spot — Freight Cost &amp; Split Rate</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: 12, background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.red, fontFamily: T.fontMono, marginBottom: 6 }}>ACTUAL (Nürnberg split)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.red }}>€{TOTAL_ACTUAL.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: T.textMed, marginTop: 4 }}>GLS €{PARCEL_COST.toFixed(2)} + Emons €{FRT_NBG.toFixed(2)} (420 km)</div>
            </div>
            <div style={{ padding: 12, background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.green, fontFamily: T.fontMono, marginBottom: 6 }}>IF OBH HAD STOCK</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.green }}>€{TOTAL_OBH.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: T.textMed, marginTop: 4 }}>GLS €{PARCEL_COST.toFixed(2)} + Emons €{FRT_OBH.toFixed(2)} (38 km)</div>
            </div>
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", background: T.redLight, border: `1px solid ${T.redBorder}`, borderRadius: "var(--radius-md)", fontSize: 12, color: T.red, fontWeight: 700, textAlign: "center" }}>
            Extra cost per split order: +€{EXTRA.toFixed(2)} — not visible in any standard KPI
          </div>
        </Card>
      </div>
    ),

    failure: (
      <div>
        <SectionTitle icon="🔍" title="Hidden Failure" color="#6d28d9" subtitle="The real problem is not the split. It's the stock gap and the pricing logic that make it expensive." />
        <FailureChain title="Inventory gap → experience and cost penalty"
          chain={[["Order placed","blue"],["ATP check","blue"],["Freight OOS Oberhausen","red"],["Best plant = Nürnberg","amber"],["Split created","amber"],["2× transport flows","amber"],["Distance ×3.7 cost","red"],["2× customer touchpoints","amber"],["Extra cost invisible","red"]]} />
        <Card style={{ border: "2px solid #ddd6fe" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>The Real Problem</div>
          {[
            { icon: "📐", title: "Freight Pricing Is Distance-Dependent", desc: "Parcel pricing is flat-rate — distance barely matters. Freight (pallet) pricing uses a weight × distance matrix. Moving 42 kg from 420 km instead of 38 km multiplies cost by ~3.7×. Plant selection is critical for heavy freight articles." },
            { icon: "🏭", title: "Safety Stock Logic Ignores Freight Distance", desc: "Safety stock at Oberhausen was not maintained for the Grinding System — even though it is the primary plant for NRW customers. Replenishment logic doesn't factor in freight distance penalties." },
            { icon: "👁", title: "Split Rate Not Measured at SKU + Plant Level", desc: "Standard dashboards report total split rate. They don't show which articles drive splits, which plants are chronically under-stocked, or the per-order freight penalty. The business impact is invisible." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div><div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12, color: T.textMed, marginTop: 3, lineHeight: 1.6 }}>{desc}</div></div>
            </div>
          ))}
        </Card>
      </div>
    ),

    steering: (
      <div>
        <SectionTitle icon="🧭" title="Better Steering Logic" color={T.green} subtitle="How inventory placement and split logic should be steered." />
        <Card style={{ border: `1px solid ${T.greenBorder}`, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, fontFamily: T.fontMono, textTransform: "uppercase", marginBottom: 4 }}>Steering Principle</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>"Inventory placement should be driven by transport cost logic — not just storage capacity. Where you hold stock determines how much a split costs the business."</div>
        </Card>
        <SteeringItem icon="📍" title="Distance-Weighted Safety Stock" desc="For heavy freight articles (>10 kg), safety stock at the nearest plant should account for freight distance penalties. If a Nürnberg split costs +€104 per order, the Oberhausen safety stock investment has a calculable break-even." />
        <SteeringItem icon="📊" title="SKU-Level Split Rate Reporting" desc="Measure split rate per article, per plant, per customer region. Identify the top 20 articles driving the highest freight distance penalties. These are the priority restock targets." />
        <SteeringItem icon="⚠️" title="Split Cost Visibility at Order Creation" desc="When SAP creates a split, calculate the freight distance penalty immediately. Make this visible in the order management dashboard — not buried in freight accounting months later." />
        <SteeringItem icon="🔄" title="Demand-Driven Replenishment for High-Split Articles" desc="If an article has a split rate above 10% from a given plant, automatically lower the reorder point to prevent stock-outs that drive costly distance-penalty splits." />
      </div>
    ),
  };

  return (
    <ScenarioShell sc={sc} onBack={onBack} activeSection={section} setSection={setSection}>
      {sec[section]}
    </ScenarioShell>
  );
}

// ─────────────────────────────────────────────────────
// EXCEPTION LAB LANDING
// ─────────────────────────────────────────────────────
function ExceptionLabModule() {
  const [activeScenario, setActiveScenario] = useState(null);

  if (activeScenario === "inbound_cutoff")  return <ScenarioInboundCutoff  onBack={() => setActiveScenario(null)} />;
  if (activeScenario === "ots_loading")      return <ScenarioOTSLoading      onBack={() => setActiveScenario(null)} />;
  if (activeScenario === "best_plant_split") return <ScenarioBestPlantSplit  onBack={() => setActiveScenario(null)} />;

  const active = EXCEPTION_SCENARIOS.filter(s => !s.comingSoon);
  const soon   = EXCEPTION_SCENARIOS.filter(s => s.comingSoon);

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
      <div style={{ background: T.navyMid, padding: "28px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Module 2</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", fontFamily: T.fontDisplay, marginBottom: 8 }}>Exception Lab</h1>
          <p style={{ fontSize: 13.5, color: "#8eaac8", maxWidth: 560, lineHeight: 1.7, marginBottom: 20 }}>
            Learn how customer promise failures emerge across systems, warehouse operations, transport execution and KPI logic. Every scenario follows the same 5-section diagnostic framework.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SECTION_TABS.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20 }}>
                <span style={{ fontSize: 12 }}>{t.icon}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Active Scenarios — {active.length}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {active.map(sc => (
            <div key={sc.id} onClick={() => setActiveScenario(sc.id)}
              style={{ background: T.surface, border: `1px solid ${sc.severity === "high" ? T.redBorder : T.amberBorder}`, borderRadius: "var(--radius-lg)", padding: 20, cursor: "pointer", transition: "all 0.2s", position: "relative" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ position: "absolute", top: 12, right: 12 }}>
                <Chip label={sc.severity === "high" ? "HIGH IMPACT" : "MEDIUM IMPACT"} color={sc.severity === "high" ? "red" : "amber"} />
              </div>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{sc.icon}</div>
              <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>{sc.category}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay, marginBottom: 4 }}>{sc.title}</div>
              <div style={{ fontSize: 12, color: T.textMed, marginBottom: 12, lineHeight: 1.5 }}>{sc.desc}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                {sc.tags.map(t => <Chip key={t} label={t} color="gray" />)}
              </div>
              <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                {SECTION_TABS.map(tab => (
                  <div key={tab.id} style={{ flex: 1, height: 3, borderRadius: 2, background: `${tab.color}44` }} />
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: sc.severity === "high" ? T.red : T.amber, display: "flex", alignItems: "center", gap: 4 }}>Investigate →</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Coming Soon — {soon.length}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {soon.map(sc => (
            <div key={sc.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "var(--radius-lg)", padding: 16, opacity: 0.55, position: "relative" }}>
              <div style={{ position: "absolute", top: 10, right: 10 }}><Chip label="SOON" color="gray" /></div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{sc.icon}</div>
              <div style={{ fontSize: 10, color: T.textXLight, fontFamily: T.fontMono, textTransform: "uppercase", marginBottom: 3 }}>{sc.category}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>{sc.title}</div>
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 4, lineHeight: 1.5 }}>{sc.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// KPI UNDERSTANDING MODULE
// ═══════════════════════════════════════════════════════

// ── Shared bracket timeline component ──────────────────
function KpiBracketChart({ anchors, bars, title, subtitle, dayBands, cutoffPos, departurePos }) {
  const TOTAL = anchors.length - 1;
  const toP = (pos) => `${(pos / TOTAL) * 100}%`;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.borderMid}`, borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 11, color: T.textLight, marginBottom: 14, lineHeight: 1.6 }}>{subtitle}</div>}

      {/* ── Day band header (if provided) ── */}
      {dayBands && (
        <div style={{ position: "relative", height: 20, marginBottom: 0, borderRadius: "6px 6px 0 0", overflow: "hidden", display: "flex" }}>
          {dayBands.map((d, i) => {
            const w = ((d.to - d.from) / TOTAL) * 100;
            return (
              <div key={i} style={{ width: `${w}%`, background: d.bg, border: `1px solid ${d.border}`, borderRight: i < dayBands.length - 1 ? "none" : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: d.color }} />
                <span style={{ fontSize: 8, fontWeight: 800, color: d.color, fontFamily: T.fontMono, letterSpacing: "0.5px" }}>{d.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Anchor dot row ── */}
      <div style={{ position: "relative", height: 52, marginBottom: 0 }}>
        {/* Day band backgrounds behind anchors */}
        {dayBands && dayBands.map((d, i) => (
          <div key={i} style={{ position: "absolute", left: toP(d.from), top: 0, bottom: 0, width: `${((d.to - d.from) / TOTAL) * 100}%`, background: d.bgLight, borderLeft: i > 0 ? `2px dashed rgba(148,163,184,0.4)` : undefined }} />
        ))}
        {anchors.map((a, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i / TOTAL) * 100}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, zIndex: 2 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.col, border: "2px solid white", boxShadow: `0 0 0 2px ${a.col}44` }} />
            <div style={{ fontSize: 8, fontFamily: T.fontMono, fontWeight: 700, color: a.col, textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{a.label}</div>
            <div style={{ fontSize: 7, color: T.textXLight, fontFamily: T.fontMono, textAlign: "center" }}>{a.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Spine + threshold markers ── */}
      <div style={{ position: "relative", height: cutoffPos || departurePos ? 28 : 8, marginBottom: 16 }}>
        {/* Day band backgrounds on spine */}
        {dayBands && dayBands.map((d, i) => (
          <div key={i} style={{ position: "absolute", left: toP(d.from), top: 0, bottom: 0, width: `${((d.to - d.from) / TOTAL) * 100}%`, background: d.bgLight }} />
        ))}
        {/* Spine line */}
        <div style={{ position: "absolute", top: 13, left: 0, right: 0, height: 2, background: T.borderMid, borderRadius: 1 }} />
        {anchors.map((a, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i / TOTAL) * 100}%`, top: 8, width: 10, height: 10, borderRadius: "50%", background: a.col, transform: "translateX(-50%)", border: "2px solid white", zIndex: 2 }} />
        ))}
        {/* 14:00 cutoff */}
        {cutoffPos !== undefined && (
          <div style={{ position: "absolute", left: toP(cutoffPos), top: 0, bottom: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 0, borderLeft: "2px solid " + T.amber, height: "100%" }} />
            <div style={{ position: "absolute", bottom: -19, fontSize: 7.5, fontFamily: T.fontMono, color: T.amber, fontWeight: 800, whiteSpace: "nowrap", transform: "translateX(-50%)", background: "#fff8e1", padding: "2px 5px", border: `1px solid ${T.amberBorder}`, borderRadius: 4 }}>⏰ 14:00</div>
          </div>
        )}
        {/* 18:00 departure */}
        {departurePos !== undefined && (
          <div style={{ position: "absolute", left: toP(departurePos), top: 0, bottom: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 0, borderLeft: "2px solid #e65100", height: "100%" }} />
            <div style={{ position: "absolute", bottom: -19, fontSize: 7.5, fontFamily: T.fontMono, color: "#e65100", fontWeight: 800, whiteSpace: "nowrap", transform: "translateX(-50%)", background: "#fff3e0", padding: "2px 5px", border: "1px solid #e6510044", borderRadius: 4 }}>🚛 18:00</div>
          </div>
        )}
      </div>

      {/* Spacer when markers shown */}
      {(cutoffPos !== undefined || departurePos !== undefined) && <div style={{ height: 14 }} />}

      {/* ── KPI bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {bars.map((bar, bi) => {
          const isOuter = bar.outer;
          const lp = (bar.startPos / TOTAL) * 100;
          const wp = Math.min(((bar.endPos - bar.startPos) / TOTAL) * 100, 100 - lp);
          const statusCol = bar.status === "green" ? T.green : bar.status === "red" ? T.red : bar.status === "amber" ? T.amber : bar.color;

          return (
            <div key={bi}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 10, background: `${bar.color}14`, border: `1px solid ${bar.color}44` }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: bar.color }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: bar.color, fontFamily: T.fontMono }}>{bar.id}</span>
                </div>
                <span style={{ fontSize: 11, color: T.textMed }}>{bar.full}</span>
                {bar.status && (
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${statusCol}18`, border: `1px solid ${statusCol}44`, color: statusCol }}>
                    {bar.status === "green" ? "✅ MET" : bar.status === "red" ? "❌ FAILED" : bar.status === "amber" ? "⚠ AT RISK" : ""}
                  </span>
                )}
              </div>

              {isOuter ? (
                <div style={{ position: "relative", height: 30 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 4, bottom: 4, background: `${bar.color}18`, border: `1.5px solid ${bar.color}44`, borderRadius: 6 }} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: bar.color, borderRadius: "4px 0 0 4px" }} />
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: bar.color, borderRadius: "0 4px 4px 0" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: bar.color, fontFamily: T.fontMono }}>{bar.id} — {bar.full}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {bar.plannedEnd !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 48, fontSize: 8, fontFamily: T.fontMono, color: T.textXLight, textAlign: "right", flexShrink: 0 }}>Planned</div>
                      <div style={{ flex: 1, position: "relative", height: 16, background: T.surfaceRaised, borderRadius: 4, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                        {(() => {
                          const plp = (bar.startPos / TOTAL) * 100;
                          const pwp = Math.min(((bar.plannedEnd - bar.startPos) / TOTAL) * 100, 100 - plp);
                          return (
                            <>
                              {plp > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: `${plp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                              <div style={{ position: "absolute", left: `${plp}%`, width: `${pwp}%`, top: 2, bottom: 2, background: `${bar.color}55`, border: `1px dashed ${bar.color}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                <span style={{ fontSize: 8, color: bar.color, fontFamily: T.fontMono, fontWeight: 700, padding: "0 4px", whiteSpace: "nowrap" }}>{bar.plannedLabel}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 48, fontSize: 8, fontFamily: T.fontMono, color: T.textXLight, textAlign: "right", flexShrink: 0 }}>Actual</div>
                    <div style={{ flex: 1, position: "relative", height: 16, background: T.surfaceRaised, borderRadius: 4, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                      {lp > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: `${lp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                      <div style={{ position: "absolute", left: `${lp}%`, width: `${wp}%`, top: 2, bottom: 2, background: statusCol, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 1px 4px ${statusCol}55`, overflow: "hidden" }}>
                        <span style={{ fontSize: 8, color: "white", fontFamily: T.fontMono, fontWeight: 700, padding: "0 4px", whiteSpace: "nowrap" }}>{bar.actualLabel}</span>
                      </div>
                      {lp + wp < 100 && <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, width: `${100 - lp - wp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                    </div>
                  </div>
                </div>
              )}
              {bar.note && <div style={{ fontSize: 10, color: statusCol, fontFamily: T.fontMono, marginTop: 3, marginLeft: 56, fontWeight: 600 }}>{bar.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── KPI status summary row ──────────────────────────────
function KpiStatusRow({ kpis }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      {kpis.map(k => {
        const col = k.status === "green" ? T.green : k.status === "red" ? T.red : k.status === "amber" ? T.amber : T.textMed;
        const bg  = k.status === "green" ? T.greenLight : k.status === "red" ? T.redLight : k.status === "amber" ? T.amberLight : T.surfaceRaised;
        const brd = k.status === "green" ? T.greenBorder : k.status === "red" ? T.redBorder : k.status === "amber" ? T.amberBorder : T.border;
        const icon = k.status === "green" ? "✅" : k.status === "red" ? "❌" : k.status === "amber" ? "⚠️" : "–";
        return (
          <div key={k.id} style={{ background: bg, border: `2px solid ${brd}`, borderRadius: "var(--radius-md)", padding: "8px 12px", minWidth: 90 }}>
            <div style={{ fontSize: 11, fontWeight: 800, fontFamily: T.fontMono, color: col, marginBottom: 2 }}>{k.id}</div>
            <div style={{ fontSize: 9, color: T.textLight, fontFamily: T.fontMono, marginBottom: 4 }}>{k.full}</div>
            <div style={{ fontSize: 14 }}>{icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: col, marginTop: 2 }}>{k.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Individual scenario page ────────────────────────────
function KpiScenario({ scenario, onBack }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.textLight, fontSize: 12, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>← Back to KPI Overview</button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20, padding: "16px 20px", background: T.surface, border: `1px solid ${T.border}`, borderLeft: `4px solid ${scenario.color}`, borderRadius: "var(--radius-lg)" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${scenario.color}18`, border: `1px solid ${scenario.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{scenario.icon}</div>
        <div>
          <div style={{ fontSize: 10, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>Failure Scenario</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>{scenario.title}</div>
          <div style={{ fontSize: 12, color: T.textMed, marginTop: 3, lineHeight: 1.5 }}>{scenario.desc}</div>
        </div>
      </div>

      {/* What happened */}
      <Card style={{ border: `1px solid ${T.border}`, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>📋 What Happened</div>
        {scenario.events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: i < scenario.events.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div style={{ fontSize: 9, fontFamily: T.fontMono, color: T.textXLight, width: 70, flexShrink: 0, marginTop: 2 }}>{e.time}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: e.warn ? T.red : T.text }}>{e.title}</div>
              {e.sub && <div style={{ fontSize: 11, color: T.textMed, marginTop: 2 }}>{e.sub}</div>}
            </div>
          </div>
        ))}
      </Card>

      {/* KPI Status */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>KPI Result</div>
      <KpiStatusRow kpis={scenario.kpis} />

      {/* Timeline chart */}
      <KpiBracketChart
        anchors={scenario.chart.anchors}
        bars={scenario.chart.bars}
        title="KPI Measurement Windows — Planned vs. Actual"
        subtitle={scenario.chart.subtitle}
        dayBands={scenario.chart.dayBands}
        cutoffPos={scenario.chart.cutoffPos}
        departurePos={scenario.chart.departurePos}
      />

      {/* Key insight */}
      <div style={{ padding: "12px 16px", background: T.blueLight, border: `1px solid ${T.blueSoft}`, borderLeft: `4px solid ${T.blue}`, borderRadius: "var(--radius-md)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Key Learning</div>
        <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.75 }}>{scenario.insight}</div>
      </div>
    </div>
  );
}

// ── KPI Understanding Module ────────────────────────────
function KpiUnderstandingModule() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  // ── KPI definitions ──────────────────────────────────
  const KPI_CARDS = [
    {
      id: "CPA",
      full: "Customer Product Availability",
      icon: "📦",
      color: T.green,
      window: "Material Availability Date — physical goods arrival scan",
      desc: "Measures whether the product is physically available in the warehouse by the planned material availability date. Green = goods arrived on time. Does not check pickability.",
      slaNote: "SLA: goods must be physically present and scanned by the Material Availability Date.",
    },
    {
      id: "SDPA",
      full: "Same Day Put-Away",
      icon: "🏷️",
      color: "#0097a7",
      window: "Inbound scan → 23:59 on Material Availability Date",
      desc: "Measures whether inbound goods are put away to the pick location within the same calendar day as arrival. Current SLA: until 23:59 — but the operational cutoff for Next Day orders is 14:00.",
      slaNote: "SLA: putaway completed by 23:59 on the Material Availability Date. ⚠ Process gap: Next Day orders require putaway by 14:00.",
    },
    {
      id: "WSP",
      full: "Warehouse Shipping Performance",
      icon: "🚛",
      color: "#7c3aed",
      window: "Outbound delivery document creation → Planned PGI date",
      desc: "Measures warehouse execution from delivery document creation to the actual goods issue (PGI) scan. Covers pick, pack, stage, and load. Does not see what happens after the truck departs.",
      slaNote: "SLA: PGI must be posted by the planned PGI date/time.",
    },
    {
      id: "CTE",
      full: "Customer Transport Experience",
      icon: "🚚",
      color: "#e65100",
      window: "Carrier departure scan → Successful delivery scan (POD)",
      desc: "Measures the transport leg only — from the moment the truck departs the warehouse until confirmed delivery at the customer address. Blind to everything upstream.",
      slaNote: "SLA: delivery within the service level window (Standard: 23:59 next day, Express: 23:59, Time Option: 10:00 AM).",
    },
  ];

  // ── Scenario definitions ─────────────────────────────

  // Anchors used across scenarios
  // 0=MatAvailDate  1=InboundScan  2=PutAway  3=DelDocCreated  4=PGI  5=Departure  6=POD
  const ALL_ANCHORS = [
    { label: "Material\nAvail. Date", sub: "Day 0",     col: T.green },
    { label: "Inbound\nScan",        sub: "Day 0",     col: T.green },
    { label: "Put-Away\nComplete",   sub: "Day 0",     col: "#0097a7" },
    { label: "Del. Doc\nCreated",    sub: "Day 1",     col: "#7c3aed" },
    { label: "PGI\nScan",            sub: "Day 1",     col: "#7c3aed" },
    { label: "Carrier\nDeparture",   sub: "Day 1",     col: "#e65100" },
    { label: "POD\nDelivery",        sub: "Day 2",     col: T.blue },
  ];

  // ── SCENARIO A: CPA fails — truck arrives late ────────
  const SCENARIO_CPA = {
    id: "cpa_fail",
    kpiId: "CPA",
    title: "CPA Failure — Inbound Truck Arrives One Day Late",
    icon: "📦",
    color: T.green,
    desc: "Material Availability Date is Day 0. The supplier truck arrives on Day 1 instead — one day late. CPA fails immediately. The entire downstream chain is shifted.",
    events: [
      { time: "Day 0 · 00:00", title: "Material Availability Date — goods expected today", sub: "Customer order is waiting. Downstream planning assumes stock arrives." },
      { time: "Day 0 · 18:00", title: "⛔ Truck does not arrive", sub: "Inbound dock closed. No goods. CPA SLA window ends at midnight.", warn: true },
      { time: "Day 0 · 23:59", title: "CPA SLA expires — no inbound scan", sub: "CPA is now red. No putaway, no delivery document, no shipment possible today.", warn: true },
      { time: "Day 1 · 09:30", title: "Truck arrives — one day late", sub: "Inbound scan completed. Putaway by 11:00. Delivery doc created. PGI same day." },
      { time: "Day 1 · 18:00", title: "Carrier departs — one day late", sub: "Everything from here is one day behind the original plan." },
      { time: "Day 3 · 12:00", title: "Delivery — one day late", sub: "Customer receives goods one day after the promised date. OTIF fails." },
    ],
    kpis: [
      { id: "CPA",  full: "Customer Product Availability", status: "red",   label: "Truck +1 day late" },
      { id: "SDPA", full: "Same Day Put-Away",             status: "green", label: "Putaway same day" },
      { id: "WSP",  full: "Warehouse Shipping Performance",status: "green", label: "PGI on time" },
      { id: "CTE",  full: "Customer Transport Experience", status: "green", label: "Carrier on time" },
      { id: "OTIF", full: "On Time In Full",               status: "red",   label: "1 day late" },
    ],
    chart: {
      subtitle: "CPA fails on Day 0. Everything downstream shifts by one day. WSP, SDPA and CTE execute correctly within their own windows — but OTIF is red.",
      
        dayBands: [
          { from: 0, to: 0.7, label: "DAY 0",  color: T.green,    bg: "rgba(34,197,94,0.10)",  bgLight: "rgba(34,197,94,0.04)",  border: "rgba(34,197,94,0.2)"   },
          { from: 0.7, to: 4.5, label: "DAY 1",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", bgLight: "rgba(124,58,237,0.03)", border: "rgba(124,58,237,0.18)" },
          { from: 4.5, to: 5, label: "DAY 2+", color: T.blue,    bg: "rgba(59,130,246,0.08)", bgLight: "rgba(59,130,246,0.03)", border: "rgba(59,130,246,0.18)" },
        ],
        departurePos: 4,
        anchors: [
        { label: "Mat. Avail.\nDate", sub: "Day 0", col: T.red },
        { label: "Inbound\nScan",    sub: "Day 1 09:30", col: T.green },
        { label: "PutAway\nDone",    sub: "Day 1 11:00", col: "#0097a7" },
        { label: "PGI\nScan",        sub: "Day 1 17:00", col: "#7c3aed" },
        { label: "Departure",        sub: "Day 1 18:00", col: "#e65100" },
        { label: "POD\nDelivery",    sub: "Day 3 12:00", col: T.red },
      ],
      bars: [
        { id: "OTIF", full: "On Time In Full", color: T.blue,    outer: true, startPos: 0, endPos: 5, status: "red" },
        { id: "CPA",  full: "Customer Product Availability", color: T.green,   startPos: 0, endPos: 0.05, plannedEnd: 1, status: "red",   plannedLabel: "→ Day 0 23:59", actualLabel: "No scan Day 0 ❌", note: "❌ Goods arrived Day 1 — CPA SLA missed by 1 full day" },
        { id: "SDPA", full: "Same Day Put-Away",  color: "#0097a7", startPos: 1, endPos: 2, plannedEnd: 2.5, status: "green", plannedLabel: "→ 23:59 Day 1",   actualLabel: "Putaway 11:00 ✓", note: "✅ Put-away completed same day as arrival" },
        { id: "WSP",  full: "Warehouse Shipping Performance",  color: "#7c3aed", startPos: 2, endPos: 3, plannedEnd: 3.5, status: "green", plannedLabel: "→ PGI Day 1",     actualLabel: "PGI 17:00 ✓",   note: "✅ PGI on time — warehouse executed correctly" },
        { id: "CTE",  full: "Customer Transport Experience", color: "#e65100", startPos: 4, endPos: 5, plannedEnd: 5,   status: "green", plannedLabel: "→ POD Day 2",     actualLabel: "POD Day 3 12:00 ❌", note: "❌ CTE window correct but OTIF fails — delivery is 1 day behind plan" },
      ],
    },
    insight: "CPA is the root failure. The truck was one day late — everything else executed correctly. WSP, SDPA and CTE are all green because each KPI only measures its own window. Only OTIF sees the full picture. This is how a single upstream delay creates a customer promise failure while all operational KPIs stay green.",
  };

  // ── SCENARIO B: WSP fails — pick & pack too slow ─────
  const SCENARIO_WSP = {
    id: "wsp_fail",
    kpiId: "WSP",
    title: "WSP Failure — Pick & Pack Exceeds Planned PGI Date",
    icon: "🚛",
    color: "#7c3aed",
    desc: "CPA is green, SDPA is green. But the pick and pack process takes longer than planned — PGI is posted one day after the planned date. The truck departs one day late.",
    events: [
      { time: "Day 0 · 10:00", title: "Goods arrive on time — CPA green", sub: "Inbound scan completed. CPA SLA met." },
      { time: "Day 0 · 13:00", title: "Putaway completed by 13:00 — SDPA green", sub: "Stock at pick location. SDPA SLA met (well within 23:59)." },
      { time: "Day 1 · 08:00", title: "Outbound delivery document created", sub: "WSP clock starts." },
      { time: "Day 1 · 17:00", title: "Planned PGI time — but packing not finished", sub: "High order volume. Pick & pack team running behind. WSP SLA expires.", warn: true },
      { time: "Day 2 · 09:00", title: "⛔ PGI posted — one day late", sub: "Pick & pack completed overnight. Truck loaded Day 2 morning. WSP fails.", warn: true },
      { time: "Day 2 · 10:00", title: "Carrier departs — one day late", sub: "CTE clock starts from here. Transport executes correctly." },
      { time: "Day 3 · 14:00", title: "Delivery — one day late", sub: "Customer receives goods one day after promised. OTIF fails." },
    ],
    kpis: [
      { id: "CPA",  full: "Customer Product Availability", status: "green", label: "Arrived Day 0 ✓" },
      { id: "SDPA", full: "Same Day Put-Away",             status: "green", label: "Putaway 13:00 ✓" },
      { id: "WSP",  full: "Warehouse Shipping Performance",status: "red",   label: "PGI +1 day late" },
      { id: "CTE",  full: "Customer Transport Experience", status: "green", label: "Carrier on time" },
      { id: "OTIF", full: "On Time In Full",               status: "red",   label: "1 day late" },
    ],
    chart: {
      subtitle: "CPA and SDPA are green. WSP is the failure point — PGI is one day late. CTE executes correctly from departure. OTIF is red.",
      
        dayBands: [
          { from: 0, to: 1.7, label: "DAY 0",  color: T.green,    bg: "rgba(34,197,94,0.10)",  bgLight: "rgba(34,197,94,0.04)",  border: "rgba(34,197,94,0.2)"   },
          { from: 1.7, to: 3.8, label: "DAY 1",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", bgLight: "rgba(124,58,237,0.03)", border: "rgba(124,58,237,0.18)" },
          { from: 3.8, to: 6, label: "DAY 2+", color: T.blue,    bg: "rgba(59,130,246,0.08)", bgLight: "rgba(59,130,246,0.03)", border: "rgba(59,130,246,0.18)" },
        ],
        cutoffPos: 1.35,
        departurePos: 5,
        anchors: [
        { label: "Inbound\nScan",  sub: "Day 0 10:00", col: T.green },
        { label: "PutAway\nDone",  sub: "Day 0 13:00", col: "#0097a7" },
        { label: "Del. Doc",       sub: "Day 1 08:00", col: "#7c3aed" },
        { label: "Planned\nPGI",   sub: "Day 1 17:00", col: T.red },
        { label: "Actual\nPGI",    sub: "Day 2 09:00", col: T.red },
        { label: "Departure",      sub: "Day 2 10:00", col: "#e65100" },
        { label: "POD\nDelivery",  sub: "Day 3 14:00", col: T.red },
      ],
      bars: [
        { id: "OTIF", full: "On Time In Full", color: T.blue,    outer: true, startPos: 0, endPos: 6, status: "red" },
        { id: "CPA",  full: "Customer Product Availability", color: T.green,    startPos: 0, endPos: 0.5, plannedEnd: 1.5, status: "green", plannedLabel: "→ Day 0 23:59", actualLabel: "Arrived Day 0 ✓", note: "✅ Goods on time — CPA met" },
        { id: "SDPA", full: "Same Day Put-Away",  color: "#0097a7",  startPos: 0, endPos: 1, plannedEnd: 1.5, status: "green", plannedLabel: "→ 23:59 Day 0",   actualLabel: "Putaway 13:00 ✓", note: "✅ Same-day putaway completed — SDPA met" },
        { id: "WSP",  full: "Warehouse Shipping Performance",  color: "#7c3aed",  startPos: 2, endPos: 4, plannedEnd: 3, status: "red",   plannedLabel: "→ PGI Day 1 17:00", actualLabel: "PGI Day 2 09:00 ❌", note: "❌ Pick & pack overran — PGI posted 1 day late. WSP SLA breached." },
        { id: "CTE",  full: "Customer Transport Experience", color: "#e65100",  startPos: 5, endPos: 6, plannedEnd: 6, status: "green", plannedLabel: "→ POD Day 2",     actualLabel: "POD Day 3 ✓ (vs plan)", note: "✅ Carrier delivered correctly from departure — CTE met its own window" },
      ],
    },
    insight: "WSP is the failure here. CPA and SDPA both executed on time. The warehouse itself — pick & pack — was too slow. CTE is green because the carrier performed correctly from the moment the truck left. Only OTIF exposes the real customer impact. This demonstrates how a failure inside one system window can be invisible to adjacent KPIs.",
  };

  // ── SCENARIO C: SDPA fails — putaway at 15:30 ────────
  const SCENARIO_SDPA = {
    id: "sdpa_fail",
    kpiId: "SDPA",
    title: "SDPA Process Gap — Putaway at 15:30, Loading Missed",
    icon: "🏷️",
    color: "#0097a7",
    desc: "Truck arrives early. CPA is green. But putaway completes at 15:30 — past the 14:00 Next Day order cutoff. The outbound process cannot complete before 18:00 departure. SDPA shows green (23:59 SLA met) but the process has already failed.",
    events: [
      { time: "Day 0 · 11:00", title: "Truck arrives — CPA green", sub: "Goods physically present. CPA SLA met." },
      { time: "Day 0 · 11:15", title: "Inbound scan completed", sub: "EWM status: IN INBOUND AREA. Not yet at pick location." },
      { time: "Day 0 · 13:00", title: "Customer places Next Day order", sub: "ATP sees physical stock and confirms Next Day promise." },
      { time: "Day 0 · 14:00", title: "⛔ Next Day order cutoff passes — putaway still pending", sub: "Article still in inbound area. Pick & pack cannot start.", warn: true },
      { time: "Day 0 · 15:30", title: "Putaway completed — but too late", sub: "SDPA SLA: ✅ green (23:59 not breached). Process reality: loading cannot complete before 18:00.", warn: true },
      { time: "Day 0 · 18:00", title: "Truck departs WITHOUT shipment", sub: "Pick, pack, stage chain could not complete in 2.5h. Shipment missed.", warn: true },
      { time: "Day 1 · 18:00", title: "Loaded onto next day's truck", sub: "Departure 24h late. CTE starts from here." },
      { time: "Day 2 · 14:00", title: "Delivery — one day late", sub: "OTIF fails. But SDPA reported green." },
    ],
    kpis: [
      { id: "CPA",  full: "Customer Product Availability", status: "green", label: "Arrived Day 0 ✓" },
      { id: "SDPA", full: "Same Day Put-Away",             status: "green", label: "23:59 SLA ✓ — but process failed", },
      { id: "WSP",  full: "Warehouse Shipping Performance",status: "red",   label: "Loading missed Day 0" },
      { id: "CTE",  full: "Customer Transport Experience", status: "green", label: "Carrier on time Day 1" },
      { id: "OTIF", full: "On Time In Full",               status: "red",   label: "1 day late" },
    ],
    chart: {
      subtitle: "SDPA shows green (23:59 SLA met). But putaway at 15:30 is past the 14:00 Next Day cutoff — WSP cannot complete. This is the SDPA process gap: the SLA is too lenient for Next Day articles.",
      
        dayBands: [
          { from: 0, to: 4.5, label: "DAY 0",  color: T.green,    bg: "rgba(34,197,94,0.10)",  bgLight: "rgba(34,197,94,0.04)",  border: "rgba(34,197,94,0.2)"   },
          { from: 4.5, to: 5.5, label: "DAY 1",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", bgLight: "rgba(124,58,237,0.03)", border: "rgba(124,58,237,0.18)" },
          { from: 5.5, to: 6, label: "DAY 2+", color: T.blue,    bg: "rgba(59,130,246,0.08)", bgLight: "rgba(59,130,246,0.03)", border: "rgba(59,130,246,0.18)" },
        ],
        cutoffPos: 2,
        departurePos: 4,
        anchors: [
        { label: "Inbound\nScan",    sub: "Day 0 11:15",  col: T.green },
        { label: "Order\nPlaced",    sub: "Day 0 13:00",  col: T.blue },
        { label: "14:00\nCutoff",    sub: "Day 0 14:00",  col: T.red },
        { label: "PutAway\n15:30",   sub: "Day 0 15:30",  col: T.amber },
        { label: "Truck\n18:00",     sub: "Day 0 — missed", col: T.red },
        { label: "Next\nDeparture",  sub: "Day 1 18:00",  col: "#e65100" },
        { label: "POD\nDay 2",       sub: "Day 2 14:00",  col: T.red },
      ],
      bars: [
        { id: "OTIF", full: "On Time In Full", color: T.blue, outer: true, startPos: 0, endPos: 6, status: "red" },
        { id: "CPA",  full: "Customer Product Availability", color: T.green,    startPos: 0, endPos: 0.5, plannedEnd: 1, status: "green", plannedLabel: "→ Day 0 23:59", actualLabel: "Scan 11:15 ✓",    note: "✅ CPA met — goods arrived on time" },
        { id: "SDPA", full: "Same Day Put-Away (23:59 SLA)", color: "#0097a7",  startPos: 0, endPos: 3, plannedEnd: 4, status: "green", plannedLabel: "→ 23:59 SLA",    actualLabel: "15:30 — green ✅ by SLA, ❌ by process", note: "⚠ SDPA SLA is green but Next Day cutoff (14:00) was already missed at 15:30" },
        { id: "WSP",  full: "Warehouse Shipping Performance", color: "#7c3aed", startPos: 3, endPos: 4, plannedEnd: 4, status: "red",   plannedLabel: "→ PGI Day 0 18:00", actualLabel: "PGI Day 1 ❌",  note: "❌ Loading missed — WSP fails. Shipment loaded next day." },
        { id: "CTE",  full: "Customer Transport Experience", color: "#e65100",  startPos: 5, endPos: 6, plannedEnd: 6, status: "green", plannedLabel: "→ POD Day 2",     actualLabel: "POD Day 2 ✓",    note: "✅ Carrier delivered correctly from Day 1 departure — CTE green" },
      ],
    },
    insight: "This is the SDPA process gap. The current 23:59 SLA reports green — putaway was done by 15:30, well within the day. But the Next Day order cutoff was 14:00. The 1.5h difference between the real operational requirement and the KPI SLA creates an invisible failure zone. WSP and OTIF turn red, but SDPA never warns. To fix this, SDPA for Next Day articles must be measured against 14:00, not 23:59.",
  };

  // ── SCENARIO D: CTE fails, OTIF green ────────────────
  const SCENARIO_CTE_ONLY = {
    id: "cte_only",
    kpiId: "CTE",
    title: "CTE Fails, OTIF Stays Green — Extended Service Level",
    icon: "🚚",
    color: "#e65100",
    desc: "Standard delivery where the customer has a 2-day SLA. The carrier delivers on Day 3 instead of Day 2 — CTE is red. But the customer SLA is 2 days from departure, so Day 3 is still within the OTIF window. OTIF stays green.",
    events: [
      { time: "Day 0 · 10:00", title: "Goods arrive — CPA green", sub: "On time. All upstream KPIs will be met." },
      { time: "Day 0 · 13:00", title: "Putaway completed — SDPA green", sub: "Same day putaway. No issues." },
      { time: "Day 1 · 08:00", title: "Delivery document created, pick & pack", sub: "WSP clock starts." },
      { time: "Day 1 · 16:00", title: "PGI posted — WSP green", sub: "On time goods issue. Carrier departs. CTE clock starts." },
      { time: "Day 2 · 09:00", title: "⛔ Carrier hub delay — one day behind", sub: "Shipment held at regional hub overnight. CTE SLA (same-day delivery) breached.", warn: true },
      { time: "Day 3 · 11:00", title: "Delivery on Day 3", sub: "One day late vs. carrier SLA. But customer SLA is 2 days from departure — Day 3 is still within OTIF window." },
    ],
    kpis: [
      { id: "CPA",  full: "Customer Product Availability", status: "green", label: "On time ✓" },
      { id: "SDPA", full: "Same Day Put-Away",             status: "green", label: "Putaway 13:00 ✓" },
      { id: "WSP",  full: "Warehouse Shipping Performance",status: "green", label: "PGI 16:00 ✓" },
      { id: "CTE",  full: "Customer Transport Experience", status: "red",   label: "Hub delay +1 day" },
      { id: "OTIF", full: "On Time In Full",               status: "green", label: "Within 2-day SLA ✓" },
    ],
    chart: {
      subtitle: "All upstream KPIs are green. CTE fails — hub delay pushed delivery to Day 3. But OTIF is still green because the customer SLA is 2 days from departure. A sub-KPI can be red while OTIF stays green.",
      
        dayBands: [
          { from: 0, to: 1.7, label: "DAY 0",  color: T.green,    bg: "rgba(34,197,94,0.10)",  bgLight: "rgba(34,197,94,0.04)",  border: "rgba(34,197,94,0.2)"   },
          { from: 1.7, to: 3.5, label: "DAY 1",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", bgLight: "rgba(124,58,237,0.03)", border: "rgba(124,58,237,0.18)" },
          { from: 3.5, to: 6, label: "DAY 2+", color: T.blue,    bg: "rgba(59,130,246,0.08)", bgLight: "rgba(59,130,246,0.03)", border: "rgba(59,130,246,0.18)" },
        ],
        cutoffPos: 1.35,
        departurePos: 3,
        anchors: [
        { label: "Inbound\nScan",  sub: "Day 0 10:00", col: T.green },
        { label: "PutAway",        sub: "Day 0 13:00", col: "#0097a7" },
        { label: "PGI\nScan",      sub: "Day 1 16:00", col: "#7c3aed" },
        { label: "Departure",      sub: "Day 1 16:00", col: "#e65100" },
        { label: "CTE SLA\nDay 2", sub: "Day 2 23:59", col: T.red },
        { label: "OTIF SLA\nDay 3", sub: "Day 3 23:59", col: T.green },
        { label: "POD\nDay 3",     sub: "Day 3 11:00", col: T.green },
      ],
      bars: [
        { id: "OTIF", full: "On Time In Full (2-day SLA from departure)", color: T.blue, outer: true, startPos: 0, endPos: 6, status: "green" },
        { id: "CPA",  full: "Customer Product Availability", color: T.green,    startPos: 0, endPos: 0.5, plannedEnd: 1,  status: "green", plannedLabel: "→ Day 0 23:59", actualLabel: "Day 0 10:00 ✓", note: "✅ On time" },
        { id: "SDPA", full: "Same Day Put-Away", color: "#0097a7", startPos: 0, endPos: 1, plannedEnd: 1.5, status: "green", plannedLabel: "→ 23:59 Day 0", actualLabel: "13:00 ✓", note: "✅ On time" },
        { id: "WSP",  full: "Warehouse Shipping Performance", color: "#7c3aed", startPos: 1, endPos: 2, plannedEnd: 2.5, status: "green", plannedLabel: "→ PGI Day 1",   actualLabel: "PGI 16:00 ✓", note: "✅ On time" },
        { id: "CTE",  full: "Customer Transport Experience (1-day SLA)", color: "#e65100", startPos: 3, endPos: 6, plannedEnd: 4, status: "red", plannedLabel: "→ Day 2 23:59 (CTE SLA)", actualLabel: "POD Day 3 ❌ vs CTE", note: "❌ CTE SLA breached — hub delay caused Day 3 delivery vs Day 2 target" },
      ],
    },
    insight: "This scenario shows that OTIF and CTE measure different things. CTE is the carrier's own performance SLA — it expects next-day delivery from departure. OTIF is the customer-facing promise — here a 2-day window. A carrier delay of one day breaches CTE but still satisfies OTIF. This is how a sub-KPI can turn red while the customer promise is technically kept. Understanding which KPI represents which promise is critical for correct root cause analysis.",
  };

  // ── SCENARIO E: WSP blind — PGI after carrier departure ─
  const SCENARIO_WSP_BLIND = {
    id: "wsp_blind",
    kpiId: "WSP",
    title: "KPI Measurement Error — PGI Scanned After Carrier Departure",
    icon: "⚠️",
    color: "#7c3aed",
    desc: "All upstream KPIs are green. The PGI scan is posted at 18:30 — after the carrier truck departed at 18:00. WSP measures Del. Doc → PGI and reports green (PGI was within the same day). CTE only starts from departure — and the truck was already loaded. But the shipment departs without a valid PGI. OTIF fails. This is a KPI measurement gap in the current logic.",
    events: [
      { time: "Day 0 · 09:00", title: "Goods arrive — CPA green", sub: "Inbound scan complete. CPA met." },
      { time: "Day 0 · 12:00", title: "Putaway — SDPA green", sub: "Putaway same day before 14:00. SDPA met." },
      { time: "Day 1 · 08:00", title: "Delivery document created", sub: "WSP clock starts." },
      { time: "Day 1 · 17:45", title: "Pick & pack complete — staged at gate", sub: "Ready to load. Shipment at loading dock." },
      { time: "Day 1 · 18:00", title: "Carrier truck departs — shipment on board", sub: "Truck leaves with the shipment physically loaded. CTE clock should start." },
      { time: "Day 1 · 18:30", title: "⛔ PGI scan posted — 30 minutes after departure", sub: "SAP Goods Issue is posted 30 minutes late. WSP clock ends here — still same day, still green.", warn: true },
      { time: "Day 2 · 14:00", title: "⛔ Delivery arrives — OTIF fails", sub: "Carrier delivered correctly. But SAP has no valid PGI before departure → delivery confirmation logic is broken. OTIF is measured from order creation to POD, and the PGI timestamp mismatch causes an OTIF violation.", warn: true },
    ],
    kpis: [
      { id: "CPA",  full: "Customer Product Availability", status: "green", label: "Arrived Day 0 ✓" },
      { id: "SDPA", full: "Same Day Put-Away",             status: "green", label: "Putaway 12:00 ✓" },
      { id: "WSP",  full: "Warehouse Shipping Performance",status: "green", label: "PGI Day 1 18:30 ✓ by SLA" },
      { id: "CTE",  full: "Customer Transport Experience", status: "green", label: "Carrier delivered on time" },
      { id: "OTIF", full: "On Time In Full",               status: "red",   label: "PGI after departure ❌" },
    ],
    chart: {
      subtitle: "Every sub-KPI reports green. OTIF is red. The PGI was posted 30 minutes after the truck departed — WSP doesn't detect this because it only checks the PGI timestamp, not whether it preceded the departure. This is a measurement gap: WSP should require PGI before departure, not just PGI within the same day.",
      
        dayBands: [
          { from: 0, to: 1.7, label: "DAY 0",  color: T.green,    bg: "rgba(34,197,94,0.10)",  bgLight: "rgba(34,197,94,0.04)",  border: "rgba(34,197,94,0.2)"   },
          { from: 1.7, to: 4.6, label: "DAY 1",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", bgLight: "rgba(124,58,237,0.03)", border: "rgba(124,58,237,0.18)" },
          { from: 4.6, to: 5, label: "DAY 2+", color: T.blue,    bg: "rgba(59,130,246,0.08)", bgLight: "rgba(59,130,246,0.03)", border: "rgba(59,130,246,0.18)" },
        ],
        cutoffPos: 1.35,
        departurePos: 3,
        anchors: [
        { label: "Inbound\nScan",    sub: "Day 0 09:00", col: T.green },
        { label: "PutAway\nDone",    sub: "Day 0 12:00", col: "#0097a7" },
        { label: "Del. Doc",         sub: "Day 1 08:00", col: "#7c3aed" },
        { label: "Carrier\nDeparts", sub: "Day 1 18:00", col: "#e65100" },
        { label: "PGI Scan\n18:30 ⚠", sub: "AFTER truck",col: T.red },
        { label: "POD\nDelivery",    sub: "Day 2 14:00", col: T.red },
      ],
      bars: [
        { id: "OTIF", full: "On Time In Full", color: T.blue, outer: true, startPos: 0, endPos: 5, status: "red" },
        { id: "CPA",  full: "Customer Product Availability", color: T.green,   startPos: 0, endPos: 0.5, plannedEnd: 1, status: "green", plannedLabel: "→ Day 0 23:59", actualLabel: "Day 0 09:00 ✓", note: "✅ Green" },
        { id: "SDPA", full: "Same Day Put-Away", color: "#0097a7", startPos: 0, endPos: 1, plannedEnd: 1.5, status: "green", plannedLabel: "→ 23:59 Day 0", actualLabel: "12:00 ✓", note: "✅ Green" },
        { id: "WSP",  full: "Warehouse Shipping Performance — measures Del.Doc→PGI only", color: "#7c3aed", startPos: 2, endPos: 4, plannedEnd: 3.5, status: "green", plannedLabel: "→ PGI same day", actualLabel: "PGI 18:30 ✓ by WSP ⚠", note: "⚠ WSP green — PGI was same day. But PGI came 30 min AFTER the truck departed. WSP does not detect this." },
        { id: "CTE",  full: "Customer Transport Experience — starts from departure", color: "#e65100", startPos: 3, endPos: 5, plannedEnd: 5, status: "green", plannedLabel: "→ POD Day 2", actualLabel: "POD Day 2 ✓", note: "✅ CTE green — carrier delivered correctly from departure" },
      ],
    },
    insight: "This is a KPI measurement design flaw. WSP measures the time from delivery document creation to PGI scan — but does NOT verify that PGI was posted before carrier departure. A PGI posted 30 minutes after the truck left still reports WSP green. CTE starts from departure and sees a clean transport. Only OTIF reveals the failure. The fix: WSP must require PGI timestamp to precede the planned departure time, not just fall within the same calendar day.",
  };

  const SCENARIOS = [SCENARIO_CPA, SCENARIO_WSP, SCENARIO_SDPA, SCENARIO_CTE_ONLY, SCENARIO_WSP_BLIND];

  // Active scenario view
  if (activeScenario) {
    const sc = SCENARIOS.find(s => s.id === activeScenario);
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
        <div style={{ background: T.navyMid, padding: "0 0 1px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "14px 20px" }}>
            <div style={{ fontSize: 11, color: "#8eaac8", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px" }}>KPI Understanding · Failure Scenario</div>
          </div>
        </div>
        <KpiScenario scenario={sc} onBack={() => setActiveScenario(null)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
      {/* Header */}
      <div style={{ background: T.navyMid, padding: "28px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Module 3</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", fontFamily: T.fontDisplay, marginBottom: 8 }}>KPI Understanding</h1>
          <p style={{ fontSize: 13.5, color: "#8eaac8", maxWidth: 580, lineHeight: 1.7, marginBottom: 16 }}>
            Every KPI measures a different window of the same journey. Understanding where each clock starts and stops — and how they relate — is the foundation of effective logistics diagnostics.
          </p>
          {/* KPI chain visual */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {[["📦 CPA", T.green], ["→", null], ["🏷️ SDPA", "#0097a7"], ["→", null], ["🚛 WSP", "#7c3aed"], ["→", null], ["🚚 CTE", "#e65100"]].map(([label, col], i) => (
              col ? (
                <div key={i} style={{ padding: "4px 10px", borderRadius: 12, background: `${col}22`, border: `1px solid ${col}44`, fontSize: 11, fontWeight: 700, color: col }}>
                  {label}
                </div>
              ) : (
                <div key={i} style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{label}</div>
              )
            ))}
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>→</div>
            <div style={{ padding: "4px 10px", borderRadius: 12, background: `${T.blue}22`, border: `2px solid ${T.blue}66`, fontSize: 11, fontWeight: 800, color: T.blue }}>⬜ OTIF (outer bracket)</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>

        {/* KPI definitions */}
        <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>The Four Measurement Windows</div>

        {/* ── Master timeline — enhanced with day breaks + cutoff/departure markers ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.borderMid}`, borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>KPI Windows — How They Nest Inside OTIF</div>
          <div style={{ fontSize: 11, color: T.textLight, marginBottom: 18, lineHeight: 1.6 }}>
            OTIF is the outer bracket. CPA, SDPA, WSP and CTE are inner windows that hand off to each other across two days. Each KPI window ends exactly where the next begins. The 14:00 cutoff and 18:00 departure are critical operational thresholds within the timeline.
          </div>

          {/* ── 9-anchor timeline ── */}
          {(() => {
            // Anchors — precise times across Day 0 → Day 2
            // pos 0–8, absolute time positions
            const ANCH = [
              { pos: 0,   label: "Material\nAvail. Date",  sub: "Day 0 · 00:00",  col: T.green },
              { pos: 1,   label: "Inbound\nScan",          sub: "Day 0 · 10:00",  col: T.green },
              { pos: 2,   label: "Put-Away\nDone",         sub: "Day 0 · ~13:00", col: "#0097a7" },
              { pos: 3,   label: "Del. Doc\nCreated",      sub: "Day 1 · 08:00",  col: "#7c3aed" },
              { pos: 4,   label: "PGI\nScan",              sub: "Day 1 · 17:00",  col: "#7c3aed" },
              { pos: 5,   label: "Carrier\nDeparture",     sub: "Day 1 · 18:00",  col: "#e65100" },
              { pos: 8,   label: "POD\nDelivery",          sub: "Day 2 · 12:00",  col: T.blue },
            ];
            const TOTAL = 8;

            // Day boundary markers — 23:59 Day 0 and 23:59 Day 1
            const DAY_BREAKS = [
              { pos: 2.9, label: "23:59\nDay 0", col: "#94a3b8" },
              { pos: 6,   label: "23:59\nDay 1", col: "#94a3b8" },
            ];

            const toL = (pos) => `${(pos / TOTAL) * 100}%`;

            // Threshold markers — visually distinct from anchors
            const CUTOFF_POS    = 2.35;  // 14:00 — clearly after Put-Away (2.0), well before 23:59 (2.9)
            const DEPARTURE_POS = 5.0;   // 18:00 — exactly on Carrier Departure anchor

            // Day band widths
            const DAY0_W = `${(2.9 / TOTAL) * 100}%`;
            const DAY1_W = `${((6 - 2.9) / TOTAL) * 100}%`;
            const DAY2_W = `${((8 - 6) / TOTAL) * 100}%`;
            const DAY1_L = `${(2.9 / TOTAL) * 100}%`;
            const DAY2_L = `${(6 / TOTAL) * 100}%`;

            const KPI_BARS = [
              { id: "OTIF", full: "On Time In Full",                color: T.blue,     outer: true, startPos: 0, endPos: 8 },
              { id: "CPA",  full: "Customer Product Availability",  color: T.green,    startPos: 0,   endPos: 2,   plannedLabel: "→ 23:59 Day 0",         actualLabel: "Inbound scan ✓" },
              { id: "SDPA", full: "Same Day Put-Away",              color: "#0097a7",  startPos: 1,   endPos: 2,   plannedLabel: "→ 23:59 (⚠ should 14:00)", actualLabel: "Putaway ~13:00 ✓" },
              { id: "WSP",  full: "Warehouse Shipping Performance", color: "#7c3aed",  startPos: 3,   endPos: 5,   plannedLabel: "→ Planned PGI Day 1",    actualLabel: "Del.Doc → PGI ✓" },
              { id: "CTE",  full: "Customer Transport Experience",  color: "#e65100",  startPos: 5,   endPos: 8,   plannedLabel: "→ Service SLA",          actualLabel: "Departure → POD ✓" },
            ];

            return (
              <div>
                {/* ── Day band header row ── */}
                <div style={{ position: "relative", height: 24, marginBottom: 0, borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: DAY0_W, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.2)", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: T.green, fontFamily: T.fontMono, letterSpacing: "0.5px" }}>DAY 0</span>
                  </div>
                  <div style={{ width: DAY1_W, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed" }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#7c3aed", fontFamily: T.fontMono, letterSpacing: "0.5px" }}>DAY 1</span>
                  </div>
                  <div style={{ width: DAY2_W, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: T.blue, fontFamily: T.fontMono, letterSpacing: "0.5px" }}>DAY 2</span>
                  </div>
                </div>

                {/* ── Anchor dot row with colored day backgrounds ── */}
                <div style={{ position: "relative", height: 58, marginBottom: 0 }}>
                  <div style={{ position: "absolute", left: 0,      top: 0, bottom: 0, width: DAY0_W, background: "rgba(34,197,94,0.04)",   borderLeft: "1px solid rgba(34,197,94,0.15)" }} />
                  <div style={{ position: "absolute", left: DAY1_L, top: 0, bottom: 0, width: DAY1_W, background: "rgba(124,58,237,0.04)",  borderLeft: "2px dashed rgba(148,163,184,0.5)" }} />
                  <div style={{ position: "absolute", left: DAY2_L, top: 0, bottom: 0, width: DAY2_W, background: "rgba(59,130,246,0.04)",  borderLeft: "2px dashed rgba(148,163,184,0.5)" }} />

                  {ANCH.map((a, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(a.pos), transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, zIndex: 2 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.col, border: "2px solid white", boxShadow: `0 0 0 2px ${a.col}44`, flexShrink: 0 }} />
                      <div style={{ fontSize: 7.5, fontFamily: T.fontMono, fontWeight: 700, color: a.col, textAlign: "center", lineHeight: 1.25, whiteSpace: "pre-line" }}>{a.label}</div>
                      <div style={{ fontSize: 7, color: T.textXLight, fontFamily: T.fontMono, textAlign: "center", whiteSpace: "nowrap" }}>{a.sub}</div>
                    </div>
                  ))}
                </div>

                {/* ── Spine with special markers ── */}
                <div style={{ position: "relative", height: 28, marginBottom: 14 }}>
                  <div style={{ position: "absolute", left: 0,      top: 0, bottom: 0, width: DAY0_W, background: "rgba(34,197,94,0.04)"  }} />
                  <div style={{ position: "absolute", left: DAY1_L, top: 0, bottom: 0, width: DAY1_W, background: "rgba(124,58,237,0.04)" }} />
                  <div style={{ position: "absolute", left: DAY2_L, top: 0, bottom: 0, width: DAY2_W, background: "rgba(59,130,246,0.04)" }} />

                  {/* Base spine line */}
                  <div style={{ position: "absolute", top: 13, left: 0, right: 0, height: 2, background: T.borderMid, borderRadius: 1 }} />
                  {ANCH.map((a, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(a.pos), top: 8, width: 10, height: 10, borderRadius: "50%", background: a.col, transform: "translateX(-50%)", border: "2px solid white", zIndex: 2 }} />
                  ))}

                  {/* 23:59 day-break dashes */}
                  {DAY_BREAKS.map((db, i) => (
                    <div key={i} style={{ position: "absolute", left: toL(db.pos), top: 0, bottom: 0, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 0, borderLeft: "2px dashed rgba(148,163,184,0.7)", height: "100%" }} />
                      <div style={{ position: "absolute", top: -14, fontSize: 7, fontFamily: T.fontMono, color: "#94a3b8", fontWeight: 700, whiteSpace: "pre-line", transform: "translateX(-50%)", background: T.surface, padding: "1px 3px", lineHeight: 1.3, textAlign: "center", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 3 }}>{db.label}</div>
                    </div>
                  ))}

                  {/* 14:00 Cutoff — amber, pos 2.35, clearly between Put-Away (2.0) and 23:59 (2.9) */}
                  <div style={{ position: "absolute", left: toL(CUTOFF_POS), top: 0, bottom: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 0, borderLeft: "2px solid " + T.amber, height: "100%" }} />
                    <div style={{ position: "absolute", bottom: -19, fontSize: 7.5, fontFamily: T.fontMono, color: T.amber, fontWeight: 800, whiteSpace: "nowrap", transform: "translateX(-50%)", background: "#fff8e1", padding: "2px 5px", border: `1px solid ${T.amberBorder}`, borderRadius: 4 }}>⏰ 14:00 Cutoff</div>
                  </div>

                  {/* 18:00 Departure — pos 5.0, aligned with Carrier Departure anchor */}
                  <div style={{ position: "absolute", left: toL(DEPARTURE_POS), top: 0, bottom: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 0, borderLeft: "2px solid #e65100", height: "100%" }} />
                    <div style={{ position: "absolute", bottom: -19, fontSize: 7.5, fontFamily: T.fontMono, color: "#e65100", fontWeight: 800, whiteSpace: "nowrap", transform: "translateX(-50%)", background: "#fff3e0", padding: "2px 5px", border: "1px solid #e6510044", borderRadius: 4 }}>🚛 18:00 Dep.</div>
                  </div>
                </div>

                {/* spacer for bottom labels */}
                <div style={{ height: 16 }} />

                {/* KPI bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {KPI_BARS.map(bar => {
                    const lp = (bar.startPos / TOTAL) * 100;
                    const wp = Math.min(((bar.endPos - bar.startPos) / TOTAL) * 100, 100 - lp);
                    return (
                      <div key={bar.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 10, background: `${bar.color}14`, border: `1px solid ${bar.color}44` }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: bar.color }} />
                            <span style={{ fontSize: 10, fontWeight: 800, color: bar.color, fontFamily: T.fontMono }}>{bar.id}</span>
                          </div>
                          <span style={{ fontSize: 11, color: T.textMed }}>{bar.full}</span>
                        </div>

                        {bar.outer ? (
                          <div style={{ position: "relative", height: 26 }}>
                            <div style={{ position: "absolute", left: 0, right: 0, top: 3, bottom: 3, background: `${bar.color}14`, border: `1.5px solid ${bar.color}44`, borderRadius: 6 }} />
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: bar.color, borderRadius: "4px 0 0 4px" }} />
                            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: bar.color, borderRadius: "0 4px 4px 0" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: bar.color, fontFamily: T.fontMono }}>OTIF — spans the full journey · Order Created → Requested Delivery Date</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {/* Planned */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 44, fontSize: 7.5, fontFamily: T.fontMono, color: T.textXLight, textAlign: "right", flexShrink: 0 }}>Planned</div>
                              <div style={{ flex: 1, position: "relative", height: 14, background: T.surfaceRaised, borderRadius: 3, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                                {lp > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: `${lp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                                <div style={{ position: "absolute", left: `${lp}%`, width: `${wp}%`, top: 1, bottom: 1, background: `${bar.color}55`, border: `1px dashed ${bar.color}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                  <span style={{ fontSize: 7.5, color: bar.color, fontFamily: T.fontMono, fontWeight: 700, padding: "0 4px", whiteSpace: "nowrap" }}>{bar.plannedLabel}</span>
                                </div>
                                {lp + wp < 100 && <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, width: `${100 - lp - wp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                              </div>
                            </div>
                            {/* Actual */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 44, fontSize: 7.5, fontFamily: T.fontMono, color: T.textXLight, textAlign: "right", flexShrink: 0 }}>Actual</div>
                              <div style={{ flex: 1, position: "relative", height: 14, background: T.surfaceRaised, borderRadius: 3, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                                {lp > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: `${lp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                                <div style={{ position: "absolute", left: `${lp}%`, width: `${wp}%`, top: 1, bottom: 1, background: bar.color, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 1px 4px ${bar.color}44`, overflow: "hidden" }}>
                                  <span style={{ fontSize: 7.5, color: "white", fontFamily: T.fontMono, fontWeight: 700, padding: "0 4px", whiteSpace: "nowrap" }}>{bar.actualLabel}</span>
                                </div>
                                {lp + wp < 100 && <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, width: `${100 - lp - wp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)" }} />}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Marker legend */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textLight }}>
                    <div style={{ width: 2, height: 14, background: T.amber }} />
                    <span style={{ fontFamily: T.fontMono, fontWeight: 700 }}>14:00</span> Order cutoff — Next Day articles must be pickable by this time
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textLight }}>
                    <div style={{ width: 2, height: 14, background: "#e65100" }} />
                    <span style={{ fontFamily: T.fontMono, fontWeight: 700 }}>18:00</span> Long-distance departure — last network injection of the day
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textLight }}>
                    <div style={{ width: 16, height: 2, borderTop: "2px dashed #94a3b8" }} />
                    <span style={{ fontFamily: T.fontMono, fontWeight: 700 }}>23:59</span> Day boundary — SLA windows reset at midnight
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* SDPA process gap callout */}
        <div style={{ padding: "12px 16px", background: "#fff8e1", border: `1px solid #fde68a`, borderLeft: `4px solid ${T.amber}`, borderRadius: "var(--radius-md)", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>⚠ SDPA Process Gap</div>
          <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.75 }}>
            The current SDPA SLA measures putaway completion until <strong>23:59</strong> on the Material Availability Date. This means putaway at 22:00 is reported as green. But for Next Day orders, the actual required putaway deadline is <strong>14:00</strong> — the outbound order cutoff. A putaway at 15:30 reports SDPA green while the downstream chain has already missed the truck. <strong>SDPA for Next Day articles should be measured against 14:00, not 23:59.</strong>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Select a KPI to see failure scenarios</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {KPI_CARDS.map(kpi => (
            <div key={kpi.id}
              style={{ background: T.surface, border: `2px solid ${selectedKpi === kpi.id ? kpi.color : T.border}`, borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer", transition: "all 0.2s" }}
              onClick={() => setSelectedKpi(selectedKpi === kpi.id ? null : kpi.id)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = kpi.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = selectedKpi === kpi.id ? kpi.color : T.border; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${kpi.color}18`, border: `1px solid ${kpi.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{kpi.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: kpi.color, fontFamily: T.fontMono }}>{kpi.id}</div>
                  <div style={{ fontSize: 11, color: T.textMed }}>{kpi.full}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.textLight, lineHeight: 1.6, marginBottom: 10 }}>{kpi.desc}</div>
              <div style={{ padding: "6px 10px", background: `${kpi.color}0d`, border: `1px solid ${kpi.color}33`, borderRadius: "var(--radius-sm)", fontSize: 10, fontFamily: T.fontMono, color: kpi.color, lineHeight: 1.5 }}>
                {kpi.slaNote}
              </div>
              {selectedKpi === kpi.id && (
                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: kpi.color, display: "flex", alignItems: "center", gap: 4 }}>See failure scenario →</div>
              )}
            </div>
          ))}
        </div>

        {/* Scenarios for selected KPI */}
        {selectedKpi && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
              Failure Scenarios — {selectedKpi}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SCENARIOS.filter(s => s.kpiId === selectedKpi).map(sc => (
                <div key={sc.id}
                  onClick={() => setActiveScenario(sc.id)}
                  style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `4px solid ${sc.color}`, borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 14 }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{sc.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{sc.title}</div>
                    <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.5, marginBottom: 10 }}>{sc.desc}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {sc.kpis.map(k => {
                        const col = k.status === "green" ? T.green : k.status === "red" ? T.red : T.amber;
                        return <div key={k.id} style={{ fontSize: 9, fontWeight: 700, fontFamily: T.fontMono, padding: "2px 7px", borderRadius: 8, background: `${col}14`, border: `1px solid ${col}44`, color: col }}>{k.id} {k.status === "green" ? "✅" : "❌"}</div>;
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sc.color, flexShrink: 0 }}>View →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bonus scenarios */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Mirror Scenarios — The Two Edges of KPI Logic</div>
          <div style={{ padding: "10px 14px", background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "var(--radius-md)", marginBottom: 12, fontSize: 12, color: T.textMed, lineHeight: 1.7 }}>
            These two scenarios are complementary: one shows a sub-KPI red while OTIF stays green. The other shows all sub-KPIs green while OTIF fails. Together they reveal how individual KPIs can misrepresent the full customer experience.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* CTE red, OTIF green */}
            <div
              onClick={() => setActiveScenario("cte_only")}
              style={{ background: T.surface, border: `1px solid ${T.greenBorder}`, borderLeft: `4px solid ${T.green}`, borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 14 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 24, flexShrink: 0 }}>🚚</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Scenario A</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{SCENARIO_CTE_ONLY.title}</div>
                <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.5, marginBottom: 10 }}>{SCENARIO_CTE_ONLY.desc}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SCENARIO_CTE_ONLY.kpis.map(k => {
                    const col = k.status === "green" ? T.green : k.status === "red" ? T.red : T.amber;
                    return <div key={k.id} style={{ fontSize: 9, fontWeight: 700, fontFamily: T.fontMono, padding: "2px 7px", borderRadius: 8, background: `${col}14`, border: `1px solid ${col}44`, color: col }}>{k.id} {k.status === "green" ? "✅" : "❌"}</div>;
                  })}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.green, flexShrink: 0 }}>View →</div>
            </div>

            {/* All green, OTIF red — WSP blind */}
            <div
              onClick={() => setActiveScenario("wsp_blind")}
              style={{ background: T.surface, border: `1px solid ${T.redBorder}`, borderLeft: `4px solid ${T.red}`, borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 14 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 24, flexShrink: 0 }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Scenario B — KPI Measurement Gap</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{SCENARIO_WSP_BLIND.title}</div>
                <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.5, marginBottom: 10 }}>{SCENARIO_WSP_BLIND.desc}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SCENARIO_WSP_BLIND.kpis.map(k => {
                    const col = k.status === "green" ? T.green : k.status === "red" ? T.red : T.amber;
                    return <div key={k.id} style={{ fontSize: 9, fontWeight: 700, fontFamily: T.fontMono, padding: "2px 7px", borderRadius: 8, background: `${col}14`, border: `1px solid ${col}44`, color: col }}>{k.id} {k.status === "green" ? "✅" : "❌"}</div>;
                  })}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.red, flexShrink: 0 }}>View →</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// NEW KPI LOGIC — Dot-in-Window Visualization
// ═══════════════════════════════════════════════════════

function NewKpiLogicModule() {
  const [activeCase, setActiveCase] = useState(null);

  // ── Color tokens ──────────────────────────────────────
  const C = {
    day0:  { bg: "rgba(34,197,94,0.08)",   band: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.2)",   text: T.green,    label: "DAY 0" },
    day1:  { bg: "rgba(124,58,237,0.08)",  band: "rgba(124,58,237,0.05)",  border: "rgba(124,58,237,0.2)", text: "#7c3aed",  label: "DAY 1" },
    day2:  { bg: "rgba(59,130,246,0.08)",  band: "rgba(59,130,246,0.05)",  border: "rgba(59,130,246,0.2)", text: T.blue,     label: "DAY 2" },
    kpis: {
      CPA:  T.green,
      SDPA: "#0097a7",
      WSP:  "#7c3aed",
      CTE:  "#e65100",
      OTIF: T.blue,
    },
  };

  // ── Shared timeline anchors (same across all cases) ───
  // Chronologically ordered — pos increases left to right = earlier to later
  // 0  = Material Avail. Date       Day 0 00:00
  // 1  = Inbound Scan               Day 0 10:00
  // 2  = PutAway Done               Day 0 ~13:00  ← BEFORE 14:00 cutoff
  // 2.5= 14:00 Cutoff               Day 0 14:00   ← threshold only, AFTER pos 2
  // 3  = 23:59 Day 0                Day break
  // 4  = Del. Doc / Order           Day 1 08:00
  // 5  = PGI Scan                   Day 1 17:00
  // 6  = 18:00 Departure            Day 1 18:00   ← threshold only
  // 7  = 23:59 Day 1                Day break
  // 9  = POD                        Day 2 12:00
  const TOTAL = 9;
  const toP = (p) => `${(p / TOTAL) * 100}%`;

  const ANCHORS = [
    { pos: 0, icon: "📋", label: "Mat.\nAvail. Date", sub: "Day 0",       col: T.green },
    { pos: 1, icon: "🚛", label: "Inbound\nScan",     sub: "Day 0 10:00", col: T.green },
    { pos: 2, icon: "🏷️", label: "PutAway\nDone",     sub: "Day 0 ~13:00",col: "#0097a7" },
    { pos: 4, icon: "📄", label: "Del. Doc",          sub: "Day 1 08:00", col: "#7c3aed" },
    { pos: 5, icon: "✅", label: "PGI\nScan",         sub: "Day 1 17:00", col: "#7c3aed" },
    { pos: 6, icon: "🚚", label: "Carrier\nDep.",     sub: "Day 1 18:00", col: "#e65100" },
    { pos: 9, icon: "📍", label: "POD\nDelivery",     sub: "Day 2 12:00", col: T.blue },
  ];

  const DAY_BANDS = [
    { from: 0, to: 3,   ...C.day0 },
    { from: 3, to: 7,   ...C.day1 },
    { from: 7, to: 9,   ...C.day2 },
  ];

  // ── KPI window definitions ────────────────────────────
  // Each window: planned start+end (pos units), label, color
  // The "actual dot" is placed at a specific pos, colored green/red based on inside/outside
  const KPI_WINDOWS = [
    { id: "CPA",  full: "Customer Product Availability",  color: C.kpis.CPA,  from: 0, to: 3, label: "Mat.Avail.Date → 23:59 Day 0",            sla: "Inbound scan before 23:59 Day 0" },
    { id: "SDPA", full: "Same Day Put-Away",              color: C.kpis.SDPA, from: 1, to: 3, label: "Inbound Scan → 23:59 (⚠ should 14:00)",   sla: "SLA: 14:00 cutoff" },
    { id: "WSP",  full: "Warehouse Shipping Performance", color: C.kpis.WSP,  from: 4, to: 6, label: "Del.Doc Created → PGI / Departure",        sla: "PGI before 18:00 departure" },
    { id: "CTE",  full: "Customer Transport Experience",  color: C.kpis.CTE,  from: 6, to: 9, label: "Carrier Departure → POD",                  sla: "Delivery within service level window" },
  ];

  // ── Case definitions ──────────────────────────────────
  const CASES = [
    {
      id: "all_green",
      title: "All KPIs Green — OTIF Green",
      subtitle: "Perfect execution. Every dot lands inside its window.",
      color: T.green,
      icon: "✅",
      otif: "green",
      dots: [
        { kpi: "CPA",  pos: 0.8,  inside: true,  label: "Scan 10:00",    note: "Goods scanned within CPA window — before 23:59 Day 0" },
        { kpi: "SDPA", pos: 1.8,  inside: true,  label: "PutAway 12:30", note: "Put-away before 14:00 cutoff — left of the amber line ✓" },
        { kpi: "WSP",  pos: 4.9,  inside: true,  label: "PGI 16:30",     note: "PGI within planned window — before 18:00 departure" },
        { kpi: "CTE",  pos: 8.5,  inside: true,  label: "POD 11:00",     note: "Delivery within CTE window — Day 2" },
      ],
      insight: "Every scan lands inside its planned window. OTIF is green. This is the baseline — the benchmark every order should achieve.",
    },
    {
      id: "cpa_fail",
      title: "CPA Fails — Truck Arrives Day 1",
      subtitle: "The inbound scan dot falls outside the CPA window. Everything shifts.",
      color: T.green,
      icon: "📦",
      otif: "red",
      dots: [
        { kpi: "CPA",  pos: 4.1,  inside: false, label: "Scan Day 1 09:00", note: "Goods only arrive Day 1 — CPA window already closed at 23:59 Day 0" },
        { kpi: "SDPA", pos: 4.4,  inside: true,  label: "PutAway 11:00",   note: "Putaway same day as arrival (Day 1) — SDPA met in isolation, but entire chain is 1 day late" },
        { kpi: "WSP",  pos: 5.0,  inside: true,  label: "PGI 17:00",       note: "PGI within WSP window — warehouse executed correctly" },
        { kpi: "CTE",  pos: 9.5,  inside: false, label: "POD Day 3",       note: "Entire chain shifted +1 day — delivery lands outside CTE window" },
      ],
      insight: "CPA dot is outside the window. One late scan cascades through the entire chain. SDPA and WSP still report green because they only see their own windows — but the chain is already broken.",
    },
    {
      id: "sdpa_gap",
      title: "SDPA Process Gap — 23:59 Green, 14:00 Red",
      subtitle: "The putaway dot is inside the current 23:59 window — but past the real 14:00 cutoff.",
      color: "#0097a7",
      icon: "🏷️",
      otif: "red",
      dots: [
        { kpi: "CPA",  pos: 0.8,  inside: true,  label: "Scan 10:00",    note: "CPA met" },
        { kpi: "SDPA", pos: 2.8,  inside: true,  label: "PutAway 15:30", note: "Inside the 23:59 SLA window — SDPA green. But 14:00 cutoff already passed.", insideBut: true, butNote: "Past real 14:00 cutoff" },
        { kpi: "WSP",  pos: 7.5,  inside: false, label: "PGI Day 2",     note: "Loading chain couldn't complete before truck — WSP fails" },
        { kpi: "CTE",  pos: 8.5,  inside: true,  label: "POD Day 2",     note: "Carrier starts from Day 2 departure — CTE technically met from that point" },
      ],
      insight: "The putaway dot sits inside the 23:59 SLA band — so SDPA reports green. But the real required cutoff is 14:00. The dot should be judged against 14:00, not 23:59. This visualisation makes the gap unmissable: the window needs to be redrawn.",
      sdpaGap: true,
    },
    {
      id: "wsp_fail",
      title: "WSP Fails — Pick & Pack Too Slow",
      subtitle: "PGI dot falls outside the WSP window. Departure shifts by one day.",
      color: "#7c3aed",
      icon: "🚛",
      otif: "red",
      dots: [
        { kpi: "CPA",  pos: 0.8,  inside: true,  label: "Scan 10:00",      note: "CPA met" },
        { kpi: "SDPA", pos: 2.0,  inside: true,  label: "PutAway 13:00",   note: "SDPA met — putaway at the anchor time" },
        { kpi: "WSP",  pos: 7.5,  inside: false, label: "PGI Day 2 09:00", note: "PGI one day late — WSP window closed at 18:00 Day 1" },
        { kpi: "CTE",  pos: 8.5,  inside: true,  label: "POD Day 2",       note: "Carrier met their SLA from Day 2 departure" },
      ],
      insight: "The PGI dot is outside the WSP window. CTE is inside its window because it only starts from departure — even though departure is a day late. OTIF is red because the full journey exceeds the customer promise.",
    },
    {
      id: "wsp_blind",
      title: "WSP Blind — PGI After Departure",
      subtitle: "WSP dot is inside its window. But the departure dot already passed — WSP can't see it.",
      color: "#7c3aed",
      icon: "⚠️",
      otif: "red",
      dots: [
        { kpi: "CPA",  pos: 0.8,  inside: true,  label: "Scan 09:00",  note: "CPA met" },
        { kpi: "SDPA", pos: 1.8,  inside: true,  label: "PutAway 12:00", note: "SDPA met — putaway before 14:00" },
        { kpi: "WSP",  pos: 6.2,  inside: true,  label: "PGI 18:30",   note: "Inside extended 23:59 WSP window — WSP reports green. But 18:00 departure (pos 6) already passed.", insideBut: true, butNote: "PGI is AFTER 18:00 departure" },
        { kpi: "CTE",  pos: 8.5,  inside: true,  label: "POD Day 2",   note: "Carrier correct from departure" },
      ],
      insight: "All dots appear inside their windows — but the PGI dot is to the right of the 18:00 departure marker. WSP's window ends at 23:59 and doesn't know about the departure threshold. The fix: WSP window should end at 18:00, not 23:59. This visualization makes the measurement design flaw visible at a glance.",
      wspBlind: true,
    },
    {
      id: "cte_only_red",
      title: "CTE Red — OTIF Green (Extended SLA)",
      subtitle: "CTE dot lands outside its window. OTIF dot still inside the wider customer window.",
      color: "#e65100",
      icon: "🚚",
      otif: "green",
      dots: [
        { kpi: "CPA",  pos: 0.8,  inside: true,  label: "Scan 10:00",  note: "CPA met" },
        { kpi: "SDPA", pos: 2.0,  inside: true,  label: "PutAway 13:00", note: "SDPA met" },
        { kpi: "WSP",  pos: 4.9,  inside: true,  label: "PGI 16:00",   note: "WSP met" },
        { kpi: "CTE",  pos: 9.5,  inside: false, label: "POD Day 3",   note: "Outside CTE window (next-day SLA). But customer has a 2-day SLA — OTIF bracket extends further.", otifInside: true },
      ],
      insight: "The CTE dot falls outside the 1-day carrier SLA window. But OTIF's outer bracket extends to Day 3 — and the POD dot lands inside it. A sub-KPI can turn red without breaking the customer promise. Each window must be understood in the context of the overall OTIF bracket.",
    },
  ];

  // ── Dot-in-window chart component ────────────────────
  function DotChart({ kpiWindows, dots, anchors, dayBands, total, cutoffPos, departurePos, otif, showSdpaGap, showWspBlind }) {
    const toPos = (p) => `${(p / total) * 100}%`;

    // Threshold lines: day-borders (pos where day changes), cutoff, departure
    // These draw a vertical line from the header all the way through every KPI row
    const thresholds = [
      // Day borders — where each band starts (except the very first at 0)
      ...dayBands.slice(1).map(d => ({
        pos: d.from,
        color: d.text,
        style: "solid",
        icon: "🕛",
        time: "00:00",
        desc: `${d.label} begins`,
        isDayBorder: true,
      })),
      // 14:00 cutoff
      ...(cutoffPos !== undefined ? [{
        pos: cutoffPos,
        color: T.amber,
        style: "dashed",
        icon: "⏰",
        time: "14:00",
        desc: "Next Day order cutoff",
        isDayBorder: false,
      }] : []),
      // 18:00 departure
      ...(departurePos !== undefined ? [{
        pos: departurePos,
        color: "#e65100",
        style: "dashed",
        icon: "🚛",
        time: "18:00",
        desc: "Planned departure",
        isDayBorder: false,
      }] : []),
    ].sort((a, b) => a.pos - b.pos);

    // How many KPI rows + OTIF row will be rendered (for the line height)
    const kpiRowCount = kpiWindows.length + 1; // +1 for OTIF
    // Each KPI row is ~42px tall (label row ~16 + bar ~22 + gap ~4), OTIF is 22px
    // We'll use a CSS variable approach: just extend the line via a ref or use overflow visible

    return (
      <div style={{ background: T.surfaceRaised, borderRadius: "var(--radius-lg)", border: `1px solid ${T.border}`, overflow: "hidden" }}>

        {/* ── Day band header — stronger color separation ── */}
        <div style={{ display: "flex" }}>
          {dayBands.map((d, i) => (
            <div key={i} style={{
              width: `${((d.to - d.from) / total) * 100}%`,
              background: i === 0 ? "rgba(34,197,94,0.18)" : i === 1 ? "rgba(124,58,237,0.14)" : "rgba(59,130,246,0.16)",
              borderRight: i < dayBands.length - 1 ? `2px solid ${d.border}` : undefined,
              padding: "6px 0",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexShrink: 0,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.text }} />
              <span style={{ fontSize: 9, fontWeight: 900, color: d.text, fontFamily: T.fontMono, letterSpacing: "1px", textTransform: "uppercase" }}>{d.label}</span>
            </div>
          ))}
        </div>

        {/* ── Threshold header row: icons + time + desc, lines go down ── */}
        <div style={{ position: "relative", padding: "8px 0 4px", borderBottom: `1px solid ${T.border}` }}>
          {/* Day band backgrounds */}
          {dayBands.map((d, i) => (
            <div key={i} style={{ position: "absolute", left: toPos(d.from), top: 0, bottom: 0, width: `${((d.to - d.from) / total) * 100}%`, background: d.band }} />
          ))}
          {thresholds.map((th, i) => {
            const lPct = (th.pos / total) * 100;
            return (
              <div key={i} style={{ position: "absolute", left: `${lPct}%`, top: 0, bottom: 0, zIndex: 3 }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}` }} />
                {/* Label bubble — stagger alternating heights to avoid overlap */}
                <div style={{
                  position: "absolute",
                  top: i % 2 === 0 ? 4 : 18,
                  left: 4,
                  display: "flex", alignItems: "center", gap: 3,
                  background: "white",
                  border: `1px solid ${th.color}66`,
                  borderRadius: 5,
                  padding: "2px 5px",
                  boxShadow: `0 1px 4px ${th.color}22`,
                  zIndex: 5,
                  pointerEvents: "none",
                }}>
                  <span style={{ fontSize: 10 }}>{th.icon}</span>
                  <span style={{ fontSize: 8, fontWeight: 900, color: th.color, fontFamily: T.fontMono }}>{th.time}</span>
                  <span style={{ fontSize: 8, color: T.textMed, fontFamily: T.fontSans }}>{th.desc}</span>
                </div>
              </div>
            );
          })}
          {/* Spacer so bubbles have room */}
          <div style={{ height: 38 }} />
        </div>

        <div style={{ padding: 16, paddingTop: 12 }}>

          {/* OTIF outer bracket */}
          <div style={{ position: "relative", height: 22, marginBottom: 10 }}>
            {/* Threshold lines through OTIF */}
            {thresholds.map((th, i) => (
              <div key={i} style={{ position: "absolute", left: toPos(th.pos), top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}88`, zIndex: 4 }} />
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, top: 3, bottom: 3, background: `${T.blue}12`, border: `1.5px solid ${T.blue}44`, borderRadius: 5 }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: T.blue, borderRadius: "4px 0 0 4px" }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: T.blue, borderRadius: "0 4px 4px 0" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: otif === "green" ? T.green : T.red, border: "2px solid white", boxShadow: `0 0 0 3px ${otif === "green" ? T.green : T.red}33` }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: T.blue, fontFamily: T.fontMono }}>OTIF — outer bracket — {otif === "green" ? "✅ Green" : "❌ Red"}</span>
            </div>
          </div>

          {/* KPI window rows with dots */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {kpiWindows.map(kw => {
              const dot = dots.find(d => d.kpi === kw.id);
              const lp   = (kw.from / total) * 100;
              const wp   = ((kw.to - kw.from) / total) * 100;
              const dotL = dot ? (dot.pos / total) * 100 : null;

              const isSdpa = kw.id === "SDPA" && showSdpaGap;
              const realCutoff = cutoffPos;
              const realWp = isSdpa ? ((realCutoff - kw.from) / total) * 100 : null;

              const isWsp  = kw.id === "WSP" && showWspBlind;
              const effectiveTo = isWsp ? 7 : kw.to;
              const wp_override = isWsp ? ((effectiveTo - kw.from) / total) * 100 : null;

              const dotInside = dot?.inside;
              const dotColor  = dot?.insideBut ? T.amber : dotInside ? T.green : T.red;
              const dotIcon   = dot?.insideBut ? "⚠" : dotInside ? "✓" : "✗";
              const ringColor = dot?.insideBut ? T.amber : dotInside ? T.green : T.red;
              const statusBg  = dot?.insideBut ? T.amberLight  : dotInside ? T.greenLight  : T.redLight;
              const statusBrd = dot?.insideBut ? T.amberBorder : dotInside ? T.greenBorder : T.redBorder;
              const statusTxt = dot?.insideBut ? "WARN" : dotInside ? "OK" : "FAIL";

              return (
                <div key={kw.id} style={{ display: "flex", alignItems: "stretch", borderRadius: "var(--radius-md)", overflow: "hidden", border: `1px solid ${T.border}`, background: T.surface }}>

                  {/* Left label panel */}
                  <div style={{ width: 100, flexShrink: 0, padding: "7px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, background: `${kw.color}08`, borderRight: `2px solid ${kw.color}33` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: kw.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: kw.color, fontFamily: T.fontMono }}>{kw.id}</span>
                    </div>
                    {dot && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 5px", borderRadius: 4, background: statusBg, border: `1px solid ${statusBrd}`, alignSelf: "flex-start" }}>
                          <span style={{ fontSize: 8, fontWeight: 900, color: dotColor, fontFamily: T.fontMono }}>{dotIcon} {statusTxt}</span>
                        </div>
                        <span style={{ fontSize: 8, color: dotColor, fontFamily: T.fontMono, fontWeight: 700, lineHeight: 1.2 }}>{dot.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Right timeline bar */}
                  <div style={{ flex: 1, position: "relative", height: 52, background: T.surfaceRaised }}>
                    {/* Day band bg */}
                    {dayBands.map((d, i) => (
                      <div key={i} style={{ position: "absolute", left: `${(d.from / total) * 100}%`, top: 0, bottom: 0, width: `${((d.to - d.from) / total) * 100}%`, background: d.band }} />
                    ))}
                    {/* Threshold lines */}
                    {thresholds.map((th, i) => (
                      <div key={i} style={{ position: "absolute", left: toPos(th.pos), top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}88`, zIndex: 4 }} />
                    ))}

                    {/* Inactive zones (hatch outside window) */}
                    {(() => {
                      const ew = wp_override ?? wp;
                      return (<>
                        {lp > 0 && <div style={{ position: "absolute", left: 0, top: 0, width: `${lp}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)", zIndex: 1 }} />}
                        {lp + ew < 100 && <div style={{ position: "absolute", left: `${lp + ew}%`, top: 0, width: `${100 - lp - ew}%`, height: "100%", background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)", zIndex: 1 }} />}
                      </>);
                    })()}

                    {/* Planned window */}
                    <div style={{ position: "absolute", left: `${lp}%`, width: `${wp_override ?? wp}%`, top: 6, bottom: 6, background: `${kw.color}18`, border: `1.5px solid ${kw.color}55`, borderRadius: 4, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 8, color: kw.color, fontFamily: T.fontMono, fontWeight: 700, opacity: 0.8 }}>window</span>
                    </div>

                    {/* SDPA: real 14:00 sub-window */}
                    {isSdpa && realWp !== null && (
                      <div style={{ position: "absolute", left: `${lp}%`, width: `${realWp}%`, top: 6, bottom: 6, background: `${T.green}22`, border: `2px solid ${T.green}88`, borderRadius: 4, zIndex: 3 }}>
                        <div style={{ position: "absolute", right: -1, top: -1, bottom: -1, width: 2, background: T.green }} />
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 7, color: T.green, fontFamily: T.fontMono, fontWeight: 800, whiteSpace: "nowrap" }}>← 14:00</div>
                      </div>
                    )}

                    {/* WSP blind: departure inside window */}
                    {isWsp && departurePos !== undefined && (
                      <div style={{ position: "absolute", left: toPos(departurePos), top: 0, bottom: 0, zIndex: 5 }}>
                        <div style={{ width: 0, borderLeft: "2px dashed #e65100", height: "100%" }} />
                        <div style={{ position: "absolute", top: 2, left: 3, fontSize: 7, color: "#e65100", fontFamily: T.fontMono, fontWeight: 800, whiteSpace: "nowrap" }}>18:00→</div>
                      </div>
                    )}

                    {/* Actual scan dot */}
                    {dot && dotL !== null && (
                      <div style={{ position: "absolute", left: `${dotL}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 6 }}>
                        {!dotInside && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 26, height: 26, borderRadius: "50%", background: `${dotColor}15`, border: `1.5px solid ${dotColor}55`, animation: "pulse 2s infinite" }} />}
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: dotColor, border: "2.5px solid white", boxShadow: `0 0 0 2px ${ringColor}55, var(--shadow-sm)`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative" }}>
                          <span style={{ fontSize: 8, color: "white", fontWeight: 900, lineHeight: 1 }}>{dotIcon}</span>
                        </div>
                      </div>
                    )}

                    {/* Window start/end ticks */}
                    <div style={{ position: "absolute", left: `${lp}%`, top: 0, bottom: 0, width: 2, background: kw.color, opacity: 0.4, zIndex: 3 }} />
                    <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, bottom: 0, width: 2, background: kw.color, opacity: 0.4, zIndex: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Events row — all anchors chronologically, with icon + time + desc ── */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.textXLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Events</div>
            <div style={{ position: "relative" }}>
              {/* Threshold lines through event row */}
              {thresholds.map((th, i) => (
                <div key={i} style={{ position: "absolute", left: `calc(${toPos(th.pos)} + 22px)`, top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}55`, zIndex: 1 }} />
              ))}
              {/* Horizontal spine */}
              <div style={{ position: "absolute", left: 22, right: 0, top: 11, height: 2, background: T.border }} />
              {/* Anchor dots + labels — sorted chronologically */}
              {[...anchors].sort((a, b) => a.pos - b.pos).map((a, i) => {
                const leftPct = (a.pos / total) * 100;
                return (
                  <div key={i} style={{
                    position: "absolute",
                    left: `calc(${leftPct}% + 22px)`,
                    top: 0,
                    transform: "translateX(-50%)",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    zIndex: 2,
                  }}>
                    {/* Dot on spine */}
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: a.col, border: "2px solid white", boxShadow: `0 0 0 2px ${a.col}44`, flexShrink: 0 }} />
                    {/* Icon + time + label stacked below */}
                    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <span style={{ fontSize: 13 }}>{a.icon}</span>
                      <span style={{ fontSize: 7, fontWeight: 900, color: a.col, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{a.sub}</span>
                      <span style={{ fontSize: 7, color: T.textMed, fontFamily: T.fontSans, textAlign: "center", maxWidth: 52, lineHeight: 1.3, whiteSpace: "pre-line" }}>{a.label}</span>
                    </div>
                  </div>
                );
              })}
              {/* Spacer so labels have room */}
              <div style={{ height: 78, marginLeft: 22 }} />
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: T.textLight }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.green, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 6.5, color: "white", fontWeight: 900 }}>✓</span></div>
              Scan inside window — KPI met
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: T.textLight }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.amber, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 6.5, color: "white", fontWeight: 900 }}>⚠</span></div>
              Inside SLA but past real threshold
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: T.textLight }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.red, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 6.5, color: "white", fontWeight: 900 }}>✗</span></div>
              Scan outside window — KPI failed
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: T.textLight }}>
              <div style={{ width: 24, height: 10, background: "rgba(0,0,0,0)", border: "1.5px solid #7c3aed88", borderRadius: 2 }} />
              Planned SLA window
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active case detail view
  if (activeCase) {
    const c = CASES.find(x => x.id === activeCase);
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
        <div style={{ background: T.navyMid, padding: "14px 20px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <button onClick={() => setActiveCase(null)} style={{ background: "none", border: "none", color: "#8eaac8", fontSize: 12, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>← New KPI Logic</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: T.fontDisplay }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#8eaac8", marginTop: 2 }}>{c.subtitle}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px" }}>
          <DotChart
            kpiWindows={KPI_WINDOWS}
            dots={c.dots}
            anchors={ANCHORS}
            dayBands={DAY_BANDS}
            total={TOTAL}
            cutoffPos={2.5}
            departurePos={6}
            otif={c.otif}
            showSdpaGap={!!c.sdpaGap}
            showWspBlind={!!c.wspBlind}
          />

          {/* Dot summary table */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMed, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Scan Result Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {c.dots.map(d => {
                const col = d.insideBut ? T.amber : d.inside ? T.green : T.red;
                const bg  = d.insideBut ? T.amberLight : d.inside ? T.greenLight : T.redLight;
                const brd = d.insideBut ? T.amberBorder : d.inside ? T.greenBorder : T.redBorder;
                return (
                  <div key={d.kpi} style={{ background: bg, border: `1px solid ${brd}`, borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, border: "2px solid white" }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: col, fontFamily: T.fontMono }}>{d.kpi}</span>
                      <span style={{ fontSize: 10, fontFamily: T.fontMono, color: col, marginLeft: "auto" }}>{d.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.textMed, lineHeight: 1.5 }}>{d.note}</div>
                    {d.insideBut && <div style={{ fontSize: 10, color: T.red, fontWeight: 700, marginTop: 3 }}>⚠ {d.butNote}</div>}
                  </div>
                );
              })}
            </div>
            {/* OTIF result */}
            {(() => {
              const col = c.otif === "green" ? T.green : T.red;
              const bg  = c.otif === "green" ? T.greenLight : T.redLight;
              const brd = c.otif === "green" ? T.greenBorder : T.redBorder;
              return (
                <div style={{ marginTop: 8, background: bg, border: `2px solid ${brd}`, borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: col, border: "2px solid white" }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: col, fontFamily: T.fontMono }}>OTIF</span>
                  <span style={{ fontSize: 11, color: col, fontWeight: 700, marginLeft: 4 }}>{c.otif === "green" ? "✅ Green — all within customer promise window" : "❌ Red — customer promise window exceeded"}</span>
                </div>
              );
            })()}
          </Card>

          {/* Insight */}
          <div style={{ padding: "12px 16px", background: T.blueLight, border: `1px solid ${T.blueSoft}`, borderLeft: `4px solid ${T.blue}`, borderRadius: "var(--radius-md)", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Key Insight</div>
            <div style={{ fontSize: 12, color: T.textMed, lineHeight: 1.75 }}>{c.insight}</div>
          </div>

          <Btn onClick={() => setActiveCase(null)} variant="secondary">← Back to New KPI Logic</Btn>
        </div>
      </div>
    );
  }

  // ── Landing ───────────────────────────────────────────
  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
      {/* Header */}
      <div style={{ background: T.navyMid, padding: "28px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Module 4 · Proposal</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", fontFamily: T.fontDisplay, marginBottom: 8 }}>New KPI Logic</h1>
          <p style={{ fontSize: 13.5, color: "#8eaac8", maxWidth: 600, lineHeight: 1.7, marginBottom: 16 }}>
            A new visualization model: each KPI shows its <strong style={{ color: "white" }}>planned window</strong> as a bar, and the <strong style={{ color: "white" }}>actual scan</strong> as a dot. Green dot inside the window = KPI met. Red dot outside = KPI failed. Instantly readable.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Planned window bar","Actual scan dot","Inside = ✓ Green","Outside = ✗ Red","OTIF outer bracket","Day bands + thresholds"].map(t => (
              <div key={t} style={{ padding: "3px 10px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{t}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>

        {/* Overview dot chart — all green baseline */}
        <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Visual Language — How to Read the Chart</div>
        <DotChart
          kpiWindows={KPI_WINDOWS}
          dots={CASES[0].dots}
          anchors={ANCHORS}
          dayBands={DAY_BANDS}
          total={TOTAL}
          cutoffPos={2.5}
          departurePos={6}
          otif={CASES[0].otif}
          showSdpaGap={false}
          showWspBlind={false}
        />

        {/* Case cards */}
        <div style={{ fontSize: 11, color: T.textLight, fontFamily: T.fontMono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, marginTop: 20 }}>Select a Scenario</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="grid-2col">
          {CASES.map(c => {
            const hasRed  = c.dots.some(d => !d.inside);
            const hasAmber = c.dots.some(d => d.insideBut);
            const dotColors = c.dots.map(d => d.insideBut ? T.amber : d.inside ? T.green : T.red);
            return (
              <div key={c.id}
                onClick={() => setActiveCase(c.id)}
                style={{ background: T.surface, border: `1px solid ${c.id === "all_green" ? T.greenBorder : hasRed ? T.redBorder : T.amberBorder}`, borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: T.textMed, lineHeight: 1.5 }}>{c.subtitle}</div>
                  </div>
                </div>
                {/* Mini dot preview */}
                <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8 }}>
                  {c.dots.map((d, i) => {
                    const col = d.insideBut ? T.amber : d.inside ? T.green : T.red;
                    return (
                      <div key={i} title={d.kpi} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, border: "2px solid white", boxShadow: `0 0 0 2px ${col}44` }} />
                        <span style={{ fontSize: 7, fontFamily: T.fontMono, color: col, fontWeight: 700 }}>{d.kpi}</span>
                      </div>
                    );
                  })}
                  <div style={{ marginLeft: 4, display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.otif === "green" ? T.green : T.red }} />
                    <span style={{ fontSize: 7.5, fontFamily: T.fontMono, color: c.otif === "green" ? T.green : T.red, fontWeight: 800 }}>OTIF</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: hasRed ? T.red : hasAmber ? T.amber : T.green, display: "flex", alignItems: "center", gap: 4 }}>View →</div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// KPI SIMULATOR
// ═══════════════════════════════════════════════════════

function KpiSimulatorModule() {
  // ── Timeline: only Day 0 + Day 1 visible ────────────
  // Day 0 = pos 0–6  (warehouse: inbound, pick/pack, PGI, departure)
  //   1h = 0.25 pos  |  14:00 = 3.5  |  18:00 = 4.5
  // Day 1 = pos 6–9  (transit + delivery, normal window ends 23:59)
  // Day 2 = pos 9–11 (only visible when CTE window extends +24h)
  // TOTAL shown = 9 normally, extended to 11 when CTE +24h active

  const d0h = (h) => (h / 24) * 6;          // Day 0 hour → pos
  const d1h = (h) => 6 + (h / 24) * 3;      // Day 1 hour → pos
  const d2h = (h) => 9 + (h / 24) * 2;      // Day 2 hour → pos

  const [scenario, setScenario] = useState("backorder");

  // KPI window boundaries and scenario flags
  const CUTOFF          = d0h(14);   // 14:00 Day 0
  const SDPA_WINDOW_END = CUTOFF;
  const DEPARTURE       = d0h(18);   // 18:00 Day 0
  const DAY1_DEPARTURE  = d1h(18);   // 18:00 Day 1
  const DAY1_END        = 9;         // 23:59 Day 1
  const DAY2_END        = 11;        // 23:59 Day 2

  const isBackOrder = scenario === "backorder";
  const isNextDay   = scenario === "nextday";
  const isStandard  = scenario === "standard";

  // State in real one-hour steps, displayed at the end of the hour bucket (:30)
  // Example: value 13 = Day 0 · 13:30, value 14 = Day 0 · 14:30
  // Day 0 values: 0–23, Day 1 values: 24–47, Day 2 values: 48–71
  const absHourFromPos = (pos) => {
    if (pos <= 6) return (pos / 6) * 24;
    if (pos <= 9) return 24 + ((pos - 6) / 3) * 24;
    return 48 + ((pos - 9) / 2) * 24;
  };

  const posFromAbsHour = (absHour) => {
    if (absHour < 24) return d0h(absHour);
    if (absHour < 48) return d1h(absHour - 24);
    return d2h(absHour - 48);
  };

  const toInt = (pos) => Math.round(absHourFromPos(pos) - 0.5);
  const fromInt = (i) => posFromAbsHour(i + 0.5);

  const [inboundI, setInboundI] = useState(8);   // Day 0 · 08:30
  const [pgiI,     setPgiI]     = useState(15);  // Day 0 · 15:30
  const [podI,     setPodI]     = useState(36);  // Day 1 · 12:30

  const ip  = fromInt(inboundI);
  const THROUGHPUT = 3 * 0.25; // 3h × 0.25 pos/h = 0.75 pos
  const minPgiI    = Math.ceil(toInt(ip + THROUGHPUT));
  const effPgiI    = Math.max(pgiI, minPgiI);
  const pp         = fromInt(effPgiI);
  const pod        = fromInt(podI);

  // KPI status per scenario
  let sdpaFail = false;
  let wspFail = false;
  let pgiAfterDeparture = false; // missed the operational departure / future OTS gap
  let cteWindowStart = DEPARTURE;
  let cteWindowEnd = DAY1_END;

  if (isBackOrder) {
    sdpaFail = ip >= CUTOFF;
    pgiAfterDeparture = pp >= DEPARTURE;
    // Current WSP measures until 23:59, not against the 18:00 truck departure.
    wspFail = pp >= DAY1_END;
    cteWindowStart = DEPARTURE;
    cteWindowEnd = pgiAfterDeparture ? DAY2_END : DAY1_END;
  }

  if (isNextDay) {
    const createdBeforeCutoff = ip <= CUTOFF;
    if (createdBeforeCutoff) {
      pgiAfterDeparture = pp >= DEPARTURE;
      wspFail = pp >= DAY1_END;
      cteWindowStart = DEPARTURE;
      cteWindowEnd = pgiAfterDeparture ? DAY2_END : DAY1_END;
    } else {
      pgiAfterDeparture = pp >= DAY1_DEPARTURE;
      wspFail = pp >= DAY2_END;
      cteWindowStart = DAY1_DEPARTURE;
      cteWindowEnd = DAY2_END;
    }
  }

  if (isStandard) {
    pgiAfterDeparture = pp >= DAY1_DEPARTURE;
    wspFail = pp >= DAY2_END;
    cteWindowStart = DAY1_DEPARTURE;
    cteWindowEnd = DAY2_END;
  }

  const cteFail = pod >= cteWindowEnd;
  const otsFail = pgiAfterDeparture;
  const otifFail = sdpaFail || otsFail || wspFail || cteFail;

  // Timeline total depends on whether CTE window extends
  const TOTAL = pgiAfterDeparture ? 11 : 9;

  function posToTime(pos) {
    function fmt(rawH) {
      const h = Math.floor(rawH);
      const m = Math.round((rawH - h) * 60);
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    }
    if (pos <= 6)  { return `Day 0 · ${fmt((pos / 6) * 24)}`; }
    if (pos <= 9)  { return `Day 1 · ${fmt(((pos-6) / 3) * 24)}`; }
                   { return `Day 2 · ${fmt(((pos-9) / 2) * 24)}`; }
  }

  const toP = (p) => `${(p / TOTAL) * 100}%`;

  const DAY_BANDS = [
    { from: 0, to: 6,    label: "DAY 0", text: "#16a34a", bg: "rgba(34,197,94,0.18)",  band: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.3)"  },
    { from: 6, to: 9,    label: "DAY 1", text: "#7c3aed", bg: "rgba(124,58,237,0.14)", band: "rgba(124,58,237,0.05)", border: "rgba(124,58,237,0.28)" },
    ...(pgiAfterDeparture ? [
      { from: 9, to: 11, label: "DAY 2", text: "#1565c0", bg: "rgba(59,130,246,0.16)", band: "rgba(59,130,246,0.05)", border: "rgba(59,130,246,0.28)" },
    ] : []),
  ];

  const THRESHOLDS = [
    { pos: SDPA_WINDOW_END, color: T.amber,   style: "dashed", icon: "⏰", label: "14:00 Cutoff",  stagger: 0 },
    { pos: DEPARTURE,       color: "#e65100", style: "dashed", icon: "🚛", label: "18:00 Day 0 Departure", stagger: 1 },
    { pos: 6,               color: "#7c3aed", style: "solid",  icon: "🕛", label: "Day 1 begins",  stagger: 0 },
    ...(!isBackOrder ? [
      { pos: DAY1_DEPARTURE, color: "#e65100", style: "dashed", icon: "🚛", label: "18:00 Day 1 Departure", stagger: 1 },
    ] : []),
    ...(pgiAfterDeparture || !isBackOrder ? [
      { pos: 9,             color: "#1565c0", style: "solid",  icon: "🕛", label: "Day 2 begins",  stagger: 1 },
    ] : []),
  ];

  const pgiClamped = effPgiI > pgiI;

  const KPI_DEFS = [
    {
      id: isBackOrder ? "SDPA" : "DNC", icon: "🚛", color: "#0097a7", label: isBackOrder ? "Inbound Scan" : "Delivery Note Creation",
      from: d0h(6), to: isBackOrder || isNextDay ? SDPA_WINDOW_END : DAY1_DEPARTURE,
      dotPos: ip, fail: sdpaFail,
      dotLabel: posToTime(ip),
      statusNote: isBackOrder
        ? (sdpaFail ? "After 14:00 cutoff — SDPA fails" : "Before 14:00 ✓")
        : isNextDay
          ? (ip <= CUTOFF ? "Created before 14:00 — Day 0 WSP target" : "Created after 14:00 — WSP window until Day 1 18:00")
          : "Today Can Order — WSP window until Day 1 18:00",
    },
    {
      id: "WSP",  icon: "✅", color: "#7c3aed", label: "PGI Scan",
      from: d0h(8), to: isBackOrder || (isNextDay && ip <= CUTOFF) ? DEPARTURE : DAY1_DEPARTURE,
      dotPos: pp, fail: wspFail, clamped: pgiClamped,
      dotLabel: posToTime(pp),
      statusNote: wspFail
        ? "After current WSP measurement end — WSP fails"
        : pgiAfterDeparture
          ? "After 18:00 departure: current WSP is measured at 23:59, so WSP stays green although OTIF turns red. Future OTS — On-time Shipping closes this gap."
          : pgiClamped
            ? `⏱ 3h pick-pack time until loading from delivery creation on — earliest: ${posToTime(ip + THROUGHPUT)}`
            : isBackOrder || (isNextDay && ip <= CUTOFF)
              ? "Before Day 0 18:00 departure ✓"
              : "Before Day 1 18:00 departure ✓",
    },
    {
      id: "CTE",  icon: "📍", color: "#e65100", label: "POD Delivery",
      from: cteWindowStart, to: cteWindowEnd,
      dotPos: pod, fail: cteFail,
      dotLabel: posToTime(pod),
      statusNote: cteWindowStart === DAY1_DEPARTURE
        ? cteFail ? "After Day 2 23:59 — CTE fails" : "CTE starts from Day 1 departure ✓"
        : pgiAfterDeparture
          ? cteFail ? "After Day 2 23:59 — CTE fails" : "+24h window applied ✓ (PGI missed departure)"
          : cteFail ? "After Day 1 23:59 — CTE fails" : "CTE starts from Day 0 departure ✓",
    },
  ];

  const otifColor = otifFail ? T.red   : T.green;
  const otifBg    = otifFail ? T.redLight   : T.greenLight;
  const otifBrd   = otifFail ? T.redBorder  : T.greenBorder;

  // ── Sub-components ──────────────────────────────────

  function ChartHeader() {
    return (
      <div style={{ marginLeft: 88 }}>
        <div style={{ display: "flex", borderRadius: "var(--radius-md) var(--radius-md) 0 0", overflow: "hidden" }}>
          {DAY_BANDS.map((d, i) => (
            <div key={i} style={{ width: `${((d.to - d.from) / TOTAL) * 100}%`, background: d.bg, borderRight: i < DAY_BANDS.length - 1 ? `2px solid ${d.border}` : undefined, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.text }} />
              <span style={{ fontSize: 10, fontWeight: 900, color: d.text, fontFamily: T.fontMono, letterSpacing: "1px" }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: 38, background: T.surfaceRaised, borderBottom: `1px solid ${T.border}` }}>
          {DAY_BANDS.map((d, i) => (
            <div key={i} style={{ position: "absolute", left: `${(d.from / TOTAL) * 100}%`, top: 0, bottom: 0, width: `${((d.to - d.from) / TOTAL) * 100}%`, background: d.band }} />
          ))}
          {THRESHOLDS.map((th, i) => (
            <div key={i} style={{ position: "absolute", left: `${(th.pos / TOTAL) * 100}%`, top: 0, bottom: 0, zIndex: 3 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}` }} />
              <div style={{ position: "absolute", top: th.stagger === 0 ? 3 : 19, left: 3, display: "flex", alignItems: "center", gap: 2, background: "white", border: `1px solid ${th.color}55`, borderRadius: 4, padding: "1px 5px", pointerEvents: "none", zIndex: 5 }}>
                <span style={{ fontSize: 10 }}>{th.icon}</span>
                <span style={{ fontSize: 7.5, fontWeight: 900, color: th.color, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{th.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function KpiBar({ kd }) {
    const lp     = (kd.from / TOTAL) * 100;
    const wp     = ((kd.to - kd.from) / TOTAL) * 100;
    const dotL   = Math.min(Math.max((kd.dotPos / TOTAL) * 100, 0), 105);
    const dotColor  = kd.fail ? T.red : T.green;
    const dotIcon   = kd.fail ? "✗" : "✓";
    const statusBg  = kd.fail ? T.redLight   : T.greenLight;
    const statusBrd = kd.fail ? T.redBorder  : T.greenBorder;
    const isCteLate = kd.id === "CTE" && (pgiAfterDeparture || cteWindowStart === DAY1_DEPARTURE);

    return (
      <div style={{ display: "flex", alignItems: "stretch", overflow: "hidden", borderRadius: "var(--radius-md)", border: `1px solid ${T.border}`, background: T.surface, marginBottom: 4 }}>
        <div style={{ width: 88, flexShrink: 0, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, background: `${kd.color}08`, borderRight: `2px solid ${kd.color}33` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: kd.color }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: kd.color, fontFamily: T.fontMono }}>{kd.id}</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "1px 5px", borderRadius: 4, background: statusBg, border: `1px solid ${statusBrd}`, alignSelf: "flex-start" }}>
            <span style={{ fontSize: 8, fontWeight: 900, color: dotColor, fontFamily: T.fontMono }}>{dotIcon} {kd.fail ? "FAIL" : "OK"}</span>
          </div>
          <span style={{ fontSize: 8, color: dotColor, fontFamily: T.fontMono, fontWeight: 700 }}>{kd.dotLabel}</span>
        </div>
        <div style={{ flex: 1, position: "relative", height: 52, background: T.surfaceRaised, overflow: "hidden" }}>
          {DAY_BANDS.map((d, i) => (
            <div key={i} style={{ position: "absolute", left: `${(d.from / TOTAL) * 100}%`, top: 0, bottom: 0, width: `${((d.to - d.from) / TOTAL) * 100}%`, background: d.band }} />
          ))}
          {THRESHOLDS.map((th, i) => (
            <div key={i} style={{ position: "absolute", left: `${(th.pos / TOTAL) * 100}%`, top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}77`, zIndex: 4 }} />
          ))}
          {/* Hatch outside planned window */}
          {lp > 0 && <div style={{ position: "absolute", left: 0, width: `${lp}%`, top: 0, bottom: 0, background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)", zIndex: 1 }} />}
          {lp + wp < 100 && <div style={{ position: "absolute", left: `${lp + wp}%`, width: `${100 - lp - wp}%`, top: 0, bottom: 0, background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)", zIndex: 1 }} />}
          {/* Planned window */}
          <div style={{ position: "absolute", left: `${lp}%`, width: `${wp}%`, top: 5, bottom: 5, background: `${kd.color}18`, border: `1.5px solid ${kd.color}55`, borderRadius: 4, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
            <span style={{ fontSize: 8, color: kd.color, fontFamily: T.fontMono, fontWeight: 700, opacity: 0.8 }}>
              {isCteLate ? "+24h window" : "planned window"}
            </span>
          </div>
          {/* Window boundary ticks */}
          <div style={{ position: "absolute", left: `${lp}%`, top: 0, bottom: 0, width: 2, background: kd.color, opacity: 0.4, zIndex: 3 }} />
          <div style={{ position: "absolute", left: `${lp + wp}%`, top: 0, bottom: 0, width: 2, background: kd.color, opacity: 0.4, zIndex: 3 }} />
          {/* 3h throughput blocked zone on WSP */}
          {kd.clamped && kd.id === "WSP" && (() => {
            const minL = Math.min((fromInt(minPgiI) / TOTAL) * 100, 100);
            const startL = (kd.from / TOTAL) * 100;
            return (
              <div style={{ position: "absolute", left: `${startL}%`, width: `${minL - startL}%`, top: 0, bottom: 0, background: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(245,158,11,0.15) 4px,rgba(245,158,11,0.15) 8px)", borderRight: `2px dashed ${T.amber}`, zIndex: 3 }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 8, color: T.amber, fontFamily: T.fontMono, fontWeight: 800, whiteSpace: "nowrap", background: "white", padding: "1px 4px", border: `1px solid ${T.amberBorder}`, borderRadius: 3 }}>⏱ 3h</div>
              </div>
            );
          })()}
          {/* Actual dot — can render outside window (past right edge) */}
          <div style={{ position: "absolute", left: `${dotL}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 6, transition: "left 0.1s" }}>
            {kd.fail && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 28, height: 28, borderRadius: "50%", background: `${dotColor}15`, border: `1.5px solid ${dotColor}55`, animation: "pulse 2s infinite" }} />}
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: dotColor, border: "2.5px solid white", boxShadow: `0 0 0 2.5px ${dotColor}55`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, transition: "background 0.2s" }}>
              <span style={{ fontSize: 8, color: "white", fontWeight: 900 }}>{dotIcon}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function SliderCard({ kd, value, min, max, onChange, clampedMin }) {
    const dotColor  = kd.fail ? T.red : T.green;
    const statusBg  = kd.fail ? T.redLight   : T.greenLight;
    const statusBrd = kd.fail ? T.redBorder  : T.greenBorder;
    const isClamped = clampedMin !== undefined && value < clampedMin;
    const borderCol = isClamped ? T.amberBorder : statusBrd;
    return (
      <div style={{ background: T.surface, border: `1.5px solid ${borderCol}`, borderRadius: "var(--radius-md)", padding: "10px 12px", flex: "1 1 0", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>{kd.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: kd.color, fontFamily: T.fontMono, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{kd.id} — {kd.label}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: isClamped ? T.amber : dotColor, fontFamily: T.fontMono, background: isClamped ? T.amberLight : statusBg, border: `1px solid ${isClamped ? T.amberBorder : statusBrd}`, borderRadius: 5, padding: "2px 6px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {kd.dotLabel}
          </span>
        </div>
        {kd.id === "SDPA" && (
          <div style={{ fontSize: 9, color: T.textLight, margin: "-2px 0 5px 21px", lineHeight: 1.25 }}>
            Inbound Scan will trigger delivery note creation as today must
          </div>
        )}
        <input type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(+e.target.value)}
          style={{ width: "100%", accentColor: isClamped ? T.amber : kd.color, cursor: "pointer" }} />
        <div style={{ fontSize: 9.5, color: isClamped ? T.amber : dotColor, marginTop: 4, fontWeight: 600, lineHeight: 1.3 }}>
          {kd.statusNote}
        </div>
      </div>
    );
  }

  // Slider ranges in absolute hour buckets shown as :30 times
  const INBOUND_MIN = 6;   // Day 0 · 06:30
  const INBOUND_MAX = 20;  // Day 0 · 20:30
  const PGI_MIN     = 8;   // Day 0 · 08:30
  const PGI_MAX     = isBackOrder ? 23 : 47;  // Day 0 · 23:30 or Day 1 · 23:30
  const POD_MIN     = 24;  // Day 1 · 00:30
  const POD_MAX     = (pgiAfterDeparture || cteWindowStart === DAY1_DEPARTURE) ? 71 : 47; // Day 2 · 23:30 or Day 1 · 23:30

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", background: T.bg }}>
      <div style={{ background: T.navyMid, padding: "20px 16px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 10, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>Module 5 · Interactive</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: T.fontDisplay, marginBottom: 6 }}>KPI Simulator</h1>
          <p style={{ fontSize: 12, color: "#8eaac8", lineHeight: 1.6 }}>Drag the sliders to set actual event times. Dots move live — see which KPIs flip red.</p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 12px" }}>

        {/* Scenario selector */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 14 }}>
          {[
            { id: "backorder", title: "1) Back-Order", desc: "Item is not on stock", color: T.blue },
            { id: "nextday", title: "2a) All Items on Stock – Next-Day", desc: "Today Must Order", color: T.green },
            { id: "standard", title: "2b) All Items on Stock – Standard", desc: "Today Can Order", color: "#7c3aed" },
          ].map(opt => {
            const active = scenario === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setScenario(opt.id)}
                style={{
                  textAlign: "left",
                  padding: "11px 12px",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${active ? opt.color : T.border}`,
                  background: active ? `${opt.color}14` : T.surface,
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  color: T.text,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: active ? opt.color : T.text, fontFamily: T.fontDisplay }}>{opt.title}</div>
                <div style={{ fontSize: 10, color: T.textLight, marginTop: 3 }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 12, padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "var(--radius-md)", fontSize: 11, color: T.textMed, lineHeight: 1.5 }}>
          {isBackOrder && "Back-Order keeps the original simulation: inbound scan triggers delivery note creation as Today Must; operational departure target is Day 0 18:00."}
          {isNextDay && "Next-Day: Delivery Note Creation before 14:00 must reach WSP / PGI on Day 0. After 14:00, the WSP window runs until Day 1 18:00 and CTE starts from Day 1 departure."}
          {isStandard && "Standard: regardless of the Day 0 creation time, the WSP window runs until Day 1 18:00 and CTE starts from Day 1 departure."}
        </div>

        {/* Sliders */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }} className="slider-stack">
          <SliderCard kd={KPI_DEFS[0]} value={inboundI} min={INBOUND_MIN} max={INBOUND_MAX} onChange={setInboundI} />
          <SliderCard kd={KPI_DEFS[1]} value={pgiI}     min={PGI_MIN}     max={PGI_MAX}     onChange={setPgiI} clampedMin={minPgiI} />
          <SliderCard kd={KPI_DEFS[2]} value={podI}     min={POD_MIN}     max={POD_MAX}     onChange={(v) => setPodI(Math.min(v, POD_MAX))} />
        </div>

        {/* CTE extension notice */}
        {(pgiAfterDeparture || cteWindowStart === DAY1_DEPARTURE) && (
          <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fff3e0", border: `1px solid ${T.amberBorder}`, borderLeft: `3px solid ${T.amber}`, borderRadius: "var(--radius-md)", fontSize: 11, color: T.amber, fontWeight: 600 }}>
            🚛 CTE starts from the valid departure window. For late Next-Day or Standard deliveries this means Day 1 departure and a Day 2 delivery window.
          </div>
        )}

        {/* Chart */}
        <div style={{ background: T.surface, borderRadius: "var(--radius-lg)", border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <ChartHeader />
          <div style={{ padding: "10px 12px" }}>
            {/* OTIF */}
            <div style={{ position: "relative", height: 24, marginBottom: 8 }}>
              {THRESHOLDS.map((th, i) => (
                <div key={i} style={{ position: "absolute", left: `${(th.pos / TOTAL) * 100}%`, top: 0, bottom: 0, width: 0, borderLeft: `1.5px ${th.style} ${th.color}55`, zIndex: 4 }} />
              ))}
              <div style={{ position: "absolute", left: 0, right: 0, top: 3, bottom: 3, background: `${otifColor}12`, border: `1.5px solid ${otifColor}55`, borderRadius: 5, transition: "all 0.3s" }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: otifColor, borderRadius: "4px 0 0 4px", transition: "background 0.3s" }} />
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: otifColor, borderRadius: "0 4px 4px 0", transition: "background 0.3s" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: otifColor, border: "2px solid white" }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: otifColor, fontFamily: T.fontMono }}>
                  OTIF {otifFail ? "❌ Red — promise at risk" : "✅ Green — promise intact"}
                </span>
              </div>
            </div>
            {/* KPI bars */}
            {KPI_DEFS.map(kd => <KpiBar key={kd.id} kd={kd} />)}

            {/* KPI status overview */}
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              {[
                { label: KPI_DEFS[0].id, ok: !sdpaFail, note: KPI_DEFS[0].id === "SDPA" ? "Inbound / SDPA" : "Creation" },
                { label: "WSP", ok: !wspFail, note: "Current 23:59 logic" },
                { label: "OTS", ok: !otsFail, note: "Future on-time shipping" },
                { label: "CTE", ok: !cteFail, note: "Transport promise" },
                { label: "OTIF", ok: !otifFail, note: "End-to-end promise" },
              ].map(kpi => (
                <div key={kpi.label} style={{ padding: "8px 9px", borderRadius: "var(--radius-md)", background: kpi.ok ? T.greenLight : T.redLight, border: `1px solid ${kpi.ok ? T.greenBorder : T.redBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: kpi.ok ? T.green : T.red, fontFamily: T.fontMono }}>{kpi.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 900, color: kpi.ok ? T.green : T.red }}>{kpi.ok ? "🟢 Green" : "🔴 Red"}</span>
                  </div>
                  <div style={{ fontSize: 8.5, color: T.textLight, marginTop: 3, lineHeight: 1.25 }}>{kpi.note}</div>
                </div>
              ))}
            </div>

            {/* Legend + reset */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {[[T.green,"✓","OK — inside window"],[T.red,"✗","FAIL — outside window"]].map(([col, icon, lbl]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.textLight }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: col, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 6.5, color: "white", fontWeight: 900 }}>{icon}</span>
                  </div>
                  {lbl}
                </div>
              ))}
              <button onClick={() => { setInboundI(8); setPgiI(15); setPodI(36); }}
                style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${T.border}`, background: T.surface, color: T.textMed, fontSize: 11, cursor: "pointer", fontFamily: T.fontSans, fontWeight: 600 }}>
                ↺ Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SPLASH SCREEN — Entry point explaining the Academy
// ═══════════════════════════════════════════════════════

function SplashScreen({ onEnter }) {
  const MODULES = [
    {
      icon: "🎓",
      color: "#60b4ff",
      accent: "rgba(96,180,255,0.15)",
      accentBorder: "rgba(96,180,255,0.3)",
      label: "MODULE 1",
      title: "Onboarding",
      subtitle: "Order to Payment — Happy Flow",
      desc: "For new team members. Walk step-by-step through the complete order-to-delivery process — from customer order through SAP, ORTEC, TMS and EWM to final delivery.",
    },
    {
      icon: "🔬",
      color: "#fb923c",
      accent: "rgba(251,146,60,0.15)",
      accentBorder: "rgba(251,146,60,0.3)",
      label: "MODULE 2",
      title: "Exception Lab",
      subtitle: "Known Process Gaps",
      desc: "Learn why delivery promises fail — even when dashboards show green. Inbound timing, wrong truck loading, split deliveries and their KPI impact.",
    },
    {
      icon: "📊",
      color: "#a78bfa",
      accent: "rgba(167,139,250,0.15)",
      accentBorder: "rgba(167,139,250,0.3)",
      label: "MODULE 3",
      title: "KPI Overview",
      subtitle: "Understanding Current KPIs",
      desc: "The measurement windows of CPA, SDPA, WSP, CTE and OTIF — where each KPI starts, where it ends, and why they can show green while the customer is dissatisfied.",
    },
    {
      icon: "🧪",
      color: "#34d399",
      accent: "rgba(52,211,153,0.15)",
      accentBorder: "rgba(52,211,153,0.3)",
      label: "MODULE 4",
      title: "KPI Simulator",
      subtitle: "Experience KPI Dependencies",
      desc: "Drag timestamps on the timeline and watch live how SDPA, WSP, OTS, CTE and OTIF react. The best tool for building intuition around KPI interdependencies.",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      boxSizing: "border-box",
      background: "linear-gradient(160deg, #050d1a 0%, #0a1628 45%, #0d2040 75%, #091422 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "36px 16px 56px",
      overflowX: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .splash-grid { display: grid; grid-template-columns: 1fr; gap: 12px; width: 100%; max-width: 840px; }
        @media (min-width: 600px) { .splash-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, animation: "fadeUp 0.4s ease both", width: "100%", maxWidth: 840 }}>
        <div style={{ width: 40, height: 40, background: T.blue, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 0 24px rgba(21,101,192,0.45)" }}>DL</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: T.fontDisplay }}>Digital Logistics Academy</div>
          <div style={{ fontSize: 10, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "0.8px" }}>ENTERPRISE LEARNING PLATFORM</div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center", width: "100%", maxWidth: 560, marginBottom: 12, animation: "fadeUp 0.5s 0.05s ease both" }}>
        <h1 style={{ fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 800, color: "white", fontFamily: T.fontDisplay, lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 14 }}>
          Welcome to the<br /><span style={{ color: "#60b4ff" }}>Logistics Academy</span>
        </h1>
        <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", color: "#8eaac8", lineHeight: 1.7, margin: "0 auto" }}>
          An interactive learning platform to understand our{" "}
          <strong style={{ color: "rgba(255,255,255,0.8)" }}>Order-to-Payment process</strong>,{" "}
          <strong style={{ color: "rgba(255,255,255,0.8)" }}>systems</strong> and{" "}
          <strong style={{ color: "rgba(255,255,255,0.8)" }}>KPIs</strong>.
        </p>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 28px", animation: "fadeUp 0.5s 0.1s ease both" }}>
        <div style={{ height: 1, width: 40, background: "rgba(255,255,255,0.1)" }} />
        <span style={{ fontSize: 10, color: "#8eaac8", fontFamily: T.fontMono, letterSpacing: "1.5px", textTransform: "uppercase" }}>4 Learning Modules</span>
        <div style={{ height: 1, width: 40, background: "rgba(255,255,255,0.1)" }} />
      </div>

      {/* Module cards */}
      <div className="splash-grid" style={{ animation: "fadeUp 0.5s 0.15s ease both" }}>
        {MODULES.map((m) => (
          <div key={m.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 16,
            padding: "20px 18px",
            boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: m.accent, border: `1px solid ${m.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "inline-block", background: m.accent, border: `1px solid ${m.accentBorder}`, borderRadius: 20, padding: "1px 9px", fontSize: 9.5, color: m.color, fontFamily: T.fontMono, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white", fontFamily: T.fontDisplay, lineHeight: 1.2 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: m.color, fontWeight: 600, marginTop: 1 }}>{m.subtitle}</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 36, animation: "fadeUp 0.5s 0.25s ease both", width: "100%", maxWidth: 360 }}>
        <button
          onClick={onEnter}
          style={{ width: "100%", padding: "16px 0", borderRadius: 14, background: T.blue, border: "none", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: T.fontDisplay, boxShadow: "0 4px 20px rgba(21,101,192,0.45)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#1976d2"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.blue; e.currentTarget.style.transform = "none"; }}
        >
          Enter Academy →
        </button>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", fontFamily: T.fontMono, textAlign: "center", lineHeight: 1.4 }}>
          🚧 Work in Progress — content is continuously being expanded
        </div>
      </div>
    </div>
  );
}

// ROOT APP
// ═══════════════════════════════════════════════════════

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState("home");

  if (showSplash) {
    return (
      <div>
        <style>{GLOBAL_CSS}</style>
        <SplashScreen onEnter={() => setShowSplash(false)} />
      </div>
    );
  }

  return (
    <div>
      <style>{GLOBAL_CSS}</style>
      <TopNav view={view} setView={setView} />
      {view === "home" && <HomeScreen setView={setView} />}
      {view === "onboarding" && <OnboardingModule />}
      {view === "exceptions" && <ExceptionLabModule />}
      {view === "kpi" && <KpiUnderstandingModule />}
      {view === "newkpi" && <NewKpiLogicModule />}
      {view === "simulator" && <KpiSimulatorModule />}
    </div>
  );
}
