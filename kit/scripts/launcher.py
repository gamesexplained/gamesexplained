"""What every platform's launcher (kit/<platform>/tools.py) shares: port probing, the
pseudo-terminal wrapper, process start and stop, telling this clone's tools from another
clone's, the shared-library check, and the walk that verify-footprint does outside the
repository. Platform launchers import it; nothing here knows a machine or a tool.

A launcher adds kit/scripts to the end of sys.path, never the front: the dispatcher there is
also called tools.py, and a platform's own scripts `import tools` to reach their launcher.

    sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
    import launcher
"""
import os, shlex, shutil, socket, subprocess, sys, tempfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WRAPPERS = ("script", "xvfb-run")      # what launchers put round a tool; stopping a tool leaves them to exit


def up(port):
    """Something answers on this local port."""
    s = socket.socket(); s.settimeout(0.5)
    try:
        s.connect(("127.0.0.1", port)); return True
    except OSError:
        return False
    finally:
        s.close()


def with_pty(cmd, log):
    """Tools that want a terminal even when driven over a socket get one, logged to `log`."""
    if sys.platform == "darwin":
        return ["script", "-q", log] + cmd
    if shutil.which("script"):
        return ["script", "-q", "-c", shlex.join(cmd), log]
    return cmd  # no `script` (Windows): try without; report what happens in kit-feedback.md


