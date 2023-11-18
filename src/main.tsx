import { html } from 'htm/preact/index.js';
import { render } from 'preact';
import App from './App';
import './global.css';

const root = document.getElementById('root');
if (!root) throw new Error('No root element found');
render(html`<${App} />`, root);
