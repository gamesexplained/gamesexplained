#!/usr/bin/env python3
"""Build the emulator from a vice-mcp source tree, the way the project's own CI builds its releases.

Reached as `python3 kit/scripts/tools.py build-vice <source dir>`, and by `tools.py get-vice build`,
which clones the newest release for you. For when there is no release to download for this
machine, when a download is not possible from where the kit runs, or to run fixes that are not in
a release yet (pull requests merged into a local branch). Linux and macOS (Homebrew).

  git clone https://github.com/barryw/vice-mcp tools/src/vice-mcp
  # optional: fixes still under review, stored as origin/pr/<n> so that `status` can name them
  git -C tools/src/vice-mcp fetch origin pull/20/head:refs/remotes/origin/pr/20
  git -C tools/src/vice-mcp merge --no-edit origin/pr/20
  python3 kit/scripts/tools.py build-vice tools/src/vice-mcp

It installs into <source dir>/install and links tools/vice-mcp to it (`use-vice`), so the build
stays inside tools/ and `tools.py status` names it from the source tree's git history. The
configure line is the GTK3 GUI build from the project's .woodpecker/build-linux.yaml, less the
optional media libraries (FLAC, MP3, GIF, MIDI, ethernet) the kit never uses; on macOS it is
.woodpecker/build-macos.yaml, trimmed the same way. Logs go to tools/logs/vice-build.log.

The build needs a compiler, the autotools and the GTK3 and libmicrohttpd headers. Those are
system packages (apt on Linux, Homebrew on macOS): this script names the missing ones and stops.
Installing them is outside the repository, so it is the contributor's decision (kit/INSTALL.md,
the footprint principle).
"""
import glob, os, shutil, subprocess, sys, time

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

# macOS: the same, from Homebrew. Its bison is keg-only (macOS ships bison 2.3, too old), so it is
# found under the Homebrew prefix rather than on PATH. ("file", path) is a header or data file.
BREW = subprocess.run(["brew", "--prefix"], capture_output=True, text=True).stdout.strip() \
    if sys.platform == "darwin" and shutil.which("brew") else ""
NEEDS_MAC = [
    ("C compiler (Xcode command line tools)", ("which", "cc"), "xcode-select --install"),
    ("autoconf", ("which", "autoconf"), "autoconf"),
    ("automake", ("which", "automake"), "automake"),
    ("bison 3 (Homebrew's; macOS ships 2.3)", ("file", "opt/bison/bin/bison"), "bison"),
    ("xa cross-assembler", ("which", "xa"), "xa"),
    ("dos2unix", ("which", "dos2unix"), "dos2unix"),
    ("pkg-config", ("which", "pkg-config"), "pkgconf"),
    ("GTK 3", ("pkg", "gtk+-3.0"), "gtk+3"),
    ("librsvg (GTK icons)", ("pkg", "librsvg-2.0"), "librsvg"),
    ("Adwaita icons", ("file", "share/icons/Adwaita"), "adwaita-icon-theme"),
    ("GLEW", ("pkg", "glew"), "glew"),
    ("libmicrohttpd (the MCP server)", ("pkg", "libmicrohttpd"), "libmicrohttpd"),
    ("libpng (screenshots)", ("pkg", "libpng"), "libpng"),
    ("giflib", ("file", "include/gif_lib.h"), "giflib"),
]
CONFIGURE_MAC = ["--enable-option-checking=fatal", "--enable-gtk3ui", "--enable-mcp-server", "--enable-cpuhistory",
                 "--disable-ethernet", "--disable-midi", "--disable-parsid", "--disable-arch",
                 "--disable-pdf-docs", "--disable-html-docs", "--disable-openmp",
                 "--with-fastsid", "--with-resid", "--with-png", "--with-gif", "--disable-x64",
                 "--without-flac", "--without-lame", "--without-mpg123", "--without-portaudio",
                 "--without-vorbis", "--without-libcurl"]

CONFIGURE = ["--enable-option-checking=fatal", "--enable-gtk3ui", "--enable-mcp-server", "--enable-cpuhistory",
             "--disable-arch", "--disable-pdf-docs", "--disable-html-docs", "--with-alsa", "--with-pulse",
             "--with-fastsid", "--with-png", "--with-resid", "--with-libcurl"]


def present(how):
    kind, name = how
    if kind == "file":
        return bool(BREW) and os.path.exists(os.path.join(BREW, name))
    if kind == "which":
        return shutil.which(name) is not None
    return shutil.which("pkg-config") is not None and \
        subprocess.run(["pkg-config", "--exists", name]).returncode == 0


def missing(needs):
    return [(what, pkg) for what, how, pkg in needs if not present(how)]


