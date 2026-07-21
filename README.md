# THE DEAD HOUSE

Browser arcade rail shooter — a fan tribute inspired by classic light-gun games like *The House of the Dead*.

All art, audio, and branding are original. Not affiliated with SEGA.

## Play (important)

Do **not** open `index.html` directly in the browser (that shows a blank/white page with no game). Use one of these:

### Local

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build / GitHub Pages

```bash
npm run build
```

This writes a static site to `docs/`. In the GitHub repo: **Settings → Pages → Deploy from branch → `main` / `/docs`**.

Then play at: `https://kingsleykwan.github.io/the_dead_house/`

## Controls

| Action | Player 1 | Player 2 | Mobile |
|--------|----------|----------|--------|
| Aim | Mouse | Arrow keys | Drag finger |
| Shoot | Left click | Ctrl | Tap |
| Reload | `R` or click outside | `F` | **RELOAD** button or tap screen edge |
| Start / Continue | Space / Enter / click | — | Tap screen |
| Join mid-game | — | Press `2` | Desktop only |

On phones and tablets, landscape orientation is recommended.

## How to play

- Clear waves of the undead while the camera rides the rails through each chapter.
- Your pistol holds **6 rounds**. When empty, **RELOAD** flashes — reload off-screen (or press R).
- **Headshots** drop enemies faster.
- **Do not shoot civilians** — that costs a life. Keep threats off them to rescue them.
- Shoot crates for life / score items.
- Saving civilians unlocks **safer branching routes**.
- Each chapter ends in a **boss**. Survive all four for an ending based on score and rescues.
- Local **2-player co-op** supported.

## Chapters

1. **Tragedy** — approach & courtyard → The Chariot  
2. **Revenge** — mansion floors → The Hanged Man  
3. **Truth** — lab & caves → The Hermit  
4. **The Dead House** — sanctum → The Magician  

## Disclaimer

This is an original web game that recreates the *feel* and arcade UX of 1990s rail shooters for education and fun. It does not include SEGA assets, ROMs, or copyrighted material.
