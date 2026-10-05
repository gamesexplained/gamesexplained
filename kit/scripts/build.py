#!/usr/bin/env python3
"""Build the static site into _site/.

For every games/<platform>/<slug>/game.json:
  index.html   copied through, tab bar injected  (How it works)
  source.html  from site/source.html + facts.md + cheats.md   (Source code)
  levels.html  copied through if authored          (Maps / levels)
  play.html    copied through if authored          (Play)
  about.html   from site/about.html + game.json + features.md + orientation.md + git log
  listing.json, symbols.json, reference/           copied
A game of several parts (kit/scripts/parts.py) gets a Source page for each part
that has a listing, source-<id>.html, with source.html the first of them; the
parts above each listing, and a control beside it, step from one to the next.
parts/<id>/ carries each part's listing and symbols. About draws one footprint,
as for any game: the part the others are loaded over, with what they load
marked as varying with the part.
Those are the default tabs. A game that wants others lists all of its tabs, in
order, in game.json's "tabs" as [file, label] pairs; every authored page it
names is copied through, and a page in the folder that no tab names is left out
with a warning (about-layout.html, the game's own About template, aside).
Every tab but Source lists its sections in the left margin (pagenav).
Plus a home page with the catalogue and the games most recently added or changed
(from git history), site/lib/, kit.html (kit/lessons/, newest first),
status.html (from site/status.html + site/status.json: which kits work on which
computers, and the work needed) and about.html (from site/about-site.html: who
runs the site and the principles it follows; static). And what lets a phone
install the site as an app: manifest.webmanifest, icons/ (kit/scripts/icons.py
draws them) and sw.js at the root, with lines in every page's head that point
at them.
The authored pages have {{title}}, {{platform}}, {{year}} and {{publisher}}
filled from game.json. The build fails on a src or href that points at no
file it published: a page's own .js beside it would otherwise 404 on the site.
It lists pages with blocks hidden by the page editor (kit/scripts/edit.py), and
fails on a Gold or Platinum page that still has one.

Usage: build.py [--out _site]
With GITHUB_TOKEN (or GH_TOKEN) set, as in CI, the build asks GitHub which account
an author's address belongs to when the address is not a GitHub noreply one; without
it the build makes no request and shows that author's name unlinked.
Preview: python3 -m http.server -d _site 8000   (8000, or any free port)
No dependencies. The markdown converter handles the subset the templates use.
"""
import glob, html, html.parser, json, os, re, shutil, subprocess, sys, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parts import parts, load_game, started, under, above   # noqa: E402  a game of several loads
from models import awaits_check, proven   # noqa: E402  which games still need a maintainer's check

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, "site")
PLATFORM_NAMES = {"c64": "Commodore 64", "spectrum": "ZX Spectrum", "nes": "NES"}
# The footprint widget and the extra script it needs, per platform: a page loads only
# its own, so a C64 page does not fetch spectrum.js and a third platform adds a row.
PLATFORM_MAPS = {"c64": "C64Map", "spectrum": "SpectrumMap"}
PLATFORM_MAP_LIBS = {"c64": [], "spectrum": ["spectrum.js"]}
# The addresses the footprint draws, [start, end): all 64 KB, except on a machine whose ROM
# sits at a fixed place no game can write to. The 48K Spectrum's ROM is $0000-$3FFF
# (kit/skills/spectrum/zx-spectrum-reference, "Memory map (48K)"), so its map is the 48 KB of RAM.
PLATFORM_MAP_SPAN = {"spectrum": (0x4000, 0x10000)}
# How the footprint blurb names what it draws, so the C64 pages keep their copy.
PLATFORM_MEM = {"c64": "the C64's 64 KB", "spectrum": "the Spectrum's 48 KB of RAM"}
# The footprint table's names for the machine's own areas, in the same words as the map's
# legend above it (memmap.js for the C64, spectrum.js for the Spectrum).
PLATFORM_FOOT_WORDS = {"c64": {"runtime": "Screen, bitmap, colour, stack, I/O", "rom": "ROM the game runs under"},
                       "spectrum": {"runtime": "Screen, attributes and working memory"}}
TABS = [("index.html", "How it works"), ("source.html", "Source code"), ("levels.html", "Maps / levels"),
        ("play.html", "Play"), ("about.html", "About")]
_warned = set()


def warn(msg):
    """A warning, once per build. In GitHub Actions it is an annotation, so it shows on the
    run's summary and a pull request's checks instead of only in the step's log."""
    if msg in _warned:
        return
    _warned.add(msg)
    if os.environ.get("GITHUB_ACTIONS") == "true":
        esc = msg.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::warning title=build.py::{esc}", file=sys.stderr)
    else:
        print(f"warning: {msg}", file=sys.stderr)


# --- markdown (the subset our files use) ------------------------------------
def inline(s, addr=True, parts=None):
    """parts, in a game of several: {part id: its Source page}. An address written with its
    part's name before it, as the facts of such a game write them ("engine `$25BD`"), links
    into that part's page, whatever page the rest link into."""
    s = html.escape(s, quote=False)
    page = addr if isinstance(addr, str) else "source.html"

    def code(m):
        word, body = m.group(1), m.group(2)
        if parts and word in parts:
            return f"{word} <code>{addr_link(body, parts[word])}</code>"
        return (f"{word} " if word else "") + "<code>" + (addr_link(body, page) if addr else body) + "</code>"
    s = re.sub(r"(?:(?<![\w-])([A-Za-z][\w-]*) )?`([^`]+)`", code, s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?!\w)", r"<i>\1</i>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', s)
    return s


def addr_link(s, page="source.html"):
    return re.sub(r"\$([0-9A-Fa-f]{4})\b", lambda m: f'<a href="{page}#{m.group(1).upper()}">${m.group(1).upper()}</a>', s)


def markdown(text, drop_h1=True, addr=True, shift=0, parts=None):
    """addr=False where the page has no Source tab to link addresses into, or the name of
    the Source page to link them into (a part's, in a game of several); shift=1 sets the
    headings one level down, for a file placed under a heading of the page's own; parts as
    for inline()."""
    out, lines, i = [], text.splitlines(), 0
    para = []
    inline_ = lambda x: inline(x, addr, parts)

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
                h = min(6, lvl + shift)
                out.append(f"<h{h}>{inline_(m.group(2))}</h{h}>")
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


# --- footprint: every byte of the 64 KB space in one category -----------------
# "other" is a game of several parts' alone: the bytes that belong to another part of it,
# which the one map of the game shows as varying with the part loaded.
CATS = ["code", "graphics", "levels", "sound", "text", "tables", "variables", "runtime", "rom", "other", "unused"]
NAME_HINTS = [  # symbol-name fallbacks for small things nobody declares as a region
    (("str_", "text_", "msg_", "string"), "text"),
    (("tune_", "music_", "sfx_", "sound_", "note_", "melody"), "sound"),
    (("logo", "sprite", "shape", "glyph", "charset", "font"), "graphics"),
    (("maze", "level", "terrain", "world_map", "room_"), "levels"),
]


def hexint(v):
    return int(v[1:], 16) if isinstance(v, str) and v.startswith("$") else int(v)


