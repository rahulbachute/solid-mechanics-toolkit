# 🔩 Solid Mechanics Toolkit

**Premium Interactive Engineering Education Platform**
**Course:** PCC-201-MEC — Solid Mechanics
**Programme:** Second Year Mechanical Engineering
**Curriculum:** SPPU NEP 2020
**Department:** Mechanical Engineering
**Institution:** Ajeenkya DY Patil School of Engineering, Pune

---

> *"Visualize • Simulate • Learn"*
> Making Solid Mechanics intuitive, visual, and engaging for every student.

---

## 📋 Table of Contents

1. [Platform Overview](#platform-overview)
2. [Features](#features)
3. [File Structure](#file-structure)
4. [GitHub Deployment](#github-deployment)
5. [GitHub Pages Hosting](#github-pages-hosting)
6. [Google Sheets Setup](#google-sheets-setup)
7. [Apps Script Deployment](#apps-script-deployment)
8. [Google Sites Embedding](#google-sites-embedding)
9. [PWA Setup](#pwa-setup)
10. [Android WebView](#android-webview)
11. [Customization Guide](#customization-guide)
12. [Troubleshooting](#troubleshooting)
13. [Future Roadmap](#future-roadmap)

---

## 🎯 Platform Overview

The **Solid Mechanics Toolkit** is a full-featured, single-page web application designed to replace passive textbook learning with active, visual engineering exploration. It runs entirely in the browser with no server required — just a static site.

### Design Philosophy
- **Visual First:** Every concept has an animated visualization
- **Step-by-step:** No black-box calculations — every step is shown
- **Real Engineering:** Industrial applications for every topic
- **Student-Centered:** Gamified with achievements, practice generator, and self-assessment

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 |
| Styling | CSS3 + Bootstrap 5 + Glassmorphism |
| Logic | Vanilla JavaScript (ES2020) |
| Charts | Plotly.js + Chart.js |
| Animations | GSAP + CSS Animations |
| 3D | Three.js (ready) |
| Math | Canvas API (simulations) |
| Backend | Google Apps Script |
| Database | Google Sheets |
| Hosting | GitHub Pages |
| PWA | Service Worker + Web App Manifest |

---

## ✨ Features

### 🧮 Interactive Calculators (6 tools)
| Calculator | Capabilities |
|-----------|-------------|
| **Stress-Strain** | Normal stress, strain, deformation, Poisson's effect; material presets; live stress-strain diagram |
| **SFD / BMD Generator** | 4 beam types; real-time SFD and BMD plots; support reactions |
| **Beam Deflection** | 4 load cases; deflection curve; serviceability check (L/360) |
| **Shaft Design** | ASME design code; Kb/Kt shock factors; torque from power; design diameter |
| **Euler Buckling** | 4 end conditions; slenderness ratio; Euler validity check; P vs λ curve |
| **Mohr's Circle** | Principal stresses; max shear; transformed stresses; interactive circle plot |

### ⚙️ Real-Time Simulations (4 simulators)
- **Beam Bending** — Live deflection curve responding to load/span/EI sliders
- **Shaft Torsion** — Animated helix showing twist angle vs torque/diameter
- **Column Buckling** — Visual buckling deformation as load approaches Pcr
- **Bending Stress Distribution** — Live cross-section stress diagram with neutral axis

### 🔬 Virtual Laboratory (5 experiments)
- **Universal Testing Machine** — Animated test with real-time stress-strain curve
- **Torsion Testing Machine** — Animated twist with calculated results
- **Beam Deflection Apparatus** — Load slider with live deflection and dial gauge reading
- **Charpy/Izod Impact Test** — Animated pendulum drop with energy absorption
- **Column Buckling Apparatus** — Progressive loading with visual buckling

### 🧠 Quiz Engine
- 17+ curated MCQ questions across all topics
- Configurable topic, difficulty (Easy/Medium/Hard), and count
- Timed quiz with countdown
- Instant feedback + explanation for every question
- Score display and per-question review

### 📐 Formula Explorer (20+ formulas)
- Searchable formula database
- Topic filtering (Stress, Bending, Torsion, Buckling, Mohr's Circle)
- Each card: formula expression, description, units, real-world application

### 🎲 Numerical Practice Generator
- 5 topic generators with randomized values
- Difficulty levels (Easy/Medium/Hard)
- Step-by-step hints
- Full solution reveal

### 🏭 Industrial Applications Showcase (12 applications)
- Crankshaft, Bridge Girder, Aircraft Wing Spar, Power Shaft
- Building Column, Gear Tooth, Pressure Vessel, Helical Spring
- Bicycle Frame, Valve Stem, Bolted Joint, Racing Chassis

### 🏆 Gamification
- 6 achievement badges (stored in localStorage)
- Toast notification on badge unlock
- Badge panel (FAB button)

### ♿ Accessibility
- Dark / Light theme toggle
- Font size toggle (14→16→18→20px cycle)
- Keyboard navigable
- High contrast colors by design

---

## 📁 File Structure

```
solid-mechanics-toolkit/
├── index.html          ← Main application (all sections)
├── style.css           ← Complete CSS (dark theme, glassmorphism, responsive)
├── script.js           ← All JavaScript (calculators, simulations, quiz, analytics)
├── appscript.gs        ← Google Apps Script backend (copy to Apps Script editor)
├── manifest.json       ← PWA Web App Manifest
├── service-worker.js   ← PWA Service Worker (offline support)
├── README.md           ← This file
└── icons/              ← Create this folder with PWA icons
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## 🚀 GitHub Deployment

### Step 1: Create Repository

1. Go to [github.com](https://github.com) → Sign in
2. Click **New Repository**
3. Name: `solid-mechanics-toolkit` (or any name)
4. Set to **Public**
5. **Do NOT** initialize with README (you already have files)
6. Click **Create Repository**

### Step 2: Upload Files

**Option A — GitHub Web Interface (Easiest)**
1. Open your repository on GitHub
2. Click **Add file → Upload files**
3. Drag and drop all 6 files:
   - `index.html`
   - `style.css`
   - `script.js`
   - `manifest.json`
   - `service-worker.js`
   - `README.md`
4. Add commit message: `"Initial release — Solid Mechanics Toolkit v1.0"`
5. Click **Commit changes**

**Option B — Git Command Line**
```bash
git init
git add .
git commit -m "Initial release — Solid Mechanics Toolkit v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/solid-mechanics-toolkit.git
git push -u origin main
```

---

## 🌐 GitHub Pages Hosting

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 2–3 minutes
7. Your site will be live at:

```
https://YOUR_USERNAME.github.io/solid-mechanics-toolkit/
```

> **Tip:** The URL appears in the Pages settings once deployed. Bookmark it and share with students.

### Custom Domain (Optional)
1. In Pages settings, add your custom domain (e.g., `solidmechanics.dypit.edu.in`)
2. Create a `CNAME` file in your repository with the domain name
3. Configure DNS A records at your domain registrar

---

## 📊 Google Sheets Setup

### Step 1: Create the Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a **new spreadsheet**
3. Rename it: `Solid Mechanics Analytics`
4. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

### Step 2: Get the Spreadsheet ID

The ID is the long string between `/d/` and `/edit` in the URL.

```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
                                        ↑ This is your SPREADSHEET_ID
```

---

## ⚙️ Apps Script Deployment

### Step 1: Open Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `appscript.gs`
4. Paste it into the editor

### Step 2: Configure Spreadsheet ID

In the script, replace:
```javascript
const SPREADSHEET_ID = 'YOUR_GOOGLE_SPREADSHEET_ID';
```
With your actual ID:
```javascript
const SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
```

### Step 3: Run Setup Function

1. In the function dropdown (top of editor), select `setupSpreadsheet`
2. Click **Run** (▶)
3. Grant permissions when prompted
4. You should see all 4 sheets created: `UserLogs`, `QuizLogs`, `ErrorLogs`, `SimulationLogs`

### Step 4: Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙ next to **Type** → Select **Web App**
3. Configure:
   - **Description:** `Solid Mechanics Analytics v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

### Step 5: Update script.js

Open `script.js` and replace:
```javascript
const GAS_URL = 'YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL';
```
With your deployment URL:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
```

Then commit and push the updated `script.js` to GitHub.

### ⚠️ Important Notes
- Every time you edit `appscript.gs`, you must create a **New Deployment** (not re-deploy)
- The new deployment URL changes — update `script.js` accordingly
- Analytics use `mode: 'no-cors'` — responses are opaque but data still writes to Sheet
- Test the endpoint: open the Web App URL in browser — you should see the health check JSON

---

## 🌍 Google Sites Embedding

Since Google Sites blocks JavaScript in iframes, follow this approach:

### Method 1: Embed via GitHub Pages URL (Recommended)

1. Open your Google Site
2. Click **Insert → Embed**
3. Select **By URL**
4. Enter:
   ```
   https://YOUR_USERNAME.github.io/solid-mechanics-toolkit/
   ```
5. Click **Insert**
6. Resize the iframe to full width, ~800–1000px height

> ⚠️ The toolkit's JavaScript runs from GitHub Pages — Google Sites just embeds the frame. All features work normally.

### Method 2: Link Button (Alternative)

If embedding is restricted:
1. In Google Sites, insert a **Button**
2. Link it to your GitHub Pages URL
3. Set to **Open in new tab**
4. Label: `🔩 Open Solid Mechanics Toolkit`

### Recommended Google Sites Layout

```
[Header: Solid Mechanics Toolkit — PCC-201-MEC]
[Embedded iframe: GitHub Pages URL — full width, 900px height]
[Below: Quick links to specific sections]
```

---

## 📱 PWA Setup

### Creating App Icons

You need PNG icons in these sizes. Use any icon generator:

**Option A — Free Online:** [realfavicongenerator.net](https://realfavicongenerator.net)
1. Upload a mechanical gear / atom image (512×512 PNG recommended)
2. Download the generated icon pack
3. Rename files to match: `icon-72.png`, `icon-96.png`, etc.
4. Upload the `icons/` folder to your GitHub repository

**Option B — Create Simple Icon with Canvas:**
- Use a dark blue background (`#060b18`)
- Add a gear/atom symbol in cyan (`#00d4ff`)
- Text: "SM" in Rajdhani font

### Installing as PWA

**On Desktop (Chrome/Edge):**
1. Visit your GitHub Pages URL
2. Look for the install icon in the address bar (📥)
3. Click **Install**
4. The app opens as a standalone window

**On Android:**
1. Open in Chrome
2. Tap the **⋮ menu → Add to Home Screen**
3. Tap **Add**
4. Icon appears on home screen

**On iOS (Safari):**
1. Open in Safari
2. Tap **Share → Add to Home Screen**
3. Tap **Add**

### Offline Capability

Once installed and visited once:
- All core files are cached by the Service Worker
- CDN libraries (Plotly, Chart.js, Bootstrap) are cached on first load
- Students can use calculators, formulas, and quiz **offline**
- Simulations work offline (pure JavaScript)
- Analytics are skipped when offline

---

## 🤖 Android WebView Integration

### Basic Setup

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET"/>

<application
    android:usesCleartextTraffic="false">
    <activity android:name=".MainActivity">
        ...
    </activity>
</application>
```

```java
// MainActivity.java
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();

        // Required settings
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);       // For localStorage (badges)
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setSupportZoom(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // For Canvas API (simulations)
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);

        webView.setWebViewClient(new WebViewClient());

        // Load your GitHub Pages URL
        webView.loadUrl("https://YOUR_USERNAME.github.io/solid-mechanics-toolkit/");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
```

```xml
<!-- activity_main.xml -->
<WebView
    android:id="@+id/webView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

### Gradle Dependencies

```gradle
// build.gradle (app level)
android {
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

### Advanced: Load from Bundled Assets (Full Offline)

For a completely offline Android app:

1. Copy all 6 files to `app/src/main/assets/` in Android Studio
2. Change the load URL:
```java
webView.loadUrl("file:///android_asset/index.html");
```
3. The Service Worker won't work with `file://`, but all core features will function offline

---

## 🎨 Customization Guide

### Changing Colors

In `style.css`, edit the `:root` variables:

```css
:root {
  --accent:  #00d4ff;   /* Primary cyan — change to your brand color */
  --accent2: #7b2fff;   /* Secondary purple */
  --accent3: #ff6b35;   /* Warning orange */
  --accent4: #00ff9d;   /* Success green */
}
```

### Adding Your Institution Branding

In `index.html`, update the footer:
```html
<div class="footer-brand">
  <span class="brand-text">Solid<span class="accent">Mechanics</span> Toolkit</span>
  <p>PCC-201-MEC · SPPU NEP 2020 · Second Year Mechanical Engineering</p>
</div>
<div class="footer-links">
  <span>Department of Mechanical Engineering</span>
  <span>YOUR INSTITUTION NAME HERE</span>  <!-- ← Edit this -->
</div>
```

### Adding New Quiz Questions

In `script.js`, add to the `QUESTIONS` array:
```javascript
{
  topic: 'stress',        // stress | bending | torsion | buckling | mohr
  difficulty: 'medium',   // easy | medium | hard
  q: 'Your question text here?',
  opts: ['Option A', 'Option B', 'Option C', 'Option D'],
  ans: 1,                 // 0-indexed correct answer
  explain: 'Explanation shown after answering.'
},
```

### Adding New Formulas

In `script.js`, add to the `FORMULAS` array:
```javascript
{
  topic: 'bending',
  name: 'Formula Name',
  expr: 'σ = My/I',
  desc: 'Description of what this formula represents.',
  units: 'M in N·mm, y in mm, I in mm⁴ → σ in MPa',
  app: 'Real-world application example'
},
```

### Updating the GAS URL (After Redeployment)

Find this line in `script.js`:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/OLD_URL/exec';
```
Replace with your new deployment URL.

---

## 🔧 Troubleshooting

### Charts Not Rendering
- **Cause:** Plotly.js CDN failed to load
- **Fix:** Check internet connection; ensure CDN URLs are not blocked on campus network

### Analytics Not Logging
- **Cause:** GAS URL not updated or deployment issue
- **Fix:**
  1. Verify `GAS_URL` in `script.js` is your actual deployment URL
  2. Open the GAS URL in browser — should return `{"status":"...Running..."}`
  3. Check Apps Script Logs: Extensions → Apps Script → Executions

### Simulations Laggy on Mobile
- **Cause:** Canvas rendering on low-end devices
- **Fix:** Reduce particle count in `initParticles()` (change `80` to `40`)

### PWA Install Button Not Appearing
- **Cause:** Must be served over HTTPS; GitHub Pages provides HTTPS automatically
- **Fix:** Ensure you're visiting `https://` not `http://`

### Google Sites Embedding Blocked
- **Cause:** Some institutional Google Workspace policies block external embeds
- **Fix:** Use the "Link Button" method instead; or ask IT to whitelist `github.io`

### Service Worker Not Registering
- **Cause:** `service-worker.js` must be in the **root** of the repository
- **Fix:** Ensure the file is at the same level as `index.html`

### Icons Missing (PWA)
- **Cause:** `icons/` folder not created
- **Fix:** Create the `icons/` folder in your repo and add PNG icons at required sizes

---

## 🛣️ Future Roadmap

### Version 1.1 — Upcoming
- [ ] MathJax-rendered formulas in all calculators
- [ ] Three.js 3D beam and shaft visualization
- [ ] PDF/Print report generation per calculator
- [ ] Student name input with report download

### Version 1.2 — Planned
- [ ] Combined loading calculator (bending + torsion + axial)
- [ ] Thick cylinder / pressure vessel calculator
- [ ] Curved beam stress calculator
- [ ] Fatigue life estimator (S-N curve)

### Version 2.0 — Future
- [ ] AI Tutor integration (Anthropic Claude API)
- [ ] Personalized weak-topic detection
- [ ] Student leaderboard (Google Sheets backend)
- [ ] Peer-to-peer problem sharing
- [ ] Multilingual support (Marathi / Hindi)

### Sister Toolkits (Architecture Ready)
- **Fluid Mechanics Toolkit** — Bernoulli, pipe flow, losses
- **Thermodynamics Toolkit** — Rankine, Carnot, steam tables
- **Machine Design Toolkit** — Fatigue, joints, springs, bearings
- **Manufacturing Toolkit** — Machining parameters, tolerances

---

## 📜 License

This educational platform is developed for academic use at Ajeenkya DY Patil School of Engineering, Pune.

**For educational and non-commercial use.**

---

## 👨‍💼 Developer

**Dr. Rahul Bachute**
Assistant Professor, Department of Mechanical Engineering
Ajeenkya DY Patil School of Engineering, Pune

- GitHub: [github.com/rahulbachute](https://github.com/rahulbachute)
- Google Site: [sites.google.com/view/drrahulbachute](https://sites.google.com/view/drrahulbachute)

---

## 🙏 Acknowledgements

- SPPU NEP 2020 Curriculum Design Committee
- Students of TE Mech and BE Mech (2024–25 batch) for feedback
- Open-source libraries: Plotly.js, Chart.js, Bootstrap 5, GSAP, Font Awesome

---

*Built with ❤️ for Engineering Education — because every student deserves to understand mechanics visually.*
