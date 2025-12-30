import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("❌ Root element #root not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// -------------------------------------------------------------
// PWA v1 — Service Worker Registration (Cashier)
// -------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log(
          "🟢 Cashier PWA Service Worker registered:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "🔴 Cashier PWA Service Worker registration failed:",
          error
        );
      });
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("🟢 Service Worker registered:", registration.scope);
      })
      .catch((error) => {
        console.error("🔴 Service Worker registration failed:", error);
      });
  });
}