def footprint(gdir, game):
    """Classify every byte the platform's map draws (PLATFORM_MAP_SPAN, else all 65536).
    Returns (runs, totals, symbols, span)."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from symbols_export import regions as cov_regions, PLATFORM_DEFAULTS, platform_of
    lp = os.path.join(gdir, "listing.json")
    if not os.path.isfile(lp):
        rel = os.path.relpath(gdir, ROOT)
        sys.exit(f"{rel} has no listing.json. Build it from the symbol map and a snapshot first:\n"
                 f"  python3 kit/scripts/symbols_export.py {rel}\n"
                 f"  python3 kit/scripts/listing.py {rel} <snapshot.vsf>")
    L = json.load(open(lp))
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
        k = "rom" if re.search(r"\bROMs?\b", name, re.I) else "runtime"   # the word, not "from"
        for a in range(lo, hi + 1):
            cat[a] = k; why[a] = name
    # video charset: graphics. Its size is the machine's (symbols_export.PLATFORM_DEFAULTS):
    # the C64's font is 2 KB, the Spectrum's ROM font 768 bytes.
    v = game.get("video") or {}
    if v.get("charset"):
        a0 = hexint(v["charset"])
        cs = PLATFORM_DEFAULTS.get(platform_of(game), {}).get("charset_size", 0x800)
        for a in range(a0, a0 + cs):
            if cat[a] != "unused":
                cat[a] = "graphics"; why[a] = "character set"
    # declared regions win
    for lo, hi, k, name in game.get("regions", []):
        for a in range(hexint(lo), hexint(hi) + 1):
            if cat[a] != "unused":
                cat[a] = k; why[a] = name
    # but not over what another part of the game owns (kit/scripts/parts.py)
    for lo, hi, name in cov_regions(game).get("elsewhere", []):
        for a in range(lo, hi + 1):
            cat[a] = "other"; why[a] = name
    lo, hi = PLATFORM_MAP_SPAN.get(platform_of(game), (0, 0x10000))
    if lo:   # the ROM is off this map, so RAM that a game.json names after the ROM is working memory
        cat[lo:hi] = ["runtime" if k == "rom" else k for k in cat[lo:hi]]
    runs, totals = [], {k: 0 for k in CATS}
    a = lo
    while a < hi:
        b = a
        while b < hi and cat[b] == cat[a] and why[b] == why[a]:
            b += 1
        totals[cat[a]] += b - a
        if cat[a] != "unused":
            runs.append([a, b - a, cat[a], why[a]])
        a = b
    symbols = [[e["a"], e["n"]] for e in L["index"] if e["k"] != "branch"]
    return runs, totals, symbols, (lo, hi)


def footprint_table(totals, plat="c64", span=(0, 0x10000)):
    names = PLATFORM_FOOT_WORDS.get(plat, PLATFORM_FOOT_WORDS["c64"])
    program = sum(totals[k] for k in ("code", "graphics", "levels", "sound", "text", "tables", "variables"))
    rows = [("Program", program)] + [(html.escape({"code": "Code", "graphics": "Graphics", "levels": "Level data", "sound": "Sound",
             "text": "Text", "tables": "Tables", "variables": "Variables"}[k]), totals[k]) for k in
             ("code", "graphics", "levels", "sound", "text", "tables", "variables") if totals[k]]
    rows += [(html.escape(names["runtime"]), totals["runtime"])]
    if totals["rom"]:
        rows += [(html.escape(names.get("rom", "ROM")), totals["rom"])]
    if totals["other"]:
        rows += [("Varies with the part loaded", totals["other"])]
    rows += [("Unused", totals["unused"])]
    size = span[1] - span[0]
    out = f"<div class='tablewrap'><table><tr><th>What</th><th>Bytes</th><th>Of {size // 1024} KB</th></tr>"
    for i, (name, n) in enumerate(rows):
        b = "<b>" if i == 0 else ""; e = "</b>" if i == 0 else ""
        out += f"<tr><td>{b}{name}{e}</td><td>{b}{n:,}{e}</td><td>{b}{100*n/size:.1f} %{e}</td></tr>"
    return out + "</table></div>"


# --- pieces -----------------------------------------------------------------
def read(p):
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def lessons():
    """kit/lessons/ as one page: its README, then a file per lesson, newest first. A lesson's
    heading starts with the kit version it went into, or with `next` until the bump after its
    merge; those sort first."""
    d = os.path.join(ROOT, "kit", "lessons")

    def key(f):
        m = re.match(r"## (\d+(?:\.\d+)*) · ", read(os.path.join(d, f)))
        return (tuple(map(int, m.group(1).split("."))) if m else (float("inf"),), f)
    files = sorted((f for f in os.listdir(d) if f.endswith(".md") and f != "README.md"), key=key, reverse=True)
    return "\n\n".join(read(os.path.join(d, f)) for f in ["README.md"] + files)


TIER_NAMES = {"silver-claimed": "silver (claimed)"}


def tier_name(t):
    """How a tier reads on the page: game.json's value, except silver-claimed."""
    return TIER_NAMES.get(t, t)


def tabbar(game, present, lib):
    tabs = "".join(f'<a class="tab" href="{"./" if f == "index.html" else f}">{n}</a>'
                   for f, n in game.get("tabs", TABS) if f in present)
    tier = game.get("tier", "none")
    custom_tabs = "tabs" in game
    inner_class = "in many-tabs" if custom_tabs else "in"
    tabs = f'<span class="tab-list">{tabs}</span>' if custom_tabs else tabs
    return (f'<nav class="gametabs"><div class="{inner_class}"><span class="crumb"><a href="{lib}/../">Games Explained</a> / '
            f'{PLATFORM_NAMES.get(game.get("platform"), game.get("platform"))} / {html.escape(game.get("title", ""))}</span>'
            f'{tabs}<span class="tier">tier <b>{html.escape(tier_name(tier))}</b></span></div></nav>')


_proven = {}


def proven_models():
    """The proven models, worked out once a build: models.py reads every game.json to settle them."""
    if "p" not in _proven:
        _proven["p"] = proven()
    return _proven["p"]


def banner(game, cons):
    """One line under the tabs: who curated it, or how to take it further.

    Gold and Platinum name the humans (git authors, linked). Silver is agent-generated
    and asks for a human editor, and credits the contributor (git authors, linked).
    Silver (claimed) is a Silver a human has started editing: it names them (the
    steward in game.json) as editing it to a Gold standard, with no prompt, so nobody
    starts the same work twice.
    Bronze, or no tier, is unfinished and asks for a
    contributor. The prompt behind the button is the one line to paste into an agent.
    A run on a model not yet proven is published whole, and its banner says that it awaits
    a maintainer's check (kit/CHECKING.md) before saying what else is missing (#142).
    """
    tier = game.get("tier", "none")
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "")
    where = f'games/{game["platform"]}/{game["slug"]}'
    if tier in ("gold", "platinum"):
        who = ", ".join(person_html(n, l) for _, n, l in cons)
        body = f'This minisite was curated by {who}.' if who else 'This minisite was curated by hand.'
    elif tier == "silver":
        who = ", ".join(person_html(n, l) for _, n, l in cons)
        lead = f'This minisite was contributed by {who}. ' if who else 'This minisite was contributed. '
        prompt = f"Clone {repo} and follow kit/START.md to curate {where} with me to Gold."
        body = (lead + 'It\u2019s agent-generated and needs a human editor. '
                f'<span class="prompt" id="prompt">{html.escape(prompt)}</span>'
                '<button type="button" data-copy="#prompt">Copy the prompt to work on it</button>')
    elif tier == "silver-claimed":
        who = ", ".join(person_html(n, l) for _, n, l in cons)
        lead = f'This minisite was contributed by {who}. ' if who else 'This minisite was contributed. '
        st = game.get("steward") or ""
        if not st:
            warn(f"{where} is silver-claimed with no steward; set steward in game.json to the editor's GitHub login")
        ed = f'<a href="https://github.com/{html.escape(st)}">{html.escape(st)}</a>' if st else 'an editor'
        body = lead + f'It\u2019s currently claimed by {ed} who is editing it to reach a Gold tier standard.'
    else:
        cov = game.get("coverage_percent") or 0
        prompt = f"Clone {repo} and follow kit/START.md to continue {where} to Silver."
        n, m = game.get("_parts", (1, 1))
        how = (f'{cov:g} % of the program is explained' if n == m else
               f'{n} of its {m} parts {"is" if n == 1 else "are"} analysed, and {cov:g} % of that is explained')
        ask = (f'<span class="prompt" id="prompt">{html.escape(prompt)}</span>'
               '<button type="button" data-copy="#prompt">Copy the prompt to work on it</button>')
        need = awaits_check(game, proven_models())
        if not need:
            body = f'This minisite is not complete: {how}. ' + ask
        else:
            who = " and ".join("one whose name was not recorded" if x == "unknown" else html.escape(x) for x in need)
            body = (f'This minisite awaits a maintainer\u2019s check. {"A model" if len(need) == 1 else "Models"} '
                    f'this site has not proven yet worked on it ({who}), so its claims have not been tested '
                    f'against the game (<a href="{repo}/blob/main/kit/CHECKING.md">how the check works</a>).')
            if cov < 100 or n < m:
                body += f' It is not complete either: {how}. ' + ask
    return f'<div class="gamebanner {html.escape(tier)}">{body}</div>'


# the tabs build.py assembles, which every game has, and the file each one's edit link opens:
# the prose the reader sees most of. Every other tab is a page in the game folder, edited as it is
ASSEMBLED = {"source.html": "facts.md", "about.html": "features.md"}


def edit_footer(game, tab, f=None):
    """The 'Edit this page' footer: a link to GitHub's editor for the file behind this tab,
    or for f, a path in the game folder, when the page is made from another (a part's facts).

    GitHub's /edit/ URL forks the repository for anyone without write access and turns
    the edit into a pull request, so a reader can fix a mistake without cloning anything.
    """
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "").rstrip("/")
    where = f'games/{game["platform"]}/{game["slug"]}'
    f = f or ASSEMBLED.get(tab, tab)
    edit, hist, tree = (f"{repo}/edit/main/{where}/{f}", f"{repo}/commits/main/{where}", f"{repo}/tree/main/{where}")
    return (f'<footer class="editfoot"><div class="in">'
            f'<p><b>Spotted a mistake, or know something we don\u2019t?</b> '
            'Make edits on GitHub and submit as a pull request.</p>'
            f'<p class="acts"><a class="btn" href="{html.escape(edit)}">Edit this page on GitHub</a>'
            f'<a href="{html.escape(hist)}">History</a><a href="{html.escape(tree)}">All the files for this game</a></p>'
            f'</div></footer>')


