# Puli Meka — AI image prompts (for photoreal assets)

## ⭐ IMPROVE your current image + add the full 4 tigers / 16 goats setup
Use this on top of the chalk-board photo you already generated (image-edit / "use
this image" / img2img). Keep the same floor and board; just sharpen it and add pieces.

> Use the same dark textured earth floor and white chalk board, same composition and
> top-down camera. Improve realism: crisper, brighter chalk lines with fine chalk dust,
> sharper focus, richer warm afternoon sunlight from the upper-left, natural soft
> shadows. Now place the game pieces in the starting position: **4 dark polished stones
> with carved tiger stripes** on the four fixed top points (the apex circle and the three
> points on the top row), and **16 smooth white-grey river pebbles** resting on the other
> board intersections, leaving **2 points empty**. Each stone has a soft natural contact
> shadow and sits slightly into the dust. Photorealistic, high detail, 8k.
>
> **Negative:** cartoon, text, watermark, hands, people, extra boards, neon, plastic,
> floating pieces, blurry.

Tip: if the pieces land in the wrong spots, generate the board scene and the pieces
separately (sections 1–3 below) and I'll place the pieces precisely in the game.

---


These prompts generate the **realistic** look from the village floor video. Generate
each, then **paste the images back into the chat** and I'll wire them into the game.

General rules for every image:
- **Lighting:** warm late‑afternoon sun coming from the **upper‑left**, soft shadows.
- **Camera:** slight **top‑down ~45°** angle (as if sitting on the floor looking at the board).
- **Palette:** earthy — mud brown, chalk white, grey/cream pebbles, near‑black stones.
- Keep it **natural / handcrafted**, NOT cartoon, NOT neon, NO text, NO logos.

---

## 1) Background board scene  →  save as `bg_scene.png`  (recommended 1536×2048, portrait)
> Photorealistic top‑down view of a traditional South Indian village game board drawn
> in white limestone chalk on smooth grey‑brown mud/stone floor. Slightly uneven
> hand‑drawn chalk lines forming a triangular "Puli Meka / Aadu Puli" board (an apex at
> top, slanted lines, horizontal and vertical grid lines, and two triangular shapes on
> the left and right). The chalk is a little worn and dusty. Warm afternoon sunlight,
> soft natural shadows, faint dried leaves and tiny stones scattered around the edges.
> No game pieces on the board. High detail, realistic texture, photograph, 8k.
>
> **Negative:** people, hands, text, watermark, cartoon, 3d render look, blurry, pieces, coins.

## 2) Goat pebble  →  save as `goat.png`  (512×512, **transparent background**)
> A single small smooth white‑grey river pebble, photorealistic, top‑down 45° view,
> natural stone texture with subtle speckles, gentle glossy highlight from upper‑left,
> isolated on a transparent background, soft contact shadow baked separately, studio
> product photo, high detail.
>
> **Negative:** board, other stones, text, cartoon, harsh reflections, background clutter.

*(Optional: generate 3–4 pebble variations `goat1.png`…`goat4.png` with slightly
different shapes/tints for natural variety.)*

## 3) Tiger stone  →  save as `tiger.png`  (640×640, **transparent background**)
> A single dark polished stone, larger than a pebble, with **engraved tiger stripes**
> carved into the surface, deep brown‑black with a premium handcrafted look and a soft
> glossy highlight from the upper‑left, photorealistic top‑down 45° view, isolated on a
> transparent background, studio product photo, high detail.
>
> **Negative:** cartoon tiger face, text, board, bright colors, plastic look.

---

## Optional extra assets (for the full village scene around the board)

### 4) Banyan tree frame  →  `banyan_frame.png` (transparent, wide 2048×1024)
> Photorealistic large Indian banyan tree canopy with hanging aerial roots, seen from
> below/behind, framing the top of the scene, lush green leaves with warm sunlight
> filtering through, transparent background where there are no leaves.

### 5) Seated villager (optional, transparent) → `villager1.png`, `villager2.png`
> Photorealistic Indian villager sitting cross‑legged on the ground, traditional simple
> clothing (dhoti / saree), relaxed posture, viewed from a slight top‑down angle,
> isolated on transparent background, warm afternoon light.

### 6) Ground texture tile → `mud_tile.png` (1024×1024, seamless)
> Seamless tileable photorealistic texture of smooth packed mud / village floor,
> grey‑brown, subtle cracks and tiny pebbles, warm even lighting, top‑down.

---

## After you generate them
- Put the files in this `art/` folder (or just paste them into the chat).
- Tell me and I'll swap the game's drawn art for these images (background + piece sprites),
  keeping the animations, shadows and 60fps.
- If a piece image doesn't have a transparent background, that's fine — tell me and I'll
  handle it, but transparent PNGs look best.
