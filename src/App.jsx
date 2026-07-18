import React, { useRef, useEffect, useState, useCallback } from "react";
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
  // Left to right: highest parcel count furthest from the shipping gate.
  { id: "6P-01", x: -9.0, z: 3.2, cap: 6 },
  { id: "3P-01", x: -3.5, z: 3.2, cap: 3 },
  { id: "1P-01", x: 2.0, z: 3.2, cap: 1 },
];

// Orders are aligned with the physical station order: 6 parcels left, 1 parcel right.
const ORDERS = [
  { key: "C", count: 6, color: "#e44cff", station: 0 },
  { key: "B", count: 3, color: "#ffd166", station: 1 },
  { key: "A", count: 1, color: "#00c8ff", station: 2 },
];

const SCENARIOS = {
  1: { title: "Label immediately · Current state", short: "Current state" },
  2: { title: "Wait, then label", short: "Wait, then label" },
  3: { title: "Temporary label, final label later", short: "Interim + final" },
  4: { title: "Hybrid staging + interim label", short: "Hybrid stage + interim" },
  5: { title: "Label based on ORTEC proposal", short: "ORTEC proposal" },
  6: { title: "Automated HU buffer & sequencing", short: "Automated HU buffer" },
};
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

const fmtClock = (min, fallback = "09:00") => {
  const numericMinutes = Number(min);
  if (!Number.isFinite(numericMinutes)) return fallback;
  const m = Math.max(0, Math.round(numericMinutes));
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
  let duration = 35;
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
  const parcelSize = (station, index) => {
    const variants = [
      [0.82, 0.62, 0.76], [1.02, 0.66, 0.82], [0.74, 0.56, 0.72],
      [1.18, 0.82, 0.88], [0.9, 0.7, 0.8], [1.08, 0.58, 0.86],
    ];
    const size = variants[(station * 2 + index - 1) % variants.length];
    return [...size];
  };
  const base = (order, idx, extra) => ({
    st: order.station,
    order: order.key,
    orderSize: order.count,
    color: order.color,
    id: `P-${order.key}-${String(idx).padStart(2, "0")}`,
    name: `${order.key}-${idx}`,
    size: parcelSize(order.station, idx),
    ...extra,
  });
  const pushDirect = (d, labels) => {
    const tEnter = d.move + 1.25;
    const tExit = ride(tEnter, entryX(d.st), CONV_END);
    parcels.push({
      ...d,
      path: [...packPath(d.st, d.spawn, d.move), ...toConv(d.st, d.move, tEnter).slice(1), [tExit, CONV_END, CONV_Y, 0]],
      labels,
      finalT: null,
      conveyor: [tEnter, tExit],
      loop: [],
      stagingIv: null,
      relabelIv: null,
    });
    return { tEnter, tExit };
  };

  // S1 — current state: every parcel leaves immediately with an open X count.
  if (n === 1) {
    duration = 39;
    keyMessage = "Immediate parcel flow, but the final Handling Unit count is unknown when labels are printed.";
    ORDERS.forEach((order, oi) => {
      for (let i = 1; i <= order.count; i += 1) {
        const spawn = (i - 1) * 3.1 + oi * 0.45;
        const packEnd = spawn + 2.2;
        const labelT = packEnd + 0.2;
        const move = labelT + 0.35;
        const d = base(order, i, { spawn, packEnd, labelT, move, seq: `${i}/X` });
        pushDirect(d, [[labelT, `${i}/X`, C.orange, "final count unknown"]]);
      }
    });
    messages.push([0, "Three dedicated stations pack 6-, 3- and 1-parcel orders in parallel", "info"]);
    messages.push([2.4, "Labels are printed immediately with an open denominator: 1/X, 2/X, ...", "warn"]);
    messages.push([18.5, "The 6-parcel order is complete only after earlier parcels have already left", "warn"]);
  }

  // S2 — wait until the complete order is staged, then print final labels.
  if (n === 2) {
    duration = 43;
    keyMessage = "Correct final numbering for every order, but parcels wait at the packing station until the complete order is ready.";
    // S2 layout: staging area left of the packer, packing table with label printer to the right,
    // and a front roll cart between the operator and the shipping conveyor.
    const slotMap = {
      0: [
        { x: -11.45, z: 4.1 }, { x: -10.25, z: 4.1 },
        { x: -11.45, z: 5.25 }, { x: -10.25, z: 5.25 },
        { x: -11.45, z: 6.4 }, { x: -10.25, z: 6.4 },
      ],
      1: [
        { x: -5.65, z: 4.1 }, { x: -5.65, z: 5.25 }, { x: -5.65, z: 6.4 },
      ],
      2: [{ x: -0.2, z: 5.25 }],
    };
    ORDERS.forEach((order, oi) => {
      const completion = (order.count - 1) * 3.1 + oi * 0.45 + 4.0;
      for (let i = 1; i <= order.count; i += 1) {
        const spawn = (i - 1) * 3.1 + oi * 0.45;
        const packEnd = spawn + 2.2;
        const stageIn = packEnd + 0.7;
        const finalT = completion + i * 0.35;
        const release = completion + 2.0 + i * 0.5;
        const s = slotMap[order.station][i - 1];
        const tEnter = release + 1.2;
        const tExit = ride(tEnter, entryX(order.station), CONV_END);
        const d = base(order, i, { spawn, packEnd, stageIn, finalT, release });
        parcels.push({
          ...d,
          path: [
            ...packPath(order.station, spawn, packEnd + 0.2),
            [stageIn, s.x, 0.80 + d.size[1] / 2, s.z],
            [release, s.x, 0.80 + d.size[1] / 2, s.z],
            [release + 0.6, (s.x + entryX(order.station)) / 2, CONV_Y + 0.5, 2.2],
            [tEnter, entryX(order.station), CONV_Y, 0],
            [tExit, CONV_END, CONV_Y, 0],
          ],
          labels: [[finalT, `${i}/${order.count}`, C.green, "final label"]],
          conveyor: [tEnter, tExit],
          loop: [],
          stagingIv: [stageIn, release],
          relabelIv: null,
        });
      }
      messages.push([completion, `Order ${order.key} complete: ${order.count} of ${order.count} parcels packed`, "ok"]);
      messages.push([completion + 0.4, `Final labels 1/${order.count} to ${order.count}/${order.count} are printed`, "ok"]);
    });
    messages.push([0, "Parcels wait in dedicated 6-, 3- and 1-carton staging areas", "info"]);
  }

  // S3 — interim labels and downstream final labelling with a waiting loop.
  if (n === 3) {
    duration = 49;
    keyMessage = "Parcels leave packing immediately with interim labels; final numbering is applied downstream once the order is complete.";
    const loopFrom = (t0) => [
      [t0, MACHINE_X, CONV_Y, 0],
      [t0 + 0.6, MACHINE_X + 1.5, CONV_Y, 0],
      [t0 + 2.3, MACHINE_X + 1.5, CONV_Y, -4.2],
      [t0 + 5.5, MACHINE_X - 6.5, CONV_Y, -4.2],
      [t0 + 7.2, MACHINE_X - 6.5, CONV_Y, 0],
      [t0 + 9.8, MACHINE_X, CONV_Y, 0],
    ];
    ORDERS.forEach((order, oi) => {
      const completionBase = (order.count - 1) * 3.1 + oi * 0.45;
      for (let i = 1; i <= order.count; i += 1) {
        const spawn = (i - 1) * 3.1 + oi * 0.45;
        const packEnd = spawn + 2.2;
        const interimT = packEnd + 0.2;
        const move = interimT + 0.35;
        const tEnter = move + 1.25;
        const tArr = ride(tEnter, entryX(order.station), MACHINE_X);
        const mustLoop = i < order.count;
        let path = [...packPath(order.station, spawn, move), ...toConv(order.station, move, tEnter).slice(1), [tArr, MACHINE_X, CONV_Y, 0]];
        let finalT = tArr + 1;
        const loop = [];
        if (mustLoop) {
          path = path.concat(loopFrom(finalT).slice(1));
          loop.push([finalT, finalT + 9.8]);
          finalT += 10.8;
        }
        const tExit = ride(finalT + 0.2, MACHINE_X, CONV_END);
        path.push([tExit, CONV_END, CONV_Y, 0]);
        const d = base(order, i, { spawn, packEnd, interimT, move, tEnter, tArr });
        parcels.push({
          ...d,
          path,
          seq: `${i}/${order.count}`,
          finalT,
          labels: [[interimT, "INTERIM", C.blue, d.id], [finalT, `${i}/${order.count}`, C.green, "final label"]],
          conveyor: [tEnter, tExit],
          loop,
          stagingIv: null,
          relabelIv: null,
        });
        scans.push(tArr, ...(mustLoop ? [finalT - 1] : []));
      }
      messages.push([completionBase + 2.5, `Order ${order.key}: ${order.count}/${order.count} parcels registered — final labels available`, "ok"]);
    });
    messages.push([0, "All parcels receive interim labels and move immediately to the downstream scanner", "info"]);
    messages.push([6, "Incomplete multi-parcel orders enter the waiting loop", "warn"]);
  }

  // S4 — labels based on the ORTEC proposal; the 6-parcel order demonstrates one exception.
  if (n === 5) {
    duration = 48;
    keyMessage = "ORTEC predicts 1, 3 or 6 Handling Units before packing; only exceptions require label correction.";
    const DEV_T = 18.0;
    const relabelDetour = (tArr) => {
      const tScan = tArr + 1.0;
      const relabelT = tScan + 3.6;
      const secondScanT = tScan + 11.2;
      return {
        pts: [
          [tScan, MACHINE_X, CONV_Y, 0], [tScan + 1.4, MACHINE_X, CONV_Y, 3.4],
          [tScan + 2.6, MACHINE_X + 3, CONV_Y, 3.4], [tScan + 4.8, MACHINE_X + 3, CONV_Y, 3.4],
          [tScan + 6.0, MACHINE_X + 6, CONV_Y, 3.4], [tScan + 7.0, MACHINE_X + 6, CONV_Y, 5.0],
          [tScan + 9.0, MACHINE_X - 2, CONV_Y, 5.0], [tScan + 10.0, MACHINE_X - 2, CONV_Y, 0],
          [secondScanT, MACHINE_X, CONV_Y, 0],
        ],
        relabelT,
        secondScanT,
      };
    };
    const addPass = (order, i, predictedCount, actualCount = predictedCount, correction = false) => {
      const spawn = (i - 1) * 3.1 + order.station * 0.45;
      const packEnd = spawn + 2.2;
      const labelT = packEnd + 0.2;
      const move = labelT + 0.35;
      const tEnter = move + 1.25;
      const tArr = ride(tEnter, entryX(order.station), MACHINE_X);
      const d = base(order, i, { spawn, packEnd, labelT, move, tEnter, tArr, plan: predictedCount });
      if (!correction) {
        const tPass = tArr + 1;
        const tExit = ride(tPass, MACHINE_X, CONV_END);
        parcels.push({
          ...d,
          path: [...packPath(order.station, spawn, move), ...toConv(order.station, move, tEnter).slice(1), [tArr, MACHINE_X, CONV_Y, 0], [tPass, MACHINE_X, CONV_Y, 0], [tExit, CONV_END, CONV_Y, 0]],
          labels: [[labelT, `${i}/${actualCount}`, C.green, "ORTEC proposal"]],
          seq: `${i}/${actualCount}`,
          finalT: labelT,
          conveyor: [tEnter, tExit], loop: [], stagingIv: null, relabelIv: null,
        });
        scans.push(tArr);
      } else {
        const det = relabelDetour(tArr);
        const tExit = ride(det.secondScanT + 0.4, MACHINE_X, CONV_END);
        parcels.push({
          ...d,
          path: [...packPath(order.station, spawn, move), ...toConv(order.station, move, tEnter).slice(1), [tArr, MACHINE_X, CONV_Y, 0], ...det.pts, [det.secondScanT + 0.4, MACHINE_X, CONV_Y, 0], [tExit, CONV_END, CONV_Y, 0]],
          labels: [[labelT, `${i}/${predictedCount}`, C.green, "ORTEC proposal"], [DEV_T, `${i}/${predictedCount}`, C.red, "count deviation", true], [det.relabelT, `${i}/${actualCount}`, C.green, "relabelled"]],
          seq: `${i}/${actualCount}`,
          finalT: det.relabelT,
          devT: DEV_T,
          conveyor: [tEnter, tExit], loop: [], stagingIv: null, relabelIv: [det.pts[0][0], det.secondScanT],
        });
        scans.push(tArr, det.secondScanT);
      }
    };

    // 1- and 3-parcel orders match the proposal exactly.
    const one = ORDERS.find((o) => o.count === 1);
    const three = ORDERS.find((o) => o.count === 3);
    const six = ORDERS.find((o) => o.count === 6);
    addPass(one, 1, 1);
    for (let i = 1; i <= 3; i += 1) addPass(three, i, 3);
    // Proposal is six; one late content deviation changes the actual count to seven.
    for (let i = 1; i <= 6; i += 1) addPass(six, i, 6, 7, i <= 2);
    addPass({ ...six, count: 7 }, 7, 6, 7, false);

    messages.push([0, "ORTEC proposal: Order A → 1 · Order B → 3 · Order C → 6 Handling Units", "info"]);
    messages.push([3, "Orders with correct proposals receive final labels immediately at packing", "ok"]);
    messages.push([DEV_T, "Exception on the 6-parcel proposal: actual count changes to 7 → correction loop", "err"]);
  }

  // S5 — hybrid of S2 and S3: the 6-parcel station stages interim-labelled parcels,
  // then releases them together to the downstream labelling machine.
  if (n === 4) {
    duration = 53;
    keyMessage = "Interim labels are applied immediately. The 6-parcel order waits in a staging area and is released together to the downstream label machine once complete.";
    const stageSlots6 = [
      { x: -11.75, z: 3.65 }, { x: -10.55, z: 3.65 },
      { x: -11.75, z: 4.75 }, { x: -10.55, z: 4.75 },
      { x: -11.75, z: 5.85 }, { x: -10.55, z: 5.85 },
    ];
    const loopFrom = (t0) => [
      [t0, MACHINE_X, CONV_Y, 0],
      [t0 + 0.6, MACHINE_X + 1.5, CONV_Y, 0],
      [t0 + 2.3, MACHINE_X + 1.5, CONV_Y, -4.2],
      [t0 + 5.5, MACHINE_X - 6.5, CONV_Y, -4.2],
      [t0 + 7.2, MACHINE_X - 6.5, CONV_Y, 0],
      [t0 + 9.8, MACHINE_X, CONV_Y, 0],
    ];

    const addS3LikeOrder = (order, oi) => {
      const completionBase = (order.count - 1) * 3.1 + oi * 0.45;
      for (let i = 1; i <= order.count; i += 1) {
        const spawn = (i - 1) * 3.1 + oi * 0.45;
        const packEnd = spawn + 2.2;
        const interimT = packEnd + 0.2;
        const move = interimT + 0.35;
        const tEnter = move + 1.25;
        const tArr = ride(tEnter, entryX(order.station), MACHINE_X);
        const mustLoop = i < order.count;
        let path = [...packPath(order.station, spawn, move), ...toConv(order.station, move, tEnter).slice(1), [tArr, MACHINE_X, CONV_Y, 0]];
        let finalT = tArr + 1;
        const loop = [];
        if (mustLoop) {
          path = path.concat(loopFrom(finalT).slice(1));
          loop.push([finalT, finalT + 9.8]);
          finalT += 10.8;
        }
        const tExit = ride(finalT + 0.2, MACHINE_X, CONV_END);
        path.push([tExit, CONV_END, CONV_Y, 0]);
        const d = base(order, i, { spawn, packEnd, interimT, move, tEnter, tArr });
        parcels.push({
          ...d,
          path,
          seq: `${i}/${order.count}`,
          finalT,
          labels: [[interimT, "INTERIM", C.blue, d.id], [finalT, `${i}/${order.count}`, C.green, "final label"]],
          conveyor: [tEnter, tExit],
          loop,
          stagingIv: null,
          relabelIv: null,
        });
        scans.push(tArr, ...(mustLoop ? [finalT - 1] : []));
      }
      messages.push([completionBase + 2.5, `Order ${order.key}: ${order.count}/${order.count} parcels registered — final labels available`, "ok"]);
    };

    // Orders B and A behave like S3.
    addS3LikeOrder(ORDERS[1], 1);
    addS3LikeOrder(ORDERS[2], 2);

    // Order C (6 parcels) behaves like staged S3.
    const order = ORDERS[0];
    const oi = 0;
    const completion = (order.count - 1) * 3.1 + oi * 0.45 + 4.0;
    for (let i = 1; i <= order.count; i += 1) {
      const spawn = (i - 1) * 3.1 + oi * 0.45;
      const packEnd = spawn + 2.2;
      const interimT = packEnd + 0.2;
      const stageIn = interimT + 0.45;
      const s = stageSlots6[i - 1];
      const release = completion + 1.4 + (i - 1) * 0.35;
      const tEnter = release + 0.95;
      const tArr = ride(tEnter, entryX(order.station), MACHINE_X);
      const finalT = tArr + 0.8;
      const tExit = ride(finalT + 0.2, MACHINE_X, CONV_END);
      const d = base(order, i, { spawn, packEnd, interimT, stageIn, release, tEnter, tArr });
      parcels.push({
        ...d,
        path: [
          ...packPath(order.station, spawn, packEnd),
          [stageIn, s.x, 0.80 + d.size[1] / 2, s.z],
          [release, s.x, 0.80 + d.size[1] / 2, s.z],
          [release + 0.5, (s.x + entryX(order.station)) / 2, CONV_Y + 0.5, 2.2],
          [tEnter, entryX(order.station), CONV_Y, 0],
          [tArr, MACHINE_X, CONV_Y, 0],
          [finalT, MACHINE_X, CONV_Y, 0],
          [tExit, CONV_END, CONV_Y, 0],
        ],
        seq: `${i}/${order.count}`,
        finalT,
        labels: [[interimT, "INTERIM", C.blue, d.id], [finalT, `${i}/${order.count}`, C.green, "final label"]],
        conveyor: [tEnter, tExit],
        loop: [],
        stagingIv: [stageIn, release],
        relabelIv: null,
      });
      scans.push(tArr);
    }
    messages.push([0, "Hybrid scenario: the 6-parcel station stages interim-labelled parcels until the order is complete", "info"]);
    messages.push([completion, "Order C complete: all 6 parcels are released together to the downstream label machine", "ok"]);
    messages.push([completion + 1.2, "Order C receives the final 1/6 … 6/6 labels downstream", "ok"]);
    messages.push([6, "Orders B and A continue to flow immediately with interim labels", "info"]);
  }

  // S6 — automated HU buffer and sequenced final labelling.
  // Packages receive only a technical interim ID at packing. A straight conveyor moves
  // them through an identification portal into a carton-shuttle buffer. Once the full
  // order is complete, the shuttle releases the HUs in sequence to a central print-and-apply cell.
  if (n === 6) {
    duration = 62;
    keyMessage = "A carton-shuttle buffer decouples packing from final labelling. The 6-HU order is stored automatically and released in sequence only after all six packages are available.";

    const ID_X = 6.5;
    const DIVERT_X = 8.4;
    const BUFFER_Z = -6.0;
    const BUFFER_X = 10.8;
    const SEQ_X = 13.2;
    const LABEL_X = 15.8;
    const bufferSlots = [
      { x: BUFFER_X - 1.9, y: 0.82, z: BUFFER_Z },
      { x: BUFFER_X - 1.1, y: 0.82, z: BUFFER_Z },
      { x: BUFFER_X - 0.3, y: 0.82, z: BUFFER_Z },
      { x: BUFFER_X + 0.5, y: 0.82, z: BUFFER_Z },
      { x: BUFFER_X + 1.3, y: 0.82, z: BUFFER_Z },
      { x: BUFFER_X + 2.1, y: 0.82, z: BUFFER_Z },
    ];

    // 1- and 3-HU orders pass through the same identification and final-label architecture.
    const addDirectAutomatedOrder = (order, oi) => {
      for (let i = 1; i <= order.count; i += 1) {
        const spawn = (i - 1) * 3.1 + oi * 0.45;
        const packEnd = spawn + 2.2;
        const interimT = packEnd + 0.2;
        const move = interimT + 0.35;
        const tEnter = move + 1.25;
        const tId = ride(tEnter, entryX(order.station), ID_X);
        const tLabel = ride(tId + 0.6, ID_X, LABEL_X);
        const finalT = tLabel + 0.8;
        const tExit = ride(finalT + 0.2, LABEL_X, CONV_END);
        const d = base(order, i, { spawn, packEnd, interimT, move, tEnter, tArr: tLabel });
        parcels.push({
          ...d,
          path: [
            ...packPath(order.station, spawn, move),
            ...toConv(order.station, move, tEnter).slice(1),
            [tId, ID_X, CONV_Y, 0],
            [tLabel, LABEL_X, CONV_Y, 0],
            [finalT, LABEL_X, CONV_Y, 0],
            [tExit, CONV_END, CONV_Y, 0],
          ],
          seq: `${i}/${order.count}`,
          finalT,
          labels: [[interimT, "HU-ID", C.blue, d.id], [finalT, `${i}/${order.count}`, C.green, "final label"]],
          conveyor: [tEnter, tExit],
          loop: [], stagingIv: null, relabelIv: null,
        });
        scans.push(tId, tLabel);
      }
    };
    addDirectAutomatedOrder(ORDERS[1], 1);
    addDirectAutomatedOrder(ORDERS[2], 2);

    // 6-HU order: straight identification, right-angle divert into AS/RS buffer,
    // sequenced release, then straight final-label cell.
    const order = ORDERS[0];
    const completion = (order.count - 1) * 3.1 + 4.0;
    for (let i = 1; i <= order.count; i += 1) {
      const spawn = (i - 1) * 3.1;
      const packEnd = spawn + 2.2;
      const interimT = packEnd + 0.2;
      const move = interimT + 0.35;
      const tEnter = move + 1.25;
      const tId = ride(tEnter, entryX(order.station), ID_X);
      const tDivert = ride(tId + 0.5, ID_X, DIVERT_X);
      const tBufferAisle = tDivert + 2.4;
      const tSlotFront = tBufferAisle + 1.2;
      const slot = bufferSlots[i - 1];
      const stageIn = tSlotFront + 1.0;
      const release = completion + 2.0 + (i - 1) * 1.15;
      const tShuttleOut = release + 1.0;
      const tSequenceLane = tShuttleOut + 1.4;
      const tGate = tSequenceLane + 1.2;
      const tLabel = tGate + 1.7;
      const finalT = tLabel + 0.8;
      const tExit = ride(finalT + 0.2, LABEL_X, CONV_END);
      const d = base(order, i, { spawn, packEnd, interimT, move, tEnter, stageIn, release, tArr: tLabel });
      parcels.push({
        ...d,
        path: [
          ...packPath(order.station, spawn, move),
          ...toConv(order.station, move, tEnter).slice(1),
          [tId, ID_X, CONV_Y, 0],
          [tDivert, DIVERT_X, CONV_Y, 0],
          [tBufferAisle, DIVERT_X, CONV_Y, BUFFER_Z],
          [tSlotFront, BUFFER_X, CONV_Y, BUFFER_Z],
          [stageIn - 0.45, slot.x, slot.y, BUFFER_Z - 0.45],
          [stageIn, slot.x, slot.y, slot.z],
          [release, slot.x, slot.y, slot.z],
          [tShuttleOut, slot.x, slot.y, BUFFER_Z - 0.45],
          [tSequenceLane, SEQ_X, CONV_Y, BUFFER_Z],
          [tGate, SEQ_X, CONV_Y, 0],
          [tLabel, LABEL_X, CONV_Y, 0],
          [finalT, LABEL_X, CONV_Y, 0],
          [tExit, CONV_END, CONV_Y, 0],
        ],
        seq: `${i}/${order.count}`,
        finalT,
        labels: [[interimT, "HU-ID", C.blue, d.id], [finalT, `${i}/${order.count}`, C.green, "final label"]],
        conveyor: [tEnter, tExit],
        loop: [],
        stagingIv: [stageIn, release],
        relabelIv: null,
      });
      scans.push(tId, tLabel);
    }
    messages.push([0, "Future-state architecture: technical HU identification at packing, automated carton-shuttle buffering and sequenced final labelling", "info"]);
    messages.push([5.5, "Every package is identified, weighed and dimensioned at the identification portal", "info"]);
    messages.push([9.5, "Order C packages are automatically stored in the HU buffer without occupying packing-space", "info"]);
    messages.push([completion, "Order C complete: 6/6 HUs available — sequencing can begin", "ok"]);
    messages.push([completion + 2.4, "The shuttle releases one HU at a time to the central print-and-apply label cell", "ok"]);
  }

  // Prepend the ORTEC-routed infeed for every packing scenario.
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
  for (let i = 0; i < messages.length; i += 1) messages[i] = [messages[i][0] + OFF, ...messages[i].slice(1)];
  for (let i = 0; i < scans.length; i += 1) scans[i] += OFF;
  duration += OFF;

  messages.unshift([0, "Each packing station is supplied with a dedicated multi-level roll cart holding the required items", "info"]);
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

const CHAIN_PACK_OFF = 40;

function buildChainData(packScenario = 4) {
  const inb = buildInboundScenario();
  const pack = buildPackScenario(packScenario);
  shiftPack(pack, CHAIN_PACK_OFF);

  // picking link: orders A, B, C are picked from storage and supplied to the packing stations
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
    clockStart: inb.clockStart,
    rate: inb.rate,
    keyMessage:
      "One continuous supply chain: goods received in the morning are unloaded, stored, picked, routed by the Ortec proposal to the matching packing station, labelled and shipped \u2014 the label-correction spur handles the one mispredicted order.",
  };
}