def at_end(page, foot):
    """Put the edit footer above the page's own site footer, or last in the body if it has none."""
    m = re.search(r"<footer\b", page, re.I) or re.search(r"</body>", page, re.I)
    return page[:m.start()] + foot + "\n" + page[m.start():] if m else page + "\n" + foot + "\n"


def under_title(page, ban):
    """Place the banner after the page's first <h1>, the game's title; after the tabs if there is none."""
    m = re.search(r"</h1>", page, re.I)
    if m:
        return page[:m.end()] + "\n" + ban + page[m.end():]
    return page.replace("</nav>", "</nav>\n" + ban, 1)


# --- every tab but Source: the page's sections, listed in the left margin -------------
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Outline(html.parser.HTMLParser):
    """What a page's margin list is made of, in page order: each top-level <section>, with
    its label (the .fig line, "NN · label") and its first <h2>, and every other <h2> as an
    entry of its own. Records where each element opens and its id, and reads a heading
    without the badges in it. Nothing inside a block hidden with the page editor (data-cut)
    is listed: a reader never sees it."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items, self.depth, self.sec, self.grab, self.skip, self.cut = [], 0, None, None, 0, None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = set((a.get("class") or "").split())
        if self.cut:   # [tag, how many of that tag are open] for the hidden block being skipped
            self.cut[1] += tag == self.cut[0]
            return
        if "data-cut" in a and tag not in VOID_TAGS:
            self.cut = [tag, 1]
            return
        if self.grab:
            if tag == "span" and (self.skip or cls & {"tag", "badge"}):
                self.skip += 1
            elif tag == "br" and not self.skip:
                self.handle_data(" ")
            return
        if tag == "section":
            self.depth += 1
            if self.depth == 1:
                self.sec = {"el": "section", "at": self.getpos(), "id": a.get("id"), "fig": None, "h2": None}
                self.items.append(self.sec)
        elif tag == "h2":
            if self.sec and self.sec["h2"] is None:
                self.sec["h2"] = ""; self.grab = ("h2", self.sec)
            else:
                item = {"el": "h2", "at": self.getpos(), "id": a.get("id"), "fig": None, "h2": ""}
                self.items.append(item); self.grab = ("h2", item)
        elif "fig" in cls and self.sec and self.sec["fig"] is None and self.sec["h2"] is None:
            self.sec["fig"] = ""; self.grab = (tag, self.sec)

    def handle_endtag(self, tag):
        if self.cut:
            if tag == self.cut[0]:
                self.cut[1] -= 1
                self.cut = self.cut if self.cut[1] else None
            return
        if self.grab:
            if tag == "span" and self.skip:
                self.skip -= 1
            elif tag == self.grab[0]:
                self.grab = None
        elif tag == "section" and self.depth:
            self.depth -= 1
            if not self.depth:
                self.sec = None

    def handle_data(self, data):
        if self.grab and not self.skip and not self.cut:
            what, item = self.grab
            item["h2" if what == "h2" else "fig"] += data


def section_tag(label, heading):
    """(tag, heading) as the margin list shows a section.

    A tag comes only from the heading's own prefix, "Bug:", "Secret:", "Music:" or "Sound:",
    which the list shows as a tag in front of the rest of the heading. Nothing is guessed from
    the label or the wording: the page's author decides.
    """
    m = re.match(r"(bug|secret|music|sound)\s*:\s*", heading, re.I)
    if m:
        rest = heading[m.end():]
        return m.group(1).lower(), rest[:1].upper() + rest[1:]
    return "", heading


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", " and ").replace("'", "").replace("’", ""))
    return s.strip("-")[:40].strip("-")


def pagenav(page):
    """List a page's sections in the left margin by heading, giving each one an id to link to.

    The list is in the page from the first paint, before any script runs; site.js marks the
    section being read, adds any section or heading the page's own script writes, and on a
    narrow screen makes the list a drawer. Every tab but Source gets one, so the page column
    sits in the same place on each.
    """
    scan = Outline()
    scan.feed(page); scan.close()
    starts = [0] + [m.end() for m in re.finditer("\n", page)]
    taken = set(re.findall(r'\bid="([^"]+)"', page))
    edits, items = [], []
    for s in scan.items:
        fig = " ".join((s["fig"] or "").split())
        m = re.match(r"(\d+)\s*[·:.–—-]\s*(.*)", fig)
        num, label = (m.group(1), m.group(2)) if m else ("", fig)
        heading = " ".join((s["h2"] or "").split()) or label
        if not heading:
            continue
        sid = s["id"]
        if not sid:
            base = slug(label or heading) or "section"
            sid, n = base, 2
            while sid in taken:
                sid, n = f"{base}-{n}", n + 1
            edits.append((starts[s["at"][0] - 1] + s["at"][1], s["el"], sid))
        taken.add(sid)
        tag, text = section_tag(label, heading)
        k = f'<span class="k {tag}">{tag.capitalize()}</span> ' if tag else ""
        items.append(f'<li><a href="#{html.escape(sid)}"><span class="n">{html.escape(num)}</span>'
                     f'<span class="h">{k}{html.escape(text, quote=False)}</span></a></li>')
    if len(items) < 2:   # one entry is no list; the nav stays so the column sits where it does on every tab
        items = []
    for at, el, sid in sorted(edits, reverse=True):
        n = len(el) + 1
        if page[at:at + n].lower() == "<" + el:
            page = page[:at + n] + f' id="{html.escape(sid)}"' + page[at + n:]
    nav = ('<nav class="pagenav" id="pagenav" aria-label="On this page"><div class="in">'
           '<p class="hd">On this page</p><ol>' + "".join(items) + "</ol>"
           '<a class="top" href="#">↑ Back to the top</a></div></nav>')
    m = re.search(r'<nav class="gametabs">.*?</nav>', page, re.S)
    return page[:m.end()] + "\n" + nav + page[m.end():] if m else nav + "\n" + page


FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900'
         '&family=IBM+Plex+Mono:wght@400;500&display=swap">')


def links_asset(page, name):
    """True when the page already loads name through a <script src> or <link href>.

    A plain substring test is not enough: a page's own scripts can mention site.js in a
    comment (Mercenary's do), and then the shared script was never added.
    """
    return re.search(r'<(?:script|link)\b[^>]*\b(?:src|href)="[^"]*/' + re.escape(name) + r'(?:\?[^"]*)?"', page) is not None


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
    if not links_asset(page, "site.css"):
        i = page.rfind("</style>")
        page = page[:i + 8] + "\n" + hook + page[i + 8:] if i >= 0 else hook + "\n" + page
    if "<meta charset" not in page:
        page = '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + page
    if not links_asset(page, "site.js"):
        page += f'\n<script src="{lib}/site.js"></script>\n'
    return page


# agents and bots, by the addresses their commit trailers or authorship carry
BOT_EMAILS = ("noreply@anthropic.com",      # Claude Code
              "noreply@openai.com",         # Codex, and ChatGPT's cloud Codex
              "noreply@meta.ai",            # Muse
              "+Copilot@users.noreply.github.com",   # GitHub Copilot's coding agent, which can be the commit author
              "[bot]@users.noreply.github.com")
GITHUB_NOREPLY = re.compile(r"^(?:\d+\+)?([A-Za-z0-9-]+)@users\.noreply\.github\.com$")
# The accounts GitHub names for an agent's own address. They are users like any other, so
# an author resolved to one would be credited as a person: on 4 October 2026 GitHub gave
# claude for noreply@anthropic.com and codex for noreply@openai.com. An agent that commits
# under another address of its account is still an agent.
AGENT_LOGINS = ("claude", "codex")
_accounts = {}   # author address -> (login, type), or None where GitHub names no account: asked once a build
_github_off = []   # why GitHub is not asked again this build, once a request has failed
_unasked = set()   # authors a build with no token left unlinked, for the one line main() prints


def github_repo():
    """owner/name of the repository GitHub is asked about: the one the build runs in, else the site's."""
    return (os.environ.get("GITHUB_REPOSITORY")
            or json.load(open(os.path.join(SITE, "config.json"))).get("repo", "").rstrip("/").split("github.com/")[-1])


def ask_github(sha, token):
    """(login, type) of the account GitHub credits commit sha's author as, or None: one request."""
    req = urllib.request.Request(f"https://api.github.com/repos/{github_repo()}/commits/{sha}",
                                 headers={"Accept": "application/vnd.github+json", "User-Agent": "gamesexplained-build",
                                          "Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=10) as r:
        a = json.load(r).get("author") or {}
    return (a["login"], a.get("type") or "User") if a.get("login") else None


def github_account(email, sha):
    """The account GitHub says an author's address belongs to, as (login, type), else None.

    GitHub links a commit to the account its author address is registered to, and only
    GitHub can: a pull request merged with "Squash and merge" is authored under the
    account's primary address, not the noreply one its branch was committed under. So the
    build asks about one commit per address, and no file has to list a contributor's
    address. It asks only when it has a token (GITHUB_TOKEN or GH_TOKEN; CI's build step
    sets one), so a build on a contributor's computer makes no request and shows such an
    author unlinked. A commit GitHub does not have is an author it cannot name; any other
    failure is the last request of the build, and the build says so."""
    if email in _accounts:
        return _accounts[email]
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token or not sha or _github_off:
        return None
    try:
        _accounts[email] = ask_github(sha, token)
    except urllib.error.HTTPError as e:
        if e.code not in (404, 422):   # 404, 422: a commit that was never pushed
            _github_off.append(f"HTTP {e.code}")
        else:
            _accounts[email] = None
    except Exception as e:
        _github_off.append(str(getattr(e, "reason", e)) or type(e).__name__)
    if _github_off:
        warn(f"GitHub could not be asked who authored {sha[:7]} ({_github_off[0]}): "
             "authors it has to name are unlinked in this build")
    return _accounts.get(email)


def is_agent(email, sha=None):
    """An agent or a bot, never credited: by its address, or by the account behind the address.

    The address is the usual sign, and such an address is never put to GitHub. The account
    is the other sign: an author GitHub resolves to an agent's account (AGENT_LOGINS), or to
    one that is not a user's, is an agent whatever address it committed under."""
    if any(email.endswith(b) for b in BOT_EMAILS):
        return True
    m = GITHUB_NOREPLY.match(email)
    login, kind = (m.group(1), "User") if m else github_account(email, sha) or (None, "User")
    return kind != "User" or (login or "").lower() in AGENT_LOGINS


def github_login(email, sha=None):
    """The author's GitHub login, else None.

    Read from a canonical <login>@users.noreply.github.com address; for any other address it
    is the account GitHub names for commit sha (github_account). Never an agent's: is_agent
    is asked here as well as by the callers, so a caller that forgot cannot credit one."""
    if is_agent(email, sha):
        return None
    m = GITHUB_NOREPLY.match(email)
    if m:
        return m.group(1)
    return (github_account(email, sha) or (None,))[0]


def person_html(name, login):
    """A contributor as the site shows one: their GitHub login, linked, or their name when there is none."""
    return f'<a href="https://github.com/{html.escape(login)}">{html.escape(login)}</a>' if login else html.escape(name)


def contributors(gdir):
    """(commits, name, github login or None) per human author of this game folder (credit)."""
    try:
        out = subprocess.run(["git", "log", "--no-merges", "--format=%aN\t%aE\t%H", "HEAD", "--", gdir],
                             cwd=ROOT, capture_output=True, text=True).stdout
    except Exception:
        out = ""
    return credit(ln.split("\t") for ln in out.splitlines() if ln.count("\t") == 2)


def credit(authors):
    """(commits, name, github login or None) per person among (name, address, commit) authors,
    listed newest commit first as git log gives them.

    Git authors only, through .mailmap. Agents are co-authors in trailers, never authors,
    and one that authored a commit anyway is left out (is_agent). The login comes from the
    GitHub noreply address, in either form: <login>@users.noreply.github.com, or
    <id>+<login>@ as GitHub writes on commits made on the web. An author under any other
    address is whoever GitHub says that address belongs to (github_account), asked about
    their newest commit. Every address of one login is one row. An author GitHub cannot
    name is shown unlinked and the build says so, so a .mailmap line can be added; one it
    was not asked about is shown unlinked too, and main() says how many.
    """
    counts, newest = {}, {}
    for name, email, sha in authors:
        counts[(name, email)] = counts.get((name, email), 0) + 1
        newest.setdefault(email, sha)
    rows = {}
    for (name, email), n in sorted(counts.items(), key=lambda kv: -kv[1]):
        sha = newest[email]
        if is_agent(email, sha):
            continue
        login = github_login(email, sha)
        if not login and email in _accounts:
            warn(f"contributor {name} (commit {sha[:7]}) has no GitHub login: GitHub names no account for that "
                 "commit's author; add a .mailmap line mapping their address to <login>@users.noreply.github.com")
        elif not login and not _github_off:
            _unasked.add(name)
        c, shown, _ = rows.get(login or (name, email), (0, name, login))   # the name of the alias with most commits
        rows[login or (name, email)] = (c + n, shown, login)
    return sorted(rows.values(), key=lambda r: -r[0])


def fill(tpl, **kw):
    for k, v in kw.items():
        tpl = tpl.replace("{{" + k + "}}", str(v))
    return tpl


LIB = "../../lib"   # site/lib/ as a game's pages see it
LAYOUTS = ("about-layout.html",)   # a game's own template for an assembled tab, not a page of its own
PAGE_NAME = re.compile(r"[a-z0-9-]+\.html")   # a tab is a page beside index.html, never a path


def authored(gdir, game=None):
    """The pages a game writes itself, in tab order: index.html, and every page its tabs name
    (game.json's "tabs", or TABS when it has none) that is not assembled and is in its folder."""
    if game is None:
        game = json.load(open(os.path.join(gdir, "game.json")))
    names = [f for f, _ in game.get("tabs", TABS) if f != "index.html" and f not in ASSEMBLED and PAGE_NAME.fullmatch(f)]
    return ["index.html"] + [f for f in dict.fromkeys(names) if os.path.isfile(os.path.join(gdir, f))]


def present_tabs(gdir, game=None):
    """The tabs a game has: the assembled ones every game gets, and the pages it wrote."""
    return set(ASSEMBLED) | set(authored(gdir, game))


def check_tabs(gdir, game):
    """Warn about a tab whose page is missing, and a page no tab names: the build leaves both out."""
    where = os.path.relpath(gdir, ROOT).replace(os.sep, "/")
    for f, _ in game.get("tabs", []):
        if not PAGE_NAME.fullmatch(f):
            warn(f"{where}: game.json has a tab for {f!r}, which is not a page name like controls.html; the tab is left out")
        elif f not in ASSEMBLED and not os.path.isfile(os.path.join(gdir, f)):
            warn(f"{where}: game.json has a tab for {f}, which is not in the folder; the tab is left out")
    pages = set(authored(gdir, game)) | set(LAYOUTS)
    for p in sorted(glob.glob(os.path.join(gdir, "*.html"))):
        if os.path.basename(p) not in pages:
            warn(f"{where}: {os.path.basename(p)} is not published, because no tab names it: "
                 "list every tab, this one included, in game.json's \"tabs\"")


def authored_page(gdir, game, f, nav, ban, src=None):
    """One authored tab as the site serves it: the template's placeholders filled from game.json
    (new_game.py fills only the .md files), the tab bar, the banner, the edit footer and the
    section list added. src is the page's source, read from the game folder when not given;
    the page editor, kit/scripts/edit.py, passes a copy with its blocks tagged."""
    plat = game["platform"]
    head = dict(title=html.escape(game.get("title", game["slug"])), platform=PLATFORM_NAMES.get(plat, plat),
                year=game.get("year") or "", publisher=html.escape(game.get("publisher") or ""))
    page = fill(read(os.path.join(gdir, f)) if src is None else src, **head)
    return pagenav(at_end(under_title(inject(page, nav, LIB), ban), edit_footer(game, f)))


# --- a game of several parts (kit/scripts/parts.py): a Source page and a footprint for each
PILLS = 8   # more parts than this are a list to choose from, not a row to read


def part_page(p):
    """A part's Source page. source.html is a copy of the first, so the tab has somewhere to go
    and a part's own address never depends on the order the parts are listed in."""
    return f"source-{p['id']}.html"


def part_pages(P):
    """{part id: its Source page} for the parts that have one, the names the facts of a game of
    several parts write before an address. {} for a game of one."""
    return {p["id"]: part_page(p) for p in (P or []) if listed(p)}


def listed(p):
    return os.path.isfile(os.path.join(p["dir"], "listing.json"))


def part_pills(P, cur):
    """The parts above a listing, in the order they are played: each a link to its Source
    page, the one being read marked, a part with no listing named without a link."""
    if len(P) > PILLS:
        return ""
    items = []
    for p in P:
        t = html.escape(p["title"])
        if p is cur:
            items.append(f'<a class="on" aria-current="page" href="{part_page(p)}">{t}</a>')
        elif listed(p):
            items.append(f'<a href="{part_page(p)}">{t}</a>')
        else:
            items.append(f'<span class="none" title="Not analysed">{t}</span>')
    return '<nav class="partpick" aria-label="The parts of the game">' + "".join(items) + "</nav>"


def part_step(P, cur):
    """The control beside a listing: the part before, a list of the parts that have a listing,
    the part after. Nothing when this is the only one: there is nowhere to step to, and the
    parts not analysed are named above the listing, or counted there. The same three pieces,
    in the same markup, are what a levels page steps through rooms with (site.css, .pick)."""
    shown = [p for p in P if listed(p)]
    if len(shown) < 2:
        return ""
    i = shown.index(cur)
    def arrow(p, ch, rel, word):
        if p is None:
            return f'<span class="step off" aria-hidden="true">{ch}</span>'
        return (f'<a class="step" rel="{rel}" href="{part_page(p)}" title="{html.escape(p["title"])}" '
                f'aria-label="{word} part: {html.escape(p["title"])}">{ch}</a>')
    opts = "".join(f'<option value="{part_page(p)}"{" selected" if p is cur else ""}>{html.escape(p["title"])}</option>'
                   for p in shown)
    return ('<div class="pick">' + arrow(shown[i - 1] if i else None, "\u2039", "prev", "Previous")
            + f'<select data-go aria-label="Part of the game">{opts}</select>'
            + arrow(shown[i + 1] if i + 1 < len(shown) else None, "\u203a", "next", "Next") + "</div>")


def part_sources(gdir, game, P, out, nav, ban, common, cheats):
    """One Source page per part that has a listing, each with the part's own facts, then the
    game's. Addresses in a part's facts link into its own page; the game's facts and cheats
    name addresses in several parts, so they link to none. In either, an address written with
    a part's name before it ("engine `$25BD`") links into that part's page."""
    shown = [p for p in P if listed(p)]
    pages = part_pages(P)
    whole = read(os.path.join(gdir, "facts.md"))
    whole = ('<h2>The whole game</h2><div data-part="">' + markdown(whole, addr=False, shift=1, parts=pages)
             + "</div>") if whole.strip() else ""
    if cheats.strip():
        whole += '<h2>Cheats</h2><div data-part="">' + markdown(cheats, addr=False, parts=pages) + "</div>"
    tpl = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav)
    for p in shown:
        page, beneath = part_page(p), [q for q in reversed(under(P, p)) if listed(q)]
        facts = f"<h2>{html.escape(p['title'])}</h2>" + markdown(read(os.path.join(p["dir"], "facts.md")), addr=page, shift=1,
                                                                   parts=pages)
        note = ""
        if beneath:
            note = (f'<p class="mute">{html.escape(p["title"])} is loaded over {html.escape(" and ".join(q["title"] for q in beneath))}. '
                    "The listing shows them together, as the machine holds them; the rows of this part are marked.</p>")
        pills = part_pills(P, p)
        if len(shown) == len(P):
            each = "Each part has a listing of its own" + ("." if pills else ", chosen from the list beside it.")
        else:       # say how many, where the row of parts is too long to show which
            each = (f"{len(shown)} of them {'has' if len(shown) == 1 else 'have'} a listing"
                    + ("." if pills or len(shown) < 2 else ", chosen from the list beside it."))
        lead = (f'<p class="mute">This game is in {len(P)} parts, and the same addresses hold something else in each. '
                + each + "</p>")
        info = {"id": p["id"], "title": p["title"], "listing": f"parts/{p['id']}/listing.json",
                "under": [{"id": q["id"], "title": q["title"], "listing": f"parts/{q['id']}/listing.json"} for q in beneath]}
        src = tpl.replace("<!-- facts -->", facts + whole)
        src = src.replace("<!-- parts -->", lead + pills + note)
        src = src.replace("<!-- pick -->", part_step(P, p))
        src = src.replace("<!-- part -->", '<script type="application/json" id="part">'
                          + json.dumps(info).replace("</", "<\\/") + "</script>")
        src = under_title(src, ban)
        if not links_asset(src, "site.js"):
            src += f'\n<script src="{LIB}/site.js"></script>\n'
        src = at_end(src, edit_footer(game, "source.html", f"parts/{p['id']}/facts.md"))
        for name in ([page, "source.html"] if p is shown[0] else [page]):
            open(os.path.join(out, name), "w").write(src)
        dst = os.path.join(out, "parts", p["id"])
        os.makedirs(dst, exist_ok=True)
        for f in ("listing.json", "symbols.json"):
            if os.path.exists(os.path.join(p["dir"], f)):
                shutil.copy(os.path.join(p["dir"], f), dst)


def game_footprint(P, out, plat):
    """The one map of a game of several parts, for the About tab and the catalogue: the part
    the others are loaded over (the first that lies over none), with the addresses the other
    parts own as one band, "varies with the part loaded". Which part holds what is the Source
    tab's to show, part by part; here a reader wants the shape of the game, once.
    Returns the game's totals (its program summed over the parts, for the catalogue's size),
    and the About tab's table with a line saying what the map is of."""
    shown = [p for p in P if listed(p)]
    root = next((p for p in shown if not p["over"]), shown[0])
    runs, t, symbols, span = footprint(root["dir"], load_game(root["dir"]))
    doc = {"runs": runs, "totals": t, "symbols": symbols, "source": part_page(root)}
    if span != (0, 0x10000):   # memmap.js draws all 64 KB unless told otherwise
        doc.update(base=span[0], size=span[1] - span[0])
    json.dump(doc, open(os.path.join(out, "memmap.json"), "w"), separators=(",", ":"))
    totals = dict(t)
    for p in shown:
        if p is not root:
            other = footprint(p["dir"], load_game(p["dir"]))[1]
            for k in PROGRAM:
                totals[k] += other[k]
    over = above(P, root)
    apart = [p for p in P if p is not root and p not in over]
    name = html.escape(root["title"])
    # What the map is of, and no more: a part that names none beneath it may replace all of memory
    # or may only not have been split from what stays, and the folders do not say which.
    if over:
        said = (f"This game is in {len(P)} parts. The map is of {name}, which stays in memory; the band marked as "
                f"varying holds whichever of the {len(over)} part{'s' if len(over) != 1 else ''} loaded over it is there. ")
        if apart:
            said += f"The other {len(apart) if len(apart) > 1 else 'part'}{' are' if len(apart) > 1 else ' is'} not on this map. "
    else:
        said = f"This game is in {len(P)} parts, and the map is of one of them: {name}. "
    said += f'The <a href="{part_page(root)}">Source tab</a> has the listing of each part that has one.'
    return totals, footprint_table(t, plat, span) + f'<p class="mute">{said}</p>', span


def data_links(P):
    """Where the symbol maps and listings are, for the About tab's {{data_links}}."""
    if not P:
        return ('The symbol map for this game is <a href="symbols.json">symbols.json</a>; the listing behind the '
                'Source tab is <a href="listing.json">listing.json</a>.')
    if len(P) > PILLS:   # too many to name: say where they are
        return ("Each part of the game has its own symbol map and listing, <code>parts/&lt;id&gt;/symbols.json</code> and "
                "<code>parts/&lt;id&gt;/listing.json</code>; the ids are the ones in its Source pages\u2019 addresses.")
    return "Each part of the game has its own symbol map and listing: " + "; ".join(
        f'{html.escape(p["title"])}, <a href="parts/{p["id"]}/symbols.json">symbols.json</a> and '
        f'<a href="parts/{p["id"]}/listing.json">listing.json</a>' for p in P if listed(p)) + "."


def build_game(gdir, out_root):
    game = json.load(open(os.path.join(gdir, "game.json")))
    plat, slug = game["platform"], game["slug"]
    out = os.path.join(out_root, plat, slug)
    os.makedirs(out, exist_ok=True)
    lib = LIB
    check_tabs(gdir, game)
    P = parts(gdir)
    if P and not any(listed(p) for p in P):
        sys.exit(f"{os.path.relpath(gdir, ROOT)} is a game of several parts and none has a listing.json. "
                 "Build one from a part's symbol map and its snapshot first (kit/scripts/listing.py).")
    if P:
        game["_parts"] = (sum(1 for p in P if started(p)), len(P))
    present = present_tabs(gdir, game)
    cons = contributors(gdir)
    nav = tabbar(game, present, lib)
    ban = banner(game, cons)
    platform_scripts = "".join(f'<script src="{lib}/{f}"></script>' for f in PLATFORM_MAP_LIBS.get(plat, []))
    common = dict(title=html.escape(game.get("title", slug)), lib=lib, build=html.escape(game.get("build") or ""),
                  platform=plat, platform_name=PLATFORM_NAMES.get(plat, plat), year=game.get("year") or "",
                  publisher=html.escape(game.get("publisher") or ""),
                  platform_map=PLATFORM_MAPS.get(plat, "C64Map"), platform_scripts=platform_scripts,
                  platform_mem=PLATFORM_MEM.get(plat, "the machine's 64 KB"))
    for f in authored(gdir, game):
        open(os.path.join(out, f), "w").write(authored_page(gdir, game, f, nav, ban))
    # source: one page, or one for each part of a game of several
    cheats = read(os.path.join(gdir, "cheats.md"))
    if P:
        part_sources(gdir, game, P, out, nav, ban, common, cheats)
    else:
        facts = markdown(read(os.path.join(gdir, "facts.md")))
        if cheats.strip():
            facts += "<h2>Cheats</h2>" + markdown(cheats)
        src = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav).replace("<!-- facts -->", facts)
        src = under_title(src, ban)
        if not links_asset(src, "site.js"):
            src += f'\n<script src="{lib}/site.js"></script>\n'
        open(os.path.join(out, "source.html"), "w").write(at_end(src, edit_footer(game, "source.html")))
    # about
    cred = [c for c in (game.get("credits") or []) if (c.get("by") or c.get("name", "")).strip()]   # the game's makers; agents live in "model"
    site_contributor_items = "".join(
        (f'<li><a href="https://github.com/{html.escape(login)}">{html.escape(login)}</a>' if login else f"<li>{html.escape(n)}")
        + f" <span class='mute'>({c} commit{'s' if c != 1 else ''})</span></li>" for c, n, login in cons)
    game_credit_items = "".join(
        f"<li>{html.escape(c.get('by') or c.get('name', ''))} <span class='mute'>— {html.escape(c.get('role',''))}</span></li>"
        for c in cred)
    site_contributors = f"<ul>{site_contributor_items}</ul>"
    game_credits = f"<ul>{game_credit_items}</ul>"
    con_html = f"<ul>{site_contributor_items}{game_credit_items}</ul>"
    links = {k: u for k, u in (game.get("links") or {}).items() if u}   # empty slots from the template are not links
    link_html = "<ul>" + "".join(f'<li><a href="{html.escape(u)}">{html.escape(k)}</a></li>' for k, u in links.items()) + "</ul>" if links else "<p class='mute'>None listed yet. Know a write-up, port or forum thread about this game? Add it to game.json.</p>"
    tools = game.get("tools") or {}
    if P:
        totals, foot, span = game_footprint(P, out, plat)
    else:
        runs, totals, symbols, span = footprint(gdir, game)
        memmap = {"runs": runs, "totals": totals, "symbols": symbols}
        if span != (0, 0x10000):   # memmap.js draws all 64 KB unless told otherwise
            memmap.update(base=span[0], size=span[1] - span[0])
        json.dump(memmap, open(os.path.join(out, "memmap.json"), "w"), separators=(",", ":"))
        foot = footprint_table(totals, plat, span)
    game["_totals"] = totals
    about_template = os.path.join(gdir, "about-layout.html")
    if not os.path.isfile(about_template):
        about_template = os.path.join(SITE, "about.html")
    cov = f"{game.get('coverage_percent') or 0:g} %"
    if P and game["_parts"][0] < game["_parts"][1]:
        cov = "In the %d of %d parts analysed, %s" % (*game["_parts"], cov)
    # in a game of several parts an address means nothing without its part, so the files about
    # the whole game link none (site.js leaves the addresses inside data-part="" alone)
    whole = (lambda h: f'<div data-part="">{h}</div>') if P else (lambda h: h)
    about = fill(read(about_template), **common, footprint=foot, data_links=data_links(P), map_row=(span[1] - span[0]) // 128,
                 tier=html.escape(tier_name(game.get("tier", "none"))), coverage=cov,
                 copy=html.escape(str(game.get("copy", ""))), tools=html.escape(", ".join(f"{k}: {v}" for k, v in tools.items())),
                 model=html.escape(str(game.get("model", ""))), kit_version=html.escape(str(game.get("kit_version", ""))),
                 contributors=con_html, site_contributors=site_contributors, game_credits=game_credits,
                 links=link_html,
                 features=whole(markdown(read(os.path.join(gdir, "features.md")), addr=not P, shift=1, parts=part_pages(P))),
                 orientation=whole(markdown(read(os.path.join(gdir, "orientation.md")), addr=not P, shift=1,
                                            parts=part_pages(P)))).replace("<!-- tabs -->", nav)
    about = under_title(about, ban)
    open(os.path.join(out, "about.html"), "w").write(pagenav(at_end(about, edit_footer(game, "about.html"))))
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


LIB_FILES = ("site.css", "site.js", "memmap.js", "c64.js", "sid.js", "spectrum.js")


def lib_versions(out_root):
    """{lib file: the first 8 hex digits of its SHA-1}, for the lib files the build versions."""
    import hashlib
    return {f: hashlib.sha1(open(os.path.join(out_root, "lib", f), "rb").read()).hexdigest()[:8]
            for f in LIB_FILES if os.path.isfile(os.path.join(out_root, "lib", f))}


def version_lib(out_root):
    """Append ?v=<content hash> to every reference to a lib file, so a redeploy is never
    paired with a stylesheet or script the browser cached from the previous one."""
    ver = lib_versions(out_root)
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


PWA_HEAD = """<link rel="manifest" href="{root}manifest.webmanifest">
<meta name="theme-color" content="#23262d">
<link rel="icon" href="{root}icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="icon" href="{root}icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{root}icons/apple-touch-icon.png">
<script>
if ("serviceWorker" in navigator && (location.hostname === "{domain}" || location.hostname === "www.{domain}"))
  addEventListener("load", function () { navigator.serviceWorker.register("{root}sw.js"); });
</script>
"""


def add_pwa(out_root):
    """Make the site installable as an app: the manifest, the icons and the service worker at
    the root, and the lines in every page's head that point at them, relative to the page.

    The service worker sits at the root because it can only answer for pages at or below its
    own folder. It goes to the network first (site/sw.js), so a deploy shows at once. Its
    list of files to save on install names the lib files by their hashes, so the worker's
    bytes change when a lib file does, and that is what makes browsers install the new one.
    Pages register it only on the live domain: on a preview it would stay in the browser and
    answer for whatever is served on that port next, the page editor included."""
    shutil.copytree(os.path.join(SITE, "icons"), os.path.join(out_root, "icons"))
    shutil.copy(os.path.join(SITE, "manifest.webmanifest"), out_root)
    pre = ["./", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png"]
    pre += [f"lib/{f}?v={v}" for f, v in lib_versions(out_root).items()]
    open(os.path.join(out_root, "sw.js"), "w").write(fill(read(os.path.join(SITE, "sw.js")), precache=json.dumps(pre)))
    domain = json.load(open(os.path.join(SITE, "config.json")))["domain"]
    for d, _, files in os.walk(out_root):
        for f in files:
            if f.endswith(".html"):
                p = os.path.join(d, f); page = open(p, encoding="utf-8").read()
                if 'rel="manifest"' in page:
                    continue
                up = os.path.relpath(out_root, d).replace(os.sep, "/")
                head = PWA_HEAD.replace("{root}", "" if up == "." else up + "/").replace("{domain}", domain)
                marker = '<meta charset="utf-8">'
                page = page.replace(marker, marker + "\n" + head, 1) if marker in page else head + page
                open(p, "w", encoding="utf-8").write(page)


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
    what = f"title_image {ti!r} is not a file in the game folder" if ti else "has no title_image"
    warn(f"{plat}/{slug} {what} "
         f"(set it in game.json to a path from the game folder, e.g. reference/title-screen.png)")
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
    return (f'<a class="show" href="{plat}/{slug}/">{shot_html(g)}{strip_html(g)}'
            f'<span class="cap"><b>{html.escape(g.get("title", slug))}</b><span class="m">{html.escape(meta)}</span></span>'
            f'<p class="hook">{html.escape(hook(g))}</p></a>')


def card_html(g):
    """Every game, small: thumbnail, title, a line of facts, the memory strip, the tier."""
    plat, slug = g["platform"], g["slug"]
    kb = sum(g["_totals"][k] for k in PROGRAM) / 1024
    return (f'<a class="tile" href="{plat}/{slug}/" data-platform="{html.escape(plat)}">{shot_html(g, "thumb")}'
            f'<span class="body"><span class="top"><b>{html.escape(g.get("title", slug))}</b>{stamp_html(g)}</span>'
            f'<span class="m">{g.get("year") or ""} · {html.escape(g.get("publisher") or "")} · {kb:.0f} KB</span>{strip_html(g)}</span></a>')


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
    """The game the home page opens with: the one whose game.json says "featured": true,
    else the first at Gold or better, else the first there is."""
    return (next((g for g in games if g.get("featured")), None)
            or next((g for g in games if g.get("tier") in ("gold", "platinum")), games[0] if games else None))


# --- the home page's New and updated row: the latest games added or changed, from git history
PUBLISHED = re.compile(r"(index|levels|play)\.html|(facts|cheats|features|orientation)\.md|(game|listing|symbols)\.json|reference/.+"
                       r"|parts/[^/]+/(facts\.md|(part|listing|symbols)\.json)")


def recent_changes(games, n=4):
    """The newest n changes to games, one row per game per day: {game, date, kind, who}.

    Walks main's first-parent line, so a merged pull request is one change. A change
    counts when it alters what readers see of exactly one game, a file the build
    publishes from one game folder: a sweep across every game, or a change to the kit
    alone, is left out. It is "contributed" when it adds the game's game.json, else
    "updated". The people are the git authors of the change, named as on the About tab
    (credit; for a merge, the authors of the commits it brought in, not whoever merged
    it), agents and bots left out as there."""
    by_key = {(g["platform"], g["slug"]): g for g in games}
    git = lambda *a: subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True).stdout
    try:
        out = git("log", "--first-parent", "--diff-merges=first-parent", "--name-status",
                  "--format=%x1e%H %P%x1f%cs%x1f%aN%x1f%aE", "HEAD", "--", "games")
    except Exception:
        return []
    rows = {}
    for chunk in out.split("\x1e")[1:]:
        head, *files = chunk.strip("\n").split("\n")
        shas, date, name, email = head.split("\x1f")
        sha, *parents = shas.split()
        if len(rows) >= n and date < list(rows.values())[n - 1]["date"]:
            break
        touched, added = set(), set()
        for f in files:
            status, *paths = f.split("\t")
            for p in paths:
                m = re.match(r"games/([^/]+)/([^/]+)/(.+)$", p)
                if m and PUBLISHED.fullmatch(m.group(3)):
                    touched.add(m.group(1, 2))
                    if status == "A" and m.group(3) == "game.json":
                        added.add(m.group(1, 2))
        if len(touched) != 1 or next(iter(touched)) not in by_key:
            continue
        key = next(iter(touched))
        if len(parents) > 1:   # a merge: the people whose commits it brought in, most commits first
            authors = [ln.split("\x1f") for ln in git("log", "--no-merges", "--format=%aN%x1f%aE%x1f%H",
                                                      f"{parents[0]}..{sha}", "--", "games/%s/%s" % key).splitlines()]
        else:
            authors = [(name, email, sha)]
        counts = {}
        for nm, em, at in authors:
            if not is_agent(em, at):
                who = (nm, github_login(em, at))
                counts[who] = counts.get(who, 0) + 1
        row = rows.setdefault(key + (date,), {"game": by_key[key], "date": date, "kind": "updated", "who": {}})
        if key in added:
            row["kind"] = "contributed"
        for who, _ in sorted(counts.items(), key=lambda kv: -kv[1]):
            row["who"].setdefault(who[1] or who[0], who)
    return list(rows.values())[:n]


def recent_html(rows):
    """One small card per change: title screen, the game (the card's link), who and when."""
    if not rows:
        return ""
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "").rstrip("/")
    cards = []
    for r in rows:
        g = r["game"]
        who = [person_html(nm, login) for nm, login in r["who"].values()]
        by = " by " + (", ".join(who[:-1]) + " and " + who[-1] if len(who) > 1 else who[0]) if who else ""
        m, d = (int(x) for x in r["date"].split("-")[1:])
        cards.append(f'<div class="card">{shot_html(g, "thumb")}<span class="body">'
                     f'<a class="g" href="{g["platform"]}/{g["slug"]}/">{html.escape(g.get("title", g["slug"]))}</a>'
                     f'<span class="v">{r["kind"]}{by}</span>'
                     f'<time datetime="{r["date"]}" title="{long_date(r["date"])}">{d} {MONTHS[m - 1][:3]}</time></span></div>')
    return (f'<div class="recent"><div class="cathead"><h2>New and updated</h2>'
            f'<a href="{html.escape(repo)}/commits/main/games">All changes</a></div>'
            f'<div class="cards">{"".join(cards)}</div></div>')


