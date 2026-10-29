#!/usr/bin/env python3
"""Build the static site into _site/.

For every games/<platform>/<slug>/game.json:
  index.html   copied through, tab bar injected  (How it works)
  play.html    copied through if authored          (Play)
  discoveries.html copied through if authored    (Discoveries)
  levels.html  copied through if authored          (Maps / levels)
  source.html  from site/source.html + listing.json   (Source code)
               + original-source.md, for a game whose authors' source survives
  about.html   from site/about.html + game.json + features.md + git log
  listing.json, symbols.json, reference/           copied
Every tab but Source draws from the same listing.json: C64.load, BBC.load and
Spectrum.load fetch it whole, one download the browser caches for all of a
game's tabs.
A game with no listing at all, at tier none, builds with no Source tab, no
footprint on About and no memory strip or size in the catalogue; at any other
tier the build stops and says how to make the listing.
A game of several parts (kit/scripts/parts.py) gets a Source page for each part
that has a listing, source-<id>.html, with source.html the first of them; the
parts above each listing, and a control beside it, step from one to the next.
parts/<id>/ carries each part's listing and symbols. About draws one footprint,
as for any game: the part the others are loaded over, with what they load
marked as varying with the part.
A game whose maintainers withhold its annotated listing sets "publish_source":
false in game.json. Its Source tab is one page with the line on the comments
and a sentence saying the annotations are not published; no tab links an
address into it, About's footprint opens nothing, and the site serves no
listing.json and no symbols.json. A page of such a game names the pieces of
the listing it reads in a tag the build fills in: <script
type="application/json" data-listing="URL">, URL the listing as the page would
fetch it (listing.json, parts/<id>/listing.json), holding a list of labels,
each standing for its record and those up to the next label, or "$C000-$C3FF"
ranges. The build replaces the list with those records, each cut to its
address, type, label and bytes (embed_listings), and the loaders take the
listing from the page. A byte a page reads and does not name reads as 0, which
opening the page with ?listing-reads finds (site/lib/listing-reads.js). The
repository keeps the whole listing.
Those are the default tabs, in the order the bar shows them. A game that wants
others lists all of its tabs in game.json's "tabs" as [file, label] pairs; every
authored page it names is copied through, and a page in the folder that no tab
names is left out with a warning (about-layout.html, the game's own About
template, aside). Whatever the list's order, the bar starts with How it works
(index.html, then any other tab labelled How it works), Play and Discoveries,
and ends with Source code and About; the game's other tabs sit between them in
the order it lists them (tab_order).
Every tab but Source lists its sections in the left margin (pagenav), and every
tab but the last ends with a link to the one after it (next_tab).
Plus a home page with the catalogue and the games most recently added or changed
(from git history), a page for each platform with games, <platform>/index.html
(from site/platform.html: its catalogue alone, the page the platform in a game's
breadcrumb links to), site/lib/ as lib/ (with lib/cpu6502.js from the kit:
KIT_LIB), status.html (from site/status.html +
site/status.json: which kits work on which computers, and the work needed),
activity.html (from site/activity.html: what landed on main each day, from git
history and the issues GitHub has closed as completed; site/lib/activity.js draws it),
about.html (from site/about-site.html: who runs the site and the
principles it follows; static) and accuracy.html (from site/accuracy.html: how a
listing's comments are checked, which every About tab's table of those steps
links to; static). And what lets a phone
install the site as an app: manifest.webmanifest, icons/ (kit/scripts/icons.py
draws them) and sw.js at the root, with lines in every page's head that point
at them.
The authored pages have {{title}}, {{platform}}, {{year}} and {{publisher}}
filled from game.json. A game page's eyebrow leaves out the platform, which its
breadcrumb names: the build drops a platform name at the eyebrow's start. The build fails on a src or href that points at no
file it published: a page's own .js beside it would otherwise 404 on the site.
It lists pages with blocks hidden by the page editor (kit/scripts/edit.py), and
fails on a Gold page that still has one. It stops on a Platinum game without a
Play tab and the test_play.js beside it that holds the published page. It counts the links into a
Source page at an address its listing holds no record of (a chip register, a
stretch the coverage leaves out, another part's address): the page says so when
one is followed, and --addresses lists them, page by page. It counts too the links
that land inside a BASIC line, past its first byte and before its last (where a
range ends), which open on that line with no note, and --addresses lists those too.

Usage: build.py [--out _site] [--addresses]
With GITHUB_TOKEN (or GH_TOKEN) set, as in CI, the build asks GitHub which account
an author's address belongs to when the address is not a GitHub noreply one, and which
issues are closed; without it the build makes no request, shows that author's name
unlinked, and the activity page says the issues were not counted.
Preview: python3 -m http.server -d _site 8000   (8000, or any free port)
No dependencies. The markdown converter handles the subset the templates use.
"""
import datetime, glob, html, html.parser, json, os, re, shutil, subprocess, sys, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parts import parts, load_game, started, under, above, ranges, left_out   # noqa: E402  a game of several loads
from models import awaits_check, proven   # noqa: E402  which games still need a maintainer's check
from accuracy import status as listing_status, table as accuracy_table, SILVER_UP   # noqa: E402  the work behind the listing

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, "site")
PLATFORM_NAMES = {"c64": "Commodore 64", "spectrum": "ZX Spectrum", "bbc": "BBC Micro", "apple2": "Apple II",
                  "c16": "Commodore 16 and Plus/4", "nes": "NES"}
# The footprint widget and the extra script it needs, per platform: a page loads only
# its own, so a C64 page does not fetch spectrum.js and a third platform adds a row.
PLATFORM_MAPS = {"c64": "C64Map", "spectrum": "SpectrumMap", "bbc": "BBCMap", "apple2": "Apple2Map", "c16": "C16Map",
                 "nes": "NESMap"}
PLATFORM_MAP_LIBS = {"c64": [], "spectrum": ["spectrum.js"], "bbc": ["bbc.js"], "apple2": ["apple2.js"], "c16": ["c16.js"],
                     "nes": ["nes.js"]}
# The addresses the footprint draws, [start, end): all 64 KB, except on a machine whose ROM
# sits at a fixed place no game can write to. The 48K Spectrum's ROM is $0000-$3FFF
# (kit/skills/spectrum/zx-spectrum-reference, "Memory map (48K)"), so its map is the 48 KB of RAM.
# The BBC Micro's MOS and I/O fill $C000-$FFFF; below them, its 32 KB of RAM and the 16 KB
# sideways bank paged in at $8000, which may be RAM holding the game (kit/skills/bbc/bbc-reference).
# The Apple II's map is all 64 KB: its ROM at $D000-$FFFF has the language card's RAM beneath it,
# which a game can load (kit/skills/apple2/apple2-reference, "Memory map").
# The Commodore 16's 16 KB is $0000-$3FFF, where kit/c16/snapshot.py puts it. A game that uses the
# Plus/4's other 48 KB needs this widened first (kit/skills/c16/steps, "page").
PLATFORM_MAP_SPAN = {"spectrum": (0x4000, 0x10000), "bbc": (0x0000, 0xC000), "c16": (0x0000, 0x4000)}
# How the footprint blurb names what it draws, so the C64 pages keep their copy.
PLATFORM_MEM = {"c64": "the C64's 64 KB", "spectrum": "the Spectrum's 48 KB of RAM",
                "bbc": "the BBC Micro's 32 KB of RAM and the 16 KB bank paged in above it",
                "apple2": "the Apple II's main 64 KB", "c16": "the Commodore 16's 16 KB of RAM",
                "nes": "the NES's 64 KB address space: 2 KB of RAM, the chips' registers and the cartridge"}
TABS = [("index.html", "How it works"), ("play.html", "Play"), ("discoveries.html", "Discoveries"),
        ("levels.html", "Maps / levels"), ("source.html", "Source code"), ("about.html", "About")]
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
# A web address written out in a game's notes: in a code span, in angle brackets or bare.
# A bare one ends before trailing punctuation and before a ")" it did not open.
URL_RE = re.compile(r"`(https?://[^`\s]+)`|&lt;(https?://\S+?)&gt;|(?<![/\w])(?<!\]\()(https?://[^\s<>`]+)")
# The words a source line opens with, when the address follows them after a comma or colon:
# "Wikipedia, https://...", "C64-Wiki: https://...". They become the link, as the titles in
# "Other places to love this game" do.
URL_LABEL_RE = re.compile(r"([^`\[\]\x00]{1,120}?)[,:]\s+")


def source_links(s, spans):
    """Each web address in s (escaped HTML) as a link, set aside in spans as inline() sets
    aside code spans. An address that follows the words s opens with links those words and
    drops out; any other shows its site's name, so a long address is never set out in full."""
    def bare(u):
        u = re.split(r"&[lg]t;", u)[0].rstrip(".,;:!?")
        while u.endswith(")") and u.count(")") > u.count("("):
            u = u[:-1].rstrip(".,;:!?")
        return u

    out, pos = [], 0
    for m in URL_RE.finditer(s):
        url = m.group(1) or m.group(2) or bare(m.group(3))
        end = m.start() + (len(url) if m.group(3) else len(m.group(0)))
        lead = s[pos:m.start()]
        label = URL_LABEL_RE.fullmatch(lead) if not out else None
        if label and "*" not in lead and lead.count("(") == lead.count(")"):
            spans.append(f'<a href="{url}">')
            out.append(f"\x00{len(spans) - 1}\x00{label.group(1)}</a>")
        else:
            host = re.sub(r"^www\.", "", url.split("//", 1)[1].split("/", 1)[0])
            spans.append(f'<a href="{url}">{host}</a>')
            out.append(lead + f"\x00{len(spans) - 1}\x00")
        pos = end
    return "".join(out) + s[pos:]


def inline(s, addr=True, parts=None, urls=False):
    """parts, in a game of several: {part id: its Source page}. An address written with its
    part's name before it, as the facts of such a game write them ("engine `$25BD`"), links
    into that part's page, whatever page the rest link into. urls=True links the web
    addresses written out in full, as source_links() does, for the About tab's sources."""
    s = html.escape(s, quote=False)
    page = addr if isinstance(addr, str) else "source.html"

    def code(m):
        word, body = m.group(1), m.group(2)
        if parts and word in parts:
            return f"{word} <code>{addr_link(body, parts[word])}</code>"
        return (f"{word} " if word else "") + "<code>" + (addr_link(body, page) if addr else body) + "</code>"
    # Code spans are set aside while the rest is marked up, so a file name such as
    # `game[1988](pal).g64` stays text instead of becoming a link.
    spans = []
    if urls:
        s = source_links(s, spans)

    def keep(m):
        spans.append(code(m))
        return f"\x00{len(spans) - 1}\x00"
    s = re.sub(r"(?:(?<![\w-])([A-Za-z][\w-]*) )?`([^`]+)`", keep, s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?!\w)", r"<i>\1</i>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', s)
    return re.sub(r"\x00(\d+)\x00", lambda m: spans[int(m.group(1))], s)


