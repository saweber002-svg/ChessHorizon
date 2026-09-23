import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

async function bootstrap() {
  const { default: App } = await import('./App.tsx');
  const rootEl = document.getElementById('root');

  if (!rootEl) {
    throw new Error('#root element not found');
  }

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
