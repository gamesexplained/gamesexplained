#!/usr/bin/env python3
"""Read the trace Bocfel writes (kit/zmachine/bocfel_trace.cpp): show it with the story's
instructions, check the kit's disassembler against it, and sum it up turn by turn.

  steps(path)                          -> [Step]: count, depth, addr, args, writes, next, text, typed
  check(story, steps)                  -> [(step, problem)]: where zcode.py disagrees with what ran
  annotate(story, step)                -> the line with the instruction's name, operands and outcome
  turns(story, steps)                  -> [Turn]: start-up, then one per line typed

Usage:
  ztrace.py show <story> <trace> [--from N] [--count N]   the instructions as they ran
  ztrace.py check <story> <trace>                         every instruction that ran, decoded again
                                                         from the story file and compared
  ztrace.py turns <story> <trace> [--resident PAGES --buffers N]
                                                         each turn: instructions, calls, routines,
                                                         objects moved, attributes changed; with
                                                         --resident and --buffers, the pages an
                                                         interpreter that keeps that many 256-byte
                                                         pages in memory and that many buffers for
                                                         the rest, least recently used first, would
                                                         read from its disk

The check compares, for each address that ran: how many operands there were, the value of
each constant, that the next address is one the instruction can reach (the next instruction,
its branch's target, a call's routine or a return), that an instruction which stores wrote
the variable it names, and the text a print printed. It is the test that the kit's
disassembler reads a version as Bocfel runs it; kit/zmachine/test_bocfel.py runs it on test
stories for every version.
"""
import argparse, collections, os, re, sys
from dataclasses import dataclass, field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zcode  # noqa: E402
from story import Story, zscii  # noqa: E402

HEAD = re.compile(r'^(\d+) (\d+) ([0-9A-F]{5})')
FIELD = re.compile(r' (a|w|n):(\S+)| (t|in):"((?:[^"\\]|\\.)*)"')


def unescape(s):
    """The trace's text as the story's text: \\xNN is a ZSCII code, which story.zscii reads."""
    return re.sub(r'\\(x[0-9A-F]{2}|n|.)', lambda m: "\n" if m[1] == "n" else zscii(int(m[1][1:], 16))
                  if m[1][0] == "x" and len(m[1]) == 3 else m[1], s)


@dataclass
class Step:
    count: int
    depth: int
    addr: int
    args: list
    writes: list           # [(variable, value)]
    next: int
    text: str = None
    typed: str = None


def parse(line):
    line = line.rstrip("\n")
    m = HEAD.match(line)
    if not m:
        return None
    f, at = {}, m.end()
    while at < len(line):
        g = FIELD.match(line, at)
        if not g:
            return None
        if g[1]:
            f[g[1]] = g[2]
        else:
            f[g[3]] = unescape(g[4])
        at = g.end()
    if "a" not in f or "n" not in f:
        return None
    writes = []
    for w in f["w"].split(",") if "w" in f else ():
        name, val = w.split("=")
        v = 0 if name == "sp" else int(name[1:], 16) + (16 if name[0] == "G" else 0)
        writes.append((v, int(val, 16)))
    args = [] if f["a"] == "-" else [int(x, 16) for x in f["a"].split(",")]
    return Step(int(m[1]), int(m[2]), int(m[3], 16), args, writes, int(f["n"], 16), f.get("t"), f.get("in"))


def steps(path):
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            s = parse(line)
            if s:
                out.append(s)
    return out


def check(story, ss):
    """[(step, problem)] for the first time each address ran; an empty list is the pass."""
    problems, seen = [], set()
    for i, s in enumerate(ss):
        if s.addr in seen:
            continue
        seen.add(s.addr)
        try:
            ins = story.instruction(s.addr)
        except (zcode.ZError, IndexError) as e:
            problems.append((s, f"does not decode: {e}")); continue
        if len(ins.operands) != len(s.args):
            problems.append((s, f"{ins.name}: {len(ins.operands)} operands, where Bocfel read {len(s.args)}"))
            continue
        for k, ((kind, v), got) in enumerate(zip(ins.operands, s.args)):
            if kind != "var" and v != got:
                problems.append((s, f"{ins.name}: operand {k + 1} is {v:04X}, where Bocfel read {got:04X}"))
        after = ss[i + 1] if i + 1 < len(ss) else None
        reach = {ins.end}
        if ins.branch and not isinstance(ins.branch[1], str):
            reach.add(ins.branch[1])
        if ins.target is not None and "j" in ins.flags:
            reach = {ins.target}
        returned = after is not None and after.depth < s.depth
        called = after is not None and after.depth > s.depth
        if not (s.next in reach or returned or called or ins.ends_flow() or ins.name in ("save", "restore")):
            problems.append((s, f"{ins.name}: went on to {s.next:05X}, where the instruction reaches "
                                f"{', '.join(f'{r:05X}' for r in sorted(reach))}"))
        if ins.store is not None and "r" not in ins.flags and not s.writes and ins.store != 0:
            problems.append((s, f"{ins.name}: stores to {zcode.var_name(ins.store)}, and Bocfel wrote nothing"))
        if ins.store is not None and "r" not in ins.flags and s.writes and s.writes[-1][0] != ins.store:
            problems.append((s, f"{ins.name}: stores to {zcode.var_name(ins.store)}, where Bocfel wrote "
                                f"{zcode.var_name(s.writes[-1][0])}"))
        if ins.text is not None and s.text is not None and ins.text != s.text:
            problems.append((s, f"{ins.name}: text {ins.text!r}, where Bocfel printed {s.text!r}"))
        if ins.name == "print_paddr" and s.text is not None:
            mine = story.string(story.unpack(s.args[0], "string"))
            if mine != s.text:
                problems.append((s, f"print_paddr: text {mine!r}, where Bocfel printed {s.text!r}"))
    return problems


