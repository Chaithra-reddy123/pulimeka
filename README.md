# Puli Meka — Village Tigers &amp; Goats 🐯🐐

A calm, handcrafted take on the traditional South Indian game **Puli Meka / Aadu Puli
Aatam / Bagh Chal** — set under a great banyan tree in an Indian village.

This build uses the **4 tigers vs 20 goats** variant on a 5×5 board.

Everything is **procedurally drawn on an HTML5 canvas** and the sound is **fully
synthesized with the Web Audio API**, so the game is a single, self‑contained,
**offline** experience with no image or audio downloads.

---

## Play it

Just open **`index.html`** in any modern browser (Chrome, Edge, Firefox, or an
Android phone/tablet browser).

> If your browser blocks local scripts loaded from `file://` (rare, some locked‑down
> setups), serve the folder over a tiny local server instead, e.g.
> `python -m http.server` and visit `http://localhost:8000`.

## Game modes

Choose from the palm‑leaf menu:

- **vs Computer** — you play one side; the AI plays the other (pick your side + skill).
- **2 Players** — *challenge a friend* on the same device (pass‑and‑play; tap for whoever's turn it is).
- **Watch** — sit back and watch the computer play both sides.

---

## Getting it on your phone (APK / install)

There are three ways, in order of effort. **Note:** the code is ready — the actual
`.apk` has to be built by a machine with the Android toolchain (I couldn't compile a
binary in this session), so pick whichever path suits you.

### Option A — Install as an app straight from the browser (no APK needed, easiest)
This is a full **PWA**, so on Android you can install it like a native app:
1. Host the folder somewhere over **https** (e.g. drag the folder onto
   [netlify.com/drop](https://app.netlify.com/drop), or use GitHub Pages).
2. Open the URL in **Chrome on Android** → menu **⋮ → Install app** (or tap the
   **📲 Install App** button on the start screen).
3. It runs **offline**, full‑screen, with its own home‑screen icon.

### Option B — Get a real `.apk` from GitHub Actions (no local tools)
A ready‑made workflow builds the APK in the cloud:
1. Push this folder to a GitHub repo.
2. Go to the repo's **Actions** tab → **Build Android APK** → **Run workflow**.
3. When it finishes, download **`pulimeka-debug-apk`** from the run's **Artifacts** —
   that's your installable `app-debug.apk`.

(The workflow is at `.github/workflows/android.yml`; it assembles the web files into
`www/`, installs Capacitor, adds the Android platform, and runs `gradlew assembleDebug`.)

### Option C — Build the APK locally with Capacitor
Requires Node.js, JDK 17, and Android Studio / SDK:

```bash
mkdir -p www && cp -r index.html manifest.webmanifest sw.js icon.svg src www/
npm init -y
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

`capacitor.config.json` (appId `com.village.pulimeka`, `webDir: www`) is already set up.

> Tip: for a Play‑Store‑ready **signed release** APK/AAB, generate a keystore and run
> `./gradlew assembleRelease` / `bundleRelease` after configuring signing in
> `android/app/build.gradle`.

### Option D — Signed release for Google Play (`.aab`)
Google Play needs a **signed release App Bundle (`.aab`)**. The workflow
`.github/workflows/android-release.yml` builds one for you in the cloud.

**1. Create an upload keystore** (needs a JDK's `keytool` locally, or use any machine
that has Java):

```bash
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Remember the **store password**, **alias** (`upload`), and **key password**.

**2. Base64‑encode the keystore** so it can live in a secret:

```powershell
# PowerShell (Windows)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) > keystore.b64.txt
```

```bash
# macOS / Linux
base64 -w0 upload-keystore.jks > keystore.b64.txt
```

**3. Add 4 repository secrets** — GitHub repo → **Settings → Secrets and variables →
Actions → New repository secret**:

| Secret name | Value |
|-------------|-------|
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | your store password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | your key password |

> Secrets are encrypted and never shown in logs — safe even on a public repo.
> **Keep `upload-keystore.jks` backed up privately; never commit it.**

**4. Run the workflow:** Actions → **Build Signed Release (Play Store)** → **Run
workflow** → enter a version name (e.g. `1.0.0`) → Run. Download the
**`pulimeka-release-aab`** artifact → that's `app-release.aab`.

**5. Upload to Google Play:**
- One‑time: create a [Google Play Console](https://play.google.com/console) developer
  account ($25), create the app, fill store listing, content rating, privacy policy,
  and data‑safety form.
- Use **Play App Signing** (recommended): upload your `.aab`; Google manages the final
  signing key while your keystore is the *upload* key.
- Create a **Production** (or Internal testing) release → upload `app-release.aab` → roll out.

Each cloud run auto‑increments `versionCode` (from the run number); bump the
**version name** input for each Play release.

---

## How to play

- **4 tigers** start on the four corners. **20 goats** wait beside the board.
- **Goats move first.** Each turn a goat is **placed** on any empty point.
  Goats cannot move until all 20 are placed.
- A **tiger** slides to a joined empty point, or **leaps straight over one goat**
  into the empty point beyond — that goat is eaten.
- Tigers cannot jump other tigers, and goats never jump.
- **Tigers win** by eating **5 goats**. **Goats win** by trapping every tiger so
  none can move.

### Controls
- **Placing a goat:** tap an empty point.
- **Moving a piece:** tap your piece, then tap a highlighted point
  (green = move, orange = capture).
- The whole board always stays on screen — no panning or zooming needed.

Pick your side (goats or tigers) and the opponent's skill (**Calm / Clever / Sharp**)
from the palm‑leaf menu.

---

## What's inside

| File | Role |
|------|------|
| `index.html` | Layout, earthy UI (wooden buttons, palm‑leaf panels), handwritten fonts |
| `src/board.js` | 5×5 board graph: adjacency + jump lines |
| `src/engine.js` | Pure rules: move generation, captures, win conditions |
| `src/ai.js` | Alpha‑beta search + village‑strength heuristics for both sides |
| `src/scene.js` | The village: sky, mud, huts, pond, coconut trees, banyan, villagers, leaves, butterflies, dragonflies, birds, dust |
| `src/render.js` | 2.5D board projection, chalk lines, pebble goats &amp; engraved tiger stones |
| `src/audio.js` | Synthesized ambience (wind, birds, cow bells) + click / capture SFX |
| `src/game.js` | Main loop, camera shake/zoom, animation, input, game modes, AI turns, menus |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | PWA install + offline caching + app icon |
| `capacitor.config.json`, `.github/workflows/android.yml` | Native Android APK packaging (local or cloud build) |

### Feel &amp; polish
- Slight top‑down (~45°) perspective; the board is chalk on mud with hand‑drawn wobble.
- Goats are small white **pebbles** with size variation and soft shadows; tigers are
  larger **dark polished stones** with engraved stripes.
- Pieces **slide and lift** as they move, kicking up **dust**; captures trigger a
  soft **camera shake**; the camera gives a gentle **zoom** on each move.
- Ambient life: falling banyan leaves, butterflies, dragonflies, occasional birds,
  drifting dappled sunlight, and two seated villagers who breathe, blink and smile.
- Baked static background for a smooth **60 fps** on phones (device pixel ratio capped at 2).

---

## Packaging for Android

Because it is plain HTML/JS/CSS, you can wrap it into a native APK with
[Capacitor](https://capacitorjs.com/):

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Puli Meka" com.village.pulimeka --web-dir .
npx cap add android
npx cap copy
npx cap open android   # build the APK in Android Studio
```

(Or Cordova / a Trusted Web Activity — any WebView wrapper works.)

---

## Honest notes / limitations
- This is a **stylized, hand‑illustrated 2.5D** scene rendered on a canvas — not a
  photorealistic 3D engine. True photoreal 3D would need modelled/textured assets
  and recorded audio, which aren't bundled here. The architecture (separate engine,
  scene and render layers) is designed so the visuals can be swapped for a 3D
  renderer (e.g. three.js) later without touching the rules.
- Audio is generated live; the "recorded village" character is approximated.

Enjoy the shade of the banyan. 🌳