# --- the status page: which kits work on which computers, and the work needed
HOST_STATES = {"works": "Works", "limited": "Limited", "untested": "No run recorded"}
MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September",
          "October", "November", "December")


def long_date(iso):
    """2026-09-24 -> 24 September 2026, the way dates read everywhere else in the repository."""
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def commit_stamp():
    """(date, short hash) of the commit being built, so two builds of one commit are the same page."""
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs %h"], cwd=ROOT, capture_output=True, text=True).stdout.split()
        return long_date(out[0]), out[1]
    except Exception:
        return "an unknown date", "unknown"


def kits():
    """The platforms with a kit: install notes and a launcher in kit/<platform>/ (kit/PLATFORMS.md)."""
    return sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, "kit", "*", "tools.py"))
                  if os.path.isfile(os.path.join(os.path.dirname(p), "INSTALL.md")))


TIER_ORDER = ("platinum", "gold", "silver-claimed", "silver", "bronze", "none")


def by_tier(games):
    """The games best first, as the home page lists them: Platinum and Gold at the top,
    Bronze and no tier at the bottom; within a tier, the order they came in."""
    rank = lambda g: TIER_ORDER.index(g.get("tier", "none")) if g.get("tier", "none") in TIER_ORDER else len(TIER_ORDER)
    return sorted(games, key=rank)


