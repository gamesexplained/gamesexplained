#!/usr/bin/env python3
"""Carry names and comments from code to a copy of it, and say where the copy differs.

A game can hold the same routines more than once: a level's code assembled again at other
addresses in another part, a music driver written out once for each of the three voices, a
sound engine that every event file carries at an address of its own. Describe one copy, then
carry its names and comments to the others with this script (#552). It pairs the two copies
instruction by instruction, carries each label and comment across with the addresses in it
rewritten, and reports every place where the copy is not the same code. A carried comment
that reads as right can still describe the first copy only: where the copy calls another
routine, loads another constant or holds other data, the report names the comment to read
again against the copy's own bytes.

Usage:
  carry.py find <source dir> <start>-<end> <image> [<image> ...]
      Where the source's code from start to end occurs in each image, and how much of it.
      An image is a game or part folder (the bytes its listing.json holds) or a snapshot.
      Run it first when nobody knows where the copies are.

  carry.py pair <source dir> <start>-<end> <target dir> <start>-<end> [options]
      Pair the copy with the source, print what differs and what was carried, and write the
      pairing to <target dir>/work/carry/. The target may be the source's own folder.
      --snapshot <file>         the target's bytes, when its listing.json does not hold them
      --source-snapshot <file>  the source's bytes, when its listing.json is older than the code
      --name <old>=<new>        rename what is carried (a regular expression), such as
                                --name v1_=v2_; needed when the copy is in the source's folder
      --text <old>=<new>        rewrite the carried comments' prose too, such as
                                --text "Voice 1=Voice 2"

  carry.py apply <pairing file>
      Write what `pair` carried into the target's symbols.json: a name where the target has
      only an automatic one, a comment where it has none, and again where it still holds the
      text this pairing carried before, so a comment corrected in the source reaches every
      copy when each pairing is run and applied again. What the target wrote itself is kept
      and listed. Then rebuild the target's disassembler session from symbols.json
      (symbols_import.py) and its listing from the snapshot.

  carry.py --help

How it pairs. Each instruction is compared by its shape: the mnemonic, the addressing mode
and an immediate value. Operands may differ, since the copy is somewhere else and can keep
its variables elsewhere too: a block moved, one stride per voice. A first pairing learns
where the copy keeps each zero-page variable, and the next compares by it. Where the copy inserts or drops instructions, or
changes a constant, the pairing goes on past it (Python's difflib, on the shapes, then on the
mnemonics alone inside a stretch that differs). Then the pairing is made again with every
JSR, JMP and branch inside the source compared by where its twin should go, so a call the
copy inserts beside others cannot pull its neighbours one call early.

What the report flags:
  - a JSR, JMP or branch whose target's twin is not where the copy's goes (the copy calls
    another routine), or whose target has no twin, or one outside the source that the copy
    sends elsewhere;
  - an immediate value that differs;
  - stretches of instructions the copy adds or leaves out;
  - an instruction whose operand the copy keeps apart from where it keeps it elsewhere, such as
    a store back to the byte the source read, which the copy puts in a variable of its own;
  - each carried comment whose stretch of code holds any of those, and each comment on data
    whose bytes differ in the copy, with the hex values it names that the copy does not hold;
  - comments and names that could not be placed.

The 6502 family only (c64, c16, bbc, apple2, nes): the shapes are its addressing modes.
"""
import bisect
import difflib
import json
import os
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

GOES = ("jsr", "jmp")
SIX502 = ("c64", "c16", "bbc", "apple2", "nes")
SHOW = 12                       # findings of each kind printed; the pairing file holds them all


# --- reading a folder or a snapshot ---------------------------------------------------------

def hexnum(s):
    s = s.strip().replace("$", "")
    neg = s.startswith("-")
    v = int(s.lstrip("-+"), 16)
    return -v if neg else v


def span(s):
    a, b = s.split("-", 1) if not s.startswith("-") else (s, "")
    lo, hi = hexnum(a), hexnum(b)
    if hi < lo:
        sys.exit(f"{s}: the end is before the start")
    return lo, hi


def game_of(gdir):
    from parts import load_game
    if not os.path.isfile(os.path.join(gdir, "game.json")) and not os.path.isfile(os.path.join(gdir, "part.json")):
        sys.exit(f"{gdir}: not a game or part folder (no game.json or part.json)")
    return load_game(gdir)


def cpu_of(game):
    from listing import machine
    from symbols_export import machine_of
    plat = machine_of(game)
    if plat not in SIX502:
        sys.exit(f"carry.py pairs 6502 code; this folder's machine is {plat!r}")
    cpu, snap, size = machine(game)
    return cpu, snap, size


def image(gdir, snapshot, snap, size):
    """(bytes, from_listing): the snapshot's bytes, or the ones gdir's listing.json holds."""
    if snapshot:
        return bytearray(snap.read(snapshot)), False
    if not os.path.isfile(os.path.join(gdir, "listing.json")):
        sys.exit(f"{gdir} has no listing.json: give its snapshot")
    from listing import image_from_records
    return image_from_records(gdir, size), True


