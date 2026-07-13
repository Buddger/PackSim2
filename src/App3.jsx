# ParcelLabelSim – targeted code changes

Apply the following replacements to the supplied `ParcelLabelSim` component.

## 1. Replace the layout constants, station configuration and order colors

Replace the block beginning with `const MACHINE_X = 12;` through the `ORDERS` declaration with:

```jsx
const MACHINE_X = 12;
const CONV_END = 27;
const CONV_START = -15.5;

// Shared infeed layout for S2–S4
const INFEED_SPINE_Z = 7.8;
const INFEED_SOURCE_X = 6.8;
const INFEED_BRANCH_END_Z = 4.15;

// Extended relabelling flow for S4
const RELABEL_Z = 4.4;
const RELABEL_REJOIN_X = MACHINE_X + 11;
const RELABEL_UNIT_X = (MACHINE_X + RELABEL_REJOIN_X) / 2;

// Seven packing stations grouped by ORTEC proposal capacity:
// 4 × one-package, 2 × two-package, 1 × three-package.
const STATIONS = [
  { id: "1P-01", x: -13.6, z: 3.2, cap: 1 },
  { id: "1P-02", x: -11.4, z: 3.2, cap: 1 },
  { id: "1P-03", x: -9.2, z: 3.2, cap: 1 },
  { id: "1P-04", x: -7.0, z: 3.2, cap: 1 },
  { id: "2P-01", x: -4.4, z: 3.2, cap: 2 },
  { id: "2P-02", x: -2.2, z: 3.2, cap: 2 },
  { id: "3P-01", x: 1.2, z: 3.2, cap: 3 },
];

// Deliberately high-separation order colors.
// A is cyan-blue, B is yellow, C is saturated magenta.
const ORDER_COLORS = {
  A: "#00c8ff",
  B: "#ffd166",
  C: "#e44cff",
};

const CAPACITY_COLORS = {
  1: ORDER_COLORS.A,
  2: ORDER_COLORS.B,
  3: ORDER_COLORS.C,
};

const capacityText = (cap) => `${cap} PACKAGE${cap === 1 ? "" : "S"}`;

// Example orders are routed to one station in the matching capacity group.
// The remaining stations stay visibly available for further orders.
const ORDERS = [
  { key: "A", count: 1, color: ORDER_COLORS.A, station: 1 },
  { key: "B", count: 2, color: ORDER_COLORS.B, station: 4 },
  { key: "C", count: 3, color: ORDER_COLORS.C, station: 6 },
];

const entryX = (st) => STATIONS[st].x + 1.5;
```

## 2. Replace the S4 relabelling detour

Inside `if (n === 4)`, replace the existing `relabelDetour` function with:

```jsx
const relabelDetour = (tArr) => {
  const tScan = tArr + 1.0;
  const tDown = tScan + 1.8;
  const tUnitIn = tScan + 4.6;
  const tUnitOut = tScan + 7.0;
  const tFarEnd = tScan + 10.2;
  const tRejoin = tScan + 12.0;

  return {
    pts: [
      [tScan, MACHINE_X, CONV_Y, 0],
      [tDown, MACHINE_X, CONV_Y, RELABEL_Z],
      [tUnitIn, RELABEL_UNIT_X, CONV_Y, RELABEL_Z],
      [tUnitOut, RELABEL_UNIT_X, CONV_Y, RELABEL_Z],
      [tFarEnd, RELABEL_REJOIN_X, CONV_Y, RELABEL_Z],
      [tRejoin, RELABEL_REJOIN_X, CONV_Y, 0],
    ],
    relabelT: tScan + 5.8,
    rejoinT: tRejoin,
  };
};
```

In the same S4 block, replace:

```jsx
const tExit = ride(det.rejoinT + 0.2, MACHINE_X + 6, CONV_END);
```

with:

```jsx
const tExit = ride(det.rejoinT + 0.2, RELABEL_REJOIN_X, CONV_END);
```

Also correct this existing comparison:

```jsx
parcels.forEach((p) => { if (p.order === "Order C") p.devT = DEV_T; });
```

to:

```jsx
parcels.forEach((p) => {
  if (p.order === "C") p.devT = DEV_T;
});
```

Without this correction, the deviation state is never attached to the Order C parcels because `p.order` contains `"C"`, not `"Order C"`.

## 3. Replace the S2–S4 ORTEC infeed-tote block

