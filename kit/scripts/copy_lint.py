#!/usr/bin/env python3
"""List the sentences on a game's authored pages that break a house-style rule a pattern can catch.

The copy step (kit/skills/core/70-minisite, "Copy") runs this between the draft and the edit, and
fixes each line it prints or keeps it for a reason it can say. The rules are in kit/style.md:

  dash           a dash joining two clauses (an em-dash, or a hyphen or en-dash with spaces round it)
  announcer      a sentence that announces the next one ("Here's the odd part", "It turns out")
  imperative     an instruction to the reader that is not a control ("Notice", "Listen to", "Imagine")
  contrast       "it's not X, it's Y", "not just", "more than just", "not only ... but"
  no-x           "no X" or "nothing" standing in for a thing: as the one acting ("no gate leads to
                 it", "nothing reads it"), behind "by" ("an exit found by no player") or "belongs to"
  hype           a hype word (elegant, clever, fascinating, remarkable, brilliant, ...)

A heading is checked whole. Whether a heading is an inventory or a telegram (kit/style.md,
"Section headings"), and whether a sentence is compressed (kit/style.md, "Sentences"), needs a
reader, and the edit pass reads for both. Length is not checked: on the pages it was tried on, a
long sentence was as often clear as not, and the hard ones were as often short.

It reads the text a reader sees in the page's HTML: not scripts, styles or code blocks, not the
game's own words (<blockquote>, <q>, any element marked data-copy-lint="off", text in quotation
marks, capitals-only lines, and a line that ends with a space before its "?" or "!", as many
games print them), and not the strings a widget writes from script, which the edit
reads by eye. It prints file:line, the rule and the sentence, and a count for each rule. It exits 0
whatever it finds, so a run can keep a line it has a reason for; --strict exits 1 on any finding.

  python3 kit/scripts/copy_lint.py games/<platform>/<slug> [--page index.html ...] [--strict]
"""
import argparse
import html.parser
import re
import sys
from pathlib import Path

SKIP = {"script", "style", "pre", "svg", "math", "blockquote", "q", "template", "noscript", "head", "title"}
INLINE_CODE = {"code", "kbd", "samp", "var"}
BLOCK = {"p", "li", "td", "th", "dt", "dd", "figcaption", "caption", "h1", "h2", "h3", "h4", "h5", "h6",
         "div", "section", "article", "header", "footer", "aside", "ul", "ol", "table", "tr", "figure",
         "details", "summary", "label", "button", "option", "br", "hr", "nav", "main", "dl"}
HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
VOID = {"br", "hr", "img", "input", "meta", "link", "source", "wbr", "area", "base", "col", "embed", "track"}

HYPE = ("elegant", "elegantly", "clever", "cleverly", "fascinating", "remarkable", "remarkably", "brilliant",
        "brilliantly", "masterful", "masterfully", "beautiful", "beautifully", "ingenious", "ingeniously")

# Verbs that make "no X" or "nothing" the one acting; the first line reads naturally after "nothing"
# ("nothing happens") and is checked only after "no X".
ACTS = (r"gets?|changes?|appears?|happens?|stops?|moves?|"
        r"leads?|reach(?:es)?|reads?|tells?|uses?|plays?|knows?|sees?|draws?|calls?|selects?|points?|sets?|starts?"
        r"|writes?|clears?|loads?|checks?|kills?|names?|mentions?|refers?|finds?|asks?|jumps?|shows?")
ACTS_ON = ACTS.split("|", 6)[6]

RULES = [
    ("dash", re.compile(r"—|[A-Za-z]\s+[–-]\s+[A-Za-z]")),
    ("announcer", re.compile(
        r"^(?:and\s+|but\s+|so\s+)?(?:here(?:'s|’s| is| are)\s+(?:the|where|what|how|why|a)\b"
        r"|(?:as\s+)?it\s+turns\s+out\b|let(?:'s|’s)\b|let\s+us\b"
        r"|the\s+(?:odd|interesting|clever|surprising|strange|curious|tricky|real|best|fun)\s+(?:part|thing|bit)\s+is\b"
        r"|(?:in\s+other\s+words|put\s+simply|simply\s+put|spoiler\s+alert|buckle\s+up)\b)",
        re.I)),
    ("imperative", re.compile(
        r"^(?!(?-i:[A-Z]{2,})\b)(?:notice|note\s+(?:that|how)|listen\s+(?:to|for)|look\s+(?:at|closely|again)|imagine|consider"
        r"|remember|watch\s+(?:how|what|as|the|for))\b(?!['’])\W*\w+\W+\w+", re.I)),
    ("contrast", re.compile(
        r"\b(it|this|that|they)(?:'s|’s|\s+is|\s+are|\s+was|\s+were)\s*n(?:o|'|’)t\b[^.;]{1,60}?[,;:—]\s*"
        r"\1(?:'s|’s|\s+is|\s+are|\s+was|\s+were)\b"
        r"|\b(it|this|that)\s+isn(?:'|’)t\b[^.;]{1,60}?[,;:—]\s*\2(?:'s|’s|\s+is)\b"
        r"|(?<!has )(?<!have )(?<!had )\bnot\s+just\b|\bmore\s+than\s+just\b|\bnot\s+(?:only|merely)\b[^.]{1,80}\bbut\b",
        re.I)),
    ("no-x", re.compile(
        r"(?:^|[.;:,]\s+|\b(?:and|but|so|because|since|when|where|that|which)\s+)(?<!there is )(?<!there are )"
        r"(?<!there was )(?<!there were )(?:no\s+(?!longer\b|more\b|matter\b|doubt\b|way\b)[a-z][\w-]*(?:\s+(?!(?:to|in|on|at|for|of|from|with|by|during|after|before)\b)[a-z][\w-]*)?\s+"
        r"(?:is|are|was|were|can|could|will|would|does|did|has|have|ever|" + ACTS + r")"
        r"|(?:nothing|nobody|no\s+one)\s+(?:ever\s+|else\s+)?(?:" + ACTS_ON + r"))\b"
        r"|\bby\s+(?:no\s+(?!means\b|chance\b|accident\b)[a-z][\w-]*|nothing|nobody|no\s+one|none)\b"
        r"|\bbelong(?:s|ed|ing)?\s+to\s+(?:no\s+[a-z][\w-]*|nothing|nobody|no\s+one|none)\b",
        re.I)),
    ("hype", re.compile(r"\b(?:" + "|".join(HYPE) + r")\b", re.I)),
]