# The Source pages whose addresses run past four hex digits: a virtual address space's, a story's
# (part_pages fills it). An address written for one of them may have five.
WIDE = set()


def addr_link(s, page="source.html"):
    digits = r"[0-9A-Fa-f]{4,5}" if page in WIDE else r"[0-9A-Fa-f]{4}"
    return re.sub(rf"\$({digits})\b", lambda m: f'<a href="{page}#{m.group(1).upper()}">${m.group(1).upper()}</a>', s)


def markdown(text, drop_h1=True, addr=True, shift=0, parts=None, urls=False):
    """addr=False where the page has no Source tab to link addresses into, or the name of
    the Source page to link them into (a part's, in a game of several); shift=1 sets the
    headings one level down, for a file placed under a heading of the page's own; parts and
    urls as for inline()."""
    out, lines, i = [], text.splitlines(), 0
    para = []
    inline_ = lambda x: inline(x, addr, parts, urls)

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
    L = json.load(open(os.path.join(gdir, "listing.json")))   # build_game says what to do when there is none
    size = L.get("size", 0x10000)      # a story's own, past 64 KB
    cat = ["unused"] * size
    why = [""] * size
    # listing records: what the bytes are
    for r in L["records"]:
        if not r.get("b"):
            continue
        k = "code" if r["t"] == "code" else ("text" if r["t"] == "text" else "tables")
        for i in range(len(r["b"])):
            cat[r["a"] + i] = k
    # index spans: variables and strings; and a routine or a table held as text (the Spectrum's
    # BASIC program, and its arrays), which the records alone call text
    for e in L["index"]:
        k = {"variable": "variables", "string": "text", "routine": "code", "table": "tables"}.get(e["k"])
        hint = None
        n = e["n"].lower()
        for keys, kk in NAME_HINTS:
            if any(x in n for x in keys) and not n.startswith("bitmap_row"):
                hint = kk
        k = hint or k
        if k:
            for a in range(e["a"], min(e["a"] + e["len"], size)):
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
    lo, hi = PLATFORM_MAP_SPAN.get(platform_of(game), (0, 0x10000)) if size == 0x10000 else (0, size)
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


# --- pieces -----------------------------------------------------------------
def read(p):
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


TIER_NAMES = {"silver-claimed": "silver (claimed)"}
CURATED = ("gold", "diamond")        # a person has been through the copy
PLAYABLE = ("platinum", "diamond")   # the Play tab is the whole game, held to the game's code


def tier_name(t, steward=""):
    """How a tier reads on the page: game.json's value, except silver-claimed, and a Platinum
    with a steward, which a person is curating, reads platinum (claimed) to match it."""
    return "platinum (claimed)" if t == "platinum" and steward else TIER_NAMES.get(t, t)


def tab_place(f, n):
    """Where a tab sits in the bar, whatever order game.json's "tabs" lists it in: How it works
    (index.html, then a tab of the game's own of that name), Play and Discoveries lead, Source code
    and About close it, and every other tab (4) keeps the game's order between them."""
    if f == "index.html":
        return 0
    if n == "How it works":
        return 1
    return {"play.html": 2, "discoveries.html": 3, "source.html": 5, "about.html": 6}.get(f, 4)


def tab_order(game, present):
    """The game's tabs as the bar shows them, in order: (file, label) for each one it has. The bar
    closes with Source code and About whatever a game's own list says, so a list that leaves either
    out cannot hide the listing or the record of how it was checked."""
    tabs = list(game.get("tabs", TABS))
    named = {f for f, _ in tabs}
    tabs += [(f, n) for f, n in TABS if f in ASSEMBLED and f not in named]
    return sorted(((f, n) for f, n in tabs if f in present), key=lambda t: tab_place(*t))


def tab_href(f):
    return "./" if f == "index.html" else f


def tabbar(game, present, lib):
    tabs = "".join(f'<a class="tab" href="{tab_href(f)}">{n}</a>' for f, n in tab_order(game, present))
    tier = game.get("tier", "none")
    custom_tabs = "tabs" in game
    inner_class = "in many-tabs" if custom_tabs else "in"
    tabs = f'<span class="tab-list">{tabs}</span>' if custom_tabs else tabs
    plat = game.get("platform")
    # a game with no listing has no Source page, and a withheld one shows none of it, so site.js
    # links none of their addresses
    nolink = "" if "source.html" in present and not withheld(game) else ' data-nolink="1"'
    return (f'<nav class="gametabs"{nolink}><div class="{inner_class}"><span class="crumb"><a href="{lib}/../">Games Explained</a> / '
            f'<a href="{lib}/../{plat}/">{html.escape(PLATFORM_NAMES.get(plat, plat))}</a> / {html.escape(game.get("title", ""))}</span>'
            f'{tabs}<span class="tier">tier <b>{html.escape(tier_name(tier, game.get("steward")))}</b></span></div></nav>')


_proven = {}


def proven_models():
    """The proven models, worked out once a build: models.py reads every game.json to settle them."""
    if "p" not in _proven:
        _proven["p"] = proven()
    return _proven["p"]


def banner(game, cons):
    """One line under the tabs: who curated it, or how to take it further.

    Gold and Diamond (Gold and Platinum both) name the humans (git authors, linked). Silver is
    agent-generated and asks for a human editor, and credits the contributor (git authors,
    linked); so is Platinum, whose Play tab says nothing about its copy.
    Silver (claimed) is a Silver a human has started editing, and a Platinum with a steward
    is a Platinum one: it names them (the steward in game.json) as editing it to a Gold
    standard, with no prompt, so nobody starts the same work twice.
    Bronze, or no tier, is unfinished and asks for a
    contributor. The prompt behind the button is the one line to paste into an agent.
    A run on a model not yet proven is published whole, and its banner says that it awaits
    a maintainer's check (kit/CHECKING.md), a sample of its listing on a proven model, before
    saying what else is missing (#142).
    How accurate the listing's comments are is the Source tab's to say (source_note), not
    the banner's.
    """
    tier = game.get("tier", "none")
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "")
    body = banner_body(game, cons, tier, repo)
    return f'<div class="gamebanner {html.escape(tier)}">{body}</div>'


def how_checked():
    """The link a listing's accuracy line ends with: the site's page on what a sample and an
    audit are, at its section on reading the row and the Source tab's line (site/accuracy.html)."""
    return '<a href="../../accuracy.html#row">How listings are checked</a>'


def source_note(game):
    """The Source tab's line on its comments, under the intro: the verdict (accuracy.status),
    green when the listing is checked, a sentence on why, and links to the About tab's ledger
    (accuracy_section) and the site's page on checking. Silver and above only, the tiers whose
    listing is meant to be whole; none for a game made before game.json recorded the steps."""
    st = listing_status(game)
    if game.get("tier", "none") not in SILVER_UP or not st:
        return ""
    return (f'<p class="srcnote {"ok" if st["checked"] else "bad"}"><b>{html.escape(st["lead"])}</b> '
            f'{html.escape(st["note"])} See <a href="about.html#ledger">every step on the About tab</a>, '
            f'or <a href="../../accuracy.html#row">how listings are checked</a>.</p>')


def uncounted_note(lpath):
    """The Source tab's line on the data its listing leaves out: the stretches listing.py found
    that the ledger does not count (listing.json's "uncounted", #420). None when there are none."""
    try:
        left = json.load(open(lpath)).get("uncounted") or []
    except (OSError, ValueError):
        return ""
    if not left:
        return ""
    spans = [f"${s:04X}-${e:04X}" for s, e, _ in left[:3]] + ([f"{len(left) - 3} more"] if len(left) > 3 else [])
    where = spans[0] if len(spans) == 1 else (", ".join(spans[:-1]) + ("," if len(spans) > 2 else "") + " and " + spans[-1])
    n = sum(e - s + 1 for s, e, _ in left)
    return (f'<p class="srcnote"><b>Some data is missing.</b> This listing leaves out {n:,} bytes the game loads, '
            f'in {len(left)} stretch{"es" if len(left) > 1 else ""} its analysis has not described: {where}.</p>')


def virtual(game, P=()):
    """The code a game keeps in a virtual address space: read from the disk during play into
    whichever buffer is free, and reached at its own addresses, so no snapshot holds it whole
    and no listing holds it at all (kit/skills/core/15-parts).
    game.json's coverage.virtual, or each part's, [[bytes, what it is], ...] (#428). An
    interpreter's story is the usual case. The About tab and the Source tab name it beside the
    figure, so that 100 % says what it is 100 % of."""
    from parts import settings
    rows = list((game.get("coverage") or {}).get("virtual") or [])
    for p in P:
        rows += (settings(p).get("coverage") or {}).get("virtual") or []
    for r in rows:
        if not (isinstance(r, list) and len(r) == 2 and isinstance(r[0], int) and r[0] > 0 and isinstance(r[1], str)):
            sys.exit(f'games/{game.get("platform")}/{game.get("slug")}: coverage.virtual row {r!r} is not '
                     '[bytes, what it is], the bytes a whole number')
    return rows


def virtual_note(rows):
    """The Source tab's line on the code its listing cannot hold (virtual); none when there is none."""
    if not rows:
        return ""
    what = "; ".join(html.escape(w) for _, w in rows)
    return (f'<p class="srcnote"><b>Not all of the program is here.</b> The game reads '
            f'{sum(n for n, _ in rows):,} bytes of its program from the disk during play, which this listing does not '
            f'hold: {what}.</p>')


ORIGINAL = "original-source.md"


def original_source(gdir, addr=True):
    """The Source tab's section on the authors' own source, for a game whose source survives:
    what it shows of how the game was made, from original-source.md in the game folder. A section
    of the page, above the listing, never folded away: its first heading is the section's, its
    others one level below, and its id is the one the game's other pages link to
    (source.html#original-source). None when the folder has no such file."""
    text = read(os.path.join(gdir, ORIGINAL))
    if not text.strip():
        return ""
    return ('<section class="origsrc" id="original-source">'
            + markdown(text, drop_h1=False, addr=addr, shift=1) + "</section>")


