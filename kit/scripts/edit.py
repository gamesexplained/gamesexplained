#!/usr/bin/env python3
"""Edit a game's pages in the browser: click a paragraph and type.

Serves the site as build.py makes it, to this computer only. The authored tabs (How it
works, Maps / levels, Play) are rendered from the game folder on every load, each block
tagged with where it sits in the source, with the editor on top. Leaving a block writes
it back into the file and changes nothing else there, so `git diff` shows exactly what
was edited.

  click a block, type     paragraphs, headings, captions, list items, table cells
  Cmd/Ctrl+B, I, E, K     bold, italic, code, link
  Enter, Backspace        split a paragraph or list item; join it to the one before
  Esc                     drop the changes to the block you are in
  ×                       cut the block; one that holds a widget is hidden instead
  ↑ ↓                     move a section; the 01 · 02 · labels follow
  Alt+click               open that line in VS Code
  Undo                    step back through this session's changes to the page

A block the page's script writes, or one filled from game.json, is locked: edit it in
the source. A hidden block stays in the page, marked data-cut, so the scripts that look
for it keep working; the cleanup pass in kit/START.md removes it with everything only it
used. build.py lists the pages that still have one, and fails on a Gold page that does.
The list of sections in the margin leaves hidden blocks out. An edit that moves, cuts or
hides something it shows reloads the page, so the list follows; a heading or a label you
change is written into its entry as you leave it.

Usage: edit.py [--port N]   serve on N, or on 8000 or the next free port after it
       edit.py --test       try every edit on every authored page, writing nothing
No dependencies.
"""
import functools, glob, hashlib, html, http.server, json, os, re, secrets, socket, subprocess, sys, threading, urllib.parse
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402

ROOT, ASSETS = build.ROOT, os.path.join(HERE, "editor")
OUT = os.path.join(ROOT, "_site")
TOKEN = secrets.token_urlsafe(18)
BIG = 1 << 30

TEXT = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "figcaption", "td", "th", "dt", "dd", "caption", "summary",
        "blockquote"}