// ---------- main component ----------

const PGC = {
  bg: "#0b1118",
  panel: "#121b24",
  panel2: "#182431",
  line: "#263546",
  text: "#e8edf4",
  dim: "#94a3b8",
  blue: "#4da3ff",
  green: "#3ddc84",
  orange: "#ff9f43",
  yellow: "#ffd166",
  red: "#ff6b6b",
  purple: "#b084ff",
};

function pgMakeTextSprite(text, color = "#ffffff", bg = "rgba(10,16,24,0.92)", fontSize = 46, scale = 0.010) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `700 ${fontSize}px Arial`;
  const w = Math.ceil(ctx.measureText(text).width + 34);
  const h = Math.ceil(fontSize * 1.7);
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.font = `700 ${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function pgBox(sceneOrGroup, x, y, z, w, h, d, color, rough = 0.72, metal = 0.08) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  sceneOrGroup.add(mesh);
  return mesh;
}

function pgCreateParcel(color, labelText) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.62, 0.68),
    new THREE.MeshStandardMaterial({ color: 0xc9975b, roughness: 0.86, metalness: 0.02 })
  );
  m.position.y = 0.31;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.64, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xa9723b, roughness: 0.9, metalness: 0.02 })
  );
  stripe.position.set(0, 0.31, 0);
  g.add(stripe);
  const tag = pgMakeTextSprite(labelText, color, "rgba(12,18,28,0.9)", 30, 0.0055);
  tag.position.set(0, 0.84, 0);
  g.add(tag);
  return g;
}

function pgCreateItem(color, labelText) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.36, 0.42),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.7, metalness: 0.05 })
  );
  m.position.y = 0.18;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  const tag = pgMakeTextSprite(labelText, color, "rgba(12,18,28,0.88)", 24, 0.0048);
  tag.position.set(0, 0.62, 0);
  g.add(tag);
  return g;
}

function pgCreateDocument(label = "DN") {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.88),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  paper.rotation.x = -Math.PI / 2;
  g.add(paper);
  const tag = pgMakeTextSprite(label, PGC.blue, "rgba(255,255,255,0.92)", 24, 0.0049);
  tag.position.set(0, 0.1, 0);
  g.add(tag);
  return g;
}

function pgLerpPath(path, t) {
  if (!path || path.length === 0) return [0, 0, 0, 0];
  if (t <= path[0][0]) return path[0];
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    if (t <= b[0]) {
      const f = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
      return [t, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  return path[path.length - 1];
}

function pgHhmm(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function pgBuildScenarioData(mode) {
  const oldWorld = mode === "old";
  const duration = 11.5;
  const startMinutes = 10 * 60;
  const endMinutes = 12 * 60 + 45;
  const minuteAt = (t) => startMinutes + (t / duration) * (endMinutes - startMinutes);

  const P = {
    order: [-12.5, 0.6, -4.5],
    inbound: [-12.0, 0.35, 4.8],
    storageA: [-4.6, 0.5, 4.3],
    storageB: [-3.1, 0.5, 5.2],
    dnPrinter: [0.0, 0.7, 0.2],
    packingIn: [4.2, 0.7, -0.4],
    packTable: [6.4, 1.02, -0.2],
    shipping: [12.6, 0.7, -0.2],
    parcelLane: [9.1, 0.7, -0.2],
  };

  const entities = [];
  const events = [
    { t: 0.0, label: `${pgHhmm(minuteAt(0))} · Customer order created with 2 positions`, tone: "info" },
    { t: 0.1, label: `${pgHhmm(minuteAt(0.1))} · Position 1 is already on stock`, tone: "ok" },
    { t: 0.15, label: `${pgHhmm(minuteAt(0.15))} · Position 2 still waits for inbound put-away`, tone: "warn" },
  ];

  // Static visible items in zones
  entities.push({
    key: "itemA_stock",
    kind: "item",
    color: PGC.green,
    label: "Item A · stock",
    start: 0,
    end: oldWorld ? 1.9 : 8.5,
    path: [[0, ...P.storageA]],
  });
  entities.push({
    key: "itemB_inbound",
    kind: "item",
    color: PGC.orange,
    label: "Item B · inbound",
    start: 0,
    end: 6.25,
    path: [[0, ...P.inbound]],
  });

  // Item B put-away after 2h
  entities.push({
    key: "itemB_putaway",
    kind: "item",
    color: PGC.orange,
    label: "Item B",
    start: 6.25,
    end: oldWorld ? 9.2 : 9.15,
    path: [
      [6.25, ...P.inbound],
      [7.25, -8.0, 0.35, 5.0],
      [8.05, ...P.storageB],
    ],
  });
  events.push({ t: 8.05, label: `${pgHhmm(minuteAt(8.05))} · Position 2 has been put away to storage`, tone: "ok" });

  if (oldWorld) {
    events.push({ t: 0.45, label: `${pgHhmm(minuteAt(0.45))} · Old world: delivery note is created immediately for the stock position`, tone: "err" });
    entities.push({ key: "dn1", kind: "doc", label: "DN 1", start: 0.45, end: 1.25, path: [[0.45, ...P.dnPrinter], [1.25, 2.8, 0.72, -0.2]] });
    entities.push({ key: "pickA", kind: "item", color: PGC.green, label: "Item A", start: 1.0, end: 2.35, path: [[1.0, ...P.storageA], [1.6, 0.8, 0.52, 3.4], [2.35, ...P.packTable]] });
    entities.push({ key: "parcel1", kind: "parcel", color: PGC.green, label: "Parcel 1", start: 2.6, end: 4.1, path: [[2.6, ...P.packTable], [3.3, ...P.parcelLane], [4.1, ...P.shipping]] });
    events.push({ t: 4.1, label: `${pgHhmm(minuteAt(4.1))} · First parcel ships as a standalone delivery`, tone: "err" });

    events.push({ t: 8.25, label: `${pgHhmm(minuteAt(8.25))} · A second delivery note is created after item B becomes available`, tone: "err" });
    entities.push({ key: "dn2", kind: "doc", label: "DN 2", start: 8.25, end: 8.95, path: [[8.25, ...P.dnPrinter], [8.95, 2.8, 0.72, -0.2]] });
    entities.push({ key: "pickB", kind: "item", color: PGC.orange, label: "Item B", start: 8.55, end: 9.7, path: [[8.55, ...P.storageB], [9.0, 0.8, 0.52, 3.4], [9.7, ...P.packTable]] });
    entities.push({ key: "parcel2", kind: "parcel", color: PGC.orange, label: "Parcel 2", start: 9.95, end: 11.0, path: [[9.95, ...P.packTable], [10.45, ...P.parcelLane], [11.0, ...P.shipping]] });
    events.push({ t: 11.0, label: `${pgHhmm(minuteAt(11.0))} · Second parcel ships separately → 2× transport cost`, tone: "err" });
  } else {
    events.push({ t: 0.45, label: `${pgHhmm(minuteAt(0.45))} · Smart Delivery Note Creation Job: no delivery note is created yet`, tone: "info" });
    events.push({ t: 0.8, label: `${pgHhmm(minuteAt(0.8))} · Position 1 stays reserved on stock until position 2 is available`, tone: "info" });
    entities.push({ key: "holdA", kind: "item", color: PGC.green, label: "Item A reserved", start: 0.8, end: 8.45, path: [[0.8, -4.9, 0.55, 3.3]] });
    events.push({ t: 8.3, label: `${pgHhmm(minuteAt(8.3))} · Both positions are now available at the same shipping point`, tone: "ok" });
    entities.push({ key: "dnSmart", kind: "doc", label: "1 combined DN", start: 8.35, end: 9.1, path: [[8.35, ...P.dnPrinter], [9.1, 2.7, 0.72, -0.2]] });
    events.push({ t: 8.4, label: `${pgHhmm(minuteAt(8.4))} · One smart delivery note is created for both positions`, tone: "ok" });
    entities.push({ key: "pickA2", kind: "item", color: PGC.green, label: "Item A", start: 8.6, end: 9.45, path: [[8.6, ...P.storageA], [9.0, 0.8, 0.52, 3.4], [9.45, 5.7, 1.02, -0.45]] });
    entities.push({ key: "pickB2", kind: "item", color: PGC.orange, label: "Item B", start: 8.75, end: 9.55, path: [[8.75, ...P.storageB], [9.1, 0.8, 0.52, 3.4], [9.55, 7.05, 1.02, 0.1]] });
    entities.push({ key: "combinedParcel", kind: "parcel", color: PGC.purple, label: "1 combined parcel", start: 9.9, end: 11.1, path: [[9.9, ...P.packTable], [10.45, ...P.parcelLane], [11.1, ...P.shipping]] });
    events.push({ t: 11.1, label: `${pgHhmm(minuteAt(11.1))} · One parcel ships with both positions → 1× transport cost`, tone: "ok" });
  }

  return {
    mode,
    duration,
    minuteAt,
    entities,
    events,
    summary: oldWorld
      ? {
          title: "Old world",
          subtitle: "Immediate delivery note creation causes split shipment",
          parcels: 2,
          deliveryNotes: 2,
          transportCosts: "2×",
          outcome: "Two separate parcels leave although both articles would fit into one package.",
        }
      : {
          title: "Smart Delivery Note Creation Job",
          subtitle: "Wait until both positions are available at the same shipping point",
          parcels: 1,
          deliveryNotes: 1,
          transportCosts: "1×",
          outcome: "Both articles are combined into one parcel, avoiding duplicate transport costs.",
        },
  };
}


/* ============================================================
   Embedded functioning Process Gap scenes from ProcessGapSim.jsx
   Isolated to avoid collisions with the existing packing simulation.
   ============================================================ */
const EmbeddedProcessGap = (() => {

/* ============================================================
   PROCESS GAP SIMULATION
   "Same-Day & Same Shipping Point" — Smart Delivery Note Creation
   Standalone app. No packing-label scenarios (S1–S6) included.
   ============================================================ */

/* ---------- time helpers (simulation minutes after 10:00) ---------- */
const START_MIN = 10 * 60; // 10:00
const fmtClock = (t) => {
  const m = Math.max(0, Math.floor(START_MIN + t));
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${mm}`;
};

/* piecewise linear path: waypoints = [{t, p:[x,y,z]}...] */
function pathPos(wps, t) {
  if (t <= wps[0].t) return wps[0].p;
  const last = wps[wps.length - 1];
  if (t >= last.t) return last.p;
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return [
        a.p[0] + (b.p[0] - a.p[0]) * f,
        a.p[1] + (b.p[1] - a.p[1]) * f,
        a.p[2] + (b.p[2] - a.p[2]) * f,
      ];
    }
  }
  return last.p;
}

/* ---------- scenario timelines ---------- */
const CUTOFF_T = 240; // 14:00 shipping cutoff (minutes after 10:00)
function getEndT(scn) {
  return scn === 3 ? 322 : 158;
}

/* time-scaling per scenario/time:
   - mult > 1  → fast-forward through "dead" waiting phases (nothing moves)
   - mult < 1  → slow-motion so the human picking run is easy to follow
   Also returns an optional badge label for fast-forward phases. */
function fastForward(scn, t) {
  // --- intro: hold slowly on the rack so the starting situation is readable ---
  if (t < 8.5) return { mult: 0.35, label: null };

  // --- slow-motion: human picker walking the roll cart to the pack station ---
  const inPick =
    (scn === 1 && ((t >= 11 && t < 21) || (t >= 122 && t < 132))) ||
    (scn === 2 && t >= 122 && t < 132) ||
    (scn === 3 && ((t >= 241 && t < 251) || (t >= 301 && t < 311)));
  if (inPick) return { mult: 0.5, label: null };

  // --- fast-forward: long waiting windows ---
  if (scn === 1) {
    // parcel 1 shipped (~10:40) → Item B put-away begins (~11:35). Nothing moves.
    if (t > 40 && t < 92) return { mult: 16, label: "Fast-forward · waiting for Item B put-away" };
  }
  if (scn === 2) {
    // held/reserved from ~10:02 until Item B put-away begins at t=95
    if (t > 7 && t < 92) return { mult: 18, label: "Fast-forward · waiting for Item B put-away" };
  }
  if (scn === 3) {
    // reserved, waiting for cutoff (10:02 → ~13:55)
    if (t > 7 && t < CUTOFF_T - 8) return { mult: 22, label: "Fast-forward · holding until 14:00 cutoff" };
    // parcel 1 shipped, waiting for the delayed put-away (~14:25 → ~14:57)
    if (t > 264 && t < 272) return { mult: 16, label: "Fast-forward · waiting for delayed put-away (15:00)" };
  }
  return { mult: 1, label: null };
}

const S1_EVENTS = [
  { t: 0, label: "10:00 – Order 4711 created · Item A on stock, Item B still in inbound" },
  { t: 1, label: "10:01 – Delivery Note 1 created immediately for Item A (on stock)" },
  { t: 10, label: "10:10 – Item A picked from storage" },
  { t: 20, label: "10:20 – Parcel 1 packed (Item A only)" },
  { t: 30, label: "10:30 – Parcel 1 shipped — before Item B is even available" },
  { t: 120, label: "12:00 – Item B put-away completed, available in storage" },
  { t: 121, label: "12:01 – Delivery Note 2 created for Item B (Pos 20)" },
  { t: 130, label: "12:10 – Item B picked from storage" },
  { t: 140, label: "12:20 – Parcel 2 packed (Item B only)" },
  { t: 150, label: "12:30 – Parcel 2 shipped — split shipment complete" },
];

const S2_EVENTS = [
  { t: 0, label: "10:00 – Customer order 4711 created (Pos 10 + Pos 20)" },
  { t: 1, label: "10:01 – Delivery note creation held by Smart Job" },
  { t: 2, label: "10:01–12:00 – Waiting for Item B put-away (Item A stays reserved)" },
  { t: 120, label: "12:00 – Item B put-away completed, available in storage" },
  { t: 121, label: "12:01 – Combined delivery note created (Pos 10 + Pos 20)" },
  { t: 130, label: "12:10 – Both items picked from storage" },
  { t: 140, label: "12:20 – Both items packed into one parcel" },
  { t: 150, label: "12:30 – Combined parcel shipped" },
];

const S3_EVENTS = [
  { t: 0, label: "10:00 – Customer order 4711 created (Pos 10 + Pos 20)" },
  { t: 1, label: "10:01 – Delivery note creation held by Smart Job (until cutoff 14:00)" },
  { t: 240, label: "14:00 – Cutoff reached, Pos 20 still not available" },
  { t: 241, label: "14:01 – Delivery Note 1 released for Item A only (cutoff fallback)" },
  { t: 249, label: "14:09 – Item A picked from storage" },
  { t: 252, label: "14:12 – Parcel 1 packed (Item A only)" },
  { t: 261, label: "14:21 – Parcel 1 shipped" },
  { t: 300, label: "15:00 – Item B put-away completed (delayed), available in storage" },
  { t: 301, label: "15:01 – Delivery Note 2 created for Item B (Pos 20)" },
  { t: 309, label: "15:09 – Item B picked from storage" },
  { t: 312, label: "15:12 – Parcel 2 packed (Item B only)" },
  { t: 321, label: "15:21 – Parcel 2 shipped — split shipment despite Smart Job" },
];

/* status progressions, evaluated by sim time */
function statusA(scn, t) {
  if (scn === 1) {
    if (t < 1) return ["Available in storage (on stock)", "green"];
    if (t < 2) return ["Delivery note created immediately", "blue"];
    if (t < 10) return ["Picking in progress", "orange"];
    if (t < 20) return ["Picked", "green"];
    if (t < 30) return ["Packed (Parcel 1)", "green"];
    return ["Shipped — Parcel 1 (alone)", "red"];
  }
  if (scn === 3) {
    if (t < 1) return ["Available in storage", "green"];
    if (t < 241) return ["Reserved — waiting for Pos 20 (until cutoff)", "orange"];
    if (t < 242) return ["Delivery note created (cutoff reached)", "blue"];
    if (t < 249) return ["Picking in progress", "orange"];
    if (t < 252) return ["Packed (Parcel 1)", "green"];
    return ["Shipped — Parcel 1", "red"];
  }
  if (t < 1) return ["Available in storage", "green"];
  if (t < 121) return ["Reserved — waiting for Pos 20", "orange"];
  if (t < 130) return ["Delivery note created (combined)", "blue"];
  if (t < 140) return ["Picked", "green"];
  if (t < 150) return ["Packed (combined parcel)", "green"];
  return ["Shipped — combined parcel", "green"];
}
function statusB(scn, t) {
  if (scn === 3) {
    if (t < 275) return ["Waiting in inbound — put-away delayed", "orange"];
    if (t < 300) return ["Put-away in progress", "orange"];
    if (t < 301) return ["Available in storage", "green"];
    if (t < 309) return ["Delivery Note 2 created", "blue"];
    if (t < 312) return ["Picked", "green"];
    if (t < 321) return ["Packed (Parcel 2)", "green"];
    return ["Shipped — Parcel 2", "red"];
  }
  if (t < 95) return ["Waiting in inbound", "orange"];
  if (t < 120) return ["Put-away in progress", "orange"];
  if (scn === 1) {
    if (t < 121) return ["Available in storage", "green"];
    if (t < 130) return ["Delivery Note 2 created", "blue"];
    if (t < 140) return ["Picked", "green"];
    if (t < 150) return ["Packed (Parcel 2)", "green"];
    return ["Shipped — Parcel 2", "red"];
  }
  if (t < 121) return ["Available in storage", "green"];
  if (t < 130) return ["Delivery note created (combined)", "blue"];
  if (t < 140) return ["Picked", "green"];
  if (t < 150) return ["Packed (combined parcel)", "green"];
  return ["Shipped — combined parcel", "green"];
}
function systemStatus(scn, t) {
  if (scn === 2) {
    if (t >= 1 && t < 121)
      return {
        text: "Delivery note creation temporarily held",
        sub: "Waiting for the second position of the same order to become available.",
        color: "#4da3ff",
      };
    if (t >= 121 && t < 150)
      return { text: "Combined delivery note created", sub: "Pos 10 + Pos 20 → one parcel", color: "#37c978" };
    if (t >= 150)
      return { text: "Order shipped complete in one parcel", sub: "Transport cost 1×", color: "#37c978" };
  } else if (scn === 3) {
    if (t >= 1 && t < CUTOFF_T)
      return {
        text: "Delivery note creation held — waiting for cutoff",
        sub: "Waiting for the second position of the same order (until 14:00).",
        color: "#4da3ff",
      };
    if (t >= CUTOFF_T && t < 241)
      return {
        text: "Cutoff reached — Pos 20 still not available",
        sub: "Job releases Item A separately instead of waiting further.",
        color: "#ff9d42",
      };
    if (t >= 241 && t < 300)
      return { text: "Delivery Note 1 released and shipped", sub: "Waiting for Item B put-away (delayed until 15:00)…", color: "#ff9d42" };
    if (t >= 300 && t < 321)
      return { text: "Delivery Note 2 created", sub: "Second pick / pack / ship for the same order", color: "#4da3ff" };
    if (t >= 321)
      return { text: "Split shipment: cutoff was missed", sub: "Transport cost 2× — not a system delay", color: "#ff5c5c" };
  } else {
    if (t < 1)
      return { text: "Item A already on stock — Item B still in inbound", sub: "Old World creates a delivery note as soon as any position is available.", color: "#9aa7b8" };
    if (t >= 1 && t < 30)
      return { text: "Delivery Note 1 created immediately for Item A", sub: "Item A was on stock, so it ships right away — without waiting for Item B.", color: "#4da3ff" };
    if (t >= 30 && t < 121)
      return { text: "Parcel 1 (Item A) already shipped", sub: "Left the building before Item B was even put away.", color: "#ff9d42" };
    if (t >= 121 && t < 150)
      return { text: "Delivery Note 2 created for Item B", sub: "A second pick / pack / ship for the very same order.", color: "#4da3ff" };
    if (t >= 150)
      return { text: "Split shipment: 2 parcels for 1 order", sub: "Transport cost 2× — the gap this job closes.", color: "#ff5c5c" };
  }
  return { text: "Customer order 4711 created", sub: "Pos 10: Item A · Pos 20: Item B", color: "#9aa7b8" };
}