def withheld(game):
    """True for a game whose maintainers chose not to publish its annotated listing, game.json's
    "publish_source": false. Its Source tab keeps the line on the comments (source_note) and
    says no more; no address links into it, and the site serves none of its listings: its pages
    carry only the pieces they name, cut to their bytes (embed_listings)."""
    return game.get("publish_source", True) is False


WITHHELD = "The annotations for this game are not published."


def withheld_source(game, out, nav, ban, common, present):
    """The Source tab of a game whose listing is withheld: its title, the banner, the line on the
    comments and one sentence, with none of the listing or the part pages."""
    tpl = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav)
    head = tpl[:tpl.index('<div class="facts">')]
    body = ('<div class="facts">\n'
            f'  <p class="eyebrow">{common["year"]} · {common["publisher"]}</p>\n'
            f'  <h1 style="margin-top:0">{common["title"]}: the source</h1>\n'
            f'  {source_note(game)}\n'
            f'  <p class="withheld">{WITHHELD}</p>\n'
            '</div>\n')
    src = under_title(head + body, ban) + f'<script src="{LIB}/site.js"></script>\n'
    src = at_end(src, next_tab(game, present, "source.html") + edit_footer(game, "source.html", "game.json"))
    open(os.path.join(out, "source.html"), "w").write(src)


LISTING_TAG = re.compile(r'(<script type="application/json" data-listing="([^"]+)"(?: data-fields="([^"]*)")?>)(.*?)(</script>)', re.S)
RANGE = re.compile(r"^\$([0-9A-Fa-f]{1,4})-\$([0-9A-Fa-f]{1,4})$")


def listing_pieces(L, want, where):
    """The records of listing L that the pieces in want name: a label, its record and those after
    it up to the next labelled one; or "$C000-$C3FF", every record with a byte in the range."""
    recs, keep = L["records"], set()
    starts = [i for i, r in enumerate(recs) if r.get("l")] + [len(recs)]
    at = {recs[i]["l"]: n for n, i in enumerate(starts[:-1])}
    for w in want:
        m = RANGE.match(w) if isinstance(w, str) else None
        if m:
            lo, hi = int(m.group(1), 16), int(m.group(2), 16)
            keep.update(i for i, r in enumerate(recs) if r["a"] <= hi and r["a"] + max(len(r.get("b") or []), 1) > lo)
        elif w in at:
            keep.update(range(starts[at[w]], starts[at[w] + 1]))
        else:
            sys.exit(f"{where} names {w!r}, which is neither a label of its listing nor a range like \"$C000-$C3FF\"")
    return [recs[i] for i in sorted(keep)]


LOADED = ("a", "t", "l", "b")    # what C64.load, BBC.load and Spectrum.load read from a record


def embed_listings(page, gdir, game, where):
    """The page with each <script type="application/json" data-listing="URL"> tag's list of pieces
    replaced by those records of the listing at URL in the game folder, each cut to the address,
    type, label and bytes the loaders read (LOADED). Only a game whose listing is withheld names
    pieces: on any other game's page the tag is left out, and the loaders fetch the whole listing,
    which the site serves."""
    def one(m):
        url = m.group(2)
        if not withheld(game):
            warn(f"{where}: the data-listing tag for {url} is left out of the built page, which fetches the whole "
                 "listing; name pieces only for a game whose listing is withheld (\"publish_source\": false)")
            return ""
        try:
            want = json.loads(m.group(4))
        except ValueError:
            want = None
        if not isinstance(want, list):
            sys.exit(f"{where}: the data-listing tag for {url} must hold a list of labels or ranges")
        path = os.path.join(gdir, url)
        if not os.path.isfile(path):
            sys.exit(f"{where}: the data-listing tag names {url}, and the game folder has no such listing")
        if m.group(3) is not None:
            sys.exit(f"{where}: the data-listing tag for {url} names fields, and this game's pages carry only "
                     "the addresses, types, labels and bytes of its listing (\"publish_source\": false)")
        L = json.load(open(path))
        recs = [{k: r[k] for k in LOADED if k in r} for r in listing_pieces(L, want, f"{where} ({url})")]
        out = {k: v for k, v in L.items() if k not in ("records", "index")}
        out["records"] = recs
        return m.group(1) + json.dumps(out, separators=(",", ":")).replace("</", "<\\/") + m.group(5)
    return LISTING_TAG.sub(one, page)


def listing_row(game):
    """The About tab's Status row on the listing's comments; none for a game made before game.json
    recorded the steps. The verdict that leads the sentence is bold (accuracy.status)."""
    st = listing_status(game)
    if not st:
        return ""
    rest = st["row"][len(st["lead"]):].lstrip()
    return (f'<tr><th>Comments checked</th><td><b>{html.escape(st["lead"])}</b> {html.escape(rest)} '
            f'{how_checked()}</td></tr>')


def accuracy_section(game, gdir):
    """The About tab's table of the steps behind the listing, in order (accuracy.table): what
    each found and which models did it. None for a game made before game.json recorded them."""
    rows = accuracy_table(game, gdir)
    if not rows:
        return ""
    keep = lambda by: ", ".join(f'<span class="nw">{html.escape(b)}</span>' for b in by.split(", "))   # wrap between models only
    trs = "".join(f'<tr class="{kind}"><th>{html.escape(step)}</th><td>{keep(by)}</td><td>{html.escape(what)}'
                  + (f'<br><span class="mute">{html.escape(note)}</span>' if note else "") + "</td>"
                  + f'<td class="rib">{ribbon_html(*rib)}</td></tr>'
                  for step, by, what, note, kind, rib in rows)
    return ('<h2 id="ledger">How the listing was checked</h2>\n'
            '<p class="mute">Every step that measured the Source tab\u2019s comments or made them more accurate, '
            'in the order it happened, with the models that did it. <a href="../../accuracy.html">Accuracy of the '
            'Source</a> explains each step and what the row above makes of them.</p>\n'
            f'<div class="tablewrap"><table class="accuracy"><tr><th>Step</th><th>By</th><th>What it found</th>'
            f'<th>Of the listing</th></tr>{trs}</table></div>\n{RIBBON_KEY}')


# The bar on each ledger row (accuracy.ribbon): the whole listing as it stood after the step, so the
# bars read down the table as one story. The key under the table names the colours.
RIBBON_KEY = ('<p class="ribkey mute"><span><i class="r-wrong"></i>likely wrong</span> '
              '<span><i class="r-maybe"></i>the sample\u2019s range</span> '
              '<span><i class="r-fixed"></i>corrected</span> '
              '<span><i class="r-right"></i>right, or likely right</span> '
              '<span><i class="r-done"></i>not yet measured</span></p>')


def ribbon_html(segments, said):
    """One ledger row's bar, from accuracy.ribbon; nothing for a step that changes no comment."""
    if not segments:
        return ""
    bits = "".join(f'<i class="r-{k}" style="width:{100 * share:.2f}%"></i>' for k, share in segments if share > 0)
    return f'<span class="ribbon" role="img" title="{html.escape(said)}" aria-label="{html.escape(said)}">{bits}</span>'


def banner_body(game, cons, tier, repo):
    """The banner's text before any line about the listing (banner)."""
    where = f'games/{game["platform"]}/{game["slug"]}'
    if tier in CURATED:
        who = ", ".join(person_html(n, l) for _, n, l in cons)
        body = f'This minisite was curated by {who}.' if who else 'This minisite was curated by hand.'
    elif tier == "silver" or (tier == "platinum" and not game.get("steward")):
        who = ", ".join(person_html(n, l) for _, n, l in cons)
        lead = f'This minisite was contributed by {who}. ' if who else 'This minisite was contributed. '
        prompt = f"Clone {repo} and follow kit/START.md to curate {where} with me to Gold."
        body = (lead + 'It\u2019s agent-generated and needs a human editor. '
                f'<span class="prompt" id="prompt">{html.escape(prompt)}</span>'
                '<button type="button" data-copy="#prompt">Copy the prompt to work on it</button>')
    elif tier in ("silver-claimed", "platinum"):
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
                    f'this site has not proven yet worked on it ({who}), so a maintainer will measure its '
                    f'listing on one it has (<a href="../../accuracy.html#check">how the check works</a>).')
            if cov < 100 or n < m:
                body += f' It is not complete either: {how}. ' + ask
    return body


# the tabs build.py assembles, which every game has, and the file each one's edit link opens:
# what the reader sees most of (the listing's names and comments, the features). Every other tab
# is a page in the game folder, edited as it is
ASSEMBLED = {"source.html": "symbols.json", "about.html": "features.md"}


def edit_footer(game, tab, f=None):
    """The 'Edit this page' footer: a link to GitHub's editor for the file behind this tab,
    or for f, a path in the game folder, when the page is made from another (a part's symbols).

    GitHub's /edit/ URL forks the repository for anyone without write access and turns
    the edit into a pull request, so a reader can fix a mistake without cloning anything.
    """
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "").rstrip("/")
    where = f'games/{game["platform"]}/{game["slug"]}'
    f = f or ASSEMBLED.get(tab, tab)
    edit, hist, tree = (f"{repo}/edit/main/{where}/{f}", f"{repo}/commits/main/{where}", f"{repo}/tree/main/{where}")
    return (f'<footer class="editfoot"><div class="in">'
            f'<p class="acts"><a class="btn" href="{html.escape(edit)}">Edit this page on GitHub</a>'
            f'<a href="{html.escape(hist)}">History</a><a href="{html.escape(tree)}">All the files for this game</a></p>'
            f'</div></footer>')


def next_tab(game, present, tab):
    """The link at the end of a tab to the one after it in the bar, a sign there is more to read
    than the page the reader landed on. The last tab has none."""
    order = tab_order(game, present)
    files = [f for f, _ in order]
    if tab not in files or files.index(tab) + 1 == len(files):
        return ""
    f, n = order[files.index(tab) + 1]
    return (f'<nav class="nexttab" aria-label="Next tab"><a href="{tab_href(f)}" rel="next">'
            f'<span class="nx-k">Next</span><span class="nx-t">{html.escape(n, quote=False)}</span>'
            f'<span class="nx-ar" aria-hidden="true">\u2192</span></a></nav>')


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
    m = re.search(r'<nav class="gametabs"[^>]*>.*?</nav>', page, re.S)   # data-nolink="1" on a game with no listing to link
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


