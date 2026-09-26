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

Requires `regenerator2000 --mcp-server <file>` listening on :3000.

Calls that come back as an error are not logged, so a replay does not
reproduce your mistakes. A batch is logged as a whole, so check its result.
"""
import json, os, sys, urllib.request

URL = "http://127.0.0.1:3000/mcp"
MUTATING = {"r2000_set_label_name", "r2000_set_comment", "r2000_set_data_type",
            "r2000_disassemble", "r2000_batch_execute", "r2000_toggle_splitter",
            "r2000_add_scope", "r2000_set_immediate_format", "r2000_apply_enum_usage",
            "r2000_create_project_enum", "r2000_update_project_enum", "r2000_delete_project_enum"}


def make_client():
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
        req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers=headers)
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


def game_dir(explicit=None):
    for cand in (explicit, os.environ.get("GAME_DIR"), os.getcwd()):
        if cand and os.path.exists(os.path.join(cand, "game.json")):
            return cand
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
    rpc = make_client()
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
    rpc = make_client()
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