def build_env():
    """PATH and PKG_CONFIG_PATH for the build; on macOS, Homebrew's keg-only bison and libmicrohttpd."""
    env = dict(os.environ)
    if BREW:
        env["PATH"] = os.pathsep.join([os.path.join(BREW, "opt", "bison", "bin"), os.path.join(BREW, "bin"), env.get("PATH", "")])
        env["PKG_CONFIG_PATH"] = os.pathsep.join([os.path.join(BREW, "lib", "pkgconfig"),
                                                 os.path.join(BREW, "opt", "libmicrohttpd", "lib", "pkgconfig"),
                                                 env.get("PKG_CONFIG_PATH", "")])
    return env


def ask_install(need):
    """Name what is missing and how to install it, and stop: installing it is the contributor's call."""
    print("missing, and outside this repository to install, so ask the contributor first:")
    for what, pkg in need:
        print(f"  {what:40} {pkg}")
    if sys.platform == "darwin":
        pkgs = sorted({p for _, p in need if " " not in p})
        if any(" " in p for _, p in need):
            print("the compiler first:  xcode-select --install")
        if pkgs:
            if not BREW:
                print("Homebrew (https://brew.sh) is not installed; everything else comes from it")
            print("with Homebrew:  brew install " + " ".join(pkgs))
            print("the full set, if nothing is there yet, is about 400 MB under the Homebrew prefix, most of it GTK 3")
    else:
        print("on Debian or Ubuntu:  sudo apt-get install --no-install-recommends " + " ".join(sorted({p for _, p in need})))
    sys.exit(1)


def step(cmd, cwd, log, env=None):
    print("  $", " ".join(cmd), flush=True)
    log.write(f"\n$ {' '.join(cmd)}  (in {cwd})\n"); log.flush()
    r = subprocess.run(cmd, cwd=cwd, stdout=log, stderr=subprocess.STDOUT, env=env)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd)}; the end of {os.path.relpath(LOG, ROOT)} says why")


def build(src):
    src = os.path.abspath(src)
    vice = os.path.join(src, "vice")
    if not os.path.exists(os.path.join(vice, "configure.ac")):
        sys.exit(f"no vice/configure.ac under {src}: point at a clone of a vice-mcp repository")
    mac = sys.platform == "darwin"
    if not mac and not sys.platform.startswith("linux"):
        sys.exit("build-vice knows Linux and macOS; on Windows use the release (kit/c64/INSTALL.md)")
    env = build_env()
    old = os.environ.get("PKG_CONFIG_PATH")
    os.environ["PKG_CONFIG_PATH"] = env.get("PKG_CONFIG_PATH", "")    # so present() sees what configure will
    need = missing(NEEDS_MAC if mac else NEEDS)
    if old is None: os.environ.pop("PKG_CONFIG_PATH")
    else: os.environ["PKG_CONFIG_PATH"] = old
    if not mac and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        need += missing(HEADLESS)
    if need:
        ask_install(need)
    prefix = os.path.join(src, "install")
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    t0 = time.time()
    with open(LOG, "w") as log:
        print(f"building {src} into {prefix}; log: {os.path.relpath(LOG, ROOT)}")
        if os.path.exists(os.path.join(vice, "src", "config.h")):
            os.remove(os.path.join(vice, "src", "config.h"))
        for f in glob.glob(os.path.join(vice, "**", "config.status"), recursive=True):
            os.remove(f)            # a configure from an earlier build would be re-used otherwise
        step(["sh", "./src/buildtools/genvicedate_h.sh"], vice, log, env)
        step(["sh", "./autogen.sh"], vice, log, env)
        # the same timestamp settling as upstream CI, so make does not re-run the autotools
        for name in ("aclocal.m4", "configure", "config.h.in", "Makefile.in"):
            time.sleep(1)
            step(["find", ".", "-name", name, "-exec", "touch", "{}", "+"], vice, log, env)
        step(["bison", "-d", "-o", "src/monitor/mon_parse.c", "src/monitor/mon_parse.y"], vice, log, env)
        out = os.path.join(vice, "build-gui")
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        step(["../configure", f"--prefix={prefix}", *(CONFIGURE_MAC if mac else CONFIGURE)], out, log, env)
        step(["make", f"-j{os.cpu_count() or 2}", "-s"], out, log, env)
        step(["make", "install-strip"], out, log, env)
    if not os.path.exists(os.path.join(prefix, "bin", "x64sc")):
        sys.exit(f"the build finished without {prefix}/bin/x64sc; read {os.path.relpath(LOG, ROOT)}")
    sys.path.insert(0, HERE)
    import tools
    tools.use_vice(prefix)
    print(f"built in {(time.time() - t0) / 60:.0f} minutes")
    print("next: python3 kit/scripts/tools.py vice, then check-emulator")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    build(a[0])


if __name__ == "__main__":
    main()