def tier_stamps(gs):
    counts = {}
    for g in gs:
        counts[g.get("tier", "none")] = counts.get(g.get("tier", "none"), 0) + 1
    return " ".join(f'<span class="stamp {html.escape(t)}">{counts[t]} {html.escape(tier_name(t))}</span>'
                    for t in TIER_ORDER if counts.get(t))


def rough(n):
    """A library size to two significant figures, since that is all the sources support: 23,000, 1,400, 460."""
    step = 10 ** max(len(str(int(n))) - 2, 0)
    return int(n / step + 0.5) * step


def status_page(games):
    """site/status.html filled from site/status.json and the repository.

    What the repository knows (which systems have a kit, the games made with each, the
    computer each was made on) is read here at build time. What it cannot know (what a
    kit was measured doing on each kind of computer, how many games a system had) is in
    status.json, each with a date. Works: every kit and computer measured as working.
    Work needed: every other pairing of a kit and a computer, and every system with no kit,
    the ones marked "wanted" first. Every box carries a prompt to paste into an agent;
    status.json can give one of its own as "prompt"."""
    S = json.load(open(os.path.join(SITE, "status.json")))
    raw_repo = json.load(open(os.path.join(SITE, "config.json")))["repo"]
    repo = html.escape(raw_repo)
    blob = lambda path, text: f'<a href="{repo}/blob/main/{path}">{html.escape(text)}</a>'
    have = kits()
    names = {s["id"]: s["name"] for s in S["systems"]}
    name = lambda k: names.get(k) or PLATFORM_NAMES.get(k, k)
    stamp = lambda cls, text: f'<span class="state {cls}">{html.escape(text)}</span>'
    wanted = '<span class="wanted">Wanted</span>'

    ids = iter(range(1, 1000))

    def card(title, state, note, seen, extra, start, want, prompt):
        """One box: what it is, where it stands, and the line to paste into an agent to take it on."""
        date = f' <span class="mute">Recorded {long_date(seen)}.</span>' if seen else ""
        go = f'<p class="start">Start with {" and ".join(start)}.</p>' if start else ""
        pid = f"prompt-{next(ids)}"
        paste = (f'<div class="paste"><code id="{pid}">{html.escape(prompt)}</code>'
                 f'<button type="button" data-copy="#{pid}">Copy</button></div>')
        return (f'<div class="proj{" want" if want else ""}"><p class="top"><b>{title}</b>{wanted if want else ""}</p>{state}'
                f'<p>{html.escape(note)}{date}</p>{extra}{go}{paste}</div>')

    works, research = [], []
    for k in have:
        for h in S["hosts"]:
            c = h["kits"].get(k) or {"state": "untested", "note": "No run recorded."}
            if c["state"] not in HOST_STATES:
                sys.exit(f"site/status.json: host {h['id']}, kit {k}: state {c['state']!r} is not one of {', '.join(HOST_STATES)}")
            title = f'{html.escape(name(k))} on {html.escape(h["name"])}, {html.escape(h["arch"])}'
            if c["state"] == "works":
                pat = re.compile(h["match"], re.I)
                gs = [g for g in games if g["platform"] == k and pat.search(str((g.get("tools") or {}).get("host") or ""))]
                made = ('<p class="made">Games made here: ' + ", ".join(
                    f'<a href="{g["platform"]}/{g["slug"]}/">{html.escape(g.get("title", g["slug"]))}</a>' for g in gs) + '</p>') if gs else ""
                works.append(card(title, stamp("works", HOST_STATES["works"]), c.get("note", ""), c.get("seen"), made, [], False,
                                  c.get("prompt") or f'Clone {raw_repo} and follow kit/START.md. I am on {h["name"]}, {h["arch"]}, '
                                  f'and I want to explain a {name(k)} game.'))
            else:
                start = [blob(f"kit/{k}/INSTALL.md", f"kit/{k}/INSTALL.md"),
                         blob("kit/INSTALL.md#the-footprint-principle", "the footprint principle")]
                prompt = c.get("prompt") or (
                    f'Clone {raw_repo} and follow kit/START.md to explain a {name(k)} game on {h["name"]}, {h["arch"]}. '
                    'Nobody has run the kit here: follow "If you are the first on an operating system" in kit/INSTALL.md, '
                    f'run check-emulator, and record what works in kit/{k}/INSTALL.md and site/status.json.')
                research.append((not c.get("wanted"), card(title, stamp(c["state"], HOST_STATES[c["state"]]), c.get("note", ""),
                                                           c.get("seen"), "", start, c.get("wanted"), prompt)))
    rows = []
    for s in S["systems"]:
        if s["id"] in have:
            continue
        lib = s.get("library") or {}
        meta = " · ".join(str(x) for x in (s.get("maker"), s.get("year"), s.get("cpu")) if x)
        if s.get("wanted"):
            size = f' Its library runs to roughly {rough(lib["games"]):,} titles.' if lib.get("games") else ""
            research.append((False, card(f'{html.escape(s["name"])}, on any computer', stamp("nokit", "No kit"),
                                         (s.get("note") or "No kit on any computer.") + size, None,
                                         f'<p class="m">{html.escape(meta)}</p>',
                                         [blob("kit/PLATFORMS.md", "kit/PLATFORMS.md"), blob("kit/EMULATOR.md", "kit/EMULATOR.md")], True,
                                         s.get("prompt") or f'Clone {raw_repo} and follow kit/PLATFORMS.md to add the {s["name"]} as a '
                                         f'platform: choose an emulator that passes the tests in kit/EMULATOR.md and a disassembler '
                                         f'for its {s.get("cpu") or "CPU"}, both with an agent interface, then take one game to Silver '
                                         'with kit/START.md.')))
            continue
        rows.append(f'<tr><td><b>{html.escape(s["name"])}</b><span class="m">{html.escape(meta)}</span></td>'
                    f'<td class="num">{"~" + format(rough(lib["games"]), ",") if lib.get("games") else "<span class=mute>unknown</span>"}</td></tr>')
    research.sort(key=lambda r: r[0])   # stable: wanted first, otherwise in the order above
    grid = lambda cards: '<div class="projs">' + "".join(cards) + '</div>'
    unrecorded = [g for g in games if not (g.get("tools") or {}).get("host")]
    works_html = grid(works) + (f'<p class="mute">{len(unrecorded)} {"games do" if len(unrecorded) != 1 else "game does"} not record '
                                f'the computer they were made on: {", ".join(html.escape(g.get("title", g["slug"])) for g in unrecorded)}.</p>'
                                if unrecorded else "")
    systems_html = ('<div class="tablewrap"><table class="systems"><tr><th>System</th><th class="num">Library</th></tr>'
                    + "".join(rows) + '</table></div>')

    src = []
    for s in S["systems"]:
        lib = s.get("library") or {}
        if lib.get("games"):
            fig = lib.get("figure") or f'{lib["games"]:,}'
            src.append(f'<li><b>{html.escape(s["name"])}</b>: {html.escape(fig[0].lower() + fig[1:])} {html.escape(lib.get("counts", ""))}. '
                       f'<a href="{html.escape(lib["url"])}">{html.escape(lib["source"])}</a>'
                       + (f', read {long_date(lib["seen"])}' if lib.get("seen") else "") + '.</li>')
    sources_html = ('<p class="mute">Library sizes are rough. Every source counts in its own way: some list only commercial or licensed '
                    'releases, some add public-domain games, type-ins and new games written since, and a few count software of every '
                    'kind. Each line says what its figure counts.</p><ul class="sources">' + "".join(src) + '</ul>')

    # games per system: the systems runs have chosen, most games first
    per = {}
    for g in games:
        per.setdefault(g["platform"], []).append(g)
    top = max((len(v) for v in per.values()), default=1)
    board = "".join(
        f'<tr><td class="num rank">{i}</td><td><b>{html.escape(name(p))}</b></td><td class="num"><b>{len(gs)}</b></td>'
        f'<td class="barcell"><span class="bar" style="width:{100 * len(gs) / top:.1f}%"></span></td>'
        f'<td class="tiers">{tier_stamps(gs)}</td></tr>'
        for i, (p, gs) in enumerate(sorted(per.items(), key=lambda kv: (-len(kv[1]), kv[0])), 1))
    others = len([x for x in S["systems"] if x["id"] not in per])
    board_html = ('<div class="tablewrap"><table class="board"><tr><th class="num">#</th><th>System</th><th class="num">Games</th>'
                  '<th></th><th>Tiers</th></tr>' + board + '</table></div>'
                  + (f'<p class="mute">The other {others} systems on this page have none.</p>' if per and others else ""))

    built, commit = commit_stamp()
    return fill(read(os.path.join(SITE, "status.html")), site_title="Platform status · Games Explained", lib="lib", built=built,
                commit=html.escape(commit), repo=repo, works=works_html, research=grid(r for _, r in research),
                systems=systems_html, sources=sources_html, board=board_html)


