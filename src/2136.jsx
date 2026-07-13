import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

/* ============================================================
   Parcel Labelling Strategy Simulator — Order Order C
   Three scenarios, one packing area, timeline-driven MVP
   ============================================================ */

// ---------- Design tokens ----------
const C = {
  bg: "#0d1219",
  panel: "#141b25",
  panel2: "#1a2331",
  line: "#26313f",
  text: "#e8edf4",
  dim: "#8fa0b5",
  green: "#3ddc84",
  orange: "#ff8c42",
  yellow: "#ffd166",
  blue: "#4da3ff",
  red: "#ff5c5c",
  cardboard: 0xc9975b,
};

// ---------- Timeline data ----------
// Waypoint path: [t, x, y, z]; parcel invisible before spawn.
const CONV_Y = 0.78;
const TABLE_Y = 1.18;
const MACHINE_X = 12;
const CONV_END = 27;
const CONV_START = -15.5;

// Three packing stations: one station for each ORTEC package-count proposal
const STATIONS = [
  { id: "1P-01", x: -9.0, z: 3.2, cap: 1 },
  { id: "2P-01", x: -3.5, z: 3.2, cap: 2 },
  { id: "3P-01", x: 2.0, z: 3.2, cap: 3 },
];

// Clearly differentiated order colors and direct ORTEC station assignment
const ORDERS = [
  { key: "A", count: 1, color: "#00c8ff", station: 0 },
  { key: "B", count: 2, color: "#ffd166", station: 1 },
  { key: "C", count: 3, color: "#e44cff", station: 2 },
];
const entryX = (st) => STATIONS[st].x + 1.5; // where the chute meets the conveyor

function ride(t0, xFrom, xTo, speed = 2.5) {
  return t0 + Math.abs(xTo - xFrom) / speed;
}

