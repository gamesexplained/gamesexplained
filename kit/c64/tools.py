#!/usr/bin/env python3
"""The Commodore 64 launcher: start, check and stop the emulator and the disassembler, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform; do not run this file directly.

Everything the kit installs lives under tools/ (gitignored):
  tools/vice-mcp/    the emulator build, unpacked from the upstream release, or a link
                     to a build of the contributor's own (`tools.py use-vice <dir>`)
  tools/vice-home/   the emulator's config, log and snapshots (XDG paths pointed here)
  tools/cargo/bin/   the disassembler, from `cargo install --root tools/cargo regenerator2000`
  tools/logs/        terminal logs of both
Deleting the repository removes all of it. See kit/c64/INSTALL.md, "Uninstall".

Usage:
  tools.py status
  tools.py vice [x64sc]            start the emulator with its MCP server on 127.0.0.1:6510
  tools.py r2000 <file>            start the disassembler's MCP server on :3000 on a .vsf/.prg/project
  tools.py stop [vice|r2000|all]
  tools.py use-vice <dir>          use a vice-mcp build of your own: link tools/vice-mcp to it
  tools.py use-vice release        go back to the release (kept at tools/vice-mcp-release)
  tools.py check-emulator          test the emulator against kit/EMULATOR.md (kit/c64/check_emulator.py)
  tools.py snapshots               where emulator snapshots are, and what is there
  tools.py verify-footprint        prove the tools write nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked on any operating system: it starts the emulator, makes it write a snapshot,
stops it, and then lists every file outside the repository that changed meanwhile and
looks like it belongs to one of the tools. An empty list is the pass.
"""
import os, shutil, socket, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.join(ROOT, "tools")
VICE_DIR = os.path.join(TOOLS, "vice-mcp")
VICE_RELEASE = os.path.join(TOOLS, "vice-mcp-release")
VICE_HOME = os.path.join(TOOLS, "vice-home")
LOGS = os.path.join(TOOLS, "logs")
SNAPSHOTS = os.path.join(VICE_HOME, "config", "vice", "mcp_snapshots")


def up(port):
    s = socket.socket(); s.settimeout(0.5)
    try:
        s.connect(("127.0.0.1", port)); return True
    except OSError:
        return False
    finally:
        s.close()


def with_pty(cmd, log):
    """Both tools need a pseudo-terminal even when driven over MCP."""
    if sys.platform == "darwin":
        return ["script", "-q", log] + cmd
    if shutil.which("script"):
        return ["script", "-q", "-c", " ".join(f'"{c}"' for c in cmd), log]
    return cmd  # no `script` (Windows): try without; report what happens in kit-feedback.md


