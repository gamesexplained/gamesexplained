#!/usr/bin/env python3
"""Build the static site into _site/.

For every games/<platform>/<slug>/game.json:
  index.html   copied through, tab bar injected  (How it works)
  source.html  from site/source.html + facts.md + cheats.md   (Source code)
  levels.html  copied through if authored          (Maps / levels)
  play.html    copied through if authored          (Play)
  about.html   from site/about.html + game.json + features.md + orientation.md + git log
  listing.json, symbols.json, reference/           copied
Plus a home page with the catalogue and site/lib/.

Usage: build.py [--out _site]
Preview: python3 -m http.server -d _site 8000
No dependencies. The markdown converter handles the subset the templates use.
"""
import glob, html, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, "site")
PLATFORM_NAMES = {"c64": "Commodore 64", "spectrum": "ZX Spectrum", "nes": "NES", "amiga": "Amiga"}
TABS = [("index.html", "How it works"), ("source.html", "Source code"), ("levels.html", "Maps / levels"),
        ("play.html", "Play"), ("about.html", "About")]


# --- markdown (the subset our files use) ------------------------------------
def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", lambda m: "<code>" + addr_link(m.group(1)) + "</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?!\w)", r"<i>\1</i>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', s)
    return s


def addr_link(s):
    return re.sub(r"\$([0-9A-Fa-f]{4})\b", lambda m: f'<a href="source.html#{m.group(1).upper()}">${m.group(1).upper()}</a>', s)


def markdown(text, drop_h1=True):
    out, lines, i = [], text.splitlines(), 0
    para = []

    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>"); para.clear()
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            flush(); j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith("```"):
                buf.append(lines[j]); j += 1
            out.append("<pre>" + html.escape("\n".join(buf)) + "</pre>"); i = j + 1; continue
        m = re.match(r"^(#{1,4})\s+(.*)", ln)
        if m:
            flush(); lvl = len(m.group(1))
            if not (lvl == 1 and drop_h1):
                out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1; continue
        if ln.startswith("|"):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            rows = [r for r in rows if not all(re.fullmatch(r":?-+:?", c) for c in r)]
            if rows:
                t = "<div class='tablewrap'><table><tr>" + "".join(f"<th>{inline(c)}</th>" for c in rows[0]) + "</tr>"
                t += "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:]) + "</table></div>"
                out.append(t)
            continue
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)", ln)
        if m:
            flush(); tag = "ol" if m.group(2)[0].isdigit() else "ul"; items = []
            while i < len(lines):
                m2 = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)", lines[i])
                if m2:
                    items.append(m2.group(3)); i += 1
                elif lines[i].startswith("  ") and items and lines[i].strip():
                    items[-1] += " " + lines[i].strip(); i += 1
                else:
                    break
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>"); continue
        if not ln.strip():
            flush(); i += 1; continue
        para.append(ln.strip()); i += 1
    flush()
    return "\n".join(out)


# --- footprint: every byte of the 64 KB space in one of ten categories --------
CATS = ["code", "graphics", "levels", "sound", "text", "tables", "variables", "runtime", "rom", "unused"]
NAME_HINTS = [  # symbol-name fallbacks for small things nobody declares as a region
    (("str_", "text_", "msg_", "string"), "text"),
    (("tune_", "music_", "sfx_", "sound_", "note_", "melody"), "sound"),
    (("logo", "sprite", "shape", "glyph", "charset", "font"), "graphics"),
    (("maze", "level", "terrain", "world_map", "room_"), "levels"),
]


def hexint(v):
    return int(v[1:], 16) if isinstance(v, str) and v.startswith("$") else int(v)