def start(cmd, log, env=None, cwd=None, port=None, name=""):
    """Start a tool detached, in a pseudo-terminal, and wait up to 20 s for it to answer on `port`."""
    os.makedirs(os.path.dirname(log), exist_ok=True)
    if port and up(port):
        print(f"{name} already answering on :{port}"); return
    subprocess.Popen(with_pty(cmd, log), cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(40):
        if up(port):
            print(f"{name} up on :{port}  (log: {os.path.relpath(log, ROOT)})"); return
        time.sleep(0.5)
    sys.exit(f"{name} did not come up on :{port}; read {os.path.relpath(log, ROOT)}")


def kill_matching(pattern):
    """Signal the processes whose command line matches, except the wrappers the launcher put round them."""
    pids = subprocess.run(["pgrep", "-f", "--", pattern], capture_output=True, text=True).stdout.split()
    for pid in pids:
        comm = subprocess.run(["ps", "-o", "comm=", "-p", pid], capture_output=True, text=True).stdout.strip()
        if os.path.basename(comm) not in WRAPPERS:
            subprocess.run(["kill", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def elapsed(etime):
    """Seconds in a ps etime, [[dd-]hh:]mm:ss."""
    days, _, clock = etime.rpartition("-")
    secs = 0
    for part in clock.split(":"):
        secs = secs * 60 + int(part)
    return secs + int(days or 0) * 86400


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


def foreign_detail(port):
    """For a tool on `port` started from another clone: its command line, the clone's folder and how long the
    process has been up, so leftovers can be told from someone's live run. Empty when the tool is this
    clone's, or nothing listens."""
    owner = port_owner(port) if up(port) else None
    if not foreign(owner):
        return ""
    lines = [f"  {owner}"]
    try:
        pid = subprocess.run(["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
                             capture_output=True, text=True).stdout.split()[0]
        etime = subprocess.run(["ps", "-o", "etime=", "-p", pid], capture_output=True, text=True).stdout.strip()
        if etime:
            lines.append(f"  process {pid}, up {etime} ([[days-]hours:]minutes:seconds)")
    except (OSError, IndexError):
        pass
    head = owner[:owner.find("/tools/")] if "/tools/" in owner else ""
    clone = head[head.rfind(" /") + 1:] if head else ""
    if clone and os.path.isfile(os.path.join(clone, "AGENTS.md")):
        lines.append(f"  from the clone at {clone}")
    return "\n".join(lines)


def missing_libraries(exe):
    """Shared libraries the dynamic linker cannot find for exe. Empty where there is no ldd to ask
    (macOS, Windows)."""
    if not exe or not sys.platform.startswith("linux") or not shutil.which("ldd"):
        return []
    out = subprocess.run(["ldd", exe], capture_output=True, text=True).stdout
    return sorted({line.split("=>")[0].strip() for line in out.splitlines() if "not found" in line})


def say_missing(libs, where):
    """The message for missing libraries; `where` names the install notes that carry the package list."""
    return ("the emulator needs shared libraries this machine does not have:\n  " + " ".join(libs) +
            "\ninstalling them is outside this repository, so ask the contributor first; on Ubuntu 24.04 "
            f"the whole set is one apt-get line in {where}")


def unpack_dmg(path, dest, scratch):
    """Copy a macOS release .dmg's top-level entries into dest, skipping dotfiles and symlinks.

    A drag-to-install dmg carries an `Applications -> /Applications` symlink, and ditto follows a
    symlink to a directory: copying it once put a contributor's whole /Applications (19 GB) into
    tools/downloads. `scratch` is a folder inside tools/ for the mount point."""
    os.makedirs(scratch, exist_ok=True)
    mnt = tempfile.mkdtemp(dir=scratch)
    subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", mnt, path], check=True,
                   stdout=subprocess.DEVNULL)
    try:
        for f in sorted(os.listdir(mnt)):
            src = os.path.join(mnt, f)
            if f.startswith(".") or os.path.islink(src):
                continue
            subprocess.run(["ditto", src, os.path.join(dest, f)], check=True)
    finally:
        subprocess.run(["hdiutil", "detach", mnt], stdout=subprocess.DEVNULL)
        os.rmdir(mnt)


# ---- verify-footprint -------------------------------------------------------------------------

def home_candidates():
    """Where tools habitually leave things, per operating system."""
    h = os.path.expanduser("~")
    if sys.platform == "darwin":
        return [os.path.join(h, d) for d in (".config", ".local", ".cache", "Library/Preferences", "Library/Caches",
                                             "Library/Application Support", "Library/Saved Application State",
                                             "Library/Logs", "Desktop", "Documents")]
    if sys.platform.startswith("win"):
        return [p for p in (os.environ.get("APPDATA"), os.environ.get("LOCALAPPDATA"),
                            os.path.join(h, ".config"), os.path.join(h, "Documents")) if p]
    return [os.path.join(h, d) for d in (".config", ".local", ".cache")] + [h]


def footprint_signatures(words):
    """Every file outside this repository, under the usual home folders and up to four levels down,
    whose path names one of `words` (lower case), with its size and change times.

    Take one before the tool starts and compare with written_outside() after it stops: a file is
    blamed on the run only when its signature changed, so a file with an old or a future
    timestamp that the run never touched is not (the method #125 brought to the C64's check)."""
    inside = os.path.normcase(os.path.realpath(ROOT))
    found = {}
    for base in home_candidates():
        depth0 = base.rstrip(os.sep).count(os.sep)
        for d, dirs, files in os.walk(base):
            resolved = os.path.normcase(os.path.realpath(d))
            if resolved == inside or resolved.startswith(inside + os.sep):
                dirs[:] = []; continue
            if d.count(os.sep) - depth0 >= 4:
                dirs[:] = []
            for f in files:
                path = os.path.join(d, f)
                if any(w in path.lower() for w in words):
                    try:
                        st = os.stat(path)
                        found[path] = (st.st_size, st.st_mtime_ns, st.st_ctime_ns)
                    except OSError:
                        pass
    return found


def written_outside(before, words):
    """The files whose signature changed, or that appeared, since footprint_signatures(words) gave `before`."""
    return sorted(path for path, sig in footprint_signatures(words).items() if before.get(path) != sig)


def judge_footprint(hits, known_residue, snapshot, covered=""):
    """Print the verdict on a footprint walk and exit non-zero when it is not clean.

    known_residue lists the leftovers the platform's install notes put under "Uninstall"; anything else
    found is a failure, and so is a snapshot that did not land inside the repository. Clean up the
    check's own files before calling this: a failure exits."""
    inside = os.path.normcase(os.path.realpath(ROOT))
    ok_inside = bool(snapshot) and os.path.normcase(os.path.realpath(snapshot)).startswith(inside + os.sep)
    print("snapshot inside the repository:", "yes" if ok_inside else "NO")
    known = [p for p in hits if any(k in p.replace(os.sep, "/") or k in p for k in known_residue)]
    hits = [p for p in hits if p not in known]
    for p in known:
        print("known leftover (listed under Uninstall):", p)
    if hits:
        print("files written OUTSIDE the repository during the run, not on the Uninstall list:")
        for p in hits:
            print("  ", p)
    else:
        print("unexpected files written outside the repository: none")
    if hits or not ok_inside:
        sys.exit("FOOTPRINT NOT CLEAN - contain it (see kit/INSTALL.md, 'The footprint principle') "
                 "or add it to the Uninstall list")
    print("OK - the footprint is clean on this machine" + (f", for {covered}" if covered else ""))
