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
