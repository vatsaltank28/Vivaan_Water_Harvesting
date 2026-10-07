# Vivaan Water Harvesting · N.S. & Associates

Website for N.S. & Associates (rainwater harvesting and water management consultants since 2001) and its sister company Chaitanya Rain Harvest Products & Systems.

The landing page is a scroll-driven film: scrolling scrubs a rainwater-harvesting animation (landscape on desktop, vertical on phones) while chapters, numbers and products appear over it.

## Run locally

Any static server works:

```bash
python -m http.server 5173
```

Then open http://localhost:5173/.

## Edit pages

Page content lives in `src/pages/*.html` and blog/gallery data in `src/ns-data.json`. After editing, regenerate the site so every page shares the same nav and footer:

```bash
python src/build.py
```

## Structure

| Path | What it is |
|---|---|
| `index.html`, `about.html`, ... | Built pages (generated, do not edit by hand) |
| `src/build.py` | Page builder: shared head, nav, footer, gallery, blog |
| `styles.css` | Dark theme and all components |
| `common.js` | Smooth scroll (Lenis), reveals, counters, forms |
| `components.js` | Menu, bento, flowing menu, scroll stack, galleries, folder, flip cards, branched menu, background threads |
| `app.js` | Scroll-scrubbed film on the landing page |
| `frames/d`, `frames/m` | Film frames for desktop and phone |
| `img/` | Logos, client logos, events, press, project sites, blog and product photos |

Respects `prefers-reduced-motion` (static frame and normal scrolling).
