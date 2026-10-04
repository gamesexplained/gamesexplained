#!/usr/bin/env python3
"""Get the newest ZEsarUX release for this machine, from the project's own GitHub releases.

Reached as `python3 kit/scripts/tools.py --platform spectrum get-zesarux`. The kit pins
no version of the emulator: it takes the newest release of
https://github.com/chernandezba/zesarux, and this script says what that is on this
machine, because the project publishes several builds per release (macOS silicon and
intel, three Linux distributions, Windows, a source tarball).

  tools.py get-zesarux              say what is newest, what this machine can have of it,
                                    and what is installed now. Changes nothing; run it
                                    first, and show the contributor what it prints.
  tools.py get-zesarux download     download and unpack the newest release's build for
                                    this machine into tools/zesarux/.
  tools.py get-zesarux download <tag>   a named, older release instead.

Downloading is the contributor's answer to the question the plain command prints, never
a default (`kit/INSTALL.md`, the footprint principle). Afterwards run
`tools.py --platform spectrum check-emulator`; its checks, not the version, decide what works.

The release .dmg is the way in on macOS: the project's own download, not a mirror. Its
Homebrew cask is disabled for failing Gatekeeper (the app is ad-hoc signed), so the
kit clears the quarantine flag on the copy inside tools/ rather than changing anything
system-wide. Never launch the bundle with Finder or `open`; the launcher execs the
binary inside tools/.
"""
import json, os, platform, re, shutil, subprocess, sys, tarfile, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tools   # noqa: E402  the launcher, for ZESARUX_DIR, app_path and build
from tools import up, DOWNLOADS   # noqa: E402
from launcher import unpack_dmg   # noqa: E402  kit/scripts, which the launcher put on the path

UPSTREAM = "chernandezba/zesarux"

# The file names the project's CI gives each machine, most preferred first, as templates
# taking the release's version (13.0 in ZEsarUX-13.0). The names move from release to
# release (13.0 says macos-silicon, 12.1 said macos-12.1.dmg), so a miss falls through to
# the next and finally to the source tarball.
NAMES = {
    ("darwin", "arm64"):  ["ZEsarUX_macos-silicon-%s.dmg", "ZEsarUX_macos-%s.dmg"],
    ("darwin", "x86_64"): ["ZEsarUX_macos-intel-%s.dmg", "ZEsarUX_macos-%s.dmg"],
    ("linux", "x86_64"):  ["ZEsarUX_linux-%s-ubuntu24_x86_64.tar.gz", "ZEsarUX_linux-%s-debian13_x86_64.tar.gz",
                            "ZEsarUX_linux-%s-debian12_x86_64.tar.gz", "ZEsarUX_linux-%s-fedora42_x86_64.tar.gz"],
    ("linux", "aarch64"): ["ZEsarUX_raspberrypios-framebuffer-%s_armv6l.tar.gz"],
    ("win32", "any"):     ["ZEsarUX_windows-%s.zip"],
}
SOURCE = "ZEsarUX_src-%s.tar.gz"


def this_machine():
    arch = {"amd64": "x86_64", "aarch64": "arm64"}.get(platform.machine().lower(), platform.machine().lower())
    return sys.platform if sys.platform in ("darwin", "linux", "win32") else sys.platform, arch


def release_version(rel):
    """The version as it appears in file names: 13.0 for the tag ZEsarUX-13.0."""
    m = re.search(r"(\d+\.\d+)", rel["tag_name"])
    return m.group(1) if m else rel["tag_name"]


def version(tag):
    """ZEsarUX tags look like ZEsarUX-13.0; anything without a leading number sorts last."""
    m = re.search(r"(\d+)\.(\d+)", tag)
    return tuple(int(x) for x in m.groups()) if m else (0, 0)


