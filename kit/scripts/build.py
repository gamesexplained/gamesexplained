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
The authored pages have {{title}}, {{platform}}, {{year}} and {{publisher}}
filled from game.json. The build fails on a src or href that points at no
file it published: a page's own .js beside it would otherwise 404 on the site.

Usage: build.py [--out _site]
Preview: python3 -m http.server -d _site 8000   (8000, or any free port)
No dependencies. The markdown converter handles the subset the templates use.
"""
import glob, html, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, "site")
PLATFORM_NAMES = {"c64": "Commodore 64", "spectrum": "ZX Spectrum", "nes": "NES", "amiga": "Amiga"}
TABS = [("index.html", "How it works"), ("source.html", "Source code"), ("levels.html", "Maps / levels"),
        ("play.html", "Play"), ("about.html", "About")]


# --- markdown (the subset our files use) ------------------------------------
def inline(s, addr=True):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", lambda m: "<code>" + (addr_link(m.group(1)) if addr else m.group(1)) + "</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?!\w)", r"<i>\1</i>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', s)
    return s


def addr_link(s):
    return re.sub(r"\$([0-9A-Fa-f]{4})\b", lambda m: f'<a href="source.html#{m.group(1).upper()}">${m.group(1).upper()}</a>', s)


def markdown(text, drop_h1=True, addr=True):
    """addr=False where the page has no Source tab to link addresses into."""
    out, lines, i = [], text.splitlines(), 0
    para = []
    inline_ = lambda x: inline(x, addr)

    def flush():
        if para:
            out.append("<p>" + inline_(" ".join(para)) + "</p>"); para.clear()
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
                out.append(f"<h{lvl}>{inline_(m.group(2))}</h{lvl}>")
            i += 1; continue
        if ln.startswith("|"):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            rows = [r for r in rows if not all(re.fullmatch(r":?-+:?", c) for c in r)]
            if rows:
                t = "<div class='tablewrap'><table><tr>" + "".join(f"<th>{inline_(c)}</th>" for c in rows[0]) + "</tr>"
                t += "".join("<tr>" + "".join(f"<td>{inline_(c)}</td>" for c in r) + "</tr>" for r in rows[1:]) + "</table></div>"
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
            out.append(f"<{tag}>" + "".join(f"<li>{inline_(x)}</li>" for x in items) + f"</{tag}>"); continue
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


TIER_NAMES = {"silver-claimed": "silver (claimed)"}


def tier_name(t):
    """How a tier reads on the page: game.json's value, except silver-claimed."""
    return TIER_NAMES.get(t, t)


def tabbar(game, present, lib):
    tabs = "".join(f'<a class="tab" href="{f}">{n}</a>' for f, n in TABS if f in present)
    tier = game.get("tier", "none")
    return (f'<nav class="gametabs"><div class="in"><span class="crumb"><a href="{lib}/../index.html">Games Explained</a> / '
            f'{PLATFORM_NAMES.get(game.get("platform"), game.get("platform"))} / {html.escape(game.get("title", ""))}</span>'
            f'{tabs}<span class="tier">tier <b>{html.escape(tier_name(tier))}</b></span></div></nav>')


