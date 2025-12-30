import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

/* -------------------------------------------------------------
   PWA v1 — Manual Install Prompt Handling
------------------------------------------------------------- */

let deferredInstallPrompt: any = null;
let installAvailable = false;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installAvailable = true;
  console.log("✅ PWA install prompt captured");
});

export function isPWAInstallAvailable() {
  return installAvailable;
}

export async function promptPWAInstall() {
  if (!deferredInstallPrompt) {
    alert("Install not available yet. Please use Chrome on Android.");
    return;
  }

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log("📦 PWA install outcome:", outcome);

  deferredInstallPrompt = null;
  installAvailable = false;
}

/* -------------------------------------------------------------
   PWA v1 — Service Worker Registration (Cashier)
------------------------------------------------------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log(
          "🟢 Cashier PWA Service Worker registered with scope:",
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

/* -------------------------------------------------------------
   React App Bootstrap
------------------------------------------------------------- */

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("❌ Root element #root not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
