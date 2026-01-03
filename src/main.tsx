import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found! Make sure index.html has a <div id='root'></div>");
}

const root = createRoot(rootElement);

// Add error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #0a0a0f; min-height: 100vh;">
      <h1 style="color: #ef4444;">Error Loading App</h1>
      <pre style="background: #1e1e2e; padding: 20px; border-radius: 8px; overflow: auto;">
${event.error?.stack || event.error?.message || 'Unknown error'}
      </pre>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Import App directly instead of dynamic import to avoid module loading issues
import App from './App';

try {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('Error rendering App:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #0a0a0f; min-height: 100vh;">
      <h1 style="color: #ef4444;">Fatal Error</h1>
      <pre style="background: #1e1e2e; padding: 20px; border-radius: 8px; overflow: auto;">
${error instanceof Error ? error.stack : String(error)}
      </pre>
    </div>
  `;
}