#!/usr/bin/env python3
"""Get the newest vice-mcp this machine can have: a release download where one exists, else a build.

Reached as `python3 kit/scripts/tools.py get-vice`. The kit names no version of the emulator: it
takes the newest release of https://github.com/barryw/vice-mcp every time, and this script says
what that means on this machine, because the project does not publish every platform with every
release (a release can have Linux and Windows builds and no macOS one).

  tools.py get-vice              say what is newest, what this machine can have of it, and what is
                                 installed now. Changes nothing; run it first, and show the
                                 contributor what it prints.
  tools.py get-vice download     download the newest release's GUI build for this machine and
                                 unpack it into tools/vice-mcp. Only when that release has one.
  tools.py get-vice download <tag>   a named, older release instead: the fallback when the newest has
                                 no build for this machine and the contributor does not want to build
  tools.py get-vice build        clone the newest release's source into tools/src/vice-mcp and build
                                 it (build-vice). Needs system packages; the contributor decides.
  tools.py get-vice build --prs  maintainers only: also merge the reviewed, unmerged pull requests
                                 listed in kit/c64/vice-prs.json

Every path asks first. `download` and `build` are the contributor's answer to the question the
plain command prints, never a default: a download is a file from the internet, and a build installs
system packages outside this repository (kit/INSTALL.md, the footprint principle). Afterwards run
`tools.py check-emulator`; its checks, not the version, decide which workarounds apply.

--prs runs code nobody has merged, from whoever opened the pull request, on this computer. It is
for the organization's admins, who review each entry and pin it to a commit: the script checks,
with the GitHub CLI, that the person running it is an admin of the repository in site/config.json,
and refuses otherwise. Never pass it on a contributor's behalf.
"""
import json, os, platform, re, shutil, subprocess, sys, tempfile, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
SRC = os.path.join(TOOLS, "src", "vice-mcp")
DOWNLOADS = os.path.join(TOOLS, "downloads")
UPSTREAM = "barryw/vice-mcp"
PRS = os.path.join(HERE, "vice-prs.json")
sys.path.insert(0, HERE)
import tools   # noqa: E402  the launcher: VICE_DIR, use_vice, vice_build


def this_machine():
    """The release asset's platform word for this computer, e.g. macos-arm64; None if the project has none."""
    arch = platform.machine().lower()
    arch = {"amd64": "x86_64", "aarch64": "arm64"}.get(arch, arch)
    osname = {"darwin": "macos", "linux": "linux", "win32": "windows"}.get(sys.platform)
    return f"{osname}-{arch}" if osname else None


