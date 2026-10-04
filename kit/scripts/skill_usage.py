#!/usr/bin/env python3
"""Count the skill text that runs say changed what they did.

The retrospective (kit/skills/core/80-retro, step 1) names, in the game's kit-feedback.md
under "Skill text that changed what I did", up to five passages that changed what the
run did, or "None.":

  - `50-coverage`: "Resolve every pointer table before excluding a region": two tables
    pointed into the block I was about to exclude, and it held the shape scripts.

The words are copied from the skill, so they find their section however the skill has
been re-wrapped since.

Usage:
  skill_usage.py                   each section of every skill: its lines, and the games
                                   that named text in it; named text no longer found
  skill_usage.py --game <dir>...   check those games' lines: the format, the skill and
                                   the words; exit 1 on a problem
  skill_usage.py --stopgaps [<n>]  passages marked <!-- until #n -->, all or issue n's:
                                   words standing in for a fix, deleted when it lands
  skill_usage.py --test            self-test on a made-up kit, writing nothing here
No dependencies.
"""
import bisect, glob, os, re, shutil, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HEADING = "## Skill text that changed what I did"
PLACEHOLDER = "<up to five lines"
MAX_ITEMS, MIN_WORDS, MIN_EFFECT = 5, 4, 3
ITEM = re.compile(r'^[-*]\s+`?([^`:"“]+?)`?\s*:\s*["“](.+?)["”]\s*[:.,;—–-]*\s*(.*)$')
NONE = re.compile(r"^([-*]\s+)?none\.?$", re.I)
BULLET = re.compile(r"^\s*([-*]|\d+\.)\s")
STOPGAP = re.compile(r"<!--\s*until\s+#(\d+)\s*-->")
FORMAT = 'write it as  - `<skill>`: "<words copied from the skill>": what it changed'


# --- kit-feedback.md --------------------------------------------------------------

def parse(path):
    """The game's named skill text: {present, placeholder, none, items: [(line, skill,
    words, effect)], problems: [(line, message)]}. Format only; check() finds the words."""
    r = {"present": False, "placeholder": False, "none": False, "items": [], "problems": []}
    lines = open(path, encoding="utf-8").read().splitlines()
    start = next((i for i, ln in enumerate(lines) if ln.strip().lower() == HEADING.lower()), None)
    if start is None:
        return r
    r["present"] = True
    raw = []                                   # (line number, text), continuations joined
    for n in range(start + 1, len(lines)):
        ln = lines[n]
        if ln.startswith("#"):
            break
        if not ln.strip():
            continue
        if PLACEHOLDER in ln:
            r["placeholder"] = True
        if raw and ln[:1].isspace() and not BULLET.match(ln):
            raw[-1] = (raw[-1][0], raw[-1][1] + " " + ln.strip())
        else:
            raw.append((n + 1, ln.strip()))
    if r["placeholder"]:
        r["problems"].append((start + 1, "the template's placeholder is still there: name up to five "
                              "passages, or write None. (80-retro, step 1)"))
        return r
    for n, text in raw:
        if NONE.match(text):
            r["none"] = True
            continue
        m = ITEM.match(text)
        if not m:
            r["problems"].append((n, FORMAT))
            continue
        skill, words, effect = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        if len(words.split()) < MIN_WORDS:
            r["problems"].append((n, f"copy {MIN_WORDS} words or more from the passage, so they find one place"))
        elif len(effect.split()) < MIN_EFFECT:
            r["problems"].append((n, "say what you did, or did not do, because of it"))
        else:
            r["items"].append((n, skill, words, effect))
    if not r["items"] and not r["none"] and not r["problems"]:
        r["problems"].append((start + 1, "empty: name up to five passages, or write None."))
    if r["none"] and r["items"]:
        r["problems"].append((start + 1, "None. and passages both: keep one"))
    if len(r["items"]) > MAX_ITEMS:
        r["problems"].append((start + 1, f"{MAX_ITEMS} at most, the one that mattered most first"))
    return r


# --- the skills -------------------------------------------------------------------