def banner(game, cons):
    """One line under the tabs: who curated it, or how to take it further.

    Gold and Platinum name the humans (git authors, linked). Silver is agent-generated
    and asks for a human editor, and credits the contributor (git authors, linked).
    Silver (claimed) is a Silver a human has started editing: it names them (the
    steward in game.json) as editing it to a Gold standard, with no prompt, so nobody
    starts the same work twice.
    Bronze, or no tier, is unfinished and asks for a
    contributor. The prompt behind the button is the one line to paste into an agent.
    """
    tier = game.get("tier", "none")
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "")
    where = f'games/{game["platform"]}/{game["slug"]}'
    if tier in ("gold", "platinum"):
        who = ", ".join(f'<a href="https://github.com/{html.escape(l)}">{html.escape(l)}</a>' if l else html.escape(n) for _, n, l in cons)
        body = f'This minisite was curated by {who}.' if who else 'This minisite was curated by hand.'
    elif tier == "silver":
        who = ", ".join(f'<a href="https://github.com/{html.escape(l)}">{html.escape(l)}</a>' if l else html.escape(n) for _, n, l in cons)
        lead = f'This minisite was contributed by {who}. ' if who else 'This minisite was contributed. '
        prompt = f"Clone {repo} and follow kit/START.md to curate {where} with me to Gold."
        body = (lead + 'It\u2019s agent-generated and needs a human editor. '
                f'<span class="prompt" id="prompt">{html.escape(prompt)}</span>'
                '<button type="button" data-copy="#prompt">Copy the prompt to work on it</button>')
    elif tier == "silver-claimed":
        who = ", ".join(f'<a href="https://github.com/{html.escape(l)}">{html.escape(l)}</a>' if l else html.escape(n) for _, n, l in cons)
        lead = f'This minisite was contributed by {who}. ' if who else 'This minisite was contributed. '
        st = game.get("steward") or ""
        if not st:
            print(f"warning: {where} is silver-claimed with no steward; set steward in game.json to the editor's GitHub login", file=sys.stderr)
        ed = f'<a href="https://github.com/{html.escape(st)}">{html.escape(st)}</a>' if st else 'an editor'
        body = lead + f'It\u2019s currently claimed by {ed} who is editing it to reach a Gold tier standard.'
    else:
        cov = game.get("coverage_percent") or 0
        prompt = f"Clone {repo} and follow kit/START.md to continue {where} to Silver."
        body = (f'This minisite is not complete: {cov:g} % of the program is explained. '
                f'<span class="prompt" id="prompt">{html.escape(prompt)}</span>'
                '<button type="button" data-copy="#prompt">Copy the prompt to work on it</button>')
    return f'<div class="gamebanner {html.escape(tier)}">{body}</div>'


def under_title(page, ban):
    """Place the banner after the page's first <h1>, the game's title; after the tabs if there is none."""
    m = re.search(r"</h1>", page, re.I)
    if m:
        return page[:m.end()] + "\n" + ban + page[m.end():]
    return page.replace("</nav>", "</nav>\n" + ban, 1)


FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900'
         '&family=IBM+Plex+Mono:wght@400;500&display=swap">')


def inject(page, nav, lib):
    """Put the tab bar into an authored page and hook the shared css/js.

    site.css goes after the page's own <style>, so the site's tokens and article vocabulary
    win over the copy a page carries for opening from disk. The fonts line is the site's,
    whatever the page asked for.
    """
    hook = f'<link rel="stylesheet" href="{lib}/site.css">'
    if "<!-- tabs -->" in page:
        page = page.replace("<!-- tabs -->", nav, 1)
    elif "</style>" in page:
        page = page.replace("</style>", "</style>\n" + nav, 1)
    else:
        page = nav + page
    page = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">', FONTS, page, count=1)
    if "site.css" not in page:
        i = page.rfind("</style>")
        page = page[:i + 8] + "\n" + hook + page[i + 8:] if i >= 0 else hook + "\n" + page
    if "<meta charset" not in page:
        page = '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + page
    if "site.js" not in page:
        page += f'\n<script src="{lib}/site.js"></script>\n'
    return page


# agents and bots, by the addresses their commit trailers or authorship carry
BOT_EMAILS = ("noreply@anthropic.com",      # Claude Code
              "noreply@openai.com",         # Codex, and ChatGPT's cloud Codex
              "noreply@meta.ai",            # Muse
              "+Copilot@users.noreply.github.com",   # GitHub Copilot's coding agent, which can be the commit author
              "[bot]@users.noreply.github.com")
GITHUB_NOREPLY = re.compile(r"^(?:\d+\+)?([A-Za-z0-9-]+)@users\.noreply\.github\.com$")