ABBREV = re.compile(r"\b(?:e\.g|i\.e|etc|vs|cf|Mr|Mrs|Ms|Dr|St|No|approx|fig|vol|ed)\.$", re.I)


class Text(html.parser.HTMLParser):
    """Collect each block of visible text with the line it starts on and whether it is a heading."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.parts = []
        self.start = None
        self.skip_tag = None
        self.skip_depth = 0
        self.heading = 0
        self.code = 0

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.parts)).strip()
        if text:
            self.blocks.append((self.start, text, self.heading > 0))
        self.parts, self.start = [], None

    def handle_starttag(self, tag, attrs):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        if (tag in SKIP or dict(attrs).get("data-copy-lint") == "off") and tag not in VOID:
            self.flush()
            self.skip_tag, self.skip_depth = tag, 1
            return
        if tag in BLOCK:
            self.flush()
        if tag in HEADINGS:
            self.heading += 1
        if tag in INLINE_CODE:
            if self.code == 0:
                self.add("[code]")
            self.code += 1

    def handle_endtag(self, tag):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth == 0:
                    self.skip_tag = None
            return
        if tag in INLINE_CODE and self.code:
            self.code -= 1
        if tag in BLOCK:
            self.flush()
        if tag in HEADINGS and self.heading:
            self.heading -= 1

    def add(self, data):
        if self.start is None:
            self.start = self.getpos()[0]
        self.parts.append(data)

    def handle_data(self, data):
        if self.skip_tag or self.code:
            return
        if data.strip() or self.parts:
            self.add(data)


def sentences(text):
    """Split a block into sentences, keeping abbreviations and addresses whole."""
    out, cur = [], ""
    for piece in re.split(r"(?<=[.!?])\s+(?=[\"“‘(\[A-Z0-9$])", text):
        cur = f"{cur} {piece}".strip() if cur else piece
        if ABBREV.search(cur):
            continue
        out.append(cur)
        cur = ""
    if cur:
        out.append(cur)
    return out


QUOTED = re.compile(r"\"[^\"]*\"|\u201c[^\u201d]*\u201d")


def game_words(s):
    """True for a line in the game's own capitals, which the page quotes and the style does not govern."""
    letters = [c for c in s if c.isalpha()]
    return len(letters) >= 4 and sum(c.isupper() for c in letters) / len(letters) > 0.7


def own_words(s):
    """The sentence with quoted text taken out, including a quotation the sentence split cut in two."""
    own = QUOTED.sub('""', s)
    if "\u201d" in own:
        own = own[own.rindex("\u201d") + 1:]
    if "\u201c" in own:
        own = own[:own.index("\u201c")]
    if own.count('"') % 2:
        i = own.rindex('"') if own.count('"') == 1 else own.index('"')
        closing = i + 1 == len(own) or not own[i + 1].isalnum()
        own = own[i + 1:] if closing else own[:i]
    return own


def check_sentence(s):
    if game_words(s) or re.search(r"\w\s[?!]$", s.rstrip()):
        return []
    own = own_words(s)
    found = [name for name, rx in RULES if rx.search(own)]
    return found


def lint_text(page_html):
    """[(line, rule, sentence)] for one page's HTML."""
    p = Text()
    p.feed(page_html)
    p.close()
    p.flush()
    out = []
    for line, text, heading in p.blocks:
        for s in ([text] if heading else sentences(text)):
            for rule in check_sentence(s):
                out.append((line, rule, s))
    return out


LAYOUTS = ("about-layout.html",)  # the About tab's template, which build.py fills in; not a page of its own


def pages(folder, names):
    if names:
        return [folder / n for n in names]
    return sorted(f for f in folder.glob("*.html") if f.is_file() and f.name not in LAYOUTS)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], epilog=__doc__.split("\n\n", 1)[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("game", help="the game's folder, games/<platform>/<slug>")
    ap.add_argument("--page", action="append", help="lint only this page (repeatable), e.g. index.html")
    ap.add_argument("--strict", action="store_true", help="exit 1 when anything is found")
    a = ap.parse_args(argv)
    folder = Path(a.game)
    if not folder.is_dir():
        ap.error(f"{folder} is not a folder")
    counts = {}
    for f in pages(folder, a.page):
        for line, rule, s in lint_text(f.read_text(encoding="utf-8")):
            key = rule.split(" ")[0]
            counts[key] = counts.get(key, 0) + 1
            shown = s if len(s) <= 160 else s[:157] + "..."
            print(f"{f}:{line}  {rule}  {shown}")
    total = sum(counts.values())
    if total:
        print("\n" + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())) + f"; {total} in all")
    else:
        print("copy_lint: nothing found")
    return 1 if a.strict and total else 0


if __name__ == "__main__":
    sys.exit(main())