def norm(s):
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return re.sub(r"\s+", " ", re.sub(r"[*`]", "", s)).strip().lower()


class Doc:
    """One skill file: its sections and its text normalised for finding copied words."""

    def __init__(self, rel, text):
        self.rel, self.lines = rel, text.splitlines()
        self.heads = []                        # (line index, heading)
        fence = False
        for i, ln in enumerate(self.lines):
            if ln.startswith("```"):
                fence = not fence
            elif not fence and re.match(r"#{1,3} ", ln):
                self.heads.append((i, ln.lstrip("#").strip()))
        self.flat, self.starts = "", []
        for ln in self.lines:
            self.starts.append(len(self.flat))
            self.flat += norm(ln) + " "

    def section(self, i):
        at = bisect.bisect_right([h for h, _ in self.heads], i) - 1
        return self.heads[at][1] if at >= 0 else "(top)"

    def sizes(self):
        """{section: non-blank lines}, the heading's own line included."""
        out = {}
        for i, ln in enumerate(self.lines):
            if ln.strip():
                s = self.section(i)
                out[s] = out.get(s, 0) + 1
        return out

    def find(self, words):
        k = self.flat.find(norm(words))
        return None if k < 0 else self.section(bisect.bisect_right(self.starts, k) - 1)


def index(files):
    """{skill folder: [Doc]} from {path relative to the root: text}."""
    out = {}
    for rel, text in sorted(files.items()):
        parts = rel.split("/")
        if len(parts) == 5 and parts[:2] == ["kit", "skills"] and rel.endswith(".md"):
            out.setdefault(parts[3], []).append(Doc(rel, text))
    return out


def on_disk(root):
    files = {}
    for p in glob.glob(os.path.join(root, "kit", "skills", "*", "*", "*.md")):
        files[os.path.relpath(p, root).replace(os.sep, "/")] = open(p, encoding="utf-8").read()
    return index(files)


def skill_of(raw, idx):
    """The skill folder a line names, written as the folder or as any path through it."""
    for part in reversed(raw.strip().strip("/").split("/")):
        if part.strip() in idx:
            return part.strip()
    return None


def resolve(idx, raw, words):
    """(skill file, section) holding the words, or None."""
    skill = skill_of(raw, idx)
    for doc in idx.get(skill, []):
        s = doc.find(words)
        if s:
            return doc.rel, s
    return None


def check(gdir, idx, root):
    """Every problem with a game's named skill text: format, skill and words."""
    kf = os.path.join(gdir, "kit-feedback.md")
    rel = os.path.relpath(kf, root)
    if not os.path.isfile(kf):
        return [f"{rel}: no kit-feedback.md"]
    r = parse(kf)
    if not r["present"]:
        return [f"{rel}: no section '{HEADING}' (80-retro, step 1)"]
    out = [f"{rel}:{n}  {msg}" for n, msg in r["problems"]]
    for n, raw, words, _ in r["items"]:
        if not skill_of(raw, idx):
            out.append(f"{rel}:{n}  no skill folder named {raw!r} under kit/skills/: use the folder's name")
        elif not resolve(idx, raw, words):
            out.append(f"{rel}:{n}  the words are not in {skill_of(raw, idx)}: copy them exactly, from one "
                       f"paragraph or bullet: \"{words}\"")
    return out


def named(root):
    """[(game slug, parse result)] for every game whose section is filled in."""
    out = []
    for kf in sorted(glob.glob(os.path.join(root, "games", "*", "*", "kit-feedback.md"))):
        r = parse(kf)
        if r["present"] and not r["placeholder"]:
            out.append((os.path.basename(os.path.dirname(kf)), r))
    return out


# --- reports ----------------------------------------------------------------------