def credited(cons, game):
    """The contributors a game's pages name: cons less anyone listed in game.json's "uncredited",
    by GitHub login or by git author name, compared without case. A contributor who asks not to
    be named is left out of the banner and the About tab; the commits stay theirs."""
    return [c for c in cons if not uncredited(game, c[1], c[2])]


def uncredited(game, name, login):
    """Whether game.json's "uncredited" names this person, by GitHub login or git author name."""
    out = {str(u).strip().lower() for u in game.get("uncredited") or [] if str(u).strip()}
    return (login or "").lower() in out or name.lower() in out


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
    """The tabs a game has: the assembled ones every game gets, and the pages it wrote.
    A game with no listing has no Source tab."""
    tabs = set(ASSEMBLED) | set(authored(gdir, game))
    return tabs - {"source.html"} if no_listing(gdir) else tabs


def no_listing(gdir, P=None):
    """True for a game folder with nothing for a Source tab to show: no listing.json, or, in a
    game of several parts, no part with one. Only a game at tier none builds like that (#255)."""
    P = parts(gdir) if P is None else P
    return not any(listed(p) for p in P) if P else not os.path.isfile(os.path.join(gdir, "listing.json"))


def redirect_pages(game, present):
    """Build former page URLs without putting them back into the tab bar."""
    pages = {}
    for old, target in game.get("redirects", {}).items():
        destination = target.split("#", 1)[0] if isinstance(target, str) else ""
        if not PAGE_NAME.fullmatch(old) or old in present or destination not in present:
            raise ValueError(f"Invalid page redirect: {old!r} -> {target!r}; use an old .html name and a published tab")
        encoded = json.dumps(target).replace("<", "\\u003c")
        pages[old] = ('<!doctype html><meta charset="utf-8"><title>Page moved</title>'
                      '<p>This page has moved. <a href="' + html.escape(target, quote=True) + '">Continue to the page</a>.</p>'
                      '<script>const target=new URL(' + encoded + ',location.href);'
                      'if(location.search)target.search=location.search;'
                      'if(location.hash)target.hash=location.hash;location.replace(target.href);</script>')
    return pages


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


def authored_page(gdir, game, f, nav, ban, src=None, present=None):
    """One authored tab as the site serves it: the template's placeholders filled from game.json
    (new_game.py fills only the .md files), the tab bar, the banner, the link to the next tab,
    the edit footer and the section list added. src is the page's source, read from the game
    folder when not given; the page editor, kit/scripts/edit.py, passes a copy with its blocks
    tagged. present is the game's tabs (present_tabs), worked out when not given."""
    plat = game["platform"]
    head = dict(title=html.escape(game.get("title", game["slug"])), platform=PLATFORM_NAMES.get(plat, plat),
                year=game.get("year") or "", publisher=html.escape(game.get("publisher") or ""))
    page = drop_platform(fill(read(os.path.join(gdir, f)) if src is None else src, **head), plat)
    page = embed_listings(page, gdir, game, os.path.join(os.path.relpath(gdir, ROOT), f))
    nxt = next_tab(game, present_tabs(gdir, game) if present is None else present, f)
    return pagenav(at_end(under_title(inject(page, nav, LIB), ban), nxt + edit_footer(game, f)))


def drop_platform(page, plat):
    """The page with the platform's name taken off the start of its eyebrow ("Commodore 64 ·
    1984 · Epyx" reads "1984 · Epyx"): the breadcrumb above it already names the platform."""
    name = re.escape(PLATFORM_NAMES.get(plat, plat))
    return re.sub(r'(<p class="eyebrow"[^>]*>)\s*' + name + r'\s*(?:·|&middot;)\s*', r"\1", page)


# --- a game of several parts (kit/scripts/parts.py): a Source page and a footprint for each
PILLS = 8   # more parts than this are a list to choose from, not a row to read


def part_page(p):
    """A part's Source page. source.html is a copy of the first, so the tab has somewhere to go
    and a part's own address never depends on the order the parts are listed in."""
    return f"source-{p['id']}.html"


def part_pages(P):
    """{part id: its Source page} for the parts that have one, the names the facts of a game of
    several parts write before an address. {} for a game of one."""
    WIDE.update(part_page(p) for p in (P or []) if p.get("machine") and listed(p))
    return {p["id"]: part_page(p) for p in (P or []) if listed(p)}


def listed(p):
    return os.path.isfile(os.path.join(p["dir"], "listing.json"))


def bank_parts(P):
    """The parts that are a cartridge's banks (kit/scripts/parts.py), in order."""
    return [p for p in P if p.get("bank") is not None]


def made_of(P):
    """How a game of several parts opens its account of itself: a cartridge's banks are
    counted apart from the parts the machine runs in RAM, and a story apart from the program
    that reads it."""
    b = bank_parts(P)
    v = [p for p in P if p.get("machine")]
    if v and not b:
        n = len(P) - len(v)
        return (f"This game is {'a program' if n == 1 else f'{n} parts'} in memory and "
                + " and ".join(html.escape(p["title"]) for p in v)
                + f", which {'it reads' if n == 1 else 'they read'} from the disk a page at a time as "
                "it is needed, at addresses of its own")
    if not b:
        return f"This game is in {len(P)} parts"
    n = len(P) - len(b)
    return (f"This game is a cartridge of {len(b)} bank{'s' if len(b) != 1 else ''} and "
            f"{'one part' if n == 1 else f'{n} parts'} in RAM")


def span_text(P):
    """The addresses a set of parts covers, written as a reader reads them: "$8000–$9FFF"."""
    out = sorted({r for p in P for r in ranges(p)})
    return " and ".join(f"${lo:04X}–${hi:04X}" for lo, hi in out)


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
        else:   # a bank with nothing to explain says why
            items.append(f'<span class="none" title="{html.escape("; ".join(left_out(p)) or "Not analysed")}">{t}</span>')
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
    opt = lambda p: f'<option value="{part_page(p)}"{" selected" if p is cur else ""}>{html.escape(p["title"])}</option>'
    cart = bank_parts(shown)
    opts = "".join(opt(p) for p in shown if p not in cart)
    if cart:
        opts += '<optgroup label="Cartridge banks">' + "".join(opt(p) for p in cart) + "</optgroup>"
    return ('<div class="pick">' + arrow(shown[i - 1] if i else None, "\u2039", "prev", "Previous")
            + f'<select data-go aria-label="Part of the game">{opts}</select>'
            + arrow(shown[i + 1] if i + 1 < len(shown) else None, "\u203a", "next", "Next") + "</div>")


def part_card(p):
    """A part as its Source page's script knows it (#part)."""
    out = {"id": p["id"], "title": p["title"], "listing": f"parts/{p['id']}/listing.json"}
    if p.get("bank") is not None:
        out["bank"] = p["bank"]
    return out


def part_sources(gdir, game, P, out, nav, ban, common, present):
    """One Source page per part that has a listing, each with the parts above it and the
    listing laid over those it is loaded over."""
    shown = [p for p in P if listed(p)]
    pages = part_pages(P)
    tpl = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav)
    tpl = tpl.replace("<!-- accuracy -->", source_note(game) + virtual_note(virtual(game, P)))
    tpl = tpl.replace("<!-- original -->", original_source(gdir, addr=False))
    for p in shown:
        page, beneath = part_page(p), [q for q in reversed(under(P, p)) if listed(q)]
        note, bank = "", p.get("bank") is not None
        if beneath:
            note = (f'<p class="mute">{html.escape(p["title"])} is {"switched in at " + span_text([p]) + ", over" if bank else "loaded over"} '
                    f'{html.escape(" and ".join(q["title"] for q in beneath))}. The listing shows them together, as the machine '
                    f'{"sees them with this bank switched in" if bank else "holds them"}; the rows of this part are marked.</p>')
        pills = part_pills(P, p)
        if len(shown) == len(P):
            each = "Each part has a listing of its own" + ("." if pills else ", chosen from the list beside it.")
        else:       # say how many, where the row of parts is too long to show which
            each = (f"{len(shown)} of them {'has' if len(shown) == 1 else 'have'} a listing"
                    + ("." if pills or len(shown) < 2 else ", chosen from the list beside it."))
        lead = (f'<p class="mute">{made_of(P)}'
                + (", and the same addresses hold something else in each. " if not any(q.get("machine") for q in P)
                   else ". ") + each + "</p>")
        # pages: where an operand that reads a bank, or the RAM beneath one, links to (source.html)
        info = dict(part_card(p), under=[part_card(q) for q in beneath], pages=pages)
        src = tpl.replace("<!-- parts -->", lead + pills + note + uncounted_note(os.path.join(p["dir"], "listing.json")))
        src = src.replace("<!-- pick -->", part_step(P, p))
        src = src.replace("<!-- part -->", '<script type="application/json" id="part">'
                          + json.dumps(info).replace("</", "<\\/") + "</script>")
        src = under_title(src, ban)
        if not links_asset(src, "site.js"):
            src += f'\n<script src="{LIB}/site.js"></script>\n'
        src = at_end(src, next_tab(game, present, "source.html")
                     + edit_footer(game, "source.html", f"parts/{p['id']}/symbols.json"))
        for name in ([page, "source.html"] if p is shown[0] else [page]):
            open(os.path.join(out, name), "w").write(src)
        dst = os.path.join(out, "parts", p["id"])
        os.makedirs(dst, exist_ok=True)
        for f in ("listing.json", "symbols.json"):
            if os.path.exists(os.path.join(p["dir"], f)):
                shutil.copy(os.path.join(p["dir"], f), dst)


