#!/usr/bin/env python3
"""Keep knowledge in its place.

  AGENTS.md          agent rules only: no platform or game subject matter
  kit/skills/core/       workflow only: no game names
  kit/skills/<platform>/ platform facts only: no game names
  games/*/*/facts.md, features.md   current truth, no narration of past mistakes; what the
                     game itself prints may be quoted as it appears (`...`, "...", or in capitals)
  games/*/*/*.md     the template's notes and no others: a check's result goes in facts.md,
                     its working record in work/ (kit/skills/core/60-verify)
  games/*/*/kit-feedback.md   the skill text that changed what the run did, named in the
                     form skill_usage.py counts, or "None." (kit/skills/core/80-retro, step 1)
  kit/lessons/       one entry a file, under one heading that names the game that taught it
  games/, kit/, site/, AGENTS.md, README.md   no path on the contributor's computer:
                     a home folder usually names a person, and helps nobody else
  games/*/*/game.json   Silver or above only on proven models, or checked (models.py)
  games/*/*/kit-feedback.md   each maintainer ask filed (#123) or fileable (maintainer_asks.py)
  games/*/*/*.html   no class of the page's own that site/lib/site.css also styles: the build
                     links site.css after the page's <style>, so its rules land too (#143)

Usage: check_docs.py      exit 1 on failure
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SUBJECT = [r"\$[0-9A-Fa-f]{4}\b", r"\bSID\b", r"\bVIC-?II\b", r"\b6502\b", r"\bcharset\b",
           r"\bsprites?\b", r"\bscreen RAM\b", r"\bzero page\b"]
NARRATION = [r"\bcorrect(ed|ion)\b", r"\bretract", r"\bmislabell?ed\b", r"\bmisread\b",
             r"\bwe (previously|originally|earlier|first)\b",
             r"\b(earlier|previous|first) (guess|assumption|annotation|reading)\b",
             r"\bturned out to be wrong\b", r"\bwas wrong\b", r"\bwritten off as\b",
             r"\bfound and fixed\b", r"\bused to (say|be labelled)\b"]
EXEMPT = re.compile(r"^\s*\|.*(kit/|skills/|games/)")
# Text the game prints, quoted as it appears, is not narration: Impossible Mission's
# "ORIENTATION CORRECTED" (#145). Backticks, double quotes, and words in capitals are blanked
# before NARRATION is matched, so the rest of the line is still read.
GAME_TEXT = re.compile(r"`[^`\n]*`|\"[^\"\n]*\"|\u201c[^\u201d\n]*\u201d|\b[A-Z]{2,}(?:[ '-]+[A-Z]{2,})*\b")
HOME = [r"(?<![\w.-])/(Users|home)/[^/\s\"'<>`]+", r"\b[A-Z]:[\\/]Users[\\/]"]   # macOS, Linux, Windows
SITE_CSS = os.path.join(ROOT, "site", "lib", "site.css")
TEMPLATE_PAGE = os.path.join(ROOT, "kit", "template", "index.html")
CLASS = re.compile(r"\.(-?[A-Za-z_][\w-]*)")


def css_rules(text, page=False):
    """(line, selector, {property: value}) for each rule of a stylesheet, or of a page's
    <style> blocks. A rule inside @media is read as one of its own."""
    blank = lambda s: re.sub(r"[^\n]", " ", s)   # line numbers stay where they were
    if page:
        kept, at = [], 0
        for m in re.finditer(r"(?is)<style\b[^>]*>(.*?)</style>", text):
            kept += [blank(text[at:m.start(1)]), m.group(1)]
            at = m.end(1)
        text = "".join(kept)
    text = re.sub(r"(?s)/\*.*?\*/", lambda q: blank(q.group(0)), text)
    for m in re.finditer(r"([^{};]*)\{([^{}]*)\}", text):   # innermost blocks: @media opens up
        sel = m.group(1).strip()
        if not sel or sel.startswith("@"):
            continue
        line = text.count("\n", 0, m.start(1) + len(m.group(1)) - len(m.group(1).lstrip())) + 1
        decls = dict((k.strip().lower(), " ".join(v.split())) for k, v in
                     (d.split(":", 1) for d in m.group(2).split(";") if ":" in d))
        yield line, sel, decls


def compounds(sel):
    """Each selector of a list as (its ancestors, the classes of its subject, its text)."""
    for s in sel.split(","):
        parts = re.split(r"\s*[\s>+~]\s*", s.strip())
        subject = re.sub(r":[\w-]+\((?:[^()]|\([^()]*\))*\)|\[[^\]]*\]", "", parts[-1])
        yield parts[:-1], set(CLASS.findall(subject)), " ".join(parts)


def page_styles(page):
    """The page's own styles: its <style> blocks, and each stylesheet of its own it links
    (reference/<slug>-page.css, shared by a game's pages), as (path, line, selector, rules)."""
    html = open(page, encoding="utf-8", errors="replace").read()
    for line, sel, decls in css_rules(html, page=True):
        yield page, line, sel, decls
    for tag in re.findall(r"<link\b[^>]*>", html):
        href = re.search(r'\bhref="([^"?#]+\.css)', tag)
        if "stylesheet" in tag and href and not re.match(r"[a-z]+:|/|\{|(.*/)?site\.css$", href.group(1)):
            sheet = os.path.normpath(os.path.join(os.path.dirname(page), href.group(1)))
            if os.path.isfile(sheet):
                for line, sel, decls in css_rules(open(sheet, encoding="utf-8").read()):
                    yield sheet, line, sel, decls


def class_collisions(site_css=SITE_CSS, template=TEMPLATE_PAGE, pages=None):
    """A class a game page styles as its own that site.css also styles. The build links site.css
    after the page's styles, so its rules apply as well, in the built site only: Delta's stage
    picker, .strip, collapsed under the catalogue's 8px strip (#143). The template's classes are
    the shared vocabulary, and a site rule the page carries word for word, so that it opens
    from disk, is a copy and not a collision."""
    site = [(line, cls, text, decls)
            for line, sel, decls in css_rules(open(site_css, encoding="utf-8").read())
            for anc, cls, text in compounds(sel)
            if cls and not any(re.search(r"[.#\[]", a) for a in anc)]   # not scoped to a site part
    tpl = open(template, encoding="utf-8").read()
    shared = set(CLASS.findall(" ".join(sel for _, sel, _ in css_rules(tpl, page=True))))
    shared |= set(" ".join(re.findall(r'class="([^"]*)"', tpl)).split())
    if pages is None:
        pages = sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "*.html")))
    bad, told = 0, set()
    for f in pages:
        own, carried = {}, {}
        for path, line, sel, decls in page_styles(f):
            for _, cls, text in compounds(sel):
                for c in cls:
                    own.setdefault(c, (path, line))
                carried.setdefault(text, {}).update(decls)
        for line, cls, text, decls in site:
            mine = tuple(sorted(cls - shared))
            if cls <= own.keys() and mine and not decls.items() <= carried.get(text, {}).items():
                path, at = own[mine[0]]
                if (path, mine) in told:   # a stylesheet several pages link is told of once
                    continue
                told.add((path, mine))
                print(f"  x  {os.path.relpath(path, ROOT)}:{at}  {', '.join('.' + c for c in mine)} is a class of the"
                      f" page's own, and site.css styles it too ({os.path.relpath(site_css, ROOT)}:{line})")
                print("        the built page gets both rules: give the page's class a name of its own (#143)")
                bad += 1
    return bad


