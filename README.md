# Multi-Parcel Order Labelling Simulator

Interaktive 3D-Simulation (React + Three.js) von vier Etikettierungs-Strategien
für Mehrpaket-Aufträge im Packbereich (Order 4711).

- **S1** Immediate Final Label (1/X)
- **S2** Consolidated Labelling (Staging bis Auftrag komplett)
- **S3** Interim Label + Auto Relabelling (Recirculation Loop)
- **S4** Predictive Proposal Labels (Stammdaten-Hochrechnung + Relabeling-Ausnahmeprozess)

## Lokal starten

```bash
npm install
npm run dev
```

Dann http://localhost:5173 öffnen.

## Veröffentlichen über GitHub + Vercel

1. **Repository anlegen** (auf github.com → "New repository", z. B. `parcel-label-sim`, ohne README initialisieren).

2. **Code hochladen** (im Projektordner):

   ```bash
   git init
   git add .
   git commit -m "Initial commit: parcel labelling simulator"
   git branch -M main
   git remote add origin https://github.com/DEIN-USERNAME/parcel-label-sim.git
   git push -u origin main
   ```

3. **Vercel verbinden**: Auf vercel.com → "Add New… → Project" → das GitHub-Repo importieren.
   Vercel erkennt Vite automatisch (Build `npm run build`, Output `dist`) — einfach **Deploy** klicken.

4. Fertig — jeder Push auf `main` löst automatisch ein neues Deployment aus.

## Struktur

```
parcel-label-sim/
├── index.html            # Einstiegspunkt (Vite)
├── package.json          # Abhängigkeiten & Scripts
├── vite.config.js        # Vite + React-Plugin
├── vercel.json           # Vercel-Konfiguration (optional, Vite wird auto-erkannt)
├── .gitignore
└── src/
    ├── main.jsx          # React-Bootstrap
    └── ParcelLabelSim.jsx # Die komplette Simulation (Single-File-Komponente)
```

## Hinweis zu Three.js

Die Version ist auf `three@0.128.0` gepinnt, da die Komponente gegen die r128-API
geschrieben ist. Bei einem Upgrade auf neuere Three-Versionen sind API-Anpassungen nötig.
