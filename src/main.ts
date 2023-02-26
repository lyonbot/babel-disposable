import Buffer from 'buffer';

// @ts-ignore
window.Buffer = Buffer;

import { createApp } from 'vue';
import './style.css';
import App from './App.vue';


createApp(App).mount('#app');
