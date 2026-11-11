#!/usr/bin/env python3
"""Node.js and Playwright for the kit's page tests, installed inside tools/.

The page tests (`test_*.js`), the frame renderers and `kit/scripts/shoot.js` need Node, and
the browser checks need a Playwright client. A contributor who has neither gets both here,
inside the clone, so that deleting tools/ removes them (kit/INSTALL.md, "The footprint
principle"). A machine that has Node already needs none of this.

Reached through `python3 kit/scripts/tools.py get-node` and `tools.py node ...`, which need
no --platform.

Everything goes under tools/ (gitignored):
  tools/node/           Node.js (nodejs.org, MIT), the project's own release for this machine:
                        the newest LTS release, or the one --version names. npm comes in it
  tools/npm/            playwright-core (Microsoft, Apache-2.0), from the npm registry, in
                        node_modules/; npm's cache and logs in cache/; the home directory npm
                        runs with in home/, so that it reads and writes no ~/.npmrc and no ~/.npm

No browser is downloaded: playwright-core is the client alone. kit/INSTALL.md, "Browser
checks", says how the kit uses a browser the machine has.

The download is checked against the SHA-256 in the release's own SHASUMS256.txt, fetched
from the same site. That catches a broken or cut-off download; it is not a check of who
published the release.

Usage:
  node.py get [--version vX.Y.Z]   download, check and unpack Node; install playwright-core
  node.py status                   which Node and playwright-core are there
  node.py run <command> [args]     run a command with them first on its PATH and NODE_PATH, so
                                   that it and whatever it starts find them:
                                     node.py run node kit/scripts/shoot.js ...
                                     node.py run python3 kit/scripts/test_kit.py
  node.py env                      the two variables, as lines a shell can eval
"""
import hashlib, json, os, platform, shutil, subprocess, sys, tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
DIST = "https://nodejs.org/dist"
STAMP = "KIT_NODE"           # in tools/node: the version, and the SHA-256 its tarball had
ARCH = {"x86_64": "x64", "amd64": "x64", "arm64": "arm64", "aarch64": "arm64"}


def machine(system=None, arch=None):
    """(the machine's name in Node's file names, its key in the release index), or None where
    Node's site has no tarball this script unpacks."""
    system = system or sys.platform
    arch = ARCH.get((arch or platform.machine()).lower())
    if not arch:
        return None
    if system == "darwin":
        return f"darwin-{arch}", f"osx-{arch}-tar"
    if system.startswith("linux"):
        return f"linux-{arch}", f"linux-{arch}"
    return None


def _number(version):
    return tuple(int(x) for x in version.lstrip("v").split("."))


def newest_lts(index, key):
    """The highest LTS version in Node's release index that has a file for this machine."""
    lts = [r["version"] for r in index if r.get("lts") and key in r.get("files", ())]
    return max(lts, key=_number) if lts else None


def checksum(sums, name):
    """The SHA-256 SHASUMS256.txt gives for a file, or None."""
    for line in sums.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1] == name:
            return parts[0].lower()
    return None


def _fetch(url, path=None):
    import urllib.request
    with urllib.request.urlopen(url, timeout=120) as r:
        if path is None:
            return r.read()
        with open(path, "wb") as f:
            shutil.copyfileobj(r, f, 1 << 20)


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def unpack(tarball, top, dest):
    """Unpack the release, whose every member is under the folder `top`, as the folder dest."""
    work = dest + ".unpacking"
    shutil.rmtree(work, ignore_errors=True)
    with tarfile.open(tarball) as t:
        for m in t.getmembers():
            parts = m.name.split("/")
            inside = parts[0] == top and ".." not in parts and not m.name.startswith("/")
            if m.issym() or m.islnk():      # bin/npm is a link into lib/: a link stays in the release
                target = os.path.normpath(os.path.join(os.path.dirname(m.name), m.linkname)) if m.issym() else m.linkname
                inside = inside and not os.path.isabs(m.linkname) and target.split("/")[0] == top
            elif not (m.isfile() or m.isdir()):
                inside = False
            if not inside:
                sys.exit(f"{os.path.basename(tarball)}: unexpected member {m.name!r}; nothing was installed")
        if hasattr(tarfile, "data_filter"):
            t.extractall(work, filter="data")
        else:
            t.extractall(work)
    shutil.rmtree(dest, ignore_errors=True)
    os.replace(os.path.join(work, top), dest)
    os.rmdir(work)


def environment(tools=TOOLS, base=None):
    """The environment a command runs in to use the Node and the Playwright client in tools/."""
    env = dict(os.environ if base is None else base)
    env["PATH"] = os.path.join(tools, "node", "bin") + os.pathsep + env.get("PATH", "")
    env["NODE_PATH"] = os.path.join(tools, "npm", "node_modules")
    return env


