# For Aamina 💛

A tiny romantic website with 4 pages:

- **index.html** — home page with a 3D particle "burst" animation that reassembles into the name *Aamina*
- **about.html** — a written page about her
- **quotes.html** — a curated set of quotes
- **quiz.html** — a playful swipeable quiz with a progress bar and an animated confetti reveal at the end

Fully responsive — tuned for phones (portrait & landscape), tablets, and desktop. Respects `prefers-reduced-motion` throughout.

Built with plain HTML/CSS/JS + [Three.js](https://threejs.org/) (loaded from a CDN, no build step needed).

## Run it locally

Just open `index.html` in a browser — but since it uses JS modules-free `<script>` tags loaded over `file://`, some browsers restrict `canvas.getImageData` on local files. If the animation looks off locally, run a tiny local server instead:

```bash
# from inside the aamina-site folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Host it on GitHub Pages (free)

1. **Create a new repository** on GitHub (e.g. `for-aamina`). Keep it Public (GitHub Pages on free accounts needs a public repo, unless you're on a paid plan).
2. **Upload these files** to the repo:
   - `index.html`
   - `about.html`
   - `quotes.html`
   - `quiz.html`
   - `style.css`
   - `script.js`
   - `README.md` (optional)

   Easiest way: on the repo page, click **Add file → Upload files**, drag all the files in, and commit.

   Or with git from your computer:
   ```bash
   git init
   git add .
   git commit -m "for Aamina"
   git branch -M main
   git remote add origin https://github.com/<your-username>/for-aamina.git
   git push -u origin main
   ```

3. **Turn on GitHub Pages**:
   - Go to the repo's **Settings → Pages**
   - Under "Build and deployment" → **Source**, choose **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)** → **Save**

4. Wait about a minute, then your site will be live at:
   ```
   https://<your-username>.github.io/for-aamina/
   ```
   GitHub shows the exact link at the top of the Pages settings once it's ready.

That's it — no build tools, no server needed. Every time you push a change to `main`, the live site updates automatically within a minute or two.

## Customizing later

- **Change the name**: edit the `NAME` constant at the top of `script.js`, and the `<title>` tags / copy in the HTML files.
- **Colors**: all colors live as CSS variables at the top of `style.css` (`:root { ... }`).
- **Quotes**: edit the `<li class="quote-item">` blocks in `quotes.html`.
- **About text**: edit the paragraphs in `about.html`.