def annotate(story, s):
    """A step as it ran: its instruction, the values its variables held, what it stored, where it went."""
    try:
        ins = story.instruction(s.addr)
    except zcode.ZError as e:
        return f"{s.count} {s.depth} {s.addr:05X} ?? {e}"
    ops = []
    for (kind, v), got, txt in zip(ins.operands, s.args, ins.operand_text()):
        ops.append(f"{txt}={got:04X}" if kind == "var" else txt)
    parts = [f"{s.count} {s.depth} {s.addr:05X} {ins.name}"] + ops
    if ins.target is not None:
        parts.append(f"({ins.target:05X})")
    if s.writes:
        parts.append("-> " + ",".join(f"{zcode.var_name(v)}={x:04X}" for v, x in s.writes))
    elif ins.store is not None:
        parts.append("-> " + zcode.var_name(ins.store))
    if ins.branch:
        on, t = ins.branch
        parts.append(("?" if on else "?~") + (t if isinstance(t, str) else f"{t:05X}") +
                     (" taken" if s.next != ins.end else ""))
    text = s.text if s.text is not None else None
    if text is not None:
        parts.append('"' + text.replace("\n", "\\n") + '"')
    if s.typed is not None:
        parts.append(f'typed "{s.typed}"')
    return " ".join(parts)


@dataclass
class Turn:
    typed: str
    instructions: int = 0
    calls: int = 0
    routines: collections.Counter = field(default_factory=collections.Counter)
    deepest: int = 0
    moves: list = field(default_factory=list)
    attributes: list = field(default_factory=list)
    pages: set = field(default_factory=set)
    reads: int = 0


class Buffers:
    """An interpreter that keeps the story's first `resident` pages in memory and reads any
    other into one of `n` buffers, the one used longest ago, as Infocom's did. A use is
    counted when the code or the data pointer moves to another page."""
    def __init__(self, resident, n):
        self.resident, self.n = resident, n
        self.lru, self.cur, self.reads = collections.OrderedDict(), {}, 0

    def use(self, kind, page):
        if page < self.resident or self.cur.get(kind) == page:
            return
        self.cur[kind] = page
        if page in self.lru:
            self.lru.move_to_end(page)
            return
        self.reads += 1
        if len(self.lru) >= self.n:
            self.lru.popitem(last=False)
        self.lru[page] = True


def turns(story, ss, resident=None, buffers=None):
    def name(n):
        try:
            return story.object(n).name or f"object {n}"
        except Exception:
            return f"object {n}"
    paging = Buffers(resident, buffers) if resident is not None and buffers else None
    out, routine_at = [Turn("(start-up)")], {}
    for s in ss:
        t = out[-1]
        try:
            ins = story.instruction(s.addr)
        except zcode.ZError:
            continue
        t.instructions += 1
        t.deepest = max(t.deepest, s.depth)
        t.routines[routine_at.get(s.depth, story.start())] += 1
        for p in range(s.addr >> 8, ((ins.end - 1) >> 8) + 1):
            t.pages.add(p)
            if paging:
                paging.use("code", p)
        if "r" in ins.flags:
            t.calls += 1
            routine_at[s.depth + 1] = zcode.unpack(s.args[0], story.version, "routine", story.offsets)
        elif ins.name == "print_paddr":
            a = story.unpack(s.args[0], "string")
            for p in range(a >> 8, ((story.text(story.mem, a)[1] - 1) >> 8) + 1):
                t.pages.add(p)
                if paging:
                    paging.use("data", p)
        elif ins.name == "insert_obj":
            t.moves.append(f"{name(s.args[0])} into {name(s.args[1])}")
        elif ins.name == "remove_obj":
            t.moves.append(f"{name(s.args[0])} taken out")
        elif ins.name in ("set_attr", "clear_attr"):
            t.attributes.append(f"{'+' if ins.name == 'set_attr' else '-'}{s.args[1]} {name(s.args[0])}")
        if paging:
            t.reads = paging.reads - sum(x.reads for x in out[:-1])
        if s.typed is not None:
            out.append(Turn(s.typed))
    return out


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=("show", "check", "turns"))
    ap.add_argument("story")
    ap.add_argument("trace")
    ap.add_argument("--from", dest="start", type=int, default=0)
    ap.add_argument("--count", type=int, default=None)
    ap.add_argument("--resident", type=lambda x: int(x, 0))
    ap.add_argument("--buffers", type=int)
    a = ap.parse_args(argv)
    story, ss = Story.load(a.story), steps(a.trace)
    if a.command == "show":
        end = None if a.count is None else a.start + a.count
        for s in ss[a.start:end]:
            print(annotate(story, s))
    elif a.command == "check":
        problems = check(story, ss)
        for s, p in problems[:50]:
            print(f"{s.addr:05X} (instruction {s.count}): {p}")
        print(f"{len({s.addr for s in ss})} addresses ran, {len(ss)} instructions; "
              f"{len(problems)} where the disassembler and Bocfel disagree")
        return 1 if problems else 0
    else:
        for t in turns(story, ss, a.resident, a.buffers):
            print(f"> {t.typed}")
            print(f"  {t.instructions:,} instructions, {t.calls} calls, {len(t.routines)} routines, deepest {t.deepest}")
            print("  busiest routines: " + ", ".join(f"{r:05X} {c}" for r, c in t.routines.most_common(5)))
            if a.resident is not None:
                print(f"  {len([p for p in t.pages if p >= a.resident])} pages beyond the first {a.resident}, "
                      f"{t.reads} read from the disk")
            if t.moves:
                print("  moved: " + "; ".join(t.moves))
            if t.attributes:
                print("  attributes: " + ", ".join(t.attributes))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
