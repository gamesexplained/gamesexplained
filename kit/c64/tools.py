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
                                   (or $KIT_VICE_PORT, when something else holds 6510)
  tools.py r2000 <file>            start the disassembler's MCP server on :3000 on a .vsf/.prg/project
  tools.py stop [vice|r2000|all] [--force]
                                   the disassembler stays up while an annotation log written since
                                   it started is newer than the game's symbols.json: export first,
                                   or --force
  tools.py get-vice [download|build]   the newest vice-mcp for this machine; plain, it only says what that is (kit/c64/get_vice.py)
  tools.py use-vice <dir>          use a vice-mcp build of your own: link tools/vice-mcp to it
  tools.py use-vice release        go back to the release (kept at tools/vice-mcp-release)
  tools.py check-emulator          test the emulator against kit/EMULATOR.md (kit/c64/check_emulator.py)
  tools.py build-vice <src dir>    build a vice-mcp source tree into <src dir>/install and use it (kit/c64/build_vice.py)
  tools.py ghidra-fixture <installation>  regenerate the synthetic Ghidra importer fixture
  tools.py snapshots               where emulator snapshots are, and what is there
  tools.py verify-footprint        prove the tools write nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked on any operating system: it starts the emulator, makes it write a snapshot,
stops it, and then lists every file outside the repository that changed meanwhile and
looks like it belongs to one of the tools. An empty list is the pass.
"""
import os, re, shutil, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "vice", "r2000", "stop", "verify-footprint", "use-vice", "check-emulator",
            "get-vice", "build-vice", "snapshots", "ghidra-fixture")
TOOL_NAMES = ("vice", "r2000")   # what `stop` takes

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.join(ROOT, "tools")
VICE_DIR = os.path.join(TOOLS, "vice-mcp")
VICE_RELEASE = os.path.join(TOOLS, "vice-mcp-release")
VICE_HOME = os.path.join(TOOLS, "vice-home")
LOGS = os.path.join(TOOLS, "logs")
SNAPSHOTS = os.path.join(VICE_HOME, "config", "vice", "mcp_snapshots")
# The emulator's MCP port: KIT_VICE_PORT when it is set, for a machine where something else already
# holds 6510, else the port the last `tools.py vice` used (tools/vice-port, which it writes), else
# 6510. kit/c64/vice.py resolves it the same way, so a shell that loses the variable between two
# commands still reaches this clone's emulator and not whatever holds 6510.
PORT_FILE = os.path.join(TOOLS, "vice-port")


def vice_port():
    if os.environ.get("KIT_VICE_PORT"):
        return int(os.environ["KIT_VICE_PORT"])
    try:
        return int(open(PORT_FILE).read())
    except (OSError, ValueError):
        return 6510


VICE_PORT = vice_port()
RELEASE_NOTE = ".kit-release"    # written by get-vice into a downloaded release: "<tag> <asset>"

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
from launcher import (up, start, foreign_detail, missing_libraries, kill_matching,   # noqa: E402
                      elapsed, footprint_signatures, written_outside, judge_footprint)
import launcher  # noqa: E402


def say_missing(libs):
    return launcher.say_missing(libs, "kit/c64/INSTALL.md, 'The release zip'")


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


def vice(machine="x64sc"):
    exe = os.path.join(VICE_DIR, "bin", machine)
    if not os.path.exists(exe):
        sys.exit(f"no emulator at {os.path.relpath(exe, ROOT)}; see kit/c64/INSTALL.md, 'Get the emulator'")
    libs = missing_libraries(exe)
    if libs:
        sys.exit(say_missing(libs))
    detail = foreign_detail(VICE_PORT)
    if detail:
        # the MCP server and this clone's scripts would drive that machine, and its snapshots land in its own clone
        sys.exit(f"an emulator started from another folder already answers on :{VICE_PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop vice`) before starting this clone's")
    os.makedirs(TOOLS, exist_ok=True)
    with open(PORT_FILE, "w") as f:
        f.write(str(VICE_PORT))
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
    start(virtual_display([exe, "-mcpserver", "-mcpserverport", str(VICE_PORT)], env), os.path.join(LOGS, "vice.log"), env=env, cwd=VICE_DIR,
          port=VICE_PORT, name="emulator")


def r2000_exe():
    """The disassembler: tools/cargo/bin first, then one on the path; None when there is neither."""
    local = os.path.join(TOOLS, "cargo", "bin", "regenerator2000")
    return local if os.path.exists(local) else shutil.which("regenerator2000")


def r2000(path):
    exe = r2000_exe()
    if not exe:
        sys.exit("no regenerator2000; run: cargo install --root tools/cargo regenerator2000")
    if up(3000):
        detail = foreign_detail(3000)
        if detail:
            sys.exit(f"a disassembler started from another folder already answers on :3000:\n{detail}\n"
                     "stop it there (its own `tools.py stop r2000`) before starting this clone's")
        sys.exit("something already answers on :3000; only one disassembler can run. `tools.py stop r2000` first")
    start([exe, "--mcp-server", os.path.abspath(path)], os.path.join(LOGS, "r2000.log"), port=3000, name="disassembler")


# only this clone's tools: another clone on the same machine keeps its emulator and disassembler
# scoped by path rather than anchored to the start of the command line: the launcher runs the
# emulator through `script`, and on a macOS release build bin/x64sc is a shell wrapper that execs
# VICE.app/Contents/Resources/bin/x64sc, so the process holding :6510 has neither of those as its
# first word. Every match still has to lie under this clone's tools/, so no other clone is touched.
# The emulator alone is killed (kill_matching): its wrappers (script, xvfb-run) exit with it. Killing
# xvfb-run as well stops it before it can shut its Xvfb down and delete its folder under /tmp,
# which left one of each behind per start on Linux (2 October 2026). On macOS the release's two
# shell wrappers match the pattern and are signalled with the emulator; `script` exits after them,
# and nothing was left (v3.13.2 dmg, 2 October 2026).
STOP_PATTERNS = {"vice": re.escape(VICE_DIR + os.sep) + ".*-mcpserver",
                 "r2000": "regenerator2000 --mcp-server " + re.escape(os.path.join(ROOT, ""))}


def r2000_running():
    """(file, start time) of this clone's disassembler: the file it was started on, and when it started.
    ("", 0) when one answers but ps cannot tell which or since when; None when none runs."""
    try:
        out = subprocess.run(["ps", "-A", "-ww", "-o", "etime=,command="], capture_output=True, text=True).stdout
    except OSError:
        return ("", 0) if up(3000) else None
    for line in out.splitlines():
        m = re.search(STOP_PATTERNS["r2000"] + ".*$", line)
        if m:
            try:
                started = time.time() - elapsed(line.split()[0]) - 1   # etime drops the fraction
            except ValueError:
                started = 0
            return m.group(0).split(" --mcp-server ", 1)[1], started
    return None


def unexported(path, started):
    """Games whose annotation logs are newer than their symbols.json, as (game dir, newest log, export time).

    Every log r2000.py writes lands in the game's work/ as a .jsonl, after the call it records. A log
    newer than the last export, written since the disassembler started, is work it holds that stopping
    it would lose. Logs from before the start went to an earlier session: a fresh one does not hold
    them (exporting it would overwrite a good symbols.json), and one rebuilt from them with
    r2000.py --replay can be rebuilt again. The game is the one the disassembler was started on; a
    file outside games/ leaves every game in the clone."""
    parts = os.path.relpath(path, ROOT).split(os.sep) if path else []
    if len(parts) > 3 and parts[0] == "games" and os.path.isfile(os.path.join(ROOT, *parts[:3], "game.json")):
        games = [os.path.join(ROOT, *parts[:3])]
    else:
        base = os.path.join(ROOT, "games")
        games = [os.path.join(base, p, s) for p in sorted(os.listdir(base)) if os.path.isdir(os.path.join(base, p))
                 for s in sorted(os.listdir(os.path.join(base, p)))
                 if os.path.isfile(os.path.join(base, p, s, "game.json"))] if os.path.isdir(base) else []
    found = []
    for g in games:
        work = os.path.join(g, "work")
        logs = [os.path.join(work, f) for f in os.listdir(work) if f.endswith(".jsonl")] if os.path.isdir(work) else []
        if not logs:
            continue
        newest = max(logs, key=os.path.getmtime)
        sym = os.path.join(g, "symbols.json")
        exported = os.path.getmtime(sym) if os.path.exists(sym) else None
        if os.path.getmtime(newest) > max(exported or 0, started):
            found.append((g, newest, exported))
    return found


def stop(which="all", force=False):
    if which not in STOP_PATTERNS and which != "all":
        sys.exit("usage: tools.py stop [vice|r2000|all] [--force]")
    kinds = list(STOP_PATTERNS) if which == "all" else [which]
    held = []
    if "r2000" in kinds and not force:
        running = r2000_running()
        held = unexported(*running) if running else []
        if held:
            kinds.remove("r2000")    # the disassembler stays up; anything else asked for still stops
    for k in kinds:
        kill_matching(STOP_PATTERNS[k])
    if kinds:
        time.sleep(1)
    status()
    if held:
        when = lambda t: time.strftime("%H:%M:%S", time.localtime(t))
        lines = ["", "the disassembler is still running: it holds annotations made since the last export"]
        for g, log, exported in held:
            lines.append(f"  {os.path.relpath(g, ROOT)}: {os.path.basename(log)} written {when(os.path.getmtime(log))}, "
                         + (f"symbols.json exported {when(exported)}" if exported else "never exported (no symbols.json)"))
        lines += ["export first:"]
        lines += [f"  python3 kit/scripts/symbols_export.py {os.path.relpath(g, ROOT)}" for g, _, _ in held]
        lines += ["or stop it anyway, and rebuild from the logs later (r2000.py --replay):",
                  "  python3 kit/scripts/tools.py stop r2000 --force"]
        sys.exit("\n".join(lines))


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
    if up(VICE_PORT):
        print("the emulator is still running the old build: `tools.py stop vice` and `tools.py vice`")
    print("emulator build:", vice_build())


def status():
    print(f"emulator      :{VICE_PORT}  {'up' if up(VICE_PORT) else 'down'}   build: {vice_build()} (tools/vice-mcp)")
    detail = foreign_detail(VICE_PORT)
    if detail:
        print(f"  WARNING: :{VICE_PORT} is answered by an emulator from another folder:\n{detail}")
    local = os.path.join(TOOLS, "cargo", "bin", "regenerator2000")
    where = "tools/cargo/bin" if os.path.exists(local) else (shutil.which("regenerator2000") or "MISSING")
    print(f"disassembler  :3000  {'up' if up(3000) else 'down'}   binary: {where}")
    detail = foreign_detail(3000)
    if detail:
        print(f"  WARNING: :3000 is answered by a disassembler from another folder:\n{detail}")


# Leftovers we know about and list under "Uninstall" in kit/c64/INSTALL.md. Anything else is a failure.
KNOWN_RESIDUE = ("Library/Application Support/regenerator2000/",   # macOS
                 ".config/regenerator2000/",                        # Linux, expected; unverified
                 "regenerator2000\\config")                         # Windows, expected; unverified


def verify_footprint():
    import json
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    t0 = time.time() - 1
    was_up = up(VICE_PORT)
    if was_up:
        sys.exit("stop the emulator first (tools.py stop vice): the check has to see a whole launch-to-exit cycle")
    words = ("vice", "x64", "regenerator", "r2000")
    before = footprint_signatures(words)
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
    # exercise the disassembler too, where it can be; the check still covers the emulator where it cannot
    covered = "the emulator only"
    if not r2000_exe():
        print("no regenerator2000, so the disassembler is not checked; install it (kit/c64/INSTALL.md) "
              "and run this again to cover it")
    elif up(3000):
        print("a disassembler already answers on :3000, so it is not checked; stop it and run this again to cover it")
    elif where and os.path.exists(where):
        r2000(where)
        stop("r2000", force=True)          # its own, on a throwaway snapshot: nothing to export
        covered = "the emulator and the disassembler"
    stop("vice")
    hits = written_outside(before, words)
    for f in (name + ".vsf", name + ".json"):
        try: os.remove(os.path.join(SNAPSHOTS, f))
        except OSError: pass
    judge_footprint(hits, KNOWN_RESIDUE, where, covered)


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status": status()
    elif a[0] == "vice": vice(a[1] if len(a) > 1 else "x64sc")
    elif a[0] == "r2000":
        if len(a) < 2: sys.exit("usage: tools.py r2000 <file>")
        r2000(a[1])
    elif a[0] == "stop":
        rest = [x for x in a[1:] if x != "--force"]
        stop(rest[0] if rest else "all", force="--force" in a[1:])
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
    elif a[0] == "ghidra-fixture":
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ghidra_export", "regenerate_fixture.py")
        sys.exit(subprocess.run([sys.executable, script, *a[1:]]).returncode)
    elif a[0] == "snapshots":
        print(os.path.relpath(SNAPSHOTS, ROOT))
        for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
            print("  ", f)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