def symbols(gdir):
    p = os.path.join(gdir, "symbols.json")
    return json.load(open(p)) if os.path.isfile(p) else None


# --- instructions -------------------------------------------------------------------------

class Ins:
    __slots__ = ("a", "m", "mode", "n", "val", "goes", "to")

    def __init__(self, a, m, mode, n, ram):
        self.a, self.m, self.mode, self.n = a, m, mode, n
        self.val = None
        if n == 2:
            self.val = ram[a + 1]
        elif n == 3:
            self.val = ram[a + 1] | ram[a + 2] << 8
        self.goes = mode == "rel" or (m in GOES and mode == "abs")
        self.to = None
        if mode == "rel":
            self.to = (a + 2 + (self.val - 256 if self.val > 127 else self.val)) & 0xFFFF
        elif self.goes:
            self.to = self.val

    @property
    def zp(self):
        return self.n == 2 and self.mode not in ("imm", "rel")

    @property
    def data(self):
        """The address this instruction reads or writes, or None."""
        if self.goes or self.mode in ("imm", "imp", "acc"):
            return None
        return self.val

    def text(self):
        if self.mode == "imm":
            return f"{self.m} #${self.val:02X}"
        if self.val is None:
            return self.m
        return f"{self.m} ${(self.to if self.to is not None else self.val):0{2 if self.zp else 4}X}"


def decode(cpu, ram, a):
    d = cpu.decode(ram, a) if a < len(ram) else None
    if not d or a + d[2] > len(ram):
        return None
    return Ins(a, d[0], d[1], d[2], ram)


def walk(cpu, ram, lo, hi, starts, taken):
    """Decode on from each start, in order, to hi, stopping at a byte already taken."""
    out = []
    for s in starts:
        a = s
        while lo <= a <= hi and not taken[a - lo]:
            i = decode(cpu, ram, a)
            if not i or a + i.n - 1 > hi or any(taken[a - lo:a - lo + i.n]):
                break
            out.append(i)
            taken[a - lo:a - lo + i.n] = b"\x01" * i.n
            a += i.n
    return out


def known_code(gdir, cpu, ram, lo, hi, from_listing):
    """The instructions in lo-hi that the folder already knows of, or None when it knows none:
    its listing's code records, else its symbols.json's code blocks, else its codemap.json."""
    if from_listing:
        recs = json.load(open(os.path.join(gdir, "listing.json")))["records"]
        out = [decode(cpu, ram, r["a"]) for r in recs if r["t"] == "code" and lo <= r["a"] <= hi]
        out = [i for i in out if i]
        if out:
            return out
    taken = bytearray(hi - lo + 1)
    S = symbols(gdir)
    blocks = [(max(b["start"], lo), min(b["end"], hi)) for b in (S or {}).get("blocks", [])
              if b["type"] == "Code" and b["end"] >= lo and b["start"] <= hi]
    if blocks:
        out = []
        for a, b in blocks:
            sub = bytearray(b - a + 1)
            out += walk(cpu, ram, a, b, [a], sub)
        return sorted(out, key=lambda i: i.a)
    cm = os.path.join(gdir, "codemap.json")
    if os.path.isfile(cm):
        C = json.load(open(cm))
        starts = sorted(a for a in C.get("starts", []) if lo <= a <= hi)
        if starts:
            return sorted(walk(cpu, ram, lo, hi, starts, taken), key=lambda i: i.a)
    return None


def runs(ins):
    """Instructions grouped into stretches with no gap between them."""
    out = []
    for i in ins:
        if out and out[-1][-1].a + out[-1][-1].n == i.a:
            out[-1].append(i)
        else:
            out.append([i])
    return out


# --- shapes and pairing -------------------------------------------------------------------

def coarse(i):
    return (i.m, i.mode)


def loose(i):
    """The shape `find` searches by: zero page and addresses free, immediates kept."""
    return (i.m, i.mode, i.val if i.mode == "imm" else None)


def fine(i, side, zmap, inside, where):
    """The shape `pair` compares: `side` 0 is the source, 1 the copy. Once a first pairing has
    run, zmap[a] is the zero-page address the copy uses where the source uses a, and where[a]
    the twin a source branch or call inside the source should reach in the copy."""
    if i.goes:
        if where is None or not inside(side, i.to):
            return (i.m, i.mode)
        return (i.m, i.mode, where.get(i.to, ("?", i.to)) if side == 0 else i.to)
    if i.mode == "imm":
        return (i.m, i.mode, i.val)
    if i.zp and zmap is not None:
        return (i.m, i.mode, zmap.get(i.val, i.val) if side == 0 else i.val)
    return (i.m, i.mode)


