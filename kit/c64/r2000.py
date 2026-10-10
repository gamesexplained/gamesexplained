#!/usr/bin/env python3
"""regenerator2000 MCP client, with an annotation log.

Every mutating call is appended to the game's work/annotations.jsonl so the
session can be rebuilt after a crash (`--replay`). The game folder is found
from --game, the GAME_DIR environment variable, or the current directory
(when it holds a game.json).

Usage:
  r2000.py <tool> '<json arguments>'          call one tool
  r2000.py --list                             list tools
  r2000.py --replay <annotations.jsonl>       replay a log into a fresh session
  r2000.py --apply <file>                     apply a file of annotations, one per line:
      $C000 init_screen : clears the screen and sets the border    a label and a line comment
      $C000 init_screen                        a label alone
      $C000 : clears the screen                a line comment alone
      $C100-$C1FF byte                         a data type (lower case, as set_data_type takes)
      # a note to yourself                     ignored, as are blank lines
    sent as batches of r2000_batch_execute in the file's order; the calls that succeed are logged
    one by one, and each that fails is printed with its line number
  r2000.py --game games/c64/<slug> <tool> '<json>'
  r2000.py --log annotations-3.jsonl <tool> '<json>'   write to that log instead

Parallel agents share one disassembler but must not share one log: appends
from several processes interleave and the replay is then unusable. Give each
agent its own --log (or set ANNOTATION_LOG) and merge the files afterwards.

Requires `regenerator2000 --mcp-server <file>` listening on :3000 (or KIT_R2000_PORT; `tools.py r2000` starts either).

Calls that come back as an error are not logged, so a replay does not
reproduce your mistakes. A batch called by name is logged as a whole, so
check its result; `--apply` logs only the calls of its batches that succeed.
"""
import json, os, re, sys, urllib.request

from kernal import entry_points
from ports import resolve_ports


def _port(gdir=None):
    """An explicit environment override, the part's own session, or the clone's port."""
    if gdir and "KIT_R2000_PORT" not in os.environ:
        try:
            with open(os.path.join(gdir, "work", "r2000-port")) as f:
                raw = f.read().strip()
        except FileNotFoundError:
            if os.path.isfile(os.path.join(gdir, "part.json")):
                sys.exit(f"no disassembler is running on a snapshot of {gdir} (`tools.py r2000 <its snapshot>` starts one).\n"
                         "To read this part's share of another part's session, name that part's folder:\n"
                         "  symbols_export.py <this part> --from <that part>      coverage.py <this part> --live --from <that part>")
        else:
            return resolve_ports(environ=dict(os.environ, KIT_R2000_PORT=raw))["r2000"]
    return resolve_ports()["r2000"]


URL = f"http://127.0.0.1:{_port()}/mcp"

MUTATING = {"r2000_set_label_name", "r2000_set_comment", "r2000_set_data_type",
            "r2000_disassemble", "r2000_batch_execute", "r2000_toggle_splitter",
            "r2000_add_scope", "r2000_set_immediate_format", "r2000_apply_enum_usage",
            "r2000_create_project_enum", "r2000_update_project_enum", "r2000_delete_project_enum"}


def make_client(gdir=None):
    """A session with the disassembler: the one started on gdir's snapshot when a game of
    several parts runs one each (kit/scripts/parts.py), else the clone's."""
    url = f"http://127.0.0.1:{_port(gdir)}/mcp" if gdir else URL
    session = [None]
    _id = [0]

    def rpc(method, params=None, notif=False):
        body = {"jsonrpc": "2.0", "method": method}
        if not notif:
            _id[0] += 1
            body["id"] = _id[0]
        if params is not None:
            body["params"] = params
        headers = {"Content-Type": "application/json",
                   "Accept": "application/json, text/event-stream"}
        if session[0]:
            headers["Mcp-Session-Id"] = session[0]
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
        r = urllib.request.urlopen(req, timeout=60)
        if not session[0]:
            session[0] = dict(r.getheaders()).get("mcp-session-id")
        txt = r.read().decode()
        if notif:
            return None
        lines = [l[len("data:"):].strip() for l in txt.splitlines()
                 if l.startswith("data:") and len(l.strip()) > 5]
        if lines:                       # server-sent events
            return json.loads(lines[-1])
        txt = txt.strip()               # or a plain JSON body
        return json.loads(txt) if txt else None

    rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                        "clientInfo": {"name": "kit", "version": "0"}})
    rpc("notifications/initialized", notif=True)
    return rpc