def footprint(gdir, game):
    """Classify all 65536 bytes. Returns (runs, totals, symbols)."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from symbols_export import regions as cov_regions
    L = json.load(open(os.path.join(gdir, "listing.json")))
    cat = ["unused"] * 0x10000
    why = [""] * 0x10000
    # listing records: what the bytes are
    for r in L["records"]:
        if not r.get("b"):
            continue
        k = "code" if r["t"] == "code" else ("text" if r["t"] == "text" else "tables")
        for i in range(len(r["b"])):
            cat[r["a"] + i] = k
    # index spans: variables and strings
    for e in L["index"]:
        k = {"variable": "variables", "string": "text"}.get(e["k"])
        hint = None
        n = e["n"].lower()
        for keys, kk in NAME_HINTS:
            if any(x in n for x in keys) and not n.startswith("bitmap_row"):
                hint = kk
        k = hint or k
        if k:
            for a in range(e["a"], min(e["a"] + e["len"], 0x10000)):
                if cat[a] not in ("unused", "code"):
                    cat[a] = k; why[a] = e["n"]
    # coverage regions from game.json: runtime and ROM
    for lo, hi, name in cov_regions(game)["exclude"]:
        k = "rom" if "rom" in name.lower() else "runtime"
        for a in range(lo, hi + 1):
            cat[a] = k; why[a] = name
    # video charset: graphics
    v = game.get("video") or {}
    if v.get("charset"):
        a0 = hexint(v["charset"])
        for a in range(a0, a0 + 0x800):
            if cat[a] != "unused":
                cat[a] = "graphics"; why[a] = "character set"
    # declared regions win
    for lo, hi, k, name in game.get("regions", []):
        for a in range(hexint(lo), hexint(hi) + 1):
            if cat[a] != "unused":
                cat[a] = k; why[a] = name
    runs, totals = [], {k: 0 for k in CATS}
    a = 0
    while a < 0x10000:
        b = a
        while b < 0x10000 and cat[b] == cat[a] and why[b] == why[a]:
            b += 1
        totals[cat[a]] += b - a
        if cat[a] != "unused":
            runs.append([a, b - a, cat[a], why[a]])
        a = b
    symbols = [[e["a"], e["n"]] for e in L["index"] if e["k"] != "branch"]
    return runs, totals, symbols


def footprint_table(totals):
    program = sum(totals[k] for k in ("code", "graphics", "levels", "sound", "text", "tables", "variables"))
    rows = [("Program", program)] + [(html.escape({"code": "Code", "graphics": "Graphics", "levels": "Level data", "sound": "Sound",
             "text": "Text", "tables": "Tables", "variables": "Variables"}[k]), totals[k]) for k in
             ("code", "graphics", "levels", "sound", "text", "tables", "variables") if totals[k]]
    rows += [("Screen, bitmap, colour, stack, I/O", totals["runtime"])]
    if totals["rom"]:
        rows += [("ROM the game runs under", totals["rom"])]
    rows += [("Unused", totals["unused"])]
    out = "<div class='tablewrap'><table><tr><th>What</th><th>Bytes</th><th>Of 64 KB</th></tr>"
    for i, (name, n) in enumerate(rows):
        b = "<b>" if i == 0 else ""; e = "</b>" if i == 0 else ""
        out += f"<tr><td>{b}{name}{e}</td><td>{b}{n:,}{e}</td><td>{b}{100*n/65536:.1f} %{e}</td></tr>"
    return out + "</table></div>"


# --- pieces -----------------------------------------------------------------
def read(p):
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def tabbar(game, present, lib):
    tabs = "".join(f'<a class="tab" href="{f}">{n}</a>' for f, n in TABS if f in present)
    tier = game.get("tier", "none")
    return (f'<nav class="gametabs"><div class="in"><span class="crumb"><a href="{lib}/../index.html">Games Explained</a> / '
            f'{PLATFORM_NAMES.get(game.get("platform"), game.get("platform"))} / {html.escape(game.get("title", ""))}</span>'
            f'{tabs}<span class="tier">tier <b>{tier}</b></span></div></nav>')


def inject(page, nav, lib):
    """Put the tab bar into an authored page and hook the shared css/js."""
    hook = f'<link rel="stylesheet" href="{lib}/site.css">'
    if "<!-- tabs -->" in page:
        page = page.replace("<!-- tabs -->", nav, 1)
    elif "</style>" in page:
        page = page.replace("</style>", "</style>\n" + nav, 1)
    else:
        page = nav + page
    if "site.css" not in page:
        page = page.replace("<style>", hook + "\n<style>", 1) if "<style>" in page else hook + "\n" + page
    if "<meta charset" not in page:
        page = '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + page
    if "site.js" not in page:
        page += f'\n<script src="{lib}/site.js"></script>\n'
    return page


def contributors(gdir):
    try:
        out = subprocess.run(["git", "shortlog", "-sn", "--no-merges", "HEAD", "--", gdir],
                             cwd=ROOT, capture_output=True, text=True).stdout
    except Exception:
        out = ""
    rows = [ln.strip().split("\t") for ln in out.splitlines() if "\t" in ln]
    return rows


def fill(tpl, **kw):
    for k, v in kw.items():
        tpl = tpl.replace("{{" + k + "}}", str(v))
    return tpl


def build_game(gdir, out_root):
    game = json.load(open(os.path.join(gdir, "game.json")))
    plat, slug = game["platform"], game["slug"]
    out = os.path.join(out_root, plat, slug)
    os.makedirs(out, exist_ok=True)
    lib = "../../lib"
    present = {"index.html", "source.html", "about.html"}
    for f in ("levels.html", "play.html"):
        if os.path.exists(os.path.join(gdir, f)):
            present.add(f)
    nav = tabbar(game, present, lib)
    common = dict(title=html.escape(game.get("title", slug)), lib=lib, build=html.escape(game.get("build") or ""),
                  platform_name=PLATFORM_NAMES.get(plat, plat), year=game.get("year") or "",
                  publisher=html.escape(game.get("publisher") or ""))
    # authored tabs
    for f in ("index.html", "levels.html", "play.html"):
        if f in present:
            open(os.path.join(out, f), "w").write(inject(read(os.path.join(gdir, f)), nav, lib))
    # source
    facts = markdown(read(os.path.join(gdir, "facts.md")))
    cheats = read(os.path.join(gdir, "cheats.md"))
    if cheats.strip():
        facts += "<h2>Cheats</h2>" + markdown(cheats)
    src = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav).replace("<!-- facts -->", facts)
    open(os.path.join(out, "source.html"), "w").write(src)
    # about
    cons = contributors(gdir)
    cred = game.get("credits") or []
    con_html = "<ul>" + "".join(f"<li>{html.escape(n)} <span class='mute'>({c} commits)</span></li>" for c, n in cons) + \
               "".join(f"<li>{html.escape(c.get('by',''))} <span class='mute'>— {html.escape(c.get('role',''))}</span></li>" for c in cred) + "</ul>"
    links = game.get("links") or {}
    link_html = "<ul>" + "".join(f'<li><a href="{html.escape(u)}">{html.escape(k)}</a></li>' for k, u in links.items()) + "</ul>" if links else "<p class='mute'>None listed yet. Know a write-up, port or forum thread about this game? Add it to game.json.</p>"
    tools = game.get("tools") or {}
    runs, totals, symbols = footprint(gdir, game)
    json.dump({"runs": runs, "totals": totals, "symbols": symbols}, open(os.path.join(out, "memmap.json"), "w"), separators=(",", ":"))
    game["_totals"] = totals
    about = fill(read(os.path.join(SITE, "about.html")), **common, footprint=footprint_table(totals),
                 tier=game.get("tier", "none"), coverage=f"{game.get('coverage_percent') or 0:g} %",
                 copy=html.escape(str(game.get("copy", ""))), tools=html.escape(", ".join(f"{k}: {v}" for k, v in tools.items())),
                 model=html.escape(str(game.get("model", ""))), kit_version=html.escape(str(game.get("kit_version", ""))),
                 contributors=con_html, links=link_html,
                 features=markdown(read(os.path.join(gdir, "features.md"))),
                 orientation=markdown(read(os.path.join(gdir, "orientation.md")))).replace("<!-- tabs -->", nav)
    open(os.path.join(out, "about.html"), "w").write(about)
    for f in ("listing.json", "symbols.json"):
        if os.path.exists(os.path.join(gdir, f)):
            shutil.copy(os.path.join(gdir, f), out)
    ref = os.path.join(gdir, "reference")
    if os.path.isdir(ref):
        shutil.copytree(ref, os.path.join(out, "reference"), dirs_exist_ok=True)
    return game


ANALYTICS = """<!-- Google Analytics 4. Only on the live domain, never on a local preview; skipped for
     visitors who send Global Privacy Control or Do Not Track; advertising signals off. -->
