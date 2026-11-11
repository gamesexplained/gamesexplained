#!/usr/bin/env python3
"""`tools.py get-node` installs Node and playwright-core inside tools/, and nowhere else.

No network: the test builds a release site of its own in a temporary folder (an index, a
SHASUMS256.txt and a tarball whose `node` and `npm` are shell scripts) and has
kit/scripts/node.py install from it by file:// addresses. It checks that the newest LTS
release with a file for the machine is the one taken, that the download is held to the
release's SHA-256, that a tarball with a member outside its folder is refused, that npm
runs with its home, cache and settings under tools/npm/, and that `run` puts the installed
Node first on a command's PATH.
"""
import contextlib
import hashlib
import io
import json
import os
import stat
import subprocess
import sys
import tarfile
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import node  # noqa: E402

NAME, KEY = "linux-x64", "linux-x64"
INDEX = [
    {"version": "v31.0.0", "lts": False, "files": [KEY, "osx-arm64-tar"]},       # newer, and no LTS
    {"version": "v30.9.0", "lts": "Xenon", "files": ["osx-arm64-tar"]},          # LTS, with no file for this machine
    {"version": "v30.2.0", "lts": "Xenon", "files": [KEY, "osx-arm64-tar"]},
    {"version": "v30.10.0", "lts": "Xenon", "files": [KEY]},                     # 10 is after 9
    {"version": "v28.20.0", "lts": "Argon", "files": [KEY]},
]
# What the made-up npm leaves behind says where it was told to keep its things.
NPM = """#!/bin/sh
prefix=
while [ $# -gt 0 ]; do [ "$1" = --prefix ] && prefix=$2; shift; done
mkdir -p "$prefix/node_modules/playwright-core"
echo '{"version": "9.8.7"}' > "$prefix/node_modules/playwright-core/package.json"
printf '%s\\n%s\\n%s\\n%s\\n' "$HOME" "$npm_config_cache" "$npm_config_userconfig" "$(command -v node)" > "$prefix/npm-saw"
"""


