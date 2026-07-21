import "./style.css";
import { Game } from "./game/Game";
import { W, H } from "./game/types";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
canvas.width = W;
canvas.height = H;

const game = new Game(canvas);

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
