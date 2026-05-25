# AI Scholar

Static GitHub Pages site for the AI Scholar research preview.

Live URL:

- `https://aischolars.org/`

GitHub Pages is served with the custom domain declared in `CNAME`.

## Data Layout

Published data lives in `data/`:

- `data/stats.json`: aggregate counters for the homepage.
- `data/scholars-index.json`: lightweight list used by the scholar explorer.
- `data/scholars/{slug}.json`: full scholar profile, proposals, seed ideas, and papers.

The site loads detail JSON on demand, so each scholar's large data file is stored once.

## Updating Data

From the old project, rebuild the website data and copy it here:

```sh
cd /Users/mac/.openags/projects/ai-scholar/ai-scholar-web
npm run prebuild
cd /Users/mac/Pengsong/aischolars.github.io
rsync -a /Users/mac/.openags/projects/ai-scholar/ai-scholar-web/public/data/ data/
node scripts/generate-routes.mjs
```

Then preview locally:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.