def game_footprint(P, out, hidden=False):
    """The one map of a game of several parts, for the About tab and the catalogue: the part
    the others are loaded over (the first that lies over none), with the addresses the other
    parts own as one band, "varies with the part loaded". Which part holds what is the Source
    tab's to show, part by part; here a reader wants the shape of the game, once.
    Returns the game's totals (its program summed over the parts, for the catalogue's size),
    and the About tab's line saying what the map is of."""
    shown = [p for p in P if listed(p)]
    root = next((p for p in shown if not p["over"]), shown[0])
    runs, t, symbols, span = footprint(root["dir"], load_game(root["dir"]))
    doc = {"runs": runs, "totals": t, "symbols": symbols, "source": False if hidden else part_page(root)}
    if span != (0, 0x10000):   # memmap.js draws all 64 KB unless told otherwise
        doc.update(base=span[0], size=span[1] - span[0])
    json.dump(doc, open(os.path.join(out, "memmap.json"), "w"), separators=(",", ":"))
    totals = dict(t)
    for p in shown:
        if p is not root:
            other = footprint(p["dir"], load_game(p["dir"]))[1]
            for k in PROGRAM:
                totals[k] += other[k]
    cart = bank_parts(P)
    over = [p for p in above(P, root) if p not in cart]
    apart = [p for p in P if p is not root and p not in over and p not in cart]
    name = html.escape(root["title"])
    # What the map is of, and no more: a part that names none beneath it may replace all of memory
    # or may only not have been split from what stays, and the folders do not say which.
    if over:
        said = (f"{made_of(P)}. The map is of {name}, which stays in memory; the band marked as "
                f"varying holds whichever of the {len(over)} part{'s' if len(over) != 1 else ''} loaded over it is there. ")
        if apart:
            said += f"The other {len(apart) if len(apart) > 1 else 'part'}{' are' if len(apart) > 1 else ' is'} not on this map. "
    else:
        said = (f"{made_of(P)}. The map is of {name}. " if cart else
                f"{made_of(P)}, and the map is of one of them: {name}. ")
    if cart:    # the map is the RAM; a bank switched in hides some of it, and is not drawn
        said += (f"The cartridge's banks, switched in at {span_text(cart)} one at a time, are not on this map, "
                 "though the RAM beneath them is. ")
    if not hidden:
        said += f'The <a href="{part_page(root)}">Source tab</a> has the listing of each part that has one.'
    return totals, f'<p class="mute" style="margin-top:12px">{said}</p>', span


def link_list(game):
    """(title, url) for each of game.json's links, in order. A link is {"title", "url"}, the
    title being the linked page's own; an empty url is a slot the template left, not a link.
    A bare url string, the older form, shows its key."""
    out = []
    for k, v in (game.get("links") or {}).items():
        t, u = (v.get("title") or k, v.get("url")) if isinstance(v, dict) else (k, v)
        if u:
            out.append((t, u))
    return out


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


def play_tested(gdir):
    """True when the game has a Play tab and the test that holds the published page
    (kit/skills/core/70-minisite/play.md, "The page's test"): test_kit.py runs it, so CI does too."""
    return os.path.exists(os.path.join(gdir, "play.html")) and any(
        os.path.exists(os.path.join(gdir, f"test_play.{x}")) for x in ("js", "py"))


def build_game(gdir, out_root):
    game = json.load(open(os.path.join(gdir, "game.json")))
    plat, slug = game["platform"], game["slug"]
    out = os.path.join(out_root, plat, slug)
    os.makedirs(out, exist_ok=True)
    lib = LIB
    check_tabs(gdir, game)
    P = parts(gdir)
    # nothing analysed: a game at tier none builds with no Source tab and no footprint
    bare = no_listing(gdir, P)
    tier = game.get("tier") or "none"
    if bare and tier != "none":
        rel = os.path.relpath(gdir, ROOT)
        why = f"A {tier_name(tier)} page needs one; a game at tier none builds without one and has no Source tab."
        if P:
            sys.exit(f"{rel} is a game of several parts and none has a listing.json. "
                     f"Build one from a part's symbol map and its snapshot first (kit/scripts/listing.py). {why}")
        sys.exit(f"{rel} has no listing.json. {why} Build it from the symbol map and a snapshot first:\n"
                 f"  python3 kit/scripts/symbols_export.py {rel}\n"
                 f"  python3 kit/scripts/listing.py {rel} <snapshot.vsf>")
    if tier in PLAYABLE and not play_tested(gdir):
        sys.exit(f"{os.path.relpath(gdir, ROOT)} is {tier_name(tier)}, which needs a Play tab, play.html, and "
                 "test_play.js (or test_play.py) beside it, the test that holds the published page in CI "
                 "(AGENTS.md, Definition of done; kit/skills/core/70-minisite/play.md, The page's test).")
    if P:
        game["_parts"] = (sum(1 for p in P if started(p)), len(P))
    present = present_tabs(gdir, game)
    redirects = redirect_pages(game, present)
    cons = game["_cons"] = credited(contributors(gdir), game)
    nav = tabbar(game, present, lib)
    ban = banner(game, cons)
    platform_scripts = "".join(f'<script src="{lib}/{f}"></script>' for f in PLATFORM_MAP_LIBS.get(plat, []))
    common = dict(title=html.escape(game.get("title", slug)), lib=lib, build=html.escape(game.get("build") or ""),
                  platform=plat, platform_name=PLATFORM_NAMES.get(plat, plat), year=game.get("year") or "",
                  publisher=html.escape(game.get("publisher") or ""),
                  platform_map=PLATFORM_MAPS.get(plat, "C64Map"), platform_scripts=platform_scripts,
                  platform_mem=PLATFORM_MEM.get(plat, "the machine's 64 KB"))
    for f in authored(gdir, game):
        open(os.path.join(out, f), "w").write(authored_page(gdir, game, f, nav, ban, present=present))
    # source: one page, or one for each part of a game of several; none for a game with no listing,
    # and for a game whose listing is withheld, one page that says so
    hidden = withheld(game) and not bare
    if hidden:
        withheld_source(game, out, nav, ban, common, present)
    elif P and not bare:
        part_sources(gdir, game, P, out, nav, ban, common, present)
    elif not bare:
        src = fill(read(os.path.join(SITE, "source.html")), **common).replace("<!-- tabs -->", nav)
        src = src.replace("<!-- accuracy -->", source_note(game) + uncounted_note(os.path.join(gdir, "listing.json"))
                          + virtual_note(virtual(game)))
        src = src.replace("<!-- original -->", original_source(gdir))
        src = under_title(src, ban)
        if not links_asset(src, "site.js"):
            src += f'\n<script src="{lib}/site.js"></script>\n'
        open(os.path.join(out, "source.html"), "w").write(at_end(src, next_tab(game, present, "source.html")
                                                                  + edit_footer(game, "source.html")))
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
    links = link_list(game)
    link_html = "<ul>" + "".join(f'<li><a href="{html.escape(u)}">{html.escape(t)}</a></li>' for t, u in links) + "</ul>" if links else "<p class='mute'>None listed yet. Know a write-up, port or forum thread about this game? Add it to game.json.</p>"
    tools = game.get("tools") or {}
    if bare:   # no byte described, so no map: the catalogue leaves out its strip and size too
        totals, foot, span = None, "", (0, 0x10000)
    elif P:
        totals, foot, span = game_footprint(P, out, hidden)
    else:
        runs, totals, symbols, span = footprint(gdir, game)
        memmap = {"runs": runs, "totals": totals, "symbols": symbols}
        if hidden:   # nothing to open: memmap.js leaves the map unclickable
            memmap["source"] = False
        if span != (0, 0x10000):   # memmap.js draws all 64 KB unless told otherwise
            memmap.update(base=span[0], size=span[1] - span[0])
        json.dump(memmap, open(os.path.join(out, "memmap.json"), "w"), separators=(",", ":"))
        foot = ""
    game["_totals"] = totals
    about_template = os.path.join(gdir, "about-layout.html")
    if not os.path.isfile(about_template):
        about_template = os.path.join(SITE, "about.html")
    cov = f"{game.get('coverage_percent') or 0:g} %"
    if P and game["_parts"][0] < game["_parts"][1]:
        cov = "In the %d of %d parts analysed, %s" % (*game["_parts"], cov)
    away = sum(n for n, _ in virtual(game, P))
    if away:   # the template goes on "of the bytes the game uses have a description"
        from coverage import tracked_count
        held, said = tracked_count(gdir)
        cov += (f" of the {held:,} bytes in memory, and none of the {away:,} bytes of its program the game reads from the "
                f"disk during play: in all, {100 * said / (held + away):.0f} %")
    # in a game of several parts an address means nothing without its part, so the files about
    # the whole game link none (site.js leaves the addresses inside data-part="" alone)
    whole = (lambda h: f'<div data-part="">{h}</div>') if P else (lambda h: h)
    tpl = read(about_template)
    if bare:   # no map: the template's Footprint section goes, from its marker to the one that closes it
        tpl = re.sub(r"<!-- footprint\b.*?<!-- /footprint -->\s*", "", tpl, flags=re.S)
    data = "" if bare else WITHHELD if hidden else data_links(P)
    about = fill(tpl, **common, footprint=foot, data_links=data, map_row=(span[1] - span[0]) // 128,
                 tier=html.escape(tier_name(game.get("tier", "none"), game.get("steward"))), coverage=cov, listing_row=listing_row(game),
                 accuracy=accuracy_section(game, gdir),
                 copy=html.escape(str(game.get("copy", ""))), tools=html.escape(", ".join(f"{k}: {v}" for k, v in tools.items())),
                 model=html.escape(str(game.get("model", ""))), kit_version=html.escape(str(game.get("kit_version", ""))),
                 contributors=con_html, site_contributors=site_contributors, game_credits=game_credits,
                 links=link_html,
                 features=whole(markdown(read(os.path.join(gdir, "features.md")), addr=not (P or bare or hidden), shift=1,
                                         parts={} if hidden else part_pages(P), urls=True))).replace("<!-- tabs -->", nav)
    about = under_title(drop_platform(about, plat), ban)
    about = at_end(about, next_tab(game, present, "about.html") + edit_footer(game, "about.html"))
    open(os.path.join(out, "about.html"), "w").write(pagenav(about))
    if not hidden:
        for f in ("listing.json", "symbols.json"):
            if os.path.exists(os.path.join(gdir, f)):
                shutil.copy(os.path.join(gdir, f), out)
    for name, page in redirects.items():
        open(os.path.join(out, name), "w").write(page)
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


# The lib files the site serves from the kit instead of site/lib/, each with one source: the 6502
# a page runs a game's own code on, which sid.js also hands to a music driver in its worklet, is
# the simulator the kit's tests hold pages to (kit/cpu/cpu6502.js, "On a page").
KIT_LIB = {"cpu6502.js": "kit/cpu/cpu6502.js"}

def lib_versions(out_root):
    """{lib file: the first 8 hex digits of its SHA-1}, for every script and stylesheet in the
    built lib/: a list of names left a new file out, and its pages kept the cached copy."""
    import hashlib
    lib = os.path.join(out_root, "lib")
    return {f: hashlib.sha1(open(os.path.join(lib, f), "rb").read()).hexdigest()[:8]
            for f in sorted(os.listdir(lib)) if f.endswith((".js", ".css"))} if os.path.isdir(lib) else {}


