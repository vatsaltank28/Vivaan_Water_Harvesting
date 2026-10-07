"""Build static pages: wraps each fragment in src/pages with the shared head, nav and footer,
and generates gallery.html, blog.html and post-<slug>.html from src/ns-data.json.
Run:  python src/build.py   (from the site folder)
Fragment header lines (before the first blank line):  title: ...  / desc: ... / nav: key / landing: 1
"""
import pathlib, re, json, html, os

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"
DATA = json.loads((ROOT / "src" / "ns-data.json").read_text(encoding="utf8"))

NAV = [("about", "about.html", "About"), ("services", "services.html", "Services"),
       ("projects", "projects.html", "Projects"), ("clients", "clients.html", "Clients"),
       ("products", "products.html", "Products"), ("gallery", "gallery.html", "Gallery"),
       ("blog", "blog.html", "Blog")]
MENU = NAV + [("faq", "faq.html", "FAQ"), ("contact", "contact.html", "Contact")]

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#06090F">
<link rel="icon" href="img/ns-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
{preload}<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<canvas id="threads" aria-hidden="true"></canvas>
"""

def nav(active, landing):
    links = "".join(f'<a href="{h}"{" aria-current=page" if k == active else ""}>{t}</a>' for k, h, t in NAV)
    menu = "".join(f'<li><a href="{h}">{t}</a></li>' for k, h, t in MENU)
    cls = "nav" if landing else "nav nav--page"
    return f"""<header class="{cls}" id="nav">
  <div class="nav__in">
    <a class="brand" href="index.html" aria-label="N.S. &amp; Associates and Vivaan Water &amp; Enviro Solutions, home"><img src="img/brand/ns-logo-header.png" alt="N.S. &amp; Associates | Vivaan Water &amp; Enviro Solutions" width="340" height="57"></a>
    <nav class="pill-nav" aria-label="Primary">{links}</nav>
    <a class="btn btn--sm nav__cta" href="contact.html">Talk to an Expert <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="smenu" aria-label="Open menu"><span></span><span></span></button>
  </div>
</header>
<div class="smenu" id="smenu" aria-hidden="true">
  <div class="smenu__scrim"></div>
  <div class="smenu__layer"></div><div class="smenu__layer"></div>
  <nav class="smenu__panel" aria-label="Menu">
    <ul class="smenu__list"><li><a href="index.html">Home</a></li>{menu}</ul>
    <div class="smenu__foot"><a href="tel:+919867344735">+91 98673 44735</a><a href="mailto:info@nsassociates.co.in">info@nsassociates.co.in</a><span>Vile Parle (East), Mumbai</span></div>
  </nav>
