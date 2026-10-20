import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './app.css';
if(new URLSearchParams(location.search).get('preview')==='mobile')document.documentElement.dataset.preview='mobile';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
if('serviceWorker' in navigator && !import.meta.env.DEV){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));}