def tally(root=ROOT, out=print):
    idx, games = on_disk(root), named(root)
    total = len(glob.glob(os.path.join(root, "games", "*", "*", "kit-feedback.md")))
    out(f"Skill text that changed what a run did: {len(games)} of {total} games have said "
        f"(kit-feedback.md, \"{HEADING[3:]}\").")
    if not games:
        out("No game has named any yet: the first retrospective to do so starts the count.")
        return {}, []
    hits, gone = {}, []                        # a game counts once in a section, and for five at most
    for slug, r in games:
        for _, raw, words, _ in r["items"][:MAX_ITEMS]:
            where = resolve(idx, raw, words)
            if where:
                hits.setdefault(where, set()).add(slug)
            else:
                gone.append((slug, raw, words))
    nones = sum(1 for _, r in games if r["none"])
    if nones:
        out(f"{nones} of them named none.")
    for skill in sorted(idx):
        for doc in idx[skill]:
            out(f"\n{doc.rel[len('kit/skills/'):]}")
            for sec, size in doc.sizes().items():
                who = sorted(hits.get((doc.rel, sec), ()))
                out(f"  {size:4d} lines  {len(who):3d}  {sec[:52]:52}  {', '.join(who)}")
    if gone:
        out("\nNamed text no longer in its skill (edited or cut since):")
        for slug, raw, words in gone:
            out(f"  {slug}: {raw} \"{words}\"")
    return hits, gone


def passage(lines, i):
    """Index of the first line of the paragraph or bullet that holds line i."""
    k = i
    while k > 0 and lines[k - 1].strip() and not BULLET.match(lines[k]):
        k -= 1
    return k


def stopgaps(n=None, root=ROOT, out=print):
    found = []
    paths = sorted(glob.glob(os.path.join(root, "kit", "**", "*.md"), recursive=True))
    for p in paths + [os.path.join(root, "AGENTS.md")]:
        rel = os.path.relpath(p, root).replace(os.sep, "/")
        if rel.startswith("kit/template/") or not os.path.isfile(p):
            continue
        lines = open(p, encoding="utf-8").read().splitlines()
        for i, ln in enumerate(lines):
            for m in STOPGAP.finditer(ln):
                if n is None or int(m.group(1)) == n:
                    k = passage(lines, i)
                    text = STOPGAP.sub("", lines[k]).strip() or ln.strip()
                    found.append((rel, k + 1, i + 1, int(m.group(1)), text))
    for rel, a, b, num, text in found:
        out(f"{rel}:{a}-{b}  #{num}  {text[:90]}")
    return found


# --- self-test --------------------------------------------------------------------