def release(dist, version, extra=None, lie=False):
    """A made-up release of Node under dist/<version>/: the tarball and its SHASUMS256.txt."""
    top = f"node-{version}-{NAME}"
    folder = os.path.join(dist, version)
    os.makedirs(folder)
    path = os.path.join(folder, top + ".tar.gz")
    with tarfile.open(path, "w:gz") as t:
        def add(name, text, mode=0o755):
            info = tarfile.TarInfo(name)
            data = text.encode()
            info.size, info.mode = len(data), mode
            t.addfile(info, io.BytesIO(data))
        add(f"{top}/bin/node", f"#!/bin/sh\necho {version}\n")
        add(f"{top}/lib/node_modules/npm/bin/npm-cli.js", NPM)
        link = tarfile.TarInfo(f"{top}/bin/npm")                # as in Node's own tarball
        link.type, link.linkname = tarfile.SYMTYPE, "../lib/node_modules/npm/bin/npm-cli.js"
        t.addfile(link)
        if extra:
            extra(t, top)
    with open(path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    with open(os.path.join(folder, "SHASUMS256.txt"), "w") as f:
        f.write(f"{'0' * 64}  node-{version}-darwin-arm64.tar.gz\n"
                f"{'f' * 64 if lie else digest}  {top}.tar.gz\n")
    return digest


class GetNode(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dist = os.path.join(self.tmp.name, "dist")
        self.tools = os.path.join(self.tmp.name, "clone", "tools")
        os.makedirs(self.dist)
        with open(os.path.join(self.dist, "index.json"), "w") as f:
            json.dump(INDEX, f)
        self.url = "file://" + self.dist

    def tearDown(self):
        self.tmp.cleanup()

    def get(self, **kw):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            node.get(dist=self.url, tools=self.tools, system="linux", arch="x86_64", **kw)
        return out.getvalue()

    def test_it_takes_the_newest_lts_release_this_machine_has_a_file_for(self):
        self.assertEqual(node.newest_lts(INDEX, KEY), "v30.10.0")
        self.assertEqual(node.newest_lts(INDEX, "osx-arm64-tar"), "v30.9.0")
        self.assertIsNone(node.newest_lts(INDEX, "sunos-x64"))

    def test_the_machines_it_knows(self):
        self.assertEqual(node.machine("darwin", "arm64"), ("darwin-arm64", "osx-arm64-tar"))
        self.assertEqual(node.machine("darwin", "x86_64"), ("darwin-x64", "osx-x64-tar"))
        self.assertEqual(node.machine("linux", "aarch64"), ("linux-arm64", "linux-arm64"))
        self.assertEqual(node.machine("linux", "AMD64"), ("linux-x64", "linux-x64"))
        self.assertIsNone(node.machine("win32", "AMD64"))
        self.assertIsNone(node.machine("linux", "riscv64"))

    def test_an_install_stays_inside_tools(self):
        digest = release(self.dist, "v30.10.0")
        said = self.get()
        self.assertIn(digest, said)
        self.assertEqual(node.build_line(self.tools), "Node.js v30.10.0 (nodejs.org), playwright-core 9.8.7")
        self.assertEqual(sorted(os.listdir(self.tools)), ["node", "npm"], "the tarball is removed once unpacked")
        self.assertTrue(os.path.islink(os.path.join(self.tools, "node", "bin", "npm")))
        with open(os.path.join(self.tools, "npm", "npm-saw")) as f:
            home, cache, userconfig, found = f.read().split("\n")[:4]
        npm = os.path.join(self.tools, "npm")
        self.assertEqual(home, os.path.join(npm, "home"), "npm ran with the contributor's home")
        self.assertEqual(cache, os.path.join(npm, "cache"))
        self.assertEqual(userconfig, os.path.join(npm, "home", ".npmrc"))
        self.assertEqual(found, os.path.join(self.tools, "node", "bin", "node"), "npm ran on another Node")
        self.assertEqual(sorted(os.listdir(self.tmp.name)), ["clone", "dist"])

    def test_a_named_version_is_the_one_installed(self):
        release(self.dist, "v28.20.0")
        self.get(version="28.20.0")
        self.assertIn("v28.20.0", node.build_line(self.tools))

    def test_a_download_that_differs_from_the_release_s_sum_is_refused(self):
        release(self.dist, "v30.10.0", lie=True)
        with self.assertRaises(SystemExit) as e, contextlib.redirect_stdout(io.StringIO()):
            node.get(dist=self.url, tools=self.tools, system="linux", arch="x86_64")
        self.assertIn("nothing was installed", str(e.exception))
        self.assertEqual(os.listdir(self.tools), [], "something was left behind")

    def test_a_member_outside_the_release_s_folder_is_refused(self):
        def outside(t, top):
            info = tarfile.TarInfo(f"{top}/../../escaped")
            info.size = 0
            t.addfile(info, io.BytesIO(b""))

        def link_out(t, top):
            link = tarfile.TarInfo(f"{top}/bin/corepack")
            link.type, link.linkname = tarfile.SYMTYPE, "../../../escaped"
            t.addfile(link)
        for n, extra in enumerate((outside, link_out)):
            version = f"v30.10.{n}"
            release(self.dist, version, extra=extra)
            with self.assertRaises(SystemExit) as e, contextlib.redirect_stdout(io.StringIO()):
                node.get(version=version, dist=self.url, tools=self.tools, system="linux", arch="x86_64")
            self.assertIn("unexpected member", str(e.exception))
            self.assertEqual(os.listdir(self.tools), [], "something was left behind")

    def test_a_machine_with_no_tarball_is_told_so(self):
        with self.assertRaises(SystemExit) as e:
            node.get(dist=self.url, tools=self.tools, system="win32", arch="AMD64")
        self.assertIn("nodejs.org", str(e.exception))

    def test_run_puts_the_installed_node_first(self):
        release(self.dist, "v30.10.0")
        self.get()
        env = node.environment(self.tools, base={"PATH": "/usr/bin:/bin"})
        self.assertEqual(env["NODE_PATH"], os.path.join(self.tools, "npm", "node_modules"))
        r = subprocess.run(["node", "--version"], env=env, capture_output=True, text=True)
        self.assertEqual(r.stdout.strip(), "v30.10.0")
        self.assertEqual(node.run(["sh", "-c", 'test "$(node --version)" = v30.10.0'], tools=self.tools), 0)
        self.assertTrue(os.stat(os.path.join(self.tools, "node", "bin", "node")).st_mode & stat.S_IXUSR)

    def test_without_an_install_it_says_how_to_get_one(self):
        self.assertIn("tools.py get-node", node.build_line(self.tools))
        with self.assertRaises(SystemExit):
            node.run(["node", "--version"], tools=self.tools)


if __name__ == "__main__":
    unittest.main()
