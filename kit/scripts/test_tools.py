#!/usr/bin/env python3
"""Tests for kit/scripts/tools.py, the dispatcher that picks a platform's launcher.

    python3 kit/scripts/test_tools.py

Runs in CI. With one platform under kit/ the dispatcher has nothing to choose, so the
tests here always add a second one: a synthetic declaration for the rule tests and the
documentation sweep, and a stub launcher beside a copy of the real ones for the end-to-end
runs. Nothing is started; the stub only prints what it was handed.
"""
import os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
ROOT = os.path.dirname(KIT)
sys.path.insert(0, HERE)
import tools   # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not ok else ""))
    if not ok:
        failures.append(name)


# A synthetic second platform, for the rules. It serves the shared commands, so the
# ambiguity rules are tested whatever else is under kit/, and one command of its own;
# it never copies another platform's own commands (kit/spectrum's), which would make a
# one-platform command look ambiguous.
SECOND = {"COMMANDS": ("status", "stop", "check-emulator", "verify-footprint", "snapshots", "second-only"),
          "TOOL_NAMES": ()}


def decls():
    d = {p: tools.declared(p) for p in tools.platforms()}
    d["second"] = SECOND
    return d


def resolves(args, **kw):
    try:
        return tools.resolve(args, decls(), **kw)
    except tools.Ambiguous as e:
        return "refused: " + str(e)


def test_declarations():
    for p in tools.platforms():
        src = open(os.path.join(KIT, p, "tools.py"), encoding="utf-8").read()
        d = tools.declared(p)
        check(f"{p}: declares COMMANDS", bool(d["COMMANDS"]))
        body = src[src.find("\ndef main("):]
        served = set(re.findall(r'a\[0\] == "([a-z][a-z0-9-]*)"', body))
        for m in re.finditer(r"a\[0\] in \(([^)]*)\)", body):
            served |= set(re.findall(r'"([a-z][a-z0-9-]*)"', m.group(1)))
        check(f"{p}: COMMANDS matches main()", served == set(d["COMMANDS"]),
              f"main() has {sorted(served - set(d['COMMANDS']))} undeclared, "
              f"{sorted(set(d['COMMANDS']) - served)} declared but not in main()")


def test_rules():
    games = os.path.join(ROOT, "games")
    check("explicit platform wins", resolves(["check-emulator"], explicit="second") == ["second"])
    check("KIT_PLATFORM wins", resolves(["vice"], env="c64") == ["c64"])
    check("unknown explicit platform is refused", str(resolves(["status"], explicit="nope")).startswith("refused"))
    check("a command one platform serves picks it", resolves(["vice"]) == ["c64"])
    check("... and the other's picks the other", resolves(["second-only"]) == ["second"])
    check("a tool argument picks its platform", resolves(["stop", "r2000", "--force"]) == ["c64"])
    check("a game folder argument picks its platform",
          resolves(["snapshots", os.path.join(games, "second", "x", "work")]) == ["second"])
    check("a working directory in a game picks its platform",
          resolves(["check-emulator"], cwd=os.path.join(games, "c64", "x")) == ["c64"])
    check("status alone covers every platform", resolves(["status"]) == sorted(decls()))
    check("stop alone covers every platform", resolves(["stop"]) == sorted(decls()))
    for cmd in ("check-emulator", "verify-footprint", "snapshots"):
        r = resolves([cmd])
        check(f"{cmd} alone is refused, naming the flag", isinstance(r, str) and "--platform" in r, r)
    check("an unknown command is refused", str(resolves(["frobnicate"])).startswith("refused"))
    one = {"c64": tools.declared("c64")}
    check("one platform is the default", tools.resolve(["check-emulator"], one) == ["c64"])


# `python3 kit/scripts/tools.py ...` anywhere, or `tools.py ...` in backticks
DOC_CMD = re.compile(r"(?:kit/scripts/tools\.py|`tools\.py)((?: +[^\s`#(),;\\\"']+)*)")


