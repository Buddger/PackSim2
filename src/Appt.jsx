import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const COLORS = {
  background: "#0d1219",
  panel: "#141b25",
  panel2: "#1a2331",
  line: "#26313f",
  text: "#e8edf4",
  dim: "#8fa0b5",
  blue: "#4da3ff",
  green: "#3ddc84",
  orange: "#ff8c42",
  yellow: "#ffd166",
  red: "#ff5c5c",
  cardboard: 0xc9975b,
};

const STATIONS = [
  {
    id: "one",
    title: "1 Parcel Orders",
    subtitle: "ORTEC Proposal: 1 parcel",
    x: 8,
    z: -5.5,
    color: COLORS.green,
    parcelCount: 1,
  },
  {
    id: "two",
    title: "2 Parcel Orders",
    subtitle: "ORTEC Proposal: 2 parcels",
    x: 8,
    z: 0,
    color: COLORS.blue,
    parcelCount: 2,
  },
  {
    id: "three",
    title: "3 Parcel Orders",
    subtitle: "ORTEC Proposal: 3 parcels",
    x: 8,
    z: 5.5,
    color: COLORS.orange,
    parcelCount: 3,
  },
];

function createTextSprite(text, {
  color = "#ffffff",
  background = "rgba(20,27,37,0.94)",
  fontSize = 54,
  padding = 22,
  scale = 0.011,
} = {}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  context.font = `600 ${fontSize}px Arial`;
  const metrics = context.measureText(text);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize * 1.65);

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255,255,255,0.15)";
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);

  context.font = `600 ${fontSize}px Arial`;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillStyle = color;
  context.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width * scale, height * scale, 1);
  sprite.renderOrder = 10;

  return sprite;
}

function addBox(scene, {
  x,
  y,
  z,
  width,
  height,
  depth,
  color,
  roughness = 0.72,
  metalness = 0.08,
}) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addConveyor(scene, {
  x,
  z,
  length,
  width = 2.2,
  rotationY = 0,
}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  const belt = addBox(group, {
    x: 0,
    y: 0.68,
    z: 0,
    width: length,
    height: 0.22,
    depth: width,
    color: 0x253141,
  });

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b7787,
    roughness: 0.55,
    metalness: 0.35,
  });

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.18, 0.12),
      railMaterial
    );
    rail.position.set(0, 0.95, side * (width / 2));
    rail.castShadow = true;
    group.add(rail);
  }

  const rollerMaterial = new THREE.MeshStandardMaterial({
    color: 0x111820,
    roughness: 0.45,
    metalness: 0.5,
  });

  for (let offset = -length / 2 + 0.45; offset <= length / 2 - 0.45; offset += 0.7) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, width - 0.25, 20),
      rollerMaterial
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(offset, 0.83, 0);
    group.add(roller);
  }

  for (const legX of [-length / 2 + 0.6, 0, length / 2 - 0.6]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.68, 0.12),
        railMaterial
      );
      leg.position.set(legX, 0.33, side * (width / 2 - 0.15));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  scene.add(group);
  return { group, belt };
}

function addArrow(scene, start, end, color) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  direction.normalize();

  const arrow = new THREE.ArrowHelper(
    direction,
    start,
    length,
    new THREE.Color(color),
    0.75,
    0.38
  );
  scene.add(arrow);
  return arrow;
}

function createParcel(color = COLORS.cardboard) {
  const group = new THREE.Group();

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.75, 0.78),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  box.position.y = 0.38;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.28),
    new THREE.MeshBasicMaterial({
      color: 0xf6f7f8,
      side: THREE.DoubleSide,
    })
  );
  label.position.set(0, 0.5, 0.395);
  group.add(label);

  return group;
}

function createStation(scene, station) {
  const group = new THREE.Group();
  group.position.set(station.x, 0, station.z);

  const platform = addBox(group, {
    x: 0,
    y: 0.1,
    z: 0,
    width: 5.6,
    height: 0.2,
    depth: 4.2,
    color: 0x1a2331,
  });

  const tableTop = addBox(group, {
    x: 0.4,
    y: 1.15,
    z: 0,
    width: 2.6,
    height: 0.18,
    depth: 1.5,
    color: 0x6e7b8b,
  });

  for (const legX of [-0.65, 1.45]) {
    for (const legZ of [-0.55, 0.55]) {
      addBox(group, {
        x: legX,
        y: 0.56,
        z: legZ,
        width: 0.14,
        height: 1.05,
        depth: 0.14,
        color: 0x4e5967,
      });
    }
  }

  addBox(group, {
    x: -1.55,
    y: 0.8,
    z: 0,
    width: 1.05,
    height: 1.6,
    depth: 1.3,
    color: Number.parseInt(station.color.slice(1), 16),
  });

  const screen = addBox(group, {
    x: -1.55,
    y: 1.05,
    z: -0.66,
    width: 0.74,
    height: 0.46,
    depth: 0.05,
    color: 0x081018,
    roughness: 0.4,
    metalness: 0.25,
  });

  const title = createTextSprite(station.title, {
    color: station.color,
    fontSize: 52,
  });
  title.position.set(0, 2.65, 0);
  group.add(title);

  const subtitle = createTextSprite(station.subtitle, {
    color: COLORS.text,
    background: "rgba(13,18,25,0.9)",
    fontSize: 36,
    scale: 0.009,
  });
  subtitle.position.set(0, 2.05, 0);
  group.add(subtitle);

  const parcels = [];
  for (let index = 0; index < station.parcelCount; index += 1) {
    const parcel = createParcel();
    parcel.position.set(
      -0.35 + index * 0.82,
      1.24,
      index % 2 === 0 ? -0.15 : 0.25
    );
    parcel.scale.setScalar(0.72);
    group.add(parcel);
    parcels.push(parcel);
  }

  scene.add(group);
  return { group, parcels, platform, tableTop, screen };
}