function buildScenario(n) {
  const parcels = [];
  const messages = [];
  const scans = [];
  let duration = 25;
  let keyMessage = "";

  const packPath = (st, spawn, end) => {
    const S = STATIONS[st];
    return [[spawn, S.x, TABLE_Y, S.z], [end, S.x, TABLE_Y, S.z]];
  };
  const toConv = (st, tStart, tEnd) => {
    const S = STATIONS[st];
    return [
      [tStart, S.x, TABLE_Y, S.z],
      [tStart + (tEnd - tStart) * 0.5, S.x + 0.9, CONV_Y + 0.25, 1.5],
      [tEnd, entryX(st), CONV_Y, 0],
    ];
  };
  const base = (oi, idx, extra) => {
    const O = ORDERS[oi];
    return {
      st: O.station,
      order: O.key,
      orderSize: O.count,
      color: O.color,
      id: `P-${O.key}-0${idx}`,
      name: `${O.key}-${idx}`,
      ...extra,
    };
  };
  // parcel sizes per station
  const SZ = {
    A1: [0.9, 0.7, 0.8],
    B1: [0.7, 0.55, 0.7], B2: [1.0, 0.6, 0.8],
    C1: [0.75, 0.6, 0.75], C2: [0.95, 0.5, 0.8], C3: [1.25, 0.95, 0.9], C3s: [1.1, 0.85, 0.85], C4: [0.85, 0.65, 0.8],
  };

  const pushSimple = (d, labels) => {
    const tEnter = d.move + 1.5;
    const tExit = ride(tEnter, entryX(d.st), CONV_END);
    parcels.push({
      ...d,
      path: [...packPath(d.st, d.spawn, d.move), ...toConv(d.st, d.move, tEnter).slice(1), [tExit, CONV_END, CONV_Y, 0]],
      labels,
      finalT: null, conveyor: [tEnter, tExit], loop: [], stagingIv: null,
    });
    return { tEnter, tExit };
  };

  if (n === 1) {
    duration = 25;
    keyMessage = "Fast parcel flow from all stations, but the final parcel count is unknown during early label generation.";
    // Station A — order Order A, 1 parcel
    const a1 = base(0, 1, { size: SZ.A1, spawn: 1, packEnd: 3.5, labelT: 3.7, seq: "1/X", move: 4.1 });
    pushSimple(a1, [[a1.labelT, "1/X", C.orange, "count unknown"]]);
    // Station B — order Order B, 2 parcels
    const b1 = base(1, 1, { size: SZ.B1, spawn: 0, packEnd: 2.5, labelT: 2.7, seq: "1/X", move: 3.1 });
    const b2 = base(1, 2, { size: SZ.B2, spawn: 5, packEnd: 7.5, labelT: 7.7, seq: "2/X", move: 8.1 });
    pushSimple(b1, [[b1.labelT, "1/X", C.orange, "count unknown"]]);
    pushSimple(b2, [[b2.labelT, "2/X", C.orange, "count unknown"]]);
    // Station C — order Order C, 3 parcels
    const c1 = base(2, 1, { size: SZ.C1, spawn: 0, packEnd: 3, labelT: 3.2, seq: "1/X", move: 3.6 });
    const c2 = base(2, 2, { size: SZ.C2, spawn: 4, packEnd: 7, labelT: 7.3, seq: "2/X", move: 7.8 });
    const c3 = base(2, 3, { size: SZ.C3, spawn: 8.5, packEnd: 11.5, labelT: 11.8, seq: "3/X", move: 12.3 });
    pushSimple(c1, [[c1.labelT, "1/X", C.orange, "count unknown"]]);
    pushSimple(c2, [[c2.labelT, "2/X", C.orange, "count unknown"]]);
    pushSimple(c3, [[c3.labelT, "3/X", C.orange, "count unknown"]]);

    messages.push([0, "3 stations packing in parallel: Order A (1 pc) · Order B (2 pcs) · Order C (3 pcs)"]);
    messages.push([2.7, "Order B: label 1/X printed — parcel count unknown at print time", "warn"]);
    messages.push([3.7, "Order A: label 1/X — even the single-parcel order prints an open count", "warn"]);
    messages.push([7.7, "Order B fully packed — but labels already left as 1/X · 2/X", "warn"]);
    messages.push([11.8, "Order C: all parcels packed — count known only now", "ok"]);
    messages.push([13, "All orders packed: 6 parcels released immediately, counts confirmed late", "ok"]);
  }

  if (n === 2) {
    duration = 31;
    keyMessage = "Correct final numbering for every order, but multi-parcel orders wait in the packing area — the more parcels, the longer the wait.";
    const SLOTS = [
      [{ x: -9.0, z: 5.2 }],
      [{ x: -4.2, z: 5.2 }, { x: -2.8, z: 5.2 }],
      [{ x: 0.6, z: 5.2 }, { x: 2.0, z: 5.2 }, { x: 3.4, z: 5.2 }],
    ];
    const pushStaged = (d, slot, finalLabel) => {
      const s = slot;
      const tEnter = d.release + 1.5;
      const tExit = ride(tEnter, entryX(d.st), CONV_END);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.st, d.spawn, d.packEnd + 0.2),
          [d.stageIn, s.x, 0.55 + d.size[1] / 2, s.z],
          [d.release, s.x, 0.55 + d.size[1] / 2, s.z],
          [d.release + 0.7, (s.x + entryX(d.st)) / 2, CONV_Y + 0.3, 2.4],
          [tEnter, entryX(d.st), CONV_Y, 0],
          [tExit, CONV_END, CONV_Y, 0],
        ],
        labels: [[d.finalT, finalLabel, C.green, "final label"]],
        conveyor: [tEnter, tExit], loop: [], stagingIv: [d.stageIn, d.release],
      });
    };
    // A — complete after one parcel: near-zero penalty
    const a1 = base(0, 1, { size: SZ.A1, spawn: 0.5, packEnd: 3, stageIn: 4.2, finalT: 5.2, release: 6 });
    pushStaged(a1, SLOTS[0][0], "1/1");
    // B — first parcel waits for the second
    const b1 = base(1, 1, { size: SZ.B1, spawn: 0, packEnd: 3, stageIn: 4.4, finalT: 9.8, release: 11.5 });
    const b2 = base(1, 2, { size: SZ.B2, spawn: 4.5, packEnd: 7.5, stageIn: 8.9, finalT: 10.4, release: 12.2 });
    pushStaged(b1, SLOTS[1][0], "1/2");
    pushStaged(b2, SLOTS[1][1], "2/2");
    // C — as before
    const c1 = base(2, 1, { size: SZ.C1, spawn: 0, packEnd: 3, stageIn: 4.4, finalT: 13, release: 16 });
    const c2 = base(2, 2, { size: SZ.C2, spawn: 4, packEnd: 7, stageIn: 8.4, finalT: 13.7, release: 16.8 });
    const c3 = base(2, 3, { size: SZ.C3, spawn: 8, packEnd: 11, stageIn: 12.4, finalT: 14.4, release: 17.6 });
    pushStaged(c1, SLOTS[2][0], "1/3");
    pushStaged(c2, SLOTS[2][1], "2/3");
    pushStaged(c3, SLOTS[2][2], "3/3");

    messages.push([0, "3 stations packing — parcels consolidate per order before labelling"]);
    messages.push([4.2, "Order A staged — order already complete with 1 parcel", "info"]);
    messages.push([5.2, "Order A: label 1/1 printed — near-zero waiting for single-parcel orders", "ok"]);
    messages.push([4.4, "B-1 and C-1 wait unlabelled in the consolidation area", "warn"]);
    messages.push([9.1, "Order B complete: 2 of 2 packed", "ok"]);
    messages.push([9.8, "Order B: printing final labels 1/2 · 2/2, releasing together", "ok"]);
    messages.push([12.5, "Order C complete: 3 of 3 packed", "ok"]);
    messages.push([13, "Order C: printing final labels 1/3 · 2/3 · 3/3", "ok"]);
    messages.push([16, "Order C released together — first parcel waited ~12s in staging", "warn"]);
  }

  if (n === 3) {
    duration = 32;
    keyMessage = "Immediate release from all stations with correct numbering downstream — but every incomplete order sends parcels through the recirculation loop.";
    const loopFrom = (t0) => [
      [t0, MACHINE_X, CONV_Y, 0],
      [t0 + 0.6, MACHINE_X + 1.5, CONV_Y, 0],
      [t0 + 2.3, MACHINE_X + 1.5, CONV_Y, -4.2],
      [t0 + 5.5, MACHINE_X - 6.5, CONV_Y, -4.2],
      [t0 + 7.2, MACHINE_X - 6.5, CONV_Y, 0],
      [t0 + 9.8, MACHINE_X, CONV_Y, 0],
    ];
    const mk = (d) => ({ ...d, tEnter: d.move + 1.5, tArr: ride(d.move + 1.5, entryX(d.st), MACHINE_X) });
    const build = (d, seq, loops) => {
      let path = [...packPath(d.st, d.spawn, d.move), ...toConv(d.st, d.move, d.tEnter).slice(1), [d.tArr, MACHINE_X, CONV_Y, 0]];
      let t = d.tArr + 1.0;
      path.push([t, MACHINE_X, CONV_Y, 0]);
      const loopIv = [];
      for (let i = 0; i < loops; i++) {
        path = path.concat(loopFrom(t).slice(1));
        loopIv.push([t, t + 9.8]);
        t += 9.8;
        path.push([t + 1.0, MACHINE_X, CONV_Y, 0]);
        t += 1.0;
      }
      const finalT = t;
      const tExit = ride(t + 0.2, MACHINE_X, CONV_END);
      path.push([tExit, CONV_END, CONV_Y, 0]);
      return {
        ...d, path, seq, finalT,
        labels: [[d.interimT, "INTERIM", C.blue, d.id], [finalT, seq, C.green, "final label"]],
        conveyor: [d.tEnter, tExit], loop: loopIv, stagingIv: null,
      };
    };
    // A — single parcel: order complete at its own interim, no loop ever
    const a1 = mk(base(0, 1, { size: SZ.A1, spawn: 2, packEnd: 4.5, interimT: 4.7, move: 5.1 }));
    // B — first parcel loops once (second parcel packed late)
    const b1 = mk(base(1, 1, { size: SZ.B1, spawn: 0, packEnd: 2.5, interimT: 2.7, move: 3.1 }));
    const b2 = mk(base(1, 2, { size: SZ.B2, spawn: 8, packEnd: 10.5, interimT: 10.7, move: 11 }));
    // C — parcels 1 & 2 loop once, parcel 3 completes the order
    const c1 = mk(base(2, 1, { size: SZ.C1, spawn: 0, packEnd: 3, interimT: 3.2, move: 3.6 }));
    const c2 = mk(base(2, 2, { size: SZ.C2, spawn: 4, packEnd: 7, interimT: 7.2, move: 7.6 }));
    const c3 = mk(base(2, 3, { size: SZ.C3, spawn: 8, packEnd: 11, interimT: 11.2, move: 11.6 }));

    const pA = build(a1, "1/1", 0);
    const pB1 = build(b1, "1/2", 1);
    const pB2 = build(b2, "2/2", 0);
    const pC1 = build(c1, "1/3", 1);
    const pC2 = build(c2, "2/3", 1);
    const pC3 = build(c3, "3/3", 0);
    parcels.push(pA, pB1, pB2, pC1, pC2, pC3);

    scans.push(c1.tArr, b1.tArr, c2.tArr, a1.tArr, c3.tArr, b2.tArr, pC1.finalT - 1, pB1.finalT - 1, pC2.finalT - 1);

    messages.push([0, "3 stations packing — every parcel gets an interim label and leaves immediately"]);
    messages.push([c1.interimT, "C-1: interim label — final pending", "info"]);
    messages.push([c1.tArr, "Scan C-1: order 1 of 3 registered → loop", "warn"]);
    messages.push([b1.tArr, "Scan B-1: order 1 of 2 registered → loop", "warn"]);
    messages.push([c2.tArr, "Scan C-2: order 2 of 3 registered → loop", "warn"]);
    messages.push([a1.tArr, "Scan A-1: single-parcel order complete → final 1/1, no loop", "ok"]);
    messages.push([c3.interimT, "Order Order C complete: 3 of 3 registered", "ok"]);
    messages.push([c3.tArr, "Scan C-3: order complete → final 3/3 applied", "ok"]);
    messages.push([b2.tArr, "Scan B-2: order complete → final 2/2 applied", "ok"]);
    messages.push([pC1.finalT, "C-1 back from loop → final 1/3", "ok"]);
    messages.push([pB1.finalT, "B-1 back from loop → final 1/2", "ok"]);
    messages.push([pC2.finalT, "C-2 back from loop → final 2/3", "ok"]);
  }

  if (n === 4) {
    duration = 28;
    keyMessage = "Ortec-predicted labels are instantly correct for well-modelled orders \u2014 only the mispredicted order needs detection, diversion, and relabelling.";
    const DEV_T = 8.0; // deviation detected while packing C-3
    const relabelDetour = (tArr) => {
      const tScan = tArr + 1.0;
      return {
        pts: [
          [tScan, MACHINE_X, CONV_Y, 0],
          [tScan + 1.4, MACHINE_X, CONV_Y, 3.4],
          [tScan + 2.6, MACHINE_X + 3, CONV_Y, 3.4],
          [tScan + 4.8, MACHINE_X + 3, CONV_Y, 3.4],
          [tScan + 6.2, MACHINE_X + 6, CONV_Y, 3.4],
          [tScan + 7.6, MACHINE_X + 6, CONV_Y, 0],
        ],
        relabelT: tScan + 3.6,
        rejoinT: tScan + 7.6,
      };
    };
    const mk = (d) => ({ ...d, tEnter: d.move + 1.5, tArr: ride(d.move + 1.5, entryX(d.st), MACHINE_X) });
    const passThrough = (d, label, sub) => {
      const tPass = d.tArr + 1.0;
      const tExit = ride(tPass, MACHINE_X, CONV_END);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.st, d.spawn, d.move), ...toConv(d.st, d.move, d.tEnter).slice(1),
          [d.tArr, MACHINE_X, CONV_Y, 0], [tPass, MACHINE_X, CONV_Y, 0], [tExit, CONV_END, CONV_Y, 0],
        ],
        labels: [[d.labelT, label, C.green, sub]],
        seq: label, finalT: d.labelT, plan: d.plan,
        conveyor: [d.tEnter, tExit], loop: [], stagingIv: null, relabelIv: null,
      });
    };
    // A — proposal 1 parcel: correct
    const a1 = mk(base(0, 1, { size: SZ.A1, spawn: 0, packEnd: 2.5, labelT: 2.7, move: 3.1, plan: 1 }));
    passThrough(a1, "1/1", "Ortec proposal \u2713");
    // B — proposal 2 parcels: correct
    const b1 = mk(base(1, 1, { size: SZ.B1, spawn: 0.5, packEnd: 3, labelT: 3.2, move: 3.6, plan: 2 }));
    const b2 = mk(base(1, 2, { size: SZ.B2, spawn: 4.5, packEnd: 7, labelT: 7.2, move: 7.6, plan: 2 }));
    passThrough(b1, "1/2", "Ortec proposal \u2713");
    passThrough(b2, "2/2", "Ortec proposal \u2713");
    // C — proposal 3 parcels, actual 4: parcels 1 & 2 relabelled, 3 & 4 corrected at source
    const c1 = mk(base(2, 1, { size: SZ.C1, spawn: 0, packEnd: 3, labelT: 3.2, move: 3.6, plan: 3 }));
    const c2 = mk(base(2, 2, { size: SZ.C2, spawn: 3.2, packEnd: 6.2, labelT: 6.4, move: 6.8, plan: 3 }));
    [c1, c2].forEach((d, i) => {
      const det = relabelDetour(d.tArr);
      const tExit = ride(det.rejoinT + 0.2, MACHINE_X + 6, CONV_END);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.st, d.spawn, d.move), ...toConv(d.st, d.move, d.tEnter).slice(1),
          [d.tArr, MACHINE_X, CONV_Y, 0], ...det.pts, [tExit, CONV_END, CONV_Y, 0],
        ],
        labels: [
          [d.labelT, `${i + 1}/3`, C.green, "Ortec proposal"],
          [DEV_T, `${i + 1}/3`, C.red, "label incorrect", true],
          [det.relabelT, `${i + 1}/4`, C.green, "relabelled"],
        ],
        seq: `${i + 1}/4`, finalT: det.relabelT, plan: 3,
        conveyor: [d.tEnter, tExit], loop: [], stagingIv: null,
        relabelIv: [det.pts[0][0], det.rejoinT],
      });
      messages.push([d.tArr, `Verify scan C-${i + 1}: label ${i + 1}/3 ≠ actual count 4 → relabeling`, "err"]);
      messages.push([det.relabelT, `C-${i + 1} relabelled ${i + 1}/4 — returning to main line`, "ok"]);
    });
    const c3 = mk(base(2, 3, { size: SZ.C3s, spawn: 7.5, packEnd: 10.5, labelT: 10.7, move: 11.1, plan: 3 }));
    const c4 = mk(base(2, 4, { size: SZ.C4, spawn: 11, packEnd: 13.5, labelT: 13.7, move: 14.1, plan: 3 }));
    passThrough(c3, "3/4", "corrected count");
    passThrough(c4, "4/4", "corrected count");
    parcels.forEach((p) => { if (p.order === "C") p.devT = DEV_T; });

    scans.push(c1.tArr, b1.tArr, a1.tArr, c2.tArr, b2.tArr, c3.tArr, c4.tArr);

    messages.push([0, "Ortec packing proposal from master data: A\u21921 \u00b7 B\u21922 \u00b7 C\u21923 parcels \u2014 final labels printed directly at pack", "info"]);
    messages.push([2.7, "Order A: label 1/1 per Ortec proposal — released", "ok"]);
    messages.push([3.2, "B-1 (1/2) and C-1 (1/3) labelled per proposal", "ok"]);
    messages.push([DEV_T, "Deviation at Order C: contents exceed Ortec proposal → split, actual count = 4", "err"]);
    messages.push([a1.tArr, "Verify scan A-1: label matches → passes", "ok"]);
    messages.push([b2.tArr, "Verify scan B-2: label matches → passes", "ok"]);
    messages.push([c3.labelT, "C-3 labelled 3/4 with corrected count", "ok"]);
    messages.push([c3.tArr, "Verify scan C-3: label matches → passes", "ok"]);
    messages.push([c4.labelT, "C-4 labelled 4/4 — order fully packed", "ok"]);
  }

  // S2-S4: prepend Ortec-routed infeed — totes travel the supply line to the
  // capacity-matched station before packing starts (everything else shifts by OFF)
  if (n >= 2) {
    const OFF = 5;
    parcels.forEach((p) => {
      ["spawn", "packEnd", "move", "labelT", "interimT", "finalT", "stageIn", "release", "tEnter", "tArr", "devT"].forEach((k) => {
        if (typeof p[k] === "number") p[k] += OFF;
      });
      p.path = p.path.map((w) => [w[0] + OFF, w[1], w[2], w[3]]);
      p.labels = p.labels.map((L) => [L[0] + OFF, ...L.slice(1)]);
      p.conveyor = [p.conveyor[0] + OFF, p.conveyor[1] + OFF];
      p.loop = p.loop.map(([a, b]) => [a + OFF, b + OFF]);
      if (p.stagingIv) p.stagingIv = [p.stagingIv[0] + OFF, p.stagingIv[1] + OFF];
      if (p.relabelIv) p.relabelIv = [p.relabelIv[0] + OFF, p.relabelIv[1] + OFF];
    });
    for (let i = 0; i < messages.length; i++) messages[i] = [messages[i][0] + OFF, ...messages[i].slice(1)];
    for (let i = 0; i < scans.length; i++) scans[i] += OFF;
    duration += OFF;

    const SPINE_Z = 7.6, SRC_X = 5.4, TS = 4;
    ORDERS.forEach((O, oi) => {
      const bx = STATIONS[O.station].x;
      const dep = oi * 0.7;
      const tSpine = dep + Math.abs(SRC_X - bx) / TS;
      const tArr2 = tSpine + 1.0;
      parcels.push({
        tote: true, st: O.station, order: O.key, color: O.color, id: `TOTE-${O.key}`,
        spawn: dep, despawn: tArr2 + 0.25, packEnd: -1, move: -1,
        size: [1.05, 0.5, 0.75],
        path: [
          [dep, SRC_X, CONV_Y + 0.06, SPINE_Z],
          [tSpine, bx, CONV_Y + 0.06, SPINE_Z],
          [tArr2, bx, 1.0, 4.0],
        ],
        labels: [], conveyor: [1e9, 1e9], loop: [], stagingIv: null,
      });
    });
    messages.unshift([0, "Ortec proposal routes infeed: Order A \u2192 1-pc station \u00b7 Order B \u2192 2-pc station \u00b7 Order C \u2192 3-pc station", "info"]);
  }

  messages.sort((a, b) => a[0] - b[0]);
  return { n, duration, parcels, messages, scans, keyMessage };
}