def match(a, b, key_a, key_b):
    """[(index in a, index in b)]: difflib on the keys, then on the mnemonics alone inside
    each stretch the two replace."""
    pairs = []
    sm = difflib.SequenceMatcher(None, [key_a(x) for x in a], [key_b(y) for y in b], autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            pairs += zip(range(i1, i2), range(j1, j2))
        elif tag == "replace":
            sub = difflib.SequenceMatcher(None, [coarse(x) for x in a[i1:i2]], [coarse(y) for y in b[j1:j2]],
                                          autojunk=False)
            for t2, p1, p2, q1, q2 in sub.get_opcodes():
                if t2 == "equal":
                    pairs += zip(range(i1 + p1, i1 + p2), range(j1 + q1, j1 + q2))
    return pairs


def zp_map(src, dst, pairs):
    """{source zero-page address: the copy's}, by what most paired instructions say. A copy can
    keep its variables at a fixed offset (a block moved), at one stride per voice, or where the
    source does."""
    votes = defaultdict(Counter)
    for i, j in pairs:
        if src[i].zp and dst[j].zp:
            votes[src[i].val][dst[j].val] += 1
    return {a: c.most_common(1)[0][0] for a, c in votes.items()}


def anchored(cpu, ram, src, lo, hi):
    """The copy's instructions when nothing says where its code is: decoded on from every place
    the first instructions of one of the source's stretches occur once, then from the start."""
    heads = defaultdict(list)
    K = 4
    for r in runs(src):
        if len(r) >= K:
            heads[tuple(fine(i, 0, None, lambda s, a: False, None) for i in r[:K])].append(r[0].a)
    found = defaultdict(list)
    for a in range(lo, hi + 1):
        ii, b = [], a
        for _ in range(K):
            i = decode(cpu, ram, b)
            if not i or b + i.n - 1 > hi:
                break
            ii.append(i)
            b += i.n
        if len(ii) == K:
            k = tuple(fine(i, 1, None, lambda s, a: False, None) for i in ii)
            if k in heads:
                found[k].append(a)
    starts = sorted(v[0] for k, v in found.items() if len(v) == 1 and len(heads[k]) == 1)
    taken = bytearray(hi - lo + 1)
    return sorted(walk(cpu, ram, lo, hi, starts + [lo], taken), key=lambda i: i.a)


def pair_code(src, dst, srange, drange):
    """(pairs as index pairs, the zero-page map, passes)."""
    def inside(side, a):
        lo, hi = srange if side == 0 else drange
        return a is not None and lo <= a <= hi
    pairs = match(src, dst, lambda x: fine(x, 0, None, inside, None), lambda y: fine(y, 1, None, inside, None))
    passes = 1
    for _ in range(4):
        zmap, where = zp_map(src, dst, pairs), {src[i].a: dst[j].a for i, j in pairs}
        again = match(src, dst, lambda x: fine(x, 0, zmap, inside, where), lambda y: fine(y, 1, zmap, inside, where))
        passes += 1
        if again == pairs:
            break
        pairs = again
    zmap, where = zp_map(src, dst, pairs), {src[i].a: dst[j].a for i, j in pairs}
    return slide(dst, pairs, [fine(y, 1, zmap, inside, where) for y in dst]), zmap, passes


def slide(dst, pairs, key):
    """The pairing with each stretch the copy adds put after the instructions it can follow, not
    before: where the copy repeats an instruction (a routine's RTS, then a new routine ending in
    another), difflib may pair the source's with the second, leaving the first routine short."""
    out = sorted(pairs)
    for p in range(1, len(out)):
        (i0, j0), (i, j) = out[p - 1], out[p]
        if i == i0 + 1 and j > j0 + 1 and key[j0 + 1] == key[j]:
            out[p] = (i, j0 + 1)
    return out


# --- what differs ---------------------------------------------------------------------------

def findings(src, dst, pairs, srange, chips):
    """[finding], and {source operand address: Counter(the copy's addresses)}."""
    P = {src[i].a: dst[j].a for i, j in pairs}
    out = []

    def add(kind, s, d, text):
        out.append({"kind": kind, "source": s, "copy": d, "text": text})

    inside = lambda a: srange[0] <= a <= srange[1]
    uses = defaultdict(Counter)
    for i, j in pairs:
        s, d = src[i], dst[j]
        if s.goes:
            if inside(s.to):
                if s.to not in P:
                    add("no twin", s.a, d.a, f"${s.a:04X} {s.text()}: ${s.to:04X} has no twin in the copy, "
                        f"whose ${d.a:04X} goes to ${d.to:04X}")
                elif P[s.to] != d.to:
                    add("goes elsewhere", s.a, d.a, f"${s.a:04X} {s.text()} pairs with ${d.a:04X} {d.text()}, "
                        f"but ${s.to:04X}'s twin is ${P[s.to]:04X}")
            elif d.to != s.to:
                add("outside", s.a, d.a, f"${s.a:04X} {s.text()} leaves the source; its twin "
                    f"${d.a:04X} {d.text()} goes elsewhere")
        elif s.mode == "imm" and s.val != d.val:
            add("immediate", s.a, d.a, f"${s.a:04X} {s.text()}, the copy ${d.a:04X} {d.text()}")
        if s.data is not None and d.data is not None and not chips(s.data, s.a):
            uses[s.data][d.data] += 1       # a chip's register is the machine's, not the copy's variable
    # an address the source uses that the copy uses at more than one place: the copy keeps
    # apart what the source shares, or the other way round
    for i, j in pairs:
        s, d = src[i], dst[j]
        if s.data is None or d.data is None or len(uses.get(s.data, ())) < 2:
            continue
        most = uses[s.data].most_common(1)[0][0]
        if d.data != most:
            w = 2 if s.zp else 4
            add("operand", s.a, d.a, f"${s.a:04X} {s.text()}, the copy ${d.a:04X} {d.text()}; elsewhere the "
                f"copy uses ${most:0{w}X} for ${s.data:0{w}X}")
    ps, pd = {i for i, _ in pairs}, {j for _, j in pairs}
    for side, seq, got, kind in ((0, src, ps, "left out"), (1, dst, pd, "added")):
        for r in stretches([k for k in range(len(seq)) if k not in got]):
            a, b = seq[r[0]], seq[r[-1]]
            lead = "the copy leaves out" if side == 0 else "the copy adds"
            add(kind, a.a if side == 0 else None, a.a if side == 1 else None,
                f"{lead} ${a.a:04X}-${b.a + b.n - 1:04X} ({len(r)} instruction{'s' if len(r) > 1 else ''}"
                + (f", from {a.text()}" if len(r) <= 3 else f": {a.text()} ...") + ")")
            out[-1]["end"] = b.a + b.n - 1
    return out, uses


def stretches(idx):
    out = []
    for k in idx:
        if out and out[-1][-1] == k - 1:
            out[-1].append(k)
        else:
            out.append([k])
    return out


# --- the address map and carrying -----------------------------------------------------------

def address_map(src, dst, pairs, uses, srange):
    """{source address: copy address}: every byte of each paired instruction of one length, and
    every address the source's instructions use that the copy uses at one place only."""
    M, how = {}, {}
    for i, j in pairs:
        s, d = src[i], dst[j]
        for k in range(s.n if s.n == d.n else 1):
            M[s.a + k], how[s.a + k] = d.a + k, "code"
    for a, c in uses.items():
        if len(c) == 1 and a not in M:
            M[a], how[a] = next(iter(c)), "operand"
    code = sorted((src[i].a, dst[j].a) for i, j in pairs)
    return M, how, code


def data_twin(code, x, n, ram_s, ram_d):
    """(address, how) for data at x the instructions do not reach: where the copy holds the same
    n bytes at the offset of the paired instructions before or after it, or at x itself; else
    where both those instructions agree, its bytes then differing; else (None, None)."""
    k = bisect.bisect_right(code, (x, 1 << 30))
    before, after = (code[k - 1] if k else None), (code[k] if k < len(code) else None)
    offs = [p[1] - p[0] for p in (before, after) if p]
    want = bytes(ram_s[x:x + n])
    agree = before and after and offs[0] == offs[1]
    for off in dict.fromkeys(offs if agree else [0] + offs):   # data past the last pair often stayed put
        if 0 <= x + off and bytes(ram_d[x + off:x + off + n]) == want:
            return x + off, "bytes"
    if agree:
        return x + offs[0], "offset"
    return None, None


def carry(S_src, S_dst, M, how, code, srange, findings_, ram_s, ram_d, rules, src_ins, same_dir, chips):
    slo, shi = srange
    rename = lambda n: rename_with(rules, n)

    marks = sorted({c["address"] for c in S_src["comments"]} | {s["address"] for s in S_src["symbols"]
                                                                  if s.get("kind") == "user"})

    def twin(a):
        if a in M:
            return M[a], how[a]
        if slo <= a <= shi:
            k = bisect.bisect_right(marks, a)
            n = max(1, min(16, (marks[k] if k < len(marks) else shi + 1) - a))
            return data_twin(code, a, n, ram_s, ram_d)
        return None, None

    def wanted(a, t):
        # an address outside the source whose twin is itself is shared code or data, not the copy's
        return t is not None and (slo <= a <= shi or t != a)

    syms = [s for s in S_src["symbols"] if s.get("kind") == "user"]
    names_at = defaultdict(list)
    for s in S_src["symbols"]:
        names_at[s["address"]].append(s)
    by_name = {s["name"]: s["address"] for s in S_src["symbols"]}
    dst_user = {}
    for s in (S_dst or {}).get("symbols", []):
        if s.get("kind") == "user":
            dst_user.setdefault(s["address"], s["name"])
    known = {s["name"] for s in (S_dst or {}).get("symbols", [])}
    carried_names, placed_sym, unplaced = {}, [], []
    for s in syms:
        a = s["address"]
        t, h = twin(a)
        if not wanted(a, t):
            if slo <= a <= shi:
                unplaced.append(f"${a:04X} label {s['name']}: no twin")
            continue
        n = rename(s["name"])
        carried_names[a] = n
        placed_sym.append({"address": t, "name": n, "type": s["type"], "from": a, "by": h})
    known |= {s["name"] for s in placed_sym}
    if same_dir and not rules and placed_sym:
        sys.exit("the copy is in the source's own folder, so the carried names would clash with the source's: "
                 "give --name <old>=<new>, such as --name v1_=v2_")

    def name_for(a):
        t, _ = twin(a)
        if t is None:
            return None
        return dst_user.get(t) or carried_names.get(a)

    # zero-page addresses the copy keeps elsewhere, whether reached in their two-byte form or not
    zdelta = {a: (t - a) & 0xFF for a, t in M.items() if a < 0x100 and t < 0x100 and t != a and how.get(a) == "operand"}

    def rewrite(text, used, at):
        """The text with each address and name the copy holds elsewhere written as the copy's.
        A two-digit $HH can be a value as well as an address: it is rewritten only where the
        comment's own instructions use it as an address (a range of them by the end they use),
        and named in the notes where the copy keeps that address elsewhere and they do not."""
        notes = []

        def zrange(m):
            a, b = int(m.group(1), 16), int(m.group(2), 16)
            end = a if a in used and a in zdelta else b if b in used and b in zdelta else None
            if end is None:
                if a in zdelta or b in zdelta:
                    notes.append(f"names {m.group(0)}, which the copy keeps elsewhere if it means addresses")
                return m.group(0)
            d = zdelta[end]
            new = f"${(a + d) & 0xFF:02X}-${(b + d) & 0xFF:02X}"
            notes.append(f"rewrote {m.group(0)} as {new}, zero page")
            return new

        def zp(m):
            x = int(m.group(1), 16)
            if x not in zdelta:
                return m.group(0)
            new = f"${(x + zdelta[x]) & 0xFF:02X}"
            if x not in used:
                notes.append(f"names {m.group(0)}, which the copy keeps at {new} if it means the address")
                return m.group(0)
            notes.append(f"rewrote {m.group(0)} as {new}, zero page")
            return new

        def addr(m):
            x = int(m.group(1), 16)
            if chips(x, at):
                return m.group(0)               # a chip's register is the same in every copy
            t, _ = twin(x)
            if t is None:
                if slo <= x <= shi:
                    notes.append(f"names ${x:04X}, which has no twin")
                return m.group(0)
            return f"${t:04X}" if t != x else m.group(0)

        def word(m):
            w = m.group(0)
            if w in by_name:
                n = name_for(by_name[w])
                if n and n != w:
                    return n
                n = rename(w)           # a name whose address the pairing does not reach, such as a
                if n != w and n in known:   # table read at its start less $C0: renamed if the copy has it
                    return n
            return w
        text = re.sub(r"\$([0-9A-Fa-f]{4})(?![0-9A-Fa-f])", addr, text)
        text = re.sub(r"(?<![#\w])\$([0-9A-Fa-f]{2})-\$([0-9A-Fa-f]{2})(?![0-9A-Fa-f])", zrange, text)
        text = re.sub(r"(?<![#\w-])\$([0-9A-Fa-f]{2})(?![0-9A-Fa-f-])", zp, text)
        text = re.sub(r"(?<![$#\w])[A-Za-z_][A-Za-z0-9_]*\b", word, text)
        return text, notes

    # the stretch each comment describes: to the next comment or label in the source
    by_a = {i.a: i for i in src_ins}

    def stretch(a, kind):
        if kind == "side":
            return a, a
        k = bisect.bisect_right(marks, a)
        return a, (marks[k] - 1 if k < len(marks) else shi)

    # added stretches belong to the source stretch they sit after
    back = {}
    for s, d in code:
        back[d] = s
    dlist = sorted(back)

    def before_in_source(d):
        k = bisect.bisect_left(dlist, d)
        return back[dlist[k - 1]] if k else None

    placed_com = []
    for c in S_src["comments"]:
        a = c["address"]
        t, h = twin(a)
        if not wanted(a, t):
            if slo <= a <= shi:
                unplaced.append(f"${a:04X} {c['type']} comment: no twin: {c['text'][:70]}")
            continue
        lo, hi = stretch(a, c["type"])
        code_here = how.get(a) == "code"
        used = {i.data for x, i in by_a.items() if lo <= x <= hi and i.data is not None and i.data < 0x100}
        text, notes = rewrite(c["text"], used | ({a} if a < 0x100 else set()), a)
        why = []
        if code_here:
            for f in findings_:
                at = f["source"] if f["source"] is not None else (before_in_source(f["copy"]) if f["copy"] else None)
                if at is not None and lo <= at <= hi:
                    why.append(f["text"])
        elif slo <= a <= shi:              # data the copy carries; outside, a variable's bytes mean nothing here
            n = max(1, min(hi, shi) - a + 1)
            n = min(n, 256)
            here, there = bytes(ram_s[a:a + n]), bytes(ram_d[t:t + n])
            if here != there:
                named = {int(v, 16) for v in re.findall(r"\$([0-9A-Fa-f]{2})(?![0-9A-Fa-f])", c["text"])}
                missing = sorted(v for v in named if v in here and v not in there)
                k = next(i for i in range(n) if here[i:i + 1] != there[i:i + 1])
                why.append(f"the copy's bytes differ from ${a + k:04X} (${here[k]:02X}, the copy ${there[k]:02X})"
                           + (f"; the comment names {', '.join(f'${v:02X}' for v in missing)}, "
                              "which the copy's bytes do not hold" if missing else ""))
        placed_com.append({"address": t, "type": c["type"], "text": text, "from": a, "by": h,
                           **({"reread": why} if why else {}), **({"notes": notes} if notes else {})})
    return placed_sym, placed_com, unplaced


def signed(d):
    """A zero-page move as +$10 or -$10."""
    return f"+${d:02X}" if d < 128 else f"-${256 - d:02X}"


def rename_with(rules, n):
    for old, new in rules:
        n = re.sub(old, new, n)
    return n


# --- commands ---------------------------------------------------------------------------------

def opts(argv, names):
    got, rest, i = defaultdict(list), [], 0
    while i < len(argv):
        if argv[i] in names:
            if i + 1 >= len(argv):
                sys.exit(f"{argv[i]} needs a value")
            got[argv[i]].append(argv[i + 1]); i += 2
        else:
            rest.append(argv[i]); i += 1
    return got, rest


def cmd_pair(argv):
    o, rest = opts(argv, ("--snapshot", "--source-snapshot", "--name", "--text"))
    if len(rest) != 4:
        sys.exit("usage: carry.py pair <source dir> <start>-<end> <target dir> <start>-<end> [options]; see -h")
    sdir, srange, ddir, drange = rest[0], span(rest[1]), rest[2], span(rest[3])
    sgame, dgame = game_of(sdir), game_of(ddir)
    cpu, snap, size = cpu_of(sgame)
    cpu_d, snap_d, size_d = cpu_of(dgame)
    ram_s, from_l_s = image(sdir, (o["--source-snapshot"] or [None])[0], snap, size)
    same_dir = os.path.realpath(sdir) == os.path.realpath(ddir)
    if same_dir and not o["--snapshot"]:
        ram_d, from_l_d = ram_s, from_l_s            # one image holds both copies
    else:
        ram_d, from_l_d = image(ddir, (o["--snapshot"] or [None])[0], snap_d, size_d)
    S_src, S_dst = symbols(sdir), symbols(ddir)
    if not S_src:
        sys.exit(f"{sdir} has no symbols.json: nothing to carry")
    src = known_code(sdir, cpu, ram_s, *srange, from_l_s)
    if not src:
        sys.exit(f"{sdir}: no code is known between ${srange[0]:04X} and ${srange[1]:04X}")
    dst = known_code(ddir, cpu_d, ram_d, *drange, from_l_d)
    guessed = dst is None
    if guessed:
        dst = anchored(cpu_d, ram_d, src, *drange)
    rules, prose = [], []
    for flag, into in (("--name", rules), ("--text", prose)):
        for r in o[flag]:
            if "=" not in r:
                sys.exit(f"{flag} {r}: give old=new")
            into.append(tuple(r.split("=", 1)))
    pairs, zmap, passes = pair_code(src, dst, srange, drange)
    from listing import io_meaning
    F, uses = findings(src, dst, pairs, srange, io_meaning(sgame))
    M, how, code = address_map(src, dst, pairs, uses, srange)
    syms, coms, unplaced = carry(S_src, S_dst, M, how, code, srange, F, ram_s, ram_d, rules, src, same_dir,
                                 io_meaning(sgame))
    for c in coms:
        c["text"] = rename_with(prose, c["text"])

    rel = lambda p: os.path.relpath(os.path.realpath(p), os.path.realpath(ddir))
    name = (f"{os.path.basename(os.path.realpath(sdir))}_{srange[0]:04X}-{srange[1]:04X}"
            f"_to_{drange[0]:04X}-{drange[1]:04X}.json")
    out_dir = os.path.join(ddir, "work", "carry")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, name)
    applied = {}
    if os.path.isfile(path):
        applied = json.load(open(path)).get("applied", {})
    record = {
        "source": {"dir": rel(sdir), "range": [srange[0], srange[1]],
                   "bytes": o["--source-snapshot"][0] if o["--source-snapshot"] else "listing.json"},
        "target": {"dir": ".", "range": [drange[0], drange[1]],
                   "bytes": o["--snapshot"][0] if o["--snapshot"] else "listing.json",
                   "code": "decoded from the source's stretches" if guessed else "the folder's own"},
        "zero_page": {f"{a:02X}": f"{b:02X}" for a, b in sorted(zmap.items()) if a != b},
        "names": [list(r) for r in rules], "text": [list(r) for r in prose],
        "pairs": [[src[i].a, dst[j].a] for i, j in pairs],
        "findings": F, "symbols": syms, "comments": coms, "unplaced": unplaced, "applied": applied}
    with open(path, "w") as f:
        json.dump(record, f, indent=1)

    kinds = Counter(f["kind"] for f in F)
    print(f"paired {len(pairs)} of the source's {len(src)} instructions with the copy's {len(dst)}"
          + (" (the copy's code decoded from the source's, since its folder knows none)" if guessed else "")
          + f", in {passes} passes")
    moved = Counter((b - a) & 0xFF for a, b in zmap.items() if a != b)
    if moved:
        print("the copy keeps zero-page variables elsewhere: " + ", ".join(
            f"{n} at {signed(d)}" for d, n in moved.most_common())
            + f"; {sum(1 for a, b in zmap.items() if a == b)} where the source does")
    for kind in ("goes elsewhere", "no twin", "outside", "immediate", "operand", "left out", "added"):
        rows = [f for f in F if f["kind"] == kind]
        if rows:
            print(f"{kind}: {len(rows)}")
            for f in rows[:SHOW]:
                print(f"  {f['text']}")
            if len(rows) > SHOW:
                print(f"  and {len(rows) - SHOW} more")
    reread = [c for c in coms if c.get("reread")]
    print(f"carried {len(syms)} names and {len(coms)} comments; {len(unplaced)} could not be placed")
    if reread:
        print(f"{len(reread)} carried comments describe code or data that differs in the copy; read each again:")
        for c in reread[:SHOW]:
            print(f"  ${c['address']:04X} (from ${c['from']:04X}): {c['reread'][0]}")
        if len(reread) > SHOW:
            print(f"  and {len(reread) - SHOW} more")
    noted = [c for c in coms if c.get("notes")]
    if noted:
        print(f"{len(noted)} carried comments name an address or a zero-page byte to check (each comment's notes):")
        for c in noted[:SHOW]:
            print(f"  ${c['address']:04X} (from ${c['from']:04X}): {'; '.join(c['notes'])}")
        if len(noted) > SHOW:
            print(f"  and {len(noted) - SHOW} more")
    for u in unplaced[:SHOW]:
        print(f"  not placed: {u}")
    if len(unplaced) > SHOW:
        print(f"  and {len(unplaced) - SHOW} more not placed")
    print(f"wrote {path}")
    if not kinds and not reread:
        print("the copy is the same code throughout")