def version_lib(out_root):
    """Append ?v=<content hash> to every reference to a lib file, so a redeploy is never
    paired with a stylesheet or script the browser cached from the previous one. A lib script
    that loads another from beside itself (new URL('bounce.js', its own address)) names it with
    its hash too, the one it loads first, so that a change to bounce.js changes sid.js's hash."""
    lib = os.path.join(out_root, "lib")
    for _ in range(8):                          # a chain of such loads is a file or two deep
        ver = lib_versions(out_root)
        if not ver:
            break
        url = re.compile(r"""(new URL\(\s*['"])(""" + "|".join(re.escape(f) for f in ver) + r""")(?:\?v=[0-9a-f]+)?(['"])""")
        changed = False
        for f in ver:
            if f.endswith(".js"):
                p = os.path.join(lib, f); src = open(p, encoding="utf-8").read()
                new = url.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver[m.group(2)]}{m.group(3)}", src)
                if new != src:
                    open(p, "w", encoding="utf-8").write(new); changed = True
        if not changed:
            break
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


def shot_html(g, cls="shot", root=""):
    plat, slug = g["platform"], g["slug"]
    ti = g.get("title_image") or ""
    # title_image stays inside the game folder: no absolute paths, no parent climbs
    safe = bool(ti) and not os.path.isabs(ti) and os.path.normpath(ti) == ti \
        and ".." not in ti.split(os.sep)
    tip = os.path.join(ROOT, "games", plat, slug, ti) if safe else ""
    if tip and os.path.isfile(tip):
        return (f'<img class="{cls}" src="{root}{plat}/{slug}/{html.escape(ti, quote=True)}" '
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
    """The one-dimensional memory map under the featured game, drawn by C64Map.strip from
    memmap.json. Nothing for a game with no listing: it has no memmap.json."""
    if g["_totals"] is None:
        return ""
    total = sum(g["_totals"][k] for k in PROGRAM)
    return f'<div class="strip" data-strip="{g["platform"]}/{g["slug"]}/memmap.json" title="{total:,} bytes of program"></div>'


def featured_frames(g):
    """game.json's "featured_frames": more pictures from the game folder for the featured box to fade
    through after the title image. Each must be a file in the game folder, as title_image must."""
    gdir = os.path.join(ROOT, "games", g["platform"], g["slug"])
    out = []
    for p in g.get("featured_frames") or []:
        ok = isinstance(p, str) and p and not os.path.isabs(p) and os.path.normpath(p) == p and ".." not in p.split(os.sep)
        if ok and os.path.isfile(os.path.join(gdir, p)):
            out.append(p)
        else:
            warn(f"{g['platform']}/{g['slug']} featured_frames entry {p!r} is not a file in the game folder")
    return out


def featured_html(g):
    """One game, large: title screen, memory strip, the title and its opening line."""
    plat, slug = g["platform"], g["slug"]
    meta = " · ".join(x for x in (PLATFORM_NAMES.get(plat, plat), str(g.get("year") or ""), g.get("publisher") or "") if x)
    shot = shot_html(g)
    frames = [f"{plat}/{slug}/{p}" for p in featured_frames(g)]
    if frames and shot.startswith("<img"):
        shot = shot.replace("<img ", f'<img data-frames="{html.escape(" ".join(frames), quote=True)}" ', 1)
    return (f'<a class="show" href="{plat}/{slug}/">{shot}{strip_html(g)}'
            f'<span class="cap"><b>{html.escape(g.get("title", slug))}</b><span class="m">{html.escape(meta)}</span></span>'
            f'<p class="hook">{html.escape(hook(g))}</p></a>')


TIER_GROUPS = {"diamond": "diamond", "gold": "gold", "platinum": "platinum", "silver-claimed": "silver", "silver": "silver",
               "bronze": "bronze"}


def tier_group(g):
    """The tier a card is coloured and grouped by: a claimed Silver with Silver."""
    return TIER_GROUPS.get(g.get("tier", "none"), "none")


def tier_edge(g):
    """The tier written up the card's left edge, in the tier's colour."""
    t = g.get("tier", "none")
    word = {"silver-claimed": "Silver"}.get(t, t.capitalize() if t != "none" else "No tier")
    return f'<span class="tier" aria-label="Tier: {html.escape(tier_name(t, g.get("steward")))}">{html.escape(word)}</span>'


def names(people):
    """People as a sentence: a; a and b; a, b and c."""
    return ", ".join(people[:-1]) + " and " + people[-1] if len(people) > 1 else "".join(people)


_icons = {}


def platform_icon(plat):
    """The machine's logo, site/icons/platforms/<plat>.svg, inline: one colour, the text's, on a
    24-unit square, with the file's own fill and stroke. "" and a warning for a platform with none."""
    if plat not in _icons:
        p = os.path.join(SITE, "icons", "platforms", f"{plat}.svg")
        m = re.search(r"<svg\b([^>]*)>(.*)</svg>", read(p), re.S) if os.path.isfile(p) else None
        if not m:
            warn(f"site/icons/platforms/{plat}.svg is missing, so the {plat} cards show no machine (kit/PLATFORMS.md)")
            _icons[plat] = ""
        else:
            attrs = [a for a in re.findall(r'[\w:-]+="[^"]*"', m.group(1)) if not a.startswith(("xmlns", "width=", "height="))]
            body = re.sub(r">\s+<", "><", m.group(2).strip())
            _icons[plat] = f'<svg {" ".join(attrs)} aria-hidden="true">{body}</svg>'
    return _icons[plat]


def platform_badge(g, root):
    """The machine a card's game runs on: its logo in the card's corner, named when hovered, and a
    link to that platform's page. Nothing for a platform with no logo."""
    plat = g["platform"]
    icon, name = platform_icon(plat), html.escape(PLATFORM_NAMES.get(plat, plat))
    return f'<a class="plat" href="{root}{plat}/" title="{name}" aria-label="{name}">{icon}</a>' if icon else ""


def tile_html(g, root, line, foot, data="", badge=True):
    """A game's card, as New and updated and the catalogue show one: the tier up the left edge,
    the title screen, the game's title (the card's link), a line on who, a line in small type, and
    the machine's logo in the corner. root is the way up to the site's top from the page the card
    is on; badge=False leaves the logo out, on a page of one platform's games."""
    plat, slug = g["platform"], g["slug"]
    line = f'<span class="v">{line}</span>' if line else ""
    return (f'<div class="tile t-{tier_group(g)}"{data}>{tier_edge(g)}{shot_html(g, "thumb", root)}'
            f'{platform_badge(g, root) if badge else ""}<span class="body">'
            f'<a class="g" href="{root}{plat}/{slug}/">{html.escape(g.get("title", slug))}</a>{line}{foot}</span></div>')


def card_html(g, root="", badge=True):
    """Every game, in the catalogue: its card (tile_html), naming the people who contributed it,
    as the About tab credits them, and the year and publisher. The data- attributes are what the
    home page's search, filters and sorts read (site.js)."""
    plat, slug = g["platform"], g["slug"]
    cons = g["_cons"]
    words = " ".join(str(x) for x in (g.get("title", slug), g.get("publisher"), g.get("developer"),
                                       PLATFORM_NAMES.get(plat, plat), g.get("year"), hook(g),
                                       *(login or name for _, name, login in cons)) if x)
    data = (f' data-platform="{html.escape(plat)}" data-platform-name="{html.escape(PLATFORM_NAMES.get(plat, plat))}"'
            f' data-tier="{tier_group(g)}" data-year="{g.get("year") or ""}" data-added="{html.escape(g.get("created") or "")}"'
            f' data-title="{html.escape(g.get("title", slug))}" data-q="{html.escape(words.lower())}"')
    who = names([person_html(name, login) for _, name, login in cons])
    made = " · ".join(str(x) for x in (g.get("year"), g.get("publisher")) if x)
    return tile_html(g, root, f"contributed by {who}" if who else "", f'<span class="m">{html.escape(made)}</span>', data, badge)


def platform_pages(games, out_root):
    """<platform>/index.html for each platform with games: the home page's catalogue of
    that platform's games alone, where the platform in a game's breadcrumb leads."""
    for plat in sorted({g["platform"] for g in games}):
        gs = [g for g in by_tier(games) if g["platform"] == plat]
        name = html.escape(PLATFORM_NAMES.get(plat, plat))
        open(os.path.join(out_root, plat, "index.html"), "w").write(
            fill(read(os.path.join(SITE, "platform.html")), site_title=f"{name} · Games Explained", lib="../lib",
                 platform_name=name, cards="".join(card_html(g, "../", badge=False) for g in gs), n_games=len(gs)))


def featured_game(games):
    """The game the home page opens with: the one whose game.json says "featured": true,
    else the first a person has curated, else the first there is."""
    return (next((g for g in games if g.get("featured")), None)
            or next((g for g in games if g.get("tier") in CURATED), games[0] if games else None))


# --- the home page's New and updated row: the latest games added or changed, from git history
PUBLISHED = re.compile(r"(index|levels|play)\.html|features\.md|(game|listing|symbols)\.json|reference/.+"
                       r"|parts/[^/]+/(part|listing|symbols)\.json")


def recent_changes(games, n=20):
    """The newest n changes to games, one row per game per day: {game, date, kind, who}.

    Walks main's first-parent line, so a merged pull request is one change. A change
    counts when it alters what readers see of exactly one game, a file the build
    publishes from one game folder: a sweep across every game, or a change to the kit
    alone, is left out. It is "contributed" when it adds the game's game.json, else
    "updated". The people are the git authors of the change, named as on the About tab
    (credit; for a merge, the authors of the commits it brought in, not whoever merged
    it), agents and bots left out as there, and so is anyone the game lists as uncredited."""
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
                if uncredited(by_key[key], *who):
                    continue
                counts[who] = counts.get(who, 0) + 1
        row = rows.setdefault(key + (date,), {"game": by_key[key], "date": date, "kind": "updated", "who": {}})
        if key in added:
            row["kind"] = "contributed"
        for who, _ in sorted(counts.items(), key=lambda kv: -kv[1]):
            row["who"].setdefault(who[1] or who[0], who)
    return list(rows.values())[:n]


def recent_html(rows):
    """One card per change (tile_html): the game, who changed it and when. Four show at a time;
    site.js turns the row into a carousel that moves on by itself."""
    if not rows:
        return ""
    repo = json.load(open(os.path.join(SITE, "config.json"))).get("repo", "").rstrip("/")
    cards = []
    for r in rows:
        who = names([person_html(nm, login) for nm, login in r["who"].values()])
        m, d = (int(x) for x in r["date"].split("-")[1:])
        cards.append(tile_html(r["game"], "", r["kind"] + (f" by {who}" if who else ""),
                               f'<time datetime="{r["date"]}" title="{long_date(r["date"])}">{d} {MONTHS[m - 1][:3]}</time>'))
    return (f'<div class="recent"><div class="cathead"><h2>New and updated</h2>'
            f'<a href="{html.escape(repo)}/commits/main/games">All changes</a></div>'
            f'<div class="cards" tabindex="0" aria-label="New and updated games">{"".join(cards)}</div>'
            f'<div class="dots" aria-label="Pages"></div></div>')


# --- the activity page: what landed on main each day, from git history and GitHub's issues
KIT_BUMP = re.compile(r"kit (\d+\.\d+\.\d+)\b")   # the subject of kit-version.yml's commit
SQUASHED = re.compile(r"\s*\(#(\d+)\)$")           # "Title (#123)": a pull request merged with "Squash and merge"
MERGED = re.compile(r"Merge pull request #(\d+) from \S+$")   # one merged with a merge commit
CLOSES = re.compile(r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)\b", re.I)   # GitHub's closing keywords


def areas(paths):
    """What a change touched, by the folders its files are in: "game", "kit" (kit/ but its
    VERSION, which the bump workflow owns, and AGENTS.md, the kit's rules), "site", and
    "other" for a change that touched none of them (the CI, admin/, the README)."""
    out = []
    if any(p.startswith("games/") for p in paths):
        out.append("game")
    if any((p.startswith("kit/") and p != "kit/VERSION") or p == "AGENTS.md" for p in paths):
        out.append("kit")
    if any(p.startswith("site/") for p in paths):
        out.append("site")
    return out or ["other"]


def landed(games):
    """Every change that landed on main, oldest first, and the kit's version bumps.

    A change is a commit on main's first-parent line: a pull request merged with "Squash and
    merge" (its title ends "(#N)"), one merged with a merge commit (whose message carries the
    pull request's title on the line after "Merge pull request #N"), or a commit pushed to
    main. It is dated when it landed, its committer time. kit-version.yml's bump is not a
    change of its own; its number goes in the bumps, [time, version]. Each change is
    {t, sha, pr, title, who, areas, games, added, removed, fixes}: games the folders it
    touched, added and removed the game.json files it added and deleted (which is how the
    total is counted), fixes the issues its message closes ("Closes #12", which a squash
    merge copies from the pull request), and who its people, named as on the home page's
    New and updated row (credit): agents and bots left out, and so is anyone a game it
    touched lists as uncredited."""
    by_key = {f'{g["platform"]}/{g["slug"]}': g for g in games}
    git = lambda *a: subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True).stdout
    try:
        out = git("log", "--first-parent", "--diff-merges=first-parent", "--no-renames", "--name-status",
                  "--format=%x1e%H %P%x1f%ct%x1f%aN%x1f%aE%x1f%s%x1f%b%x1d", "HEAD")
    except Exception:
        return [], []
    changes, bumps = [], []
    for chunk in out.split("\x1e")[1:]:
        head, _, files = chunk.partition("\x1d")
        shas, t, name, email, subject, body = head.split("\x1f")
        sha, *parents = shas.split()
        t = int(t)
        if KIT_BUMP.fullmatch(subject.replace(" [skip ci]", "")) and is_agent(email):
            bumps.append([t, KIT_BUMP.match(subject).group(1)])
            continue
        paths, added, removed = [], [], []
        for ln in files.strip("\n").split("\n"):
            status, *ps = ln.split("\t")
            paths += ps
            m = re.fullmatch(r"games/([^/]+/[^/]+)/game\.json", ps[0]) if ps else None
            if m and status == "A":
                added.append(m.group(1))
            elif m and status == "D":
                removed.append(m.group(1))
        touched = sorted({"/".join(p.split("/")[1:3]) for p in paths if p.startswith("games/") and p.count("/") >= 3})
        pr, title = None, subject
        m = SQUASHED.search(subject) or MERGED.match(subject)
        if m:
            pr = int(m.group(1))
            title = SQUASHED.sub("", subject) if SQUASHED.search(subject) else next(
                (ln.strip() for ln in body.splitlines() if ln.strip()), subject)
        if len(parents) > 1:   # a merge: the people whose commits it brought in
            authors = [ln.split("\x1f") for ln in git("log", "--no-merges", "--format=%aN%x1f%aE%x1f%H",
                                                      f"{parents[0]}..{sha}").splitlines()]
        else:
            authors = [(name, email, sha)]
        who = {}
        for nm, em, at in authors:
            if is_agent(em, at):
                continue
            login = github_login(em, at)
            if any(uncredited(by_key[k], nm, login) for k in touched if k in by_key):
                continue
            who.setdefault(login or nm, [nm, login])
        change = {"t": t, "sha": sha[:10], "pr": pr, "title": title, "who": list(who.values()),
                  "areas": (["new"] if added else []) + areas(paths), "games": touched, "added": added, "removed": removed,
                  "fixes": sorted({int(n) for n in CLOSES.findall(body)} - {pr})}
        changes.append({k: v for k, v in change.items() if v or k in ("t", "sha", "title", "areas")})   # the page reads a field left out as empty
    changes.reverse()
    bumps.reverse()
    return changes, bumps