def call(rpc, name, arguments):
    res = rpc("tools/call", {"name": name, "arguments": arguments})
    try:
        return res["result"]["content"][0]["text"]
    except Exception:
        return json.dumps(res, indent=2)


def failed(out):
    """True when a tool call came back as an error rather than a result."""
    return out.lstrip().startswith("{") and '"error"' in out


def read_live(gdir=None):
    """(blocks, symbols, comments) from the running server, in symbols.json's
    vocabulary, with the KERNAL's entry points named the same whatever file the session
    started on (kernal.py). symbols_export.py calls this for a c64 game, with the game's or
    the part's folder."""
    rpc = make_client(gdir)
    blocks = json.loads(call(rpc, "r2000_get_blocks", {}))
    syms = json.loads(call(rpc, "r2000_get_symbols", {}))
    comments = json.loads(call(rpc, "r2000_get_comments", {}))
    return ([{"start": b["start_address"], "end": b["end_address"], "type": b["type"]} for b in blocks],
            entry_points([{"address": s["address"], "name": s["name"], "type": s["type"],
                           "kind": s.get("kind", "user").lower()} for s in syms]),
            [{"address": c["address"], "type": c["type"], "text": c["comment"]}
             for c in comments if c["comment"].strip()])


def cross_references(addresses, gdir=None):
    """{address: [the addresses that refer to it]} from the running server, asked 200 at a
    time. symbols_export.py asks about the automatic symbols of a part's session (#213); an
    address the server gave no answer for is left out."""
    rpc, out, addresses = make_client(gdir), {}, list(addresses)
    for i in range(0, len(addresses), 200):
        ask = addresses[i:i + 200]
        got = json.loads(call(rpc, "r2000_batch_execute", {"calls": [
            {"name": "r2000_get_cross_references", "arguments": {"address": a}} for a in ask]}))
        for a, r in zip(ask, got):
            if r.get("status") == "success":
                out[a] = json.loads(r["result"]["content"][0]["text"])
    return out


def game_dir(explicit=None):
    for cand in (explicit, os.environ.get("GAME_DIR"), os.getcwd()):
        if cand and any(os.path.exists(os.path.join(cand, f)) for f in ("game.json", "part.json")):
            return cand      # a game's folder, or the folder of one part of it (kit/scripts/parts.py)
    return None


def log_path(gdir, explicit=None):
    name = explicit or os.environ.get("ANNOTATION_LOG") or "annotations.jsonl"
    return os.path.join(gdir, "work", os.path.basename(name))


def log_call(gdir, name, arguments, log=None):
    if not gdir or name not in MUTATING:
        return
    os.makedirs(os.path.join(gdir, "work"), exist_ok=True)
    with open(log_path(gdir, log), "a") as f:
        if name == "r2000_batch_execute":
            for c in arguments.get("calls", []):       # a batch's reads stay out of the replay log
                if c.get("name") in MUTATING and c.get("name") != "r2000_batch_execute":
                    f.write(json.dumps({"kind": "call", "name": c["name"], "arguments": c["arguments"]}) + "\n")
        else:
            f.write(json.dumps({"kind": "call", "name": name, "arguments": arguments}) + "\n")


def replay(path):
    rpc = make_client(game_dir(os.path.dirname(os.path.dirname(os.path.abspath(path)))))
    entries = [json.loads(l) for l in open(path) if l.strip()]
    calls = []
    for e in entries:
        if e["kind"] == "disassemble":
            calls.append({"name": "r2000_disassemble", "arguments": {"address": e["address"]}})
        elif e["kind"] == "call":
            calls.append({"name": e["name"], "arguments": e["arguments"]})
    print(f"replaying {len(calls)} calls from {path}")
    for i in range(0, len(calls), 200):
        print(call(rpc, "r2000_batch_execute", {"calls": calls[i:i + 200]})[:300])


DATA_TYPES = {"code", "byte", "word", "address", "petscii", "screencode", "lo_hi_address", "hi_lo_address",
              "lo_hi_word", "hi_lo_word", "external_file", "undefined"}