<script>
(function(){
  if (location.hostname !== "%(domain)s" && location.hostname !== "www.%(domain)s") return;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  var s = document.createElement("script"); s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=%(id)s"; document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", "%(id)s", { allow_google_signals: false, allow_ad_personalization_signals: false });
})();
</script>
"""


def add_analytics(out_root):
    """Put the analytics snippet on every built page, if site/config.json has a measurement id."""
    cfg = json.load(open(os.path.join(SITE, "config.json")))
    mid = (cfg.get("ga_measurement_id") or "").strip()
    if not mid:
        return 0
    if not re.fullmatch(r"G-[A-Z0-9]{6,}", mid):
        sys.exit(f"site/config.json: ga_measurement_id {mid!r} does not look like a GA4 id (G-XXXXXXXXXX)")
    snippet = ANALYTICS % {"id": mid, "domain": cfg.get("domain", "")}
    n = 0
    for d, _, files in os.walk(out_root):
        for f in files:
            if f.endswith(".html"):
                p = os.path.join(d, f); page = open(p, encoding="utf-8").read()
                if "googletagmanager.com" in page:
                    continue
                marker = '<meta charset="utf-8">'
                page = page.replace(marker, marker + "\n" + snippet, 1) if marker in page else snippet + page
                open(p, "w", encoding="utf-8").write(page); n += 1
    return n


def card_html(g):
    plat, slug = g["platform"], g["slug"]
    ti = g.get("title_image") or ""
    # title_image stays inside the game folder: no absolute paths, no parent climbs
    safe = bool(ti) and not os.path.isabs(ti) and os.path.normpath(ti) == ti \
        and ".." not in ti.split(os.sep)
    tip = os.path.join(ROOT, "games", plat, slug, ti) if safe else ""
    if tip and os.path.isfile(tip):
        shot = (f'<img class="shot" src="{plat}/{slug}/{html.escape(ti, quote=True)}" '
                f'alt="{html.escape(g.get("title", slug))} title screen" loading="lazy">')
    else:
        print(f"warning: {plat}/{slug} has no title_image "
              f"(set it in game.json to a file under reference/)", file=sys.stderr)
        shot = '<div class="shot missing" aria-hidden="true"></div>'
    total = sum(g["_totals"][k] for k in ("code", "graphics", "levels", "sound", "text", "tables", "variables"))
    return (
        f'<a class="card" href="{plat}/{slug}/index.html">{shot}'
        f'<p class="t">{html.escape(g.get("title", ""))}</p>'
        f'<p class="m">{PLATFORM_NAMES.get(plat, plat)} · {g.get("year") or ""} · {html.escape(g.get("publisher") or "")}</p>'
        f'<span class="tierb">{g.get("tier", "none")} · {g.get("coverage_percent") or 0:g}%</span>'
        f'<div class="mini" data-map="{plat}/{slug}/memmap.json" title="{total:,} bytes of program"></div></a>')


def main():
    argv = sys.argv[1:]
    if argv and argv[0] in ("-h", "--help"):
        print(__doc__); return
    out_root = os.path.join(ROOT, argv[argv.index("--out") + 1] if "--out" in argv else "_site")
    if os.path.isdir(out_root):
        shutil.rmtree(out_root)
    os.makedirs(out_root)
    shutil.copytree(os.path.join(SITE, "lib"), os.path.join(out_root, "lib"))
    games = []
    for gj in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json"))):
        games.append(build_game(os.path.dirname(gj), out_root))
    cards = "".join(card_html(g) for g in games)
    home = fill(read(os.path.join(SITE, "index.html")), site_title="Games Explained", lib="lib", cards=cards)
    open(os.path.join(out_root, "index.html"), "w").write(home)
    # the kit changelog: how the method has changed, game by game
    log = markdown(read(os.path.join(ROOT, "kit", "CHANGELOG.md")), drop_h1=False)
    page = fill(read(os.path.join(SITE, "page.html")), site_title="How the method has changed", lib="lib", body=log,
                version=read(os.path.join(ROOT, "kit", "VERSION")).strip())
    open(os.path.join(out_root, "method.html"), "w").write(page)
    open(os.path.join(out_root, ".nojekyll"), "w").write("")
    open(os.path.join(out_root, "CNAME"), "w").write(json.load(open(os.path.join(SITE, "config.json")))["domain"] + "\n")
    tagged = add_analytics(out_root)
    print(f"built {len(games)} game(s) into {os.path.relpath(out_root, ROOT)}/" + (f"; analytics on {tagged} pages" if tagged else "; analytics off (no id in site/config.json)"))


if __name__ == "__main__":
    main()