Inside the `if (n >= 2)` section, replace the block beginning with:

```jsx
const SPINE_Z = 7.6, SRC_X = 5.4, TS = 4;
```

through the end of the `ORDERS.forEach(...)` call with:

```jsx
const TS = 4;

ORDERS.forEach((O, oi) => {
  const station = STATIONS[O.station];
  const bx = station.x;
  const dep = oi * 0.7;
  const tSpine = dep + Math.abs(INFEED_SOURCE_X - bx) / TS;
  const tArr2 =
    tSpine + Math.abs(INFEED_SPINE_Z - INFEED_BRANCH_END_Z) / TS;

  parcels.push({
    tote: true,
    st: O.station,
    order: O.key,
    orderSize: O.count,
    color: O.color,
    id: `TOTE-${O.key}`,
    plan: O.count,
    spawn: dep,
    despawn: tArr2 + 0.35,
    packEnd: -1,
    move: -1,
    size: [1.05, 0.5, 0.75],
    path: [
      [dep, INFEED_SOURCE_X, CONV_Y + 0.06, INFEED_SPINE_Z],
      [tSpine, bx, CONV_Y + 0.06, INFEED_SPINE_Z],
      [tArr2, bx, 1.0, INFEED_BRANCH_END_Z],
    ],
    labels: [
      [
        dep,
        capacityText(O.count),
        O.color,
        `ORTEC → ${station.id}`,
      ],
    ],
    conveyor: [1e9, 1e9],
    loop: [],
    stagingIv: null,
  });
});
```

Replace the ORTEC routing message with:

```jsx
messages.unshift([
  0,
  "ORTEC packing proposal routes each order to a matching capacity group: A → 1 package · B → 2 packages · C → 3 packages",
  "info",
]);
```

## 4. Replace the complete static infeed-conveyor section

Replace the section beginning with:

```jsx
// Ortec-routed infeed conveyors (scenarios 2-4): spine + capacity branches
```

and ending after:

```jsx
props.add(infeedGroup);
```

with:

```jsx
// ORTEC-routed infeed conveyors for S2–S4.
// Every one of the seven stations receives a physical branch conveyor.
const infeedGroup = new THREE.Group();
const infeedMat = new THREE.MeshStandardMaterial({
  color: 0x35424e,
  roughness: 0.9,
});

const spineMinX = STATIONS[0].x - 1.3;
const spineMaxX = INFEED_SOURCE_X + 1.3;
const spineLength = spineMaxX - spineMinX;

const spine = new THREE.Mesh(
  new THREE.BoxGeometry(spineLength, 0.12, 1.1),
  infeedMat
);
spine.position.set(
  (spineMinX + spineMaxX) / 2,
  0.62,
  INFEED_SPINE_Z
);
spine.castShadow = true;
infeedGroup.add(spine);

for (let x = spineMinX + 0.6; x <= spineMaxX - 0.6; x += 2.4) {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.6, 0.9),
    mat(0x232c38, 0.5, 0.4)
  );
  leg.position.set(x, 0.3, INFEED_SPINE_Z);
  infeedGroup.add(leg);
}

// Infeed source / ORTEC release point
const srcBox = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 1.6, 1.8),
  mat(0x2b3a4d, 0.6, 0.3)
);
srcBox.position.set(INFEED_SOURCE_X + 0.8, 0.82, INFEED_SPINE_Z);
srcBox.castShadow = true;
infeedGroup.add(srcBox);

const srcSign = makeTextPlane(
  "ORTEC ORDER RELEASE",
  C.blue,
  3.6,
  0.48
);
srcSign.position.set(
  INFEED_SOURCE_X + 0.8,
  2.05,
  INFEED_SPINE_Z + 0.95
);
infeedGroup.add(srcSign);

// One branch for every physical packing station.
STATIONS.forEach((st, si) => {
  const branchLength = INFEED_SPINE_Z - INFEED_BRANCH_END_Z;
  const capColor = CAPACITY_COLORS[st.cap];
  const assigned = ORDERS.some((O) => O.station === si);

  const branch = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.12, branchLength + 0.2),
    infeedMat
  );
  branch.position.set(
    st.x,
    0.62,
    (INFEED_SPINE_Z + INFEED_BRANCH_END_Z) / 2
  );
  branch.castShadow = true;
  infeedGroup.add(branch);

  // Capacity beacon: brighter/larger for the station used in the demo.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(assigned ? 0.14 : 0.09, 14, 10),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(capColor),
      transparent: true,
      opacity: assigned ? 1 : 0.55,
    })
  );
  beacon.position.set(st.x + 0.62, 1.15, INFEED_SPINE_Z - 0.15);
  infeedGroup.add(beacon);

  // Direction arrows from the main spine toward the table.
  [6.95, 5.75, 4.65].forEach((az) => {
    const a = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.36, 4),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(capColor),
        transparent: true,
        opacity: assigned ? 1 : 0.55,
      })
    );
    a.position.set(st.x, 0.95, az);
    a.rotation.x = -Math.PI / 2;
    infeedGroup.add(a);
  });

  const stationRouteSign = makeTextPlane(
    `${st.id} · ${capacityText(st.cap)}`,
    capColor,
    2.45,
    0.38
  );
  stationRouteSign.position.set(st.x, 1.68, 4.22);
  infeedGroup.add(stationRouteSign);
});

// Main spine arrows: orders move from the ORTEC source toward the left.
for (let x = INFEED_SOURCE_X - 0.4; x >= spineMinX + 0.8; x -= 2.5) {
  const a = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.36, 4),
    new THREE.MeshBasicMaterial({ color: 0x8fa0b5 })
  );
  a.position.set(x, 0.95, INFEED_SPINE_Z);
  a.rotation.z = Math.PI / 2;
  infeedGroup.add(a);
}

const routingSign = makeTextPlane(
  "ORTEC CAPACITY ROUTING · 1 / 2 / 3 PACKAGES",
  "#4da3ff",
  7.2,
  0.55
);
routingSign.position.set(-4.2, 2.55, INFEED_SPINE_Z + 0.85);
infeedGroup.add(routingSign);

props.add(infeedGroup);
```