def start(cmd, log, env=None, cwd=None, port=None, name=""):
    os.makedirs(LOGS, exist_ok=True)
    if port and up(port):
        print(f"{name} already answering on :{port}"); return
    subprocess.Popen(with_pty(cmd, log), cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(40):
        if up(port):
            print(f"{name} up on :{port}  (log: {os.path.relpath(log, ROOT)})"); return
        time.sleep(0.5)
    sys.exit(f"{name} did not come up on :{port}; read {os.path.relpath(log, ROOT)}")


def vice(machine="x64sc"):
    exe = os.path.join(VICE_DIR, "bin", machine)
    if not os.path.exists(exe):
        sys.exit(f"no emulator at {os.path.relpath(exe, ROOT)}; see kit/c64/INSTALL.md, 'Get the emulator'")
    env = dict(os.environ)
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(VICE_HOME, sub); os.makedirs(env[var], exist_ok=True)
    start([exe, "-mcpserver"], os.path.join(LOGS, "vice.log"), env=env, cwd=VICE_DIR, port=6510, name="emulator")


def r2000(path):
    local = os.path.join(TOOLS, "cargo", "bin", "regenerator2000")
    exe = local if os.path.exists(local) else shutil.which("regenerator2000")
    if not exe:
        sys.exit("no regenerator2000; run: cargo install --root tools/cargo regenerator2000")
    if up(3000):
        sys.exit("something already answers on :3000; only one disassembler can run. `tools.py stop r2000` first")
    start([exe, "--mcp-server", os.path.abspath(path)], os.path.join(LOGS, "r2000.log"), port=3000, name="disassembler")


def stop(which="all"):
    pats = {"vice": ["mcpserver"], "r2000": ["regenerator2000 --mcp-server"]}
    for k in (pats if which == "all" else [which]):
        for p in pats[k]:
            subprocess.run(["pkill", "-f", "--", p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1); status()


def vice_build():
    """Which emulator build tools/vice-mcp is: the release, or a build of the contributor's own."""
    if not os.path.isdir(VICE_DIR):
        return "MISSING"
    if not os.path.islink(VICE_DIR):
        return "release"
    real = os.path.realpath(VICE_DIR)
    git = lambda *a: subprocess.run(["git", "-C", real, *a], capture_output=True, text=True).stdout.strip()
    commit, branch = git("rev-parse", "--short", "HEAD"), git("rev-parse", "--abbrev-ref", "HEAD")
    return f"own build at {real}" + (f" (git {commit} on {branch})" if commit else "")


def use_vice(target):
    """Point tools/vice-mcp at a build of the contributor's own, or back at the release."""
    if target == "release":
        if not os.path.islink(VICE_DIR):
            print("tools/vice-mcp is already the release"); return
        if not os.path.isdir(VICE_RELEASE):
            sys.exit("no release kept at tools/vice-mcp-release; download it (kit/c64/INSTALL.md, 'Get the emulator')")
        os.remove(VICE_DIR); os.rename(VICE_RELEASE, VICE_DIR)
    else:
        target = os.path.abspath(os.path.expanduser(target))
        if not os.path.exists(os.path.join(target, "bin", "x64sc")):
            sys.exit(f"no bin/x64sc under {target}; point at the build's install folder")
        if os.path.islink(VICE_DIR):
            os.remove(VICE_DIR)
        elif os.path.isdir(VICE_DIR):
            if os.path.exists(VICE_RELEASE):
                sys.exit("tools/vice-mcp and tools/vice-mcp-release both exist; remove one first")
            os.rename(VICE_DIR, VICE_RELEASE)
            print("the release is kept at tools/vice-mcp-release; `tools.py use-vice release` goes back to it")
        os.symlink(target, VICE_DIR)
    if up(6510):
        print("the emulator is still running the old build: `tools.py stop vice` and `tools.py vice`")
    print("emulator build:", vice_build())


def status():
    print(f"emulator      :6510  {'up' if up(6510) else 'down'}   build: {vice_build()} (tools/vice-mcp)")
    local = os.path.join(TOOLS, "cargo", "bin", "regenerator2000")
    where = "tools/cargo/bin" if os.path.exists(local) else (shutil.which("regenerator2000") or "MISSING")
    print(f"disassembler  :3000  {'up' if up(3000) else 'down'}   binary: {where}")


def home_candidates():
    """Where tools habitually leave things, per operating system."""
    h = os.path.expanduser("~")
    if sys.platform == "darwin":
        return [os.path.join(h, d) for d in (".config", ".local", ".cache", "Library/Preferences", "Library/Caches",
                                             "Library/Application Support", "Library/Saved Application State", "Library/Logs")]
    if sys.platform.startswith("win"):
        return [p for p in (os.environ.get("APPDATA"), os.environ.get("LOCALAPPDATA"),
                            os.path.join(h, ".config"), os.path.join(h, "Documents")) if p]
    return [os.path.join(h, d) for d in (".config", ".local", ".cache")] + [h]


# Leftovers we know about and list under "Uninstall" in kit/c64/INSTALL.md. Anything else is a failure.
KNOWN_RESIDUE = ("Library/Application Support/regenerator2000/",   # macOS
                 ".config/regenerator2000/",                        # Linux, expected; unverified
                 "regenerator2000\\config")                         # Windows, expected; unverified


def verify_footprint():
    import json
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    t0 = time.time() - 1
    was_up = up(6510)
    if was_up:
        sys.exit("stop the emulator first (tools.py stop vice): the check has to see a whole launch-to-exit cycle")
    vice()
    from vice import connect, call
    rpc = connect()
    name = f"footprint_check_{int(t0)}"
    out = call(rpc, "vice_snapshot_save", {"name": name, "description": "verify-footprint"})
    try:
        where = json.loads(out).get("path", "")
    except Exception:
        where = out[:200]
    print("snapshot written to:", where)
    if where and os.path.exists(where) and not up(3000):
        r2000(where)                       # exercise the disassembler too
        stop("r2000")
    stop("vice")
    inside = os.path.realpath(ROOT)
    words = ("vice", "x64", "regenerator", "r2000")
    hits = []
    for base in home_candidates():
        depth0 = base.rstrip(os.sep).count(os.sep)
        for d, dirs, files in os.walk(base):
            if os.path.realpath(d).startswith(inside):
                dirs[:] = []; continue
            if d.count(os.sep) - depth0 >= 4:
                dirs[:] = []
            for f in files:
                p = os.path.join(d, f)
                if any(w in p.lower() for w in words):
                    try:
                        if os.path.getmtime(p) >= t0:
                            hits.append(p)
                    except OSError:
                        pass
    ok_inside = os.path.realpath(where).startswith(inside) if where else False
    print("snapshot inside the repository:", "yes" if ok_inside else "NO")
    known = [p for p in hits if any(k in p.replace(os.sep, "/") or k in p for k in KNOWN_RESIDUE)]
    hits = [p for p in hits if p not in known]
    for p in known:
        print("known leftover (listed under Uninstall):", p)
    if hits:
        print("files written OUTSIDE the repository during the run, not on the Uninstall list:")
        for p in hits: print("  ", p)
    else:
        print("unexpected files written outside the repository: none")
    for f in (name + ".vsf", name + ".json"):
        try: os.remove(os.path.join(SNAPSHOTS, f))
        except OSError: pass
    if hits or not ok_inside:
        sys.exit("FOOTPRINT NOT CLEAN - contain it (see kit/INSTALL.md, 'The footprint principle') or add it to the Uninstall list")
    print("OK - the footprint is clean on this machine")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status": status()
    elif a[0] == "vice": vice(a[1] if len(a) > 1 else "x64sc")
    elif a[0] == "r2000":
        if len(a) < 2: sys.exit("usage: tools.py r2000 <file>")
        r2000(a[1])
    elif a[0] == "stop": stop(a[1] if len(a) > 1 else "all")
    elif a[0] == "verify-footprint": verify_footprint()
    elif a[0] == "use-vice":
        if len(a) < 2: sys.exit("usage: tools.py use-vice <dir> | release")
        use_vice(a[1])
    elif a[0] == "check-emulator":
        sys.exit(subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "check_emulator.py"), *a[1:]]).returncode)
    elif a[0] == "snapshots":
        print(os.path.relpath(SNAPSHOTS, ROOT))
        for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
            print("  ", f)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
