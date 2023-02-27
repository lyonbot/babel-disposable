import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

const container = document.createElement('div');
document.body.appendChild(container);

createApp(App).mount(container);