def contributors(gdir):
    """(commits, name, github login or None) per human author of this game folder.

    Git authors only, through .mailmap, so every alias a person has committed under
    collapses to one GitHub account. Agents are co-authors in trailers, never authors,
    so they do not appear. The login comes from the canonical
    <login>@users.noreply.github.com address; an author with another address is shown
    unlinked and the build says so, so a .mailmap line can be added.
    """
    try:
        out = subprocess.run(["git", "log", "--no-merges", "--format=%aN\t%aE", "HEAD", "--", gdir],
                             cwd=ROOT, capture_output=True, text=True).stdout
    except Exception:
        out = ""
    counts = {}
    for ln in out.splitlines():
        if "\t" not in ln:
            continue
        name, email = ln.split("\t", 1)
        if any(email.endswith(b) for b in BOT_EMAILS):
            continue
        counts[(name, email)] = counts.get((name, email), 0) + 1
    rows = []
    for (name, email), n in sorted(counts.items(), key=lambda kv: -kv[1]):
        m = GITHUB_NOREPLY.match(email)
        if not m:
            print(f"warning: contributor {name} <{email}> has no GitHub login; add a .mailmap line mapping them to <login>@users.noreply.github.com", file=sys.stderr)
        rows.append((n, name, m.group(1) if m else None))
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
    cons = contributors(gdir)
    nav = tabbar(game, present, lib)
    ban = banner(game, cons)
    common = dict(title=html.escape(game.get("title", slug)), lib=lib, build=html.escape(game.get("build") or ""),
                  platform_name=PLATFORM_NAMES.get(plat, plat), year=game.get("year") or "",
                  publisher=html.escape(game.get("publisher") or ""))
    # authored tabs, with the template's placeholders filled (new_game.py fills only the .md files)
    head = dict(title=common["title"], platform=common["platform_name"], year=common["year"], publisher=common["publisher"])
    for f in ("index.html", "levels.html", "play.html"):
        if f in present:
            page = fill(read(os.path.join(gdir, f)), **head)
            open(os.path.join(out, f), "w").write(under_title(inject(page, nav, lib), ban))
    # source
    facts = markdown(read(os.path.join(gdir, "facts.md")))
    cheats = read(os.path.join(gdir, "cheats.md"))
    if cheats.strip():
        facts += "<h2>Cheats</h2>" + markdown(cheats)
    src = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav).replace("<!-- facts -->", facts)
    src = under_title(src, ban)
    if "site.js" not in src:
        src += f'\n<script src="{lib}/site.js"></script>\n'
    open(os.path.join(out, "source.html"), "w").write(src)
    # about
    cred = [c for c in (game.get("credits") or []) if (c.get("by") or c.get("name", "")).strip()]   # the game's makers; agents live in "model"
    con_html = "<ul>" + "".join(
        (f'<li><a href="https://github.com/{html.escape(login)}">{html.escape(login)}</a>' if login else f"<li>{html.escape(n)}")
        + f" <span class='mute'>({c} commit{'s' if c != 1 else ''})</span></li>" for c, n, login in cons) + \
               "".join(f"<li>{html.escape(c.get('by') or c.get('name', ''))} <span class='mute'>— {html.escape(c.get('role',''))}</span></li>" for c in cred) + "</ul>"
    links = {k: u for k, u in (game.get("links") or {}).items() if u}   # empty slots from the template are not links
    link_html = "<ul>" + "".join(f'<li><a href="{html.escape(u)}">{html.escape(k)}</a></li>' for k, u in links.items()) + "</ul>" if links else "<p class='mute'>None listed yet. Know a write-up, port or forum thread about this game? Add it to game.json.</p>"
    tools = game.get("tools") or {}
    runs, totals, symbols = footprint(gdir, game)
    json.dump({"runs": runs, "totals": totals, "symbols": symbols}, open(os.path.join(out, "memmap.json"), "w"), separators=(",", ":"))
    game["_totals"] = totals
    about = fill(read(os.path.join(SITE, "about.html")), **common, footprint=footprint_table(totals),
                 tier=html.escape(tier_name(game.get("tier", "none"))), coverage=f"{game.get('coverage_percent') or 0:g} %",
                 copy=html.escape(str(game.get("copy", ""))), tools=html.escape(", ".join(f"{k}: {v}" for k, v in tools.items())),
                 model=html.escape(str(game.get("model", ""))), kit_version=html.escape(str(game.get("kit_version", ""))),
                 contributors=con_html, links=link_html,
                 features=markdown(read(os.path.join(gdir, "features.md"))),
                 orientation=markdown(read(os.path.join(gdir, "orientation.md")))).replace("<!-- tabs -->", nav)
    about = under_title(about, ban)
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


LIB_FILES = ("site.css", "site.js", "memmap.js", "c64.js")


def version_lib(out_root):
    """Append ?v=<content hash> to every reference to a lib file, so a redeploy is never
    paired with a stylesheet or script the browser cached from the previous one."""
    import hashlib
    ver = {f: hashlib.sha1(open(os.path.join(out_root, "lib", f), "rb").read()).hexdigest()[:8]
           for f in LIB_FILES if os.path.isfile(os.path.join(out_root, "lib", f))}
    pat = re.compile(r'(lib/(' + "|".join(re.escape(f) for f in ver) + r'))(["\'])')
    n = 0
    for d, _, files in os.walk(out_root):
        for f in files:
            if f.endswith(".html"):
                p = os.path.join(d, f); page = open(p, encoding="utf-8").read()
                new = pat.sub(lambda m: f"{m.group(1)}?v={ver[m.group(2)]}{m.group(3)}", page)
                if new != page:
                    open(p, "w", encoding="utf-8").write(new); n += 1
    return n


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