def selftest():
    fails = []

    def ok(name, cond, detail=""):
        print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not cond else ""))
        if not cond:
            fails.append(name)

    root = tempfile.mkdtemp()
    try:
        def put(rel, text):
            p = os.path.join(root, rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w", encoding="utf-8").write(text)

        put("kit/skills/core/10-demo/SKILL.md", "---\nname: 10-demo\n---\n\n# Demo\n\nIntro line.\n\n"
            "## Rules\n\n- **Resolve every pointer table before excluding a region.** A relocating\n"
            "  init can leave a block.\n- **Never bulk-disassemble every labelled address** to recover.\n\n"
            "## Other\n\nSome `code` words here that wrap\nacross two lines.\n\n```\n# not a heading\n```\n\n"
            "- A stopgap bullet that waits\n  on a fix. <!-- until #146 -->\n")
        put("kit/skills/core/10-demo/side.md", "# Side\n\n## Rare case\n\nOnly some games need this text.\n")
        put("kit/skills/c64/demo-ref/SKILL.md", "# Ref\n\n## Memory map\n\nThe map is here.\n")
        head = "# G — kit feedback\n\n" + HEADING + "\n\n"
        put("games/c64/a/kit-feedback.md", head +
            '- `10-demo`: "Resolve every pointer table before excluding": kept two tables in.\n'
            '- `kit/skills/core/10-demo/SKILL.md`: “some CODE words here that wrap across two lines”: '
            'wrapped words found\n  on a second line.\n'
            '- `demo-ref`: "words that are nowhere in it": nothing came of it.\n'
            '- `10-demo`: "only some games need this": the side file is searched too.\n\n## Next\n')
        put("games/c64/b/kit-feedback.md", head + "None.\n")
        put("games/c64/c/kit-feedback.md", head + "<up to five lines, the one that mattered most first>\n")
        put("games/c64/d/kit-feedback.md", "# D\n\n## What was changed in the kit\n\nNothing.\n")
        put("games/c64/e/kit-feedback.md", head + "- 10-demo resolve every pointer table\n"
            '- `10-demo`: "two words": the words are too few here.\n'
            + "".join(f'- `10-demo`: "Resolve every pointer table before excluding": item {i} of six.\n'
                      for i in range(6)))
        g = lambda s: parse(os.path.join(root, "games", "c64", s, "kit-feedback.md"))
        a, b, c, d, e = g("a"), g("b"), g("c"), g("d"), g("e")
        ok("four passages read, a continuation line joined", len(a["items"]) == 4 and not a["problems"]
           and a["items"][1][3].endswith("on a second line."), a)
        ok("None. is an answer", b["none"] and not b["items"] and not b["problems"], b)
        ok("the template's placeholder is a problem", c["placeholder"] and c["problems"], c)
        ok("no section, no problem", not d["present"] and not d["problems"], d)
        msgs = " | ".join(m for _, m in e["problems"])
        ok("a line without quotes is a problem", FORMAT in msgs, msgs)
        ok("too few words is a problem", "words or more" in msgs, msgs)
        ok("six passages is too many", "at most" in msgs, msgs)
        idx = on_disk(root)
        ok("skills indexed by folder, side files included",
           sorted(idx) == ["10-demo", "demo-ref"] and len(idx["10-demo"]) == 2, sorted(idx))
        ok("words found across a wrap, through code and emphasis marks, in any case",
           resolve(idx, "kit/skills/core/10-demo/SKILL.md", "some CODE words here that wrap across two lines")
           == ("kit/skills/core/10-demo/SKILL.md", "Other"))
        ok("a heading inside a code fence is not a section",
           idx["10-demo"][0].section(len(idx["10-demo"][0].lines) - 1) == "Other")
        probs = check(os.path.join(root, "games", "c64", "a"), idx, root)
        ok("check finds the one passage whose words are not in its skill",
           len(probs) == 1 and "not in demo-ref" in probs[0], probs)
        lines = []
        hits, gone = tally(root, out=lines.append)
        ok("the count credits each section with its games, each game once",
           hits.get(("kit/skills/core/10-demo/SKILL.md", "Rules")) == {"a", "e"}
           and hits.get(("kit/skills/core/10-demo/side.md", "Rare case")) == {"a"}, hits)
        ok("named text no longer in its skill is listed",
           [w for _, _, w in gone] == ["words that are nowhere in it"] and any("nowhere in it" in ln for ln in lines),
           gone)
        ok("three of the five games have said", lines[0].startswith("Skill text that changed what a run did: 3 of 5"),
           lines[0])
        gaps = stopgaps(root=root, out=lambda s: None)
        ok("a stopgap marker is found, from the start of its bullet",
           len(gaps) == 1 and gaps[0][3] == 146 and gaps[0][4].startswith("- A stopgap bullet"), gaps)
        ok("stopgaps for another issue are left out", stopgaps(147, root=root, out=lambda s: None) == [])
    finally:
        shutil.rmtree(root)
    print(f"\n{'FAILED: ' + ', '.join(fails) if fails else 'OK'}")
    return not fails


def main():
    a = sys.argv[1:]
    if not a:
        tally()
    elif a[0] in ("-h", "--help"):
        print(__doc__)
    elif a[0] == "--test":
        sys.exit(0 if selftest() else 1)
    elif a[0] == "--game":
        if len(a) < 2:
            sys.exit("--game needs one or more game folders")
        idx, probs = on_disk(ROOT), []
        for gdir in a[1:]:
            probs += check(os.path.abspath(gdir), idx, ROOT)
        for p in probs:
            print(f"  x  {p}")
        if probs:
            sys.exit(f"\n{len(probs)} problem(s) with the named skill text. kit/skills/core/80-retro, step 1.")
        print("OK - every passage named is found in its skill")
    elif a[0] == "--stopgaps":
        stopgaps(int(a[1].lstrip("#")) if len(a) > 1 else None)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