def scan(path, patterns, label, exempt=None, blank=None):
    bad = 0
    with open(path, encoding="utf-8", errors="replace") as fh:
        lines = list(fh)
    for n, line in enumerate(lines, 1):
        if exempt and exempt.match(line):
            continue
        text = blank.sub(lambda q: " " * len(q.group(0)), line) if blank else line
        for p in patterns:
            m = re.search(p, text, re.I)
            if m:
                print(f"  x  {os.path.relpath(path, ROOT)}:{n}  {label}: {m.group(0)!r}")
                print(f"        {line.strip()[:88]}")
                bad += 1
                break
    return bad


def main():
    fails = 0
    fails += scan(os.path.join(ROOT, "AGENTS.md"), SUBJECT, "subject matter in the rules file", EXEMPT)
    titles = []
    for gj in glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json")):
        try:
            t = json.load(open(gj)).get("title")
            if t and len(t) > 3:
                titles.append(r"\b" + re.escape(t) + r"\b")
        except Exception:
            pass
    if titles:
        for sk in glob.glob(os.path.join(ROOT, "kit", "skills", "*", "*", "*.md")):
            fails += scan(sk, titles, "a specific game named in a reusable skill")
        for f in sorted(glob.glob(os.path.join(ROOT, "kit", "lessons", "*.md"))):
            if os.path.basename(f) == "README.md":
                continue
            rel = os.path.relpath(f, ROOT)
            lines = open(f, encoding="utf-8").read().splitlines()
            heads = [ln for ln in lines if ln.startswith("## ")]
            if len(heads) != 1 or not re.match(r"## (next|\d+\.\d+\.\d+) · ", lines[0] if lines else ""):
                print(f"  x  {rel}  a lesson file is one entry: its first line, and its only '## ' line, is")
                print(f"        ## next · <date> · <game> · <who>   (the kit-version workflow numbers 'next')")
                fails += 1
            elif not any(re.search(t, heads[0]) for t in titles):
                print(f"  x  {rel}  a lesson that names no game: every lesson comes from one")
                print(f"        {heads[0].strip()[:88]}")
                fails += 1
    if os.path.exists(os.path.join(ROOT, "kit", "CHANGELOG.md")):
        print("  x  kit/CHANGELOG.md  lessons are one file each in kit/lessons/, so pull requests never")
        print("        conflict over them: python3 kit/scripts/changelog_to_lessons.py moves this branch's")
        fails += 1
    for f in glob.glob(os.path.join(ROOT, "games", "*", "*", "facts.md")) + \
             glob.glob(os.path.join(ROOT, "games", "*", "*", "features.md")):
        fails += scan(f, NARRATION, "narrating a past mistake (belongs in agent-history.md)", blank=GAME_TEXT)
    fails += class_collisions()
    notes = sorted(os.path.basename(f) for f in glob.glob(os.path.join(ROOT, "kit", "template", "*.md")))
    for f in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "*.md"))):
        if os.path.basename(f) not in notes:
            print(f"  x  {os.path.relpath(f, ROOT)}  a game folder's notes are the template's: {', '.join(notes)}.")
            print(f"        A check's result goes in facts.md, its working record in work/ (kit/skills/core/60-verify)")
            fails += 1
    published = [os.path.join(ROOT, f) for f in ("AGENTS.md", "README.md")]
    for top in ("games", "kit", "site"):
        for d, dirs, files in os.walk(os.path.join(ROOT, top)):
            dirs[:] = [x for x in dirs if x != "work"]   # gitignored, but for its README
            published += [os.path.join(d, f) for f in files if f.endswith((".md", ".json", ".html", ".js", ".css"))]
        published += glob.glob(os.path.join(ROOT, top, "*", "*", "work", "README.md"))
    for f in sorted(set(published)):
        fails += scan(f, HOME, "a path on the contributor's computer (name where it can be had instead)")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from skill_usage import parse as named_skill_text
    for f in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "kit-feedback.md"))):
        for n, msg in named_skill_text(f)["problems"]:   # the words themselves: skill_usage.py --game
            print(f"  x  {os.path.relpath(f, ROOT)}:{n}  skill text that changed what I did: {msg}")
            fails += 1
    from models import check as models_check
    fails += models_check()
    from maintainer_asks import check as asks_check
    fails += asks_check(sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "kit-feedback.md"))))
    if fails:
        print(f"\nFAILED - {fails} issue(s). Rules in AGENTS.md; workflow in kit/skills/core; platform in kit/skills/<platform>; game facts in games/.")
        sys.exit(1)
    print("OK - knowledge is where it belongs")


if __name__ == "__main__":
    main()