INLINE = {"a", "b", "i", "em", "strong", "code", "kbd", "sup", "sub", "span", "br", "small", "abbr", "var", "samp",
          "u", "s", "mark", "q", "cite", "time", "wbr", "del", "ins"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
WIDGET = {"canvas", "svg", "button", "input", "select", "textarea", "audio", "video", "iframe", "object", "embed",
          "script", "form"}
CUT = {"section", "figure", "table", "ul", "ol", "dl", "blockquote", "pre", "details", "p", "li", "h2", "h3", "h4",
       "h5", "h6", "figcaption"}
FLOW = {"address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset", "figcaption", "figure",
        "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu", "nav", "ol", "p",
        "pre", "section", "table", "ul"}   # a browser closes an open <p> at any of these
NOUN = {"p": "paragraph", "li": "list item", "figcaption": "caption", "td": "table cell", "th": "table heading",
        "dt": "term", "dd": "definition", "caption": "table caption", "summary": "summary", "blockquote": "quote",
        "section": "section", "figure": "figure", "table": "table", "ul": "list", "ol": "list", "dl": "list",
        "pre": "code block", "details": "details", "div": "block"}
FIG = re.compile(r"(\s*)(\d{2})(\s·\s)")   # a section's label: 01 · The city in lines


# --- where every element is in the source ---------------------------------------
class Tree(HTMLParser):
    """Every element whose end tag the source gives, in document order, with its offsets:
    s the start tag, i the content, ie the end tag, e just past it. A browser builds the
    same element from those bytes, which is what lets a block on screen be written back
    in place. An element left open is dropped, and anything holding it is not counted as
    prose, since the browser decides where the open one ends."""

    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.root = dict(tag="#root", kids=[], attrs={}, cls=[], parent=None)
        self.stack, self.els = [], []
        self.starts = [0] + [m.end() for m in re.finditer("\n", src)]
        self.feed(src)
        self.close()
        self.els.sort(key=lambda e: e["s"])

    def _mark(self, tag, a):
        for up in self.stack:
            up["ids"] = up["ids"] or "id" in a
            up["widget"] = up["widget"] or tag in WIDGET
        if self.stack:
            p = self.stack[-1]
            p["inline"] = p["inline"] and tag in INLINE
            p["flow"] = p["flow"] or tag in FLOW

    def handle_starttag(self, tag, attrs):
        ln, col = self.getpos()
        a = dict(attrs)
        self._mark(tag, a)
        if tag in VOID:
            return
        s = self.starts[ln - 1] + col
        parent = self.stack[-1] if self.stack else self.root
        el = dict(tag=tag, s=s, i=s + len(self.get_starttag_text()), line=ln, col=col + 1, attrs=a,
                  cls=(a.get("class") or "").split(), parent=parent, kids=[], inline=True, flow=False,
                  ids="id" in a, widget=tag in WIDGET)
        parent["kids"].append(el)
        self.stack.append(el)

    def handle_startendtag(self, tag, attrs):
        self._mark(tag, dict(attrs))

    def handle_endtag(self, tag):
        ln, col = self.getpos()
        for k in range(len(self.stack) - 1, -1, -1):
            if self.stack[k]["tag"] == tag:
                break
        else:
            return
        el, left_open = self.stack[k], self.stack[k + 1:]
        del self.stack[k:]
        s = self.starts[ln - 1] + col
        el["ie"], el["e"] = s, self.src.index(">", s) + 1
        el["inline"] = el["inline"] and not left_open
        self.els.append(el)


def blocks(src):
    """The elements the editor tags, in document order: prose it can edit, things it can cut
    and sections it can move. Which elements are tagged depends on each one's own tag and
    class and its parent's tag, never on its words or its siblings, so no edit to one block
    renumbers another beyond what the edit's remap says. What can be done to each (text,
    cut) may change with an edit; meta() reports it afresh."""
    out = []
    for e in Tree(src).els:
        t, up = e["tag"], e["parent"]
        div = t == "div" and ("plate" in e["cls"] or up["tag"] in ("section", "main"))
        if not (t in TEXT or t in CUT or t == "section" or div):
            continue
        early = t == "p" and e["flow"]   # the browser closed this <p> early: its bytes are not the element on screen
        e["text"] = t in TEXT and e["inline"] and not early
        e["cut"] = not early and (t in CUT or t == "section" or div) and not (
            up["tag"] == "div" and "plate" not in up["cls"] and len([k for k in up["kids"] if "e" in k]) == 1)
        out.append(e)   # (the only thing in a wrapper is not cut on its own: the wrapper is what goes)
    return out


def text_of(inner):
    """A block's words as the browser's textContent gives them, spaces collapsed."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", "", inner))).strip()


def hidden(e):
    while e is not None:
        if "data-cut" in e["attrs"]:
            return True
        e = e["parent"]
    return False


def lock(src, e):
    """Why a block of prose cannot be edited in place, or None when it can."""
    inner = src[e["i"]:e["ie"]]
    if "{{" in inner:
        return "game.json"   # filled from game.json by the build
    if e["ids"] and not text_of(inner):
        return "empty"       # empty in the source, with an id: the page's script fills it
    return None


def label(src, e, B):
    """What a cut target is called in the editor's list: its heading, else its first words."""
    for x in B:
        if e["s"] < x["s"] < e["e"] and x["tag"] in ("h2", "h3", "h4"):
            return text_of(src[x["i"]:x["ie"]])[:80]
    t = text_of(re.sub(r"<(script|style)\b.*?</\1>", "", src[e["i"]:min(e["ie"], e["i"] + 4000)], flags=re.S))
    return (t[:77] + "…") if len(t) > 80 else t or NOUN.get(e["tag"], e["tag"])


def meta(src, B):
    """What the browser half needs to know about block N."""
    out = []
    for e in B:
        m = {"tag": e["tag"], "line": e["line"], "col": e["col"]}
        if e["text"]:
            why = lock(src, e)
            if why:
                m["lock"] = why
            else:
                m["edit"], m["text"] = 1, text_of(src[e["i"]:e["ie"]])
        if e["cut"] and not hidden(e["parent"]):
            m["cut"] = "hide" if e["ids"] or e["widget"] else "cut"
            m["label"] = label(src, e, B)
        if e["tag"] == "section":
            m["move"] = 1
        if "data-cut" in e["attrs"]:
            m["hidden"] = 1
        out.append(m)
    return out


def tag(src, B):
    """The page with data-ge="N" on block N's start tag, and every other byte as it was."""
    for n, e in sorted(enumerate(B), key=lambda x: -x[1]["s"]):
        at = e["i"] - 1 - (src[e["i"] - 2] == "/")
        src = src[:at] + f' data-ge="{n}"' + src[at:]
    return src


# --- the edits ------------------------------------------------------------------
class Refused(Exception):
    pass


class Fragment(HTMLParser):
    """A block's new content must be prose: text and inline elements, every one closed."""

    def __init__(self, s):
        super().__init__(convert_charrefs=False)
        self.open = []
        self.feed(s)
        self.close()
        if self.open:
            raise Refused(f"<{self.open[-1]}> is never closed")

    def handle_starttag(self, tag, attrs):
        if tag not in INLINE or any(k.startswith("on") or k == "data-ge" for k, _ in attrs):
            raise Refused(f"<{tag}> does not belong inside a block of prose")
        if tag not in VOID:
            self.open.append(tag)

    def handle_startendtag(self, tag, attrs):
        if tag not in VOID:
            raise Refused(f"<{tag}/> does not belong inside a block of prose")

    def handle_endtag(self, tag):
        if not self.open or self.open[-1] != tag:
            raise Refused(f"</{tag}> closes nothing")
        self.open.pop()


def prose(s):
    if not isinstance(s, str):
        raise Refused("no content given")
    Fragment(s)
    return s


def need(src, B, n, what):
    e = B[n]
    if what == "text" and not (e["text"] and not lock(src, e) and not hidden(e)):
        raise Refused("that block is not edited here")
    if what == "cut" and not e["cut"]:
        raise Refused("that cannot be cut")
    if what == "section" and e["tag"] != "section":
        raise Refused("only a section moves")
    return e


def indent(src, s):
    """A line break and the whitespace the line starts with, when the element at s is the
    first thing on its line; nothing when it is not."""
    lead = src[src.rfind("\n", 0, s) + 1:s]
    return "\n" + lead if not lead.strip() else ""


def op_save(src, B, n, a):
    e = need(src, B, n, "text")
    return src[:e["i"]] + prose(a.get("inner")) + src[e["ie"]:], {}


def op_split(src, B, n, a):
    e = need(src, B, n, "text")
    parts = [prose(p) for p in a.get("parts") or []]
    if e["tag"] not in ("p", "li") or len(parts) < 2:
        raise Refused("only a paragraph or a list item splits")
    start, end = src[e["s"]:e["i"]], src[e["ie"]:e["e"]]
    again = re.sub(r"""\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)""", "", start)   # an id names one element only
    pad = indent(src, e["s"])
    new = start + parts[0] + end + "".join(pad + again + p + end for p in parts[1:])
    return src[:e["s"]] + new + src[e["e"]:], {"remap": [[n + 1, BIG, len(parts) - 1]]}


def op_join(src, B, n, a):
    e = need(src, B, n, "text")
    p = B[n - 1] if n else None
    if not (p and p["text"] and not lock(src, p) and p["tag"] == e["tag"] and p["parent"] is e["parent"]
            and not src[p["e"]:e["s"]].strip()):
        raise Refused("only a block straight after another of its kind joins it")
    return src[:p["i"]] + prose(a.get("inner")) + src[p["ie"]:p["e"]] + src[e["e"]:], {"remap": [[n + 1, BIG, -1]]}


def op_cut(src, B, n, a):
    e = need(src, B, n, "cut")
    if hidden(e["parent"]):
        raise Refused("it is inside a hidden block already")
    if e["ids"] or e["widget"]:   # a script may look for what is in it: hide it, and let the cleanup pass remove it
        if "data-cut" in e["attrs"]:
            return src, {"mode": "hide"}
        at = e["i"] - 1 - (src[e["i"] - 2] == "/")   # " data-cut hidden" in that order is ours; a hidden before it is the author's
        return src[:at] + (" data-cut" if "hidden" in e["attrs"] else " data-cut hidden") + src[at:], {"mode": "hide"}
    m = sum(1 for x in B[n:] if x["s"] < e["e"])
    s0, e0 = e["s"], e["e"]
    ls = src.rfind("\n", 0, s0) + 1
    le = src.find("\n", e0)
    le = len(src) if le < 0 else le
    if not src[ls:s0].strip() and not src[e0:le].strip():   # it had its lines to itself: they go too
        s0, e0 = ls, min(le + 1, len(src))
    return src[:s0] + src[e0:], {"mode": "cut", "remap": [[n + m, BIG, -m]]}


def op_restore(src, B, n, a):
    e = B[n]
    start = src[e["s"]:e["i"]]
    new = start.replace(" data-cut hidden", "", 1)
    if new == start:   # hidden by its author before it was cut: that stays
        new = re.sub(r"""\s+data-cut(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?""", "", start, count=1)
    return src[:e["s"]] + new + src[e["i"]:], {}


def op_move(src, B, n, a):
    """Move a section above the visible section before it (dir -1), or the visible section
    after it above it (dir 1). Whatever lies between, a hidden section included, stays with
    the one that moves down."""
    e = need(src, B, n, "section")
    kids = [k for k in e["parent"]["kids"] if "e" in k]
    i = next(j for j, k in enumerate(kids) if k is e)
    shown = lambda k: k["tag"] == "section" and "data-cut" not in k["attrs"]
    if a.get("dir", -1) < 0:
        X, A = e, next((k for k in reversed(kids[:i]) if shown(k)), None)
    else:
        A, X = e, next((k for k in kids[i + 1:] if shown(k)), None)
    if A is None or X is None:
        raise Refused("there is no section on that side to move past")
    P = kids[next(j for j, k in enumerate(kids) if k is X) - 1]
    gap = src[P["e"]:X["s"]]
    if re.sub(r"<!--.*?-->", "", gap, flags=re.S).strip():
        raise Refused("something other than a section stands between them in the source")
    a0 = next(j for j, x in enumerate(B) if x is A)
    x0 = next(j for j, x in enumerate(B) if x is X)
    mx = sum(1 for y in B[x0:] if y["s"] < X["e"])
    new = src[:A["s"]] + src[X["s"]:X["e"]] + gap + src[A["s"]:P["e"]] + src[X["e"]:]
    return new, {"pair": [a0, x0], "remap": [[a0, x0, mx], [x0, x0 + mx, a0 - x0]]}


OPS = {"save": op_save, "split": op_split, "join": op_join, "cut": op_cut, "restore": op_restore, "move": op_move}


def remapped(k, remap):
    for lo, hi, by in remap:
        if lo <= k < hi:
            return k + by
    return k


def labels(src, B):
    """(block, number) for the first .fig label of every section a reader sees, when it
    starts with a two-digit number."""
    out = []
    for n, e in enumerate(B):
        if e["tag"] != "section" or hidden(e):
            continue
        for k in range(n + 1, len(B)):
            x = B[k]
            if x["s"] >= e["e"]:
                break
            if x["tag"] == "p" and "fig" in x["cls"]:
                m = FIG.match(src[x["i"]:x["ie"]])
                if m:
                    out.append((k, int(m.group(2))))
                break
    return out


def renumber(old, new):
    """Keep a page's 01 · 02 · section labels in order after a section moves, goes or comes
    back, if they were in order before. A page numbered some other way is left as it was.
    Returns the page and {block: its new content} for the labels that changed."""
    was = labels(old, blocks(old))
    if not was or [k for _, k in was] != list(range(1, len(was) + 1)):
        return new, {}
    B = blocks(new)
    changed = []
    for want, (k, have) in reversed(list(enumerate(labels(new, B), 1))):
        if want != have:
            at = B[k]["i"] + FIG.match(new[B[k]["i"]:B[k]["ie"]]).start(2)
            new = new[:at] + f"{want:02d}" + new[at + 2:]
            changed.append(k)
    B = blocks(new)
    return new, {k: new[B[k]["i"]:B[k]["ie"]] for k in changed}


def what(op, e, a, extra):
    noun = "plate" if e["tag"] == "div" and "plate" in e["cls"] else NOUN.get(e["tag"], "heading")
    return {"save": f"Edited a {noun}", "split": f"Split a {noun}", "join": f"Joined two {noun}s",
            "cut": f"{'Hid' if extra.get('mode') == 'hide' else 'Cut'} a {noun}", "restore": f"Restored a {noun}",
            "move": f"Moved a section {'up' if a.get('dir', -1) < 0 else 'down'}"}[op]


# --- the files ------------------------------------------------------------------
LOCK = threading.Lock()
UNDO = {}   # path -> [(before, after, what)], this session's writes


def read(path):
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def write(path, text):
    """Replace the file in one step; the half-written copy waits in the game's gitignored work/."""
    work = os.path.join(os.path.dirname(path), "work")
    os.makedirs(work, exist_ok=True)
    tmp = os.path.join(work, ".edit-" + os.path.basename(path))
    with open(tmp, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    os.replace(tmp, path)


def rev(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def page_file(page):
    """games/<platform>/<slug>/<tab>.html for "<platform>/<slug>/<tab>.html", if it is an authored tab."""
    m = re.fullmatch(r"([a-z0-9-]+)/([a-z0-9-]+)/([a-z0-9-]+\.html)", page or "")
    if not m or m.group(3) not in build.AUTHORED:
        return None
    path = os.path.join(ROOT, "games", *m.groups())
    return path if os.path.isfile(path) else None


def act(req):
    """Carry out one request from the editor. Returns (HTTP status, reply)."""
    path = page_file(req.get("page"))
    if not path:
        return 404, {"error": "not an authored page"}
    op = req.get("op")
    with LOCK:
        src = read(path)
        if op == "rev":
            return 200, {"rev": rev(src)}
        if req.get("rev") != rev(src):
            return 409, {"error": "The file changed on disk, so the page was reloaded.", "reload": True}
        if op == "undo":
            stack = UNDO.get(path) or []
            if not stack:
                return 400, {"error": "Nothing to undo."}
            before, after, did = stack.pop()
            write(path, before)
            return 200, {"ok": True, "reload": True, "what": f"Undone: {did.lower()}."}
        B = blocks(src)
        n = req.get("id")
        if op not in OPS and op != "open":
            return 400, {"error": f"no such edit: {op}"}
        if not isinstance(n, int) or not 0 <= n < len(B) or B[n]["tag"] != req.get("tag"):
            return 409, {"error": "The page and the file disagreed, so the page was reloaded.", "reload": True}
        if op == "open":
            open_in_editor(path, B[n]["line"], B[n]["col"])
            return 200, {"ok": True, "rev": rev(src)}
        try:
            new, extra = OPS[op](src, B, n, req)
            if op in ("cut", "restore", "move"):
                new, extra["updates"] = renumber(src, new)
        except Refused as x:
            return 400, {"error": f"Not saved: {x}."}
        did = what(op, B[n], req, extra)
        if new != src:
            write(path, new)
            UNDO.setdefault(path, []).append((src, new, did))
        if op in ("save", "split", "join") and (B[n]["tag"] == "h2" or "fig" in B[n]["cls"]):
            extra["nav"] = section_list(path, new)   # a heading or a label is what the section list shows
        return 200, dict(extra, ok=True, rev=rev(new), els=meta(new, blocks(new)), undo=len(UNDO.get(path, [])), what=did)


def open_in_editor(path, line, col):
    url = "vscode://file/" + urllib.parse.quote(path.replace(os.sep, "/")) + f":{line}:{col}"
    if sys.platform == "darwin":
        subprocess.Popen(["open", url])
    elif os.name == "nt":
        os.startfile(url)
    else:
        subprocess.Popen(["xdg-open", url])


# --- the pages ------------------------------------------------------------------
COLLECT = ("<script>window.__geErrors=[];addEventListener('error',function(e){__geErrors.push(e.message?"
           "e.message+(e.lineno?' (line '+e.lineno+' of the served page)':''):'Could not load '+"
           "((e.target&&(e.target.src||e.target.href))||'something'))},true);addEventListener('unhandledrejection',"
           "function(e){__geErrors.push(String(e.reason))})</script>")


@functools.lru_cache(maxsize=None)
def contributors(gdir):
    return build.contributors(gdir)


def assemble(path, src):
    """The page build.py publishes for this authored tab, made from src instead of the file."""
    gdir, f = os.path.split(path)
    game = json.load(open(os.path.join(gdir, "game.json")))
    nav = build.tabbar(game, build.present_tabs(gdir), build.LIB)
    return build.authored_page(gdir, game, f, nav, build.banner(game, contributors(gdir)), src=src)


def section_list(path, src):
    """The list of the page's sections in the margin (build.pagenav) as src makes it, or "" for none."""
    m = re.search(r'<nav class="pagenav".*?</nav>', assemble(path, src), re.S)
    return m.group(0) if m else ""


def render(path):
    """An authored page as the build would publish it, with block N tagged data-ge="N", the
    error collector first and the editor last."""
    gdir = os.path.dirname(path)
    src = read(path)
    B = blocks(src)
    page = assemble(path, tag(src, B))
    page = re.sub(r"<meta charset=[^>]*>", lambda m: m.group(0) + COLLECT, page, count=1, flags=re.I)
    info = {"page": os.path.relpath(path, os.path.join(ROOT, "games")).replace(os.sep, "/"), "rev": rev(src),
            "token": TOKEN, "els": meta(src, B), "undo": len(UNDO.get(path, [])),
            "folder": os.path.relpath(gdir, ROOT).replace(os.sep, "/")}
    return page + ('\n<link rel="stylesheet" href="/__edit/editor.css">\n<script id="ge-meta" type="application/json">'
                   + json.dumps(info).replace("</", "<\\/") + '</script>\n<script src="/__edit/editor.js"></script>\n')


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=OUT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_request(self, code="-", size="-"):
        try:
            quiet = int(code) < 400
        except (TypeError, ValueError):
            quiet = False
        if not quiet:
            super().log_request(code, size)

    def local(self):
        """Only this computer, by name: a page elsewhere that points its own name at 127.0.0.1 still sends that name."""
        port = self.server.server_address[1]
        if (self.headers.get("Host") or "").lower() in (f"127.0.0.1:{port}", f"localhost:{port}"):
            return True
        self.send_error(403, "The page editor answers only to 127.0.0.1 and localhost")
        return False

    def send(self, code, body, ctype):
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_HEAD(self):
        if self.local():
            super().do_HEAD()

    def do_GET(self):
        if not self.local():
            return
        u = urllib.parse.urlsplit(self.path)
        if u.path in ("/__edit/editor.js", "/__edit/editor.css"):
            name = u.path.rsplit("/", 1)[1]
            return self.send(200, read(os.path.join(ASSETS, name)),
                             "text/javascript; charset=utf-8" if name.endswith(".js") else "text/css; charset=utf-8")
        m = re.fullmatch(r"/([a-z0-9-]+)/([a-z0-9-]+)/([a-z0-9-]+\.html)?", u.path)
        path = m and page_file(f"{m.group(1)}/{m.group(2)}/{m.group(3) or 'index.html'}")
        if path:
            return self.send(200, render(path), "text/html; charset=utf-8")
        if u.path == "/favicon.ico" and not os.path.exists(os.path.join(OUT, "favicon.ico")):
            return self.send(204, "", "image/x-icon")   # the site has none; no need to say so on every load
        super().do_GET()

    def do_POST(self):
        if not self.local():
            return
        port = self.server.server_address[1]
        origin = (self.headers.get("Origin") or "").lower()
        if self.path != "/__edit/api" or (origin and origin not in (f"http://127.0.0.1:{port}", f"http://localhost:{port}")):
            return self.send_error(403)
        size = int(self.headers.get("Content-Length") or 0)
        if size > 4 << 20:
            return self.send_error(413)
        try:
            req = json.loads(self.rfile.read(size) or b"{}")
        except ValueError:
            return self.send_error(400)
        if not isinstance(req, dict) or req.get("token") != TOKEN:
            return self.send(403, json.dumps({"error": "This page came from an earlier run of the editor, so it was reloaded.",
                                              "reload": True}), "application/json")
        code, reply = act(req)
        if req.get("op") not in ("rev", "open"):
            print(f"  {req.get('page')}: {reply.get('what') or reply.get('error')}", flush=True)
        self.send(code, json.dumps(reply), "application/json")


def taken(port):
    for host in ("127.0.0.1", "::1"):
        try:
            socket.create_connection((host, port), timeout=0.3).close()
            return True
        except OSError:
            pass
    return False


def serve(port, exact):
    print("building the site...", flush=True)
    if subprocess.run([sys.executable, os.path.join(HERE, "build.py")], cwd=ROOT).returncode:
        print("The build failed (above). The authored pages are still served from the source.", flush=True)
    while taken(port):
        if exact:
            sys.exit(f"port {port} is in use")
        port += 1
    httpd = Server(("127.0.0.1", port), Handler)
    print(f"\nThe page editor is at http://127.0.0.1:{port}/  (this computer only; Ctrl+C stops it)\n"
          "Open a game and click any paragraph. Each block is written to games/ as you leave it.\n", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


# --- the self-test ----------------------------------------------------------------
def selftest():
    """Every edit on every block of every authored page, in memory: tagging moves no byte; a
    block saved as it is changes nothing; a split and a join cancel out; a hidden block
    comes back byte for byte; a cut takes exactly its blocks; a section moved up and back
    is where it was; and after each edit every other block is where the renumbering says,
    start tag and all. The page the editor serves is the published page but for its tags,
    and a hidden section leaves the list of sections in the margin. Nothing is written."""
    fails = pages = tried = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "*.html"))):
        if os.path.basename(path) not in build.AUTHORED:
            continue
        name, src, pages = os.path.relpath(path, ROOT), read(path), pages + 1
        B, bad = blocks(src), []
        M = meta(src, B)
        start = lambda s, e: s[e["s"]:e["i"]]

        def lands(new, remap, keep):
            """Every block in keep is at its renumbered place in new, start tag and all."""
            B2 = blocks(new)
            return all(0 <= remapped(k, remap) < len(B2) and start(new, B2[remapped(k, remap)]) == start(src, B[k])
                       for k in keep)

        if re.sub(r' data-ge="\d+"', "", tag(src, B)) != src:
            bad.append("tagging moved a byte")
        if re.sub(r' data-ge="\d+"', "", assemble(path, tag(src, B))) != assemble(path, src):
            bad.append("the editor's page is not the published page but for its tags")
        listed = section_list(path, src).count("<li>")
        for e in B:   # hide each top-level section in turn: the list loses its entries, and goes below two
            up = e["parent"]
            while up is not None and up["tag"] != "section":
                up = up["parent"]
            if e["tag"] != "section" or up is not None or hidden(e):
                continue
            inner = src[e["i"]:e["ie"]]
            h2s = len(re.findall(r"<h2\b", inner))   # the first names the section; any other is an entry of its own
            gone = (1 if h2s or re.search(r'class="[^"]*\bfig\b', inner) else 0) + max(h2s - 1, 0)
            want = listed - gone if listed - gone >= 2 else 0
            at = e["i"] - 1 - (src[e["i"] - 2] == "/")
            shown = section_list(path, src[:at] + " data-cut hidden" + src[at:]).count("<li>")
            if shown != want:
                bad.append(f"line {e['line']}: with the section hidden the list has {shown} entries, not {want}")
        for n, e in enumerate(B):
            where, rest = f"line {e['line']}", [k for k in range(len(B)) if k != n]
            try:
                if M[n].get("edit"):
                    tried += 1
                    inner = src[e["i"]:e["ie"]]
                    if op_save(src, B, n, {"inner": inner})[0] != src:
                        bad.append(f"{where}: saving a block unchanged changed the page")
                    if e["tag"] in ("p", "li"):
                        two, x = op_split(src, B, n, {"parts": [inner, "x"]})
                        B2 = blocks(two)
                        if not lands(two, x["remap"], range(len(B))) or start(two, B2[n + 1]).replace(" ", "") != \
                                re.sub(r"""\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)""", "", start(src, e)).replace(" ", ""):
                            bad.append(f"{where}: a split put blocks in the wrong places")
                        if op_join(two, B2, n + 1, {"inner": inner})[0] != src:
                            bad.append(f"{where}: a split and a join did not cancel out")
                if M[n].get("cut"):
                    tried += 1
                    new, x = op_cut(src, B, n, {})
                    if x["mode"] == "hide":
                        if M[n]["cut"] != "hide" or not lands(new, [], rest):
                            bad.append(f"{where}: hiding moved other blocks")
                        if op_restore(new, blocks(new), n, {})[0] != src:
                            bad.append(f"{where}: hiding and restoring moved a byte")
                    else:
                        m = sum(1 for y in B[n:] if y["s"] < e["e"])
                        if not lands(new, x["remap"], [k for k in range(len(B)) if not n <= k < n + m]) or \
                                len(blocks(new)) != len(B) - m:
                            bad.append(f"{where}: a cut took the wrong blocks")
                if e["tag"] == "section":
                    try:
                        up, x = op_move(src, B, n, {"dir": -1})
                    except Refused:
                        continue
                    tried += 1
                    if not lands(up, x["remap"], range(len(B))):
                        bad.append(f"{where}: a move put blocks in the wrong places")
                    a0 = x["pair"][0]
                    kids = [k for k in e["parent"]["kids"] if "e" in k]
                    if kids[next(j for j, k in enumerate(kids) if k is e) - 1] is B[a0]:   # neighbours: moving back undoes it
                        back, _ = op_move(up, blocks(up), remapped(a0, x["remap"]), {"dir": -1})
                        if back != src:
                            bad.append(f"{where}: moving a section up and back moved a byte")
            except Refused as r:
                bad.append(f"{where}: refused: {r}")
        for b in bad:
            print(f"  x  {name}: {b}")
        fails += len(bad)
        if not bad:
            print(f"  ok {name}: {len(B)} blocks, {sum(1 for m in M if m.get('edit'))} editable, "
                  f"{sum(1 for m in M if m.get('cut'))} can go")
    print(f"\n{'FAILED - ' + str(fails) + ' problem(s)' if fails else 'OK'}: {tried} edits tried on {pages} pages")
    return 1 if fails else 0


def main():
    argv = sys.argv[1:]
    if argv and argv[0] in ("-h", "--help"):
        print(__doc__)
        return
    if "--test" in argv:
        sys.exit(selftest())
    exact = "--port" in argv
    port = int(argv[argv.index("--port") + 1]) if exact else int(os.environ.get("PORT") or 8000)
    serve(port, exact)


if __name__ == "__main__":
    main()