def github_get(url, token):
    """(the decoded answer, the URL of its next page or None) for one GitHub API request.
    GitHub's next page is at /repositories/<id>/...; the same query on the URL asked keeps
    every request under /repos/<owner>/<name>/, as a token scoped to the repository needs."""
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "gamesexplained-build",
                                               "Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        nxt = re.search(r'<[^>?]+\?([^>]+)>;\s*rel="next"', r.headers.get("Link") or "")
        return json.load(r), nxt and url.split("?")[0] + "?" + nxt.group(1)


def fixed_issues():
    """The issues GitHub has closed as completed, oldest first, as {t, n, title}; None when
    GitHub was not asked or did not answer. An issue closed as not planned is not a fix, and
    an issue reopened since is not closed. Like the authors (github_account), it is asked only
    with a token (GITHUB_TOKEN or GH_TOKEN, as in CI), so a build on a contributor's computer
    makes no request and the page says the issues were not counted."""
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        return None
    url, out = f"https://api.github.com/repos/{github_repo()}/issues?state=closed&per_page=100", []
    try:
        while url:
            batch, url = github_get(url, token)
            for i in batch:
                if "pull_request" not in i and i.get("state_reason") == "completed" and i.get("closed_at"):
                    t = int(datetime.datetime.strptime(i["closed_at"], "%Y-%m-%dT%H:%M:%SZ")
                            .replace(tzinfo=datetime.timezone.utc).timestamp())
                    out.append({"t": t, "n": i["number"], "title": i["title"]})
    except Exception as e:
        warn(f"GitHub could not be asked which issues are closed ({getattr(e, 'code', None) or getattr(e, 'reason', e)}): "
             "the activity page leaves the issues out of this build")
        return None
    return sorted(out, key=lambda i: i["t"])


def activity_data(games, now=None):
    """What the activity page draws, as one JSON object: the changes and the kit's version bumps
    (landed), the issues fixed (fixed_issues, null when not asked), each game's title by
    platform/slug, the repository, and the moment the build read them, which is where the
    page's periods end."""
    changes, bumps = landed(games)
    return {"now": int(now if now is not None else datetime.datetime.now(datetime.timezone.utc).timestamp()),
            "repo": json.load(open(os.path.join(SITE, "config.json")))["repo"].rstrip("/"),
            "changes": changes, "bumps": bumps, "issues": fixed_issues(),
            "games": {f'{g["platform"]}/{g["slug"]}': g["title"] for g in games}}


def activity_page(games):
    """site/activity.html with activity_data embedded, which site/lib/activity.js draws: a
    period to pick, a tile for each count, the chosen count day by day, and every day's
    changes and fixes. "</" is escaped so no title can close the script element it sits in."""
    data = json.dumps(activity_data(games), separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    return fill(read(os.path.join(SITE, "activity.html")), site_title="Activity · Games Explained", lib="lib",
                data=data, repo=html.escape(json.load(open(os.path.join(SITE, "config.json")))["repo"].rstrip("/")))


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


def credits():
    """site/credits.json's tools and their makers, as the About and status pages print them. Fails on
    an entry they cannot print, and on a kit that names no tool, so a new platform thanks its makers."""
    cs = json.load(open(os.path.join(SITE, "credits.json"), encoding="utf-8"))["credits"]
    for c in cs:
        if not all(str(c.get(k) or "").strip() for k in ("name", "by", "url", "thanks")) \
                or len(re.findall(r"\[[^\]]+\]", c.get("thanks") or "")) != 1:
            sys.exit(f"site/credits.json: {c.get('name')!r} needs a name, by, url and a thanks with one [link]")
    bare = [k for k in kits() if not any(k in (c.get("kits") or []) for c in cs)]
    if bare:
        sys.exit(f"site/credits.json: no tool names the {', '.join(bare)} kit; add its emulator and disassembler "
                 "and who made them (kit/PLATFORMS.md)")
    return cs


def thanks_html(cs):
    """The About page's Thank you list: each entry's own words, **bold** for the people, [..] its link."""
    def line(c):
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(c["thanks"], quote=False))
        return re.sub(r"\[(.+?)\]", lambda m: f'<a href="{html.escape(c["url"])}">{m.group(1)}</a>', t)
    return '<ul class="plain">' + "".join(f"<li>{line(c)}</li>" for c in cs) + "</ul>"


def runs_on(cs, kit):
    """A kit's tools on its status cards, emulators first: 'Runs on VICE by the VICE team, ... and ...'."""
    items = [f'<a href="{html.escape(c["url"])}">{html.escape(c["name"])}</a> by {html.escape(c["by"])}'
             for c in sorted((c for c in cs if kit in (c.get("kits") or [])), key=lambda c: c.get("role") != "emulator")]
    return f'<p class="tools">Runs on {" and ".join(filter(None, [", ".join(items[:-1]), items[-1]]))}.</p>' if items else ""


TIER_ORDER = ("diamond", "platinum", "gold", "silver-claimed", "silver", "bronze", "none")


def by_tier(games):
    """The games best first, as the home page lists them: Diamond, Platinum and Gold,
    Bronze and no tier at the bottom; within a tier, the order they came in."""
    rank = lambda g: TIER_ORDER.index(g.get("tier", "none")) if g.get("tier", "none") in TIER_ORDER else len(TIER_ORDER)
    return sorted(games, key=rank)


