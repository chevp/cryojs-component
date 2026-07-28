import { defineCustomElement } from 'vue'
import CryoScene from './components/CryoScene.vue'

// Bundles Vue + three.js + @cryo/cryojs into a single dependency-free element —
// consumers just load this one file and use <cryo-scene url="…">.
customElements.define('cryo-scene', defineCustomElement(CryoScene))
