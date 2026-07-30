"use strict";

// One of the three places the display name lives (with <title> and the manifest).
const APP_NAME = "NewApp";

function renderDate() {
  const el = document.getElementById("today-date");
  if (!el) return;
  el.textContent = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // offline support is optional; a failed registration must not break the app
  });
}

document.title = APP_NAME;
renderDate();
registerServiceWorker();