RANGE = re.compile(r"^\$([0-9A-Fa-f]{1,4})\s*-\s*\$([0-9A-Fa-f]{1,4})\s+(\S+)\s*$")
ENTRY = re.compile(r"^\$([0-9A-Fa-f]{1,4})(?:\s+([A-Za-z_][\w.]*))?\s*(?::\s*(.*?))?\s*$")


def parse_annotations(text):
    """([(line number, call), ...], [(line number, problem), ...]) from a file for --apply.

    Each agent of the Mayhem in Monsterland run wrote its own script for this format, and some
    sent their calls one at a time instead (#306)."""
    calls, problems = [], []
    for n, line in enumerate(text.splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = RANGE.match(line)
        if m:
            start, end, kind = int(m.group(1), 16), int(m.group(2), 16), m.group(3)
            if kind not in DATA_TYPES:
                problems.append((n, f"{kind!r} is not a data type: one of {', '.join(sorted(DATA_TYPES))}"))
            elif end < start:
                problems.append((n, "the range ends before it starts"))
            else:
                calls.append((n, {"name": "r2000_set_data_type",
                                  "arguments": {"start_address": start, "end_address": end, "data_type": kind}}))
            continue
        m = ENTRY.match(line)
        if not m or not (m.group(2) or m.group(3)):
            problems.append((n, "not `$ADDR name : comment`, `$ADDR name`, `$ADDR : comment` or `$ADDR-$END type`"))
            continue
        address = int(m.group(1), 16)
        if m.group(2):
            calls.append((n, {"name": "r2000_set_label_name", "arguments": {"address": address, "name": m.group(2)}}))
        if m.group(3):
            calls.append((n, {"name": "r2000_set_comment",
                              "arguments": {"address": address, "type": "line", "comment": m.group(3)}}))
    return calls, problems


def apply(path, explicit=None, log=None, batch=200):
    """Send the file's annotations in batches, log each call that succeeds, and return how many
    failed. Nothing is sent when a line does not parse."""
    with open(path, encoding="utf-8") as f:
        calls, problems = parse_annotations(f.read())
    for n, msg in problems:
        print(f"{path}:{n}: {msg}")
    if problems:
        sys.exit(f"nothing sent: {len(problems)} line(s) to fix first")
    gdir = game_dir(explicit)
    rpc, done, bad = make_client(gdir), 0, 0
    for i in range(0, len(calls), batch):
        part = calls[i:i + batch]
        out = call(rpc, "r2000_batch_execute", {"calls": [c for _, c in part]})
        try:
            results = json.loads(out)
        except ValueError:
            results = None
        if not isinstance(results, list) or len(results) != len(part):
            sys.exit(f"the batch from line {part[0][0]} came back without a result for each call; "
                     f"{done} call(s) before it were applied and logged:\n{out[:300]}")
        for (n, c), r in zip(part, results):
            if r.get("status") == "success" and not (r.get("result") or {}).get("isError"):
                log_call(gdir, c["name"], c["arguments"], log)
                done += 1
            else:
                bad += 1
                print(f"{path}:{n}: {c['name']} failed: {json.dumps(r.get('error') or r.get('result'))[:200]}")
    print(f"applied {done} of {len(calls)} call(s) from {path}" + (f"; {bad} failed" if bad else ""))
    return bad


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    explicit, log = None, None
    while argv and argv[0] in ("--game", "--log"):
        if argv[0] == "--game":
            explicit, argv = argv[1], argv[2:]
        else:
            log, argv = argv[1], argv[2:]
    if argv[0] == "--replay":
        replay(argv[1]); return
    if argv[0] == "--apply":
        sys.exit(1 if apply(argv[1], explicit, log) else 0)
    rpc = make_client(game_dir(explicit))
    if argv[0] == "--list":
        for t in rpc("tools/list", {})["result"]["tools"]:
            print(f"{t['name']}: {t.get('description','')[:110]}")
        return
    name = argv[0]
    args = json.loads(argv[1]) if len(argv) > 1 else {}
    out = call(rpc, name, args)
    if not failed(out):
        log_call(game_dir(explicit), name, args, log)   # a failed call must not enter the replay log
    print(out)


if __name__ == "__main__":
    main()