</div>
"""

FOOT = """<footer class="foot">
  <div class="wrap">
    <div class="foot__top">
      <div>
        <a class="brand" href="index.html"><img src="img/brand/ns-logo-header.png" alt="N.S. &amp; Associates | Vivaan Water &amp; Enviro Solutions" width="340" height="57" loading="lazy"></a>
        <address>Planet Industrial Premises C.S. Ltd.,<br>205, B-Wing, 2nd Floor, Subhash Road,<br>Near Mahila Sangh School, Vile Parle (East),<br>Mumbai 400057, Maharashtra, India</address>
        <div class="social">
          <a href="https://www.facebook.com/NSassociates.RainwaterHarvestingConsultingServices/" aria-label="Facebook"><i class="ph ph-facebook-logo"></i></a>
          <a href="gallery.html#videos" aria-label="Videos"><i class="ph ph-youtube-logo"></i></a>
          <a href="mailto:info@nsassociates.co.in" aria-label="Email"><i class="ph ph-envelope-simple"></i></a>
        </div>
      </div>
      <div>
        <h3>Company</h3>
        <ul>
          <li><a href="about.html">About us</a></li>
          <li><a href="about.html#leadership">Leadership</a></li>
          <li><a href="projects.html#recognition">Achievements</a></li>
          <li><a href="about.html#events">Events &amp; training</a></li>
          <li><a href="clients.html">Clientele</a></li>
          <li><a href="contact.html#associate">Associate with us</a></li>
        </ul>
      </div>
      <div>
        <h3>Services</h3>
        <ul>
          <li><a href="services.html#design">RWH system design</a></li>
          <li><a href="services.html#feasibility">Feasibility study</a></li>
          <li><a href="services.html#audit">Water audit &amp; neutrality</a></li>
          <li><a href="services.html#surveys">Borewell &amp; hydrogeology</a></li>
          <li><a href="services.html#green">Green building</a></li>
          <li><a href="services.html#noc">Groundwater NOC</a></li>
        </ul>
      </div>
      <div>
        <h3>Resources</h3>
        <ul>
          <li><a href="gallery.html">Image gallery</a></li>
          <li><a href="gallery.html#videos">Video gallery</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="faq.html">FAQ</a></li>
          <li><a href="tel:+919867344735">+91 98673 44735</a></li>
          <li><a href="mailto:info@nsassociates.co.in">info@nsassociates.co.in</a></li>
        </ul>
      </div>
    </div>
    <div class="foot__sister">
      <div><b>Chaitanya Rain Harvest Products &amp; Systems Pvt. Ltd.</b><br>Our sister company for rainwater harvesting products, Vile Parle (E), Mumbai.</div>
      <a class="btn btn--sm btn--ghost" href="products.html">View products <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
    </div>
    <div class="foot__sub">
      <span>&copy; <span id="yr">2026</span> N.S. &amp; Associates. Rainwater harvesting consultants since 2001.</span>
      <span>Mumbai, serving clients across India</span>
    </div>
  </div>