def _npm_environment(tools):
    """As environment(), with npm's home, settings, cache and logs inside tools/npm/."""
    npm = os.path.join(tools, "npm")
    home = os.path.join(npm, "home")
    os.makedirs(home, exist_ok=True)
    env = environment(tools)
    env.update(HOME=home, USERPROFILE=home,
               npm_config_cache=os.path.join(npm, "cache"),
               npm_config_userconfig=os.path.join(home, ".npmrc"),
               npm_config_update_notifier="false",
               PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1")
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "xdg-cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(home, sub)
    return env


def _version_of(exe, env):
    try:
        r = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=60, env=env)
    except OSError as e:
        return None, str(e)
    return (r.stdout.strip() or None) if r.returncode == 0 else None, (r.stderr.strip() or f"exit {r.returncode}")


def get(version=None, dist=DIST, tools=TOOLS, system=None, arch=None):
    m = machine(system, arch)
    if not m:
        sys.exit(f"no Node tarball for {system or sys.platform} {arch or platform.machine()} that this script unpacks: "
                 "install Node from https://nodejs.org with the project's own installer, if the contributor agrees")
    name, key = m
    if not version:
        version = newest_lts(json.loads(_fetch(f"{dist}/index.json")), key)
        if not version:
            sys.exit(f"{dist}/index.json lists no LTS release with a file for {name}; nothing was installed")
    if not version.startswith("v"):
        version = "v" + version
    top = f"node-{version}-{name}"
    file = top + ".tar.gz"
    want = checksum(_fetch(f"{dist}/{version}/SHASUMS256.txt").decode("utf-8", "replace"), file)
    if not want:
        sys.exit(f"{dist}/{version}/SHASUMS256.txt names no {file}; nothing was installed")
    os.makedirs(tools, exist_ok=True)
    tarball = os.path.join(tools, file + ".part")
    print(f"downloading Node.js {version} (OpenJS Foundation, MIT) from its own site:\n  {dist}/{version}/{file}")
    _fetch(f"{dist}/{version}/{file}", tarball)
    got = _sha256(tarball)
    if got != want:
        os.remove(tarball)
        sys.exit(f"{file}: SHA-256 {got}, where the release's SHASUMS256.txt has {want}; nothing was installed")
    print(f"SHA-256 matches the release's SHASUMS256.txt: {want}")
    dest = os.path.join(tools, "node")
    try:
        unpack(tarball, top, dest)
    finally:
        os.remove(tarball)
    exe = os.path.join(dest, "bin", "node")
    runs, why = _version_of(exe, environment(tools))
    if runs != version:
        shutil.rmtree(dest, ignore_errors=True)
        sys.exit(f"the Node unpacked does not run on this machine ({why if runs is None else 'it says ' + runs}); "
                 "it was removed. Node's Linux releases need glibc")
    with open(os.path.join(dest, STAMP), "w") as f:
        f.write(f"{version} {want}\n")
    npm = os.path.join(tools, "npm")
    os.makedirs(npm, exist_ok=True)
    print("installing playwright-core (Microsoft, Apache-2.0) from the npm registry into tools/npm/")
    r = subprocess.run([os.path.join(dest, "bin", "npm"), "install", "--prefix", npm, "--no-audit", "--no-fund",
                        "playwright-core"], env=_npm_environment(tools))
    if r.returncode:
        sys.exit(f"npm install playwright-core failed (exit {r.returncode}); Node {version} is in tools/node/")
    print(f"{build_line(tools)}\nrun a command with them:\n  python3 kit/scripts/tools.py node run <command> [args]")


def playwright(tools=TOOLS):
    try:
        with open(os.path.join(tools, "npm", "node_modules", "playwright-core", "package.json")) as f:
            return json.load(f).get("version")
    except (OSError, ValueError):
        return None


def build_line(tools=TOOLS):
    """Which Node and playwright-core are in tools/, as a line that can go into game.json."""
    try:
        with open(os.path.join(tools, "node", STAMP)) as f:
            version = f.read().split()[0]
    except (OSError, IndexError):
        return "MISSING (run: tools.py get-node)"
    pw = playwright(tools)
    return f"Node.js {version} (nodejs.org), playwright-core {pw or 'MISSING (run: tools.py get-node)'}"


def env_lines(tools=TOOLS):
    import shlex
    return (f'export PATH={shlex.quote(os.path.join(tools, "node", "bin"))}:"$PATH"\n'
            f'export NODE_PATH={shlex.quote(os.path.join(tools, "npm", "node_modules"))}')


def run(argv, tools=TOOLS):
    """Run a command with tools/'s Node and Playwright client in front; its exit status."""
    if not os.path.isfile(os.path.join(tools, "node", "bin", "node")):
        sys.exit(f"no Node in tools/: {build_line(tools)}")
    try:
        return subprocess.run(argv, env=environment(tools)).returncode
    except FileNotFoundError:
        sys.exit(f"{argv[0]}: no such command")


def main(a):
    if a == ["status"]:
        print(build_line()); return 0
    if a == ["env"]:
        print(env_lines()); return 0
    if len(a) > 1 and a[0] == "run":
        return run(a[1:])
    if a and a[0] == "get" and (len(a) == 1 or (len(a) == 3 and a[1] == "--version")):
        get(a[2] if len(a) == 3 else None); return 0
    print(__doc__)
    return 0 if a and a[0] in ("-h", "--help") else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
