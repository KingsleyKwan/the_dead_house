import type { Vec2 } from "../game/types";
import { W, H } from "../game/types";

export function isTouchDevice(): boolean {
  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

export class Input {
  readonly mouse: Vec2 = { x: W / 2, y: H / 2 };
  readonly p2Aim: Vec2 = { x: W * 0.65, y: H / 2 };
  shootQueued: boolean[] = [false, false];
  reloadQueued: boolean[] = [false, false];
  startPressed = false;
  join2pPressed = false;
  keys = new Set<string>();
  readonly touch = isTouchDevice();

  private canvas: HTMLCanvasElement;
  private outsideClick = false;
  private aimingTouchId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.shootQueued[0] = true;
      }
    });
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("mousedown", (e) => {
      if (!(e.target instanceof Node) || !canvas.contains(e.target)) {
        const t = e.target as HTMLElement | null;
        if (t?.closest?.("#btn-reload")) return;
        this.outsideClick = true;
      }
    });

    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          this.setMouseFromClient(t.clientX, t.clientY);
          this.aimingTouchId = t.identifier;
          this.shootQueued[0] = true;
          // Edge tap reloads like arcade off-screen reload
          if (this.isOffPlayfield(this.mouse.x, this.mouse.y)) {
            this.reloadQueued[0] = true;
            this.shootQueued[0] = false;
          }
        }
      },
      { passive: false },
    );
    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (this.aimingTouchId === null || t.identifier === this.aimingTouchId) {
            this.setMouseFromClient(t.clientX, t.clientY);
            this.aimingTouchId = t.identifier;
          }
        }
      },
      { passive: false },
    );
    canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === this.aimingTouchId) this.aimingTouchId = null;
        }
      },
      { passive: false },
    );
    canvas.addEventListener(
      "touchcancel",
      (e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === this.aimingTouchId) this.aimingTouchId = null;
        }
      },
      { passive: false },
    );

    // Block page scroll / pinch while playing
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.target === canvas || canvas.contains(e.target as Node)) {
          e.preventDefault();
        }
      },
      { passive: false },
    );
  }

  bindReloadButton(btn: HTMLElement | null) {
    if (!btn) return;
    const fire = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.reloadQueued[0] = true;
    };
    btn.addEventListener("click", fire);
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.reloadQueued[0] = true;
      },
      { passive: false },
    );
  }

  private onMouseMove(e: MouseEvent) {
    this.setMouseFromClient(e.clientX, e.clientY);
  }

  private setMouseFromClient(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * W;
    this.mouse.y = ((clientY - rect.top) / rect.height) * H;
    this.mouse.x = Math.max(0, Math.min(W, this.mouse.x));
    this.mouse.y = Math.max(0, Math.min(H, this.mouse.y));
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    if (e.code === "KeyR") this.reloadQueued[0] = true;
    if (e.code === "KeyF") this.reloadQueued[1] = true;
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      this.startPressed = true;
    }
    if (e.code === "Digit2" || e.code === "Numpad2") this.join2pPressed = true;
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.shootQueued[1] = true;
    }
  }

  consumeShoot(player: 0 | 1): boolean {
    const v = this.shootQueued[player];
    this.shootQueued[player] = false;
    return v;
  }

  consumeReload(player: 0 | 1): boolean {
    const outside = player === 0 && this.outsideClick;
    if (outside) this.outsideClick = false;
    const v = this.reloadQueued[player] || outside;
    this.reloadQueued[player] = false;
    return v;
  }

  consumeStart(): boolean {
    const v = this.startPressed;
    this.startPressed = false;
    return v;
  }

  /** Menus: Space/Enter or a tap/click on the canvas. */
  consumeMenuConfirm(): boolean {
    const shoot = this.consumeShoot(0);
    return this.consumeStart() || shoot;
  }

  consumeJoin2p(): boolean {
    const v = this.join2pPressed;
    this.join2pPressed = false;
    return v;
  }

  updateP2(dt: number) {
    const speed = 280 * dt;
    if (this.keys.has("ArrowLeft")) this.p2Aim.x -= speed;
    if (this.keys.has("ArrowRight")) this.p2Aim.x += speed;
    if (this.keys.has("ArrowUp")) this.p2Aim.y -= speed;
    if (this.keys.has("ArrowDown")) this.p2Aim.y += speed;
    this.p2Aim.x = Math.max(20, Math.min(W - 20, this.p2Aim.x));
    this.p2Aim.y = Math.max(20, Math.min(H - 20, this.p2Aim.y));
  }

  /** True when click is near screen edge (arcade off-screen reload). */
  isOffPlayfield(x: number, y: number): boolean {
    const margin = this.touch ? 48 : 28;
    return x < margin || x > W - margin || y < margin || y > H - margin;
  }
}