This makes all four 1-package stations, both 2-package stations and the single 3-package station visibly conveyor-fed. The animated demo totes still select one valid station within each capacity group.

## 5. Replace the complete S4 relabelling-conveyor geometry

Replace the section beginning with:

```jsx
// relabeling station (scenario 4) — long side spur integrated into the flow
```

and ending after:

```jsx
props.add(relabelGroup);
```

with:

```jsx
// Relabelling station for S4.
// The spur now runs 11 world units beside the main line before merging back.
const relabelGroup = new THREE.Group();
const spurMat = new THREE.MeshStandardMaterial({
  color: 0x4a2f33,
  roughness: 0.9,
});

const relabelRun = RELABEL_REJOIN_X - MACHINE_X;

const spurOut = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.12, RELABEL_Z + 0.5),
  spurMat
);
spurOut.position.set(MACHINE_X, 0.62, RELABEL_Z / 2);
spurOut.castShadow = true;

const spurLong = new THREE.Mesh(
  new THREE.BoxGeometry(relabelRun + 1.1, 0.12, 1.1),
  spurMat
);
spurLong.position.set(
  (MACHINE_X + RELABEL_REJOIN_X) / 2,
  0.62,
  RELABEL_Z
);
spurLong.castShadow = true;

const spurReturn = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.12, RELABEL_Z + 0.5),
  spurMat
);
spurReturn.position.set(RELABEL_REJOIN_X, 0.62, RELABEL_Z / 2);
spurReturn.castShadow = true;

relabelGroup.add(spurOut, spurLong, spurReturn);

for (
  let x = MACHINE_X + 1.2;
  x <= RELABEL_REJOIN_X - 1.2;
  x += 1.8
) {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.6, 0.9),
    mat(0x232c38, 0.5, 0.4)
  );
  leg.position.set(x, 0.3, RELABEL_Z);
  relabelGroup.add(leg);
}

// Relabelling unit placed around the middle of the extended spur.
const rMat = mat(0x7a3340, 0.45, 0.5);
const rPillarA = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 2.2, 0.5),
  rMat
);
rPillarA.position.set(RELABEL_UNIT_X - 0.9, 1.1, RELABEL_Z);

const rPillarB = rPillarA.clone();
rPillarB.position.x = RELABEL_UNIT_X + 0.9;

const rBridge = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 0.7, 1.4),
  rMat
);
rBridge.position.set(RELABEL_UNIT_X, 2.1, RELABEL_Z);
rBridge.castShadow = true;

relabelGroup.add(rPillarA, rPillarB, rBridge);

const rLight = new THREE.Mesh(
  new THREE.SphereGeometry(0.09),
  new THREE.MeshBasicMaterial({ color: C.red })
);
rLight.position.set(RELABEL_UNIT_X, 2.6, RELABEL_Z);
relabelGroup.add(rLight);

// Flow arrows: divert, long relabelling run and merge back.
[
  [MACHINE_X, 1.0, "out"],
  [MACHINE_X, 2.8, "out"],
  [MACHINE_X + 1.6, RELABEL_Z, "east"],
  [RELABEL_UNIT_X - 1.8, RELABEL_Z, "east"],
  [RELABEL_UNIT_X + 1.8, RELABEL_Z, "east"],
  [RELABEL_REJOIN_X - 1.6, RELABEL_Z, "east"],
  [RELABEL_REJOIN_X, 2.8, "return"],
  [RELABEL_REJOIN_X, 1.0, "return"],
].forEach(([ax, az, dir]) => {
  const a = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.36, 4),
    new THREE.MeshBasicMaterial({ color: C.red })
  );
  a.position.set(ax, 0.95, az);

  if (dir === "out") a.rotation.x = Math.PI / 2;
  if (dir === "return") a.rotation.x = -Math.PI / 2;
  if (dir === "east") a.rotation.z = -Math.PI / 2;

  relabelGroup.add(a);
});

const relabelSign = makeTextPlane(
  "EXTENDED RELABELING PROCESS",
  C.red,
  4.8,
  0.52
);
relabelSign.position.set(
  RELABEL_UNIT_X,
  3.2,
  RELABEL_Z + 0.9
);
relabelGroup.add(relabelSign);

const mergeSign = makeTextPlane(
  "MERGE TO OUTBOUND",
  C.green,
  3.2,
  0.42
);
mergeSign.position.set(
  RELABEL_REJOIN_X,
  2.0,
  0.95
);
relabelGroup.add(mergeSign);

props.add(relabelGroup);
```

