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

function ProcessGapSimulation({ onHome }) {
  const [scenario, setScenario] = useState("old");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 0.45 * speed);
        if (next >= 100) setPlaying(false);
        return next;
      });
    }, 45);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  const reset = () => {
    setPlaying(false);
    setProgress(0);
  };

  const switchScenario = (next) => {
    setScenario(next);
    setPlaying(false);
    setProgress(0);
  };

  const phase = progress < 18 ? 0 : progress < 48 ? 1 : progress < 72 ? 2 : progress < 90 ? 3 : 4;
  const minutes = Math.round(600 + (progress / 100) * 165);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const old = scenario === "old";

  const stages = old
    ? [
        { title: "10:00 · Order created", text: "One customer order with two positions.", tone: C.blue },
        { title: "10:05 · DN 1 created", text: "Position 1 is already on stock, so the first delivery note is created immediately.", tone: C.red },
        { title: "10:45 · Parcel 1 shipped", text: "Item A leaves in its own parcel.", tone: C.red },
        { title: "12:00 · Position 2 available", text: "Item B completes inbound put-away and triggers DN 2.", tone: C.orange },
        { title: "12:40 · Parcel 2 shipped", text: "A second parcel leaves separately. Result: two transport charges.", tone: C.red },
      ]
    : [
        { title: "10:00 · Order created", text: "One customer order with two positions.", tone: C.blue },
        { title: "10:05 · Creation job waits", text: "No delivery note is created while position 2 is still in inbound.", tone: C.yellow },
        { title: "10:05–12:00 · Position 1 reserved", text: "Item A remains available for consolidation at the same shipping point.", tone: C.green },
        { title: "12:00 · Both positions available", text: "The job creates one combined delivery note.", tone: C.green },
        { title: "12:40 · One parcel shipped", text: "Both items fit into one parcel. Result: one transport charge.", tone: C.green },
      ];

  const itemAStage = old ? (progress < 20 ? "storage" : progress < 38 ? "packing" : "shipping") : progress < 72 ? "storage" : progress < 88 ? "packing" : "shipping";
  const itemBStage = progress < 48 ? "inbound" : progress < 72 ? "storage" : progress < 88 ? "packing" : "shipping";
  const parcelCount = old ? (progress < 38 ? 0 : progress < 82 ? 1 : 2) : progress < 88 ? 0 : 1;
  const dnCount = old ? (progress < 18 ? 0 : progress < 72 ? 1 : 2) : progress < 72 ? 0 : 1;

  const card = (accent, active = false) => ({
    border: `1px solid ${active ? accent : C.line}`,
    background: active ? `${accent}12` : C.panel2,
    borderRadius: 12,
    padding: 12,
  });

  const areaStyle = (accent) => ({
    border: `1px solid ${accent}88`,
    background: `${accent}0d`,
    borderRadius: 14,
    minHeight: 122,
    padding: 12,
    position: "relative",
    overflow: "hidden",
  });

  const flowItem = (label, accent, visible = true) => ({
    opacity: visible ? 1 : 0.16,
    border: `1px solid ${accent}`,
    background: `${accent}20`,
    color: accent,
    borderRadius: 8,
    padding: "7px 9px",
    fontSize: 12,
    fontWeight: 800,
    transition: "all .35s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Space Grotesk', system-ui, sans-serif", padding: 16, overflowY: "auto" }}>
      <style>{`
        * { box-sizing: border-box; }
        .pg-grid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:14px; }
        .pg-flow { display:grid; grid-template-columns:repeat(5,minmax(130px,1fr)); gap:10px; align-items:stretch; }
        .pg-arrow { display:flex; align-items:center; justify-content:center; color:${C.dim}; font-size:22px; }
        @media(max-width:1050px){ .pg-grid{grid-template-columns:1fr;} }
        @media(max-width:820px){ .pg-flow{grid-template-columns:1fr;} .pg-arrow{transform:rotate(90deg); min-height:22px;} }
      `}</style>

      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ color: C.yellow, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 800, letterSpacing: 1.2 }}>PROCESS GAP SIMULATION</div>
            <h1 style={{ margin: "5px 0 4px", fontSize: "clamp(25px,4vw,38px)" }}>Same-Day & Same Shipping Point</h1>
            <div style={{ color: C.dim, maxWidth: 900 }}>One customer order with two positions: one item is already on stock, while the second item becomes available after inbound put-away.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ ...card(C.orange, true), minWidth: 116, textAlign: "center" }}>
              <div style={{ color: C.dim, fontSize: 9, letterSpacing: 1 }}>SIMULATION TIME</div>
              <div style={{ fontSize: 21, fontWeight: 800 }}>{clock}</div>
            </div>
            <button onClick={onHome} style={{ border: `1px solid ${C.line}`, background: C.panel2, color: C.text, borderRadius: 10, padding: "10px 13px", cursor: "pointer", fontWeight: 700 }}>← Home</button>
          </div>
        </header>

        <div className="pg-grid">
          <main style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <section style={{ ...card(old ? C.red : C.green, true), padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ color: old ? C.red : C.green, fontSize: 11, fontWeight: 800, letterSpacing: 1.1 }}>{old ? "OLD WORLD" : "SMART DELIVERY NOTE CREATION JOB"}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{old ? "Immediate creation causes a split shipment" : "Controlled creation consolidates both positions"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => switchScenario("old")} style={{ border: `1px solid ${scenario === "old" ? C.red : C.line}`, background: scenario === "old" ? `${C.red}18` : C.panel, color: scenario === "old" ? C.red : C.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", fontWeight: 800 }}>Old World</button>
                  <button onClick={() => switchScenario("smart")} style={{ border: `1px solid ${scenario === "smart" ? C.green : C.line}`, background: scenario === "smart" ? `${C.green}18` : C.panel, color: scenario === "smart" ? C.green : C.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", fontWeight: 800 }}>Smart Job</button>
                </div>
              </div>
            </section>

            <section style={{ ...card(C.blue), padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>Customer Order 4711</div>
                  <div style={{ color: C.dim, fontSize: 13 }}>Created at 10:00 · Same shipping point · Both articles fit into one parcel</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={flowItem("", C.green)}>Position 10 · Item A · On stock</span>
                  <span style={flowItem("", C.orange)}>Position 20 · Item B · Inbound</span>
                </div>
              </div>

              <div className="pg-flow">
                <div style={areaStyle(C.blue)}>
                  <div style={{ color: C.blue, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>CUSTOMER ORDER</div>
                  <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                    <div style={flowItem("", C.green)}>Item A</div>
                    <div style={flowItem("", C.orange)}>Item B</div>
                  </div>
                </div>
                <div className="pg-arrow">→</div>
                <div style={areaStyle(C.orange)}>
                  <div style={{ color: C.orange, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>INBOUND / STORAGE</div>
                  <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                    <div style={flowItem("", C.green, itemAStage === "storage")}>Item A · stored</div>
                    <div style={flowItem("", C.orange, itemBStage === "inbound")}>Item B · put-away</div>
                    <div style={flowItem("", C.orange, itemBStage === "storage")}>Item B · stored</div>
                  </div>
                </div>
                <div className="pg-arrow">→</div>
                <div style={areaStyle(C.yellow)}>
                  <div style={{ color: C.yellow, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>DELIVERY NOTE CREATION</div>
                  <div style={{ marginTop: 17, fontSize: 34, fontWeight: 900 }}>{dnCount}</div>
                  <div style={{ color: C.dim, fontSize: 12 }}>{dnCount === 1 ? "delivery note" : "delivery notes"}</div>
                  {!old && progress < 72 && <div style={{ marginTop: 8, color: C.yellow, fontSize: 11, fontWeight: 700 }}>Job waits for both positions</div>}
                </div>
                <div className="pg-arrow">→</div>
                <div style={areaStyle(C.green)}>
                  <div style={{ color: C.green, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>PACKING & SHIPPING</div>
                  <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                    <div style={flowItem("", C.purple, parcelCount >= 1)}>Parcel {old ? "1" : "1 combined"}</div>
                    {old && <div style={flowItem("", C.red, parcelCount >= 2)}>Parcel 2</div>}
                  </div>
                </div>
              </div>
            </section>

            <section style={{ ...card(C.line), padding: 14 }}>
              <div style={{ height: 8, borderRadius: 999, background: C.panel2, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${progress}%`, background: old ? C.red : C.green, transition: "width .08s linear" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
                {stages.map((s, i) => (
                  <div key={s.title} style={{ ...card(s.tone, i <= phase), minHeight: 112 }}>
                    <div style={{ color: i <= phase ? s.tone : C.dim, fontSize: 11, fontWeight: 800 }}>{s.title}</div>
                    <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.45, marginTop: 7 }}>{s.text}</div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <section style={{ ...card(C.line), padding: 14 }}>
              <div style={{ color: C.dim, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>CONTROLS</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setPlaying((v) => !v)} style={{ border: `1px solid ${playing ? C.orange : C.green}`, background: playing ? `${C.orange}18` : `${C.green}18`, color: playing ? C.orange : C.green, borderRadius: 9, padding: "10px 13px", cursor: "pointer", fontWeight: 800, flex: 1 }}>{playing ? "Pause" : progress >= 100 ? "Replay" : "Start"}</button>
                <button onClick={reset} style={{ border: `1px solid ${C.line}`, background: C.panel2, color: C.text, borderRadius: 9, padding: "10px 13px", cursor: "pointer", fontWeight: 700 }}>Reset</button>
              </div>
              <label style={{ color: C.dim, fontSize: 12, display: "grid", gap: 6 }}>
                Simulation speed
                <input type="range" min="0.6" max="2" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              </label>
            </section>

            <section style={{ ...card(old ? C.red : C.green, true), padding: 14 }}>
              <div style={{ color: C.dim, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>BUSINESS IMPACT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Delivery notes", old ? 2 : 1],
                  ["Parcels", old ? 2 : 1],
                  ["Transport cost", old ? "2×" : "1×"],
                  ["Consolidation", old ? "No" : "Yes"],
                ].map(([l, v]) => <div key={l} style={card(C.line)}><div style={{ color: C.dim, fontSize: 10 }}>{l}</div><div style={{ fontSize: 23, fontWeight: 900, marginTop: 5 }}>{v}</div></div>)}
              </div>
            </section>

            <section style={{ ...card(C.line), padding: 14 }}>
              <div style={{ color: C.dim, fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>CORE MESSAGE</div>
              <div style={{ color: old ? C.red : C.green, fontWeight: 800, fontSize: 17, marginBottom: 8 }}>{old ? "Early creation splits the customer order." : "Delayed creation preserves consolidation."}</div>
              <div style={{ color: C.dim, lineHeight: 1.55, fontSize: 13 }}>{old ? "The first available position triggers a delivery note before the second position completes put-away. The result is two parcels and two transport charges." : "The creation job waits until both positions are physically available at the same shipping point. One delivery note and one parcel are created."}</div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

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
