// Self-hosted: the Google Fonts stylesheet was a render-blocking request to a
// third party. Both files carry unicode-range, so latin-ext is only fetched
// when the page actually contains those glyphs.
import '@fontsource-variable/oxanium/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import 'leaflet/dist/leaflet.css';
import './style.css';
import { App } from './App.js';

const app = new App();
window.app = app;
