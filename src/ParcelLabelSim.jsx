import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

/* ============================================================
   Parcel Labelling Strategy Simulator — Order 4711
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
const TABLE = { x: -9, y: 1.18, z: 3 };
const MACHINE_X = 5;

function ride(t0, xFrom, xTo, speed = 2.5) {
  // helper: time to travel conveyor
  return t0 + Math.abs(xTo - xFrom) / speed;
}

function buildScenario(n) {
  const parcels = [];
  const messages = [];
  const scans = [];
  let duration = 25;
  let keyMessage = "";

  const packPath = (spawn, packEnd) => [[spawn, TABLE.x, TABLE.y, TABLE.z], [packEnd, TABLE.x, TABLE.y, TABLE.z]];
  const toConv = (tStart, tEnd) => [
    [tStart, TABLE.x, TABLE.y, TABLE.z],
    [tStart + (tEnd - tStart) * 0.5, -7.2, CONV_Y + 0.25, 1.4],
    [tEnd, -6, CONV_Y, 0],
  ];

  if (n === 1) {
    duration = 23.5;
    keyMessage = "Fast parcel flow, but the final parcel count is unknown during early label generation.";
    const defs = [
      { id: "P-4711-01", name: "Parcel 1", size: [0.75, 0.6, 0.75], spawn: 0, packEnd: 3, labelT: 3.2, seq: "1/X", move: 3.6 },
      { id: "P-4711-02", name: "Parcel 2", size: [0.95, 0.5, 0.8], spawn: 4, packEnd: 7, labelT: 7.3, seq: "2/X", move: 7.8 },
      { id: "P-4711-03", name: "Parcel 3", size: [1.25, 0.95, 0.9], spawn: 8.5, packEnd: 11.5, labelT: 11.8, seq: "3/X", move: 12.3 },
    ];
    defs.forEach((d, i) => {
      const tEnter = d.move + 1.5;
      const tExit = ride(tEnter, -6, 15);
      parcels.push({
        ...d,
        path: [...packPath(d.spawn, d.move), ...toConv(d.move, tEnter).slice(1), [tExit, 15, CONV_Y, 0]],
        labels: [[d.labelT, d.seq, C.orange, "count unknown"]],
        finalT: null, conveyor: [tEnter, tExit], loop: [], stagingIv: null,
      });
      messages.push([d.spawn, `Packing ${d.name}…`]);
      messages.push([d.labelT, `Label ${d.seq} printed — total parcel count still unknown`, "warn"]);
      messages.push([d.move, `${d.name} released to outbound conveyor immediately`, "ok"]);
    });
    messages.push([12.3, "Order 4711: all 3 parcels packed — count known only now", "ok"]);
    messages.push([13, "Completed parcels: 3 of 3", "ok"]);
  }

  if (n === 2) {
    duration = 28.5;
    keyMessage = "Correct final parcel numbering, but parcels wait in the packing area until the complete order is ready.";
    const slots = [
      { x: -6.2, z: 4.6 },
      { x: -4.5, z: 4.6 },
      { x: -2.8, z: 4.6 },
    ];
    const defs = [
      { id: "P-4711-01", name: "Parcel 1", size: [0.75, 0.6, 0.75], spawn: 0, packEnd: 3, stageIn: 4.4, finalT: 13, seq: "1/3", release: 16 },
      { id: "P-4711-02", name: "Parcel 2", size: [0.95, 0.5, 0.8], spawn: 4, packEnd: 7, stageIn: 8.4, finalT: 14, seq: "2/3", release: 16.8 },
      { id: "P-4711-03", name: "Parcel 3", size: [1.25, 0.95, 0.9], spawn: 8, packEnd: 11, stageIn: 12.4, finalT: 15, seq: "3/3", release: 17.6 },
    ];
    defs.forEach((d, i) => {
      const s = slots[i];
      const tEnter = d.release + 1.6;
      const tExit = ride(tEnter, -6, 15);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.spawn, d.packEnd + 0.2),
          [d.stageIn, s.x, 0.55 + d.size[1] / 2, s.z],
          [d.release, s.x, 0.55 + d.size[1] / 2, s.z],
          [d.release + 0.8, (s.x - 6) / 2, CONV_Y + 0.3, 2.2],
          [tEnter, -6, CONV_Y, 0],
          [tExit, 15, CONV_Y, 0],
        ],
        labels: [[d.finalT, d.seq, C.green, "final label"]],
        conveyor: [tEnter, tExit], loop: [], stagingIv: [d.stageIn, d.release],
      });
      messages.push([d.spawn, `Packing ${d.name}…`]);
      messages.push([d.stageIn, `${d.name} moved to Order Consolidation Area — no shipping label yet`, "warn"]);
    });
    messages.push([12.5, "Order complete: 3 of 3 parcels packed", "ok"]);
    messages.push([13, "Printing final labels 1/3 · 2/3 · 3/3", "ok"]);
    messages.push([16, "All parcels labelled — released together to outbound conveyor", "ok"]);
  }

  if (n === 3) {
    duration = 30;
    keyMessage = "Immediate parcel release with correct final numbering downstream, but incomplete orders require conveyor recirculation.";
    // loop geometry waypoints (x,z): machine(5,0) -> (6.5,0) -> (6.5,-4.2) -> (-1.5,-4.2) -> (-1.5,0) -> ride back to machine
    const loopFrom = (t0) => {
      const pts = [
        [t0, 5, CONV_Y, 0],
        [t0 + 0.6, 6.5, CONV_Y, 0],
        [t0 + 2.3, 6.5, CONV_Y, -4.2],
        [t0 + 5.5, -1.5, CONV_Y, -4.2],
        [t0 + 7.2, -1.5, CONV_Y, 0],
        [t0 + 9.8, 5, CONV_Y, 0],
      ];
      return pts;
    };
    const mk = (d) => {
      const tEnter = d.move + 1.5;
      const tArr = ride(tEnter, -6, MACHINE_X); // arrive machine
      return { ...d, tEnter, tArr };
    };
    const d1 = mk({ id: "P-4711-01", name: "Parcel 1", size: [0.75, 0.6, 0.75], spawn: 0, packEnd: 3, interimT: 3.2, move: 3.6 });
    const d2 = mk({ id: "P-4711-02", name: "Parcel 2", size: [0.95, 0.5, 0.8], spawn: 4, packEnd: 7, interimT: 7.2, move: 7.6 });
    const d3 = mk({ id: "P-4711-03", name: "Parcel 3", size: [1.25, 0.95, 0.9], spawn: 8, packEnd: 11, interimT: 11.2, move: 11.6 });

    // P3: arrives machine, order already complete (registered at interim of P3)
    // P1 & P2: one loop pass each
    const build = (d, seq, loops) => {
      let path = [...packPath(d.spawn, d.move), ...toConv(d.move, d.tEnter).slice(1), [d.tArr, MACHINE_X, CONV_Y, 0]];
      let t = d.tArr + 1.0; // scan dwell
      path.push([t, MACHINE_X, CONV_Y, 0]);
      const loopIv = [];
      for (let i = 0; i < loops; i++) {
        const lp = loopFrom(t);
        path = path.concat(lp.slice(1));
        loopIv.push([t, t + 9.8]);
        t += 9.8;
        path.push([t + 1.0, MACHINE_X, CONV_Y, 0]); // second scan dwell
        t += 1.0;
      }
      const finalT = t;
      const tExit = ride(t + 0.2, MACHINE_X, 15);
      path.push([tExit, 15, CONV_Y, 0]);
      const labels = [[d.interimT, "INTERIM", C.blue, d.id], [finalT, seq, C.green, "final label"]];
      return { ...d, path, labels, seq, finalT, conveyor: [d.tEnter, tExit], loop: loopIv, stagingIv: null };
    };
    const p1 = build(d1, "1/3", 1);
    const p2 = build(d2, "2/3", 1);
    const p3 = build(d3, "3/3", 0);
    parcels.push(p1, p2, p3);

    scans.push(d1.tArr, d2.tArr, d3.tArr, p1.finalT - 1.0, p2.finalT - 1.0);

    messages.push([0, "Packing Parcel 1…"]);
    messages.push([d1.interimT, "Interim label applied to Parcel 1 — final label pending", "info"]);
    messages.push([d1.tArr, "Scan: order status 1 of 3 registered → Parcel 1 redirected to loop", "warn"]);
    messages.push([d2.interimT, "Interim label applied to Parcel 2", "info"]);
    messages.push([d2.tArr, "Scan: order status 2 of 3 registered → Parcel 2 redirected to loop", "warn"]);
    messages.push([d3.interimT, "Order 4711 complete: 3 of 3 parcels registered", "ok"]);
    messages.push([d3.tArr, "Scan: order complete → final label 3/3 applied", "ok"]);
    messages.push([p1.finalT, "Parcel 1 returns from loop → final label 1/3 applied", "ok"]);
    messages.push([p2.finalT, "Parcel 2 returns from loop → final label 2/3 applied", "ok"]);
  }

  if (n === 4) {
    duration = 27;
    keyMessage = "Immediate correct labels when the packing proposal is right — but wrong parcels must be detected, diverted, and relabelled downstream.";
    const DEV_T = 9.0; // deviation detected while packing parcel 3
    // relabel spur geometry: divert at machine (5,0) -> (5,2.6) station -> (7,2.6) -> (7,0) rejoin
    const relabelDetour = (tArr) => {
      const tScan = tArr + 1.0;
      const pts = [
        [tScan, 5, CONV_Y, 0],
        [tScan + 1.4, 5, CONV_Y, 2.6],     // divert to station
        [tScan + 3.6, 5, CONV_Y, 2.6],     // relabel dwell
        [tScan + 4.6, 7, CONV_Y, 2.6],     // leave station
        [tScan + 5.8, 7, CONV_Y, 0],       // rejoin main line
      ];
      return { pts, relabelT: tScan + 2.8, rejoinT: tScan + 5.8 };
    };
    const mk = (d) => ({ ...d, tEnter: d.move + 1.5, tArr: ride(d.move + 1.5, -6, MACHINE_X) });
    const d1 = mk({ id: "P-4711-01", name: "Parcel 1", size: [0.75, 0.6, 0.75], spawn: 0, packEnd: 3, labelT: 3.2, move: 3.6 });
    const d2 = mk({ id: "P-4711-02", name: "Parcel 2", size: [0.95, 0.5, 0.8], spawn: 4, packEnd: 7, labelT: 7.2, move: 7.6 });
    const d3 = mk({ id: "P-4711-03", name: "Parcel 3", size: [1.1, 0.85, 0.85], spawn: 8, packEnd: 11, labelT: 11.2, move: 11.6 });
    const d4 = mk({ id: "P-4711-04", name: "Parcel 4", size: [0.85, 0.65, 0.8], spawn: 11.5, packEnd: 14, labelT: 14.2, move: 14.6 });

    // P1 & P2: proposal label x/3 -> flagged wrong at DEV_T -> diverted & relabelled x/4
    [d1, d2].forEach((d, i) => {
      const det = relabelDetour(d.tArr);
      const tExit = ride(det.rejoinT + 0.2, 7, 15);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.spawn, d.move), ...toConv(d.move, d.tEnter).slice(1),
          [d.tArr, MACHINE_X, CONV_Y, 0],
          ...det.pts,
          [tExit, 15, CONV_Y, 0],
        ],
        labels: [
          [d.labelT, `${i + 1}/3`, C.green, "proposal-based"],
          [DEV_T, `${i + 1}/3`, C.red, "label incorrect", true],
          [det.relabelT, `${i + 1}/4`, C.green, "relabelled"],
        ],
        seq: `${i + 1}/4`, finalT: det.relabelT,
        conveyor: [d.tEnter, tExit], loop: [], stagingIv: null,
        relabelIv: [det.pts[0][0], det.rejoinT],
      });
      messages.push([d.spawn, `Packing ${d.name}…`]);
      messages.push([d.labelT, `Final label ${i + 1}/3 applied per packing proposal — released immediately`, "ok"]);
      messages.push([d.tArr, `Verify scan: ${d.name} label ${i + 1}/3 ≠ actual count 4 → diverted to relabeling`, "err"]);
      messages.push([det.relabelT, `${d.name} relabelled ${i + 1}/4 — returning to main line`, "ok"]);
    });

    // P3 & P4: labelled correctly x/4 after deviation known, pass machine directly
    [d3, d4].forEach((d, i) => {
      const tPass = d.tArr + 1.0;
      const tExit = ride(tPass, MACHINE_X, 15);
      parcels.push({
        ...d,
        path: [
          ...packPath(d.spawn, d.move), ...toConv(d.move, d.tEnter).slice(1),
          [d.tArr, MACHINE_X, CONV_Y, 0],
          [tPass, MACHINE_X, CONV_Y, 0],
          [tExit, 15, CONV_Y, 0],
        ],
        labels: [[d.labelT, `${i + 3}/4`, C.green, "corrected count"]],
        seq: `${i + 3}/4`, finalT: d.labelT,
        conveyor: [d.tEnter, tExit], loop: [], stagingIv: null, relabelIv: null,
      });
    });
    messages.push([0, "Packing proposal from master data: predicted 3 parcels for order 4711", "info"]);
    messages.push([8, "Packing Parcel 3…"]);
    messages.push([DEV_T, "Deviation: contents exceed proposal → order split, actual count = 4 parcels", "err"]);
    messages.push([d3.labelT, "Parcel 3 labelled 3/4 with corrected count", "ok"]);
    messages.push([d4.labelT, "Parcel 4 labelled 4/4 — order 4711 fully packed (4 of 4)", "ok"]);
    messages.push([d3.tArr, "Verify scan: Parcel 3 label matches → passes without detour", "ok"]);
    messages.push([d4.tArr + 0.3, "Verify scan: Parcel 4 label matches → passes without detour", "ok"]);
    scans.push(d1.tArr, d2.tArr, d3.tArr, d4.tArr);
  }

  messages.sort((a, b) => a[0] - b[0]);
  return { n, duration, parcels, messages, scans, keyMessage };
}

const SCENARIOS = {
  1: { title: "Immediate Final Label", short: "S1" },
  2: { title: "Consolidated Labelling", short: "S2" },
  3: { title: "Interim Label + Auto Relabelling", short: "S3" },
  4: { title: "Predictive Proposal Labels", short: "S4" },
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
  g.font = "bold 44px 'IBM Plex Mono', monospace";
  g.textAlign = "center";
  g.fillText(main, 128, 58);
  g.fillStyle = "#c7d2e0";
  g.font = "22px 'IBM Plex Mono', monospace";
  g.fillText(sub || "", 128, 96);
  const tx = new THREE.CanvasTexture(cv);
  return tx;
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
    scene.fog = new THREE.Fog(C.bg, 40, 80);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    const cam = { theta: -0.9, phi: 1.05, radius: 26, target: new THREE.Vector3(2, 0.5, 0) };
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
    key.shadow.camera.left = -25; key.shadow.camera.right = 25;
    key.shadow.camera.top = 25; key.shadow.camera.bottom = -25;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 50),
      new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(70, 70, 0x2a3648, 0x222d3c);
    grid.position.y = 0.01;
    scene.add(grid);

    // ---------- static props ----------
    const props = new THREE.Group();
    scene.add(props);

    const mat = (c, r = 0.7, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

    // packing table
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 2.2), mat(0x3a4657, 0.5, 0.3));
    top.position.set(TABLE.x, 1.0, TABLE.z); top.castShadow = true;
    table.add(top);
    [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), mat(0x2a3441, 0.4, 0.5));
      leg.position.set(TABLE.x + dx, 0.5, TABLE.z + dz);
      table.add(leg);
    });
    props.add(table);

    // packer (simple figure)
    const packer = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 12), mat(0x2f6fb0, 0.8));
    body.position.y = 1.15; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat(0xd9a679, 0.9));
    head.position.y = 1.85;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd166, 0.6));
    helmet.position.y = 1.9;
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.7, 10), mat(0x22303f, 0.9));
    legs.position.y = 0.45;
    packer.add(body, head, helmet, legs);
    packer.position.set(TABLE.x, 0, TABLE.z + 1.7);
    props.add(packer);

    // label printer at station
    const printer = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.7), mat(0x222b38, 0.5, 0.4));
    pBody.position.set(TABLE.x - 1.9, 1.35, TABLE.z - 0.4); pBody.castShadow = true;
    const pSlot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.1), mat(0x0d1219, 0.4));
    pSlot.position.set(TABLE.x - 1.9, 1.42, TABLE.z - 0.02);
    const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: C.green }));
    pLight.position.set(TABLE.x - 1.62, 1.55, TABLE.z - 0.06);
    printer.add(pBody, pSlot, pLight);
    props.add(printer);
    // printer paper strip (animates on label print)
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    paper.position.set(TABLE.x - 1.9, 1.3, TABLE.z + 0.02);
    paper.rotation.x = -0.4;
    paper.visible = false;
    props.add(paper);

    // main conveyor
    const convGroup = new THREE.Group();
    const beltLen = 21.5;
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
    belt.position.set(-6 + beltLen / 2, 0.62, 0);
    belt.receiveShadow = true; belt.castShadow = true;
    convGroup.add(belt);
    // conveyor frame + legs
    for (let x = -5.5; x <= 15; x += 2.5) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.1), mat(0x232c38, 0.5, 0.4));
      leg.position.set(x, 0.3, 0);
      convGroup.add(leg);
    }
    // side rails
    [-0.72, 0.72].forEach((dz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.08, 0.06), mat(0x4c5a6b, 0.4, 0.5));
      rail.position.set(-6 + beltLen / 2, 0.86, dz);
      convGroup.add(rail);
    });
    props.add(convGroup);

    // green flow arrows on main conveyor
    const arrowMat = new THREE.MeshBasicMaterial({ color: C.green });
    const arrows = [];
    for (let i = 0; i < 7; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 4), arrowMat);
      a.rotation.z = -Math.PI / 2;
      a.rotation.y = Math.PI / 4;
      a.position.set(-5 + i * 3, 0.95, 0);
      convGroup.add(a);
      arrows.push(a);
    }

    // exit portal
    const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 2.2), mat(0x26313f, 0.6));
    exitFrame.position.set(15.2, 1.2, 0);
    props.add(exitFrame);
    const exitSign = makeTextPlane("OUTBOUND", C.green, 2.4, 0.5);
    exitSign.position.set(15.2, 2.7, 0);
    exitSign.rotation.y = -Math.PI / 2;
    props.add(exitSign);

    // staging area (scenario 2)
    const staging = new THREE.Group();
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.12 }));
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(-4.5, 0.02, 4.6);
    staging.add(zone);
    const zoneBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(5.6, 2.6)),
      new THREE.LineBasicMaterial({ color: 0xffd166 })
    );
    zoneBorder.rotation.x = -Math.PI / 2;
    zoneBorder.position.set(-4.5, 0.03, 4.6);
    staging.add(zoneBorder);
    [-6.2, -4.5, -2.8].forEach((x) => {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 1.3), mat(0x8a6a3d, 0.9));
      pallet.position.set(x, 0.45, 4.6);
      pallet.castShadow = true;
      const palletLegs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.1), mat(0x6f5531, 0.95));
      palletLegs.position.set(x, 0.2, 4.6);
      staging.add(pallet, palletLegs);
    });
    const stagingSign = makeTextPlane("ORDER CONSOLIDATION AREA", C.yellow, 5.4, 0.55);
    stagingSign.position.set(-4.5, 2.2, 5.9);
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
    const loopSegs = [
      [6.5, 0, 6.5, -4.2],
      [6.5, -4.2, -1.5, -4.2],
      [-1.5, -4.2, -1.5, 0],
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
    conn.position.set(5.6, 0.62, 0);
    loopGroup.add(conn);
    // orange loop arrows
    const loopArrows = [];
    const loopPath = [[6.5, 0], [6.5, -4.2], [-1.5, -4.2], [-1.5, 0]];
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
    loopSign.position.set(2.5, 1.8, -4.9);
    loopGroup.add(loopSign);
    props.add(loopGroup);

    // relabeling station (scenario 4) — side spur off the machine
    const relabelGroup = new THREE.Group();
    const spurMat = new THREE.MeshStandardMaterial({ color: 0x4a2f33, roughness: 0.9 });
    const spur1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 3.0), spurMat);
    spur1.position.set(5, 0.62, 1.6); spur1.castShadow = true;
    const spur2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.1), spurMat);
    spur2.position.set(6, 0.62, 2.6); spur2.castShadow = true;
    const spur3 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 3.0), spurMat);
    spur3.position.set(7, 0.62, 1.6); spur3.castShadow = true;
    relabelGroup.add(spur1, spur2, spur3);
    // relabel unit over the spur
    const rMat = mat(0x7a3340, 0.45, 0.5);
    const rPillarA = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.5), rMat);
    rPillarA.position.set(4.2, 1.1, 2.6);
    const rPillarB = rPillarA.clone(); rPillarB.position.x = 5.8;
    const rBridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.4), rMat);
    rBridge.position.set(5, 2.1, 2.6); rBridge.castShadow = true;
    relabelGroup.add(rPillarA, rPillarB, rBridge);
    const rLight = new THREE.Mesh(new THREE.SphereGeometry(0.09), new THREE.MeshBasicMaterial({ color: C.red }));
    rLight.position.set(5, 2.6, 2.6);
    relabelGroup.add(rLight);
    // red divert arrows
    [[5, 0.6], [5, 1.6], [6.1, 2.6], [7, 1.6], [7, 0.6]].forEach(([ax, az], i) => {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 4), new THREE.MeshBasicMaterial({ color: C.red }));
      a.position.set(ax, 0.95, az);
      a.rotation.x = Math.PI / 2;
      if (i === 2) { a.rotation.x = 0; a.rotation.z = -Math.PI / 2; }
      if (i > 2) a.rotation.z = Math.PI;
      relabelGroup.add(a);
    });
    const relabelSign = makeTextPlane("RELABELING STATION", C.red, 4.2, 0.5);
    relabelSign.position.set(6, 3.1, 3.4);
    relabelGroup.add(relabelSign);
    props.add(relabelGroup);

    // order banner
    const orderSign = makeTextPlane("CUSTOMER ORDER 4711 — 3 PARCELS", "#e8edf4", 7.5, 0.7);
    orderSign.position.set(TABLE.x + 1, 3.4, TABLE.z);
    props.add(orderSign);

    // ---------- parcels ----------
    const parcelMeshes = [];
    function buildParcels(data) {
      parcelMeshes.forEach((p) => scene.remove(p.group));
      parcelMeshes.length = 0;
      data.parcels.forEach((pd, i) => {
        const group = new THREE.Group();
        const boxMat = new THREE.MeshStandardMaterial({ color: C.cardboard, roughness: 0.85 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(...pd.size), boxMat);
        box.castShadow = true;
        // tape stripe
        const tape = new THREE.Mesh(new THREE.BoxGeometry(pd.size[0] * 1.02, pd.size[1] * 1.02, pd.size[2] * 0.14), mat(0xa87a42, 0.8));
        group.add(box, tape);
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
      g.fillText(`ORDER  4711`, 24, 92);
      g.fillText(`PARCEL ${state.parcel || "—"}`, 24, 128);
      if (state.mode === "verify") {
        g.fillText(`PLAN ${state.plan}  ACT ${state.act}`, 24, 164);
        g.fillStyle = state.mismatch ? C.red : C.green;
        g.fillText(state.mismatch ? "MISMATCH → DIVERT" : "LABELS CONSISTENT", 24, 204);
      } else {
        g.fillText(`REG    ${state.reg} / 3`, 24, 164);
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

      // packer bob when packing
      const anyPacking = data.parcels.some((p) => t >= p.spawn && t < p.packEnd);
      packer.position.y = anyPacking ? Math.abs(Math.sin(now * 0.008)) * 0.08 : 0;

      // printer paper flash
      const labelSoon = data.parcels.some((p) => p.labels.some((L) => !L[4] && L[0] <= p.move + 0.6 && Math.abs(t - L[0]) < 0.5)) && data.n !== 3;
      const interimSoon = data.n === 3 && data.parcels.some((p) => Math.abs(t - p.labels[0][0]) < 0.5);
      paper.visible = labelSoon || interimSoon;
      pLight.material.color.set(paper.visible ? C.orange : C.green);

      // scanner beam pulse
      let beamOn = false;
      if (data.n === 3 || data.n === 4) {
        beamOn = data.scans.some((st) => t >= st && t <= st + 1.0);
        beam.material.opacity = beamOn ? 0.35 + 0.25 * Math.sin(now * 0.02) : 0;
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
          let reg = 0;
          data.parcels.forEach((p) => { if (t >= p.labels[0][0]) reg++; });
          drawMachineDisplay({ parcel: current, reg, complete: reg >= 3, scans: scansN });
        } else {
          const devKnown = t >= 9.0;
          const act = devKnown ? 4 : 3;
          const mismatch = !!(currentP && currentP.relabelIv && t < currentP.relabelIv[1]);
          drawMachineDisplay({ mode: "verify", parcel: current, plan: 3, act, mismatch, scans: scansN });
        }
      }

      // parcels
      let packed = 0, labelled = 0, waiting = 0, onConv = 0, inLoop = 0, scansN = 0, handling = 0;
      let waitSum = 0, waitCount = 0;
      data.parcels.forEach((pd, i) => {
        const pm = parcelMeshes[i];
        if (!pm) return;
        const visible = t >= pd.spawn;
        pm.group.visible = visible;
        if (!visible) return;
        const [, x, y, z] = posAt(pd.path, t);
        pm.group.position.set(x, y, z);
        // pack scale-in
        if (t < pd.packEnd) {
          const f = Math.min(1, (t - pd.spawn) / Math.max(0.1, pd.packEnd - pd.spawn));
          pm.group.scale.setScalar(0.25 + 0.75 * f);
        } else pm.group.scale.setScalar(1);

        // label state
        let li = -1;
        pd.labels.forEach(([lt], k) => { if (t >= lt) li = k; });
        if (li !== pm.appliedLabel) {
          pm.appliedLabel = li;
          if (li >= 0) {
            const [, txt, col, sub] = pd.labels[li];
            pm.spr.material.map = makeLabelTexture(txt === "INTERIM" ? "INTERIM" : `4711 · ${txt}`, txt === "INTERIM" ? "final label pending" : sub, col);
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

        // stats
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
          waitCount = 3;
        }
        if (data.n === 4) {
          if (pd.relabelIv && t >= pd.relabelIv[0]) waitSum += Math.min(t, pd.relabelIv[1]) - pd.relabelIv[0];
          waitCount = 4;
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
    S.t = next !== undefined ? next : S.data.duration;
    S.playing = false;
  };
  const setSpd = (v) => { simRef.current.speed = v; setSpeed(v); };
  const setView = (name) => {
    const { cam, applyCam } = world.current;
    const views = {
      Overview: { target: [2, 0.5, 0], theta: -0.9, phi: 1.05, radius: 26 },
      "Packing Station": { target: [-8.5, 1, 2.5], theta: -0.6, phi: 1.0, radius: 10 },
      "Staging Area": { target: [-4.5, 0.6, 4.6], theta: -0.4, phi: 0.95, radius: 9 },
      "Label Machine": { target: [5, 1.5, 0], theta: -1.2, phi: 1.0, radius: 9 },
      "Conveyor Loop": { target: [2.5, 0.5, -2], theta: -2.2, phi: 0.9, radius: 14 },
      "Relabeling Station": { target: [6, 1.2, 1.8], theta: -0.5, phi: 0.95, radius: 10 },
    };
    const v = views[name];
    cam.target.set(...v.target);
    cam.theta = v.theta; cam.phi = v.phi; cam.radius = v.radius;
    applyCam();
  };

  const data = simRef.current.data;
  const nParcels = data.parcels.length;
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
    ["Depends on master-data quality", "No", "No", "No", "Yes — critical"],
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
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.text, fontFamily: "'Space Grotesk', system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; } button:active { transform: translateY(1px); }`}</style>

      {/* Header */}
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ marginRight: "auto" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>Multi-Parcel Order Labelling — Simulator</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>Order 4711 · 3 parcels · packing area only</div>
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

        {/* camera presets */}
        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {["Overview", "Packing Station", scenario === 2 ? "Staging Area" : null, scenario === 3 || scenario === 4 ? "Label Machine" : null, scenario === 3 ? "Conveyor Loop" : null, scenario === 4 ? "Relabeling Station" : null]
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
              {stat("Order", "4711")}
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
                      {["Criterion", "S1 Immediate", "S2 Consolidated", "S3 Interim + Auto", "S4 Predictive"].map((h, i) => (
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
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", background: C.panel }}>
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