def api(path):
    """A GitHub API answer, or None when the API cannot be reached (releases() then asks git)."""
    req = urllib.request.Request(f"https://api.github.com/{path}", headers={"Accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except Exception as e:
        print(f"the GitHub API did not answer ({e}); reading the release tags with git instead")
        return None


def version(tag):
    return tuple(int(x) for x in tag[1:].split("."))


def releases():
    """Published vX.Y.Z releases, newest first. Drafts, pre-releases and other tag styles are skipped.

    Some networks refuse api.github.com but let a clone and the release files through (a proxy that
    allows only the repositories a session is given, for instance). Then the tags come from
    `git ls-remote`, and each release's files are found by their conventional names (gui_asset)."""
    rs = api(f"repos/{UPSTREAM}/releases?per_page=30")
    if rs is None:
        return releases_from_git()
    rs = [r for r in rs
          if not r.get("draft") and not r.get("prerelease") and re.match(r"v\d+\.\d+\.\d+$", r["tag_name"])]
    return sorted(rs, key=lambda r: version(r["tag_name"]), reverse=True)


def releases_from_git():
    r = subprocess.run(["git", "ls-remote", "--tags", f"https://github.com/{UPSTREAM}"],
                       capture_output=True, text=True, timeout=120)
    tags = set(re.findall(r"refs/tags/(v\d+\.\d+\.\d+)$", r.stdout, re.M))
    if not tags:
        sys.exit(f"could not reach GitHub by its API or by git ({r.stderr.strip()[:200]}); "
                 "see kit/c64/INSTALL.md, 'Get the emulator'")
    return [{"tag_name": t, "published_at": "date unknown (tag read with git)", "assets": None}
            for t in sorted(tags, key=version, reverse=True)]


def probe(url):
    """The size of a file on a release, asking for its first byte only; None when there is no such file.
    A tag need not have a release, nor a release a file for every machine."""
    req = urllib.request.Request(url, headers={"Range": "bytes=0-0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            m = re.search(r"/(\d+)$", r.headers.get("Content-Range", ""))
            return int(m.group(1)) if m else int(r.headers.get("Content-Length", 0)) or None
    except Exception:
        return None


def gui_asset(rel, plat):
    """The GUI build for this platform in a release, else None. Headless builds cannot stop the CPU
    (kit/c64/INSTALL.md), so they are never picked on their own."""
    if rel.get("assets") is None:                   # from git: try the names the project's CI gives its files
        for ext in ("zip", "dmg"):
            name = f"{rel['tag_name']}-{plat}-gui.{ext}"
            url = f"https://github.com/{UPSTREAM}/releases/download/{rel['tag_name']}/{name}"
            size = probe(url)
            if size:
                return {"name": name, "size": size, "browser_download_url": url}
        return None
    for a in rel.get("assets", []):
        if f"-{plat}-gui." in a["name"]:
            return a
    return None


def mb(n):
    return f"{n / 1048576:.0f} MB"


def resolve():
    plat = this_machine()
    rs = releases()
    if not rs:
        sys.exit(f"no releases found on github.com/{UPSTREAM}")
    newest = rs[0]
    tag = newest["tag_name"]
    when = newest["published_at"]
    print(f"newest vice-mcp release: {tag}, published {when[:10] if when[:1].isdigit() else when} (github.com/{UPSTREAM}/releases)")
    print(f"this machine: {plat or sys.platform}")
    now = tools.vice_build()
    print(f"installed now: {now}")
    if re.search(rf"\brelease {re.escape(tag)}\b", now):
        print(f"\nthe installed build is {tag}, the newest; nothing to do. Run check-emulator if it has not been run on it.")
        return
    have = gui_asset(newest, plat) if plat else None
    if have:
        print(f"\n{tag} has a GUI build for this machine: {have['name']}, {mb(have['size'])}.")
        print("ASK THE CONTRIBUTOR before downloading it (file name, size, and that it is the project's own release),")
        print("then: python3 kit/scripts/tools.py get-vice download")
        return
    if sys.platform == "win32":
        head = next((a for a in newest.get("assets", []) if f"-{plat}-headless." in a["name"]), None)
        print(f"\n{tag} has no GUI build for Windows, and the kit cannot build one there. "
              + (f"There is a headless one, {head['name']}, {mb(head['size'])}: " if head else "A headless build, where one exists: ")
              + "stops do not work in it at all (kit/c64/INSTALL.md, 'Get the emulator'). "
              "ASK THE CONTRIBUTOR whether to go on with that; if so, they download it from the releases page "
              "and unpack it into tools/vice-mcp.")
        return
    older = next(((r, gui_asset(r, plat)) for r in rs[1:] if plat and gui_asset(r, plat)), None)
    print(f"\n{tag} has no GUI build for this machine. ASK THE CONTRIBUTOR which of these they want:")
    print(f"  1. build {tag} from source, into tools/src/vice-mcp (550 to 700 MB there, with the build)."
          "\n     Needs system packages installed outside this repository; the build says which are missing"
          "\n     and stops before installing anything:  python3 kit/scripts/tools.py get-vice build")
    if older:
        r, a = older
        print(f"  2. download the newest release that has one: {r['tag_name']}, {a['name']}, {mb(a['size'])}."
              f"\n     Older, so it may lack fixes {tag} has; check-emulator will say which checks fail."
              f"\n     python3 kit/scripts/tools.py get-vice download {r['tag_name']}")
    else:
        print("  2. no release has a GUI build for this machine; building is the only way to a build that can stop")
    if tools.vice_build() != "MISSING":
        print("  3. keep what is installed now, and run check-emulator on it")


def unpack(path, dest):
    """Unpack a release file into dest: a .zip, or a macOS .dmg (mounted read-only and copied out)."""
    os.makedirs(dest)
    if path.endswith(".zip"):
        with zipfile.ZipFile(path) as z:
            z.extractall(dest)
        for root, _, files in os.walk(dest):          # zipfile drops the execute bits
            if os.path.basename(root) == "bin":
                for f in files: os.chmod(os.path.join(root, f), 0o755)
    elif path.endswith(".dmg"):
        mnt = tempfile.mkdtemp(dir=DOWNLOADS)
        subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", mnt, path], check=True,
                       stdout=subprocess.DEVNULL)
        try:
            for f in os.listdir(mnt):
                if not f.startswith("."):
                    subprocess.run(["ditto", os.path.join(mnt, f), os.path.join(dest, f)], check=True)
        finally:
            subprocess.run(["hdiutil", "detach", mnt], stdout=subprocess.DEVNULL)
            os.rmdir(mnt)
    else:
        sys.exit(f"do not know how to unpack {os.path.basename(path)}")
    for root, dirs, _ in os.walk(dest):             # the folder with bin/x64sc in it, however deep the archive put it
        if os.path.exists(os.path.join(root, "bin", "x64sc")) or os.path.exists(os.path.join(root, "bin", "x64sc.exe")):
            return root
    sys.exit(f"no bin/x64sc in {os.path.basename(path)}")


def download(tag=None):
    plat = this_machine()
    rs = releases()
    rel = next((r for r in rs if r["tag_name"] == tag), None) if tag else rs[0]
    if not rel:
        sys.exit(f"no release {tag} on github.com/{UPSTREAM}")
    a = gui_asset(rel, plat) if plat else None
    if not a:
        sys.exit(f"{rel['tag_name']} has no GUI build for {plat}; run `tools.py get-vice` for the choices")
    if tools.up(6510):
        sys.exit("the emulator is running; `tools.py stop vice` first")
    os.makedirs(DOWNLOADS, exist_ok=True)
    path = os.path.join(DOWNLOADS, a["name"])
    print(f"downloading {a['name']} ({mb(a['size'])}) from the {rel['tag_name']} release of github.com/{UPSTREAM}")
    with urllib.request.urlopen(a["browser_download_url"], timeout=60) as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)
    if os.path.getsize(path) != a["size"]:
        sys.exit(f"{a['name']} is {os.path.getsize(path)} bytes, the release says {a['size']}; not installed")
    stage = os.path.join(DOWNLOADS, "unpacked")
    shutil.rmtree(stage, ignore_errors=True)
    top = unpack(path, stage)
    # the new release becomes tools/vice-mcp; the release it replaces goes, and a link to an own build is
    # removed (the build itself is the contributor's and stays where it is; use-vice goes back to it)
    if os.path.islink(tools.VICE_DIR):
        print(f"no longer using {tools.vice_build()}; `tools.py use-vice <its install dir>` goes back to it")
        os.remove(tools.VICE_DIR)
    for old in (tools.VICE_DIR, tools.VICE_RELEASE):
        if os.path.isdir(old) and not os.path.islink(old):
            shutil.rmtree(old)
    os.rename(top, tools.VICE_DIR)
    with open(os.path.join(tools.VICE_DIR, tools.RELEASE_NOTE), "w") as f:
        f.write(f"{rel['tag_name']} {a['name']}\n")
    shutil.rmtree(stage, ignore_errors=True)
    os.remove(path)
    if sys.platform == "darwin":
        print("if macOS refuses to open it: xattr -dr com.apple.quarantine tools/vice-mcp")
    print("emulator build:", tools.vice_build())
    print("next: python3 kit/scripts/tools.py vice, then check-emulator")


def git(*a, check=True):
    r = subprocess.run(["git", "-C", SRC, *a], capture_output=True, text=True)
    if check and r.returncode:
        sys.exit(f"git {' '.join(a)} failed:\n{r.stderr.strip()}")
    return r.stdout.strip()


def is_admin():
    """True when the GitHub CLI is signed in as an admin of the kit's own repository."""
    repo = json.load(open(os.path.join(ROOT, "site", "config.json"))).get("repo", "")
    slug = re.sub(r"^https?://github\.com/", "", repo).rstrip("/")
    if not shutil.which("gh"):
        return False, "the GitHub CLI (gh) is not installed, so admin rights cannot be checked"
    r = subprocess.run(["gh", "api", f"repos/{slug}", "--jq", ".permissions.admin"], capture_output=True, text=True)
    if r.stdout.strip() != "true":
        return False, f"the GitHub account gh is signed in as is not an admin of {slug}"
    return True, ""


def merge_prs():
    """Merge each reviewed pull request in vice-prs.json at its pinned commit; skip those already in."""
    entries = json.load(open(PRS)).get("pulls", [])
    if not entries:
        print("vice-prs.json lists no pull requests; building the release as it stands")
        return
    for e in entries:
        n, sha = e["number"], e["commit"]
        git("fetch", "-q", "origin", f"pull/{n}/head:refs/remotes/origin/pr/{n}")
        head = git("rev-parse", f"origin/pr/{n}")
        if not head.startswith(sha) and not sha.startswith(head[:len(sha)]):
            sys.exit(f"pull request #{n} is now at {head[:10]}, not the reviewed {sha}: review it again and update "
                     "vice-prs.json before building with it")
        if subprocess.run(["git", "-C", SRC, "merge-base", "--is-ancestor", sha, "HEAD"]).returncode == 0:
            print(f"pull request #{n} is already in this release; take it out of vice-prs.json")
            continue
        print(f"merging pull request #{n} ({sha[:10]}): {e.get('why', '')}")
        r = subprocess.run(["git", "-C", SRC, "merge", "--no-edit", "-q", sha], capture_output=True, text=True)
        if r.returncode:
            git("merge", "--abort", check=False)
            sys.exit(f"pull request #{n} does not merge cleanly onto the release; rebase it or drop it from vice-prs.json")


def build(prs=False):
    if prs:
        ok, why = is_admin()
        if not ok:
            sys.exit(f"--prs is for the organization's admins, and {why}. Build without it.")
    if tools.up(6510):
        sys.exit("the emulator is running; `tools.py stop vice` first")
    tag = releases()[0]["tag_name"]
    if not os.path.isdir(os.path.join(SRC, ".git")):
        os.makedirs(os.path.dirname(SRC), exist_ok=True)
        print(f"cloning github.com/{UPSTREAM} into tools/src/vice-mcp", flush=True)
        subprocess.run(["git", "clone", "-q", f"https://github.com/{UPSTREAM}", SRC], check=True)
    else:
        if git("status", "--porcelain", "--untracked-files=no"):
            sys.exit("tools/src/vice-mcp has uncommitted changes; the kit will not overwrite them")
        git("fetch", "-q", "--tags", "origin")
    # a local branch at the release tag, so `status` names the tag and anything merged on top
    git("checkout", "-q", "-B", "kit-build", tag)
    print(f"source: {tag}", flush=True)
    if prs:
        merge_prs()
    sys.exit(subprocess.run([sys.executable, os.path.join(HERE, "build_vice.py"), SRC]).returncode)


def main():
    a = sys.argv[1:]
    if a and a[0] in ("-h", "--help"):
        print(__doc__); return
    if not a:
        resolve()
    elif a[0] == "download":
        download(a[1] if len(a) > 1 else None)
    elif a[0] == "build":
        build(prs="--prs" in a[1:])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