/* ============================================================
   3D positions (left → right: Inbound → Storage → Picking → Packing → Shipping)
   Racks are centered at z = -6 with depth 2.4 (corpus z: -7.2 .. -4.8).
   The aisle runs at z = 5. Items rest on the aisle-facing front edge (z = -4.6)
   so nothing sits inside the rack corpus.
   ============================================================ */
const RACK_Z = -6;              // rack corpus center
const RACK_FRONT = -4.6;        // aisle-facing shelf lip (just in front of corpus)
const RACK_A = [-18, 2.35, RACK_FRONT];   // Item A on shelf, front lip
const RACK_B = [-15, 2.35, RACK_FRONT];   // Item B target slot, front lip
const INB_B = [-42, 0.62, 5];             // Item B waiting in inbound
const PACK_DROP = [13, 2.05, 0];          // on packing table (pick drop-off)
const CONV_START = [16.5, 1.35, 0];
const CONV_END = [33.5, 1.35, 0];

/* small article + carton interior geometry, shared by build + motion so items
   visibly rest on the carton floor and two clearly fit side by side. */
const ITEM_SIZE = 0.55;                    // article edge length (small)
const CARTON_POS = [13, 1.55, 0];          // carton group origin
const CARTON_CH = 0.5;                     // carton wall height (matches build)
// carton floor mesh top = origin.y - ch/2 + floorThickness; item rests its half-height above that
const CARTON_FLOOR_Y = CARTON_POS[1] - CARTON_CH / 2 + 0.06 + ITEM_SIZE / 2;
const SLOT_A_Z = -0.42;                    // left slot inside carton
const SLOT_B_Z = 0.42;                     // right slot inside carton

function pickPath(t0, t1, from, offZ = 0) {
  /* front lip → lower → into aisle (z=5) → east to x=13 → onto table. Right angles only. */
  const d = t1 - t0;
  return [
    { t: t0, p: from },
    { t: t0 + d * 0.12, p: [from[0], 0.9, from[2]] },
    { t: t0 + d * 0.28, p: [from[0], 0.9, 5 + offZ] },
    { t: t0 + d * 0.75, p: [13, 0.9, 5 + offZ] },
    { t: t0 + d * 0.9, p: [13, 0.9, 0 + offZ * 0.3] },
    { t: t1, p: [PACK_DROP[0] + offZ * 0.6, PACK_DROP[1], PACK_DROP[2] + offZ * 0.5] },
  ];
}
function putawayPath(t0, t1) {
  /* inbound → aisle (z=5) → in front of the target slot → set onto front lip (z=-4.6).
     Never crosses into the corpus (z < -4.8). */
  return [
    { t: t0, p: INB_B },
    { t: t0 + (t1 - t0) * 0.35, p: [-30, 0.62, 5] },
    { t: t0 + (t1 - t0) * 0.62, p: [RACK_B[0], 0.62, 5] },
    { t: t0 + (t1 - t0) * 0.85, p: [RACK_B[0], 0.62, RACK_FRONT + 0.6] },
    { t: t1, p: RACK_B },
  ];
}
function parcelPath(t0, t1, endPos) {
  const d = t1 - t0;
  const [ex, ey, ez] = endPos;
  return [
    { t: t0, p: [PACK_DROP[0], 1.7, 0] },
    { t: t0 + d * 0.10, p: CONV_START },
    { t: t0 + d * 0.55, p: CONV_END },
    { t: t0 + d * 0.68, p: [36.5, 1.7, 0] },   // end of conveyor
    { t: t0 + d * 0.82, p: [36.5, 1.7, ez] },  // turn to the truck's lane
    { t: t1, p: [ex, ey, ez] },                 // drive straight into the truck
  ];
}

/* helper: smooth vertical descent from table height down onto a target point inside the carton */
function sinkTo(t, t0, x, z) {
  const f = Math.min(1, Math.max(0, (t - t0) / 3));
  const yTop = PACK_DROP[1];
  const y = yTop + (CARTON_FLOOR_Y - yTop) * f;
  return [x, y, z];
}

/* Item A movement per scenario */
function itemAPos(scn, t) {
  if (scn === 1) {
    if (t < 11) return RACK_A;
    if (t < 19) return pathPos(pickPath(11, 19, RACK_A), t);
    if (t < 24) return sinkTo(t, 19, CARTON_POS[0], CARTON_POS[2]); // centered, alone
    return null; // inside parcel 1
  }
  if (scn === 3) {
    if (t < 241) return RACK_A;
    if (t < 249) return pathPos(pickPath(241, 249, RACK_A), t);
    if (t < 252) return sinkTo(t, 249, CARTON_POS[0], CARTON_POS[2]); // centered, alone
    return null;
  }
  // S2: stays reserved on shelf until 121
  if (t < 122) return RACK_A;
  if (t < 130) return pathPos(pickPath(122, 130, RACK_A, -0.9), t);
  if (t < 145) return sinkTo(t, 138, CARTON_POS[0], CARTON_POS[2] + SLOT_A_Z); // left slot, rests until seal
  return null;
}
/* Item B movement per scenario */
function itemBPos(scn, t) {
  if (scn === 3) {
    if (t < 275) return INB_B;
    if (t < 300) return pathPos(putawayPath(275, 300), t);
    if (t < 301) return RACK_B;
    if (t < 309) return pathPos(pickPath(301, 309, RACK_B), t);
    if (t < 312) return sinkTo(t, 309, CARTON_POS[0], CARTON_POS[2]); // centered, alone (parcel 2)
    return null;
  }
  if (t < 95) return INB_B;
  if (t < 120) return pathPos(putawayPath(95, 120), t);
  if (scn === 1) {
    if (t < 122) return RACK_B;
    if (t < 130) return pathPos(pickPath(122, 130, RACK_B), t);
    if (t < 141) return sinkTo(t, 138, CARTON_POS[0], CARTON_POS[2]); // centered, alone (parcel 2)
    return null;
  }
  if (t < 122) return RACK_B;
  if (t < 130) return pathPos(pickPath(122, 130, RACK_B, 0.9), t);
  if (t < 145) return sinkTo(t, 138, CARTON_POS[0], CARTON_POS[2] + SLOT_B_Z); // right slot, rests until seal
  return null;
}
/* forklift follows Item B during put-away, staying on the aisle side (never inside the corpus) */
function forkliftPos(scn, t) {
  if (scn === 3) {
    if (t < 275) return [-39, 0, 8];
    if (t <= 300) {
      const p = pathPos(putawayPath(275, 300), t);
      // clamp forklift body to stay in front of the rack front lip
      return [p[0] - 0.2, 0, Math.max(p[2], RACK_FRONT) + 2.0];
    }
    return [-24, 0, 8];
  }
  if (t < 95) return [-39, 0, 8];
  if (t <= 120) {
    const p = pathPos(putawayPath(95, 120), t);
    return [p[0] - 0.2, 0, Math.max(p[2], RACK_FRONT) + 2.0];
  }
  return [-24, 0, 8];
}
/* pick cart follows active pick */
function cartPos(scn, t) {
  if (scn === 3) {
    const activeA = t >= 241 && t < 249;
    const activeB = t >= 301 && t < 309;
    if (!activeA && !activeB) return [-6, 0, 8];
    const p = activeA ? pathPos(pickPath(241, 249, RACK_A), t) : pathPos(pickPath(301, 309, RACK_B), t);
    return [p[0], 0, p[2] + 1.0];
  }
  const active =
    (scn === 1 && ((t >= 11 && t < 19) || (t >= 122 && t < 130))) ||
    (scn === 2 && t >= 122 && t < 130);
  if (!active) return [-6, 0, 8];
  let p;
  if (t < 19) p = pathPos(pickPath(11, 19, RACK_A), t);
  else p = pathPos(pickPath(122, 130, scn === 1 ? RACK_B : RACK_A, scn === 2 ? -0.9 : 0), t);
  return [p[0], 0, p[2] + 1.0];
}
/* parcels */
function parcel1Pos(scn, t) {
  if (scn === 3) {
    if (t < 252) return null;
    return pathPos(parcelPath(252, 261, [41, 1.7, -3]), t);
  }
  if (scn === 1) {
    if (t < 24) return null;
    return pathPos(parcelPath(24, 32, [41, 1.7, -3]), t);
  }
  // S2 combined parcel — one truck (truck 1), after both items rested together
  if (t < 145) return null;
  return pathPos(parcelPath(145, 152, [41, 1.7, -3]), t);
}
function parcel2Pos(scn, t) {
  if (scn === 3) {
    if (t < 312) return null;
    return pathPos(parcelPath(312, 321, [41, 1.7, 3]), t);
  }
  if (scn !== 1 || t < 141) return null;
  return pathPos(parcelPath(141, 150, [41, 1.7, 3]), t);
}

/* ---------- cinematic camera keyframes ----------
   Returns a focus {x, z, dist} that gently follows the essential event.
   Zones (x): inbound ≈ -42, storage ≈ -16, picking ≈ -4, packing ≈ 13, shipping ≈ 40.
   Interpolated between keyframes so the camera glides instead of jumping. */
function cameraKeyframes(scn) {
  const OVERVIEW = { x: -4, z: 2, dist: 54 };
  const RACK_VIEW = { x: -16.5, z: -2, dist: 14 };  // close-up on the A/B shelf slots
  const INBOUND = { x: -34, z: 1, dist: 40 };
  const STORAGE = { x: -16, z: 0, dist: 34 };
  const PICKING = { x: -6, z: 2, dist: 32 };
  const PACKING = { x: 13, z: 1, dist: 24 };   // close on the carton
  const SHIPPING = { x: 38, z: 1, dist: 34 };
  // shared intro: overview → zoom close into the rack to show where A and B sit/belong
  const INTRO = [
    { t: 0, ...OVERVIEW },
    { t: 2, ...RACK_VIEW },
    { t: 8, ...RACK_VIEW },   // hold on the slots so the viewer clearly reads which item is there
  ];
  if (scn === 1) {
    return [
      ...INTRO,
      { t: 11, ...STORAGE }, { t: 16, ...PICKING },
      { t: 21, ...PACKING }, { t: 26, ...PACKING },
      { t: 32, ...SHIPPING }, { t: 42, ...OVERVIEW },
      { t: 118, ...INBOUND }, { t: 124, ...STORAGE },
      { t: 134, ...PACKING }, { t: 142, ...PACKING },
      { t: 150, ...SHIPPING }, { t: 158, ...OVERVIEW },
    ];
  }
  if (scn === 2) {
    return [
      ...INTRO,
      { t: 11, ...STORAGE }, { t: 15, ...PICKING },
      { t: 90, ...INBOUND },      // held; watch inbound where B is delayed
      { t: 118, ...INBOUND }, { t: 124, ...STORAGE },
      { t: 132, ...PACKING }, { t: 145, ...PACKING },   // both items in one carton
      { t: 150, ...SHIPPING }, { t: 158, ...OVERVIEW },
    ];
  }
  // scn === 3
  return [
    ...INTRO,
    { t: 11, ...STORAGE }, { t: 15, ...PICKING },
    { t: 200, ...PICKING },       // holding, cutoff board in view
    { t: 236, ...PICKING }, { t: 244, ...STORAGE },     // cutoff hits, A released
    { t: 250, ...PACKING }, { t: 261, ...SHIPPING },    // parcel 1 ships
    { t: 290, ...INBOUND }, { t: 300, ...STORAGE },     // B finally put away
    { t: 308, ...PACKING }, { t: 318, ...SHIPPING },    // parcel 2 ships
    { t: 322, ...OVERVIEW },
  ];
}
function cameraFocus(scn, t) {
  const kf = cameraKeyframes(scn);
  if (t <= kf[0].t) return kf[0];
  const last = kf[kf.length - 1];
  if (t >= last.t) return last;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (t >= a.t && t <= b.t) {
      const raw = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      const f = raw * raw * (3 - 2 * raw); // smoothstep ease
      return {
        x: a.x + (b.x - a.x) * f,
        z: a.z + (b.z - a.z) * f,
        dist: a.dist + (b.dist - a.dist) * f,
      };
    }
  }
  return last;
}

/* ============================================================
   Three.js scene construction
   ============================================================ */
function makeTextPlane(text, w, h, opts = {}) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = Math.round((512 * h) / w);
  const g = c.getContext("2d");
  g.fillStyle = opts.bg || "rgba(0,0,0,0)";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = opts.color || "#cfd8e3";
  // start from the requested size, then shrink until the text fits with padding
  const pad = 24;
  let size = opts.size || 90;
  const setFont = (s) => { g.font = `600 ${s}px Inter, Arial, sans-serif`; };
  setFont(size);
  while (size > 12 && g.measureText(text).width > c.width - pad * 2) {
    size -= 2;
    setFont(size);
  }
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  return m;
}

