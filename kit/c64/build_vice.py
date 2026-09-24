#!/usr/bin/env python3
"""Build the emulator from a vice-mcp source tree, the way the project's own CI builds its Linux release.

Reached as `python3 kit/scripts/tools.py build-vice <source dir>`. For when there is no release
to download for this machine, when a download is not possible from where the kit runs, or to
run fixes that are not in a release yet (pull requests merged into a local branch).

  git clone https://github.com/barryw/vice-mcp tools/src/vice-mcp
  # optional: fixes still under review, stored as origin/pr/<n> so that `status` can name them
  git -C tools/src/vice-mcp fetch origin pull/20/head:refs/remotes/origin/pr/20
  git -C tools/src/vice-mcp merge --no-edit origin/pr/20
  python3 kit/scripts/tools.py build-vice tools/src/vice-mcp

It installs into <source dir>/install and links tools/vice-mcp to it (`use-vice`), so the build
stays inside tools/ and `tools.py status` names it from the source tree's git history. The
configure line is the GTK3 GUI build from the project's .woodpecker/build-linux.yaml, less the
optional media libraries (FLAC, MP3, GIF, MIDI, ethernet) the kit never uses. Logs go to
tools/logs/vice-build.log. About ten minutes on four cores.

The build needs a compiler, the autotools and the GTK3 and libmicrohttpd headers. Those are
system packages: this script names the missing ones and stops. Installing them is outside the
repository, so it is the contributor's decision (kit/INSTALL.md, the footprint principle).
"""
import os, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LOG = os.path.join(ROOT, "tools", "logs", "vice-build.log")

# (what configure needs, how to tell it is there, the Debian/Ubuntu package that provides it)
NEEDS = [
    ("C compiler", ("which", "gcc"), "build-essential"),
    ("autoconf", ("which", "autoconf"), "autoconf"),
    ("automake", ("which", "automake"), "automake"),
    ("bison", ("which", "bison"), "bison"),
    ("byacc", ("which", "byacc"), "byacc"),
    ("flex", ("which", "flex"), "flex"),
    ("xa65 cross-assembler", ("which", "xa"), "xa65"),
    ("dos2unix", ("which", "dos2unix"), "dos2unix"),
    ("pkg-config", ("which", "pkg-config"), "pkg-config"),
    ("GTK 3 headers", ("pkg", "gtk+-3.0"), "libgtk-3-dev"),
    ("GLEW headers", ("pkg", "glew"), "libglew-dev"),
    ("libmicrohttpd headers (the MCP server)", ("pkg", "libmicrohttpd"), "libmicrohttpd-dev"),
    ("libevdev headers", ("pkg", "libevdev"), "libevdev-dev"),
    ("libpng headers (screenshots)", ("pkg", "libpng"), "libpng-dev"),
    ("libcurl headers", ("pkg", "libcurl"), "libcurl4-openssl-dev"),
    ("ALSA headers", ("pkg", "alsa"), "libasound2-dev"),
    ("PulseAudio headers", ("pkg", "libpulse"), "libpulse-dev"),
]
# Only to run the GUI build where there is no display (a server, a container): the launcher
# starts it under xvfb-run then. Not needed on a Linux desktop.
HEADLESS = [("xvfb-run", ("which", "xvfb-run"), "xvfb"), ("xauth", ("which", "xauth"), "xauth")]

CONFIGURE = ["--enable-option-checking=fatal", "--enable-gtk3ui", "--enable-mcp-server", "--enable-cpuhistory",
             "--disable-arch", "--disable-pdf-docs", "--disable-html-docs", "--with-alsa", "--with-pulse",
             "--with-fastsid", "--with-png", "--with-resid", "--with-libcurl"]


def present(how):
    kind, name = how
    if kind == "which":
        return shutil.which(name) is not None
    return shutil.which("pkg-config") is not None and \
        subprocess.run(["pkg-config", "--exists", name]).returncode == 0


def missing(needs):
    return [(what, pkg) for what, how, pkg in needs if not present(how)]


def step(cmd, cwd, log):
    print("  $", " ".join(cmd), flush=True)
    log.write(f"\n$ {' '.join(cmd)}  (in {cwd})\n"); log.flush()
    r = subprocess.run(cmd, cwd=cwd, stdout=log, stderr=subprocess.STDOUT)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd)}; the end of {os.path.relpath(LOG, ROOT)} says why")


def build(src):
    src = os.path.abspath(src)
    vice = os.path.join(src, "vice")
    if not os.path.exists(os.path.join(vice, "configure.ac")):
        sys.exit(f"no vice/configure.ac under {src}: point at a clone of a vice-mcp repository")
    if sys.platform != "linux":
        print("note: written for Linux; on macOS the release builds are the tested path (kit/c64/INSTALL.md)")
    need = missing(NEEDS)
    if sys.platform == "linux" and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        need += missing(HEADLESS)
    if need:
        print("missing, and outside this repository to install, so ask the contributor first:")
        for what, pkg in need:
            print(f"  {what:40} {pkg}")
        print("on Debian or Ubuntu:  sudo apt-get install --no-install-recommends " + " ".join(sorted({p for _, p in need})))
        sys.exit(1)
    prefix = os.path.join(src, "install")
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "w") as log:
        print(f"building {src} into {prefix}; log: {os.path.relpath(LOG, ROOT)}")
        if os.path.exists(os.path.join(vice, "src", "config.h")):
            os.remove(os.path.join(vice, "src", "config.h"))
        step(["sh", "./src/buildtools/genvicedate_h.sh"], vice, log)
        step(["sh", "./autogen.sh"], vice, log)
        # the same timestamp settling as upstream CI, so make does not re-run the autotools
        for name in ("aclocal.m4", "configure", "config.h.in", "Makefile.in"):
            time.sleep(1)
            step(["find", ".", "-name", name, "-exec", "touch", "{}", "+"], vice, log)
        step(["bison", "-d", "-o", "src/monitor/mon_parse.c", "src/monitor/mon_parse.y"], vice, log)
        out = os.path.join(vice, "build-gui")
        os.makedirs(out, exist_ok=True)
        step(["../configure", f"--prefix={prefix}", *CONFIGURE], out, log)
        step(["make", f"-j{os.cpu_count() or 2}", "-s"], out, log)
        step(["make", "install-strip"], out, log)
    if not os.path.exists(os.path.join(prefix, "bin", "x64sc")):
        sys.exit(f"the build finished without {prefix}/bin/x64sc; read {os.path.relpath(LOG, ROOT)}")
    sys.path.insert(0, HERE)
    import tools
    tools.use_vice(prefix)
    print("next: python3 kit/scripts/tools.py vice, then check-emulator")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    build(a[0])


if __name__ == "__main__":
    main()
