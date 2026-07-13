import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const C = {
  bg: "#0d1219",
  panel: "#141b25",
  panel2: "#1a2331",
  line: "#26313f",
  text: "#e8edf4",
  dim: "#8fa0b5",
  green: "#3ddc84",
  yellow: "#ffd166",
  blue: "#00c8ff",
  magenta: "#e44cff",
  cardboard: 0xc9975b,
};

const STATIONS = [
  { id: "1P", x: -9, z: 2.8, capacity: 1, color: C.blue },
  { id: "2P", x: -3, z: 2.8, capacity: 2, color: C.yellow },
  { id: "3P", x: 3, z: 2.8, capacity: 3, color: C.magenta },
];

const ORDERS = [
  { id: "A", packages: 1, station: 0, color: C.blue },
  { id: "B", packages: 2, station: 1, color: C.yellow },
  { id: "C", packages: 3, station: 2, color: C.magenta },
];

const INFEED_Z = 7.2;
const BRANCH_END_Z = 4.2;
const SOURCE_X = 7;
const OUTBOUND_Z = 0;
const OUTBOUND_END_X = 20;

function textPlane(text, color, width = 4, height = 0.5) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = Math.round((768 * height) / width);
  const g = canvas.getContext("2d");

  g.fillStyle = "rgba(13,18,25,0.92)";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  g.fillStyle = color;
  g.font = `bold ${Math.round(canvas.height * 0.42)}px sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, canvas.width / 2, canvas.height / 2);

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
}

function labelTexture(order) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext("2d");

  g.fillStyle = "#101722";
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = order.color;
  g.lineWidth = 8;
  g.strokeRect(4, 4, 248, 120);
  g.fillStyle = order.color;
  g.font = "bold 30px monospace";
  g.textAlign = "center";
  g.fillText(`ORDER ${order.id}`, 128, 48);
  g.fillStyle = "#e8edf4";
  g.font = "bold 22px monospace";
  g.fillText(`${order.packages} PACKAGE${order.packages > 1 ? "S" : ""}`, 128, 84);
  g.font = "16px monospace";
  g.fillText(`ORTEC → ${order.packages}P STATION`, 128, 111);

  return new THREE.CanvasTexture(canvas);
}

export default function ParcelLabelSim() {
  const mountRef = useRef(null);
  const runtime = useRef({ playing: false, t: 0, speed: 1 });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 40, 90);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      150
    );
    camera.position.set(18, 17, 24);
    camera.lookAt(-1, 1, 3);

    scene.add(new THREE.AmbientLight(0x8899bb, 0.65));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 18, 10);
    light.castShadow = true;
    scene.add(light);

    const mat = (color, roughness = 0.75, metalness = 0.1) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 35),
      mat(0x1b2330, 0.95)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 60, 0x2a3648, 0x222d3c);
    grid.position.y = 0.01;
    scene.add(grid);

    const makeBelt = (length, width = 1.1) => {
      const belt = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.14, width),
        mat(0x36424f, 0.9)
      );
      belt.castShadow = true;
      belt.receiveShadow = true;
      return belt;
    };

    // ORTEC infeed spine
    const spineLength = SOURCE_X - STATIONS[0].x + 2;
    const spine = makeBelt(spineLength);
    spine.position.set((SOURCE_X + STATIONS[0].x) / 2, 0.65, INFEED_Z);
    scene.add(spine);

    const source = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.7, 2),
      mat(0x2b3a4d, 0.6, 0.3)
    );
    source.position.set(SOURCE_X + 0.8, 0.9, INFEED_Z);
    source.castShadow = true;
    scene.add(source);

    const sourceLabel = textPlane("ORTEC ORDER RELEASE", C.blue, 4.2, 0.52);
    sourceLabel.position.set(SOURCE_X + 0.8, 2.2, INFEED_Z + 1);
    scene.add(sourceLabel);

    const routingLabel = textPlane(
      "ROUTING BY ORTEC PACKING PROPOSAL",
      C.blue,
      7.4,
      0.58
    );
    routingLabel.position.set(-1.5, 2.7, INFEED_Z + 0.95);
    scene.add(routingLabel);

    // Outbound belt
    const outbound = makeBelt(34, 1.35);
    outbound.position.set(3, 0.65, OUTBOUND_Z);
    scene.add(outbound);

    const outboundLabel = textPlane("OUTBOUND", C.green, 2.8, 0.5);
    outboundLabel.position.set(OUTBOUND_END_X, 2.1, 0);
    outboundLabel.rotation.y = -Math.PI / 2;
    scene.add(outboundLabel);

    // Station setup + one branch each
    STATIONS.forEach((station) => {
      const branchLength = INFEED_Z - BRANCH_END_Z;
      const branch = makeBelt(branchLength + 0.2);
      branch.rotation.y = Math.PI / 2;
      branch.position.set(
        station.x,
        0.65,
        (INFEED_Z + BRANCH_END_Z) / 2
      );
      scene.add(branch);

      const table = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.18, 2),
        mat(0x3a4657, 0.5, 0.3)
      );
      table.position.set(station.x, 1.05, station.z);
      table.castShadow = true;
      scene.add(table);

      [[-0.95, -0.78], [0.95, -0.78], [-0.95, 0.78], [0.95, 0.78]].forEach(
        ([dx, dz]) => {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 1, 0.12),
            mat(0x2a3441, 0.4, 0.5)
          );
          leg.position.set(station.x + dx, 0.5, station.z + dz);
          scene.add(leg);
        }
      );

      const stationLabel = textPlane(
        `${station.capacity}-PACKAGE STATION`,
        station.color,
        3.6,
        0.5
      );
      stationLabel.position.set(station.x, 3.15, station.z);
      scene.add(stationLabel);

      const routeLabel = textPlane(
        `ORTEC ${station.capacity} → ${station.id}`,
        station.color,
        3.2,
        0.42
      );
      routeLabel.position.set(station.x, 1.85, BRANCH_END_Z);
      scene.add(routeLabel);

      [6.55, 5.55, 4.6].forEach((z) => {
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.38, 4),
          new THREE.MeshBasicMaterial({ color: station.color })
        );
        arrow.position.set(station.x, 0.97, z);
        arrow.rotation.x = -Math.PI / 2;
        scene.add(arrow);
      });

      const chute = makeBelt(3.2);
      chute.rotation.y = Math.PI / 2;
      chute.position.set(station.x + 1.35, 0.7, 1.45);
      scene.add(chute);
    });

    const layoutLabel = textPlane(
      "1 × 1-PACKAGE · 1 × 2-PACKAGE · 1 × 3-PACKAGE",
      C.text,
      8.5,
      0.62
    );
    layoutLabel.position.set(-3, 4.4, 2.8);
    scene.add(layoutLabel);

    // Animated ORTEC order totes
    const totes = ORDERS.map((order) => {
      const group = new THREE.Group();

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.55, 0.8),
        mat(order.color, 0.6)
      );
      box.castShadow = true;
      group.add(box);

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: labelTexture(order),
          transparent: true,
        })
      );
      label.scale.set(2.2, 1.1, 1);
      label.position.y = 1.05;
      group.add(label);

      scene.add(group);

      return {
        order,
        group,
        station: STATIONS[order.station],
        delay: order.station * 1.6,
      };
    });

    const duration = 14;

    const updateTote = (item, t) => {
      const local = (t - item.delay + duration) % duration;
      const stationX = item.station.x;

      if (local < 5) {
        const f = local / 5;
        item.group.position.set(
          SOURCE_X + (stationX - SOURCE_X) * f,
          1.05,
          INFEED_Z
        );
      } else if (local < 8) {
        const f = (local - 5) / 3;
        item.group.position.set(
          stationX,
          1.05,
          INFEED_Z + (BRANCH_END_Z - INFEED_Z) * f
        );
      } else if (local < 10) {
        item.group.position.set(stationX, 1.35, item.station.z);
      } else {
        const f = (local - 10) / 4;
        item.group.position.set(
          stationX + 1.35 + (OUTBOUND_END_X - stationX - 1.35) * f,
          1.15,
          OUTBOUND_Z
        );
      }
    };

    let last = performance.now();
    let raf;

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (runtime.current.playing) {
        runtime.current.t += dt * runtime.current.speed;
      }

      totes.forEach((item) => updateTote(item, runtime.current.t));
      setTime(runtime.current.t);
      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(animate);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let theta = -0.75;
    let phi = 1.0;
    let radius = 35;
    const target = new THREE.Vector3(-1, 1, 3);

    const applyCamera = () => {
      const sp = Math.sin(phi);
      camera.position.set(
        target.x + radius * sp * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * sp * Math.cos(theta)
      );
      camera.lookAt(target);
    };

    const onPointerDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      theta -= (e.clientX - lastX) * 0.006;
      phi = Math.min(1.45, Math.max(0.3, phi - (e.clientY - lastY) * 0.006));
      lastX = e.clientX;
      lastY = e.clientY;
      applyCamera();
    };

    const onPointerUp = () => {
      dragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      radius = Math.min(55, Math.max(12, radius * (1 + e.deltaY * 0.001)));
      applyCamera();
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const playPause = () => {
    runtime.current.playing = !runtime.current.playing;
    setPlaying(runtime.current.playing);
  };

  const reset = () => {
    runtime.current.t = 0;
    runtime.current.playing = false;
    setPlaying(false);
    setTime(0);
  };

  const changeSpeed = (value) => {
    runtime.current.speed = value;
    setSpeed(value);
  };

  const buttonStyle = (active = false) => ({
    background: active ? C.blue : C.panel2,
    color: active ? C.bg : C.text,
    border: `1px solid ${active ? C.blue : C.line}`,
    borderRadius: 8,
    padding: "8px 11px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontWeight: 700,
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        color: C.text,
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "11px 14px",
          borderBottom: `1px solid ${C.line}`,
          background: C.panel,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          ORTEC Packing Proposal Routing
        </div>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>
          Three packing stations: one for 1-package, one for 2-package and one
          for 3-package deliveries
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "9px 14px",
            border: `1px solid ${C.blue}`,
            borderRadius: 9,
            background: "rgba(13,18,25,0.92)",
            fontFamily: "monospace",
            fontSize: 12,
            textAlign: "center",
            maxWidth: "92%",
          }}
        >
          Orders are routed to the matching station according to their ORTEC
          packing proposal.
        </div>

        <div
          style={{
            position: "absolute",
            top: 65,
            right: 12,
            width: 230,
            padding: 11,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            background: "rgba(20,27,37,0.94)",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>ROUTING LOGIC</div>
          <div style={{ color: C.blue }}>Order A → 1P station</div>
          <div style={{ color: C.yellow, marginTop: 5 }}>
            Order B → 2P station
          </div>
          <div style={{ color: C.magenta, marginTop: 5 }}>
            Order C → 3P station
          </div>
          <div
            style={{
              borderTop: `1px solid ${C.line}`,
              marginTop: 10,
              paddingTop: 8,
              color: C.dim,
            }}
          >
            Simulation time: {time.toFixed(1)}s
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 7,
          padding: "9px 12px calc(9px + env(safe-area-inset-bottom))",
          borderTop: `1px solid ${C.line}`,
          background: C.panel,
        }}
      >
        <button style={buttonStyle(true)} onClick={playPause}>
          {playing ? "❚❚ Pause" : "▶ Start"}
        </button>
        <button style={buttonStyle()} onClick={reset}>
          ↺ Reset
        </button>

        {[0.5, 1, 2, 4].map((value) => (
          <button
            key={value}
            style={buttonStyle(speed === value)}
            onClick={() => changeSpeed(value)}
          >
            {value}×
          </button>
        ))}

        <div style={{ marginLeft: "auto", color: C.dim, fontSize: 12 }}>
          Drag to rotate · scroll/pinch to zoom
        </div>
      </div>
    </div>
  );
}