## 6. Update the S4 camera preset

Replace:

```jsx
"Relabeling Station": { target: [MACHINE_X + 3, 1.2, 2.2], theta: -0.5, phi: 0.95, radius: 13 },
```

with:

```jsx
"Relabeling Station": {
  target: [RELABEL_UNIT_X, 1.2, RELABEL_Z / 2],
  theta: -0.55,
  phi: 0.95,
  radius: 18,
},
```

## 7. Use the new order colors on the ORTEC proposal board

Inside `drawOrtec`, replace the hard-coded A and C row colors:

```jsx
["Order A", "1 parcel ", "1/1", "#4da3ff", false],
```

with:

```jsx
["Order A", "1 parcel ", "1/1", ORDER_COLORS.A, false],
```

Replace both occurrences of `"#ff7ed4"` in the Order C row with:

```jsx
ORDER_COLORS.C
```

The deviation row may remain red because it represents an exception rather than the normal Order C identity.

## 8. Update labels that still describe only three packing stations

Recommended text replacements:

```jsx
"3 stations packing in parallel: Order A (1 pc) · Order B (2 pcs) · Order C (3 pcs)"
```

→

```jsx
"ORTEC-assigned stations packing in parallel: Order A (1 pc) · Order B (2 pcs) · Order C (3 pcs)"
```

```jsx
"3 stations packing — parcels consolidate per order before labelling"
```

→

```jsx
"ORTEC-assigned capacity stations packing — parcels consolidate per order before labelling"
```

```jsx
"3 stations packing — every parcel gets an interim label and leaves immediately"
```

→

```jsx
"ORTEC-assigned capacity stations packing — every parcel gets an interim label and leaves immediately"
```

In the header, replace:

```jsx
Orders A · B · C — 3 stations, one outbound line
```

with:

```jsx
Orders A · B · C — 7 stations in 4/2/1 capacity groups, one outbound line
```

## Result

After these changes:

- Order A is cyan-blue and Order C is saturated magenta.
- S2, S3 and S4 show conveyor branches to all seven packing stations.
- Four stations are visibly designated for one-package orders.
- Two stations are visibly designated for two-package orders.
- One station is visibly designated for three-package orders.
- ORTEC totes display the predicted package count and travel to a compatible station.
- The S4 relabelling route is substantially longer, includes a central relabelling machine and visibly merges back into the outbound flow.
- The existing Order C deviation-state bug is corrected.