function buildScene(scene) {
  const refs = {};
  scene.background = new THREE.Color(0x0b1017);
  scene.fog = new THREE.Fog(0x0b1017, 70, 160);

  /* lights */
  const amb = new THREE.AmbientLight(0x8899bb, 0.55);
  const hemi = new THREE.HemisphereLight(0x9db4d8, 0x1a2330, 0.5);
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.05);
  sun.position.set(25, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  scene.add(amb, hemi, sun);

  /* floor + tinted zones */
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(110, 0.3, 40),
    new THREE.MeshStandardMaterial({ color: 0x151d28, roughness: 0.95 })
  );
  floor.position.set(-2, -0.15, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const zones = [
    { x: -41, w: 16, c: 0x2a2016, label: "INBOUND" },
    { x: -19, w: 22, c: 0x16202e, label: "STORAGE" },
    { x: -1, w: 12, c: 0x152619, label: "PICKING" },
    { x: 12, w: 12, c: 0x231a2b, label: "PACKING" },
    { x: 32, w: 22, c: 0x1c2129, label: "SHIPPING" },
  ];
  zones.forEach((z) => {
    const zm = new THREE.Mesh(
      new THREE.PlaneGeometry(z.w - 0.8, 24),
      new THREE.MeshStandardMaterial({ color: z.c, roughness: 1 })
    );
    zm.rotation.x = -Math.PI / 2;
    zm.position.set(z.x, 0.02, 0);
    zm.receiveShadow = true;
    scene.add(zm);
    const lbl = makeTextPlane(z.label, 8, 1.7, { color: "#7f8ea3", size: 110 });
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.set(z.x, 0.04, 10.4);
    scene.add(lbl);
  });

  const boxMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05 });
  const addBox = (w, h, d, c, pos, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat(c));
    m.position.set(...pos);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* inbound: dock wall + truck */
  addBox(1, 6, 22, 0x1f2733, [-49, 3, 0]);
  const truck = new THREE.Group();
  addBox(7, 3.4, 3, 0xdde3ea, [0, 2.0, 0], truck);      // trailer
  addBox(2.2, 2.2, 2.8, 0x33507a, [4.6, 1.3, 0], truck); // cab
  [[-2.6, 0.55, 1.5], [2.4, 0.55, 1.5], [-2.6, 0.55, -1.5], [2.4, 0.55, -1.5]].forEach((p) => {
    const wmesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.4, 18),
      new THREE.MeshStandardMaterial({ color: 0x0c0f13, roughness: 0.9 })
    );
    wmesh.rotation.x = Math.PI / 2;
    wmesh.position.set(...p);
    truck.add(wmesh);
  });
  truck.position.set(-43.5, 0, 0);
  scene.add(truck);

  /* storage: one high rack at the back of the storage zone, opening toward the aisle.
     Corpus spans z: -7.2 .. -4.8; items rest on the front lip at z = -4.6. */
  function rack(x, z) {
    const grp = new THREE.Group();
    // uprights at the four corners of the corpus
    [-4.5, -1.5, 1.5, 4.5].forEach((lx) => {
      addBox(0.25, 5.4, 0.25, 0x36527a, [lx, 2.7, -1.1], grp);
      addBox(0.25, 5.4, 0.25, 0x36527a, [lx, 2.7, 1.1], grp);
    });
    // shelf decks
    [1.1, 2.15, 3.2, 4.25].forEach((y) => addBox(9.4, 0.14, 2.4, 0x24344a, [0, y, 0], grp));
    // back panel so we never see "through" the rack
    addBox(9.4, 5.4, 0.1, 0x1b2637, [0, 2.7, -1.15], grp);
    // stored inventory sits toward the BACK half of each shelf (z ≈ -0.5),
    // leaving the aisle-facing front lip (z ≈ +0.5 local → world -4.6) clear
    [[-3.4, 2.55], [0.4, 3.6], [3.2, 1.5], [-1.2, 4.65], [2.2, 4.65]].forEach(([bx, by]) =>
      addBox(1.0, 0.7, 1.0, 0x8a6d4a, [bx, by, -0.45], grp)
    );
    grp.position.set(x, 0, z);
    scene.add(grp);
    return grp;
  }
  rack(-17, RACK_Z);

  /* shelf slot markers: highlight where Item A sits and where Item B belongs.
     Used by the intro camera move to explain the starting situation. */
  function slotMarker(pos, color, filled) {
    const g = new THREE.Group();
    // thin outline frame around the slot (four bars)
    const barMat = new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 0.6, roughness: 0.5,
    });
    const bar = (w, h, d, p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), barMat);
      m.position.set(...p); g.add(m);
    };
    const s = 0.85;
    bar(s, 0.05, 0.05, [0, -s / 2, 0.5]);
    bar(s, 0.05, 0.05, [0, s / 2, 0.5]);
    bar(0.05, s, 0.05, [-s / 2, 0, 0.5]);
    bar(0.05, s, 0.05, [s / 2, 0, 0.5]);
    if (!filled) {
      // faint floor pad to signal an empty reserved slot
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(s, s),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14 })
      );
      pad.position.set(0, -s / 2 + 0.02, 0.5);
      pad.rotation.x = -Math.PI / 2;
      g.add(pad);
    }
    g.position.set(pos[0], pos[1], pos[2]);
    scene.add(g);
    return g;
  }
  const slotA = slotMarker(RACK_A, 0x2f7fe0, true);   // Item A present (blue)
  const slotB = slotMarker(RACK_B, 0xf08a24, false);  // Item B expected, empty (orange)
  const slotAlabel = makeTextPlane("Item A · on stock", 3.0, 0.7, { color: "#8fc0ff", bg: "rgba(10,20,35,0.85)", size: 60 });
  slotAlabel.position.set(RACK_A[0], RACK_A[1] + 0.75, RACK_A[2] + 0.55);
  scene.add(slotAlabel);
  const slotBlabel = makeTextPlane("Item B · slot empty", 3.2, 0.7, { color: "#ffc07a", bg: "rgba(35,22,10,0.85)", size: 60 });
  slotBlabel.position.set(RACK_B[0], RACK_B[1] + 0.75, RACK_B[2] + 0.55);
  scene.add(slotBlabel);
  refs.slotA = slotA; refs.slotB = slotB;
  refs.slotAlabel = slotAlabel; refs.slotBlabel = slotBlabel;

  /* picking terminal + printer (system event, small) */
  const term = new THREE.Group();
  addBox(0.9, 1.5, 0.7, 0x2a3646, [0, 0.75, 0], term);
  const screen = addBox(0.8, 0.55, 0.06, 0x0e2a44, [0, 1.65, 0.36], term);
  screen.material.emissive = new THREE.Color(0x1c5f9e);
  screen.material.emissiveIntensity = 0.7;
  addBox(0.8, 0.35, 0.6, 0x3a4657, [0, 1.9, 0], term); // printer head
  term.position.set(-4, 0, 6.5);
  scene.add(term);
  refs.screen = screen;
  const paper = addBox(0.55, 0.02, 0.75, 0xf2f4f7, [0, 2.1, 0.35]);
  paper.visible = false; paper.position.set(-4, 2.1, 6.9);
  refs.paper = paper;

  /* cutoff sign: a flat board mounted above the storage rack, facing the aisle.
     Flips from blue to red once 14:00 has passed. */
  const cutoffWall = new THREE.Group();
  // two short mounting posts rising from the top of the rack
  addBox(0.18, 1.0, 0.18, 0x2a3646, [-2.6, 0.5, 0], cutoffWall);
  addBox(0.18, 1.0, 0.18, 0x2a3646, [2.6, 0.5, 0], cutoffWall);
  // the illuminated board
  const cutoffBackdrop = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 1.3, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x123249, emissive: 0x1c5f9e, emissiveIntensity: 0.6, roughness: 0.5 })
  );
  cutoffBackdrop.position.set(0, 1.35, 0.05);
  cutoffBackdrop.castShadow = true;
  cutoffWall.add(cutoffBackdrop);
  // fixed label facing +z (the aisle); no per-frame billboarding
  const cutoffLabel = makeTextPlane("SHIPPING CUTOFF 14:00", 5.8, 1.25, { color: "#ffffff", size: 88 });
  cutoffLabel.position.set(0, 1.35, 0.13);
  cutoffWall.add(cutoffLabel);
  // mount it on top of the rack (rack at x=-17, front lip z≈-4.6, top ≈ y 5.4)
  cutoffWall.position.set(-17, 5.3, RACK_FRONT + 0.3);
  scene.add(cutoffWall);
  refs.cutoffBackdrop = cutoffBackdrop;
  refs.cutoffLabel = cutoffLabel;

  /* waiting / late indicator tags (billboarded toward camera each frame) */
  const waitingTag = makeTextPlane("WAITING — Pos 20 not yet available", 4.6, 0.8, {
    color: "#bcd2ec", bg: "rgba(14,26,41,0.92)", size: 62,
  });
  waitingTag.visible = false;
  scene.add(waitingTag);
  refs.waitingTag = waitingTag;

  const lateTag = makeTextPlane("LATE — CUTOFF MISSED", 3.6, 0.8, {
    color: "#ffb3b3", bg: "rgba(58,22,32,0.92)", size: 72,
  });
  lateTag.visible = false;
  scene.add(lateTag);
  refs.lateTag = lateTag;

  /* packing table + open carton (low walls so the packed items stay visible) */
  addBox(4.2, 0.2, 3.2, 0x3a2f4d, [13, 1.25, 0]);
  [[-1.9, 0.6, -1.4], [1.9, 0.6, -1.4], [-1.9, 0.6, 1.4], [1.9, 0.6, 1.4]].forEach((p) =>
    addBox(0.25, 1.2, 0.25, 0x241d33, [13 + p[0], p[1], p[2]])
  );
  const carton = new THREE.Group();
  const cw = 1.9, ch = 0.5, cd = 1.7, wall = 0.06;
  addBox(cw, wall, cd, 0x9a7648, [0, -ch / 2, 0], carton);                         // floor
  addBox(cw, ch, wall, 0x8a6942, [0, 0, -cd / 2 + wall / 2], carton);             // back wall
  addBox(cw, ch, wall, 0x8a6942, [0, 0, cd / 2 - wall / 2], carton);              // front wall
  addBox(wall, ch, cd, 0x8a6942, [-cw / 2 + wall / 2, 0, 0], carton);            // left wall
  addBox(wall, ch, cd, 0x8a6942, [cw / 2 - wall / 2, 0, 0], carton);             // right wall
  // open flaps angled outward, so the box reads as "open, ready to pack"
  const flapFront = addBox(cw, wall, 0.7, 0xb08a54, [0, ch / 2, cd / 2 + 0.3], carton);
  flapFront.rotation.x = -0.9;
  const flapBack = addBox(cw, wall, 0.7, 0xb08a54, [0, ch / 2, -cd / 2 - 0.3], carton);
  flapBack.rotation.x = 0.9;
  carton.position.set(...CARTON_POS);
  scene.add(carton);
  refs.carton = carton;

  /* conveyor packing → shipping */
  addBox(18, 0.28, 1.7, 0x27303c, [25, 1.15, 0]);
  for (let x = 17; x <= 33; x += 1.6) {
    const r = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x4d5a6b, metalness: 0.4, roughness: 0.5 })
    );
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 1.34, 0);
    scene.add(r);
    addBox(0.18, 1.1, 0.18, 0x1c232d, [x, 0.55, 1.0]);
    addBox(0.18, 1.1, 0.18, 0x1c232d, [x, 0.55, -1.0]);
  }

  /* shipping: dock wall + two outbound trucks (lane z=-3 and z=+3) */
  addBox(1, 6, 22, 0x1f2733, [48, 3, 0]);
  function outboundTruck(z, color) {
    const g = new THREE.Group();
    addBox(7, 3.2, 2.6, 0xdde3ea, [0, 2.0, 0], g);          // box trailer
    addBox(6.6, 2.8, 0.1, color, [0.1, 2.0, 1.31], g);      // colored side panel
    addBox(2.1, 2.1, 2.4, 0x33507a, [4.4, 1.3, 0], g);      // cab
    [[-2.4, 0.5, 1.2], [2.2, 0.5, 1.2], [-2.4, 0.5, -1.2], [2.2, 0.5, -1.2]].forEach((p) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x0c0f13, roughness: 0.9 }));
      w.rotation.x = Math.PI / 2; w.position.set(...p); g.add(w);
    });
    g.position.set(43, 0, z);
    scene.add(g);
    return g;
  }
  const truckOut1 = outboundTruck(-3, 0x3f7fd0);
  const truckOut2 = outboundTruck(3, 0xe08a2a);
  refs.truckOut1 = truckOut1; refs.truckOut2 = truckOut2;
  // small "TRUCK 1 / TRUCK 2" labels above each
  const t1label = makeTextPlane("TRUCK 1", 2.6, 0.7, { color: "#bcd6ff", bg: "rgba(12,22,38,0.8)", size: 72 });
  t1label.position.set(43, 4.4, -3); refs.truckOut1label = t1label; t1label.visible = false; scene.add(t1label);
  const t2label = makeTextPlane("TRUCK 2", 2.6, 0.7, { color: "#ffd0a0", bg: "rgba(38,24,10,0.8)", size: 72 });
  t2label.position.set(43, 4.4, 3); refs.truckOut2label = t2label; t2label.visible = false; scene.add(t2label);

  /* forklift builder (body color configurable) */
  function buildForklift(bodyColor) {
    const fk = new THREE.Group();
    addBox(1.5, 1.1, 1.9, bodyColor, [0, 0.75, 0.4], fk);
    addBox(1.3, 0.9, 0.9, 0x2c3644, [0, 1.65, 0.7], fk);
    addBox(0.12, 2.6, 0.12, 0x8b93a1, [-0.5, 1.5, -0.75], fk);
    addBox(0.12, 2.6, 0.12, 0x8b93a1, [0.5, 1.5, -0.75], fk);
    addBox(1.15, 0.08, 0.9, 0xb8c0cc, [0, 0.35, -1.25], fk);
    [[-0.65, 0.35, 1.1], [0.65, 0.35, 1.1], [-0.65, 0.35, -0.3], [0.65, 0.35, -0.3]].forEach((p) => {
      const wmesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.3, 14),
        new THREE.MeshStandardMaterial({ color: 0x11151b })
      );
      wmesh.rotation.x = Math.PI / 2;
      wmesh.position.set(...p);
      fk.add(wmesh);
    });
    scene.add(fk);
    return fk;
  }
  const fk = buildForklift(0xd8a02a);
  refs.forklift = fk;

  /* ambient forklift — quietly patrols the inbound/storage aisle so the hall
     never looks frozen during long waiting phases. Never enters the rack corpus. */
  const fk2 = buildForklift(0x8a9bb0);
  fk2.visible = false;
  fk2.position.set(-35, 0, 8);
  refs.forklift2 = fk2;


  /* pick cart pushed by a picker (roll cart + simple human figure) */
  const cart = new THREE.Group();
  // roll cart: platform, handle, mesh basket
  addBox(1.2, 0.1, 0.9, 0x39a06b, [0, 0.55, 0], cart);
  addBox(0.08, 1.0, 0.9, 0x2b7a51, [-0.6, 1.0, 0], cart);         // handle post
  addBox(0.5, 0.08, 0.9, 0x2b7a51, [-0.55, 1.45, 0], cart);       // handle bar
  // low basket walls so picked items are visible on the cart
  addBox(1.2, 0.35, 0.05, 0x2f8a5c, [0, 0.75, 0.42], cart);
  addBox(1.2, 0.35, 0.05, 0x2f8a5c, [0, 0.75, -0.42], cart);
  addBox(0.05, 0.35, 0.9, 0x2f8a5c, [0.58, 0.75, 0], cart);
  [[-0.45, 0.18, 0.35], [0.45, 0.18, 0.35], [-0.45, 0.18, -0.35], [0.45, 0.18, -0.35]].forEach((p) => {
    const wmesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0x11151b }));
    wmesh.rotation.x = Math.PI / 2; wmesh.position.set(...p); cart.add(wmesh);
  });
  // picker: stands behind the handle (−x side), facing +x (direction of travel)
  const picker = new THREE.Group();
  const skin = 0xc98a5a, vest = 0xf0c000, legs = 0x2a3546;
  addBox(0.45, 0.75, 0.28, vest, [0, 1.05, 0], picker);           // torso (hi-vis vest)
  addBox(0.32, 0.32, 0.3, skin, [0, 1.55, 0], picker);            // head
  addBox(0.12, 0.6, 0.12, legs, [-0.12, 0.3, 0], picker);        // left leg
  addBox(0.12, 0.6, 0.12, legs, [0.12, 0.3, 0], picker);         // right leg
  addBox(0.1, 0.5, 0.1, vest, [0.28, 1.15, 0.05], picker);       // arm reaching to handle
  picker.position.set(-1.05, 0, 0);                               // behind the cart handle
  cart.add(picker);
  refs.picker = picker;
  scene.add(cart);
  refs.cart = cart;

  /* items — small articles, so it's visually obvious two fit into one carton */
  const itemA = addBox(ITEM_SIZE, ITEM_SIZE, ITEM_SIZE, 0x2f7fe0, RACK_A);
  itemA.material.emissive = new THREE.Color(0x123a6e);
  itemA.material.emissiveIntensity = 0.4;
  const itemB = addBox(ITEM_SIZE, ITEM_SIZE, ITEM_SIZE, 0xf08a24, INB_B);
  itemB.material.emissive = new THREE.Color(0x6e3a08);
  itemB.material.emissiveIntensity = 0.4;
  refs.itemA = itemA; refs.itemB = itemB;

  /* parcels */
  const mkParcel = () => {
    const g = new THREE.Group();
    addBox(1.5, 0.95, 1.5, 0x9a7648, [0, 0, 0], g);
    addBox(1.54, 0.14, 0.34, 0xc9b089, [0, 0.42, 0], g); // tape
    g.visible = false;
    scene.add(g);
    return g;
  };
  refs.parcel1 = mkParcel();
  refs.parcel2 = mkParcel();

  return refs;
}

/* ============================================================
   Main simulation component
   ============================================================ */
