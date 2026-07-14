import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/* ============================================================
   Supply Chain Simulator — Inbound + Picking + Outbound Packing
   One continuous flow: truck → storage → pick → Ortec → pack → ship
   ============================================================ */

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



// truck identities (colors carry through boxes and carriers)
const TRUCKS = [
  { key: "1", color: "#00c8ff", gateZ: -3 },
  { key: "2", color: "#ffd166", gateZ: 3 },
];

// ---------- layout constants ----------
const DOCK_X = -16;        // trucks park here
const RECV_X = -9;         // receiving drop area
const SORT_X = -4.5;       // sorting tables
const CONV_Z = -2;         // aKL conveyor lane
const CONV_X0 = -1.5, CONV_X1 = 10.5;
const PALLET_LANE_Z = 2.6; // pallet pickup lane
const RACK_AKL = { x: 12.2, z: -2 };
const RACK_PAL = { x: 12.6, z: 4 };
const OUT_X = 19.5, OUT_Z = 0.8;
const CUT_MIN = 14 * 60;   // 14:00 cutoff in minutes

const fmtClock = (min) => {
  const m = Math.max(0, Math.round(min));
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
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
  let fs = main.length > 14 ? 24 : main.length > 9 ? 30 : 44;
  g.font = `bold ${fs}px 'IBM Plex Mono', monospace`;
  g.textAlign = "center";
  g.fillText(main, 128, 58);
  g.fillStyle = "#c7d2e0";
  g.font = "20px 'IBM Plex Mono', monospace";
  g.fillText(sub || "", 128, 96);
  return new THREE.CanvasTexture(cv);
}
// temporary label rendered as a barcode sticker
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

// ---------- inbound flow builder ----------
function buildInboundBase(n) {
  const actors = [];
  const messages = [];
  const stats = { docked: [], unloaded: [], orderable: [], stored: [], notes: [], outbound: [] };
  const clockStart = n === 1 ? 12 * 60 + 30 : 13 * 60; // sim start wall-time
  const rate = 2; // minutes per sim second
  const cutT = (CUT_MIN - clockStart) / rate;
  let stopT = null;
  const lateCarriers = [];

  const duration = n === 1 ? 36 : 38;
  const keyMessage = n === 1
    ? "Put-away completed before the 14:00 cutoff — enough time remains for pick, pack and loading, the shipment leaves today."
    : "Truck 2's goods are customer-orderable, but put-away after 14:00 leaves no time for pick, pack and loading — the flow stops until the next day.";

  // one full inbound flow per truck; off = time offset for the late truck
  const flow = (k, off) => {
    const T = TRUCKS[k];
    const gz = T.gateZ;
    const tDock = 3 + off;

    // ---- truck drive-in ----
    actors.push({
      id: `TRUCK-${T.key}`, kind: "truck", color: T.color, spawn: 0,
      path: [[0.5 + off, -28, 0, gz], [tDock, DOCK_X, 0, gz], [duration, DOCK_X, 0, gz]],
    });
    stats.docked.push(tDock);

    // ---- unloading forklift (one per gate, two trips) ----
    const parkZ = gz < 0 ? -5.6 : 5.6;
    const flPath = [[0, -7.5, 0, parkZ]];
    const boxes = [];
    for (let b = 0; b < 2; b++) {
      const dropZ = gz + (b === 0 ? -0.6 : 0.6);
      const tPick = 4.5 + off + b * 3.2;
      const tDrop = tPick + 1.9;
      // forklift: to truck, grab, to drop
      flPath.push(
        [tPick - 1.3, DOCK_X + 1.6, 0, gz],
        [tPick + 0.4, DOCK_X + 1.6, 0, gz],
        [tDrop, RECV_X - 0.9, 0, dropZ]
      );
      if (b === 1) flPath.push([tDrop + 1.5, -7.5, 0, parkZ]);
      // the box itself
      const tSort = 11.5 + off + b * 1.6;
      const tPlace = 15.5 + off + b * 1.8;
      const sortZ = b === 0 ? CONV_Z - 0.5 : PALLET_LANE_Z;
      const carrierPos = b === 0
        ? { x: CONV_X0, z: CONV_Z }
        : { x: -2, z: PALLET_LANE_Z + (k === 0 ? -0.4 : 0.9) };
      boxes.push({ b, tPlace, carrierPos });
      actors.push({
        id: `BOX-${T.key}-${b + 1}`, kind: "box", color: T.color,
        spawn: tPick + 0.2, despawn: tPlace + 0.6,
        path: [
          [tPick + 0.4, DOCK_X + 1.4, 0.75, gz],
          [tDrop, RECV_X, 0.35, dropZ],
          [tSort, RECV_X, 0.35, dropZ],
          [tSort + 1.4, SORT_X, 1.12, sortZ],
          [tPlace, SORT_X, 1.12, sortZ],
          [tPlace + 0.5, carrierPos.x, 0.75, carrierPos.z],
        ],
        labels: [[tSort + 0.2, "SORTING", "for put-away", C.dim]],
      });
      stats.unloaded.push(tDrop);
      messages.push([tDrop, `Truck ${T.key}: box ${b + 1} unloaded to goods receipt`, "info"]);
    }
    actors.push({ id: `FL-${T.key}`, kind: "forklift", color: 0xff8c42, spawn: 0, path: flPath });

    // ---- load carriers ----
    // aKL tote (box 1)
    const toteSpawn = boxes[0].tPlace + 0.3;
    const orderT = boxes[1].tPlace + 0.7; // whole truck orderable once both carriers loaded
    const tRide = 18.5 + off;
    const toteStored = tRide + 7;
    actors.push({
      id: `AKL-${T.key}`, kind: "tote", color: T.color, spawn: toteSpawn,
      path: [
        [tRide, CONV_X0, 0.86, CONV_Z],
        [tRide + 6, CONV_X1, 0.86, CONV_Z],
        [toteStored, RACK_AKL.x, 1.05, RACK_AKL.z],
        [duration, RACK_AKL.x, 1.05, RACK_AKL.z],
      ],
      labels: [
        [orderT, "AVAILABLE FOR SALE", `aKL \u00b7 truck ${T.key}`, C.green],
        [toteStored + 0.4, "DELIVERY NOTE \u2713", "in storage", C.green],
      ],
      orderableT: orderT, storedT: toteStored,
    });
    // pallet (box 2) — moved later by the put-away forklift
    const palSpawn = boxes[1].tPlace + 0.3;
    const palStart = boxes[1].carrierPos;
    const tFork = k === 0 ? 20 : n === 1 ? 25 : 26.5;
    const palStored = tFork + 4;
    actors.push({
      id: `PAL-${T.key}`, kind: "pallet", color: T.color, spawn: palSpawn,
      path: [
        [tFork, palStart.x, 0.32, palStart.z],
        [tFork + 0.5, palStart.x, 0.62, palStart.z],
        [palStored, RACK_PAL.x, 0.62, RACK_PAL.z + (k === 0 ? -0.9 : 0.9)],
        [palStored + 0.4, RACK_PAL.x, 0.32, RACK_PAL.z + (k === 0 ? -0.9 : 0.9)],
        [duration, RACK_PAL.x, 0.32, RACK_PAL.z + (k === 0 ? -0.9 : 0.9)],
      ],
      labels: [
        [orderT, "AVAILABLE FOR SALE", `pallet \u00b7 truck ${T.key}`, C.green],
        [palStored + 0.5, "DELIVERY NOTE \u2713", "in storage", C.green],
      ],
      orderableT: orderT, storedT: palStored,
    });
    stats.orderable.push(orderT, orderT);
    stats.stored.push(toteStored, palStored);
    stats.notes.push(toteStored + 0.4, palStored + 0.5);

    messages.push([boxes[1].tPlace - 0.2, `Truck ${T.key}: goods placed on load carriers \u2014 aKL and pallet`, "info"]);
    messages.push([orderT, `Truck ${T.key}: material AVAILABLE FOR CUSTOMER ORDERS`, "ok"]);
    messages.push([tRide, `Truck ${T.key}: aKL travels by conveyor, pallet by forklift to storage`, "info"]);

    // late check against the cutoff
    const lateTote = clockStart + toteStored * rate > CUT_MIN;
    const latePal = clockStart + palStored * rate > CUT_MIN;
    return { k, T, orderT, toteStored, palStored, lateTote, latePal, noteT: [toteStored + 0.4, palStored + 0.5] };
  };

  const f1 = flow(0, 0);
  const f2 = flow(1, n === 1 ? 1 : 7);

  // ---- put-away forklift for pallets (one vehicle, two trips) ----
  const trips = [[20, f1], [n === 1 ? 25 : 26.5, f2]];
  const flcPath = [[0, 0.5, 0, 6.2]];
  trips.forEach(([tFork, f]) => {
    const start = { x: -2, z: PALLET_LANE_Z + (f.k === 0 ? -0.4 : 0.9) };
    flcPath.push(
      [tFork - 1.2, start.x - 1.0, 0, start.z],
      [tFork + 0.5, start.x - 1.0, 0, start.z],
      [tFork + 4, RACK_PAL.x - 1.4, 0, RACK_PAL.z + (f.k === 0 ? -0.9 : 0.9)],
      [tFork + 5.2, 0.5, 0, 6.2]
    );
  });
  actors.push({ id: "FL-PUTAWAY", kind: "forklift", color: 0xff8c42, spawn: 0, path: flcPath });

  // ---- delivery notes & downstream flow / stop logic ----
  [f1, f2].forEach((f) => {
    messages.push([f.noteT[0], `Truck ${f.T.key}: aKL in storage \u2014 delivery note printed (${fmtClock(clockStart + f.toteStored * rate)})`, f.lateTote ? "err" : "ok"]);
    messages.push([f.noteT[1], `Truck ${f.T.key}: pallet in storage \u2014 delivery note printed (${fmtClock(clockStart + f.palStored * rate)})`, f.latePal ? "err" : "ok"]);

    if (f.lateTote || f.latePal) {
      const tLate = Math.min(f.lateTote ? f.toteStored : 1e9, f.latePal ? f.palStored : 1e9);
      stopT = stopT === null ? tLate : Math.min(stopT, tLate);
      lateCarriers.push(`AKL-${f.T.key}`, `PAL-${f.T.key}`);
      stats.outbound.push(null, null);
      messages.push([tLate + 0.6, `Truck ${f.T.key}: put-away completed AFTER 14:00`, "err"]);
      messages.push([tLate + 2.2, "Not enough time left for pick, pack and loading \u2014 process stops here", "err"]);
      messages.push([tLate + 4.2, `Truck ${f.T.key} goods ship on the next departure \u2014 tomorrow`, "warn"]);
    } else {
      // carton continues to pick / pack / load
      const tOut = Math.max(f.toteStored, f.palStored) + 1.5;
      stats.outbound.push(tOut + 3.5, tOut + 3.5);
      actors.push({
        id: `SHIP-${f.T.key}`, kind: "box", color: f.T.color, spawn: tOut, despawn: tOut + 4.2,
        path: [
          [tOut, RACK_AKL.x + 0.6, 0.5, 1.0],
          [tOut + 3.5, OUT_X, 0.5, OUT_Z],
        ],
        labels: [[tOut + 0.3, "PICK \u00b7 PACK \u00b7 LOAD", `truck ${f.T.key} \u00b7 same day`, C.green]],
      });
      messages.push([tOut, `Truck ${f.T.key}: before 14:00 \u2014 enough time for pick, pack and loading`, "ok"]);
      messages.push([tOut + 3.4, `Truck ${f.T.key} shipment ready to leave today`, "ok"]);
    }
  });

  messages.push([0, "Two inbound trucks approaching the receiving gates"]);
  messages.push([Math.max(...stats.docked), "Trucks docked \u2014 forklifts start unloading", "info"]);
  messages.push([cutT, "\u23F0 14:00 cutoff reached \u2014 later put-away cannot ship today", n === 1 ? "info" : "warn"]);

  // mark late carriers
  actors.forEach((a) => {
    if (lateCarriers.includes(a.id)) {
      a.late = true;
      a.labels = a.labels.filter((L) => !L[1].startsWith("DELIVERY"));
      a.labels.push([a.storedT + 0.4, "AFTER 14:00 \u00b7 STOPPED", "ships tomorrow", C.red]);
    }
  });

  messages.sort((a, b) => a[0] - b[0]);
  return { n, duration, clockStart, rate, cutT, stopT, actors, messages, stats, keyMessage };
}


