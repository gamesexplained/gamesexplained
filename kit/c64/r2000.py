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
  r2000.py --game games/c64/<slug> <tool> '<json>'
  r2000.py --log annotations-3.jsonl <tool> '<json>'   write to that log instead

Parallel agents share one disassembler but must not share one log: appends
from several processes interleave and the replay is then unusable. Give each
agent its own --log (or set ANNOTATION_LOG) and merge the files afterwards.

Requires `regenerator2000 --mcp-server <file>` listening on :3000 (or KIT_R2000_PORT; `tools.py r2000` starts either).

Calls that come back as an error are not logged, so a replay does not
reproduce your mistakes. A batch is logged as a whole, so check its result.
"""
import json, os, sys, urllib.request

def _port(gdir=None):
    """KIT_R2000_PORT; else the port the disassembler was started on for this game or part
    (its work/r2000-port); else the one the launcher last started on; else 3000 (kit/c64/tools.py)."""
    if os.environ.get("KIT_R2000_PORT"):
        return int(os.environ["KIT_R2000_PORT"])
    here = os.path.dirname(os.path.abspath(__file__))
    for f in ([os.path.join(gdir, "work", "r2000-port")] if gdir else []) + [os.path.join(here, "..", "..", "tools", "r2000-port")]:
        try:
            return int(open(f).read())
        except (OSError, ValueError):
            # one part of a game (kit/scripts/parts.py) never falls back to the clone's last
            # disassembler: that is another part's session, and it would be read as this one's
            if gdir and f.startswith(os.path.join(gdir, "")) and os.path.isfile(os.path.join(gdir, "part.json")):
                sys.exit(f"no disassembler is running on a snapshot of {gdir} (`tools.py r2000 <its snapshot>` starts one).\n"
                         "To read this part's share of another part's session, name that part's folder:\n"
                         "  symbols_export.py <this part> --from <that part>      coverage.py <this part> --live --from <that part>")
    return 3000


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
    vocabulary. symbols_export.py calls this for a c64 game, with the game's or the part's folder."""
    rpc = make_client(gdir)
    blocks = json.loads(call(rpc, "r2000_get_blocks", {}))
    syms = json.loads(call(rpc, "r2000_get_symbols", {}))
    comments = json.loads(call(rpc, "r2000_get_comments", {}))
    return ([{"start": b["start_address"], "end": b["end_address"], "type": b["type"]} for b in blocks],
            [{"address": s["address"], "name": s["name"], "type": s["type"],
              "kind": s.get("kind", "user").lower()} for s in syms],
            [{"address": c["address"], "type": c["type"], "text": c["comment"]}
             for c in comments if c["comment"].strip()])


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
