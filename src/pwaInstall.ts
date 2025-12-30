let deferredPrompt: any = null;

export function registerPWAInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // Prevent Chrome from auto-handling
    deferredPrompt = e;
    console.log("✅ PWA install prompt captured");
  });
}

export async function promptPWAInstall() {
  if (!deferredPrompt) {
    alert("Install not available yet. Please use Chrome on Android.");
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  console.log("PWA install outcome:", outcome);
  deferredPrompt = null;
}
