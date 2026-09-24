#!/usr/bin/env python3
"""The Commodore 64 launcher: start, check and stop the emulator and the disassembler, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform; do not run this file directly.

Everything the kit installs lives under tools/ (gitignored):
  tools/vice-mcp/    the emulator build, unpacked from the upstream release (`tools.py get-vice`),
                     or a link to a build (`get-vice build`, or `use-vice <dir>` for one of your own)
  tools/src/         vice-mcp source and its build, when built here
  tools/vice-home/   the emulator's config, log and snapshots (XDG paths pointed here)
  tools/cargo/bin/   the disassembler, from `cargo install --root tools/cargo regenerator2000`
  tools/logs/        terminal logs of both
Deleting the repository removes all of it. See kit/c64/INSTALL.md, "Uninstall".

Usage:
  tools.py status
  tools.py vice [x64sc]            start the emulator with its MCP server on 127.0.0.1:6510
  tools.py r2000 <file>            start the disassembler's MCP server on :3000 on a .vsf/.prg/project
  tools.py stop [vice|r2000|all]
  tools.py get-vice [download|build]   the newest vice-mcp for this machine; plain, it only says what that is (kit/c64/get_vice.py)
  tools.py use-vice <dir>          use a vice-mcp build of your own: link tools/vice-mcp to it
  tools.py use-vice release        go back to the release (kept at tools/vice-mcp-release)
  tools.py check-emulator          test the emulator against kit/EMULATOR.md (kit/c64/check_emulator.py)
  tools.py build-vice <src dir>    build a vice-mcp source tree into <src dir>/install and use it (kit/c64/build_vice.py)
  tools.py snapshots               where emulator snapshots are, and what is there
  tools.py verify-footprint        prove the tools write nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked on any operating system: it starts the emulator, makes it write a snapshot,
stops it, and then lists every file outside the repository that changed meanwhile and
looks like it belongs to one of the tools. An empty list is the pass.
"""
import os, re, shutil, socket, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.join(ROOT, "tools")
VICE_DIR = os.path.join(TOOLS, "vice-mcp")
VICE_RELEASE = os.path.join(TOOLS, "vice-mcp-release")
VICE_HOME = os.path.join(TOOLS, "vice-home")
LOGS = os.path.join(TOOLS, "logs")
SNAPSHOTS = os.path.join(VICE_HOME, "config", "vice", "mcp_snapshots")
RELEASE_NOTE = ".kit-release"    # written by get-vice into a downloaded release: "<tag> <asset>"


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


def virtual_display(cmd, env):
    """The GUI build needs an X display. A Linux server or container has none; give it a virtual one.

    xvfb-run starts Xvfb on a free display number, runs the emulator on it and stops it when the
    emulator exits. Nothing is drawn anywhere, and screenshots still work: VICE renders them itself."""
    if not sys.platform.startswith("linux") or env.get("DISPLAY") or env.get("WAYLAND_DISPLAY"):
        return cmd
    if not shutil.which("xvfb-run"):
        sys.exit("no display and no xvfb-run: install Xvfb (Debian/Ubuntu: xvfb), or run with a desktop session")
    env["NO_AT_BRIDGE"] = "1"      # no accessibility bus in a container; GTK waits for it otherwise
    return ["xvfb-run", "-a", "-s", "-screen 0 1280x1024x24"] + cmd


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