def cmd_apply(argv):
    if len(argv) != 1:
        sys.exit("usage: carry.py apply <pairing file>")
    path = argv[0]
    R = json.load(open(path))
    ddir = os.path.normpath(os.path.join(os.path.dirname(path), "..", ".."))
    spath = os.path.join(ddir, "symbols.json")
    if not os.path.isfile(spath):
        sys.exit(f"{ddir} has no symbols.json: export the copy's session first (symbols_export.py), "
                 "so its blocks are there to carry names and comments into")
    S = json.load(open(spath))
    prev = R.get("applied") or {}
    prev_s, prev_c = prev.get("symbols", {}), prev.get("comments", {})
    added = renamed = kept = same = 0
    kept_rows = []
    now_s, now_c = {}, {}
    for c in R["symbols"]:
        a, n = c["address"], c["name"]
        here = [s for s in S["symbols"] if s["address"] == a]
        user = [s for s in here if s.get("kind") == "user"]
        clash = [s for s in S["symbols"] if s["name"] == n and s["address"] != a]
        if clash:
            kept += 1; kept_rows.append(f"${a:04X} {n}: the copy names ${clash[0]['address']:04X} so already")
            continue
        if user:
            if user[0]["name"] == n:
                same += 1
            elif prev_s.get(str(a)) == user[0]["name"]:
                user[0]["name"] = n; renamed += 1
            else:
                kept += 1; kept_rows.append(f"${a:04X} the copy's own name {user[0]['name']}, not {n}")
                continue
        else:
            S["symbols"] = [s for s in S["symbols"] if s["address"] != a]
            S["symbols"].append({"address": a, "name": n, "type": c["type"], "kind": "user"})
            added += 1
        now_s[str(a)] = n
    c_added = c_changed = c_same = 0
    for c in R["comments"]:
        a, t, text = c["address"], c["type"], c["text"]
        key = f"{a}/{t}"
        here = [x for x in S["comments"] if x["address"] == a and x["type"] == t]
        if here:
            if here[0]["text"] == text:
                c_same += 1
            elif prev_c.get(key) == here[0]["text"]:
                here[0]["text"] = text; c_changed += 1
            else:
                kept += 1; kept_rows.append(f"${a:04X} the copy's own {t} comment: {here[0]['text'][:60]}")
                continue
        else:
            S["comments"].append({"address": a, "type": t, "text": text}); c_added += 1
        now_c[key] = text
    S["symbols"].sort(key=lambda s: (s["address"], s.get("kind") != "user"))
    S["comments"].sort(key=lambda x: (x["address"], x["type"]))
    with open(spath, "w") as f:
        json.dump(S, f, indent=1)
    R["applied"] = {"symbols": {**prev_s, **now_s}, "comments": {**prev_c, **now_c}}
    with open(path, "w") as f:
        json.dump(R, f, indent=1)
    print(f"wrote {spath}: names {added} added, {renamed} carried again, {same} already there; "
          f"comments {c_added} added, {c_changed} carried again, {c_same} already there")
    if kept_rows:
        print(f"kept {kept} the copy holds of its own:")
        for r in kept_rows[:SHOW]:
            print(f"  {r}")
        if len(kept_rows) > SHOW:
            print(f"  and {len(kept_rows) - SHOW} more")
    print("next: rebuild the copy's disassembler session from symbols.json (symbols_import.py <dir> <snapshot>), "
          "read again each comment `pair` flagged, then export and rebuild its listing from the snapshot")