const SCENARIOS = {
  1: { title: "Immediate Final Label", short: "S1" },
  2: { title: "Consolidated Labelling", short: "S2" },
  3: { title: "Interim Label + Auto Relabelling", short: "S3" },
  4: { title: "Ortec Proposal Labels", short: "S4" },
};

// ---------- path interpolation ----------
function posAt(path, t) {
  if (t <= path[0][0]) return path[0];
  const last = path[path.length - 1];
  if (t >= last[0]) return last;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
      return [t, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  return last;
}

// ---------- canvas label sprite ----------
function makeLabelTexture(main, sub, color) {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = "rgba(13,18,25,0.92)";
  roundRect(g, 4, 4, 248, 120, 14); g.fill();
  g.strokeStyle = color; g.lineWidth = 5;
  roundRect(g, 4, 4, 248, 120, 14); g.stroke();
  g.fillStyle = color;
  g.font = `bold ${main.length > 9 ? 30 : 44}px 'IBM Plex Mono', monospace`;
  g.textAlign = "center";
  g.fillText(main, 128, 58);
  g.fillStyle = "#c7d2e0";
  g.font = "22px 'IBM Plex Mono', monospace";
  g.fillText(sub || "", 128, 96);
  const tx = new THREE.CanvasTexture(cv);
  return tx;
}
// interim label rendered as a barcode sticker
function makeBarcodeTexture(orderColor) {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = "#f2f4f7";
  roundRect(g, 4, 4, 248, 120, 10); g.fill();
  g.strokeStyle = orderColor; g.lineWidth = 5;
  roundRect(g, 4, 4, 248, 120, 10); g.stroke();
  // order color stripe
  g.fillStyle = orderColor;
  g.fillRect(10, 10, 236, 12);
  // barcode bars (deterministic pattern)
  g.fillStyle = "#0d1219";
  let x = 22;
  const widths = [3, 6, 2, 5, 3, 2, 7, 3, 4, 2, 6, 3, 2, 5, 4, 3, 6, 2, 4, 5, 2, 3, 6, 4, 2, 5, 3];
  for (let i = 0; i < widths.length && x < 230; i++) {
    g.fillRect(x, 30, widths[i], 56);
    x += widths[i] + (i % 2 === 0 ? 3 : 5);
  }
  g.font = "bold 18px 'IBM Plex Mono', monospace";
  g.textAlign = "center";
  g.fillText("INTERIM \u00b7 FINAL PENDING", 128, 110);
  return new THREE.CanvasTexture(cv);
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------- main component ----------
export default function ParcelLabelSim() {
  const mountRef = useRef(null);
  const world = useRef({}); // three objects
  const simRef = useRef({ t: 0, playing: false, speed: 1, data: buildScenario(1) });

  const [scenario, setScenario] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hud, setHud] = useState({ t: 0, packed: 0, labelled: 0, waiting: 0, onConv: 0, inLoop: 0, avgWait: 0, handling: 0, scans: 0, msg: "Press start to run the simulation", msgKind: "info", done: false });
  const [showCompare, setShowCompare] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // ---------- scene setup ----------
  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 55, 110);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    const cam = { theta: -0.9, phi: 1.05, radius: 41, target: new THREE.Vector3(3, 0.5, 1.5) };
    const applyCam = () => {
      const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
      camera.position.set(
        cam.target.x + cam.radius * sp * Math.sin(cam.theta),
        cam.target.y + cam.radius * cp,
        cam.target.z + cam.radius * sp * Math.cos(cam.theta)
      );
      camera.lookAt(cam.target);
    };
    applyCam();

    // lights
    scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(12, 20, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -35; key.shadow.camera.right = 35;
    key.shadow.camera.top = 35; key.shadow.camera.bottom = -35;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(85, 55),
      new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(85, 85, 0x2a3648, 0x222d3c);
    grid.position.y = 0.01;
    scene.add(grid);

    // ---------- static props ----------
    const props = new THREE.Group();
    scene.add(props);

    const mat = (c, r = 0.7, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

    // three packing stations (table + packer + printer + order sign each)
    const packers = [];
    const printerLights = [];
    const printerPapers = [];
    STATIONS.forEach((st, si) => {
      const g = new THREE.Group();
      // table
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 2.0), mat(0x3a4657, 0.5, 0.3));
      top.position.set(st.x, 1.0, st.z); top.castShadow = true;
      g.add(top);
      [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), mat(0x2a3441, 0.4, 0.5));
        leg.position.set(st.x + dx, 0.5, st.z + dz);
        g.add(leg);
      });
      // packer figure
      const packer = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 12), mat(0x4a5f78, 0.8));
      body.position.y = 1.15; body.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat(0xd9a679, 0.9));
      head.position.y = 1.85;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd166, 0.6));
      helmet.position.y = 1.9;
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.7, 10), mat(0x22303f, 0.9));
      legs.position.y = 0.45;
      packer.add(body, head, helmet, legs);
      packer.position.set(st.x, 0, st.z + 1.6);
      g.add(packer);
      packers.push(packer);
      // printer
      const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mat(0x222b38, 0.5, 0.4));
      pBody.position.set(st.x - 1.25, 1.33, st.z - 0.5); pBody.castShadow = true;
      const pSlot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.1), mat(0x0d1219, 0.4));
      pSlot.position.set(st.x - 1.25, 1.4, st.z - 0.16);
      const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: C.green }));
      pLight.position.set(st.x - 1.01, 1.5, st.z - 0.2);
      g.add(pBody, pSlot, pLight);
      printerLights.push(pLight);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      paper.position.set(st.x - 1.25, 1.28, st.z - 0.1);
      paper.rotation.x = -0.4;
      paper.visible = false;
      g.add(paper);
      printerPapers.push(paper);
      props.add(g);
    });
    // capacity group signs
    [
      ["1-PACKAGE STATION", STATIONS[0].x],
      ["2-PACKAGE STATION", STATIONS[1].x],
      ["3-PACKAGE STATION", STATIONS[2].x],
    ].forEach(([txt, sx]) => {
      const sign = makeTextPlane(txt, "#8fa0b5", 3.2, 0.45);
      sign.position.set(sx, 3.0, 3.2);
      props.add(sign);
    });

    // main conveyor
    const convGroup = new THREE.Group();
    const beltLen = 43;
    const beltCv = document.createElement("canvas");
    beltCv.width = 128; beltCv.height = 32;
    const bg2 = beltCv.getContext("2d");
    bg2.fillStyle = "#39434f"; bg2.fillRect(0, 0, 128, 32);
    bg2.fillStyle = "#2b333d";
    for (let i = 0; i < 8; i++) bg2.fillRect(i * 16, 0, 8, 32);
    const beltTex = new THREE.CanvasTexture(beltCv);
    beltTex.wrapS = THREE.RepeatWrapping;
    beltTex.repeat.set(beltLen / 1.2, 1);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.12, 1.3), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9 }));
    belt.position.set(CONV_START + beltLen / 2, 0.62, 0);
    belt.receiveShadow = true; belt.castShadow = true;
    convGroup.add(belt);
    // conveyor frame + legs
    for (let x = CONV_START + 0.5; x <= CONV_END; x += 2.5) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.1), mat(0x232c38, 0.5, 0.4));
      leg.position.set(x, 0.3, 0);
      convGroup.add(leg);
    }
    // side rails
    [-0.72, 0.72].forEach((dz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.08, 0.06), mat(0x4c5a6b, 0.4, 0.5));
      rail.position.set(CONV_START + beltLen / 2, 0.86, dz);
      convGroup.add(rail);
    });
    props.add(convGroup);

    // green flow arrows on main conveyor
    const arrowMat = new THREE.MeshBasicMaterial({ color: C.green });
    const arrows = [];
    for (let i = 0; i < 14; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 4), arrowMat);
      a.rotation.z = -Math.PI / 2;
      a.rotation.y = Math.PI / 4;
      a.position.set(-14.5 + i * 3, 0.95, 0);
      convGroup.add(a);
      arrows.push(a);
    }

    // exit portal
    const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 2.2), mat(0x26313f, 0.6));
    exitFrame.position.set(CONV_END + 0.2, 1.2, 0);
    props.add(exitFrame);
    const exitSign = makeTextPlane("OUTBOUND", C.green, 2.4, 0.5);
    exitSign.position.set(CONV_END + 0.2, 2.7, 0);
    exitSign.rotation.y = -Math.PI / 2;
    props.add(exitSign);

    // ORTEC-routed infeed conveyors for scenarios 2-4
    const infeedGroup = new THREE.Group();
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x35424e, roughness: 0.9 });
    const SPINE_Z = 7.6;
    const SRC_X = 5.4;
    const BRANCH_END_Z = 4.0;
    const spineMinX = STATIONS[0].x - 1.5;
    const spineMaxX = SRC_X + 1.2;
    const spineLength = spineMaxX - spineMinX;

    const spine = new THREE.Mesh(new THREE.BoxGeometry(spineLength, 0.12, 1.1), spineMat);
    spine.position.set((spineMinX + spineMaxX) / 2, 0.62, SPINE_Z);
    spine.castShadow = true;
    infeedGroup.add(spine);

    for (let x = spineMinX + 0.6; x <= spineMaxX - 0.6; x += 2.4) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.9), mat(0x232c38, 0.5, 0.4));
      leg.position.set(x, 0.3, SPINE_Z);
      infeedGroup.add(leg);
    }

    const srcBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 1.7), mat(0x2b3a4d, 0.6, 0.3));
    srcBox.position.set(SRC_X + 1.0, 0.8, SPINE_Z);
    srcBox.castShadow = true;
    infeedGroup.add(srcBox);

    const sourceSign = makeTextPlane("ORTEC ORDER RELEASE", C.blue, 3.8, 0.5);
    sourceSign.position.set(SRC_X + 1.0, 2.0, SPINE_Z + 0.9);
    infeedGroup.add(sourceSign);

    STATIONS.forEach((st, si) => {
      const order = ORDERS[si];
      const branchLength = SPINE_Z - BRANCH_END_Z;
      const branch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, branchLength + 0.2), spineMat);
      branch.position.set(st.x, 0.62, (SPINE_Z + BRANCH_END_Z) / 2);
      branch.castShadow = true;
      infeedGroup.add(branch);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.14),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(order.color) })
      );
      lamp.position.set(st.x + 0.65, 1.15, SPINE_Z - 0.15);
      infeedGroup.add(lamp);

      [6.8, 5.7, 4.6].forEach((az) => {
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.36, 4),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(order.color) })
        );
        arrow.position.set(st.x, 0.95, az);
        arrow.rotation.x = -Math.PI / 2;
        infeedGroup.add(arrow);
      });

      const routeSign = makeTextPlane(
        `ORDER ${order.key} · ORTEC ${order.count} → ${st.id}`,
        order.color,
        3.8,
        0.42
      );
      routeSign.position.set(st.x, 1.75, BRANCH_END_Z + 0.18);
      infeedGroup.add(routeSign);
    });

    for (let x = SRC_X - 0.4; x >= spineMinX + 0.8; x -= 2.5) {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.36, 4),
        new THREE.MeshBasicMaterial({ color: 0x8fa0b5 })
      );
      arrow.position.set(x, 0.95, SPINE_Z);
      arrow.rotation.z = Math.PI / 2;
      infeedGroup.add(arrow);
    }

    const routingSign = makeTextPlane(
      "ORTEC ROUTING · A → 1 PACKAGE · B → 2 PACKAGES · C → 3 PACKAGES",
      C.blue,
      8.8,
      0.55
    );
    routingSign.position.set(-2.2, 2.45, SPINE_Z + 0.9);
    infeedGroup.add(routingSign);
    props.add(infeedGroup);

    // staging area (scenario 2) — one consolidation strip, slots per order
    const staging = new THREE.Group();
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 2.4), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.12 }));
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(-2.8, 0.02, 5.2);
    staging.add(zone);
    const zoneBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(15.5, 2.4)),
      new THREE.LineBasicMaterial({ color: 0xffd166 })
    );
    zoneBorder.rotation.x = -Math.PI / 2;
    zoneBorder.position.set(-2.8, 0.03, 5.2);
    staging.add(zoneBorder);
    [-9.0, -4.2, -2.8, 0.6, 2.0, 3.4].forEach((x) => {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 1.3), mat(0x8a6a3d, 0.9));
      pallet.position.set(x, 0.45, 5.2);
      pallet.castShadow = true;
      const palletLegs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.1), mat(0x6f5531, 0.95));
      palletLegs.position.set(x, 0.2, 5.2);
      staging.add(pallet, palletLegs);
    });
    const stagingSign = makeTextPlane("ORDER CONSOLIDATION AREA", C.yellow, 5.4, 0.55);
    stagingSign.position.set(-3.0, 2.2, 6.4);
    staging.add(stagingSign);
    props.add(staging);

    // labelling machine (scenario 3) — portal over conveyor
    const machine = new THREE.Group();
    const mMat = mat(0x33507a, 0.45, 0.5);
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.6), mMat);
    pillarL.position.set(MACHINE_X, 1.3, -1.2);
    const pillarR = pillarL.clone(); pillarR.position.z = 1.2;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 3.2), mMat);
    bridge.position.set(MACHINE_X, 2.4, 0);
    bridge.castShadow = true;
    machine.add(pillarL, pillarR, bridge);
    // scanner beam
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshBasicMaterial({ color: C.red, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
    beam.position.set(MACHINE_X, 1.4, 0);
    beam.rotation.y = Math.PI / 2;
    machine.add(beam);
    // machine display (canvas)
    const dispCv = document.createElement("canvas");
    dispCv.width = 512; dispCv.height = 256;
    const dispTex = new THREE.CanvasTexture(dispCv);
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: dispTex }));
    disp.position.set(MACHINE_X, 3.9, 0);
    disp.rotation.y = -Math.PI / 2 + 0.35;
    machine.add(disp);
    props.add(machine);

    // recirculation loop conveyor (scenario 3)
    const loopGroup = new THREE.Group();
    const LX1 = MACHINE_X + 1.5, LX2 = MACHINE_X - 6.5;
    const loopSegs = [
      [LX1, 0, LX1, -4.2],
      [LX1, -4.2, LX2, -4.2],
      [LX2, -4.2, LX2, 0],
    ];
    const loopBelts = [];
    loopSegs.forEach(([x1, z1, x2, z2]) => {
      const len = Math.hypot(x2 - x1, z2 - z1) + 0.4;
      const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: 0x3a3026, roughness: 0.9 }));
      b.position.set((x1 + x2) / 2, 0.62, (z1 + z2) / 2);
      b.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      b.castShadow = true;
      loopGroup.add(b);
      loopBelts.push(b);
    });
    // connector from machine to loop start
    const conn = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: 0x3a3026, roughness: 0.9 }));
    conn.position.set(MACHINE_X + 0.6, 0.62, 0);
    loopGroup.add(conn);
    // orange loop arrows
    const loopArrows = [];
    const loopPath = [[LX1, 0], [LX1, -4.2], [LX2, -4.2], [LX2, 0]];
    for (let s = 0; s < 3; s++) {
      const [x1, z1] = loopPath[s], [x2, z2] = loopPath[s + 1];
      for (let f = 0.25; f < 1; f += 0.35) {
        const a = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 4), new THREE.MeshBasicMaterial({ color: C.orange }));
        a.position.set(x1 + (x2 - x1) * f, 0.95, z1 + (z2 - z1) * f);
        const ang = Math.atan2(x2 - x1, z2 - z1);
        a.rotation.x = Math.PI / 2;
        a.rotation.z = -ang + Math.PI;
        loopGroup.add(a);
        loopArrows.push(a);
      }
    }
    const loopSign = makeTextPlane("RECIRCULATION LOOP", C.orange, 4.4, 0.5);
    loopSign.position.set(MACHINE_X - 2.5, 1.8, -4.9);
    loopGroup.add(loopSign);
    props.add(loopGroup);

    // relabeling station (scenario 4) — long side spur integrated into the flow
    const relabelGroup = new THREE.Group();
    const spurMat = new THREE.MeshStandardMaterial({ color: 0x4a2f33, roughness: 0.9 });
    const spurDown = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 3.8), spurMat);
    spurDown.position.set(MACHINE_X, 0.62, 1.7); spurDown.castShadow = true;
    const spurEast = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.12, 1.1), spurMat);
    spurEast.position.set(MACHINE_X + 3, 0.62, 3.4); spurEast.castShadow = true;
    const spurUp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 3.8), spurMat);
    spurUp.position.set(MACHINE_X + 6, 0.62, 1.7); spurUp.castShadow = true;
    relabelGroup.add(spurDown, spurEast, spurUp);
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.9), mat(0x232c38, 0.5, 0.4));
      leg.position.set(MACHINE_X + 1 + i * 2, 0.3, 3.4);
      relabelGroup.add(leg);
    }
    // relabel unit mid-spur
    const rMat = mat(0x7a3340, 0.45, 0.5);
    const rPillarA = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.5), rMat);
    rPillarA.position.set(MACHINE_X + 2.2, 1.1, 3.4);
    const rPillarB = rPillarA.clone(); rPillarB.position.x = MACHINE_X + 3.8;
    const rBridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.4), rMat);
    rBridge.position.set(MACHINE_X + 3, 2.1, 3.4); rBridge.castShadow = true;
    relabelGroup.add(rPillarA, rPillarB, rBridge);
    const rLight = new THREE.Mesh(new THREE.SphereGeometry(0.09), new THREE.MeshBasicMaterial({ color: C.red }));
    rLight.position.set(MACHINE_X + 3, 2.6, 3.4);
    relabelGroup.add(rLight);
    // red flow arrows along the spur
    const spurArrows = [
      [MACHINE_X, 0.8, "down"], [MACHINE_X, 2.4, "down"],
      [MACHINE_X + 1.3, 3.4, "east"], [MACHINE_X + 4.7, 3.4, "east"],
      [MACHINE_X + 6, 2.4, "up"], [MACHINE_X + 6, 0.8, "up"],
    ];
    spurArrows.forEach(([ax, az, dir]) => {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 4), new THREE.MeshBasicMaterial({ color: C.red }));
      a.position.set(ax, 0.95, az);
      if (dir === "down") a.rotation.x = Math.PI / 2;
      if (dir === "up") a.rotation.x = -Math.PI / 2;
      if (dir === "east") a.rotation.z = -Math.PI / 2;
      relabelGroup.add(a);
    });
    const relabelSign = makeTextPlane("RELABELING", C.red, 3.2, 0.5);
    relabelSign.position.set(MACHINE_X + 3, 3.2, 4.3);
    relabelGroup.add(relabelSign);
    props.add(relabelGroup);

    // Ortec packing proposal board (scenario 4)
    const ortecGroup = new THREE.Group();
    const oPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2), mat(0x2a3441, 0.4, 0.5));
    oPost.position.set(-8.2, 1.1, 6.0);
    ortecGroup.add(oPost);
    const ortecCv = document.createElement("canvas");
    ortecCv.width = 512; ortecCv.height = 300;
    const ortecTex = new THREE.CanvasTexture(ortecCv);
    const ortecPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.7), new THREE.MeshBasicMaterial({ map: ortecTex }));
    ortecPanel.position.set(-8.2, 2.9, 6.0);
    ortecGroup.add(ortecPanel);
    props.add(ortecGroup);
    let ortecState = null;
    function drawOrtec(devKnown) {
      if (ortecState === devKnown) return;
      ortecState = devKnown;
      const g = ortecCv.getContext("2d");
      g.fillStyle = "#0a1018"; g.fillRect(0, 0, 512, 300);
      g.strokeStyle = "#4da3ff"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 294);
      g.textAlign = "left";
      g.fillStyle = "#4da3ff";
      g.font = "bold 32px 'IBM Plex Mono', monospace";
      g.fillText("ORTEC PACKING PROPOSAL", 24, 48);
      g.fillStyle = "#8fa0b5";
      g.font = "20px 'IBM Plex Mono', monospace";
      g.fillText("predicted parcels \u2192 labels printed at pack", 24, 80);
      g.font = "26px 'IBM Plex Mono', monospace";
      const rows = [
        ["Order A", "1 parcel ", "1/1", "#00c8ff", false],
        ["Order B", "2 parcels", "1/2 2/2", "#ffd166", false],
        devKnown
          ? ["Order C", "3\u21924 pcs ", "x/4", "#ff5c5c", true]
          : ["Order C", "3 parcels", "1/3 2/3 3/3", "#e44cff", false],
      ];
      rows.forEach((r, i) => {
        const y = 128 + i * 44;
        g.fillStyle = r[3];
        g.fillText(`${r[0]}  ${r[1]}  ${r[2]}`, 24, y);
      });
      g.fillStyle = devKnown ? "#ff5c5c" : "#3ddc84";
      g.font = "bold 24px 'IBM Plex Mono', monospace";
      g.fillText(devKnown ? "DEVIATION: ORDER C SPLIT \u2192 4" : "PROPOSAL ACTIVE", 24, 276);
      ortecTex.needsUpdate = true;
    }
    drawOrtec(false);

    // order banner
    const orderSign = makeTextPlane("PACKING AREA — 1 × 1P · 1 × 2P · 1 × 3P · ONE OUTBOUND LINE", "#e8edf4", 9.5, 0.7);
    orderSign.position.set(-3.5, 4.4, 3.2);
    props.add(orderSign);

    // ---------- parcels ----------
    const parcelMeshes = [];
    function buildParcels(data) {
      parcelMeshes.forEach((p) => scene.remove(p.group));
      parcelMeshes.length = 0;
      data.parcels.forEach((pd, i) => {
        const group = new THREE.Group();
        const boxMat = new THREE.MeshStandardMaterial({ color: pd.tote ? new THREE.Color(pd.color) : C.cardboard, roughness: pd.tote ? 0.6 : 0.85 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(...pd.size), boxMat);
        box.castShadow = true;
        group.add(box);
        if (!pd.tote) {
          const tape = new THREE.Mesh(new THREE.BoxGeometry(pd.size[0] * 1.02, pd.size[1] * 1.02, pd.size[2] * 0.14), mat(0xa87a42, 0.8));
          group.add(tape);
        }
        // label sprite
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture("—", "", "#555"), transparent: true }));
        spr.scale.set(1.7, 0.85, 1);
        spr.position.y = pd.size[1] / 2 + 0.75;
        spr.visible = false;
        group.add(spr);
        // timer sprite (scenario 2 wait / scenario 3 loop passes)
        const aux = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture("", "", "#555"), transparent: true }));
        aux.scale.set(1.5, 0.75, 1);
        aux.position.y = pd.size[1] / 2 + 1.6;
        aux.visible = false;
        group.add(aux);
        group.visible = false;
        scene.add(group);
        parcelMeshes.push({ group, box, boxMat, spr, aux, appliedLabel: -1, auxText: "" });
      });
    }
    buildParcels(simRef.current.data);

    // ---------- helpers ----------
    function makeTextPlane(text, color, w, h) {
      const cv = document.createElement("canvas");
      cv.width = 512; cv.height = Math.round((512 * h) / w);
      const g = cv.getContext("2d");
      g.fillStyle = "rgba(13,18,25,0.85)";
      g.fillRect(0, 0, cv.width, cv.height);
      g.strokeStyle = color; g.lineWidth = 6;
      g.strokeRect(3, 3, cv.width - 6, cv.height - 6);
      g.fillStyle = color;
      g.font = `bold ${Math.round(cv.height * 0.45)}px 'Space Grotesk', sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, cv.width / 2, cv.height / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide }));
      return m;
    }

    function drawMachineDisplay(state) {
      const g = dispCv.getContext("2d");
      g.fillStyle = "#0a1018"; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#33507a"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 250);
      g.font = "bold 30px 'IBM Plex Mono', monospace";
      g.fillStyle = "#8fa0b5";
      g.fillText(state.mode === "verify" ? "LABEL VERIFY" : "AUTO LABELLER", 24, 46);
      g.fillStyle = "#e8edf4";
      g.font = "26px 'IBM Plex Mono', monospace";
      g.fillText(`ORDER  ${state.order || "\u2014"}`, 24, 92);
      g.fillText(`PARCEL ${state.parcel || "\u2014"}`, 24, 128);
      if (state.mode === "verify") {
        g.fillText(`PLAN ${state.plan}  ACT ${state.act}`, 24, 164);
        g.fillStyle = state.mismatch ? C.red : C.green;
        g.fillText(state.mismatch ? "MISMATCH \u2192 DIVERT" : "LABELS CONSISTENT", 24, 204);
      } else {
        g.fillText(`REG    ${state.reg} / ${state.total || 3}`, 24, 164);
        g.fillStyle = state.complete ? C.green : C.orange;
        g.fillText(state.complete ? "ORDER COMPLETE" : "ORDER INCOMPLETE", 24, 204);
      }
      g.fillStyle = "#8fa0b5";
      g.fillText(`SCANS ${state.scans}`, 24, 240);
      dispTex.needsUpdate = true;
    }
    drawMachineDisplay({ parcel: "—", reg: 0, complete: false, scans: 0 });

    // scenario-dependent prop visibility
    function applyScenarioProps(n) {
      staging.visible = n === 2;
      machine.visible = n === 3 || n === 4;
      loopGroup.visible = n === 3;
      relabelGroup.visible = n === 4;
      ortecGroup.visible = n === 4;
      infeedGroup.visible = n >= 2;
    }
    applyScenarioProps(1);

    // ---------- camera controls ----------
    const el = renderer.domElement;
    let dragging = false, panning = false, lx = 0, ly = 0;
    let lastDist = 0;
    const onDown = (e) => {
      dragging = true;
      panning = e.button === 2 || e.shiftKey;
      lx = e.clientX; ly = e.clientY;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (panning) {
        const s = cam.radius * 0.0016;
        const right = new THREE.Vector3(Math.cos(cam.theta), 0, -Math.sin(cam.theta));
        cam.target.addScaledVector(right, -dx * s);
        cam.target.y = Math.max(0, cam.target.y + dy * s);
      } else {
        cam.theta -= dx * 0.005;
        cam.phi = Math.min(1.45, Math.max(0.25, cam.phi - dy * 0.005));
      }
      applyCam();
    };
    const onUp = () => (dragging = false);
    const onWheel = (e) => {
      e.preventDefault();
      cam.radius = Math.min(60, Math.max(6, cam.radius * (1 + e.deltaY * 0.001)));
      applyCam();
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 1) { dragging = true; panning = false; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }
      else if (e.touches.length === 2) {
        lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragging) {
        const dx = e.touches[0].clientX - lx, dy = e.touches[0].clientY - ly;
        lx = e.touches[0].clientX; ly = e.touches[0].clientY;
        cam.theta -= dx * 0.006;
        cam.phi = Math.min(1.45, Math.max(0.25, cam.phi - dy * 0.006));
        applyCam();
      } else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        cam.radius = Math.min(60, Math.max(6, cam.radius * (lastDist / d)));
        lastDist = d;
        applyCam();
      }
    };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onUp);

    // ---------- animation loop ----------
    let last = performance.now();
    let hudTimer = 0;
    let raf;

    function tick(now) {
      raf = requestAnimationFrame(tick);
      const dtReal = Math.min(0.05, (now - last) / 1000);
      last = now;
      const S = simRef.current;
      const data = S.data;

      if (S.rebuilt) {
        buildParcels(data);
        applyScenarioProps(data.n);
        S.rebuilt = false;
      }

      if (S.playing) {
        S.t = Math.min(data.duration, S.t + dtReal * S.speed);
        if (S.t >= data.duration) S.playing = false;
      }
      const t = S.t;

      // belt animation
      beltTex.offset.x -= dtReal * (S.playing ? S.speed : 0) * 1.6;

      // packer bob & printer flash per station
      packers.forEach((packer, si) => {
        const anyPacking = data.parcels.some((p) => p.st === si && t >= p.spawn && t < p.packEnd);
        packer.position.y = anyPacking ? Math.abs(Math.sin(now * 0.008)) * 0.08 : 0;
      });
      printerPapers.forEach((paper, si) => {
        const stationLabelSoon = data.parcels.some(
          (p) => p.st === si && p.labels.some((L) => !L[4] && L[0] <= p.move + 0.6 && Math.abs(t - L[0]) < 0.5)
        );
        paper.visible = stationLabelSoon;
        printerLights[si].material.color.set(stationLabelSoon ? C.orange : C.green);
      });

      // scanner beam pulse
      let beamOn = false;
      if (data.n === 3 || data.n === 4) {
        beamOn = data.scans.some((st) => t >= st && t <= st + 1.0);
        beam.material.opacity = beamOn ? 0.35 + 0.25 * Math.sin(now * 0.02) : 0;
      }

      // Ortec board state
      if (data.n === 4) {
        const devP = data.parcels.find((p) => p.devT !== undefined);
        drawOrtec(devP ? t >= devP.devT : false);
      }

      // machine display state
      if (data.n === 3 || data.n === 4) {
        let scansN = 0;
        data.scans.forEach((st) => { if (t >= st) scansN++; });
        let current = "—", currentP = null;
        data.parcels.forEach((p) => {
          const pos = posAt(p.path, t);
          if (Math.abs(pos[1] - MACHINE_X) < 0.8 && Math.abs(pos[3]) < 0.8 && t >= p.conveyor[0]) { current = p.id; currentP = p; }
        });
        if (data.n === 3) {
          // per-order registration status of the parcel currently at the machine
          let reg = 0, total = 3, orderNo = "\u2014";
          if (currentP) {
            orderNo = currentP.order;
            total = currentP.orderSize;
            data.parcels.forEach((p) => { if (p.order === currentP.order && t >= p.labels[0][0]) reg++; });
          }
          drawMachineDisplay({ parcel: current, order: orderNo, reg, total, complete: currentP ? reg >= total : false, scans: scansN });
        } else {
          let plan = "\u2014", act = "\u2014", mismatch = false, orderNo = "\u2014";
          if (currentP) {
            orderNo = currentP.order;
            plan = currentP.plan;
            const devKnown = currentP.devT !== undefined && t >= currentP.devT;
            act = devKnown ? currentP.plan + 1 : currentP.plan;
            mismatch = !!(currentP.relabelIv && t < currentP.relabelIv[1]);
          }
          drawMachineDisplay({ mode: "verify", parcel: current, order: orderNo, plan, act, mismatch, scans: scansN });
        }
      }

      // parcels
      let packed = 0, labelled = 0, waiting = 0, onConv = 0, inLoop = 0, scansN = 0, handling = 0;
      let waitSum = 0, waitCount = 0;
      data.parcels.forEach((pd, i) => {
        const pm = parcelMeshes[i];
        if (!pm) return;
        const visible = t >= pd.spawn && !(pd.despawn && t >= pd.despawn);
        pm.group.visible = visible;
        if (!visible) return;
        const [, x, y, z] = posAt(pd.path, t);
        pm.group.position.set(x, y, z);
        // pack scale-in
        if (!pd.tote && t < pd.packEnd) {
          const f = Math.min(1, (t - pd.spawn) / Math.max(0.1, pd.packEnd - pd.spawn));
          pm.group.scale.setScalar(0.25 + 0.75 * f);
        } else pm.group.scale.setScalar(1);

        // label state
        let li = -1;
        pd.labels.forEach(([lt], k) => { if (t >= lt) li = k; });
        if (li !== pm.appliedLabel) {
          pm.appliedLabel = li;
          if (li >= 0) {
            const [, txt, , sub, wrong] = pd.labels[li];
            const oc = pd.color;
            if (txt === "INTERIM") {
              pm.spr.material.map = makeBarcodeTexture(oc);
            } else {
              const col = wrong ? C.red : oc;
              pm.spr.material.map = makeLabelTexture(`Order ${pd.order} \u00b7 ${txt}`, sub, col);
            }
            pm.spr.material.needsUpdate = true;
            pm.spr.visible = true;
          }
        }

        // box tint by state
        const inStaging = pd.stagingIv && t >= pd.stagingIv[0] && t < pd.stagingIv[1];
        const latestLabel = li >= 0 ? pd.labels[li] : null;
        const labelWrong = !!(latestLabel && latestLabel[4]);
        const hasFinal = !!(latestLabel && latestLabel[1] !== "INTERIM" && !labelWrong);
        const inRelabelNow = pd.relabelIv && t >= pd.relabelIv[0] && t < pd.relabelIv[1];
        pm.boxMat.emissive = pm.boxMat.emissive || new THREE.Color(0x000000);
        pm.boxMat.emissive.set(
          labelWrong ? 0x4d1414 : inStaging ? 0x4d3f00 : hasFinal && t > pd.conveyor[0] ? 0x003318 : 0x000000
        );

        // aux sprite: wait timer / loop passes / relabel divert
        let auxTxt = "";
        if (inStaging) auxTxt = `waiting ${(t - pd.stagingIv[0]).toFixed(0)}s`;
        const passStarted = pd.loop.filter(([a]) => t >= a).length;
        const inLoopNow = pd.loop.some(([a, b]) => t >= a && t <= b);
        if (data.n === 3 && passStarted > 0) auxTxt = `loop passes: ${passStarted}`;
        if (inRelabelNow) auxTxt = "→ relabeling";
        else if (pd.relabelIv && t >= pd.relabelIv[1]) auxTxt = "relabelled ✓";
        if (auxTxt !== pm.auxText) {
          pm.auxText = auxTxt;
          if (auxTxt) {
            const auxCol = inRelabelNow ? C.red : auxTxt.startsWith("relabelled") ? C.green : inLoopNow || inStaging ? C.yellow : C.dim;
            pm.aux.material.map = makeLabelTexture(auxTxt, "", auxCol);
            pm.aux.material.needsUpdate = true;
            pm.aux.visible = true;
          } else pm.aux.visible = false;
        }

        // stats (totes excluded)
        if (pd.tote) return;
        if (t >= pd.packEnd) packed++;
        if (hasFinal) labelled++;
        if (inStaging) waiting++;
        if (t >= pd.conveyor[0] && t < pd.conveyor[1] && !inLoopNow && !inRelabelNow) onConv++;
        if (inLoopNow || inRelabelNow) inLoop++;
        if (pd.stagingIv) {
          const w = Math.max(0, Math.min(t, pd.stagingIv[1]) - pd.stagingIv[0]);
          waitSum += w; waitCount++;
        }
        if (data.n === 3) {
          pd.loop.forEach(([a, b]) => { if (t >= a) waitSum += Math.min(t, b) - a; });
          waitCount = data.parcels.filter((p) => !p.tote).length;
        }
        if (data.n === 4) {
          if (pd.relabelIv && t >= pd.relabelIv[0]) waitSum += Math.min(t, pd.relabelIv[1]) - pd.relabelIv[0];
          waitCount = data.parcels.filter((p) => !p.tote).length;
        }
        // handling steps: label events passed + staging moves
        pd.labels.forEach(([lt]) => { if (t >= lt) handling++; });
        if (pd.stagingIv && t >= pd.stagingIv[0]) handling++;
        if (pd.stagingIv && t >= pd.stagingIv[1]) handling++;
      });
      data.scans.forEach((st) => { if (t >= st) scansN++; });

      // pulse arrows
      arrows.forEach((a, i) => { a.material.opacity = 1; a.position.y = 0.95 + 0.05 * Math.sin(now * 0.006 + i); });

      // HUD throttle
      hudTimer += dtReal;
      if (hudTimer > 0.12) {
        hudTimer = 0;
        // current message
        let msg = "Press start to run the simulation", kind = "info";
        for (const m of data.messages) if (t >= m[0]) { msg = m[1]; kind = m[2] || "info"; }
        const done = t >= data.duration;
        setHud({
          t, packed, labelled, waiting, onConv, inLoop,
          avgWait: waitCount ? waitSum / Math.max(1, waitCount) : 0,
          handling, scans: scansN, msg, msgKind: kind, done,
        });
        setPlaying(S.playing);
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(tick);

    // resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    world.current = { cam, applyCam };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---------- UI actions ----------
  const selectScenario = (n) => {
    setScenario(n);
    setShowCompare(false);
    const S = simRef.current;
    S.data = buildScenario(n);
    S.t = 0;
    S.playing = false;
    S.rebuilt = true;
    setPlaying(false);
    setHud((h) => ({ ...h, t: 0, done: false, msg: `Scenario ${n}: ${SCENARIOS[n].title} — press start`, msgKind: "info" }));
  };
  const doPlay = () => { simRef.current.playing = true; setPlaying(true); };
  const doPause = () => { simRef.current.playing = false; setPlaying(false); };
  const doReset = () => {
    const S = simRef.current;
    S.t = 0; S.playing = false; S.rebuilt = true;
    setPlaying(false);
    setHud((h) => ({ ...h, t: 0, done: false }));
  };
  const doStep = () => {
    const S = simRef.current;
    const events = [];
    S.data.parcels.forEach((p) => {
      events.push(p.spawn, p.packEnd, p.conveyor[0], p.conveyor[1]);
      p.labels.forEach(([lt]) => events.push(lt));
      p.loop.forEach(([a, b]) => events.push(a, b));
      if (p.stagingIv) events.push(...p.stagingIv);
      if (p.relabelIv) events.push(...p.relabelIv);
    });
    S.data.messages.forEach((m) => events.push(m[0]));
    const next = events.filter((e) => e > S.t + 0.01).sort((a, b) => a - b)[0];
    S.t = Math.min(next !== undefined ? next : S.data.duration, S.data.duration);
    S.playing = false;
  };
  const setSpd = (v) => { simRef.current.speed = v; setSpeed(v); };
  const setView = (name) => {
    const { cam, applyCam } = world.current;
    const views = {
      Overview: { target: [3, 0.5, 1.5], theta: -0.9, phi: 1.05, radius: 41 },
      "Packing Stations": { target: [-3.5, 1, 3.2], theta: -0.75, phi: 1.0, radius: 21 },
      "Infeed Routing": { target: [-2.2, 0.8, 7], theta: -0.6, phi: 0.95, radius: 17 },
      "Staging Area": { target: [-3.0, 0.6, 5.2], theta: -0.4, phi: 0.95, radius: 16 },
      "Label Machine": { target: [MACHINE_X, 1.5, 0], theta: -1.2, phi: 1.0, radius: 10 },
      "Conveyor Loop": { target: [MACHINE_X - 3.5, 0.5, -2], theta: -2.2, phi: 0.9, radius: 15 },
      "Relabeling Station": { target: [MACHINE_X + 3, 1.2, 2.2], theta: -0.5, phi: 0.95, radius: 13 },
    };
    const v = views[name];
    cam.target.set(...v.target);
    cam.theta = v.theta; cam.phi = v.phi; cam.radius = v.radius;
    applyCam();
  };

  const data = simRef.current.data;
  const nParcels = data.parcels.filter((p) => !p.tote).length;
  const kind = hud.msgKind;
  const msgColor = kind === "ok" ? C.green : kind === "warn" ? C.orange : kind === "err" ? C.red : C.blue;

  // ---------- comparison table ----------
  const compareRows = [
    ["Parcel leaves packing immediately", "Yes", "No", "Yes", "Yes"],
    ["Final count known at first label", "No", "Yes", "Not initially", "Predicted"],
    ["Temporary staging required", "No", "Yes", "No", "No"],
    ["Correct final numbering", "Limited / delayed", "Yes", "Yes", "If proposal correct"],
    ["Additional handling", "Low", "Medium", "Medium", "Exceptions only"],
    ["Conveyor recirculation", "No", "No", "Yes", "Divert spur only"],
    ["Additional automation required", "Low", "Low", "High", "Medium–High"],
    ["Risk of parcel waiting", "Low", "High", "Medium", "Low"],
    ["Packing-area space requirement", "Low", "High", "Low", "Low"],
    ["Depends on Ortec proposal accuracy", "No", "No", "No", "Yes — critical"],
  ];

  const btn = (active) => ({
    background: active ? C.blue : C.panel2,
    color: active ? "#0d1219" : C.text,
    border: `1px solid ${active ? C.blue : C.line}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });
  const smallBtn = (active) => ({ ...btn(active), padding: "5px 9px", fontSize: 11 });

  const stat = (label, value, color) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "3px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ color: C.dim }}>{label}</span>
      <span style={{ color: color || C.text, fontWeight: 700 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "100dvh", maxHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Space Grotesk', system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; } button:active { transform: translateY(1px); }`}</style>

      {/* Header */}
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ marginRight: "auto" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>Multi-Parcel Order Labelling — Simulator</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>Orders A · B · C — one 1P, one 2P and one 3P station</div>
        </div>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} style={btn(scenario === n)} onClick={() => selectScenario(n)}>
            {SCENARIOS[n].short} · {SCENARIOS[n].title}
          </button>
        ))}
      </div>

      {/* 3D viewport */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

        {/* message banner */}
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", maxWidth: "92%", background: "rgba(13,18,25,0.9)", border: `1px solid ${msgColor}`, borderRadius: 10, padding: "8px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: msgColor, textAlign: "center" }}>
          {hud.msg}
        </div>

        {/* floating play controls — always reachable, independent of bottom bar */}
        <div style={{ position: "absolute", bottom: 14, right: 12, display: "flex", gap: 8, zIndex: 5 }}>
          <button
            onClick={playing ? doPause : doPlay}
            style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${playing ? C.orange : C.green}`, background: "rgba(20,27,37,0.95)", color: playing ? C.orange : C.green, fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}
            aria-label={playing ? "Pause" : "Start"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            onClick={doReset}
            style={{ width: 44, height: 44, alignSelf: "flex-end", borderRadius: "50%", border: `2px solid ${C.line}`, background: "rgba(20,27,37,0.95)", color: C.dim, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}
            aria-label="Reset"
          >
            ↺
          </button>
        </div>

        {/* camera presets */}
        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {["Overview", "Packing Stations", scenario >= 2 ? "Infeed Routing" : null, scenario === 2 ? "Staging Area" : null, scenario === 3 || scenario === 4 ? "Label Machine" : null, scenario === 3 ? "Conveyor Loop" : null, scenario === 4 ? "Relabeling Station" : null]
            .filter(Boolean)
            .map((v) => (
              <button key={v} style={smallBtn(false)} onClick={() => setView(v)}>{v}</button>
            ))}
        </div>

        {/* info panel */}
        <div style={{ position: "absolute", top: 56, right: 10, width: 235, background: "rgba(20,27,37,0.94)", border: `1px solid ${C.line}`, borderRadius: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, overflow: "hidden" }}>
          <div onClick={() => setPanelOpen((o) => !o)} style={{ padding: "7px 10px", background: C.panel2, cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>LIVE STATUS</span><span>{panelOpen ? "−" : "+"}</span>
          </div>
          {panelOpen && (
            <div style={{ padding: "6px 10px 10px" }}>
              {stat("Scenario", `S${scenario}`)}
              {stat("Sim time", `${hud.t.toFixed(1)}s`)}
              {stat("Orders", "A · B · C")}
              {stat("Packed", `${hud.packed} / ${nParcels}`, hud.packed === nParcels ? C.green : C.text)}
              {stat("Correct final labels", `${hud.labelled} / ${nParcels}`, hud.labelled === nParcels ? C.green : C.text)}
              {stat("Waiting (staging)", hud.waiting, hud.waiting ? C.yellow : C.dim)}
              {stat("On conveyor", hud.onConv)}
              {stat(scenario === 4 ? "In relabeling" : "In recirculation", hud.inLoop, hud.inLoop ? (scenario === 4 ? C.red : C.orange) : C.dim)}
              {stat("Avg wait / parcel", `${hud.avgWait.toFixed(1)}s`)}
              {stat("Extra handling steps", hud.handling)}
              {stat("Machine scans", hud.scans)}
            </div>
          )}
        </div>

        {/* summary card */}
        {hud.done && !showCompare && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,18,25,0.6)", padding: 16 }}>
            <div style={{ maxWidth: 430, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>SCENARIO {scenario} COMPLETE</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{SCENARIOS[scenario].title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.text, marginBottom: 14, borderLeft: `3px solid ${C.blue}`, paddingLeft: 10 }}>{data.keyMessage}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.dim, marginBottom: 16 }}>
                Avg wait {hud.avgWait.toFixed(1)}s · handling steps {hud.handling} · scans {hud.scans}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btn(true)} onClick={() => setShowCompare(true)}>Compare all scenarios</button>
                <button style={btn(false)} onClick={doReset}>Replay</button>
                {scenario < 4 && <button style={btn(false)} onClick={() => selectScenario(scenario + 1)}>Next scenario →</button>}
              </div>
            </div>
          </div>
        )}

        {/* comparison overlay */}
        {showCompare && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(13,18,25,0.92)", overflow: "auto", padding: 16 }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Comparison of Multi-Parcel Order Labelling Strategies</div>
              <div style={{ fontSize: 12.5, color: C.dim, margin: "6px 0 14px", lineHeight: 1.5 }}>
                The simulation compares immediate parcel release, order consolidation at the packing station, and downstream automated final labelling using interim parcel identification.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
                  <thead>
                    <tr>
                      {["Criterion", "S1 Immediate", "S2 Consolidated", "S3 Interim + Auto", "S4 Ortec Proposal"].map((h, i) => (
                        <th key={h} style={{ textAlign: i ? "center" : "left", padding: "7px 8px", borderBottom: `2px solid ${C.line}`, color: i === 0 ? C.dim : [null, C.green, C.yellow, C.blue, C.red][i] }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((r) => (
                      <tr key={r[0]}>
                        {r.map((cell, i) => (
                          <td key={i} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.line}`, textAlign: i ? "center" : "left", color: i === 0 ? C.dim : cell === "Yes" ? C.green : cell === "No" ? C.dim : cell === "High" ? C.orange : C.text }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} style={btn(false)} onClick={() => selectScenario(n)}>Run S{n}</button>
                ))}
                <button style={btn(true)} onClick={() => setShowCompare(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback bar */}
      <div style={{ padding: "8px 12px", paddingBottom: "calc(8px + env(safe-area-inset-bottom))", borderTop: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", background: C.panel }}>
        {!playing
          ? <button style={btn(true)} onClick={doPlay}>▶ Start</button>
          : <button style={btn(false)} onClick={doPause}>❚❚ Pause</button>}
        <button style={btn(false)} onClick={doReset}>↺ Reset</button>
        <button style={btn(false)} onClick={doStep}>⇥ Step</button>
        <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
          {[0.5, 1, 2, 4].map((v) => (
            <button key={v} style={smallBtn(speed === v)} onClick={() => setSpd(v)}>{v}x</button>
          ))}
        </div>
        {/* progress */}
        <div style={{ flex: 1, minWidth: 120, height: 6, background: C.panel2, borderRadius: 3, overflow: "hidden", margin: "0 6px" }}>
          <div style={{ width: `${(hud.t / data.duration) * 100}%`, height: "100%", background: C.blue, transition: "width 0.1s linear" }} />
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.dim }}>
          {hud.t.toFixed(1)} / {data.duration.toFixed(0)}s
        </span>
      </div>
    </div>
  );
}