def tier_stamps(gs):
    counts = {}
    for g in gs:
        counts[g.get("tier", "none")] = counts.get(g.get("tier", "none"), 0) + 1
    return " ".join(f'<span class="stamp {html.escape(t)}">{counts[t]} {html.escape(tier_name(t))}</span>'
                    for t in TIER_ORDER if counts.get(t))


def a_or_an(name):
    """'a' or 'an' before a system's name, by its sound: an Apple II, an NES, an MSX, a BBC Micro.
    A name that opens on capitals is read letter by letter, and F, H, L, M, N, R, S and X open on a vowel."""
    w = name.split()[0] if name.split() else ""
    initials = len(w) > 1 and w.isupper() and w.isalpha()
    return "an" if w[:1].lower() in "aeiou" or (initials and w[0] in "FHLMNRSX") else "a"


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
    cs = credits()
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
                works.append(card(title, stamp("works", HOST_STATES["works"]), c.get("note", ""), c.get("seen"), runs_on(cs, k) + made, [], False,
                                  c.get("prompt") or f'Clone {raw_repo} and follow kit/START.md. I am on {h["name"]}, {h["arch"]}, '
                                  f'and I want to explain {a_or_an(name(k))} {name(k)} game.'))
            else:
                start = [blob(f"kit/{k}/INSTALL.md", f"kit/{k}/INSTALL.md"),
                         blob("kit/INSTALL.md#the-footprint-principle", "the footprint principle")]
                prompt = c.get("prompt") or (
                    f'Clone {raw_repo} and follow kit/START.md to explain {a_or_an(name(k))} {name(k)} game on {h["name"]}, {h["arch"]}. '
                    'Nobody has run the kit here: follow "If you are the first on an operating system" in kit/INSTALL.md, '
                    f'run check-emulator, and record what works in kit/{k}/INSTALL.md and site/status.json.')
                research.append((not c.get("wanted"), card(title, stamp(c["state"], HOST_STATES[c["state"]]), c.get("note", ""),
                                                           c.get("seen"), runs_on(cs, k), start, c.get("wanted"), prompt)))
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


class AddressLinks(html.parser.HTMLParser):
    """The links into a Source page that a built page carries, as (page, address): each
    <a href="source….html#XXXX">, and each bare <code>$XXXX</code> that site.js makes one of
    when the page loads, sent where its nearest data-part says. Nothing inside a block hidden
    with the page editor (data-cut) is read: a reader never sees it."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.open, self.links, self.code, self.nolink = [], [], None, False   # open: (tag, data-part, hidden)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        hidden = "data-cut" in a or bool(self.open and self.open[-1][2])
        if tag == "body" or (tag == "nav" and "gametabs" in (a.get("class") or "").split()):
            self.nolink = self.nolink or "data-nolink" in a   # the tab bar of a game with no listing
        if self.code:
            self.code["bare"] = False   # site.js leaves a <code> with an element inside it
        m = tag == "a" and re.fullmatch(r"(source(?:-[\w.-]+)?\.html)#([0-9A-Fa-f]{4,5})", a.get("href") or "")
        if m and not hidden:
            self.links.append((m.group(1), int(m.group(2), 16)))
        if tag in VOID_TAGS:
            return
        self.open.append((tag, a.get("data-part"), hidden))
        if tag == "code" and not self.code:
            self.code = {"depth": len(self.open), "text": "",
                         "bare": not hidden and not any(t in ("a", "pre") for t, _, _ in self.open[:-1])}

    def handle_data(self, data):
        if self.code:
            self.code["text"] += data

    def handle_endtag(self, tag):
        if all(t != tag for t, _, _ in self.open):
            return
        while self.open:   # an element left open (a <p>, an <li>) closes with the one around it
            if self.code and len(self.open) == self.code["depth"]:
                c, self.code = self.code, None
                part = next((p for _, p, _ in reversed(self.open) if p is not None), None)
                m = re.fullmatch(r"\s*\$([0-9A-Fa-f]{4,5})\s*" if part else r"\s*\$([0-9A-Fa-f]{4})\s*", c["text"])
                if m and c["bare"] and not self.nolink and part != "":
                    self.links.append((f"source-{part}.html" if part else "source.html", int(m.group(1), 16)))
            if self.open.pop()[0] == tag:
                break


_recorded = {}
ITEMS = {"basic"}   # text types whose records each hold one item, a program line or a variable


def recorded(listings):
    """The addresses that have a record in these listings, laid one over another as a part's
    Source page lays them: (an int with bit 8*a set for each address a a row covers or a label
    stands at, and one with the bit set for each address inside a BASIC line or variable, past
    its first byte and before its last, which a range "$5CCB-$AD59" ends on). A gap covers none."""
    bits = inside = 0
    for f in listings:
        if f not in _recorded:
            L = json.load(open(f))
            size = L.get("size", 0x10000)     # a story's listing is its own size
            got, mid = bytearray(size), bytearray(size)
            for r in L["records"]:
                if r["t"] != "gap":
                    end = min(size, r["a"] + max(1, len(r.get("b") or [])))
                    got[r["a"]:end] = b"\1" * (end - r["a"])
                    if r.get("enc") in ITEMS and end - r["a"] > 2:   # its last byte ends a range
                        mid[r["a"] + 1:end - 1] = b"\1" * (end - r["a"] - 2)
            _recorded[f] = int.from_bytes(got, "little"), int.from_bytes(mid, "little")
        bits |= _recorded[f][0]
        inside |= _recorded[f][1]
    return bits, inside


def unrecorded(out_root):
    """(links into a Source page, [(page, Source page, address)] for those that land on no record,
    the same for those that land inside a BASIC line or variable, past its first byte and
    before its last).

    Every $XXXX on a game's pages links to a Source page, and one whose listing holds no
    record at it (a chip register, a stretch the coverage leaves out, an address of another
    part) opens on the gap that holds it, with a note (#215). The count keeps them in sight.
    In a BASIC listing every address is inside some line, so a wrong address opens on the
    wrong line with no note; a link into a line is meant for its first byte (#356)."""
    total, lost, inside = 0, [], []
    for out in sorted(glob.glob(os.path.join(out_root, "*", "*", ""))):
        held, again = {}, None
        for f in glob.glob(os.path.join(out, "source*.html")):
            m = re.search(r'<script type="application/json" id="part">(.*?)</script>', read(f), re.S)
            info = json.loads(m.group(1)) if m else {"listing": "listing.json", "under": []}
            listings = [os.path.join(out, x) for x in [info["listing"]] + [u["listing"] for u in info["under"]]]
            if all(os.path.exists(x) for x in listings):
                held[os.path.basename(f)] = recorded(listings)
            if m and os.path.basename(f) == "source.html":
                again = f   # a game of several parts: the first part's page again
        for f in sorted(glob.glob(os.path.join(out, "*.html"))):
            if f == again:
                continue
            p = AddressLinks()
            p.feed(read(f))
            p.close()
            for page, a in p.links:
                if page in held:
                    total += 1
                    if not held[page][0] >> (8 * a) & 1:
                        lost.append((os.path.relpath(f, out_root), page, a))
                    elif held[page][1] >> (8 * a) & 1:
                        inside.append((os.path.relpath(f, out_root), page, a))
    return total, lost, inside


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
    for f, src in KIT_LIB.items():
        if os.path.exists(os.path.join(SITE, "lib", f)):
            sys.exit(f"site/lib/{f} and {src} would both be lib/{f}: the site serves {src}, so delete site/lib/{f}")
        shutil.copy(os.path.join(ROOT, *src.split("/")), os.path.join(out_root, "lib", f))
    games = []
    for gj in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json"))):
        games.append(build_game(os.path.dirname(gj), out_root))
    feat = featured_game(games)
    home = fill(read(os.path.join(SITE, "index.html")), site_title="Games Explained", lib="lib",
                cards="".join(card_html(g) for g in by_tier(games)), featured=featured_html(feat) if feat else "",
                recent=recent_html(recent_changes(games)), n_games=len(games))
    open(os.path.join(out_root, "index.html"), "w").write(home)
    platform_pages(games, out_root)
    open(os.path.join(out_root, "status.html"), "w").write(status_page(games))
    open(os.path.join(out_root, "activity.html"), "w").write(activity_page(games))
    # the site's About page; site/about.html is the About tab of a game
    repo = html.escape(json.load(open(os.path.join(SITE, "config.json")))["repo"].rstrip("/"))
    open(os.path.join(out_root, "about.html"), "w").write(
        fill(read(os.path.join(SITE, "about-site.html")), site_title="About · Games Explained", lib="lib", repo=repo,
             thanks=thanks_html(credits())))
    open(os.path.join(out_root, "accuracy.html"), "w").write(
        fill(read(os.path.join(SITE, "accuracy.html")), site_title="Accuracy of the Source · Games Explained", lib="lib",
             repo=repo))
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
    total, lost, inside = unrecorded(out_root)
    if "--addresses" in argv:
        pages = {}
        for page, src, a in lost:
            pages.setdefault(page, []).append(f"{src}#{a:04X}")
        for page, src, a in inside:
            pages.setdefault(page, []).append(f"{src}#{a:04X} (inside a line)")
        for page, to in pages.items():
            print(f"{page}: {len(to)}: {', '.join(sorted(set(to)))}")
    if lost:
        print(f"{len(lost):,} of {total:,} links into a Source page land on no record there, and the page says so "
              "when one is followed" + ("" if "--addresses" in argv else "; build.py --addresses lists them"))
    if inside:
        print(f"{len(inside):,} of {total:,} links into a Source page land inside a BASIC line or variable, past "
              "its first byte, and open on that line with no note: check each names the line it means"
              + ("" if "--addresses" in argv else "; build.py --addresses lists them"))
    cut = cut_blocks(games)
    for page, tier, n in cut:
        warn(f"{page} has {n} block(s) hidden with the page editor; the cleanup pass in kit/START.md removes them")
    done = [page for page, tier, n in cut if tier in CURATED]
    if done:
        sys.exit(f"{', '.join(done)}: a Gold page with blocks still hidden with the page editor. "
                 "Do the cleanup pass in kit/START.md before setting the tier.")
    if _unasked:
        print(f"{len(_unasked)} contributor(s) are unlinked in this build: GitHub says whose address a commit "
              "is under, and the build asks it only when GITHUB_TOKEN is set, as it is in CI")
    print(f"built {len(games)} game(s) into {os.path.relpath(out_root, ROOT)}/" + (f"; analytics on {tagged} pages" if tagged else "; analytics off (no id in site/config.json)"))


if __name__ == "__main__":
    main()