def broken_links(out_root):
    """Relative src and href on every built page that point at no file the build wrote.

    A page that links a file of its own beside it builds cleanly and then fails in the
    reader's browser, because a game folder publishes only what build_game copies."""
    bad = []
    for page in sorted(glob.glob(os.path.join(out_root, "**", "*.html"), recursive=True)):
        text = open(page, encoding="utf-8").read()
        for m in re.finditer(r'\b(?:src|href)\s*=\s*(["\'])(.*?)\1', text):
            url = m.group(2)
            if re.search(r"\$\{|\{\{|\s\+|\+\s", url) or re.match(r"[a-z][a-z0-9+.-]*:|//|#", url, re.I):
                continue   # built by a script at run time, or not a file of ours
            if re.compile(r"\s*\+").match(text, m.end()):
                continue   # the first piece of a string a script puts together: href = 'source-' + part
            path = url.split("#")[0].split("?")[0]
            if not path:
                continue
            target = os.path.join(out_root, path.lstrip("/")) if path.startswith("/") else os.path.join(os.path.dirname(page), path)
            if not os.path.exists(os.path.join(os.path.normpath(target), "index.html") if path.endswith("/") else os.path.normpath(target)):
                bad.append((os.path.relpath(page, out_root), url))
    return bad


def cut_blocks(games):
    """(page, tier, count) for every authored page that still has blocks hidden with the page editor.

    kit/scripts/edit.py hides a block that holds a widget instead of cutting it, marked
    data-cut, so the page's scripts keep finding what they look for. The cleanup pass in
    kit/START.md removes it with everything only it used; until then it is dead weight."""
    out = []
    for g in games:
        gdir = os.path.join(ROOT, "games", g["platform"], g["slug"])
        for f in authored(gdir, g):
            n = len(re.findall(r"<[a-zA-Z][^<>]*\sdata-cut\b", read(os.path.join(gdir, f))))
            if n:
                out.append((f'games/{g["platform"]}/{g["slug"]}/{f}', g.get("tier", "none"), n))
    return out


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
                cards="".join(card_html(g) for g in by_tier(games)), featured=featured_html(feat) if feat else "",
                recent=recent_html(recent_changes(games)), platforms=platforms_html(games), n_games=len(games))
    open(os.path.join(out_root, "index.html"), "w").write(home)
    # what the kit learned, game by game
    log = markdown(lessons(), drop_h1=False, addr=False)
    page = fill(read(os.path.join(SITE, "page.html")), site_title="How the kit has changed", lib="lib", body=log,
                version=read(os.path.join(ROOT, "kit", "VERSION")).strip())
    open(os.path.join(out_root, "kit.html"), "w").write(page)
    open(os.path.join(out_root, "status.html"), "w").write(status_page(games))
    # the site's About page; site/about.html is the About tab of a game
    repo = html.escape(json.load(open(os.path.join(SITE, "config.json")))["repo"].rstrip("/"))
    open(os.path.join(out_root, "about.html"), "w").write(
        fill(read(os.path.join(SITE, "about-site.html")), site_title="About · Games Explained", lib="lib", repo=repo))
    open(os.path.join(out_root, ".nojekyll"), "w").write("")
    open(os.path.join(out_root, "CNAME"), "w").write(json.load(open(os.path.join(SITE, "config.json")))["domain"] + "\n")
    version_lib(out_root)
    add_pwa(out_root)
    tagged = add_analytics(out_root)
    bad = broken_links(out_root)
    for page, url in bad:
        print(f"broken link: {page} -> {url}", file=sys.stderr)
    if bad:
        sys.exit(f"{len(bad)} link(s) to nothing the build published. A game folder publishes its authored pages, "
                 "listing.json, symbols.json and reference/ (and for each of its parts, parts/<id>/listing.json and "
                 "symbols.json, and source-<id>.html), nothing else; site/lib/ is at ../../lib/")
    cut = cut_blocks(games)
    for page, tier, n in cut:
        warn(f"{page} has {n} block(s) hidden with the page editor; the cleanup pass in kit/START.md removes them")
    done = [page for page, tier, n in cut if tier in ("gold", "platinum")]
    if done:
        sys.exit(f"{', '.join(done)}: a Gold or Platinum page with blocks still hidden with the page editor. "
                 "Do the cleanup pass in kit/START.md before setting the tier.")
    if _unasked:
        print(f"{len(_unasked)} contributor(s) are unlinked in this build: GitHub says whose address a commit "
              "is under, and the build asks it only when GITHUB_TOKEN is set, as it is in CI")
    print(f"built {len(games)} game(s) into {os.path.relpath(out_root, ROOT)}/" + (f"; analytics on {tagged} pages" if tagged else "; analytics off (no id in site/config.json)"))


if __name__ == "__main__":
    main()
