# cryojs-component

Vue 3 app that renders `.cryo` scenes with three.js in the browser.

Reads a `.cryo` container (via `@cryo/cryojs/browser`), finds its glTF/GLB
asset, and displays it with orbit controls.

## Usage

```
npm install
npm run dev
```

Open `http://localhost:5173/?url=/path/to/scene.cryo` — the container is
fetched from that URL and rendered.

## Status

MVP: loads the first `.glb`/`.gltf` entry found in the container's manifest.
Full scene-graph interpretation (entities, transforms, materials from
`scene.json`) is not yet wired up — see `@cryo/cryojs` for the container
format.