// ---------- outbound packing flow builder ----------
function buildPackScenario(n) {
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
    keyMessage = "Fast package flow from all stations, but the final package count is unknown when the first labels are created.";
    // Station A — order Order A, 1 parcel
    const a1 = base(0, 1, { size: SZ.A1, spawn: 1, packEnd: 3.5, labelT: 3.7, seq: "1/X", move: 4.1 });
    pushSimple(a1, [[a1.labelT, "1/X", C.orange, "count unknown"]]);
    // Station B — order Order B, 2 packages
    const b1 = base(1, 1, { size: SZ.B1, spawn: 0, packEnd: 2.5, labelT: 2.7, seq: "1/X", move: 3.1 });
    const b2 = base(1, 2, { size: SZ.B2, spawn: 5, packEnd: 7.5, labelT: 7.7, seq: "2/X", move: 8.1 });
    pushSimple(b1, [[b1.labelT, "1/X", C.orange, "count unknown"]]);
    pushSimple(b2, [[b2.labelT, "2/X", C.orange, "count unknown"]]);
    // Station C — order Order C, 3 packages
    const c1 = base(2, 1, { size: SZ.C1, spawn: 0, packEnd: 3, labelT: 3.2, seq: "1/X", move: 3.6 });
    const c2 = base(2, 2, { size: SZ.C2, spawn: 4, packEnd: 7, labelT: 7.3, seq: "2/X", move: 7.8 });
    const c3 = base(2, 3, { size: SZ.C3, spawn: 8.5, packEnd: 11.5, labelT: 11.8, seq: "3/X", move: 12.3 });
    pushSimple(c1, [[c1.labelT, "1/X", C.orange, "count unknown"]]);
    pushSimple(c2, [[c2.labelT, "2/X", C.orange, "count unknown"]]);
    pushSimple(c3, [[c3.labelT, "3/X", C.orange, "count unknown"]]);

    messages.push([0, "3 stations packing in parallel: Order A (1 pc) · Order B (2 pcs) · Order C (3 pcs)"]);
    messages.push([2.7, "Order B: label 1/X printed — final package count not yet known", "warn"]);
    messages.push([3.7, "Order A: label 1/X — even the single-package order prints an open count", "warn"]);
    messages.push([7.7, "Order B fully packed — but labels already left as 1/X · 2/X", "warn"]);
    messages.push([11.8, "Order C: all packages packed — count known only now", "ok"]);
    messages.push([13, "All orders packed: 6 packages released immediately, counts confirmed late", "ok"]);
  }

  if (n === 2) {
    duration = 31;
    keyMessage = "Correct final numbering for every order, but multi-package orders wait in the packing area — the more packages, the longer the wait.";
    // Each packing station has its own staging table beside it.
    // The tables are positioned away from the main outbound conveyor and
    // away from the ORTEC infeed branches behind the stations.
    const SLOTS = [
      // 1-package station: one carton position
      [{ x: -10.8, z: 2.0 }],
      // 2-package station: two carton positions on one table
      [{ x: -5.5, z: 1.8 }, { x: -5.5, z: 3.2 }],
      // 3-package station: three carton positions on one table
      [{ x: 0.0, z: 1.7 }, { x: 0.0, z: 3.0 }, { x: 0.0, z: 4.3 }],
    ];
    const pushStaged = (d, slot, finalLabel) => {
      const s = slot;
      const tEnter = d.release + 1.5;
      const tExit = ride(tEnter, entryX(d.st), CONV_END);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.st, d.spawn, d.packEnd + 0.2),
          [d.stageIn, s.x, 0.80 + d.size[1] / 2, s.z],
          [d.release, s.x, 0.80 + d.size[1] / 2, s.z],
          [d.release + 0.7, (s.x + entryX(d.st)) / 2, CONV_Y + 0.6, 2.4],
          [tEnter, entryX(d.st), CONV_Y, 0],
          [tExit, CONV_END, CONV_Y, 0],
        ],
        labels: [[d.finalT, finalLabel, C.green, "final label"]],
        conveyor: [tEnter, tExit], loop: [], stagingIv: [d.stageIn, d.release],
      });
    };
    // A — complete after one package: near-zero penalty
    const a1 = base(0, 1, { size: SZ.A1, spawn: 0.5, packEnd: 3, stageIn: 4.2, finalT: 5.2, release: 6 });
    pushStaged(a1, SLOTS[0][0], "1/1");
    // B — first package waits for the second
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

    messages.push([0, "3 stations packing — packages wait until the complete order is ready for labelling"]);
    messages.push([4.2, "Order A staged — order already complete with 1 package", "info"]);
    messages.push([5.2, "Order A: label 1/1 printed — near-zero waiting for single-package orders", "ok"]);
    messages.push([4.4, "B-1 and C-1 wait without a final label until the order is complete", "warn"]);
    messages.push([9.1, "Order B complete: 2 of 2 packed", "ok"]);
    messages.push([9.8, "Order B: printing final labels 1/2 · 2/2, releasing together", "ok"]);
    messages.push([12.5, "Order C complete: 3 of 3 packed", "ok"]);
    messages.push([13, "Order C: printing final labels 1/3 · 2/3 · 3/3", "ok"]);
    messages.push([16, "Order C released together — first package waited ~12s in staging", "warn"]);
  }

  if (n === 3) {
    duration = 32;
    keyMessage = "Immediate release from all stations with correct numbering downstream — but every incomplete order sends packages through the waiting loop.";
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
    // A — single package: order complete at its own interim, no loop ever
    const a1 = mk(base(0, 1, { size: SZ.A1, spawn: 2, packEnd: 4.5, interimT: 4.7, move: 5.1 }));
    // B — first package loops once (second package packed late)
    const b1 = mk(base(1, 1, { size: SZ.B1, spawn: 0, packEnd: 2.5, interimT: 2.7, move: 3.1 }));
    const b2 = mk(base(1, 2, { size: SZ.B2, spawn: 8, packEnd: 10.5, interimT: 10.7, move: 11 }));
    // C — packages 1 & 2 loop once, package 3 completes the order
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

    messages.push([0, "3 stations packing — every package gets a temporary label and leaves immediately"]);
    messages.push([c1.interimT, "C-1: temporary label — final pending", "info"]);
    messages.push([c1.tArr, "Scan C-1: order 1 of 3 registered → loop", "warn"]);
    messages.push([b1.tArr, "Scan B-1: order 1 of 2 registered → loop", "warn"]);
    messages.push([c2.tArr, "Scan C-2: order 2 of 3 registered → loop", "warn"]);
    messages.push([a1.tArr, "Scan A-1: single-package order complete → final 1/1, no loop", "ok"]);
    messages.push([c3.interimT, "Order C complete: 3 of 3 registered", "ok"]);
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
    // A — proposal 1 package: correct
    const a1 = mk(base(0, 1, { size: SZ.A1, spawn: 0, packEnd: 2.5, labelT: 2.7, move: 3.1, plan: 1 }));
    passThrough(a1, "1/1", "Ortec proposal \u2713");
    // B — proposal 2 packages: correct
    const b1 = mk(base(1, 1, { size: SZ.B1, spawn: 0.5, packEnd: 3, labelT: 3.2, move: 3.6, plan: 2 }));
    const b2 = mk(base(1, 2, { size: SZ.B2, spawn: 4.5, packEnd: 7, labelT: 7.2, move: 7.6, plan: 2 }));
    passThrough(b1, "1/2", "Ortec proposal \u2713");
    passThrough(b2, "2/2", "Ortec proposal \u2713");
    // C — proposal 3 packages, actual 4: parcels 1 & 2 relabelled, 3 & 4 corrected at source
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
      messages.push([d.tArr, `Verify scan C-${i + 1}: label ${i + 1}/3 ≠ actual count 4 → label correction`, "err"]);
      messages.push([det.relabelT, `C-${i + 1} relabelled ${i + 1}/4 — returning to main line`, "ok"]);
    });
    const c3 = mk(base(2, 3, { size: SZ.C3s, spawn: 7.5, packEnd: 10.5, labelT: 10.7, move: 11.1, plan: 3 }));
    const c4 = mk(base(2, 4, { size: SZ.C4, spawn: 11, packEnd: 13.5, labelT: 13.7, move: 14.1, plan: 3 }));
    passThrough(c3, "3/4", "corrected count");
    passThrough(c4, "4/4", "corrected count");
    parcels.forEach((p) => { if (p.order === "C") p.devT = DEV_T; });

    scans.push(c1.tArr, b1.tArr, a1.tArr, c2.tArr, b2.tArr, c3.tArr, c4.tArr);

    messages.push([0, "Ortec packing proposal from master data: A\u21921 \u00b7 B\u21922 \u00b7 C\u21923 packages \u2014 final labels printed directly at pack", "info"]);
    messages.push([2.7, "Order A: label 1/1 per Ortec proposal — released", "ok"]);
    messages.push([3.2, "B-1 (1/2) and C-1 (1/3) labelled per proposal", "ok"]);
    messages.push([DEV_T, "Deviation at Order C: contents exceed Ortec proposal → split, actual count = 4", "err"]);
    messages.push([a1.tArr, "Verify scan A-1: label matches → passes", "ok"]);
    messages.push([b2.tArr, "Verify scan B-2: label matches → passes", "ok"]);
    messages.push([c3.labelT, "C-3 labelled 3/4 with corrected count", "ok"]);
    messages.push([c3.tArr, "Verify scan C-3: label matches → passes", "ok"]);
    messages.push([c4.labelT, "C-4 labelled 4/4 — order fully packed", "ok"]);
  }

  // S1-S4: prepend ORTEC-routed infeed — picked items travel from ITEMS TO BE PACKED
  // to the capacity-matched station before the selected packing scenario begins.
  if (n >= 1) {
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


// chain variant of the inbound flow (no cutoff drama, no own outbound leg)
function buildInboundScenario() {
  const d = buildInboundBase(1);
  d.clockStart = 9 * 60;
  d.cutT = 1e9;
  d.stopT = null;
  d.actors = d.actors.filter((a) => !a.id.startsWith("SHIP-"));
  d.stats.outbound = [];
  d.messages = d.messages
    .filter((m) => !/pick, pack|cutoff|leave today|14:00/i.test(m[1]))
    .map((m) => [m[0], m[1].replace(/ \(\d{2}:\d{2}\)/, ""), m[2]]);
  return d;
}

// shift every timestamp of a packing scenario by dt
function shiftPack(pack, dt) {
  pack.parcels.forEach((p) => {
    ["spawn", "despawn", "packEnd", "move", "labelT", "interimT", "finalT", "stageIn", "release", "tEnter", "tArr", "devT"].forEach((k) => {
      if (typeof p[k] === "number" && p[k] < 1e8) p[k] += dt;
    });
    p.path = p.path.map((w) => [w[0] + dt, w[1], w[2], w[3]]);
    p.labels = p.labels.map((L) => [L[0] + dt, ...L.slice(1)]);
    p.conveyor = [p.conveyor[0] < 1e8 ? p.conveyor[0] + dt : p.conveyor[0], p.conveyor[1] < 1e8 ? p.conveyor[1] + dt : p.conveyor[1]];
    p.loop = p.loop.map(([a, b]) => [a + dt, b + dt]);
    if (p.stagingIv) p.stagingIv = [p.stagingIv[0] + dt, p.stagingIv[1] + dt];
    if (p.relabelIv) p.relabelIv = [p.relabelIv[0] + dt, p.relabelIv[1] + dt];
  });
  pack.messages = pack.messages.map((m) => [m[0] + dt, ...m.slice(1)]);
  pack.scans = pack.scans.map((s) => s + dt);
  pack.duration += dt;
}

const PACK_OFF = 40;

function buildChainData(packScenario = 4) {
  const inb = buildInboundScenario();
  const pack = buildPackScenario(packScenario);
  shiftPack(pack, PACK_OFF);

  // picking link: orders A, B, C are picked from storage and travel to ITEMS TO BE PACKED
  const linkActors = [];
  const pickTimes = [];
  ORDERS.forEach((O, i) => {
    const dep = 34 + i * 2.2;
    pickTimes.push(dep + 3);
    linkActors.push({
      id: `PICK-${O.key}`, kind: "tote", color: O.color,
      spawn: dep - 0.3, despawn: dep + 3.5,
      path: [
        [dep, 6.25, 0.9, 13.3],
        [dep + 3, 6.4, 0.9, 8.9],
      ],
      labels: [[dep, `PICK \u00b7 ORDER ${O.key}`, "from storage", O.color]],
    });
  });
  const messages = [
    ...inb.messages,
    [32.5, "Picking: orders A, B and C are picked from storage", "info"],
    [37.5, "Picked goods arrive at ITEMS TO BE PACKED \u2014 Ortec routing takes over", "ok"],
    ...pack.messages,
  ].sort((a, b) => a[0] - b[0]);

  return {
    mode: "chain",
    duration: pack.duration,
    inb, pack, linkActors, pickTimes, messages,
    keyMessage:
      "One continuous supply chain: goods received in the morning are unloaded, stored, picked, routed by the Ortec proposal to the matching packing station, labelled and shipped \u2014 the label-correction spur handles the one mispredicted order.",
  };
}

// ---------- main component ----------
export default function SupplyChainSim() {
  const mountRef = useRef(null);
  const world = useRef({});
  const [scenario, setScenario] = useState(4);
  const simRef = useRef({ t: 0, playing: false, speed: 1, showIn: true, showOut: true, data: buildChainData(4) });

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showIn, setShowIn] = useState(true);
  const [showOut, setShowOut] = useState(true);
  const [hud, setHud] = useState({ t: 0, clock: "09:00", docked: 0, unloaded: 0, stored: 0, picked: 0, packed: 0, labelled: 0, inFix: 0, shipped: 0, msg: "Press start to run the full supply chain", msgKind: "info", done: false });
  const [panelOpen, setPanelOpen] = useState(true);

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
    scene.fog = new THREE.Fog(C.bg, 70, 140);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 300);
    const fitRadius = () => 58 * Math.max(1, 1.7 / (mount.clientWidth / Math.max(1, mount.clientHeight)));
    const cam = { theta: -0.85, phi: 1.0, radius: fitRadius(), target: new THREE.Vector3(-3, 0.5, 8) };
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

    scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(14, 26, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -45; key.shadow.camera.right = 45;
    key.shadow.camera.top = 45; key.shadow.camera.bottom = -45;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-14, 12, -10);
    scene.add(fill);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(120, 120, 0x2a3648, 0x222d3c);
    grid.position.y = 0.01;
    scene.add(grid);

    // area roots: inbound sits behind the packing area, link connects them
    const inboundRoot = new THREE.Group();
    inboundRoot.position.set(-6, 0, 16);
    const outboundRoot = new THREE.Group();
    const linkRoot = new THREE.Group();
    scene.add(inboundRoot, outboundRoot, linkRoot);
    const propsIn = new THREE.Group();
    inboundRoot.add(propsIn);
    const propsOut = new THREE.Group();
    outboundRoot.add(propsOut);

    const mat = (c, r = 0.7, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

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
      let fs = Math.round(cv.height * 0.45);
      g.font = `bold ${fs}px 'Space Grotesk', sans-serif`;
      const tw = g.measureText(text).width;
      if (tw > cv.width - 24) {
        fs = Math.max(10, Math.floor(fs * (cv.width - 24) / tw));
        g.font = `bold ${fs}px 'Space Grotesk', sans-serif`;
      }
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, cv.width / 2, cv.height / 2);
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide }));
    }
    const zone = (x, z, w, d, color, opacity = 0.1, root = propsIn) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.02, z);
      const b = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
      b.rotation.x = -Math.PI / 2;
      b.position.set(x, 0.035, z);
      root.add(p, b);
      return p;
    };

    // Clearly separated process areas on the warehouse floor
    zone(-12.5, 0.5, 22, 13.5, 0x2f80ed, 0.16, propsIn); // inbound
    zone(8.5, 1.0, 17, 13.5, 0xf2c94c, 0.14, propsIn);   // storage / picking
    zone(-3.5, 2.8, 19, 10.5, 0x27ae60, 0.14, propsOut); // packing

    const inboundAreaSign = makeTextPlane("INBOUND", "#4da3ff", 3.2, 0.55);
    inboundAreaSign.position.set(-15, 0.08, -5.5); inboundAreaSign.rotation.x = -Math.PI / 2; propsIn.add(inboundAreaSign);
    const pickingAreaSign = makeTextPlane("PICKING / STORAGE", "#ffd166", 4.8, 0.55);
    pickingAreaSign.position.set(8.5, 0.08, -5.5); pickingAreaSign.rotation.x = -Math.PI / 2; propsIn.add(pickingAreaSign);
    const packingAreaSign = makeTextPlane("PACKING", "#3ddc84", 3.3, 0.55);
    packingAreaSign.position.set(-3.5, 0.08, 7.1); packingAreaSign.rotation.x = -Math.PI / 2; propsOut.add(packingAreaSign);



    // ================= INBOUND WORLD =================
    // ---------- static world ----------
    // dock canopy + gate signs
    TRUCKS.forEach((T, i) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.0, 3.4), mat(0x26313f, 0.6));
      frame.position.set(DOCK_X + 2.4, 1.5, T.gateZ);
      propsIn.add(frame);
      const sign = makeTextPlane(`GATE ${T.key}`, T.color, 2.2, 0.5);
      sign.position.set(DOCK_X + 2.4, 3.4, T.gateZ);
      propsIn.add(sign);
    });
    zone(RECV_X, 0, 4.4, 10.5, 0x4da3ff, 0.08);
    const recvSign = makeTextPlane("GOODS RECEIPT", C.blue, 3.8, 0.5);
    recvSign.position.set(RECV_X, 2.9, -5.6);
    propsIn.add(recvSign);

    // sorting tables (aKL lane + pallet lane)
    [[SORT_X, CONV_Z - 0.5, "SORT \u2192 aKL"], [SORT_X, PALLET_LANE_Z, "SORT \u2192 PALLET"]].forEach(([tx, tz, label]) => {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 1.8), mat(0x3a4657, 0.5, 0.3));
      top.position.set(tx, 1.0, tz); top.castShadow = true;
      propsIn.add(top);
      [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), mat(0x2a3441, 0.4, 0.5));
        leg.position.set(tx + dx, 0.5, tz + dz);
        propsIn.add(leg);
      });
      const s = makeTextPlane(label, "#8fa0b5", 2.6, 0.42);
      s.position.set(tx, 2.5, tz);
      propsIn.add(s);
    });

    // aKL conveyor
    const convGroupIn = new THREE.Group();
    const beltLenIn = CONV_X1 - CONV_X0 + 1;
    const beltCvIn = document.createElement("canvas");
    beltCvIn.width = 128; beltCvIn.height = 32;
    const bg2In = beltCvIn.getContext("2d");
    bg2In.fillStyle = "#39434f"; bg2In.fillRect(0, 0, 128, 32);
    bg2In.fillStyle = "#2b333d";
    for (let i = 0; i < 8; i++) bg2In.fillRect(i * 16, 0, 8, 32);
    const beltTexIn = new THREE.CanvasTexture(beltCvIn);
    beltTexIn.wrapS = THREE.RepeatWrapping;
    beltTexIn.repeat.set(beltLenIn / 1.2, 1);
    const beltIn = new THREE.Mesh(new THREE.BoxGeometry(beltLenIn, 0.12, 1.2), new THREE.MeshStandardMaterial({ map: beltTexIn, roughness: 0.9 }));
    beltIn.position.set((CONV_X0 + CONV_X1) / 2, 0.62, CONV_Z);
    beltIn.castShadow = true; beltIn.receiveShadow = true;
    convGroupIn.add(beltIn);
    for (let x = CONV_X0; x <= CONV_X1; x += 2.4) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.0), mat(0x232c38, 0.5, 0.4));
      leg.position.set(x, 0.3, CONV_Z);
      convGroupIn.add(leg);
    }
    const arrowsIn = [];
    for (let i = 0; i < 5; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 4), new THREE.MeshBasicMaterial({ color: C.green }));
      a.rotation.z = -Math.PI / 2;
      a.rotation.y = Math.PI / 4;
      a.position.set(CONV_X0 + 1 + i * 2.3, 0.95, CONV_Z);
      convGroupIn.add(a);
      arrowsIn.push(a);
    }
    propsIn.add(convGroupIn);

    // Enlarged high-bay storage area with multiple taller rack aisles
    function rack(x, z, w, levels = 5, h = 6.2) {
      const g = new THREE.Group();
      const depth = 1.9;
      [[-w / 2, -depth / 2], [w / 2, -depth / 2], [-w / 2, depth / 2], [w / 2, depth / 2]].forEach(([dx, dz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), mat(0x415a78, 0.45, 0.45));
        post.position.set(x + dx, h / 2, z + dz);
        post.castShadow = true;
        g.add(post);
      });
      for (let l = 1; l <= levels; l++) {
        const y = (h / (levels + 0.25)) * l;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, depth), mat(0x33507a, 0.5, 0.35));
        beam.position.set(x, y, z);
        beam.castShadow = true;
        g.add(beam);
        for (let bay = -1; bay <= 1; bay++) {
          const load = new THREE.Mesh(new THREE.BoxGeometry(w / 3.6, 0.55, 1.35), mat(bay % 2 ? 0xc9975b : 0x9b6a3f, 0.8, 0.02));
          load.position.set(x + bay * (w / 3.2), y + 0.34, z);
          load.castShadow = true;
          g.add(load);
        }
      }
      propsIn.add(g);
    }
    // Three long high-bay aisles create a visibly larger storage footprint
    [-2.8, 1.0, 4.8].forEach((z, i) => rack(12.0, z, 7.0, 5, 6.4 + i * 0.25));
    rack(6.8, 4.8, 3.8, 4, 5.6);
    zone(10.2, 1.0, 17.0, 13.0, 0xf2c94c, 0.07);
    const storSign = makeTextPlane("HIGH-BAY STORAGE", "#ffd166", 4.2, 0.62);
    storSign.position.set(12.0, 7.2, -4.2);
    propsIn.add(storSign);

    // delivery-note printer at the storage entrance
    const prBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.7), mat(0x222b38, 0.5, 0.4));
    prBody.position.set(10.6, 1.0, 1.0);
    prBody.castShadow = true;
    const prPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8), mat(0x2a3441, 0.4, 0.5));
    prPost.position.set(10.6, 0.4, 1.0);
    const prLight = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: C.green }));
    prLight.position.set(10.9, 1.35, 1.0);
    const prPaper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    prPaper.position.set(10.6, 0.92, 1.4);
    prPaper.rotation.x = -0.5;
    prPaper.visible = false;
    const prSign = makeTextPlane("DELIVERY NOTE PRINTER", "#8fa0b5", 3.2, 0.42);
    prSign.position.set(10.6, 2.1, 1.0);
    propsIn.add(prBody, prPost, prLight, prPaper, prSign);

    // clock / status board near sorting
    const clockCv = document.createElement("canvas");
    clockCv.width = 512; clockCv.height = 256;
    const clockTex = new THREE.CanvasTexture(clockCv);
    const clockPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: clockTex }));
    clockPanel.position.set(-4.5, 3.1, 6.4);
    const clockPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.1), mat(0x2a3441, 0.4, 0.5));
    clockPost.position.set(-4.5, 1.05, 6.4);
    propsIn.add(clockPanel, clockPost);
    let clockState = null;
    function drawClock(timeStr, afterCut, stopped) {
      const keyS = timeStr + afterCut + stopped;
      if (clockState === keyS) return;
      clockState = keyS;
      const g = clockCv.getContext("2d");
      g.fillStyle = "#0a1018"; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#5c6b7d"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 250);
      g.textAlign = "left";
      g.fillStyle = "#8fa0b5";
      g.font = "bold 26px 'IBM Plex Mono', monospace";
      g.fillText("WAREHOUSE TIME", 24, 44);
      g.fillStyle = afterCut ? C.red : "#e8edf4";
      g.font = "bold 84px 'IBM Plex Mono', monospace";
      g.fillText(timeStr, 24, 136);
      g.fillStyle = "#8fa0b5";
      g.font = "26px 'IBM Plex Mono', monospace";
      g.fillText("CUTOFF 14:00 \u00b7 pick \u00b7 pack \u00b7 load", 24, 180);
      g.fillStyle = stopped ? C.red : afterCut ? C.orange : C.green;
      g.font = "bold 28px 'IBM Plex Mono', monospace";
      g.fillText(stopped ? "LATE PUT-AWAY \u2014 FLOW STOPPED" : afterCut ? "CUTOFF PASSED" : "ON TRACK FOR TODAY", 24, 226);
      clockTex.needsUpdate = true;
    }
    drawClock("12:30", false, false);





    // ================= OUTBOUND / PACKING WORLD =================
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
      propsOut.add(g);
    });
    // capacity group signs
    [
      ["1-PACKAGE STATION", STATIONS[0].x],
      ["2-PACKAGE STATION", STATIONS[1].x],
      ["3-PACKAGE STATION", STATIONS[2].x],
    ].forEach(([txt, sx]) => {
      const sign = makeTextPlane(txt, "#8fa0b5", 3.2, 0.45);
      sign.position.set(sx, 3.0, 3.2);
      propsOut.add(sign);
    });

    // main conveyor
    const convGroupOut = new THREE.Group();
    const beltLenOut = 43;
    const beltCvOut = document.createElement("canvas");
    beltCvOut.width = 128; beltCvOut.height = 32;
    const bg2Out = beltCvOut.getContext("2d");
    bg2Out.fillStyle = "#39434f"; bg2Out.fillRect(0, 0, 128, 32);
    bg2Out.fillStyle = "#2b333d";
    for (let i = 0; i < 8; i++) bg2Out.fillRect(i * 16, 0, 8, 32);
    const beltTexOut = new THREE.CanvasTexture(beltCvOut);
    beltTexOut.wrapS = THREE.RepeatWrapping;
    beltTexOut.repeat.set(beltLenOut / 1.2, 1);
    const beltOut = new THREE.Mesh(new THREE.BoxGeometry(beltLenOut, 0.12, 1.3), new THREE.MeshStandardMaterial({ map: beltTexOut, roughness: 0.9 }));
    beltOut.position.set(CONV_START + beltLenOut / 2, 0.62, 0);
    beltOut.receiveShadow = true; beltOut.castShadow = true;
    convGroupOut.add(beltOut);
    // conveyor frame + legs
    for (let x = CONV_START + 0.5; x <= CONV_END; x += 2.5) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.1), mat(0x232c38, 0.5, 0.4));
      leg.position.set(x, 0.3, 0);
      convGroupOut.add(leg);
    }
    // side rails
    [-0.72, 0.72].forEach((dz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(beltLenOut, 0.08, 0.06), mat(0x4c5a6b, 0.4, 0.5));
      rail.position.set(CONV_START + beltLenOut / 2, 0.86, dz);
      convGroupOut.add(rail);
    });
    propsOut.add(convGroupOut);

    // green flow arrowsOut on main conveyor
    const arrowMatOut = new THREE.MeshBasicMaterial({ color: C.green });
    const arrowsOut = [];
    for (let i = 0; i < 14; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 4), arrowMatOut);
      a.rotation.z = -Math.PI / 2;
      a.rotation.y = Math.PI / 4;
      a.position.set(-14.5 + i * 3, 0.95, 0);
      convGroupOut.add(a);
      arrowsOut.push(a);
    }

    // exit portal
    const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 2.2), mat(0x26313f, 0.6));
    exitFrame.position.set(CONV_END + 0.2, 1.2, 0);
    propsOut.add(exitFrame);
    const exitSign = makeTextPlane("TO SHIPPING", C.green, 2.4, 0.5);
    exitSign.position.set(CONV_END + 0.2, 2.7, 0);
    exitSign.rotation.y = -Math.PI / 2;
    propsOut.add(exitSign);

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

    const sourceSign = makeTextPlane("ITEMS TO BE PACKED", "#e8edf4", 3.8, 0.5);
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
      "#e8edf4",
      8.8,
      0.55
    );
    routingSign.position.set(-2.2, 2.45, SPINE_Z + 0.9);
    infeedGroup.add(routingSign);
    propsOut.add(infeedGroup);

    // Waiting area (scenario 2) — one staging table beside each station.
    // No conveyor passes over or through these tables.
    const staging = new THREE.Group();

    const stagingTables = [
      {
        station: STATIONS[0],
        label: "1-PACKAGE STAGING · 1 CARTON",
        color: ORDERS[0].color,
        center: [-10.8, 2.0],
        size: [1.7, 1.7],
        slots: [[-10.8, 2.0]],
      },
      {
        station: STATIONS[1],
        label: "2-PACKAGE STAGING · 2 CARTONS",
        color: ORDERS[1].color,
        center: [-5.5, 2.5],
        size: [1.7, 3.1],
        slots: [[-5.5, 1.8], [-5.5, 3.2]],
      },
      {
        station: STATIONS[2],
        label: "3-PACKAGE STAGING · 3 CARTONS",
        color: ORDERS[2].color,
        center: [0.0, 3.0],
        size: [1.7, 4.5],
        slots: [[0.0, 1.7], [0.0, 3.0], [0.0, 4.3]],
      },
    ];

    stagingTables.forEach((cfg) => {
      const [cx, cz] = cfg.center;
      const [tableWidth, tableDepth] = cfg.size;

      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(tableWidth, 0.16, tableDepth),
        mat(0x596474, 0.65, 0.2)
      );
      tableTop.position.set(cx, 0.72, cz);
      tableTop.castShadow = true;
      staging.add(tableTop);

      [
        [-tableWidth / 2 + 0.16, -tableDepth / 2 + 0.16],
        [tableWidth / 2 - 0.16, -tableDepth / 2 + 0.16],
        [-tableWidth / 2 + 0.16, tableDepth / 2 - 0.16],
        [tableWidth / 2 - 0.16, tableDepth / 2 - 0.16],
      ].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.7, 0.11),
          mat(0x2a3441, 0.5, 0.45)
        );
        leg.position.set(cx + dx, 0.35, cz + dz);
        staging.add(leg);
      });

      cfg.slots.forEach(([sx, sz], slotIndex) => {
        const marker = new THREE.Mesh(
          new THREE.PlaneGeometry(1.15, 1.05),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(cfg.color),
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
          })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(sx, 0.815, sz);
        staging.add(marker);

        const border = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.15, 1.05)),
          new THREE.LineBasicMaterial({ color: cfg.color })
        );
        border.rotation.x = -Math.PI / 2;
        border.position.set(sx, 0.825, sz);
        staging.add(border);

        const number = makeTextPlane(
          `${slotIndex + 1}/${cfg.slots.length}`,
          cfg.color,
          0.9,
          0.3
        );
        number.position.set(sx, 1.08, sz);
        number.rotation.x = -Math.PI / 2;
        staging.add(number);
      });

      const tableSign = makeTextPlane(
        cfg.label,
        cfg.color,
        3.8,
        0.42
      );
      tableSign.position.set(cx, 2.2, cz);
      staging.add(tableSign);
    });

    propsOut.add(staging);

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
    propsOut.add(machine);

    // waiting loop conveyor (scenario 3)
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
    // orange loop arrowsOut
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
    const loopSign = makeTextPlane("WAITING LOOP · FINAL LABEL PENDING", C.orange, 4.4, 0.5);
    loopSign.position.set(MACHINE_X - 2.5, 1.8, -4.9);
    loopGroup.add(loopSign);
    propsOut.add(loopGroup);

    // label correction station (scenario 4) — long side spur integrated into the flow
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
    // red flow arrowsOut along the spur
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
    const relabelSign = makeTextPlane("LABEL CORRECTION", C.red, 3.2, 0.5);
    relabelSign.position.set(MACHINE_X + 3, 3.2, 4.3);
    relabelGroup.add(relabelSign);
    propsOut.add(relabelGroup);

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
    propsOut.add(ortecGroup);
    let ortecState = null;
    function drawOrtec(devKnown) {
      if (ortecState === devKnown) return;
      ortecState = devKnown;
      const g = ortecCv.getContext("2d");
      g.fillStyle = "#0a1018"; g.fillRect(0, 0, 512, 300);
      g.strokeStyle = "#5c6b7d"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 294);
      g.textAlign = "left";
      g.fillStyle = "#e8edf4";
      g.font = "bold 32px 'IBM Plex Mono', monospace";
      g.fillText("ORTEC PACKING PROPOSAL", 24, 48);
      g.fillStyle = "#8fa0b5";
      g.font = "20px 'IBM Plex Mono', monospace";
      g.fillText("predicted packages \u2192 labels printed at pack", 24, 80);
      g.font = "26px 'IBM Plex Mono', monospace";
      const rows = [
        ["Order A", "1 package ", "1/1", "#00c8ff", false],
        ["Order B", "2 packages", "1/2 2/2", "#ffd166", false],
        devKnown
          ? ["Order C", "3\u21924 pcs ", "x/4", "#ff5c5c", true]
          : ["Order C", "3 packages", "1/3 2/3 3/3", "#e44cff", false],
      ];
      rows.forEach((r, i) => {
        const y = 128 + i * 44;
        g.fillStyle = r[3];
        g.fillText(`${r[0]}  ${r[1]}  ${r[2]}`, 24, y);
      });
      g.fillStyle = devKnown ? "#ff5c5c" : "#3ddc84";
      g.font = "bold 24px 'IBM Plex Mono', monospace";
      g.fillText(devKnown ? "DEVIATION: ORDER C SPLIT \u2192 4" : "ORTEC PROPOSAL ACTIVE", 24, 276);
      ortecTex.needsUpdate = true;
    }
    drawOrtec(false);

    // order banner
    const orderSign = makeTextPlane("PACKING AREA", "#e8edf4", 4.2, 0.7);
    orderSign.position.set(-3.5, 4.4, 3.2);
    propsOut.add(orderSign);



    // Show the physical equipment required by the selected packing scenario.
    // S1: direct labels with open package count (1/X, 2/X, 3/X)
    // S2: packages wait on staging tables until the complete order is ready
    // S3: interim labels, downstream labelling machine and waiting loop
    // S4: predictive ORTEC labels, verification scan and correction spur
    staging.visible = scenario === 2;
    loopGroup.visible = scenario === 3;
    machine.visible = scenario === 3 || scenario === 4;
    relabelGroup.visible = scenario === 4;
    ortecGroup.visible = scenario === 4;
    infeedGroup.visible = true;

    // ================= PICKING LINK =================
    const linkBelt = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 5.0), new THREE.MeshStandardMaterial({ color: 0x2e4a3a, roughness: 0.9 }));
    linkBelt.position.set(6.3, 0.62, 11.2);
    linkBelt.castShadow = true;
    linkRoot.add(linkBelt);
    for (let z = 9.4; z <= 13; z += 1.8) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.9), mat(0x232c38, 0.5, 0.4));
      leg.position.set(6.3, 0.3, z);
      linkRoot.add(leg);
    }
    for (let z = 12.6; z >= 9.6; z -= 1.5) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 4), new THREE.MeshBasicMaterial({ color: C.green }));
      a.position.set(6.3, 0.95, z);
      a.rotation.x = -Math.PI / 2;
      linkRoot.add(a);
    }
    const pickSign = makeTextPlane("PICKING \u2192 PACKING", C.green, 3.8, 0.5);
    pickSign.position.set(6.3, 2.5, 11.2);
    pickSign.rotation.y = -Math.PI / 2;
    linkRoot.add(pickSign);
    // picker figure at the storage rack
    const picker = new THREE.Group();
    const pkBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 12), mat(0x4a5f78, 0.8));
    pkBody.position.y = 1.15; pkBody.castShadow = true;
    const pkHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat(0xd9a679, 0.9));
    pkHead.position.y = 1.85;
    const pkHelm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd166, 0.6));
    pkHelm.position.y = 1.9;
    const pkLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.7, 10), mat(0x22303f, 0.9));
    pkLegs.position.y = 0.45;
    picker.add(pkBody, pkHead, pkHelm, pkLegs);
    picker.position.set(7.4, 0, 13.6);
    linkRoot.add(picker);

    // ================= DYNAMIC: inbound actors + link totes =================
    // ---------- dynamic actors ----------
    const inMeshes = [];
    const linkMeshes = [];
    function disposeGroup(g) {
      g.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
    function buildTruck(color) {
      const g = new THREE.Group();
      const trailer = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.2, 2.2), mat(0xdfe5ec, 0.6, 0.15));
      trailer.position.set(-0.6, 1.55, 0); trailer.castShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.62, 0.34, 2.22), new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5 }));
      stripe.position.set(-0.6, 1.05, 0);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 2.0), new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5 }));
      cab.position.set(2.4, 1.05, 0); cab.castShadow = true;
      g.add(trailer, stripe, cab);
      [[-2.2], [-0.6], [1.0], [2.4]].forEach(([wx]) => {
        [-0.95, 0.95].forEach((wz) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), mat(0x161c24, 0.9));
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.42, wz);
          g.add(wheel);
        });
      });
      return g;
    }
    function buildForklift() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.75, 1.05), mat(0xff8c42, 0.55, 0.2));
      body.position.set(-0.15, 0.62, 0); body.castShadow = true;
      const guardA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), mat(0x2a3441, 0.5));
      guardA.position.set(-0.55, 1.4, -0.42);
      const guardB = guardA.clone(); guardB.position.z = 0.42;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 1.0), mat(0x2a3441, 0.5));
      roof.position.set(-0.2, 1.85, 0);
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.9), mat(0x415a78, 0.5, 0.4));
      mast.position.set(0.55, 0.85, 0);
      g.add(body, guardA, guardB, roof, mast);
      [-0.28, 0.28].forEach((fz) => {
        const fork = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.13), mat(0x9aa7b5, 0.4, 0.6));
        fork.position.set(1.05, 0.22, fz);
        g.add(fork);
      });
      [[-0.55, -0.5], [-0.55, 0.5], [0.35, -0.5], [0.35, 0.5]].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), mat(0x161c24, 0.9));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.26, wz);
        g.add(wheel);
      });
      return g;
    }
    function buildBox(color) {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.75), mat(C.cardboard, 0.85));
      box.castShadow = true;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.16, 0.77), new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.6 }));
      g.add(box, band);
      return g;
    }
    function buildTote(color) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.7), mat(0x2f6fb0, 0.55, 0.15));
      body.castShadow = true;
      const rim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.75), new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5 }));
      rim.position.y = 0.3;
      const content = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.5), mat(C.cardboard, 0.85));
      content.position.y = 0.32;
      g.add(body, rim, content);
      return g;
    }
    function buildPallet(color) {
      const g = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 1.05), mat(0x8a6a3d, 0.9));
      deck.position.y = 0.12; deck.castShadow = true;
      const feet = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.95), mat(0x6f5531, 0.95));
      feet.position.y = 0.0;
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.8), mat(C.cardboard, 0.85));
      b1.position.y = 0.48; b1.castShadow = true;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.82), new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.6 }));
      band.position.y = 0.48;
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.55), mat(C.cardboard, 0.85));
      b2.position.y = 0.98;
      g.add(feet, deck, b1, band, b2);
      return g;
    }

    function buildActorList(list, root, store) {
      store.forEach((a) => { root.remove(a.group); disposeGroup(a.group); });
      store.length = 0;
      list.forEach((ad) => {
        let group;
        if (ad.kind === "truck") group = buildTruck(ad.color);
        else if (ad.kind === "forklift") group = buildForklift();
        else if (ad.kind === "tote") group = buildTote(ad.color);
        else if (ad.kind === "pallet") group = buildPallet(ad.color);
        else group = buildBox(ad.color);
        // label sprite
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture("\u2014", "", "#555"), transparent: true }));
        spr.scale.set(2.0, 1.0, 1);
        spr.position.y = ad.kind === "truck" ? 3.4 : ad.kind === "pallet" ? 1.9 : 1.5;
        spr.visible = false;
        group.add(spr);
        group.visible = false;
        root.add(group);
        store.push({ ad, group, spr, appliedLabel: -1, lastYaw: 0 });
      });
    }
    buildActorList(simRef.current.data.inb.actors, inboundRoot, inMeshes);
    buildActorList(simRef.current.data.linkActors, linkRoot, linkMeshes);



    // ================= DYNAMIC: packing parcels =================
    // ---------- parcels ----------
    const parcelMeshes = [];
    function buildPackParcels(data) {
      parcelMeshes.forEach((p) => {
        outboundRoot.remove(p.group);
        p.group.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
      });
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
        outboundRoot.add(group);
        parcelMeshes.push({ group, box, boxMat, spr, aux, appliedLabel: -1, auxText: "" });
      });
    }
    buildPackParcels(simRef.current.data.pack);



    let dispState = null;
    function drawMachineDisplay(state) {
      const dispKey = JSON.stringify(state);
      if (dispKey === dispState) return;
      dispState = dispKey;
      const g = dispCv.getContext("2d");
      g.fillStyle = "#0a1018"; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#33507a"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 250);
      g.font = "bold 30px 'IBM Plex Mono', monospace";
      g.fillStyle = "#8fa0b5";
      g.fillText(state.mode === "verify" ? "CHECK PACKAGE LABEL" : "FINAL LABEL MACHINE", 24, 46);
      g.fillStyle = "#e8edf4";
      g.font = "26px 'IBM Plex Mono', monospace";
      g.fillText(`ORDER  ${state.order || "\u2014"}`, 24, 92);
      g.fillText(`PARCEL ${state.parcel || "\u2014"}`, 24, 128);
      if (state.mode === "verify") {
        g.fillText(`PLAN ${state.plan}  ACT ${state.act}`, 24, 164);
        g.fillStyle = state.mismatch ? C.red : C.green;
        g.fillText(state.mismatch ? "MISMATCH \u2192 DIVERT" : "LABEL CORRECT", 24, 204);
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


    // ---------- camera controls ----------
    const el = renderer.domElement;
    let dragging = false, panning = false, lx = 0, ly = 0, lastDist = 0;
    const onDown = (e) => { dragging = true; panning = e.button === 2 || e.shiftKey; lx = e.clientX; ly = e.clientY; };
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
      cam.radius = Math.min(130, Math.max(6, cam.radius * (1 + e.deltaY * 0.001)));
      applyCam();
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 1) { dragging = true; panning = false; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }
      else if (e.touches.length === 2) lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
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
        cam.radius = Math.min(130, Math.max(6, cam.radius * (lastDist / d)));
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

    // ---------- shared inbound-style actor update ----------
    function updateActorMesh(am, t) {
        const ad = am.ad;
        const visible = t >= ad.spawn && !(ad.despawn && t >= ad.despawn);
        am.group.visible = visible;
        if (!visible) return;
        const [, x, y, z] = posAt(ad.path, t);
        am.group.position.set(x, y, z);

        // heading for vehicles
        if (ad.kind === "truck" || ad.kind === "forklift") {
          const p2 = posAt(ad.path, t + 0.12);
          const dx = p2[1] - x, dz = p2[3] - z;
          if (Math.abs(dx) + Math.abs(dz) > 0.01) am.lastYaw = Math.atan2(-dz, dx);
          am.group.rotation.y = am.lastYaw;
        }

        // fade in/out for despawning actors
        if (ad.despawn) {
          let f = 1;
          if (t < ad.spawn + 0.35) f = (t - ad.spawn) / 0.35;
          if (t > ad.despawn - 0.4) f = Math.min(f, (ad.despawn - t) / 0.4);
          am.group.scale.setScalar(Math.max(0.02, f));
        } else am.group.scale.setScalar(1);

        // labels
        const labels = ad.labels || [];
        let li = -1;
        labels.forEach(([lt], kk) => { if (t >= lt) li = kk; });
        if (li !== am.appliedLabel) {
          am.appliedLabel = li;
          if (li >= 0) {
            const [, main, sub, col] = labels[li];
            if (am.spr.material.map) am.spr.material.map.dispose();
            am.spr.material.map = makeLabelTexture(main, sub, col);
            am.spr.material.needsUpdate = true;
            am.spr.visible = true;
          } else am.spr.visible = false;
        }

        // status glow: green when orderable, red when late-stopped
        if (ad.orderableT !== undefined) {
          am.group.traverse((o) => {
            if (o.material && o.material.emissive !== undefined) {
              const late = ad.late && t >= ad.storedT;
              const fresh = t >= ad.orderableT && t < ad.orderableT + 2.2;
              o.material.emissive.setHex(late ? 0x4d1414 : fresh ? 0x0d4d28 : 0x000000);
            }
          });
        }

    }

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
      const dI = data.inb;
      const dP = data.pack;

      if (S.rebuilt) {
        buildActorList(dI.actors, inboundRoot, inMeshes);
        buildActorList(data.linkActors, linkRoot, linkMeshes);
        buildPackParcels(dP);
        S.rebuilt = false;
      }

      // area visibility toggles
      inboundRoot.visible = S.showIn;
      outboundRoot.visible = S.showOut;
      linkRoot.visible = S.showIn && S.showOut;

      if (S.playing) {
        S.t = Math.min(data.duration, S.t + dtReal * S.speed);
        if (S.t >= data.duration) S.playing = false;
      }
      const t = S.t;
      const clockMin = dI.clockStart + t * dI.rate;

      // inbound side
      beltTexIn.offset.x -= dtReal * (S.playing ? S.speed : 0) * 1.4;
      drawClock(fmtClock(clockMin), false, false);
      const noteSoon = dI.stats.notes.some((nt) => Math.abs(t - nt) < 0.6);
      prPaper.visible = noteSoon;
      prLight.material.color.set(noteSoon ? C.orange : C.green);
      inMeshes.forEach((am) => updateActorMesh(am, t));
      linkMeshes.forEach((am) => updateActorMesh(am, t));
      arrowsIn.forEach((a, i) => { a.position.y = 0.95 + 0.05 * Math.sin(now * 0.006 + i); });
      const pickingNow = data.linkActors.some((a) => t >= a.spawn && t < (a.despawn || 1e9));
      picker.position.y = pickingNow ? Math.abs(Math.sin(now * 0.008)) * 0.08 : 0;

      // outbound side
      beltTexOut.offset.x -= dtReal * (S.playing ? S.speed : 0) * 1.6;
      // packer bob & printer flash per station
      packers.forEach((packer, si) => {
        const anyPacking = dP.parcels.some((p) => p.st === si && t >= p.spawn && t < p.packEnd);
        packer.position.y = anyPacking ? Math.abs(Math.sin(now * 0.008)) * 0.08 : 0;
      });
      printerPapers.forEach((paper, si) => {
        const stationLabelSoon = dP.parcels.some(
          (p) => p.st === si && p.labels.some((L) => !L[4] && L[0] <= p.move + 0.6 && Math.abs(t - L[0]) < 0.5)
        );
        paper.visible = stationLabelSoon;
        printerLights[si].material.color.set(stationLabelSoon ? C.orange : C.green);
      });

      // scanner beam pulse
      let beamOn = false;
      if (dP.n === 3 || dP.n === 4) {
        beamOn = dP.scans.some((st) => t >= st && t <= st + 1.0);
        beam.material.opacity = beamOn ? 0.35 + 0.25 * Math.sin(now * 0.02) : 0;
      }

      // Ortec board state
      if (dP.n === 4) {
        const devP = dP.parcels.find((p) => p.devT !== undefined);
        drawOrtec(devP ? t >= devP.devT : false);
      }

      // machine display state
      if (dP.n === 3 || dP.n === 4) {
        let scansN = 0;
        dP.scans.forEach((st) => { if (t >= st) scansN++; });
        let current = "—", currentP = null;
        dP.parcels.forEach((p) => {
          const pos = posAt(p.path, t);
          if (Math.abs(pos[1] - MACHINE_X) < 0.8 && Math.abs(pos[3]) < 0.8 && t >= p.conveyor[0]) { current = p.id; currentP = p; }
        });
        if (dP.n === 3) {
          // per-order registration status of the parcel currently at the machine
          let reg = 0, total = 3, orderNo = "\u2014";
          if (currentP) {
            orderNo = currentP.order;
            total = currentP.orderSize;
            dP.parcels.forEach((p) => { if (p.order === currentP.order && t >= p.labels[0][0]) reg++; });
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
      const waitByOrder = { A: 0, B: 0, C: 0 };
      dP.parcels.forEach((pd, i) => {
        const pm = parcelMeshes[i];
        if (!pm) return;
        const visible = t >= pd.spawn && !(pd.despawn && t >= pd.despawn);
        pm.group.visible = visible;
        if (!visible) return;
        const [, x, y, z] = posAt(pd.path, t);
        pm.group.position.set(x, y, z);
        // pack scale-in / tote fade in-out
        if (pd.tote) {
          let f = 1;
          if (t < pd.spawn + 0.4) f = (t - pd.spawn) / 0.4;
          if (pd.despawn && t > pd.despawn - 0.45) f = Math.min(f, (pd.despawn - t) / 0.45);
          pm.group.scale.setScalar(Math.max(0.02, f));
        } else if (t < pd.packEnd) {
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
            if (pm.spr.material.map) pm.spr.material.map.dispose();
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
        if (dP.n === 3 && passStarted > 0) auxTxt = `loop passes: ${passStarted}`;
        if (inRelabelNow) auxTxt = "→ label correction";
        else if (pd.relabelIv && t >= pd.relabelIv[1]) auxTxt = "relabelled ✓";
        if (auxTxt !== pm.auxText) {
          pm.auxText = auxTxt;
          if (auxTxt) {
            const auxCol = inRelabelNow ? C.red : auxTxt.startsWith("relabelled") ? C.green : inLoopNow || inStaging ? C.yellow : C.dim;
            if (pm.aux.material.map) pm.aux.material.map.dispose();
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
          waitByOrder[pd.order] += w;
        }
        if (dP.n === 3) {
          pd.loop.forEach(([a, b]) => {
            if (t >= a) {
              const w = Math.min(t, b) - a;
              waitSum += w;
              waitByOrder[pd.order] += w;
            }
          });
          waitCount = dP.parcels.filter((p) => !p.tote).length;
        }
        if (dP.n === 4) {
          if (pd.relabelIv && t >= pd.relabelIv[0]) {
            const w = Math.min(t, pd.relabelIv[1]) - pd.relabelIv[0];
            waitSum += w;
            waitByOrder[pd.order] += w;
          }
          waitCount = dP.parcels.filter((p) => !p.tote).length;
        }
        // handling steps: label events passed + staging moves
        pd.labels.forEach(([lt]) => { if (t >= lt) handling++; });
        if (pd.stagingIv && t >= pd.stagingIv[0]) handling++;
        if (pd.stagingIv && t >= pd.stagingIv[1]) handling++;
      });
      dP.scans.forEach((st) => { if (t >= st) scansN++; });


      arrowsOut.forEach((a, i) => { a.material.opacity = 1; a.position.y = 0.95 + 0.05 * Math.sin(now * 0.006 + i); });

      // HUD throttle
      hudTimer += dtReal;
      if (hudTimer > 0.12) {
        hudTimer = 0;
        const cnt = (arr) => arr.filter((x) => x !== null && t >= x).length;
        let msg = "Press start to run the full supply chain", kindM = "info";
        for (const m of data.messages) if (t >= m[0]) { msg = m[1]; kindM = m[2] || "info"; }
        const shipped = dP.parcels.filter((p) => !p.tote && t >= p.conveyor[1]).length;
        setHud({
          t,
          clock: fmtClock(clockMin),
          docked: cnt(dI.stats.docked),
          unloaded: cnt(dI.stats.unloaded),
          stored: cnt(dI.stats.stored),
          picked: cnt(data.pickTimes),
          packed, labelled, inFix: inLoop, shipped,
          msg, msgKind: kindM,
          done: t >= data.duration,
        });
        setPlaying(S.playing);
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    world.current = { cam, applyCam, fitRadius };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [scenario]);

  // spacebar toggles play/pause
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        const S = simRef.current;
        S.playing = !S.playing && S.t < S.data.duration;
        setPlaying(S.playing);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- UI actions ----------
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
    S.data.inb.actors.forEach((a) => {
      events.push(a.spawn);
      if (a.despawn) events.push(a.despawn);
      (a.labels || []).forEach(([lt]) => events.push(lt));
      if (a.storedT !== undefined) events.push(a.storedT);
    });
    S.data.linkActors.forEach((a) => events.push(a.spawn, a.despawn));
    S.data.pack.parcels.forEach((p) => {
      events.push(p.spawn, p.packEnd, p.conveyor[0], p.conveyor[1]);
      p.labels.forEach(([lt]) => events.push(lt));
      if (p.relabelIv) events.push(...p.relabelIv);
    });
    S.data.messages.forEach((m) => events.push(m[0]));
    const next = events.filter((e) => typeof e === "number" && e < 1e8 && e > S.t + 0.01).sort((a, b) => a - b)[0];
    S.t = Math.min(next !== undefined ? next : S.data.duration, S.data.duration);
    S.playing = false;
  };
  const changeScenario = (nextScenario) => {
    const nextData = buildChainData(nextScenario);
    simRef.current = { ...simRef.current, t: 0, playing: false, data: nextData };
    setPlaying(false);
    setScenario(nextScenario);
    setHud({ t: 0, clock: "09:00", docked: 0, unloaded: 0, stored: 0, picked: 0, packed: 0, labelled: 0, inFix: 0, shipped: 0, msg: `Scenario S${nextScenario} selected — press Start to run the changed packing flow`, msgKind: "info", done: false });
  };
  const setSpd = (v) => { simRef.current.speed = v; setSpeed(v); };
  const toggleIn = () => setShowIn((v) => { simRef.current.showIn = !v; return !v; });
  const toggleOut = () => setShowOut((v) => { simRef.current.showOut = !v; return !v; });
  const setView = (name) => {
    const { cam, applyCam, fitRadius } = world.current;
    const views = {
      "Full Chain": { target: [-3, 0.5, 8], theta: -0.85, phi: 1.0, radius: fitRadius ? fitRadius() : 58 },
      "Inbound Docks": { target: [-20, 1, 16], theta: -0.6, phi: 1.0, radius: 18 },
      "Storage & Picking": { target: [6.3, 1, 12], theta: -0.9, phi: 0.95, radius: 15 },
      "Packing Stations": { target: [-3.5, 1, 3.2], theta: -0.75, phi: 1.0, radius: 21 },
      "Label Check": { target: [MACHINE_X, 1.5, 0], theta: -1.2, phi: 1.0, radius: 11 },
      Shipping: { target: [CONV_END - 3, 1, 0], theta: -0.7, phi: 0.95, radius: 13 },
    };
    const v = views[name];
    cam.target.set(...v.target);
    cam.theta = v.theta; cam.phi = v.phi; cam.radius = v.radius;
    applyCam();
  };

  const data = simRef.current.data;
  const kind = hud.msgKind;
  const msgColor = kind === "ok" ? C.green : kind === "warn" ? C.orange : kind === "err" ? C.red : C.blue;
  const truckM = hud.msg.match(/Truck (\d)/);
  const orderM = hud.msg.match(/Order ([ABC])\b/) || hud.msg.match(/\b([ABC])-\d/);
  const dotColor = truckM ? TRUCKS[Number(truckM[1]) - 1].color : orderM ? (ORDERS.find((o) => o.key === orderM[1]) || {}).color : null;

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
    <div style={{ position: "absolute", inset: 0, background: C.bg, color: C.text, fontFamily: "'Space Grotesk', system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; } button:active { transform: translateY(1px); }`}</style>

      {/* Header */}
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ marginRight: "auto" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>Full Supply Chain — Inbound to Shipping</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>Truck → storage → pick → Ortec routing → pack → label → ship</div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginRight: 2 }}>PACKING SCENARIO</span>
          {[1, 2, 3, 4].map((n) => (
            <button key={n} style={smallBtn(scenario === n)} onClick={() => changeScenario(n)}>S{n}</button>
          ))}
        </div>
        <button style={btn(showIn)} onClick={toggleIn}>{showIn ? "◉" : "○"} Inbound</button>
        <button style={btn(showOut)} onClick={toggleOut}>{showOut ? "◉" : "○"} Outbound</button>
      </div>

      {/* 3D viewport */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", maxWidth: "92%", background: "rgba(13,18,25,0.9)", border: `1px solid ${msgColor}`, borderRadius: 10, padding: "8px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: msgColor, textAlign: "center" }}>
          {dotColor && (
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: dotColor, marginRight: 7, verticalAlign: "middle" }} />
          )}
          {hud.msg}
        </div>

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

        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {["Full Chain", "Inbound Docks", "Storage & Picking", "Packing Stations", "Label Check", "Shipping"].map((v) => (
            <button key={v} style={smallBtn(false)} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>

        <div style={{ position: "absolute", top: 56, right: 10, width: 240, background: "rgba(20,27,37,0.94)", border: `1px solid ${C.line}`, borderRadius: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, overflow: "hidden" }}>
          <div onClick={() => setPanelOpen((o) => !o)} style={{ padding: "7px 10px", background: C.panel2, cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>SUPPLY CHAIN STATUS</span><span>{panelOpen ? "−" : "+"}</span>
          </div>
          {panelOpen && (
            <div style={{ padding: "6px 10px 10px" }}>
              {stat("Packing scenario", `S${scenario}`, C.blue)}
              {stat("Warehouse time", hud.clock)}
              {stat("Trucks docked", `${hud.docked} / 2`, hud.docked === 2 ? C.green : C.text)}
              {stat("Boxes unloaded", `${hud.unloaded} / 4`)}
              {stat("Units in storage", `${hud.stored} / 4`)}
              {stat("Orders picked", `${hud.picked} / 3`, hud.picked === 3 ? C.green : C.dim)}
              {stat("Packages packed", `${hud.packed} / 7`)}
              {stat("Correct final labels", `${hud.labelled} / 7`, hud.labelled === 7 ? C.green : C.text)}
              {stat("In label correction", hud.inFix, hud.inFix ? C.red : C.dim)}
              {stat("Shipped", `${hud.shipped} / 7`, hud.shipped ? C.green : C.dim)}
            </div>
          )}
        </div>

        {hud.done && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,18,25,0.6)", padding: 16 }}>
            <div style={{ maxWidth: 460, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>SUPPLY CHAIN COMPLETE</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>End-to-end flow finished</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.text, marginBottom: 14, borderLeft: `3px solid ${C.green}`, paddingLeft: 10 }}>{data.keyMessage}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.dim, marginBottom: 16 }}>
                Stored {hud.stored}/4 · picked {hud.picked}/3 · packed {hud.packed}/7 · shipped {hud.shipped}/7 · {hud.clock}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btn(true)} onClick={doReset}>Replay</button>
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
        <div style={{ flex: 1, minWidth: 120, height: 6, background: C.panel2, borderRadius: 3, overflow: "hidden", margin: "0 6px" }}>
          <div style={{ width: `${(hud.t / data.duration) * 100}%`, height: "100%", background: C.blue, transition: "width 0.1s linear" }} />
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.dim }}>
          {hud.clock}
        </span>
      </div>
    </div>
  );
}
