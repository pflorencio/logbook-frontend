import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

/* -------------------------------------------------------------
   PWA v1 — Manual Install Prompt Handling
------------------------------------------------------------- */
let deferredInstallPrompt: any = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  console.log("✅ PWA install prompt captured");
  window.dispatchEvent(new Event("pwa-install-ready"));
});

export async function promptPWAInstall() {
  if (!deferredInstallPrompt) {
    alert(
      "To install:\n\n" +
      "• Android: Chrome menu (⋮) → Install app\n" +
      "• iPhone: Share → Add to Home Screen\n\n" +
      "If already installed, you can open it from your home screen."
    );
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
}

export function isPWAInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-ignore
    window.navigator.standalone === true
  );
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