def runs_table(games):
    """Every game with a timings.json, one row each: the figures a run can try to beat."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock import summarize
    rows = []
    for g in games:
        gdir = os.path.join(ROOT, "games", g["platform"], g["slug"])
        if not os.path.isfile(os.path.join(gdir, "timings.json")):
            continue
        S = summarize(gdir)
        program = sum(g["_totals"][k] for k in ("code", "graphics", "levels", "sound", "text", "tables", "variables"))
        fmt = lambda v, unit="": (f"{v:g}{unit}" if v is not None else "")
        rows.append(f'<tr><td><a href="{g["platform"]}/{g["slug"]}/index.html">{html.escape(g.get("title", g["slug"]))}</a></td>'
                    f'<td>{program // 1024} KB</td><td>{html.escape(tier_name(g.get("tier", "none")))}</td><td>{fmt(S["hours"])}</td>'
                    f'<td>{fmt(S["minutes_to_play"])}</td><td>{fmt(S["min_per_kb"])}</td><td>{fmt(S["agents"])}</td>'
                    f'<td>{html.escape(", ".join(S["models"]))}</td></tr>')
    if not rows:
        return ""
    return ('<h2>Runs</h2><p>How long each run took, in figures that carry across games and machines: '
            'hours of work in total, minutes from boot to steady-state play, and minutes of the coverage step per kilobyte '
            'the ledger tracks, each beside the model that took it. Every run starts the clock at each step; the retro reports it. '
            'These are the numbers to beat.</p>'
            '<div class="tablewrap"><table><tr><th>Game</th><th>Program</th><th>Tier</th><th>Hours</th><th>To play (min)</th>'
            '<th>Coverage (min/KB)</th><th>Agents</th><th>Model</th></tr>' + "".join(rows) + '</table></div>')


PROGRAM = ("code", "graphics", "levels", "sound", "text", "tables", "variables")


def shot_html(g, cls="shot"):
    plat, slug = g["platform"], g["slug"]
    ti = g.get("title_image") or ""
    # title_image stays inside the game folder: no absolute paths, no parent climbs
    safe = bool(ti) and not os.path.isabs(ti) and os.path.normpath(ti) == ti \
        and ".." not in ti.split(os.sep)
    tip = os.path.join(ROOT, "games", plat, slug, ti) if safe else ""
    if tip and os.path.isfile(tip):
        return (f'<img class="{cls}" src="{plat}/{slug}/{html.escape(ti, quote=True)}" '
                f'alt="{html.escape(g.get("title", slug))} title screen" loading="lazy">')
    print(f"warning: {plat}/{slug} has no title_image "
          f"(set it in game.json to a file under reference/)", file=sys.stderr)
    return f'<div class="{cls} missing" aria-hidden="true"></div>'


def hook(g):
    """The one line that sells the game: game.json's blurb, else the minisite's opening
    paragraph, the first <p> after its title."""
    if g.get("blurb"):
        return g["blurb"]
    page = read(os.path.join(ROOT, "games", g["platform"], g["slug"], "index.html"))
    i = page.find("</h1>")
    m = re.search(r"<p[^>]*>(.*?)</p>", page[i:i + 8000] if i >= 0 else "", flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""


def strip_html(g):
    """The one-dimensional memory map, drawn by C64Map.strip from memmap.json."""
    total = sum(g["_totals"][k] for k in PROGRAM)
    return f'<div class="strip" data-strip="{g["platform"]}/{g["slug"]}/memmap.json" title="{total:,} bytes of program"></div>'


def stamp_html(g):
    t = g.get("tier", "none")
    return f'<span class="stamp {html.escape(t)}">{html.escape(tier_name(t))}</span>'


def featured_html(g):
    """One game, large: title screen, memory strip, the title and its opening line."""
    plat, slug = g["platform"], g["slug"]
    meta = " · ".join(x for x in (PLATFORM_NAMES.get(plat, plat), str(g.get("year") or ""), g.get("publisher") or "") if x)
    return (f'<a class="show" href="{plat}/{slug}/index.html">{shot_html(g)}{strip_html(g)}'
            f'<span class="cap"><b>{html.escape(g.get("title", slug))}</b><span class="m">{html.escape(meta)}</span></span>'
            f'<p class="hook">{html.escape(hook(g))}</p></a>')


def card_html(g):
    """Every game, small: thumbnail, title, a line of facts, the memory strip, the tier."""
    plat, slug = g["platform"], g["slug"]
    kb = sum(g["_totals"][k] for k in PROGRAM) / 1024
    return (f'<a class="tile" href="{plat}/{slug}/index.html" data-platform="{html.escape(plat)}">{shot_html(g, "thumb")}'
            f'<span class="body"><b>{html.escape(g.get("title", slug))}</b>'
            f'<span class="m">{g.get("year") or ""} · {html.escape(g.get("publisher") or "")} · {kb:.0f} KB</span>{strip_html(g)}</span>'
            f'{stamp_html(g)}</a>')


def platforms_html(games):
    """Chips that filter the catalogue. A platform with no games yet is listed anyway,
    pointing at Contribute, so the reader knows it is wanted."""
    counts = {}
    for g in games:
        counts[g["platform"]] = counts.get(g["platform"], 0) + 1
    order = list(PLATFORM_NAMES) + sorted(p for p in counts if p not in PLATFORM_NAMES)
    items = [f'<a href="#" class="on" data-filter="">All <span class="n">{len(games)}</span></a>']
    for p in order:
        name = html.escape(PLATFORM_NAMES.get(p, p))
        if counts.get(p):
            items.append(f'<a href="#" data-filter="{html.escape(p)}">{name} <span class="n">{counts[p]}</span></a>')
        else:
            items.append(f'<a href="#contribute" class="empty" title="No games yet. Be the first.">{name} <span class="n">none yet</span></a>')
    return '<nav class="platforms">' + "".join(items) + "</nav>"


def featured_game(games):
    """The game the home page opens with: the first at Gold or better, else the first there is."""
    return next((g for g in games if g.get("tier") in ("gold", "platinum")), games[0] if games else None)


def broken_links(out_root):
    """Relative src and href on every built page that point at no file the build wrote.

    A page that links a file of its own beside it builds cleanly and then fails in the
    reader's browser, because a game folder publishes only what build_game copies."""
    bad = []
    for page in sorted(glob.glob(os.path.join(out_root, "**", "*.html"), recursive=True)):
        for m in re.finditer(r'\b(?:src|href)\s*=\s*(["\'])(.*?)\1', open(page, encoding="utf-8").read()):
            url = m.group(2)
            if re.search(r"\$\{|\{\{|\s\+|\+\s", url) or re.match(r"[a-z][a-z0-9+.-]*:|//|#", url, re.I):
                continue   # built by a script at run time, or not a file of ours
            path = url.split("#")[0].split("?")[0]
            if not path:
                continue
            target = os.path.join(out_root, path.lstrip("/")) if path.startswith("/") else os.path.join(os.path.dirname(page), path)
            if not os.path.exists(os.path.join(os.path.normpath(target), "index.html") if path.endswith("/") else os.path.normpath(target)):
                bad.append((os.path.relpath(page, out_root), url))
    return bad


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
    feat = featured_game(games)
    home = fill(read(os.path.join(SITE, "index.html")), site_title="Games Explained", lib="lib",
                cards="".join(card_html(g) for g in games), featured=featured_html(feat) if feat else "",
                platforms=platforms_html(games), n_games=len(games))
    open(os.path.join(out_root, "index.html"), "w").write(home)
    # the kit changelog, game by game
    log = markdown(read(os.path.join(ROOT, "kit", "CHANGELOG.md")), drop_h1=False, addr=False) + runs_table(games)
    page = fill(read(os.path.join(SITE, "page.html")), site_title="How the kit has changed", lib="lib", body=log,
                version=read(os.path.join(ROOT, "kit", "VERSION")).strip())
    open(os.path.join(out_root, "kit.html"), "w").write(page)
    open(os.path.join(out_root, ".nojekyll"), "w").write("")
    open(os.path.join(out_root, "CNAME"), "w").write(json.load(open(os.path.join(SITE, "config.json")))["domain"] + "\n")
    version_lib(out_root)
    tagged = add_analytics(out_root)
    bad = broken_links(out_root)
    for page, url in bad:
        print(f"broken link: {page} -> {url}", file=sys.stderr)
    if bad:
        sys.exit(f"{len(bad)} link(s) to nothing the build published. A game folder publishes its authored pages, "
                 "listing.json, symbols.json and reference/, nothing else; site/lib/ is at ../../lib/")
    print(f"built {len(games)} game(s) into {os.path.relpath(out_root, ROOT)}/" + (f"; analytics on {tagged} pages" if tagged else "; analytics off (no id in site/config.json)"))


if __name__ == "__main__":
    main()
