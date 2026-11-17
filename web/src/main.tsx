import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The report-builder's palettes, report.css and charts.css, then the Roost hub layer: one stylesheet.
import '../ui/bundle.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