</footer>
"""

SCRIPTS = """<script src="vendor/lenis.min.js"></script>
<script src="common.js"></script>
<script src="components.js"></script>
{extra}</body>
</html>
"""

def page(name, title, desc, active, body, landing=False):
    out = HEAD.format(title=html.escape(title, quote=True), desc=html.escape(desc, quote=True),
                      preload='<link rel="preload" as="image" href="frames/d/001.webp">\n' if landing else "")
    out += nav(active, landing)
    out += '<main id="main">\n' + body.strip() + "\n</main>\n" + FOOT
    out += SCRIPTS.format(extra='<script src="app.js"></script>\n' if landing else "")
    (ROOT / name).write_text(out, encoding="utf8")
    print("built", name)

def ph(src, alt, cls="", attrs=""):
    """Image wrapped in a shimmer loader."""
    return f'<div class="ld {cls}"{attrs}><img src="{src}" alt="{html.escape(alt, quote=True)}" loading="lazy" decoding="async"></div>'

# ---------- fragments ----------
for frag in sorted(PAGES.glob("*.html")):
    raw = frag.read_text(encoding="utf8")
    header, body = raw.split("\n\n", 1)
    meta = dict(re.findall(r"^(\w+):\s*(.*)$", header, re.M))
    page(frag.name, meta["title"], meta["desc"], meta.get("nav", ""), body, meta.get("landing") == "1")

# ---------- captions ----------
def caption(path):
    n = os.path.splitext(os.path.basename(path))[0]
    n = re.sub(r"-(sm|\d)(-\d)*$", "", n)
    n = re.sub(r"-sm(-\d)?$", "", n)
    n = re.sub(r"(-nsassociates|-nirav-sariya|-rwh-consultants)", "", n)
    n = n.replace("_", " ").replace("-", " ")
    n = re.sub(r"\s+\d+$", "", n).strip()
    fixes = {"ars gsda hq pune": "Artificial recharge at GSDA HQ, Pune", "iit training godrej": "IIT Mumbai training at a Godrej site",
             "iit training godrej2": "IIT Mumbai training at a Godrej site", "iwwa mumbai training": "IWWA Mumbai RWH training",
             "iwwa national seminar": "IWWA-IITB national seminar", "ongc seminar": "ONGC and IIT Mumbai skill development training",
             "pcerf seminar": "PCERF smart cities seminar, Pune", "ulhasnagar mc": "Training at Ulhasnagar Municipal Corporation",
             "seminar watermanagement mchi credai kdmc": "Water management seminar, MCHI-CREDAI and KDMC",
             "igbc platinum certificate bandra residential society": "IGBC Platinum, Jade Gardens, Bandra",
             "cia awards 2016 rain water harvesting": "CIA World Construction Awards 2016", "cia world construction awards 2016": "CIA World Construction Awards 2016",
             "cia world construction award 2016": "CIA World Construction Award 2016", "cia wold construction award 2020": "CIA World Construction Award 2020",
             "godrej appreciation letter": "Appreciation letter from Godrej", "chemcon appreciation letter": "Appreciation letter from Chemcon",
             "concrete india": "Concrete India feature", "article in indian express chandigarh 2016 march 23": "Indian Express, Chandigarh, 23 March 2016",
             "indian express": "Indian Express", "sakal media": "Sakal", "home magazine": "Home magazine feature", "ambuja": "Ambuja Foundation"}
    key = re.sub(r"\d+$", "", n).strip()
    if key in fixes: return fixes[key]
    if n in fixes: return fixes[n]
    if "hpcl" in n: return "HPCL Residential Colony, Chembur"
    if "ambrosial" in n: return "Ambrosial Developers, Easter Heights, Santacruz"
    if "mahindra" in n: return "Mahindra & Mahindra, Zahirabad"
    if "prince of wales" in n: return "Prince of Wales Museum, Mumbai"
    return n[:1].upper() + n[1:]

def listdir(sub):
    d = ROOT / "img" / sub
    return [f"img/{sub}/{p.name}" for p in sorted(d.iterdir()) if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]

# ---------- gallery ----------
press, events, projects = listdir("press"), listdir("events"), [p for p in listdir("projects") if "site-photo" in p]
videos = ["4zD9Z-ypukc", "Ay1GPXAyivw", "C6q3DhWo6pE", "GAp1oW81QgE", "Md51UN-uyhc", "WTlqRNls39Q", "fvLNCoaVFO8", "mLimJLjG-bc", "z_UMqDIIX-g"]
figs = []
for cat, items in (("events", events), ("press", press), ("sites", projects)):
    for src in items:
        c = caption(src)
        figs.append(f'<figure class="ld" data-cat="{cat}" data-lb data-group="gallery" data-caption="{html.escape(c, quote=True)}"><img src="{src}" alt="{html.escape(c, quote=True)}" loading="lazy" decoding="async"><figcaption>{html.escape(c)}</figcaption></figure>')
vids = "".join(f'<div class="yt" data-id="{v}" data-title="N.S. &amp; Associates video {i + 1}"><img src="https://i.ytimg.com/vi/{v}/hqdefault.jpg" alt="Video thumbnail" loading="lazy"><button aria-label="Play video {i + 1}"><span><i class="ph ph-play"></i></span></button></div>' for i, v in enumerate(videos))
gallery_body = f"""
<section class="phero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><span>Gallery</span></nav>
    <h1 class="h-hero">Seen on <span class="accent">site</span>, in the <span class="accent-r">press</span>.</h1>
    <p class="lead">Training sessions, seminars, awards, press coverage and photos from our project sites.</p>
  </div>
</section>
<section class="sec" style="padding-top:12px">
  <div class="wrap">
    <div class="filters" role="group" aria-label="Filter photos">
      <button data-f="all" aria-pressed="true">All <small>({len(figs)})</small></button>
      <button data-f="events" aria-pressed="false">Events &amp; training</button>
      <button data-f="press" aria-pressed="false">Press &amp; awards</button>
      <button data-f="sites" aria-pressed="false">Project sites</button>
    </div>
    <div class="masonry">{"".join(figs)}</div>
  </div>