function Simulation({ onBack }) {
  const mountRef = useRef(null);
  const threeRef = useRef(null);
  const stateRef = useRef({ t: 0, playing: false, speed: 4, scenario: 1 });

  const [scenario, setScenario] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [uiT, setUiT] = useState(0); // for HUD refresh (updated ~10x/s)
  const [panelTab, setPanelTab] = useState("compare"); // mobile: compare | pilot
  const [viewMode, setViewMode] = useState("process"); // process | business

  stateRef.current.scenario = scenario;
  stateRef.current.speed = speed;
  stateRef.current.playing = playing;

  const camState = useRef({
    theta: -0.62, phi: 0.46, dist: 50,
    target: new THREE.Vector3(-4, 2, 1),
    auto: true,          // cinematic auto-follow on by default (for management demo)
    manualUntil: 0,      // timestamp: suspend auto-follow briefly after manual input
  });
  const [autoCam, setAutoCam] = useState(true);
  const toggleAutoCam = useCallback(() => {
    camState.current.auto = !camState.current.auto;
    setAutoCam(camState.current.auto);
  }, []);
  const resetCamera = useCallback(() => {
    camState.current.theta = -0.62;
    camState.current.phi = 0.46;
    camState.current.dist = 50;
    camState.current.auto = true;
    setAutoCam(true);
  }, []);

  const restart = useCallback(() => {
    stateRef.current.t = 0;
    setUiT(0);
  }, []);

  const switchScenario = useCallback((s) => {
    setScenario(s);
    stateRef.current.t = 0;
    setUiT(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    const refs = buildScene(scene);
    threeRef.current = { renderer, scene, camera, refs };

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(mount);

    /* camera controls: drag rotate, wheel zoom.
       Rotation is always user-controlled; auto mode only drives target + distance.
       A manual zoom briefly hands distance back to the user. */
    let dragging = false, px = 0, py = 0;
    const onDown = (e) => { dragging = true; px = e.clientX; py = e.clientY; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      camState.current.theta -= dx * 0.005;
      camState.current.phi = Math.min(1.35, Math.max(0.12, camState.current.phi + dy * 0.004));
    };
    const onUp = () => (dragging = false);
    const onWheel = (e) => {
      e.preventDefault();
      camState.current.dist = Math.min(110, Math.max(18, camState.current.dist + e.deltaY * 0.05));
      camState.current.manualUntil = performance.now() + 3500; // let the user keep their zoom for a moment
    };
    const el = renderer.domElement;
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    /* touch: pinch to zoom, two-finger drag to pan the camera target */
    let pinch = 0;
    let panPrev = null;
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        panPrev = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      } else {
        panPrev = null;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        camState.current.dist = Math.min(110, Math.max(18, camState.current.dist - (d - pinch) * 0.1));
        pinch = d;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (panPrev) {
          const dx = cx - panPrev.x, dy = cy - panPrev.y;
          const th = camState.current.theta;
          camState.current.target.x -= (dx * Math.cos(th) - dy * 0) * 0.035;
          camState.current.target.z += (dx * Math.sin(th)) * 0.035;
          camState.current.target.y = Math.min(6, Math.max(0.5, camState.current.target.y + dy * 0.02));
        }
        panPrev = { x: cx, y: cy };
      }
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);

    let last = performance.now();
    let hudAcc = 0;
    let raf = 0;

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      const scn = st.scenario;
      const endT = getEndT(scn);
      if (st.playing && st.t < endT) {
        const ff = fastForward(scn, st.t);
        st.t = Math.min(endT, st.t + dt * st.speed * ff.mult);
      }
      const t = st.t;

      /* camera */
      const cs = camState.current;
      if (cs.auto && now > cs.manualUntil && st.playing) {
        const focus = cameraFocus(scn, t);
        // ease target + distance toward the focused event (rotation stays user-set)
        const k = Math.min(1, dt * 1.8);
        cs.target.x += (focus.x - cs.target.x) * k;
        cs.target.z += (focus.z - cs.target.z) * k;
        cs.target.y += (2 - cs.target.y) * k;
        cs.dist += (focus.dist - cs.dist) * k;
      }
      camera.position.set(
        cs.target.x + cs.dist * Math.sin(cs.theta) * Math.cos(cs.phi),
        cs.target.y + cs.dist * Math.sin(cs.phi),
        cs.target.z + cs.dist * Math.cos(cs.theta) * Math.cos(cs.phi)
      );
      camera.lookAt(cs.target);

      /* objects */
      const { itemA, itemB, forklift, cart, parcel1, parcel2, paper, screen } = refs;
      const pa = itemAPos(scn, t);
      itemA.visible = !!pa;
      if (pa) itemA.position.set(...pa);
      const pb = itemBPos(scn, t);
      itemB.visible = !!pb;
      if (pb) itemB.position.set(...pb);

      const fp = forkliftPos(scn, t);
      // rotate forklift to face its direction of travel (smoothed)
      const fdx = fp[0] - forklift.position.x;
      const fdz = fp[2] - forklift.position.z;
      if (Math.abs(fdx) > 0.002 || Math.abs(fdz) > 0.002) {
        const targetYaw = Math.atan2(fdx, fdz);
        let dy = targetYaw - forklift.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        forklift.rotation.y += dy * Math.min(1, dt * 8);
      }
      forklift.position.set(fp[0], fp[1], fp[2]);

      /* ambient forklift: slow, calm shuttle along the inbound aisle (x: -40 .. -30, z=8),
         turning at each end. Only moves while playing, so a paused scene stays still. */
      const fk2 = refs.forklift2;
      if (st.playing) {
        fk2.userData.p = (fk2.userData.p || 0) + dt * 0.05;
        const phase = fk2.userData.p % 2;
        const leg = phase < 1 ? phase : 2 - phase; // 0→1→0 triangle wave
        fk2.position.x = -40 + leg * 10;
        fk2.rotation.y = phase < 1 ? Math.PI / 2 : -Math.PI / 2;
      }

      const cp = cartPos(scn, t);
      // face the cart toward its travel direction so the picker pushes from behind
      const cdx = cp[0] - cart.position.x;
      const cdz = cp[2] - cart.position.z;
      if (Math.abs(cdx) > 0.002 || Math.abs(cdz) > 0.002) {
        const targetYaw = Math.atan2(cdx, cdz);
        let dy = targetYaw - cart.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        cart.rotation.y += dy * Math.min(1, dt * 6);
      }
      cart.position.set(cp[0], cp[1], cp[2]);

      const p1 = parcel1Pos(scn, t);
      parcel1.visible = !!p1;
      if (p1) parcel1.position.set(...p1);
      const p2 = parcel2Pos(scn, t);
      parcel2.visible = !!p2;
      if (p2) parcel2.position.set(...p2);

      /* delivery note printer paper */
      const dnActive =
        (scn === 1 && ((t >= 1 && t < 6) || (t >= 121 && t < 126))) ||
        (scn === 2 && t >= 121 && t < 126) ||
        (scn === 3 && ((t >= 241 && t < 246) || (t >= 301 && t < 306)));
      paper.visible = dnActive;
      if (dnActive) paper.position.y = 2.1 + Math.min(0.35, ((t % 1) * 0.35));
      /* held state: screen pulses blue while the job is waiting */
      if ((scn === 2 && t >= 1 && t < 121) || (scn === 3 && t >= 1 && t < CUTOFF_T)) {
        screen.material.emissiveIntensity = 0.5 + 0.4 * Math.abs(Math.sin(now / 350));
      } else {
        screen.material.emissiveIntensity = 0.7;
      }

      /* cutoff board glows blue, flips to red once 14:00 has passed (emissive, fixed orientation) */
      if (t >= CUTOFF_T) {
        refs.cutoffBackdrop.material.emissive.set(0xb03030);
        refs.cutoffBackdrop.material.emissiveIntensity = 0.55 + 0.25 * Math.abs(Math.sin(now / 400));
      } else {
        refs.cutoffBackdrop.material.emissive.set(0x1c5f9e);
        refs.cutoffBackdrop.material.emissiveIntensity = 0.6;
      }

      /* "waiting in inbound" tag while Item B has not started put-away yet */
      const waitingB = false; // management view: status is shown in the 2D order panel, not as a floating 3D tag
      refs.waitingTag.visible = !!waitingB;
      if (waitingB) {
        refs.waitingTag.position.set(INB_B[0], INB_B[1] + 1.15, INB_B[2]);
        refs.waitingTag.lookAt(camera.position);
        refs.waitingTag.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(now / 500));
      }

      /* "late — cutoff missed" tag + reddened glow, scenario 3 only */
      const lateB = scn === 3 && t >= CUTOFF_T && t < 321;
      refs.lateTag.visible = lateB && itemB.visible;
      if (lateB && itemB.visible) {
        refs.lateTag.position.set(itemB.position.x, itemB.position.y + 1.15, itemB.position.z);
        refs.lateTag.lookAt(camera.position);
      }
      itemB.material.emissive.set(lateB ? 0x6e1808 : 0x6e3a08);
      itemB.material.emissiveIntensity = lateB ? 0.55 : 0.35;

      /* shelf slot markers: emphasise the starting situation, then fade out.
         Slot A shows while Item A still sits on the shelf; slot B (empty) shows
         until Item B has actually been put away into it. */
      const aOnShelf = pa && Math.abs(pa[0] - RACK_A[0]) < 0.1 && Math.abs(pa[2] - RACK_A[2]) < 0.1;
      const bInSlot = pb && Math.abs(pb[0] - RACK_B[0]) < 0.1 && Math.abs(pb[2] - RACK_B[2]) < 0.1;
      const showA = aOnShelf && t < 10;
      const showB = !bInSlot && (pb ? pb[0] === INB_B[0] : true); // empty until B arrives
      refs.slotA.visible = showA;
      refs.slotAlabel.visible = showA;
      refs.slotB.visible = showB && t < 10;
      refs.slotBlabel.visible = refs.slotB.visible;
      // billboard labels toward the camera
      if (refs.slotAlabel.visible) refs.slotAlabel.lookAt(camera.position);
      if (refs.slotBlabel.visible) refs.slotBlabel.lookAt(camera.position);
      // pulse the empty B slot so it reads as "reserved / waiting"
      if (refs.slotB.visible) {
        const pulse = 0.4 + 0.4 * Math.abs(Math.sin(now / 500));
        refs.slotB.children.forEach((ch) => {
          if (ch.material && ch.material.emissiveIntensity !== undefined) ch.material.emissiveIntensity = pulse;
        });
      }

      renderer.render(scene, camera);

      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        setUiT(st.t);
      }
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (ro) ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      threeRef.current = null;
    };
  }, []);

  /* ---------- derived UI data ---------- */
  const t = uiT;
  const [aTxt, aCol] = statusA(scenario, t);
  const [bTxt, bCol] = statusB(scenario, t);
  const sys = systemStatus(scenario, t);
  const endT = getEndT(scenario);
  const done = t >= endT - 0.5;
  const ff = fastForward(scenario, t);
  const colHex = { green: "#37c978", orange: "#ff9d42", blue: "#4da3ff", red: "#ff5c5c" };

  const dn1Visible = (scenario === 1 && t >= 1) || (scenario === 3 && t >= 241);
  const dn2Visible = (scenario === 1 && t >= 121) || (scenario === 3 && t >= 301);
  const dnCombVisible = scenario === 2 && t >= 121;

  const mgmtScenario = scenario === 1
    ? { label: "CURRENT PROCESS", issue: "Immediate DN creation", result: "2 DNs · 2 parcels · 2× cost", tone: "#ff5c5c" }
    : scenario === 2
      ? { label: "SMART JOB SUCCESS", issue: "Hold until both positions are available", result: "1 DN · 1 parcel · 1× cost", tone: "#37c978" }
      : { label: "SMART JOB BOUNDARY", issue: "Cutoff reached before Pos 20 is available", result: "Fallback split protects OTIF", tone: "#ff9d42" };
  const decisionChecks = [
    ["Same customer order", true],
    ["Same shipping point", true],
    ["Second position expected today", true],
    ["Available before cutoff", scenario !== 3 || t < CUTOFF_T],
  ];
  const storySteps = scenario === 3
    ? [["10:00", "Order created"], ["10:01", "DN held"], ["14:00", "Cutoff reached"], ["15:21", "Fallback split shipped"]]
    : [["10:00", "Order created"], ["10:01", scenario === 1 ? "Partial DN created" : "DN held"], ["12:00", "Item B available"], ["12:30", scenario === 1 ? "Second parcel shipped" : "Combined parcel shipped"]];

  return (
    <div className="pgs-root">
      <div style={{padding:"10px 14px",background:"#0e151f",borderBottom:"1px solid #253244"}}>
        <div style={{padding:"11px 13px",border:"1px solid #2a394d",borderRadius:12,background:"#141e29",marginBottom:9}}>
          <div style={{fontSize:10,letterSpacing:1.2,fontWeight:800,color:mgmtScenario.tone}}>{mgmtScenario.label}</div>
          <div style={{fontSize:18,fontWeight:850,marginTop:4}}>Should we create the delivery note immediately, or wait for same-day consolidation?</div>
          <div style={{fontSize:12,color:"#9aa7b8",marginTop:4}}>Smart Delivery Note Creation waits for positions from the same order and shipping point — but never beyond the shipping cutoff.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(110px,1fr))",gap:8}}>
          {[["Delivery notes", scenario===2?"1":"2"],["Parcels",scenario===2?"1":"2"],["Transport cost",scenario===2?"1×":"2×"],["Customer touchpoints",scenario===2?"1":"2"]].map(([l,v])=>(
            <div key={l} style={{padding:"9px 11px",border:`1px solid ${mgmtScenario.tone}`,borderRadius:11,background:"#141e29"}}>
              <div style={{fontSize:9,color:"#9aa7b8",textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
              <div style={{fontSize:22,fontWeight:900,color:mgmtScenario.tone}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* top order panel */}
      <div className="pgs-top">
        <div className="pgs-order">
          <div className="pgs-order-head">
            <span className="pgs-order-title">Customer Order 4711</span>
            <span className="pgs-order-meta">Created 10:00 · one order · two positions</span>
            <span className="pgs-clock">{fmtClock(t)}</span>
          </div>
          <table className="pgs-table">
            <thead>
              <tr><th>Pos</th><th>Item</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>10</td>
                <td><span className="dot" style={{ background: "#2f7fe0" }} />Item A</td>
                <td style={{ color: colHex[aCol] }}>{aTxt}</td>
              </tr>
              <tr>
                <td>20</td>
                <td><span className="dot" style={{ background: "#f08a24" }} />Item B</td>
                <td style={{ color: colHex[bCol] }}>{bTxt}</td>
              </tr>
            </tbody>
          </table>
          <div className="pgs-sys" style={{ borderColor: sys.color }}>
            <b style={{ color: sys.color }}>{sys.text}</b>
            <span>{sys.sub}</span>
          </div>
        </div>

        {/* delivery notes */}
        <div className="pgs-notes">
          {dn1Visible && (
            <div className="pgs-note">
              <b>Delivery Note 1</b>
              <span>Pos 10 · Item A · Qty 1</span>
            </div>
          )}
          {dn2Visible && (
            <div className="pgs-note">
              <b>Delivery Note 2</b>
              <span>Pos 20 · Item B · Qty 1</span>
            </div>
          )}
          {dnCombVisible && (
            <div className="pgs-note comb">
              <b>Combined Delivery Note</b>
              <span>Pos 10 · Item A · Qty 1</span>
              <span>Pos 20 · Item B · Qty 1</span>
            </div>
          )}
          {scenario === 2 && t >= 1 && t < 121 && (
            <div className="pgs-note held">
              <b>Smart Delivery Note Job</b>
              <span>Creation held — waiting for Pos 20</span>
            </div>
          )}
          {scenario === 3 && t >= 1 && t < CUTOFF_T && (
            <div className="pgs-note held">
              <b>Smart Delivery Note Job</b>
              <span>Creation held until cutoff 14:00 — waiting for Pos 20</span>
            </div>
          )}
          {scenario === 3 && t >= CUTOFF_T && t < 241 && (
            <div className="pgs-note cutoff">
              <b>Cutoff reached</b>
              <span>Pos 20 still not available — releasing Item A separately</span>
            </div>
          )}
        </div>
        <div style={{minWidth:260,border:"1px solid #2a394d",borderRadius:12,padding:12,background:"#121b25"}}>
          <div style={{fontSize:10,letterSpacing:1,fontWeight:800,color:"#9aa7b8",marginBottom:8}}>DECISION LOGIC</div>
          {decisionChecks.map(([label,ok])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"5px 0",borderBottom:"1px solid #202d3c",fontSize:12}}>
              <span>{label}</span><b style={{color:ok?"#37c978":"#ff5c5c"}}>{ok?"YES":"NO"}</b>
            </div>
          ))}
          <div style={{marginTop:10,padding:"9px 10px",borderRadius:9,background:"#0f1720",border:`1px solid ${mgmtScenario.tone}`}}>
            <div style={{fontSize:10,color:"#9aa7b8"}}>SYSTEM DECISION</div>
            <div style={{fontWeight:800,color:mgmtScenario.tone,marginTop:3}}>{scenario===1?"CREATE DN NOW":scenario===2?"HOLD AND CONSOLIDATE":"RELEASE AT CUTOFF"}</div>
          </div>
        </div>
      </div>

      <div style={{padding:"0 14px 10px",background:"#0e151f"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr repeat(2,minmax(150px,1fr))",border:"1px solid #29384a",borderRadius:12,overflow:"hidden",background:"#121a24"}}>
          <div style={{padding:"9px 11px",fontSize:11,fontWeight:800,color:"#9aa7b8"}}>PER ORDER</div>
          <div style={{padding:"9px 11px",fontSize:11,fontWeight:800,color:"#ff7b7b",borderLeft:"1px solid #29384a"}}>CURRENT PROCESS</div>
          <div style={{padding:"9px 11px",fontSize:11,fontWeight:800,color:"#63dc98",borderLeft:"1px solid #29384a"}}>SMART JOB SUCCESS</div>
          {[
            ["Delivery notes","2","1"],
            ["Parcels","2","1"],
            ["Transport movements","2","1"],
            ["Parcel & filling material","2 sets","1 set"],
            ["Pick & pack effort","2 cycles","1 cycle"],
            ["Customer touchpoints","2","1"],
          ].map((r)=><React.Fragment key={r[0]}>
            <div style={{padding:"7px 11px",fontSize:11,borderTop:"1px solid #202d3c"}}>{r[0]}</div>
            <div style={{padding:"7px 11px",fontSize:11,borderTop:"1px solid #202d3c",borderLeft:"1px solid #202d3c",color:"#ff9a9a"}}>{r[1]}</div>
            <div style={{padding:"7px 11px",fontSize:11,borderTop:"1px solid #202d3c",borderLeft:"1px solid #202d3c",color:"#7be3a8"}}>{r[2]}</div>
          </React.Fragment>)}
        </div>
      </div>

      {/* process / business case mode */}
      <div style={{display:"flex",gap:8,padding:"0 14px 10px",background:"#0e151f"}}>
        <button className={viewMode === "process" ? "on-auto" : ""} onClick={() => setViewMode("process")}>Process View</button>
        <button className={viewMode === "business" ? "on-auto" : ""} onClick={() => setViewMode("business")}>Business Case View</button>
      </div>

      {/* 3D viewport / business case */}
      <div className="pgs-mid">
        {viewMode === "process" ? (
        <div className="pgs-stage" ref={mountRef}>
          {playing && ff.label && (
            <div className="pgs-ff">
              <span className="pgs-ff-icon">⏩</span> {ff.label}
            </div>
          )}
          {/* conclusion overlays the stage */}
          {done && (
            <div className={`pgs-conclusion ${scenario === 1 ? "bad" : scenario === 2 ? "good" : "warn"}`}>
              {scenario === 1 && (
                <>
                  <b>Key takeaway: avoidable split shipment.</b>
                  <span>
                    Both items belonged to the same customer order and would have fitted into one
                    parcel. Immediate delivery note creation caused an unnecessary split shipment,
                    two deliveries and duplicate transport costs (⌀ €15 per shipment → ≈ €30 instead
                    of ≈ €15). It also creates two delivery touchpoints for the customer.
                  </span>
                </>
              )}
              {scenario === 2 && (
                <>
                  <b>Key takeaway: one order · one delivery · one parcel.</b>
                  <span>
                    The Smart Delivery Note Creation Job waited until both positions were available and
                    combined them into one delivery note and one parcel — saving ⌀ €15 in transport
                    cost and giving the customer a single delivery touchpoint.
                  </span>
                  <span className="pgs-note-sub">
                    The job only waits until the shipping cutoff time. It does not delay orders beyond
                    that — there is no impact on OTIF or on the delivery lead time of individual
                    articles.
                  </span>
                </>
              )}
              {scenario === 3 && (
                <>
                  <b>Correct governance behavior — service commitment protected.</b>
                  <span>
                    Item B's put-away only completed at 15:00, after the 14:00 shipping cutoff. The
                    Smart Delivery Note Creation Job released Item A separately right at the cutoff
                    instead of waiting further, so the order still ships as two deliveries on two
                    trucks (⌀ €15 extra transport cost, two customer touchpoints).
                  </span>
                  <span className="pgs-note-sub">
                    The Smart Job consolidates only while service commitments remain protected. At 14:00 it releases available positions, so Item A's delivery time and OTIF remain unaffected; only the cost and CX saving do not materialize.
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        ) : (
          <div style={{width:"100%",padding:16,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,background:"#0f1620"}}>
            <div style={{border:"1px solid #2a394d",borderRadius:14,padding:15,background:"#141e29"}}>
              <div style={{fontSize:11,fontWeight:850,color:"#4da3ff",letterSpacing:1}}>SYSTEM BENEFIT</div>
              <h3 style={{margin:"7px 0 8px",fontSize:18}}>Prevent premature delivery-note creation</h3>
              <p style={{margin:0,color:"#9aa7b8",fontSize:13,lineHeight:1.55}}>The Smart Job identifies positions from the same customer order and shipping point, holds the first delivery note within the allowed time window, and creates one combined delivery note when all eligible positions are available.</p>
              <div style={{marginTop:12,padding:11,borderRadius:10,border:"1px solid #37c978",color:"#7be3a8"}}><b>Direct result:</b> −1 parcel, −1 transport movement, −1 set of parcel and filling material, and −1 pick-and-pack cycle per consolidated order.</div>
            </div>
            <div style={{border:"1px solid #2a394d",borderRadius:14,padding:15,background:"#141e29"}}>
              <div style={{fontSize:11,fontWeight:850,color:"#ff9d42",letterSpacing:1}}>OPERATIONAL DEPENDENCY</div>
              <h3 style={{margin:"7px 0 8px",fontSize:18}}>Put-away must finish before cutoff</h3>
              <p style={{margin:0,color:"#9aa7b8",fontSize:13,lineHeight:1.55}}>The IT job cannot consolidate a position that is not physically available. Additional upside therefore depends on inbound and put-away performance before the 14:00 shipping cutoff.</p>
              <div style={{marginTop:12,padding:11,borderRadius:10,border:"1px solid #ff9d42",color:"#ffc27d"}}><b>Governance:</b> the job releases available positions at cutoff. This protects OTIF and prevents the consolidation logic from delaying customer commitments.</div>
            </div>
            <div style={{gridColumn:"1 / -1",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}}>
              {[["BASE CASE","€144k","per warehouse / year"],["OPERATIONAL UPSIDE","+€108k","per warehouse / year"],["REGIONAL RANGE","€0.72–1.26m","per year"]].map(([a,b,c])=><div key={a} style={{border:"1px solid #2a394d",borderRadius:12,padding:14,background:"#121a24"}}><div style={{fontSize:10,color:"#9aa7b8",letterSpacing:1}}>{a}</div><div style={{fontSize:25,fontWeight:900,marginTop:4}}>{b}</div><div style={{fontSize:11,color:"#9aa7b8",marginTop:3}}>{c}</div></div>)}
            </div>
            <div style={{gridColumn:"1 / -1",border:"1px solid #2a394d",borderRadius:12,padding:13,background:"#121a24",fontSize:12,color:"#9aa7b8"}}>
              <b style={{color:"#d7dee8"}}>Assumptions:</b> 40 consolidated orders/day, 30 additional late put-away cases/day, €15 avoided transport cost per consolidated order, 240 working days, approximately 5 warehouses in the region.
            </div>
          </div>
        )}
      </div>

      {/* bottom: controls + timeline + comparison */}
      <div className="pgs-bottom">
        <div className="pgs-controls">
          <button className="pgs-back" onClick={onBack}>‹ Home</button>
          <div className="pgs-scn">
            <button className={scenario === 1 ? "on s1" : ""} onClick={() => switchScenario(1)}>
              A · Current Process
            </button>
            <button className={scenario === 2 ? "on s2" : ""} onClick={() => switchScenario(2)}>
              B · Smart Job Success
            </button>
            <button className={scenario === 3 ? "on s3" : ""} onClick={() => switchScenario(3)}>
              C · Smart Job Boundary
            </button>
          </div>
          <button className="pgs-play" onClick={() => setPlaying((p) => (t >= endT ? (restart(), true) : !p))}>
            {t >= endT ? "▶ Restart" : playing ? "❚❚ Pause" : "▶ Start Simulation"}
          </button>
          <button onClick={restart}>↺ Restart</button>
          <button className={autoCam ? "on-auto" : ""} onClick={toggleAutoCam}>
            {autoCam ? "🎥 Auto camera: on" : "🎥 Auto camera: off"}
          </button>
          <button onClick={resetCamera}>⌂ Reset view</button>
          <div className="pgs-speed">
            <span>Speed</span>
            {[[2, "0.5×"], [4, "1×"], [8, "2×"]].map(([s, lbl]) => (
              <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="pgs-costbar" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
          <span className="pgs-costbar-good" style={{display:"block"}}><small>BASE CASE</small><br/><b>€144k / warehouse / year</b></span>
          <span className="pgs-costbar-bad" style={{display:"block"}}><small>OPERATIONAL UPSIDE</small><br/><b>+€108k / warehouse / year</b></span>
          <span className="pgs-costbar-net" style={{display:"block"}}><small>REGIONAL RANGE</small><br/><b>€0.72–1.26m / year</b></span>
        </div>
        <div style={{padding:"0 2px 10px",fontSize:11,color:"#7f8ea3"}}>Assumptions: 40 consolidated orders/day · 30 late put-away cases/day · €15 avoided transport cost · 240 working days · approximately 5 warehouses.</div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,padding:"0 2px 10px"}}>
          {storySteps.map(([time,label],i)=>(
            <div key={time} style={{border:"1px solid #29384a",borderRadius:10,padding:"9px 10px",background:"#121a24"}}>
              <div style={{fontSize:11,color:i===storySteps.length-1?mgmtScenario.tone:"#4da3ff",fontWeight:800}}>{time}</div>
              <div style={{fontSize:12,marginTop:3}}>{label}</div>
            </div>
          ))}
        </div>

        <div className="pgs-tabbar">
          <button className={panelTab === "compare" ? "on" : ""} onClick={() => setPanelTab("compare")}>Comparison</button>
          <button className={panelTab === "pilot" ? "on" : ""} onClick={() => setPanelTab("pilot")}>Business case</button>
        </div>

        <div className="pgs-panels">
          <div className={`pgs-cmp pgs-tabpanel ${panelTab === "compare" ? "active" : ""}`}>
            <div className="pgs-panel-title">Comparison</div>
            <table>
              <thead>
                <tr>
                  <th>KPI</th>
                  <th className={scenario === 1 ? "hl1" : ""}>Current Process</th>
                  <th className={scenario === 2 ? "hl2" : ""}>Smart Job Success</th>
                  <th className={scenario === 3 ? "hl3" : ""}>Smart Job Boundary</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Delivery notes", "2", "1", "2"],
                  ["Parcels", "2", "1", "2"],
                  ["Transport cost", "2×", "1×", "2×"],
                  ["Customer touchpoints", "2", "1", "2"],
                  ["Parcel & filling material", "2 sets", "1 set", "2 sets"],
                  ["Pick & pack effort", "2 cycles", "1 cycle", "2 cycles"],
                  ["Management interpretation", "Avoidable split", "Successful consolidation", "Correct cutoff fallback"],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td className={scenario === 1 ? "hl1" : ""}>{r[1]}</td>
                    <td className={scenario === 2 ? "hl2" : ""}>{r[2]}</td>
                    <td className={scenario === 3 ? "hl3" : ""}>{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scenario === 3 ? (
              <div className="pgs-benefit warn">
                No saving this time — Item B missed the 14:00 cutoff. Had it been put away before
                14:00, the job would have consolidated it (⌀ €15 saving potential per order).
              </div>
            ) : (
              <div className="pgs-benefit">
                −1 parcel, −1 transport movement, −1 set of parcel and filling material, and −1 pick-and-pack cycle per affected customer order — ⌀ €15 transport cost saved per avoided split shipment.
              </div>
            )}
            <div className="pgs-footnote"><b>Guardrail:</b> the job never holds an order beyond the shipping cutoff, protecting OTIF.</div>
            <div className="pgs-footnote"><b>CX impact:</b> one consolidated delivery reduces customer touchpoints from 2 to 1.</div>
          </div>

          <div className={`pgs-pilot pgs-tabpanel ${panelTab === "pilot" ? "active" : ""}`}>
            <div className="pgs-panel-title">Management business case</div>
            <div className={`pgs-pilot-row ${scenario === 2 ? "hl2" : ""}`}>
              <span className="pgs-pilot-label">
                <b>Consolidated before cutoff</b>
                <small>40 orders/day × €15 — realised saving</small>
              </span>
              <span className="pgs-pilot-val good">+€600 <small>/ day</small></span>
            </div>
            <div className={`pgs-pilot-row ${scenario === 3 ? "hl3" : ""}`}>
              <span className="pgs-pilot-label">
                <b>Split — put-away after 14:00</b>
                <small>30 orders/day × €15 — saving potential if put away by 14:00</small>
              </span>
              <span className="pgs-pilot-val warn">€450 <small>/ day potential</small></span>
            </div>
            <div className="pgs-pilot-net">
              <div className="pgs-pilot-net-day">
                Net saving today: <b>€600 / day</b>
                <span>realised · plus €450/day potential by improving put-away before 14:00</span>
              </div>
              <div className="pgs-pilot-net-year">
                Net saving per year <span className="pgs-year-note">(per warehouse · 240 working days)</span>
                <b>≈ €144,000</b>
                <span>realised today · up to <b>≈ €252,000</b> if late put-aways are recovered</span>
              </div>
              <div className="pgs-pilot-net-region">
                Region LEC <span className="pgs-year-note">(≈ 5 warehouses)</span>
                <b>≈ €720,000 / year</b>
                <span>realised · up to <b>≈ €1.26 M</b> with put-away before 14:00</span>
              </div>
            </div>
            <div className="pgs-pilot-foot">
              Figures are per warehouse; a region such as LEC can be estimated at roughly 5×.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Landing page + app shell
   ============================================================ */
function StandaloneProcessGapApp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <style>{CSS}</style>
      {open ? (
        <Simulation onBack={() => setOpen(false)} />
      ) : (
        <div className="pgs-landing">
          <div className="pgs-card">
            <div className="pgs-kicker">Warehouse process simulation</div>
            <h1>Process Gap Simulation</h1>
            <p>
              Same-Day &amp; Same Shipping Point — avoid unnecessary split shipments through Smart
              Delivery Note Creation.
            </p>
            <div className="pgs-mini">
              <div><span className="dot" style={{ background: "#2f7fe0" }} /> Item A · Pos 10 · available in storage</div>
              <div><span className="dot" style={{ background: "#f08a24" }} /> Item B · Pos 20 · waiting for put-away</div>
            </div>
            <button className="pgs-cta" onClick={() => setOpen(true)}>
              Open Process Gap Simulation
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================ */
const CSS = `
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
.pgs-root, .pgs-landing {
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  background: #0b1017; color: #d7dee8;
  min-height: 100vh; display: flex; flex-direction: column;
}
.pgs-root { overflow-y: auto; }
.pgs-landing { align-items: center; justify-content: center; padding: 24px; }
.pgs-card {
  max-width: 460px; width: 100%;
  background: linear-gradient(160deg, #121a26, #0e1520);
  border: 1px solid #223045; border-radius: 14px; padding: 34px 32px;
  box-shadow: 0 24px 60px rgba(0,0,0,.5);
}
.pgs-kicker { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #6f7f95; margin-bottom: 10px; }
.pgs-card h1 { margin: 0 0 10px; font-size: 26px; font-weight: 700; color: #f0f4f9; }
.pgs-card p { margin: 0 0 18px; line-height: 1.5; color: #9fb0c4; font-size: 14px; }
.pgs-mini { font-size: 13px; color: #c3cedb; display: flex; flex-direction: column; gap: 6px; margin-bottom: 22px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 7px; vertical-align: -1px; }
.pgs-cta {
  width: 100%; padding: 13px; font-size: 15px; font-weight: 600; color: #08131f;
  background: #4da3ff; border: none; border-radius: 9px; cursor: pointer;
}
.pgs-cta:hover { background: #6bb4ff; }

.pgs-top { display: flex; gap: 10px; padding: 8px 12px 4px; flex-wrap: wrap; flex-shrink: 0; }
.pgs-order {
  flex: 1 1 420px; background: #101825; border: 1px solid #223045; border-radius: 10px; padding: 10px 12px;
}
.pgs-order-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.pgs-order-title { font-weight: 700; color: #f0f4f9; font-size: 15px; }
.pgs-order-meta { font-size: 11.5px; color: #7d8da3; }
.pgs-clock { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 700; font-size: 18px; color: #4da3ff; }
.pgs-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12.5px; }
.pgs-table th { text-align: left; color: #6f7f95; font-weight: 600; padding: 3px 8px 3px 0; border-bottom: 1px solid #223045; }
.pgs-table td { padding: 5px 8px 5px 0; border-bottom: 1px solid #182335; }
.pgs-sys { margin-top: 8px; border-left: 3px solid; padding: 5px 10px; display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; font-size: 12.5px; background: #0d1420; border-radius: 0 6px 6px 0; }
.pgs-sys span { color: #8fa0b6; }

.pgs-notes { display: flex; flex-direction: column; gap: 8px; min-width: 230px; }
.pgs-note {
  background: #f2f4f7; color: #17202b; border-radius: 8px; padding: 8px 12px;
  font-size: 12.5px; display: flex; flex-direction: column; gap: 2px;
  box-shadow: 0 6px 18px rgba(0,0,0,.35);
}
.pgs-note b { font-size: 13px; }
.pgs-note.comb { border-left: 4px solid #37c978; }
.pgs-note.held { background: #14202f; color: #bcd2ec; border: 1px dashed #4da3ff; box-shadow: none; }
.pgs-note.cutoff { background: #3a1620; color: #ffd9d9; border: 1px solid #ff5c5c; box-shadow: none; }

/* middle row: 3D stage (left, grows) + event-log sidebar (right, fixed) */
.pgs-mid { flex: 1 1 auto; min-height: 0; display: flex; gap: 10px; padding: 0 12px; }
.pgs-stage { flex: 1; min-height: 60vh; height: 60vh; position: relative; border-radius: 10px; overflow: hidden; }
.pgs-stage canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
.pgs-stage canvas:active { cursor: grabbing; }

.pgs-conclusion {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  max-width: 440px; width: calc(100% - 32px); padding: 16px 20px; border-radius: 12px; font-size: 13.5px;
  display: flex; flex-direction: column; gap: 6px; line-height: 1.45;
  box-shadow: 0 20px 50px rgba(0,0,0,.55); backdrop-filter: blur(4px); z-index: 5;
}
.pgs-conclusion b { font-size: 15px; }
.pgs-conclusion.bad { background: rgba(70,16,20,.94); border: 1px solid #ff5c5c; color: #ffd9d9; }
.pgs-conclusion.good { background: rgba(11,48,30,.94); border: 1px solid #37c978; color: #d7f5e3; }
.pgs-conclusion.warn { background: rgba(58,32,10,.94); border: 1px solid #ff9d42; color: #ffe3c2; }

.pgs-bottom { padding: 6px 12px 8px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.pgs-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pgs-controls button {
  background: #16202f; border: 1px solid #2a3a52; color: #c3cedb;
  padding: 7px 12px; border-radius: 8px; font-size: 12.5px; cursor: pointer;
}
.pgs-controls button:hover { border-color: #4da3ff; }
.pgs-play { font-weight: 700; color: #08131f !important; background: #4da3ff !important; border-color: #4da3ff !important; }
.pgs-controls button.on-auto { border-color: #4da3ff; color: #4da3ff; background: #12233a; }
.pgs-scn { display: flex; gap: 6px; }
.pgs-scn .on.s1 { background: #3a1620; border-color: #ff9d42; color: #ffc79a; }
.pgs-scn .on.s2 { background: #0d2b1c; border-color: #37c978; color: #a9e8c6; }
.pgs-scn .on.s3 { background: #3a1620; border-color: #ff5c5c; color: #ffb3b3; }
.pgs-speed { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: #6f7f95; margin-left: auto; }
.pgs-speed .on { border-color: #4da3ff; color: #4da3ff; }
.pgs-back { opacity: .8; }

.pgs-panels { display: flex; gap: 10px; flex-wrap: wrap; }
.pgs-panel-title { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #6f7f95; margin-bottom: 6px; }
.pgs-log {
  flex: 1 1 340px; background: #101825; border: 1px solid #223045; border-radius: 10px;
  padding: 9px 12px; max-height: 128px; overflow-y: auto; font-size: 12px;
}
.pgs-ev { padding: 2px 0; color: #5d6d84; display: flex; gap: 8px; }
.pgs-ev.done { color: #cfe0f2; }
.pgs-ev .tick { color: inherit; width: 12px; }
.pgs-ev.done .tick { color: #37c978; }

.pgs-cmp { flex: 1 1 300px; background: #101825; border: 1px solid #223045; border-radius: 10px; padding: 9px 12px; }
.pgs-cmp table { width: 100%; border-collapse: collapse; font-size: 12px; }
.pgs-cmp th, .pgs-cmp td { text-align: left; padding: 3px 6px; border-bottom: 1px solid #182335; }
.pgs-cmp th { color: #6f7f95; font-weight: 600; }
.pgs-cmp .hl1 { background: rgba(255,157,66,.12); color: #ffc79a; }
.pgs-cmp .hl2 { background: rgba(55,201,120,.12); color: #a9e8c6; }
.pgs-cmp .hl3 { background: rgba(255,92,92,.12); color: #ffb3b3; }
.pgs-benefit { margin-top: 7px; font-size: 12px; color: #37c978; font-weight: 600; }
.pgs-benefit.warn { color: #ff9d42; }
.pgs-footnote { margin-top: 6px; font-size: 11px; color: #7d8da3; line-height: 1.4; border-top: 1px solid #182335; padding-top: 6px; }
.pgs-note-sub { font-size: 12px; color: #bcd2ec; opacity: .85; }

.pgs-pilot { flex: 1 1 260px; background: #101825; border: 1px solid #223045; border-radius: 10px; padding: 9px 12px; }
.pgs-pilot-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 7px; margin-bottom: 5px; font-size: 12px; }
.pgs-pilot-label { color: #c3cedb; display: flex; flex-direction: column; gap: 1px; }
.pgs-pilot-label b { font-size: 12.5px; color: #eaf1f8; font-weight: 600; }
.pgs-pilot-label small { font-size: 10.5px; color: #7d8da3; }
.pgs-pilot-val { white-space: nowrap; font-size: 16px; font-weight: 700; text-align: right; }
.pgs-pilot-val small { font-size: 10px; font-weight: 400; color: #7d8da3; display: block; }
.pgs-pilot-val.good { color: #37c978; }
.pgs-pilot-val.warn { color: #ff9d42; }
.pgs-pilot-row.hl2 { background: rgba(55,201,120,.14); outline: 1px solid rgba(55,201,120,.35); }
.pgs-pilot-row.hl3 { background: rgba(255,157,66,.12); outline: 1px solid rgba(255,157,66,.35); }
.pgs-pilot-net { margin-top: 8px; padding-top: 9px; border-top: 1px solid #223045; display: flex; flex-direction: column; gap: 9px; }
.pgs-pilot-net-day { font-size: 12.5px; color: #37c978; font-weight: 600; display: flex; flex-direction: column; gap: 2px; }
.pgs-pilot-net-day span { font-size: 10.5px; color: #7d8da3; font-weight: 400; }
.pgs-pilot-net-year {
  font-size: 12.5px; color: #cfe0f2; font-weight: 600; display: flex; flex-direction: column; gap: 3px;
  background: #0d1a2b; border: 1px solid #1c3d5c; border-radius: 8px; padding: 9px 11px;
}
.pgs-pilot-net-year b { font-size: 22px; color: #4da3ff; line-height: 1.1; }
.pgs-pilot-net-year b:last-of-type { font-size: 13px; }
.pgs-pilot-net-year > span { font-size: 10.5px; color: #8fa0b6; font-weight: 400; }
.pgs-pilot-net-region {
  font-size: 12.5px; color: #d7f5e3; font-weight: 600; display: flex; flex-direction: column; gap: 3px;
  background: #0d2419; border: 1px solid #1c5c3d; border-radius: 8px; padding: 9px 11px;
}
.pgs-pilot-net-region b { font-size: 22px; color: #37c978; line-height: 1.1; }
.pgs-pilot-net-region b:last-of-type { font-size: 13px; }
.pgs-pilot-net-region > span { font-size: 10.5px; color: #8fb8a0; font-weight: 400; }
.pgs-pilot-foot { margin-top: 7px; font-size: 10.5px; color: #7d8da3; line-height: 1.4; }
.pgs-year-note { font-size: 10px; color: #6f7f95; font-weight: 400; }


/* fast-forward badge over the 3D stage */
.pgs-ff {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  background: rgba(13,20,32,.9); border: 1px solid #2a3a52; color: #cfe0f2;
  padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 600;
  display: flex; align-items: center; gap: 7px; pointer-events: none;
  box-shadow: 0 6px 20px rgba(0,0,0,.4); white-space: nowrap;
}
.pgs-ff-icon { color: #4da3ff; animation: pgs-ffpulse 1s ease-in-out infinite; }
@keyframes pgs-ffpulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }

/* mobile-only cost summary strip — keeps the €-impact visible without opening a tab */
.pgs-costbar { display: none; }
@media (max-width: 760px) {
  .pgs-costbar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: #101825; border: 1px solid #223045; border-radius: 10px;
    padding: 8px 11px; font-size: 12px;
  }
  .pgs-costbar-lead { color: #9fb0c4; flex-basis: 100%; font-size: 11px; }
  .pgs-costbar-good { color: #37c978; font-weight: 700; }
  .pgs-costbar-bad { color: #ff9d42; font-weight: 700; }
  .pgs-costbar-net { color: #4da3ff; font-weight: 700; margin-left: auto; }
  .pgs-costbar-more {
    background: none; border: none; color: #6f7f95; font-size: 11.5px;
    cursor: pointer; padding: 0; flex-basis: 100%; text-align: left;
  }
}

/* panel tabs: hidden on desktop (all three panels show side by side) */
.pgs-tabbar { display: none; gap: 6px; }
.pgs-tabbar button {
  flex: 1; background: #16202f; border: 1px solid #2a3a52; color: #9fb0c4;
  padding: 7px 10px; border-radius: 8px 8px 0 0; font-size: 12px; cursor: pointer;
}
.pgs-tabbar button.on { background: #101825; border-bottom-color: #101825; color: #f0f4f9; }

@media (max-width: 760px) {
  .pgs-notes { flex-direction: row; flex-wrap: wrap; min-width: 0; }
  .pgs-clock { font-size: 15px; }
  .pgs-ff { font-size: 11px; padding: 5px 11px; max-width: 92%; white-space: normal; text-align: center; }
  .pgs-mid { min-height: 0; }
  .pgs-stage { min-height: 48vh; height: 48vh; }
  /* on narrow screens, use the tab bar and show one panel at a time */
  .pgs-tabbar { display: flex; }
  .pgs-tabpanel { display: none; }
  .pgs-tabpanel.active { display: block; }
  .pgs-panels { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .pgs-cta, .pgs-controls button { transition: none; }
  .pgs-ff-icon { animation: none; }
}
`;

  return { Simulation, CSS };
})();

function ProcessGapSimulation({ onHome }) {
  return (
    <>
      <style>{EmbeddedProcessGap.CSS}</style>
      <EmbeddedProcessGap.Simulation onBack={onHome} />
    </>
  );
}

const tableHead = {padding:"7px 9px",background:"rgba(255,255,255,.035)",borderBottom:`1px solid ${C.line}`,color:C.dim,fontWeight:700};
const tableCell = {padding:"8px 9px",borderBottom:`1px solid ${C.line}`,color:C.text};


export default function SupplyChainSim() {
  const mountRef = useRef(null);
  const world = useRef({});
  const [scenario, setScenario] = useState(4);
  const simRef = useRef({ t: 0, playing: false, speed: 1, showIn: false, showOut: true, showLink: false, showShipping: false, data: buildChainData(4) });

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [startPoint, setStartPoint] = useState("packing");
  const startPointRef = useRef("packing");
  const lastStartModeRef = useRef("packing");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [guidedDemo, setGuidedDemo] = useState(false);
  const guidedTimersRef = useRef([]);
  const [hud, setHud] = useState({ t: 0, clock: "09:00", docked: 0, unloaded: 0, stored: 0, picked: 0, packed: 0, labelled: 0, inFix: 0, shipped: 0, ots: "Waiting for loading", msg: "Choose Start in Inbound or Start with Packing", msgKind: "info", done: false });
  const [showLanding, setShowLanding] = useState(true);
  const [processGapOpen, setProcessGapOpen] = useState(false);

  useEffect(() => {
    // The 3D mount is intentionally absent while the landing page is visible.
    // Initialize Three.js only after an experience has been opened.
    if (showLanding || processGapOpen) {
      world.current = {};
      return undefined;
    }

    const mount = mountRef.current;
    if (!mount) return undefined;

    const W = Math.max(1, mount.clientWidth);
    const H = Math.max(1, mount.clientHeight);
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
    const cam = { theta: -0.75, phi: 1.0, radius: 16, target: new THREE.Vector3(-3.5, 1, 3.2) };
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

    const cameraViews = {
      "Full Chain": { target: [-3, 0.5, 8], theta: -0.85, phi: 1.0, radius: fitRadius() },
      "Inbound Docks": { target: [-20, 1, 16], theta: -0.6, phi: 1.0, radius: 18 },
      "Sorting": { target: [-8.5, 1.3, 15.5], theta: -0.95, phi: 1.0, radius: 15 },
      "Storage & Picking": { target: [6.3, 1.3, 12], theta: -0.9, phi: 0.95, radius: 15 },
      "Station Supply Carts": { target: [-10.5, 1.2, 2], theta: -0.9, phi: 1.0, radius: 15 },
      "Packing Stations": { target: [-3.5, 1, 3.2], theta: -0.75, phi: 1.0, radius: 16 },
      "Label Check": { target: [MACHINE_X, 1.5, 0], theta: -1.2, phi: 1.0, radius: 11 },
      Shipping: { target: [CONV_END - 3, 1, 0], theta: -0.7, phi: 0.95, radius: 13 },
    };
    const applyView = (name, smooth = false) => {
      const v = cameraViews[name] || cameraViews["Full Chain"];
      if (smooth) {
        cam.target.lerp(new THREE.Vector3(...v.target), 0.055);
        cam.theta += (v.theta - cam.theta) * 0.055;
        cam.phi += (v.phi - cam.phi) * 0.055;
        cam.radius += (v.radius - cam.radius) * 0.055;
      } else {
        cam.target.set(...v.target);
        cam.theta = v.theta; cam.phi = v.phi; cam.radius = v.radius;
      }
      applyCam();
    };

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
    inboundRoot.visible = simRef.current.showIn;
    outboundRoot.visible = simRef.current.showOut;
    linkRoot.visible = simRef.current.showLink;
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

    // compressed process-time visualization: real operational average without extending simulation runtime
    const leadTimeSign = makeTextPlane("SORTING → PUT-AWAY  ·  AVG. 2.5 H", C.orange, 6.4, 0.62);
    leadTimeSign.position.set(3.4, 4.1, 0.2);
    propsIn.add(leadTimeSign);

    const leadTimeLineMat = new THREE.LineBasicMaterial({ color: C.orange, transparent: true, opacity: 0.9 });
    const leadTimeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(SORT_X + 1.0, 2.0, 0.2),
      new THREE.Vector3(1.5, 2.7, 0.2),
      new THREE.Vector3(7.8, 2.7, 0.2),
      new THREE.Vector3(10.6, 2.0, 0.2),
    ]);
    const leadTimeLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(leadTimeCurve.getPoints(48)),
      leadTimeLineMat
    );
    propsIn.add(leadTimeLine);

    const leadTimeArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.58, 8),
      new THREE.MeshBasicMaterial({ color: C.orange })
    );
    leadTimeArrow.rotation.z = -Math.PI / 2;
    leadTimeArrow.position.set(10.7, 2.0, 0.2);
    propsIn.add(leadTimeArrow);

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
    const rollCartItems = [];
    STATIONS.forEach((st, si) => {
      const g = new THREE.Group();
      const isS2 = scenario === 2;
      const isHybrid = scenario === 4;
      const orderColor = ORDERS[si].color;
      const baseX = st.x;
      const tableX = isS2 ? baseX + 0.55 : isHybrid && si === 0 ? baseX + 0.55 : baseX;
      const tableZ = st.z;
      const packerX = isS2 ? baseX - 0.7 : isHybrid && si === 0 ? baseX - 0.7 : baseX;
      const packerZ = isS2 ? st.z + 1.55 : isHybrid && si === 0 ? st.z + 1.55 : st.z + 1.6;
      const printerX = isS2 ? tableX + 1.0 : isHybrid && si === 0 ? tableX + 1.0 : st.x - 1.25;
      const printerZ = isS2 ? st.z - 0.25 : isHybrid && si === 0 ? st.z - 0.25 : st.z - 0.5;

      // packing table
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 2.0), mat(0x3a4657, 0.5, 0.3));
      top.position.set(tableX, 1.0, tableZ); top.castShadow = true;
      g.add(top);
      [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), mat(0x2a3441, 0.4, 0.5));
        leg.position.set(tableX + dx, 0.5, tableZ + dz);
        g.add(leg);
      });

      // Roll cart on the viewer-facing side of the workstation.
      // It stands in front of the packer, between the operator and the camera.
      const cartX = isS2 ? baseX - 0.05 : isHybrid && si === 0 ? baseX - 0.05 : baseX;
      const cartZ = isS2 ? 7.35 : isHybrid && si === 0 ? 7.35 : 6.55;
      const cartW = 1.25, cartD = 0.7, cartH = 1.95;
      const cartMat = mat(0x667382, 0.45, 0.38);
      const cartBody = new THREE.Group();
      [[-cartW / 2, -cartD / 2], [cartW / 2, -cartD / 2], [-cartW / 2, cartD / 2], [cartW / 2, cartD / 2]].forEach(([dx, dz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, cartH, 0.08), cartMat);
        post.position.set(cartX + dx, cartH / 2, cartZ + dz);
        cartBody.add(post);
      });
      [0.28, 0.92, 1.56].forEach((y) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(cartW, 0.08, cartD), cartMat);
        shelf.position.set(cartX, y, cartZ);
        cartBody.add(shelf);
      });
      [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].forEach(([dx, dz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 14), mat(0x1d2732, 0.55, 0.3));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(cartX + dx, 0.08, cartZ + dz);
        cartBody.add(wheel);
      });
      // Multiple visible items represent the material required for the order.
      // Their visibility is reduced progressively while parcels are packed.
      const stationItems = [];
      const itemCount = Math.max(4, Math.min(12, ORDERS[si].count * 2));
      for (let ii = 0; ii < itemCount; ii += 1) {
        const level = ii % 3;
        const col = Math.floor(ii / 3) % 2;
        const depthRow = Math.floor(ii / 6);
        const item = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.18, 0.22),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(orderColor), roughness: 0.68, metalness: 0.06 })
        );
        item.position.set(
          cartX + (col === 0 ? -0.2 : 0.2),
          0.43 + level * 0.64,
          cartZ + (depthRow === 0 ? -0.13 : 0.13)
        );
        item.castShadow = true;
        cartBody.add(item);
        stationItems.push(item);
      }
      rollCartItems.push(stationItems);
      g.add(cartBody);

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
      packer.position.set(packerX, 0, packerZ);
      g.add(packer);
      packers.push(packer);

      // printer
      const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mat(0x222b38, 0.5, 0.4));
      pBody.position.set(printerX, 1.33, printerZ); pBody.castShadow = true;
      const pSlot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.1), mat(0x0d1219, 0.4));
      pSlot.position.set(printerX, 1.4, printerZ + 0.18);
      const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: C.green }));
      pLight.position.set(printerX + 0.23, 1.5, printerZ + 0.14);
      g.add(pBody, pSlot, pLight);
      printerLights.push(pLight);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      paper.position.set(printerX, 1.28, printerZ + 0.25);
      paper.rotation.x = -0.4;
      paper.visible = false;
      g.add(paper);
      printerPapers.push(paper);
      propsOut.add(g);
    });
    // capacity group signs
    [
      ["6-PACKAGE STATION", STATIONS[0].x],
      ["3-PACKAGE STATION", STATIONS[1].x],
      ["1-PACKAGE STATION", STATIONS[2].x],
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


    // Shipping dock with fixed 18:00 departure and OTS KPI
    // Kept in a dedicated group so the default view can focus only on packing.
    const shippingGroup = new THREE.Group();
    propsOut.add(shippingGroup);
    shippingGroup.visible = simRef.current.showShipping;
    zone(CONV_END + 3.8, 0, 7.4, 7.2, 0xff8c42, 0.11, shippingGroup);

    const shippingDockFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 3.5, 3.7),
      mat(0x26313f, 0.55, 0.22)
    );
    shippingDockFrame.position.set(CONV_END + 1.15, 1.75, 0);
    shippingGroup.add(shippingDockFrame);

    const cutoffSign = makeTextPlane("TRUCK MUST BE LOADED BY 18:00", C.orange, 5.8, 0.72);
    cutoffSign.position.set(CONV_END + 1.2, 4.15, 0);
    cutoffSign.rotation.y = -Math.PI / 2;
    shippingGroup.add(cutoffSign);

    const otsSign = makeTextPlane("OTS · ON-TIME SHIPPING", C.green, 4.4, 0.62);
    otsSign.position.set(CONV_END + 1.2, 3.35, 0);
    otsSign.rotation.y = -Math.PI / 2;
    shippingGroup.add(otsSign);

    const departureClock = makeTextPlane("DEPARTURE 18:00", C.yellow, 3.4, 0.58);
    departureClock.position.set(CONV_END + 3.4, 3.3, -2.4);
    shippingGroup.add(departureClock);

    // The trailer rear is positioned at the dock; the cab points away from the warehouse.
    const shippingTruck = buildTruck(C.orange);
    shippingTruck.position.set(CONV_END + 4.25, 0, 0);
    shippingTruck.rotation.y = 0;
    shippingGroup.add(shippingTruck);

    const loadingBay = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 2.6),
      new THREE.MeshBasicMaterial({ color: C.orange, transparent: true, opacity: 0.35 })
    );
    loadingBay.position.set(CONV_END + 1.65, 0.08, 0);
    shippingGroup.add(loadingBay);

    // Extra station-supply banners intentionally omitted for a cleaner packing view.

    // Waiting area (scenario 2) — one staging table beside each station.
    // No conveyor passes over or through these tables.
    const staging = new THREE.Group();
    const stagingGroups = [];

    const stagingTables = [
      {
        station: STATIONS[0],
        label: "6-PACKAGE STAGING · 6 CARTONS",
        color: ORDERS[0].color,
        center: [-11.15, 4.75],
        size: [2.65, 3.95],
        slots: [
          [-11.75, 3.65], [-10.55, 3.65],
          [-11.75, 4.75], [-10.55, 4.75],
          [-11.75, 5.85], [-10.55, 5.85],
        ],
      },
      {
        station: STATIONS[1],
        label: "3-PACKAGE STAGING · 3 CARTONS",
        color: ORDERS[1].color,
        center: [-5.65, 5.25],
        size: [1.8, 3.95],
        slots: [[-5.65, 4.1], [-5.65, 5.25], [-5.65, 6.4]],
      },
      {
        station: STATIONS[2],
        label: "1-PACKAGE STAGING · 1 CARTON",
        color: ORDERS[2].color,
        center: [-0.2, 5.25],
        size: [1.7, 1.7],
        slots: [[-0.2, 5.25]],
      },
    ];

    stagingTables.forEach((cfg, cfgIndex) => {
      const group = new THREE.Group();
      const [cx, cz] = cfg.center;
      const [tableWidth, tableDepth] = cfg.size;

      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(tableWidth, 0.16, tableDepth),
        mat(0x596474, 0.65, 0.2)
      );
      tableTop.position.set(cx, 0.72, cz);
      tableTop.castShadow = true;
      group.add(tableTop);

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
        group.add(leg);
      });

      cfg.slots.forEach(([sx, sz], slotIndex) => {
        const marker = new THREE.Mesh(
          new THREE.PlaneGeometry(1.22, 1.12),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(cfg.color),
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
          })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(sx, 0.815, sz);
        group.add(marker);

        const border = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.22, 1.12)),
          new THREE.LineBasicMaterial({ color: cfg.color })
        );
        border.rotation.x = -Math.PI / 2;
        border.position.set(sx, 0.825, sz);
        group.add(border);

        const number = makeTextPlane(
          `${slotIndex + 1}/${cfg.slots.length}`,
          cfg.color,
          0.9,
          0.3
        );
        number.position.set(sx, 1.08, sz);
        number.rotation.x = -Math.PI / 2;
        group.add(number);
      });

      const tableSign = makeTextPlane(
        cfg.label,
        cfg.color,
        3.8,
        0.42
      );
      tableSign.position.set(cx, 2.2, cz);
      group.add(tableSign);
      staging.add(group);
      stagingGroups.push(group);
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
    const spurToReturn = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 2.1), spurMat);
    spurToReturn.position.set(MACHINE_X + 6, 0.62, 4.2); spurToReturn.castShadow = true;
    const returnWest = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.12, 1.1), spurMat);
    returnWest.position.set(MACHINE_X + 2, 0.62, 5.0); returnWest.castShadow = true;
    const returnNorth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 5.5), spurMat);
    returnNorth.position.set(MACHINE_X - 2, 0.62, 2.5); returnNorth.castShadow = true;
    const scannerApproach = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), spurMat);
    scannerApproach.position.set(MACHINE_X - 1, 0.62, 0); scannerApproach.castShadow = true;
    relabelGroup.add(spurDown, spurEast, spurToReturn, returnWest, returnNorth, scannerApproach);
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
      [MACHINE_X + 6, 4.3, "down"],
      [MACHINE_X + 4.5, 5.0, "west"], [MACHINE_X + 0.5, 5.0, "west"],
      [MACHINE_X - 2, 4.0, "up"], [MACHINE_X - 2, 1.4, "up"],
      [MACHINE_X - 1.0, 0, "east"],
    ];
    spurArrows.forEach(([ax, az, dir]) => {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 4), new THREE.MeshBasicMaterial({ color: C.red }));
      a.position.set(ax, 0.95, az);
      if (dir === "down") a.rotation.x = Math.PI / 2;
      if (dir === "up") a.rotation.x = -Math.PI / 2;
      if (dir === "east") a.rotation.z = -Math.PI / 2;
      if (dir === "west") a.rotation.z = Math.PI / 2;
      relabelGroup.add(a);
    });
    const relabelSign = makeTextPlane("LABEL CORRECTION", C.red, 3.2, 0.5);
    relabelSign.position.set(MACHINE_X + 3, 3.2, 5.8);
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
        ["Order B", "3 packages", "1/3 2/3 3/3", "#ffd166", false],
        devKnown
          ? ["Order C", "3\u21924 pcs ", "x/4", "#ff5c5c", true]
          : ["Order C", "6 packages", "1/6 … 6/6", "#e44cff", false],
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

    // Large packing-area banner intentionally omitted.

    // S6 future-state architecture: identification portal, carton-shuttle AS/RS buffer,
    // sequencing gate and central print-and-apply label cell.
    const loopRackGroup = new THREE.Group();
    const ID_X = 6.5, DIVERT_X = 8.4, BUFFER_Z = -6.0, BUFFER_X = 10.8, SEQ_X = 13.2, LABEL_X = 15.8;

    // Identification portal with scanner, scale and dimensioning frame.
    const idMat = mat(0x2f5a78, 0.42, 0.35);
    const idLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 0.45), idMat);
    const idRight = idLeft.clone();
    idLeft.position.set(ID_X, 1.4, -1.05); idRight.position.set(ID_X, 1.4, 1.05);
    const idBridge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 2.55), idMat);
    idBridge.position.set(ID_X, 2.65, 0);
    const idBeam = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshBasicMaterial({ color: C.blue, transparent: true, opacity: 0.20, side: THREE.DoubleSide }));
    idBeam.position.set(ID_X, 1.35, 0); idBeam.rotation.y = Math.PI / 2;
    const scalePlate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.15), mat(0x3a4657, 0.45, 0.3));
    scalePlate.position.set(ID_X, 0.72, 0);
    loopRackGroup.add(idLeft, idRight, idBridge, idBeam, scalePlate);

    // Straight divert conveyor into the automated buffer aisle.
    const futureBeltMat = new THREE.MeshStandardMaterial({ color: 0x314459, roughness: 0.88 });
    const divertLane = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 6.0), futureBeltMat);
    divertLane.position.set(DIVERT_X, 0.62, BUFFER_Z / 2);
    const bufferCross = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 1.15), futureBeltMat);
    bufferCross.position.set((DIVERT_X + BUFFER_X) / 2 + 0.3, 0.62, BUFFER_Z);
    loopRackGroup.add(divertLane, bufferCross);

    // Single-row carton-shuttle / mini-load buffer with six dedicated HU positions.
    const rackMat = mat(0x596879, 0.46, 0.34);
    const rackW = 5.6, rackD = 1.05, rackH = 1.85;
    [[-rackW/2,-rackD/2],[rackW/2,-rackD/2],[-rackW/2,rackD/2],[rackW/2,rackD/2]].forEach(([dx,dz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, rackH, 0.11), rackMat);
      post.position.set(BUFFER_X + dx, rackH/2, BUFFER_Z + dz); loopRackGroup.add(post);
    });
    [0.18, 1.10].forEach((y) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(rackW, 0.10, rackD), rackMat);
      shelf.position.set(BUFFER_X, y, BUFFER_Z); loopRackGroup.add(shelf);
    });
    [-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].forEach((dx) => {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.72), new THREE.MeshBasicMaterial({ color: 0x33465d, transparent: true, opacity: 0.80 }));
      slot.position.set(BUFFER_X + dx, 0.64, BUFFER_Z); loopRackGroup.add(slot);
    });

    // Shuttle carriage travelling along the single rack row.
    const shuttle = new THREE.Group();
    const shuttleRail = new THREE.Mesh(new THREE.BoxGeometry(rackW + 0.35, 0.08, 0.16), mat(0x6c8ba8, 0.38, 0.38));
    shuttleRail.position.set(BUFFER_X, 1.53, BUFFER_Z - 0.42);
    const shuttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.20, 0.52), mat(0x5b7fa3, 0.38, 0.45));
    shuttleBase.position.set(BUFFER_X - 2.0, 1.42, BUFFER_Z - 0.42);
    shuttle.add(shuttleRail, shuttleBase); loopRackGroup.add(shuttle);

    // Sequencing conveyor and release gate back to the main line.
    const seqLane = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 6.0), futureBeltMat);
    seqLane.position.set(SEQ_X, 0.62, BUFFER_Z / 2);
    loopRackGroup.add(seqLane);
    const gateL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.65, 0.15), mat(0x6c7887, 0.45, 0.35));
    const gateR = gateL.clone(); gateL.position.set(SEQ_X, 0.82, -0.78); gateR.position.set(SEQ_X, 0.82, 0.78);
    const gateArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.45), mat(0xff8c42, 0.5, 0.2));
    gateArm.position.set(SEQ_X, 1.22, 0); loopRackGroup.add(gateL, gateR, gateArm);

    // Central final-label cell: scanner, print-and-apply and camera verification.
    const cellMat = mat(0x355b43, 0.40, 0.38);
    const cL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.1, 0.5), cellMat);
    const cR = cL.clone(); cL.position.set(LABEL_X, 1.55, -1.15); cR.position.set(LABEL_X, 1.55, 1.15);
    const cTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.8), cellMat); cTop.position.set(LABEL_X, 2.85, 0);
    const printHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.55), mat(0x22303f, 0.42, 0.42));
    printHead.position.set(LABEL_X, 1.7, -0.85);
    const verifyCam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.45), mat(0x1d2732, 0.42, 0.42));
    verifyCam.position.set(LABEL_X, 2.15, 0.85);
    loopRackGroup.add(cL, cR, cTop, printHead, verifyCam);

    // Small equipment labels mounted close to each component.
    const idPortalLabel = makeTextPlane("IDENTIFICATION PORTAL", "#c7d2e0", 2.7, 0.34);
    idPortalLabel.position.set(ID_X, 3.22, 0);
    idPortalLabel.rotation.y = -Math.PI / 2;

    const scaleLabel = makeTextPlane("WEIGHING + DIMENSIONING", "#8fa0b5", 2.7, 0.30);
    scaleLabel.position.set(ID_X - 0.72, 1.05, 0);
    scaleLabel.rotation.y = -Math.PI / 2;

    const scannerLabel = makeTextPlane("BARCODE / VISION SCANNER", "#8fa0b5", 2.6, 0.30);
    scannerLabel.position.set(ID_X + 0.72, 2.05, 0);
    scannerLabel.rotation.y = -Math.PI / 2;

    const bufferLabel = makeTextPlane("AUTOMATED HU BUFFER", "#c7d2e0", 2.9, 0.34);
    bufferLabel.position.set(BUFFER_X, 2.18, BUFFER_Z + 0.72);

    const sequencingLabel = makeTextPlane("SEQUENCING GATE", "#c7d2e0", 2.4, 0.34);
    sequencingLabel.position.set(SEQ_X, 2.45, 0.86);
    sequencingLabel.rotation.y = -Math.PI / 2;

    const printApplyLabel = makeTextPlane("PRINT & APPLY", "#c7d2e0", 2.0, 0.34);
    printApplyLabel.position.set(LABEL_X, 3.38, -0.75);
    printApplyLabel.rotation.y = -Math.PI / 2;

    const verificationLabel = makeTextPlane("VISION CHECK", "#8fa0b5", 1.8, 0.30);
    verificationLabel.position.set(LABEL_X, 2.45, 0.95);
    verificationLabel.rotation.y = -Math.PI / 2;

    loopRackGroup.add(
      idPortalLabel,
      scaleLabel,
      scannerLabel,
      bufferLabel,
      sequencingLabel,
      printApplyLabel,
      verificationLabel
    );

    // Dynamic architecture status board.
    const bufferCv = document.createElement("canvas");
    bufferCv.width = 500; bufferCv.height = 250;
    const bufferTex = new THREE.CanvasTexture(bufferCv);
    const bufferPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.4), new THREE.MeshBasicMaterial({ map: bufferTex }));
    bufferPanel.position.set(BUFFER_X, 3.35, BUFFER_Z + 1.55);
    loopRackGroup.add(bufferPanel);
    let bufferStatusKey = "";
    function drawBufferStatus(stored, released) {
      const key = `${stored}-${released}`;
      if (bufferStatusKey === key) return;
      bufferStatusKey = key;
      const g = bufferCv.getContext("2d");
      g.fillStyle = "#0a1018"; g.fillRect(0,0,500,250);
      g.strokeStyle = stored < 6 ? C.yellow : C.green; g.lineWidth = 6; g.strokeRect(3,3,494,244);
      g.textAlign = "center"; g.fillStyle = "#e8edf4"; g.font = "bold 28px 'IBM Plex Mono', monospace";
      g.fillText("AUTOMATED HU BUFFER",250,45);
      g.fillStyle = stored < 6 ? C.yellow : C.green; g.font = "bold 62px 'IBM Plex Mono', monospace";
      g.fillText(`${stored}/6`,250,122);
      g.font = "bold 20px 'IBM Plex Mono', monospace";
      g.fillText(stored < 6 ? "BUFFERING ORDER C" : released > 0 ? `SEQUENCED RELEASE ${released}/6` : "ORDER COMPLETE · READY",250,170);
      g.fillStyle = "#8fa0b5"; g.font = "17px 'IBM Plex Mono', monospace";
      g.fillText("Carton shuttle · Print & apply · Vision check",250,210);
      bufferTex.needsUpdate = true;
    }
    drawBufferStatus(0,0);
    propsOut.add(loopRackGroup);

    // Show the physical equipment required by the selected packing scenario.
    // S1: direct labels with open package count (1/X through 6/X)
    // S2: packages wait on staging tables until the complete order is ready
    // S3: interim labels, downstream labelling machine and waiting loop
    // S4: predictive ORTEC labels, verification scan and correction spur
    staging.visible = scenario === 2 || scenario === 4;
    stagingGroups.forEach((group, idx) => {
      group.visible = scenario === 2 || (scenario === 4 && idx === 0);
    });
    loopGroup.visible = scenario === 3 || scenario === 4;
    machine.visible = scenario === 3 || scenario === 4 || scenario === 5;
    relabelGroup.visible = scenario === 5;
    ortecGroup.visible = scenario === 5;
    loopRackGroup.visible = scenario === 6;

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
    let lastMachineDisplayKey = "";


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
          // Trucks reverse into the receiving gates: trailer rear faces the dock.
          am.group.rotation.y = am.lastYaw + (ad.kind === "truck" ? Math.PI : 0);
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
        lastMachineDisplayKey = "";
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
      const leadPulse = 0.72 + 0.28 * Math.sin(now * 0.004);
      leadTimeLineMat.opacity = t >= 10 && t <= 31 ? leadPulse : 0.28;
      leadTimeArrow.scale.setScalar(t >= 10 && t <= 31 ? 1 + 0.12 * Math.sin(now * 0.006) : 0.9);
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
        const stationParcels = dP.parcels.filter((p) => !p.tote && p.st === si);
        const anyPacking = stationParcels.some((p) => t >= p.spawn && t < p.packEnd);
        packer.position.y = anyPacking ? Math.abs(Math.sin(now * 0.008)) * 0.08 : 0;

        // Consume items from the roll cart as the station completes parcels.
        const packedAtStation = stationParcels.filter((p) => t >= p.packEnd).length;
        const totalAtStation = Math.max(1, stationParcels.length);
        const items = rollCartItems[si] || [];
        const remainingRatio = Math.max(0, 1 - packedAtStation / totalAtStation);
        const visibleItems = Math.ceil(items.length * remainingRatio);
        items.forEach((item, itemIndex) => {
          item.visible = itemIndex < visibleItems;
        });
      });
      if (dP.n === 6) {
        const rackParcels = dP.parcels.filter((p) => !p.tote && p.order === "C" && p.stagingIv);
        const stored = rackParcels.filter((p) => t >= p.stagingIv[0]).length;
        const released = rackParcels.filter((p) => t >= p.stagingIv[1]).length;
        drawBufferStatus(Math.min(6, stored), Math.min(6, released));
        gateArm.rotation.x = stored >= 6 && released < 6 ? -Math.PI / 3 : 0;
        gateArm.material.color.set(stored >= 6 ? C.green : C.orange);
      }

      printerPapers.forEach((paper, si) => {
        const stationLabelSoon = dP.parcels.some(
          (p) => p.st === si && p.labels.some((L) => !L[4] && L[0] <= p.move + 0.6 && Math.abs(t - L[0]) < 0.5)
        );
        paper.visible = stationLabelSoon;
        printerLights[si].material.color.set(stationLabelSoon ? C.orange : C.green);
      });

      // scanner beam pulse
      let beamOn = false;
      if (dP.n === 3 || dP.n === 4 || dP.n === 5 || dP.n === 6) {
        beamOn = dP.scans.some((st) => t >= st && t <= st + 1.0);
        beam.material.opacity = beamOn ? 0.35 + 0.25 * Math.sin(now * 0.02) : 0;
      }

      // Ortec board state
      if (dP.n === 5) {
        const devP = dP.parcels.find((p) => p.devT !== undefined);
        drawOrtec(devP ? t >= devP.devT : false);
      }

      // machine display state
      if (dP.n === 3 || dP.n === 4 || dP.n === 5 || dP.n === 6) {
        let scansN = 0;
        dP.scans.forEach((st) => { if (t >= st) scansN++; });
        let current = "—", currentP = null;
        dP.parcels.forEach((p) => {
          const pos = posAt(p.path, t);
          if (Math.abs(pos[1] - MACHINE_X) < 0.8 && Math.abs(pos[3]) < 0.8 && t >= p.conveyor[0]) { current = p.id; currentP = p; }
        });
        if (dP.n === 3 || dP.n === 5 || dP.n === 6) {
          // per-order registration status of the parcel currently at the machine
          let reg = 0, total = 3, orderNo = "\u2014";
          if (currentP) {
            orderNo = currentP.order;
            total = currentP.orderSize;
            dP.parcels.forEach((p) => { if (p.order === currentP.order && t >= p.labels[0][0]) reg++; });
          }
          const displayState = { parcel: current, order: orderNo, reg, total, complete: currentP ? reg >= total : false, scans: scansN };
          const displayKey = JSON.stringify(displayState);
          if (displayKey !== lastMachineDisplayKey) {
            lastMachineDisplayKey = displayKey;
            drawMachineDisplay(displayState);
          }
        } else {
          let plan = "\u2014", act = "\u2014", mismatch = false, orderNo = "\u2014";
          if (currentP) {
            orderNo = currentP.order;
            plan = currentP.plan;
            const devKnown = currentP.devT !== undefined && t >= currentP.devT;
            act = devKnown ? currentP.plan + 1 : currentP.plan;
            mismatch = !!(currentP.relabelIv && t < currentP.relabelIv[1]);
          }
          const displayState = { mode: "verify", parcel: current, order: orderNo, plan, act, mismatch, scans: scansN };
          const displayKey = JSON.stringify(displayState);
          if (displayKey !== lastMachineDisplayKey) {
            lastMachineDisplayKey = displayKey;
            drawMachineDisplay(displayState);
          }
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
        // Keep all cartons fully inside the marked staging frames.
        // The package geometries vary in size, so staged cartons are uniformly reduced.
        if (!pd.tote && inStaging) {
          pm.group.scale.setScalar(0.72);
        } else if (!pd.tote && t >= pd.packEnd) {
          pm.group.scale.setScalar(1);
        }
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
        if ((dP.n === 3 || dP.n === 6) && passStarted > 0) auxTxt = `loop passes: ${passStarted}`;
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
        if (dP.n === 3 || dP.n === 5 || dP.n === 6) {
          pd.loop.forEach(([a, b]) => {
            if (t >= a) {
              const w = Math.min(t, b) - a;
              waitSum += w;
              waitByOrder[pd.order] += w;
            }
          });
          waitCount = dP.parcels.filter((p) => !p.tote).length;
        }
        if (dP.n === 5) {
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

      // Visual 18:00 departure: once all seven packages are loaded, the truck leaves the dock.
      const shippedNow = dP.parcels.filter((p) => !p.tote && t >= p.conveyor[1]).length;
      const departureStart = Math.max(0, data.duration - 1.8);
      const departureProgress = THREE.MathUtils.clamp((t - departureStart) / 2.8, 0, 1);
      shippingTruck.position.x = CONV_END + 4.25 + departureProgress * 12;
      shippingTruck.visible = departureProgress < 0.98;
      loadingBay.material.opacity = shippedNow >= 7 ? 0.52 : 0.22 + 0.12 * Math.sin(now * 0.004);

      // HUD throttle
      hudTimer += dtReal;
      if (hudTimer > 0.12) {
        hudTimer = 0;
        const cnt = (arr) => arr.filter((x) => x !== null && t >= x).length;
        let msg = "Press start to run the full supply chain", kindM = "info";
        for (const m of data.messages) if (t >= m[0]) { msg = m[1]; kindM = m[2] || "info"; }
        const shipped = shippedNow;
        const ots = shipped >= 7 ? (departureProgress > 0 ? "Departed on time · 18:00" : "Loaded before 18:00") : "Loading for 18:00 cutoff";
        setHud({
          t,
          clock: fmtClock(clockMin),
          docked: cnt(dI.stats.docked),
          unloaded: cnt(dI.stats.unloaded),
          stored: cnt(dI.stats.stored),
          picked: cnt(data.pickTimes),
          packed, labelled, inFix: inLoop, shipped, ots,
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

    world.current = {
      cam, applyCam, fitRadius,
      setManualView: (name) => applyView(name, false),
      setScope: ({ inbound, outbound, link, shipping }) => {
        if (typeof inbound === "boolean") inboundRoot.visible = inbound;
        if (typeof outbound === "boolean") outboundRoot.visible = outbound;
        if (typeof link === "boolean") linkRoot.visible = link;
        if (typeof shipping === "boolean") shippingGroup.visible = shipping;
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      world.current = {};
    };
  }, [scenario, showLanding, processGapOpen]);

  useEffect(() => () => {
    guidedTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    guidedTimersRef.current = [];
  }, []);

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
  const getImmediatePackingStart = () => {
    const packParcels = simRef.current?.data?.pack?.parcels || [];
    const firstRealParcel = packParcels
      .filter((p) => !p.tote && typeof p.spawn === "number")
      .sort((a, b) => a.spawn - b.spawn)[0];
    return firstRealParcel ? Math.max(0, firstRealParcel.spawn + 0.05) : CHAIN_PACK_OFF + 5.05;
  };

  const startAt = (startTime, message, viewName) => {
    const S = simRef.current;
    S.t = startTime;
    S.playing = true;
    S.rebuilt = true;
    setPlaying(true);
    setHud((h) => ({ ...h, t: startTime, done: false, msg: message, msgKind: "info" }));

  };
  const startInbound = () => {
    lastStartModeRef.current = "inbound";
    showFullChain();
    world.current.setManualView?.("Full Chain");
    startAt(0, "Inbound started — trucks arrive at the receiving gates", "Full Chain");
  };
  const startPacking = () => {
    lastStartModeRef.current = "packing";
    showPackingOnly();
    world.current.setManualView?.("Packing Stations");
    const packingStart = getImmediatePackingStart();
    startAt(packingStart, `Packing started — ${SCENARIOS[scenario].title}`, "Packing Stations");
  };
  const doPlay = () => { simRef.current.playing = true; setPlaying(true); };
  const doPause = () => { simRef.current.playing = false; setPlaying(false); };
  const doReset = () => {
    // Restart from the same entry point that was used previously.
    // A packing simulation therefore refreshes directly back into packing.
    if (lastStartModeRef.current === "inbound") startInbound();
    else startPacking();
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
    guidedTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    guidedTimersRef.current = [];
    setGuidedDemo(false);
    const nextData = buildChainData(nextScenario);
    simRef.current = { ...simRef.current, t: 0, playing: false, data: nextData };
    setPlaying(false);
    setScenario(nextScenario);
    setHud({ t: 0, clock: "09:00", docked: 0, unloaded: 0, stored: 0, picked: 0, packed: 0, labelled: 0, inFix: 0, shipped: 0, ots: "Waiting for loading", msg: `S${nextScenario}: ${SCENARIOS[nextScenario].title} selected — choose a start mode`, msgKind: "info", done: false });
    window.setTimeout(() => world.current.setManualView?.("Packing Stations"), 0);
  };
  const setSpd = (v) => { simRef.current.speed = v; setSpeed(v); };
  const applyScope = ({ inbound = showIn, outbound = showOut, link = showLink, shipping = showShipping }) => {
    setShowIn(inbound); setShowOut(outbound); setShowLink(link); setShowShipping(shipping);
    Object.assign(simRef.current, { showIn: inbound, showOut: outbound, showLink: link, showShipping: shipping });
    world.current.setScope?.({ inbound, outbound, link, shipping });
  };
  const showPackingOnly = () => { setScopeOpen(false); applyScope({ inbound: false, outbound: true, link: false, shipping: false }); };
  const showFullChain = () => { setScopeOpen(false); applyScope({ inbound: true, outbound: true, link: true, shipping: true }); };
  const showCustomScope = () => setScopeOpen(true);
  const startSelected = () => {
    const selectedStart = startPointRef.current;
    if (selectedStart === "inbound") startInbound();
    else startPacking();
  };
  const chooseStartPoint = (value) => {
    startPointRef.current = value;
    setStartPoint(value);
  };
  const toggleIn = () => applyScope({ inbound: !showIn });
  const toggleOut = () => applyScope({ outbound: !showOut });
  const toggleLink = () => applyScope({ link: !showLink });
  const toggleShipping = () => applyScope({ shipping: !showShipping });
  const setView = (name) => {
    if (["Inbound Docks", "Sorting", "Storage & Picking"].includes(name)) applyScope({ inbound: true });
    if (name === "Storage & Picking") applyScope({ inbound: true, link: true });
    if (name === "Shipping") applyScope({ shipping: true });
    world.current.setManualView?.(name);
  };

  const stopGuidedDemo = () => {
    guidedTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    guidedTimersRef.current = [];
    setGuidedDemo(false);
  };
  const launchGuidedScenario = (n) => {
    const nextData = buildChainData(n);
    const firstRealParcel = nextData.pack.parcels
      .filter((p) => !p.tote && typeof p.spawn === "number")
      .sort((a, b) => a.spawn - b.spawn)[0];
    const packingStart = firstRealParcel ? Math.max(0, firstRealParcel.spawn + 0.05) : CHAIN_PACK_OFF + 5.05;
    simRef.current = { ...simRef.current, t: packingStart, playing: true, rebuilt: true, data: nextData };
    setScenario(n);
    setPlaying(true);
    showPackingOnly();
    setHud((h) => ({ ...h, t: packingStart, done: false, msg: `Guided demo · S${n}: ${SCENARIOS[n].title}`, msgKind: "info" }));
    window.setTimeout(() => world.current.setManualView?.("Packing Stations"), 0);
  };
  const startGuidedDemo = () => {
    stopGuidedDemo();
    setGuidedDemo(true);
    setSpd(2);
    const sequence = [1, 2, 3, 4, 5, 6];
    guidedTimersRef.current = sequence.map((n, index) => window.setTimeout(() => {
      launchGuidedScenario(n);
      if (index === sequence.length - 1) {
        guidedTimersRef.current.push(window.setTimeout(() => setGuidedDemo(false), 10000));
      }
    }, index * 10000));
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

  const scenarioDescriptions = {
    1: "CURRENT STATE: Labels are printed immediately. The final package count is still unknown, so labels show 1/X, 2/X or 3/X.",
    2: "Packages wait in staging until the complete order is packed. Final labels are then applied together.",
    3: "Packages receive interim labels and move directly to the conveyor. Final labels are applied later, including a scanner loop when required.",
    4: "Hybrid scenario: most parcels behave like S3, but the 6-HU station stages interim-labelled parcels until the order is complete and sends them together to the downstream label machine.",
    5: "Labels are created from the ORTEC packing proposal. Verification failures enter the correction loop and pass the scanner again.",
    6: "Future-state concept: packages receive a technical HU-ID, pass through an identification portal and are stored in an automated carton-shuttle buffer. Once all six HUs are available, they are released in sequence to a central print-and-apply label cell.",
  };

  const scenarioObjectives = {
    1: {
      eyebrow: "CURRENT STATE",
      title: "Label immediately",
      description: "Labels are printed as soon as each package is packed. Because the final number of Handling Units is still unknown, the labels show placeholders such as 1/X or 2/X.",
      result: "Limitation: the final HU sequence is not available at label creation.",
      accent: C.blue,
    },
    2: {
      eyebrow: "THEORETICAL SCENARIO",
      title: "Wait until complete",
      description: "Packages are staged until the complete order has been packed. Final labels are then printed together with the correct Handling Unit sequence.",
      result: "Result: 1/3 · 2/3 · 3/3 instead of 1/X · 2/X · 3/X.",
      accent: C.green,
    },
    3: {
      eyebrow: "THEORETICAL SCENARIO",
      title: "Temporary label, final label later",
      description: "Each package receives a temporary identifier and continues to flow. A downstream station applies the final shipping label after the complete order is known.",
      result: "Benefit: continuous flow with correct final HU numbering.",
      accent: C.orange,
    },
    4: {
      eyebrow: "THEORETICAL SCENARIO",
      title: "Hybrid staging + interim label",
      description: "Most parcels flow like S3 with interim labels. Only the 6-HU station stages the finished parcels, waits until all six are packed, and then sends them together to the downstream label machine for the final labels.",
      result: "Benefit: controlled release for the 6-HU order while retaining interim-label flow for the other stations.",
      accent: C.orange,
    },
    5: {
      eyebrow: "THEORETICAL SCENARIO",
      title: "Label based on ORTEC proposal",
      description: "The expected Handling Unit count is predicted before packing. Orders are routed to the appropriate station and labels can show the final HU sequence immediately.",
      result: "Benefit: no staging, immediate labels and correction only when verification fails.",
      accent: C.yellow,
    },
    6: {
      eyebrow: "THEORETICAL SCENARIO",
      title: "Automated HU buffer & sequencing",
      description: "Packages are identified, weighed and dimensioned after packing and stored in an automated carton-shuttle buffer. When the order is complete, the system releases the HUs in a defined sequence to a central print-and-apply cell.",
      result: "Benefit: no staging at the pack table, no waiting loop and reliable final labels from 1/6 to 6/6 after physical order completion.",
      accent: C.red,
    },
  };


  const objective = scenarioObjectives[scenario];
  const availableCameraViews = [
    "Full Chain",
    ...(showIn ? ["Inbound Docks", "Sorting", "Storage & Picking"] : []),
    ...(showOut ? ["Station Supply Carts", "Packing Stations", "Label Check"] : []),
    ...(showShipping ? ["Shipping"] : []),
  ];
  const parseClockMinutes = (clock) => {
    const match = String(clock || "09:00").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return 9 * 60;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const dayStartMinutes = 9 * 60;
  const dayEndMinutes = 18 * 60;
  const currentMinutes = Math.max(dayStartMinutes, Math.min(dayEndMinutes, parseClockMinutes(hud.clock)));
  const dayProgress = ((currentMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) * 100;
  const storageCutoffProgress = ((14 * 60 - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) * 100;

  const openExperience = (type) => {
    chooseStartPoint("packing");
    setShowLanding(false);
    if (type === "current") changeScenario(1);
    else changeScenario(2);
    showPackingOnly();
  };

  const openProcessGap = () => {
    doPause();
    setProcessGapOpen(true);
    setShowLanding(false);
  };

  if (showLanding) {
    const landingCard = (accent) => ({
      background: "rgba(20,27,37,0.96)", border: `1px solid ${accent}`, borderRadius: 16,
      padding: 20, textAlign: "left", color: C.text, cursor: "pointer", minHeight: 210,
      display: "flex", flexDirection: "column", boxShadow: "0 14px 34px rgba(0,0,0,.22)"
    });
    return (
      <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 50% 0%, ${C.panel2} 0%, ${C.bg} 55%)`, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "min(1120px, 100%)" }}>
          <div style={{ marginBottom: 28, maxWidth: 800 }}>
            <div style={{ color: C.green, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>SUPPLY CHAIN DIGITAL TWIN</div>
            <h1 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 54px)", lineHeight: 1.05 }}>Understand today’s label process and compare future concepts</h1>
            <p style={{ color: C.dim, fontSize: 16, lineHeight: 1.65, maxWidth: 780, margin: "16px 0 0" }}>Choose a focused view of the current process or compare three alternative concepts in the same interactive 3D packing world.</p>
          </div>
          <div className="landing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
            <button onClick={() => openExperience("current")} style={landingCard(C.blue)}>
              <div style={{ color: C.blue, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: 1.2 }}>01 · CURRENT STATE</div>
              <h2 style={{ margin: "14px 0 8px", fontSize: 23 }}>View Current Label Process</h2>
              <p style={{ color: C.dim, lineHeight: 1.55, margin: 0 }}>See today’s packing flow, where labels are printed immediately although the final number of packages is not yet known.</p>
              <div style={{ marginTop: "auto", paddingTop: 18, color: C.blue, fontWeight: 800 }}>Open current state →</div>
            </button>
            <button onClick={() => openExperience("theoretical")} style={landingCard(C.green)}>
              <div style={{ color: C.green, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: 1.2 }}>02 · THEORETICAL SCENARIOS</div>
              <h2 style={{ margin: "14px 0 8px", fontSize: 23 }}>Compare Future Label Concepts</h2>
              <p style={{ color: C.dim, lineHeight: 1.55, margin: 0 }}>Explore staging, interim-label loops and predictive ORTEC proposals as alternative future-state concepts.</p>
              <div style={{ marginTop: "auto", paddingTop: 18, color: C.green, fontWeight: 800 }}>Explore scenarios →</div>
            </button>

            <button onClick={openProcessGap} style={landingCard(C.yellow)}>
              <div style={{ color: C.yellow, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: 1.2 }}>03 · PROCESS GAP SIMULATION</div>
              <h2 style={{ margin: "14px 0 8px", fontSize: 23 }}>Same-Day & Same Shipping Point</h2>
              <p style={{ color: C.dim, lineHeight: 1.55, margin: 0 }}>Compare immediate delivery-note creation with the Smart Delivery Note Creation Job and visualize the avoided split shipment.</p>
              <div style={{ marginTop: "auto", paddingTop: 18, color: C.yellow, fontWeight: 800 }}>Open process simulation →</div>
            </button>
          </div>
          <div style={{ marginTop: 18, color: C.dim, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>Start with the focused packing view. Expand to the end-to-end supply chain only when the broader process context is needed.</div>
        </div>
        <style>{`@media (max-width: 820px) { .landing-grid { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    );
  }


  if (processGapOpen) {
    return <ProcessGapSimulation onHome={() => { setProcessGapOpen(false); setShowLanding(true); }} />;
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, color: C.text, fontFamily: "'Space Grotesk', system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        button:active { transform: translateY(1px); }
        button:hover { filter: brightness(1.08); }
        @media (max-width: 900px) {
          .desktop-side-panel { width: 220px !important; }
          .header-subtitle { display: none; }
        }
      `}</style>

      {/* Clean header */}
      <div style={{ minHeight: 66, padding: "10px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", gap: 12, alignItems: "center", background: C.panel }}>
        <div style={{ marginRight: "auto", minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.2 }}>Supply Chain Digital Twin</div>
          <div className="header-subtitle" style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
            Packing simulation · Expand the full chain when needed
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 116, padding: "7px 11px", border: `1px solid ${C.orange}`, borderRadius: 8, background: "rgba(255,140,66,0.09)", fontFamily: "'IBM Plex Mono', monospace", textAlign: "center" }}>
            <div style={{ color: C.dim, fontSize: 8, letterSpacing: 1.1 }}>SIMULATION TIME</div>
            <div style={{ color: C.text, fontSize: 18, fontWeight: 800, lineHeight: 1.15 }}>{hud.clock || "09:00"}</div>
          </div>
          <div style={{ padding: "6px 9px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.panel2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
            <span style={{ color: C.dim }}>SCENARIO </span>
            <span style={{ color: C.blue, fontWeight: 700 }}>S{scenario}</span>
            <span style={{ color: C.text }}> · {SCENARIOS[scenario].short}</span>
          </div>
          <button style={{ ...btn(false), borderColor: C.line, color: C.dim }} onClick={() => { doPause(); setShowLanding(true); }}>⌂ Home</button>
          <div style={{ padding: "6px 9px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.panel2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.dim }}>
            Select a dedicated start action in the right-hand panels
          </div>
        </div>
      </div>

      {/* 3D viewport */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />


        {/* Dynamic scenario objective */}
        <div style={{ position: "absolute", top: 12, left: 12, width: 318, maxWidth: "calc(100% - 300px)", background: "rgba(13,18,25,0.94)", border: `1px solid ${objective.accent}`, borderRadius: 11, padding: "11px 13px", boxShadow: "0 8px 20px rgba(0,0,0,0.20)" }}>
          <div style={{ color: objective.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 1.1, fontWeight: 800, marginBottom: 5 }}>{objective.eyebrow} · S{scenario}</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{objective.title}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.48, color: C.text }}>{objective.description}</div>
          <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${C.line}`, color: objective.accent, fontSize: 10.5, lineHeight: 1.4 }}>{objective.result}</div>
          <div style={{ marginTop: 7, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}>OBJECTIVE · Correct HU sequence on every label — e.g. 1/3, 2/3, 3/3 instead of 1/X.</div>
        </div>

                {/* Compact scenario and scope panel */}
        <div className="desktop-side-panel" style={{ position: "absolute", top: 12, right: 12, width: 260, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ background: "rgba(20,27,37,0.95)", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.22)" }}>
            <div style={{ padding: 9, borderBottom: `1px solid ${C.line}`, background: "rgba(61,220,132,0.06)", display: "grid", gap: 7 }}>
              <button
                onClick={guidedDemo ? stopGuidedDemo : startGuidedDemo}
                style={{ ...btn(false), width: "100%", borderColor: guidedDemo ? C.orange : C.yellow, color: guidedDemo ? C.orange : C.yellow, background: "rgba(255,209,102,0.08)", padding: "9px 12px" }}
              >
                {guidedDemo ? "■ Stop Guided Demo" : "▶ Start Guided Demo"}
              </button>
              <button
                onClick={() => { stopGuidedDemo(); startPacking(); }}
                style={{ ...btn(true), width: "100%", borderColor: C.green, background: C.green, color: C.bg, padding: "10px 12px" }}
              >
                ▶ Start Pack Simulation
              </button>
            </div>
            <div style={{ padding: "9px 11px", background: C.panel2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>LABEL PROCESS</div>
            <div style={{ padding: 9, borderBottom: `1px solid ${C.line}` }}>
              <div style={{ color: C.blue, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: 1.1, marginBottom: 7 }}>CURRENT STATE</div>
              <button onClick={() => changeScenario(1)} style={{ ...smallBtn(scenario === 1), width: "100%", textAlign: "left", padding: "9px 10px", display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: 8, alignItems: "center" }}>
                <span>S1</span><span style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>Label immediately {scenario === 1 && <b style={{ color: C.green, fontSize: 8 }}>ACTIVE</b>}</span>
              </button>
            </div>
            <div style={{ padding: 9 }}>
              <div style={{ color: C.green, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: 1.1, marginBottom: 7 }}>NEW LABEL PROCESS</div>
              <div style={{ display: "grid", gap: 6 }}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => changeScenario(n)} style={{ ...smallBtn(scenario === n), width: "100%", textAlign: "left", padding: "9px 10px", display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: 8, alignItems: "center" }}>
                    <span>S{n}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "flex", justifyContent: "space-between", gap: 6 }}>{SCENARIOS[n].short} {scenario === n && <b style={{ color: C.green, fontSize: 8 }}>ACTIVE</b>}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setDetailsOpen((v) => !v)} style={{ width: "100%", border: 0, borderTop: `1px solid ${C.line}`, background: "rgba(26,35,49,.82)", color: C.dim, padding: "8px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}>
              <span>SCENARIO DETAILS</span><span>{detailsOpen ? "−" : "+"}</span>
            </button>
            {detailsOpen && <div style={{ padding: "9px 10px", color: C.dim, fontSize: 10.5, lineHeight: 1.48, borderTop: `1px solid ${C.line}` }}>{scenarioDescriptions[scenario]}</div>}

          </div>

          <div style={{ background: "rgba(20,27,37,0.95)", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.18)" }}>
            <div style={{ padding: 9, borderBottom: `1px solid ${C.line}`, background: "rgba(77,163,255,0.06)" }}>
              <button
                onClick={startInbound}
                style={{ ...btn(false), width: "100%", borderColor: C.blue, color: C.blue, padding: "10px 12px", background: "rgba(77,163,255,0.10)" }}
              >
                ▶ Start Inbound Simulation
              </button>
            </div>
            <div style={{ padding: "9px 11px", background: C.panel2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>MODEL VIEW</div>
            <div style={{ padding: 8, display: "grid", gap: 6 }}>
              <button style={smallBtn(!scopeOpen && !showIn && showOut && !showLink && !showShipping)} onClick={showPackingOnly}>Packing Focus</button>
              <button style={smallBtn(!scopeOpen && showIn && showOut && showLink && showShipping)} onClick={showFullChain}>End-to-End</button>
              <button style={smallBtn(scopeOpen)} onClick={showCustomScope}>Custom View</button>
            </div>
            {scopeOpen && <div style={{ padding: "0 8px 9px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              <button style={smallBtn(showIn)} onClick={toggleIn}>{showIn ? "◉" : "○"} Inbound</button>
              <button style={smallBtn(showLink)} onClick={toggleLink}>{showLink ? "◉" : "○"} Picking</button>
              <button style={smallBtn(showOut)} onClick={toggleOut}>{showOut ? "◉" : "○"} Packing</button>
              <button style={smallBtn(showShipping)} onClick={toggleShipping}>{showShipping ? "◉" : "○"} Shipping</button>
            </div>}
          </div>
        </div>

        {/* Compact in-scene playback: resume or pause only; dedicated starts live in the right-hand panels */}
        <div style={{ position: "absolute", bottom: 58, right: 300, display: "flex", gap: 8, zIndex: 5 }}>
          <button onClick={playing ? doPause : doPlay} style={{ width: 50, height: 50, borderRadius: "50%", border: `2px solid ${playing ? C.orange : C.green}`, background: "rgba(20,27,37,0.95)", color: playing ? C.orange : C.green, fontSize: 18, cursor: "pointer" }} aria-label={playing ? "Pause" : "Continue"}>{playing ? "❚❚" : "▶"}</button>
          <button onClick={doReset} style={{ width: 40, height: 40, alignSelf: "flex-end", borderRadius: "50%", border: `2px solid ${C.line}`, background: "rgba(20,27,37,0.95)", color: C.dim, fontSize: 15, cursor: "pointer" }} aria-label="Reset">↺</button>
        </div>

        {hud.done && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,18,25,0.65)", padding: 16 }}>
            <div style={{ maxWidth: 460, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>SUPPLY CHAIN COMPLETE</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>End-to-end flow finished</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14, borderLeft: `3px solid ${C.green}`, paddingLeft: 10 }}>{data.keyMessage}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btn(true)} onClick={startInbound}>Replay from Inbound</button>
                <button style={btn(false)} onClick={startPacking}>Replay from Packing</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback controls and express next-day timeline */}
      <div style={{ padding: "7px 12px calc(8px + env(safe-area-inset-bottom))", borderTop: `1px solid ${C.line}`, background: C.panel, display: "grid", gridTemplateColumns: "minmax(290px, auto) auto auto minmax(300px, 1fr)", gap: 14, alignItems: "stretch", minHeight: 84 }}>
        <div style={{ minWidth: 0, padding: "8px 11px", border: `1px solid ${C.line}`, borderRadius: 10, background: "rgba(13,18,25,0.62)", boxShadow: "inset -1px 0 0 rgba(255,255,255,0.03)" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, letterSpacing: 1.2, color: C.blue, marginBottom: 6, fontWeight: 800 }}>CAMERA VIEWS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4 }}>
            {availableCameraViews.map((v) => (
              <button
                key={v}
                style={{ ...smallBtn(false), padding: "5px 6px", fontSize: 9, minWidth: 0, whiteSpace: "normal", lineHeight: 1.15 }}
                onClick={() => setView(v)}
              >
                {v === "Full Chain" ? "Overview" : v}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", paddingLeft: 14, borderLeft: `2px solid ${C.line}` }}>
          {playing ? <button style={btn(false)} onClick={doPause}>❚❚ Pause</button> : <button style={btn(false)} onClick={doPlay}>▶ Continue</button>}
          <button style={smallBtn(false)} onClick={doReset}>↺ Reset</button>
          <button style={smallBtn(false)} onClick={doStep}>⇥ Step</button>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {[0.5, 1, 2, 4].map((v) => <button key={v} style={smallBtn(speed === v)} onClick={() => setSpd(v)}>{v}x</button>)}
        </div>
        <div style={{ minWidth: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 5, fontSize: 9 }}>
            <span style={{ color: C.text, fontWeight: 800 }}>EXPRESS NEXT DAY DELIVERY · CRITICAL PROCESS TIMES</span>
            <span style={{ color: C.dim }}>Current time {hud.clock || "09:00"}</span>
          </div>
          <div style={{ position: "relative", height: 26, margin: "0 5px" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 12, height: 4, borderRadius: 4, background: C.line }} />
            <div style={{ position: "absolute", left: 0, width: `${dayProgress}%`, top: 12, height: 4, borderRadius: 4, background: C.green }} />
            <div style={{ position: "absolute", left: `${storageCutoffProgress}%`, top: 4, bottom: 0, width: 2, background: C.orange }} />
            <div style={{ position: "absolute", left: `${dayProgress}%`, top: 8, width: 12, height: 12, marginLeft: -6, borderRadius: "50%", background: C.text, border: `2px solid ${C.green}`, boxShadow: `0 0 8px ${C.green}` }} />
            <span style={{ position: "absolute", left: 0, top: 0, color: C.dim, fontSize: 8 }}>09:00</span>
            <span style={{ position: "absolute", left: `${storageCutoffProgress}%`, top: 0, transform: "translateX(-50%)", color: C.orange, fontSize: 8, fontWeight: 800 }}>STORAGE ≤ 14:00</span>
            <span style={{ position: "absolute", right: 0, top: 0, color: C.yellow, fontSize: 8, fontWeight: 800 }}>SHIPPING ≤ 18:00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: C.dim, fontSize: 8.5, lineHeight: 1.35 }}>
            <span>Goods must be available in storage by 14:00 to preserve sufficient picking and packing time.</span>
            <span style={{ textAlign: "right" }}>The outbound truck must be fully loaded by 18:00 · OTS — On-Time Shipping.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