export default function App() {
  const mountRef = useRef(null);
  const animationRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedStation, setSelectedStation] = useState("two");

  const selected = useMemo(
    () => STATIONS.find((station) => station.id === selectedStation),
    [selectedStation]
  );

  useEffect(() => {
    if (!mountRef.current) return undefined;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    scene.fog = new THREE.Fog(0x0d1219, 26, 60);

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(18, 16, 22);
    camera.lookAt(5, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xdbe8ff, 0x1a2230, 1.7);
    scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(8, 18, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    mainLight.shadow.camera.left = -24;
    mainLight.shadow.camera.right = 24;
    mainLight.shadow.camera.top = 24;
    mainLight.shadow.camera.bottom = -24;
    scene.add(mainLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 42),
      new THREE.MeshStandardMaterial({
        color: 0x101720,
        roughness: 0.95,
        metalness: 0.02,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(70, 35, 0x26313f, 0x18212d);
    grid.position.y = 0.01;
    scene.add(grid);

    addConveyor(scene, {
      x: -5.5,
      z: 0,
      length: 14,
      width: 2.35,
    });

    const routingLabel = createTextSprite(
      "Routing based on ORTEC Packing Proposal",
      {
        color: COLORS.yellow,
        fontSize: 48,
        background: "rgba(20,27,37,0.96)",
      }
    );
    routingLabel.position.set(1.2, 3.25, 0);
    scene.add(routingLabel);

    const routerBase = addBox(scene, {
      x: 1.6,
      y: 0.32,
      z: 0,
      width: 2.6,
      height: 0.64,
      depth: 4.2,
      color: 0x202b39,
      roughness: 0.65,
      metalness: 0.15,
    });

    const routerLight = addBox(scene, {
      x: 1.6,
      y: 1.05,
      z: 0,
      width: 1.25,
      height: 0.24,
      depth: 0.9,
      color: 0xffd166,
      roughness: 0.35,
      metalness: 0.1,
    });

    STATIONS.forEach((station) => {
      const dz = station.z;
      const distance = Math.sqrt((station.x - 2.5) ** 2 + dz ** 2);
      const angle = Math.atan2(dz, station.x - 2.5);

      addConveyor(scene, {
        x: 2.5 + Math.cos(angle) * distance / 2,
        z: Math.sin(angle) * distance / 2,
        length: distance,
        width: 1.25,
        rotationY: -angle,
      });

      addArrow(
        scene,
        new THREE.Vector3(2.2, 1.65, 0),
        new THREE.Vector3(station.x - 2.8, 1.65, station.z),
        station.color
      );

      createStation(scene, station);
    });

    const movingOrders = [
      { parcelCount: 1, color: COLORS.green, delay: 0 },
      { parcelCount: 2, color: COLORS.blue, delay: 2.3 },
      { parcelCount: 3, color: COLORS.orange, delay: 4.6 },
    ].map((order) => {
      const parcel = createParcel();
      parcel.scale.setScalar(0.72);
      parcel.position.set(-12, 0.96, 0);
      scene.add(parcel);

      const tag = createTextSprite(`${order.parcelCount} parcel proposal`, {
        color: order.color,
        fontSize: 34,
        scale: 0.007,
      });
      tag.position.set(0, 1.25, 0);
      parcel.add(tag);

      return {
        ...order,
        object: parcel,
      };
    });

    let isDragging = false;
    let previousPointer = { x: 0, y: 0 };
    let yaw = -0.08;
    let pitch = 0.48;
    let radius = 31;

    const updateCamera = () => {
      const target = new THREE.Vector3(4.5, 1.1, 0);
      const horizontalRadius = radius * Math.cos(pitch);

      camera.position.set(
        target.x + horizontalRadius * Math.sin(yaw),
        target.y + radius * Math.sin(pitch),
        target.z + horizontalRadius * Math.cos(yaw)
      );
      camera.lookAt(target);
    };

    updateCamera();

    const onPointerDown = (event) => {
      isDragging = true;
      previousPointer = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!isDragging) return;

      const deltaX = event.clientX - previousPointer.x;
      const deltaY = event.clientY - previousPointer.y;

      yaw -= deltaX * 0.006;
      pitch = THREE.MathUtils.clamp(
        pitch + deltaY * 0.004,
        0.16,
        1.05
      );

      previousPointer = { x: event.clientX, y: event.clientY };
      updateCamera();
    };

    const onPointerUp = (event) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };

    const onWheel = (event) => {
      radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.02, 19, 46);
      updateCamera();
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      routerLight.scale.x = 1 + Math.sin(elapsed * 4) * 0.08;

      movingOrders.forEach((order) => {
        if (!running) return;

        const cycle = 9;
        const localTime = (
          elapsed * speed +
          order.delay
        ) % cycle;

        const targetStation = STATIONS[order.parcelCount - 1];
        const start = new THREE.Vector3(-12, 0.96, 0);
        const router = new THREE.Vector3(1.5, 0.96, 0);
        const target = new THREE.Vector3(
          targetStation.x - 2.8,
          0.96,
          targetStation.z
        );

        if (localTime < 4.1) {
          const t = localTime / 4.1;
          order.object.position.lerpVectors(start, router, t);
        } else if (localTime < 7.4) {
          const t = (localTime - 4.1) / 3.3;
          order.object.position.lerpVectors(router, target, t);
        } else {
          const t = (localTime - 7.4) / 1.6;
          order.object.position.lerpVectors(
            target,
            new THREE.Vector3(targetStation.x, 1.35, targetStation.z),
            Math.min(t, 1)
          );
        }
      });

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);

      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [running, speed]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        color: COLORS.text,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "center",
          padding: "18px 22px",
          borderBottom: `1px solid ${COLORS.line}`,
          background: COLORS.panel,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: COLORS.yellow,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            ORTEC Packing Proposal
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(21px, 3vw, 34px)",
            }}
          >
            Predictive Order Routing to Packing Stations
          </h1>
          <p
            style={{
              margin: "7px 0 0",
              color: COLORS.dim,
              maxWidth: 860,
              lineHeight: 1.5,
            }}
          >
            Incoming orders remain on one common conveyor and are routed to
            the correct packing station according to the expected parcel count
            from the ORTEC packing proposal.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            style={{
              border: `1px solid ${running ? COLORS.green : COLORS.line}`,
              background: running ? "rgba(61,220,132,0.12)" : COLORS.panel2,
              color: running ? COLORS.green : COLORS.text,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {running ? "Pause flow" : "Start flow"}
          </button>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: COLORS.dim,
              fontSize: 14,
            }}
          >
            Speed
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <span style={{ color: COLORS.text, minWidth: 34 }}>
              {speed.toFixed(1)}×
            </span>
          </label>
        </div>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 14,
          padding: 14,
        }}
      >
        <section
          style={{
            minHeight: "70vh",
            border: `1px solid ${COLORS.line}`,
            background: COLORS.panel,
            borderRadius: 14,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            ref={mountRef}
            style={{
              width: "100%",
              height: "72vh",
              minHeight: 540,
              touchAction: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 14,
              bottom: 14,
              background: "rgba(13,18,25,0.86)",
              border: `1px solid ${COLORS.line}`,
              color: COLORS.dim,
              borderRadius: 10,
              padding: "9px 11px",
              fontSize: 12,
            }}
          >
            Drag to rotate · Scroll or pinch to zoom
          </div>
        </section>

        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              border: `1px solid ${COLORS.line}`,
              background: COLORS.panel,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <h2 style={{ margin: "0 0 10px", fontSize: 17 }}>
              Packing layout
            </h2>
            <p
              style={{
                margin: 0,
                color: COLORS.dim,
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              The packing area now contains exactly one station for each
              expected parcel count: one, two, or three parcels.
            </p>
          </div>

          {STATIONS.map((station) => {
            const active = selectedStation === station.id;

            return (
              <button
                key={station.id}
                type="button"
                onClick={() => setSelectedStation(station.id)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${
                    active ? station.color : COLORS.line
                  }`,
                  background: active ? COLORS.panel2 : COLORS.panel,
                  borderRadius: 14,
                  padding: 15,
                  cursor: "pointer",
                  color: COLORS.text,
                }}
              >
                <div
                  style={{
                    color: station.color,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  {station.title}
                </div>
                <div
                  style={{
                    color: COLORS.dim,
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  One dedicated packing station for orders predicted to require{" "}
                  {station.parcelCount}{" "}
                  {station.parcelCount === 1 ? "parcel" : "parcels"}.
                </div>
              </button>
            );
          })}

          <div
            style={{
              border: `1px solid ${selected.color}`,
              background: COLORS.panel2,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div
              style={{
                color: COLORS.dim,
                textTransform: "uppercase",
                fontSize: 11,
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              Selected flow
            </div>
            <div
              style={{
                color: selected.color,
                fontSize: 18,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              {selected.title}
            </div>
            <div
              style={{
                color: COLORS.text,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              ORTEC predicts {selected.parcelCount}{" "}
              {selected.parcelCount === 1 ? "parcel" : "parcels"} and routes
              the order from the common inbound conveyor to this station.
            </div>
          </div>
        </aside>
      </main>

      <style>{`
        @media (max-width: 900px) {
          main {
            grid-template-columns: 1fr !important;
          }

          aside {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }
        }

        button,
        input {
          font: inherit;
        }
      `}</style>
    </div>
  );
}