def api(path):
    req = urllib.request.Request(f"https://api.github.com/{path}", headers={"Accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except Exception as e:
        print(f"the GitHub API did not answer ({e}); reading the release tags with git instead")
        return None


def releases():
    """Published releases, newest first, pre-releases dropped."""
    rs = api(f"repos/{UPSTREAM}/releases?per_page=5")
    if rs is None:
        r = subprocess.run(["git", "ls-remote", "--tags", f"https://github.com/{UPSTREAM}"],
                           capture_output=True, text=True, timeout=120)
        tags = sorted(set(re.findall(r"refs/tags/(ZEsarUX-[\d.]+)$", r.stdout, re.M)), key=version, reverse=True)
        if not tags:
            sys.exit(f"could not reach GitHub by its API or by git ({r.stderr.strip()[:200]}); "
                     "see kit/spectrum/INSTALL.md, 'Get the emulator'")
        return [{"tag_name": t, "published_at": "date unknown (tag read with git)", "assets": None} for t in tags]
    rs = [r for r in rs if not r.get("draft") and not r.get("prerelease")]
    return sorted(rs, key=lambda r: version(r["tag_name"]), reverse=True)


def probe(url):
    """The size of a release file, asking for its first byte only; None when there is none."""
    req = urllib.request.Request(url, headers={"Range": "bytes=0-0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            m = re.search(r"/(\d+)$", r.headers.get("Content-Range", ""))
            return int(m.group(1)) if m else int(r.headers.get("Content-Length", 0)) or None
    except Exception:
        return None


def names_for(plat):
    """The release files this machine can use, in preference order, source last."""
    out = list(NAMES.get(plat) or NAMES.get((plat[0], "any")) or [])
    return out + [SOURCE]


def asset_named(rel, name):
    """That file as a release asset, or as a URL when the release list came from git."""
    if rel.get("assets") is not None:
        return next((a for a in rel["assets"] if a["name"] == name), None)
    url = f"https://github.com/{UPSTREAM}/releases/download/{rel['tag_name']}/{name}"
    size = probe(url)
    return {"name": name, "size": size, "browser_download_url": url} if size else None


def build_asset(rel):
    for template in names_for(this_machine()):
        have = asset_named(rel, template % release_version(rel))
        if have:
            return have
    return None


def mb(n):
    return f"{n / 1048576:.0f} MB"


def resolve():
    osname, arch = this_machine()
    rs = releases()
    if not rs:
        sys.exit(f"no releases found on github.com/{UPSTREAM}")
    newest, tag = rs[0], rs[0]["tag_name"]
    when = newest["published_at"]
    print(f"newest ZEsarUX release: {tag}, published {when[:10] if when[:1].isdigit() else when} "
          f"(github.com/{UPSTREAM}/releases)")
    print(f"this machine: {osname}-{arch}")
    now = tools.build()
    print(f"installed now: {now} (tools/zesarux)")
    if re.search(rf"\brelease {re.escape(tag)}\b", now):
        print(f"\nthe installed build is {tag}, the newest. Run check-emulator if it has not been run on it.")
        return
    have = build_asset(newest)
    if not have:
        print(f"\n{tag} has no build at all for this machine; nothing to install.")
        return
    kind = "source tarball (build it yourself)" if re.fullmatch(r"ZEsarUX_src-.*", have["name"]) else "build"
    print(f"\n{tag} has a {kind} for this machine: {have['name']}, {mb(have['size'])}.")
    print("ASK THE CONTRIBUTOR before downloading it (file name, size, and that it is the project's own release),")
    print("then: python3 kit/scripts/tools.py --platform spectrum get-zesarux download")
    if tools.app_path():
        print("or keep what is installed now, and run check-emulator on it")


def unpack(path, dest):
    """Unpack a release file into dest; returns the folder holding the emulator."""
    os.makedirs(dest, exist_ok=True)
    if path.endswith(".dmg"):
        unpack_dmg(path, dest, DOWNLOADS)      # skips the drag-to-install symlink (kit/scripts/launcher.py)
    elif path.endswith(".tar.gz") or path.endswith(".tgz"):
        with tarfile.open(path) as t:
            t.extractall(dest)
    elif path.endswith(".zip"):
        with zipfile.ZipFile(path) as z:
            z.extractall(dest)
    else:
        sys.exit(f"do not know how to unpack {os.path.basename(path)}")
    for root, dirs, files in os.walk(dest):
        if "zesarux.app" in dirs:
            return os.path.join(root, "zesarux.app")
        if "zesarux" in files:
            os.chmod(os.path.join(root, "zesarux"), 0o755)
            return root
    sys.exit(f"no ZEsarUX binary in {os.path.basename(path)}")


def place(top, dest):
    """Put what `unpack` found where the launcher and INSTALL.md say it is.

    A macOS bundle keeps its name, tools/zesarux/zesarux.app, the same layout as a build
    unpacked by hand; moving the bundle itself onto tools/zesarux left its Contents/ there
    with no .app around it, which only the launcher's last-resort search still found."""
    if top.endswith(".app"):
        os.makedirs(dest, exist_ok=True)
        shutil.move(top, os.path.join(dest, os.path.basename(top)))
    else:
        shutil.move(top, dest)


def download(tag=None):
    rs = releases()
    rel = next((r for r in rs if r["tag_name"] == tag), None) if tag else rs[0]
    if not rel:
        sys.exit(f"no release {tag} on github.com/{UPSTREAM}")
    a = build_asset(rel)
    if not a:
        sys.exit(f"{rel['tag_name']} has no build for {this_machine()}; run `tools.py get-zesarux` for what it has")
    if up(tools.PORT):
        sys.exit(f"the emulator is running; `tools.py stop` first, or the copy under tools/zesarux "
                 f"would change under it")
    os.makedirs(DOWNLOADS, exist_ok=True)
    path = os.path.join(DOWNLOADS, a["name"])
    print(f"downloading {a['name']} ({mb(a['size'])}) from the {rel['tag_name']} release of github.com/{UPSTREAM}")
    with urllib.request.urlopen(a["browser_download_url"], timeout=120) as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)
    if os.path.getsize(path) != a["size"]:
        sys.exit(f"{a['name']} is {os.path.getsize(path)} bytes, the release says {a['size']}; not installed")
    stage = os.path.join(DOWNLOADS, "unpacked")
    shutil.rmtree(stage, ignore_errors=True)
    top = unpack(path, stage)
    old = os.path.join(os.path.dirname(tools.ZESARUX_DIR), "zesarux-old")
    shutil.rmtree(old, ignore_errors=True)
    if os.path.isdir(tools.ZESARUX_DIR):
        os.rename(tools.ZESARUX_DIR, old)
    place(top, tools.ZESARUX_DIR)
    shutil.rmtree(old, ignore_errors=True)
    shutil.rmtree(stage, ignore_errors=True)
    with open(os.path.join(tools.ZESARUX_DIR, tools.RELEASE_NOTE), "w") as f:
        f.write(f"{rel['tag_name']} {a['name']}\n")
    os.remove(path)
    if sys.platform == "darwin":
        # the app is ad-hoc signed, so Gatekeeper rejects the bundle as downloaded; clear the flag on
        # this copy only (never `open` the bundle: tools.py execs the binary inside it)
        subprocess.run(["xattr", "-dr", "com.apple.quarantine", tools.ZESARUX_DIR],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"if macOS still refuses it: the ad-hoc signature fails Gatekeeper (spctl rejects the bundle); "
              f"run the binary inside tools/zesarux, never `open`")
    print("emulator build:", tools.build())
    libs = tools.missing_libraries(tools.app_path())
    if libs:
        print(tools.say_missing(libs))
    print("next: python3 kit/scripts/tools.py --platform spectrum zesarux, then check-emulator")


def main():
    a = sys.argv[1:]
    if a and a[0] in ("-h", "--help"):
        print(__doc__); return
    if not a:
        resolve()
    elif a[0] == "download":
        download(a[1] if len(a) > 1 else None)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
