import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// PDF worker is configured in pdf-config.ts - import it to ensure it runs
import "@/lib/pdf-config";

// Enhanced error handling for initialization
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure there's a div with id='root' in index.html");
}

// Wrap app in error boundary to catch any initialization errors
try {
  const root = createRoot(rootElement);
  
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error("❌ [MAIN] Failed to initialize React app:", error);
  
  // Fallback UI if React fails to initialize
  rootElement.innerHTML = `
    <div style="min-height: 100vh; background: #0a0a0a; display: flex; align-items: center; justify-content: center; padding: 20px; color: white; font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 600px; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #EAEB80;">Application Error</h1>
        <p style="color: #999; margin-bottom: 24px;">Failed to initialize the application. Please refresh the page.</p>
        <button 
          onclick="window.location.reload()" 
          style="background: #EAEB80; color: black; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;"
        >
          Reload Page
        </button>
        <div style="margin-top: 24px; padding: 16px; background: #1a1a1a; border-radius: 6px; text-align: left; font-size: 12px; color: #666;">
          <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
          <p style="margin-top: 8px;"><strong>User Agent:</strong> ${navigator.userAgent}</p>
        </div>
      </div>
    </div>
  `;
}