def test_documented_commands():
    """Every command the kit's docs and messages tell an agent to run still reaches one launcher
    (or, for status/stop, every launcher) when a second platform is present."""
    files = [os.path.join(ROOT, f) for f in ("AGENTS.md", "README.md")]
    for d, _, names in os.walk(KIT):
        if d != os.path.join(KIT, "lessons"):    # a lesson names the commands of its day
            files += [os.path.join(d, n) for n in names if n.endswith((".md", ".py"))]
    seen = bad = 0
    for path in files:
        if not os.path.isfile(path) or path == os.path.abspath(__file__):
            continue
        rel = os.path.relpath(path, ROOT)
        for n, line in enumerate(open(path, encoding="utf-8"), 1):
            for m in DOC_CMD.finditer(line):
                args = m.group(1).split()
                if not args or not re.match(r"^(--platform|[a-z])", args[0]):
                    continue
                explicit = None
                if args[0] == "--platform":
                    if len(args) < 2 or args[1].startswith("<"):
                        continue                          # a placeholder: the reader names the platform
                    explicit, args = args[1], args[2:]
                    if explicit not in decls():
                        continue                          # a platform not in this checkout
                if not args or args[0].startswith("<") or args[0] in ("-h", "--help", "--platforms"):
                    continue
                seen += 1
                r = resolves(args, explicit=explicit)
                ok = isinstance(r, list)
                if ok and (rel.startswith("kit/c64/") or rel.startswith("kit/skills/c64/")):
                    ok = "c64" in r
                if not ok:
                    bad += 1
                    check(f"documented command at {rel}:{n}: tools.py {' '.join(args)}", False, str(r))
    check(f"every documented launcher command resolves ({seen} found)", bad == 0 and seen > 0)


STUB = '''import os, sys
COMMANDS = ("status", "stop", "check-emulator", "verify-footprint", "snapshots", "stub-run")
TOOL_NAMES = ()
print("stub", " ".join(sys.argv[1:]), "KIT_PLATFORM=" + os.environ.get("KIT_PLATFORM", ""))
'''


def test_end_to_end():
    """The real dispatcher and the real C64 launcher, copied beside a stub second launcher."""
    with tempfile.TemporaryDirectory() as tmp:
        kit = os.path.join(tmp, "kit")
        os.makedirs(os.path.join(kit, "scripts"))
        for f in ("tools.py", "launcher.py"):       # the dispatcher, and what the launchers share
            shutil.copy(os.path.join(HERE, f), os.path.join(kit, "scripts"))
        for p in tools.platforms():
            shutil.copytree(os.path.join(KIT, p), os.path.join(kit, p))
        os.makedirs(os.path.join(kit, "stub"))
        open(os.path.join(kit, "stub", "tools.py"), "w").write(STUB)
        os.makedirs(os.path.join(tmp, "games", "stub", "x"))
        env = {k: v for k, v in os.environ.items() if k != "KIT_PLATFORM"}

        def run(*args, cwd=tmp):
            r = subprocess.run([sys.executable, os.path.join(kit, "scripts", "tools.py"), *args],
                               capture_output=True, text=True, cwd=cwd, env=env, timeout=120)
            return r.returncode, r.stdout + r.stderr

        code, out = run("status")
        check("e2e: status runs every launcher",
              code == 0 and "== c64" in out and "== stub" in out and "stub status KIT_PLATFORM=stub" in out, out)
        code, out = run("--platform", "c64", "status")
        check("e2e: --platform c64 status answers (what kit/c64/check_emulator.py reads)",
              code == 0 and out.strip() and "stub" not in out, out)
        code, out = run("check-emulator")
        check("e2e: check-emulator alone is refused, naming the flag", code != 0 and "--platform" in out, out)
        code, out = run("stub-run", "x")
        check("e2e: a stub-only command reaches the stub with KIT_PLATFORM set",
              "stub stub-run x KIT_PLATFORM=stub" in out, out)
        code, out = run("snapshots", cwd=os.path.join(tmp, "games", "stub", "x"))
        check("e2e: a game folder as working directory picks its launcher",
              "stub snapshots KIT_PLATFORM=stub" in out, out)
        code, out = run()
        check("e2e: no command lists every platform's commands", code == 0 and "c64:" in out and "stub:" in out, out)


if __name__ == "__main__":
    test_declarations()
    test_rules()
    test_documented_commands()
    test_end_to_end()
    print(f"\n{'all passed' if not failures else str(len(failures)) + ' failed'}")
    sys.exit(1 if failures else 0)