def cmd_find(argv):
    if len(argv) < 3:
        sys.exit("usage: carry.py find <source dir> <start>-<end> <image> [<image> ...]")
    sdir, srange = argv[0], span(argv[1])
    sgame = game_of(sdir)
    cpu, snap, size = cpu_of(sgame)
    ram_s, from_l = image(sdir, None, snap, size)
    src = known_code(sdir, cpu, ram_s, *srange, from_l)
    if not src:
        sys.exit(f"{sdir}: no code is known between ${srange[0]:04X} and ${srange[1]:04X}")
    K = 8
    index = defaultdict(list)
    for r in runs(src):
        for k in range(len(r) - K + 1):
            index[tuple(loose(i) for i in r[k:k + K])].append(r[k].a)
    for spec in argv[2:]:
        if os.path.isdir(spec):
            game = game_of(spec)
            c2, s2, z2 = cpu_of(game)
            ram, _ = image(spec, None, s2, z2)
        else:
            c2, ram = cpu, bytearray(snap.read(spec))
        mine = os.path.isdir(spec) and os.path.realpath(spec) == os.path.realpath(sdir)
        dec = {}

        def at(a):
            if a not in dec:
                dec[a] = decode(c2, ram, a)
            return dec[a]
        hits = []
        for a in range(len(ram)):
            if mine and srange[0] <= a <= srange[1]:
                continue
            ii, b = [], a
            for _ in range(K):
                i = at(b) if b < len(ram) else None
                if not i:
                    break
                ii.append(i); b += i.n
            if len(ii) < K:
                continue
            for s in index.get(tuple(loose(i) for i in ii), []):
                hits.append((a, s, ii))
        groups = []
        for a, s, ii in sorted(hits):
            if groups and a - groups[-1]["end"] <= 256:
                g = groups[-1]
            else:
                g = {"start": a, "end": a, "src": set(), "zp": Counter()}
                groups.append(g)
            g["end"] = max(g["end"], ii[-1].a + ii[-1].n - 1)
            g["src"].add(s)
            for i, j in zip(src[[x.a for x in src].index(s):], ii):
                if i.zp and j.zp:
                    g["zp"][(j.val - i.val) & 0xFF] += 1
        starts = {s for r in runs(src) for k in range(len(r) - K + 1) for s in [r[k].a]}
        print(f"{spec}:")
        groups = [g for g in groups if len(g["src"]) * 20 >= len(starts)]    # a stray match is not a copy
        if not groups:
            print("  not found")
        for g in groups:
            share = len(g["src"]) * 100 // max(1, len(starts))
            z = g["zp"].most_common(1)[0][0] if g["zp"] else 0
            print(f"  ${g['start']:04X}-${g['end']:04X}: {share}% of the source's eight-instruction stretches"
                  + (f", zero page moved by {signed(z)}" if z else ""))


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    cmd, rest = argv[0], argv[1:]
    if cmd == "pair":
        cmd_pair(rest)
    elif cmd == "apply":
        cmd_apply(rest)
    elif cmd == "find":
        cmd_find(rest)
    else:
        sys.exit(f"unknown command {cmd!r}; see -h")


if __name__ == "__main__":
    main()