def port_owner(port):
    """The command line of whatever listens on a local port, or None when it cannot be told (no lsof)."""
    try:
        pids = subprocess.run(["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
                              capture_output=True, text=True).stdout.split()
        if not pids:
            return None
        return subprocess.run(["ps", "-o", "command=", "-p", pids[0]], capture_output=True, text=True).stdout.strip()
    except OSError:
        return None


def foreign(owner):
    """True when a listening tool was started from somewhere other than this clone."""
    return bool(owner) and os.path.join(ROOT, "") not in owner and os.path.join(os.path.realpath(ROOT), "") not in owner


def missing_libraries(exe):
    """Shared libraries the dynamic linker cannot find for exe: the release zip bundles none, so a
    Linux machine may lack some. Empty where there is no ldd to ask (macOS, Windows)."""
    if not sys.platform.startswith("linux") or not shutil.which("ldd"):
        return []
    out = subprocess.run(["ldd", exe], capture_output=True, text=True).stdout
    return sorted({line.split("=>")[0].strip() for line in out.splitlines() if "not found" in line})


def say_missing(libs):
    return ("the emulator needs shared libraries this machine does not have:\n  " + " ".join(libs) +
            "\ninstalling them is outside this repository, so ask the contributor first; on Ubuntu 24.04 "
            "the whole set is one apt-get line in kit/c64/INSTALL.md, 'The release zip'")


def vice(machine="x64sc"):
    exe = os.path.join(VICE_DIR, "bin", machine)
    if not os.path.exists(exe):
        sys.exit(f"no emulator at {os.path.relpath(exe, ROOT)}; see kit/c64/INSTALL.md, 'Get the emulator'")
    libs = missing_libraries(exe)
    if libs:
        sys.exit(say_missing(libs))
    owner = port_owner(6510) if up(6510) else None
    if foreign(owner):
        # the MCP server and this clone's scripts would drive that machine, and its snapshots land in its own clone
        sys.exit(f"an emulator started from another folder already answers on :6510:\n  {owner}\n"
                 "stop it there (its own `tools.py stop vice`) before starting this clone's")
    env = dict(os.environ)
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(VICE_HOME, sub); os.makedirs(env[var], exist_ok=True)
    # The Linux release is built for /usr/local and looks for its ROMs, keymaps and fonts there, not
    # beside the binary, so unpacked in tools/ it stops with "Couldn't load kernal ROM". VICE searches
    # $XDG_DATA_HOME/vice before its built-in folder: point that at the build's own share/vice.
    # Harmless for a build that already finds its data (the same files, found first).
    data, share = os.path.join(env["XDG_DATA_HOME"], "vice"), os.path.join(VICE_DIR, "share", "vice")
    if os.path.isdir(share) and not os.path.lexists(data):
        os.symlink(os.path.relpath(share, env["XDG_DATA_HOME"]), data)
    start(virtual_display([exe, "-mcpserver"], env), os.path.join(LOGS, "vice.log"), env=env, cwd=VICE_DIR,
          port=6510, name="emulator")


def r2000(path):
    local = os.path.join(TOOLS, "cargo", "bin", "regenerator2000")
    exe = local if os.path.exists(local) else shutil.which("regenerator2000")
    if not exe:
        sys.exit("no regenerator2000; run: cargo install --root tools/cargo regenerator2000")
    if up(3000):
        owner = port_owner(3000)
        if foreign(owner):
            sys.exit(f"a disassembler started from another folder already answers on :3000:\n  {owner}\n"
                     "stop it there (its own `tools.py stop r2000`) before starting this clone's")
        sys.exit("something already answers on :3000; only one disassembler can run. `tools.py stop r2000` first")
    start([exe, "--mcp-server", os.path.abspath(path)], os.path.join(LOGS, "r2000.log"), port=3000, name="disassembler")


def stop(which="all"):
    # only this clone's tools: another clone on the same machine keeps its emulator and disassembler
    # the emulator itself only: its wrappers (script, and xvfb-run with its X server) exit after it
    pats = {"vice": ["^" + re.escape(os.path.join(VICE_DIR, "bin")) + ".*-mcpserver"],
            "r2000": ["regenerator2000 --mcp-server " + re.escape(os.path.join(ROOT, ""))]}
    for k in (pats if which == "all" else [which]):
        for p in pats[k]:
            subprocess.run(["pkill", "-f", "--", p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1); status()


def public_url(url):
    """host/owner/repo for a git remote, credentials dropped; None for a remote on this computer."""
    if not url or url.startswith(("/", "~", ".", "file:")) or re.match(r"[A-Za-z]:[\\/]", url):
        return None
    u = re.sub(r"^[A-Za-z][\w+.-]*://", "", url)     # scheme
    u = re.sub(r"^[^@/]*@", "", u)                   # user, and a token if one is embedded
    u = re.sub(r"^([^/:]+):(?!\d+/)", r"\1/", u)     # scp style, host:owner/repo
    return re.sub(r"\.git$", "", u.rstrip("/"))


def vice_build():
    """Which emulator build tools/vice-mcp is: the release, or a build of the contributor's own.

    An own build is named by where its source can be had, never by its path here: this line
    goes into game.json and onto the About tab, and a home folder usually names a person."""
    if not os.path.isdir(VICE_DIR):
        return "MISSING"
    if not os.path.islink(VICE_DIR):
        try:
            tag, asset = open(os.path.join(VICE_DIR, RELEASE_NOTE)).read().split()[:2]
            return f"release {tag}, {asset}"
        except (OSError, ValueError):
            return "release, version not recorded (downloaded by hand): say which in game.json"
    real = os.path.realpath(VICE_DIR)
    git = lambda *a: subprocess.run(["git", "-C", real, *a], capture_output=True, text=True).stdout.strip()
    commit, branch = git("rev-parse", "--short", "HEAD"), git("rev-parse", "--abbrev-ref", "HEAD")
    if not commit:
        return "own build, not in a git tree: say in game.json where its source can be had"

    def public(rev):
        """(url, branch) of a public remote branch holding rev: a branch before a pull request."""
        found = []
        for ref in git("branch", "-r", "--contains", rev).splitlines():
            ref = ref.strip()
            if " -> " in ref or "/" not in ref:
                continue
            remote, rbranch = ref.split("/", 1)
            url = public_url(git("remote", "get-url", remote))
            if url:
                found.append((url, rbranch))
        found.sort(key=lambda f: f[1].startswith("pr/"))
        return found[0] if found else None

    def name(rbranch, rev=None):    # pull requests fetched as <remote>/pr/<n> (kit/c64/build_vice.py says how)
        m = re.match(r"pr/(\d+)$", rbranch)
        if m:
            return f"pull request #{m.group(1)}"
        tag = git("describe", "--tags", "--exact-match", rev) if rev else ""
        return f"release {tag}" if tag else f"branch {rbranch}"

    hit = public("HEAD")
    if hit:
        return f"own build of {hit[0]}, {name(hit[1], 'HEAD')}, commit {commit}"
    # A local branch: name the public commit it starts from and every head merged into it.
    merged, local = [], False
    for c in git("rev-list", "--first-parent", "--max-count=500", "HEAD").splitlines():
        base = public(c)
        if base:
            parts = []
            for p in reversed(merged):
                m = public(p)
                parts.append(f"{name(m[1])} ({p[:8]})" if m else f"commit {p[:8]} on no public remote")
                local = local or not m
            said = f"own build of {base[0]}, {name(base[1], c)}, commit {c[:8]}"
            said += f", with {', '.join(parts)} merged" if parts else ""
            if local:
                said += "; and local changes: push them, or say in game.json what they are"
            return said + f" (local commit {commit})"
        parents = git("rev-list", "--parents", "-n", "1", c).split()[1:]
        merged.extend(parents[1:])
        local = local or len(parents) < 2
    return (f"own build, commit {commit} on {branch}, on no public remote: "
            "push it, or say in game.json where its source can be had")


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
        os.makedirs(TOOLS, exist_ok=True)   # a fresh clone with no release downloaded has no tools/ yet
        os.symlink(target, VICE_DIR)
    if up(6510):
        print("the emulator is still running the old build: `tools.py stop vice` and `tools.py vice`")
    print("emulator build:", vice_build())


def status():
    print(f"emulator      :6510  {'up' if up(6510) else 'down'}   build: {vice_build()} (tools/vice-mcp)")
    owner = port_owner(6510) if up(6510) else None
    if foreign(owner):
        print(f"  WARNING: :6510 is answered by an emulator from another folder: {owner}")
    local = os.path.join(TOOLS, "cargo", "bin", "regenerator2000")
    where = "tools/cargo/bin" if os.path.exists(local) else (shutil.which("regenerator2000") or "MISSING")
    print(f"disassembler  :3000  {'up' if up(3000) else 'down'}   binary: {where}")
    owner = port_owner(3000) if up(3000) else None
    if foreign(owner):
        print(f"  WARNING: :3000 is answered by a disassembler from another folder: {owner}")


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
    elif a[0] == "get-vice":
        sys.exit(subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "get_vice.py"), *a[1:]]).returncode)
    elif a[0] == "build-vice":
        sys.exit(subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_vice.py"), *a[1:]]).returncode)
    elif a[0] == "snapshots":
        print(os.path.relpath(SNAPSHOTS, ROOT))
        for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
            print("  ", f)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
