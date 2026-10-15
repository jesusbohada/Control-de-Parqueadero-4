import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeManager } from './utils/themeManager';

// Aplicar el tema predeterminado inmediatamente antes del renderizado
try {
  ThemeManager.applyTheme(ThemeManager.getTheme());
  ThemeManager.applyContrastLevel(ThemeManager.getContrastLevel());
  ThemeManager.applyStyle(ThemeManager.getStyle());
} catch (err) {
  console.error('[ThemeManager] Inicialización de tema:', err);
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