</section>
<section class="sec sec--alt" id="videos">
  <div class="wrap">
    <h2 class="h-sec reveal">Video <span class="accent">gallery</span></h2>
    <p class="lead reveal">Talks, site walkthroughs and explainers on rainwater harvesting.</p>
    <div class="videos">{vids}</div>
  </div>
</section>
"""
page("gallery.html", "Image & Video Gallery | N.S. & Associates", "Photos from N.S. & Associates training sessions, seminars, awards, press coverage and rainwater harvesting project sites, plus our video gallery.", "gallery", gallery_body)

# ---------- blog ----------
posts = DATA["posts"]
def fdate(d):
    import datetime
    return datetime.date.fromisoformat(d).strftime("%d %b %Y")
cards = "".join(f'<a class="post reveal" href="post-{p["slug"]}.html">{ph(p["img"].replace("img/ns/post-", "img/blog/"), p["title"])}<div class="post__b"><time datetime="{p["date"]}">{fdate(p["date"])}</time><h3>{html.escape(p["title"])}</h3></div></a>' for p in posts)
blog_body = f"""
<section class="phero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><span>Blog</span></nav>
    <h1 class="h-hero">Notes on <span class="accent">water</span>, <span class="accent-r">rain</span> and recharge.</h1>
    <p class="lead">Articles from our team on rainwater harvesting, filters, borewell recharge and climate.</p>
  </div>
</section>
<section class="sec" style="padding-top:12px"><div class="wrap"><div class="posts">{cards}</div></div></section>
"""
page("blog.html", "Blog | N.S. & Associates", "Articles on rainwater harvesting, borewell recharge, RWH filters, water conservation and climate change from N.S. & Associates.", "blog", blog_body)

for i, p in enumerate(posts):
    body = p["html"].replace("img/ns/post-", "img/blog/")
    # the source WordPress posts were injected with SEO-spam links (German ghostwriting/plumbing sites); drop them entirely
    body = re.sub(r'\s*<a [^>]*href="https?://[^"]*(ghostwrit|hausarbeit|bachelorarbeit|masterarbeit|seminararbeit|rohrreinigung|schluesseldienst|schreiben)[^"]*"[^>]*>.*?</a>', "", body, flags=re.S | re.I)
    body = re.sub(r'<img ([^>]*?)>', lambda m: '<img ' + m.group(1) + (' loading="lazy"' if 'loading=' not in m.group(1) else '') + '>', body)
    prev = posts[i - 1] if i > 0 else None
    nxt = posts[i + 1] if i + 1 < len(posts) else None
    navh = '<nav class="article__nav" aria-label="More posts">'
    navh += f'<a href="post-{prev["slug"]}.html"><small>Newer</small><b>{html.escape(prev["title"])}</b></a>' if prev else "<span></span>"
    navh += f'<a href="post-{nxt["slug"]}.html" style="text-align:right"><small>Older</small><b>{html.escape(nxt["title"])}</b></a>' if nxt else "<span></span>"
    navh += "</nav>"
    hero = ph(p["img"].replace("img/ns/post-", "img/blog/"), p["title"], "article__hero") if p["img"] else ""
    art = f"""
<section class="phero" style="padding-bottom:0">
  <div class="wrap article">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="blog.html">Blog</a></nav>
    <time class="eyebrow" datetime="{p["date"]}" style="display:block">{fdate(p["date"])}</time>
    <h1 class="h-sec">{html.escape(p["title"])}</h1>
  </div>
</section>
<article class="sec" style="padding-top:0"><div class="wrap article">{hero}<div class="article__body">{body}</div>{navh}</div></article>
"""
    desc = re.sub(r"<[^>]+>", " ", p["html"]); desc = html.unescape(re.sub(r"\s+", " ", desc)).strip()[:155]
    page(f"post-{p['slug']}.html", f"{p['title']} | N.S. & Associates", desc, "blog", art)
