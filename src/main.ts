import "./style.css";
import { Game } from "./game/Game";
import { W, H } from "./game/types";
import { isTouchDevice } from "./systems/Input";

declare global {
  interface Window {
    __DEAD_HOUSE_BOOTED__?: boolean;
  }
}

function applyDeviceClasses() {
  const touch = isTouchDevice();
  document.body.classList.toggle("is-touch", touch);
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("is-portrait", touch && portrait);
}

applyDeviceClasses();
window.addEventListener("resize", applyDeviceClasses);
window.addEventListener("orientationchange", applyDeviceClasses);

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  document.getElementById("boot-error")?.classList.add("show");
  throw new Error("Game canvas missing");
}

canvas.width = W;
canvas.height = H;

try {
  const game = new Game(canvas);
  window.__DEAD_HOUSE_BOOTED__ = true;
  document.getElementById("boot-error")?.classList.remove("show");

  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (err) {
  console.error(err);
  const el = document.getElementById("boot-error");
  if (el) {
    el.classList.add("show");
    el.insertAdjacentHTML(
      "beforeend",
      `<span>${err instanceof Error ? err.message : String(err)}</span>`,
    );
  }
}
