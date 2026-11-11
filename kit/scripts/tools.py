#!/usr/bin/env python3
"""Start, check and stop the tools, through the platform's launcher.

Every tool the kit uses is started only through this script (AGENTS.md,
"Leave the cleanest footprint you can"), so that the containment lives in
kit/scripts/browser.py for browser checks, kit/scripts/node.py for the Node
and Playwright client the page tests need, kit/zmachine/bocfel.py for the
Z-machine interpreter, kit/scumm/scummvm.py for the SCUMM one, and
kit/<platform>/tools.py for platform tools. Browser, Node, Bocfel and ScummVM
commands need no platform selection: Infocom's games run on the Z-machine and
Lucasfilm's on SCUMM whatever machine they were sold for
(kit/zmachine/INSTALL.md, kit/scumm/INSTALL.md).

Usage:
  tools.py [--platform <name>] <command> [args]     e.g. tools.py status
  tools.py browser                                 installed browser, isolated profile (browser.py documents Chromium selection)
  tools.py stop browser                            stop only this clone's browser
  tools.py get-node [--version vX.Y.Z]             download Node (the newest LTS release) and playwright-core into tools/,
                                                   for a machine with no Node
  tools.py node run <command> [args]               run a command with that Node first on its PATH (node.py -h for the rest);
                                                   a platform's launcher is given it without being asked
  tools.py get-bocfel                              download and build Bocfel, with the kit's trace
  tools.py bocfel run <story> [...]                play a story on it (bocfel.py -h for the rest)
  tools.py get-scummvm                             download and build ScummVM's SCUMM engine, with the kit's trace
  tools.py scummvm run <game folder> [...]         play a SCUMM game on it (scummvm.py -h for the rest)
  tools.py --platforms                              list platforms that have a launcher
  tools.py -h                                       this, and every platform's commands

Which platform, in this order:
  1. --platform <name>, or the KIT_PLATFORM environment variable.
  2. With one platform under kit/, that one.
  3. The command: a command only one launcher serves picks it (`vice` is the
     C64's). So does an argument naming a tool only one launcher has
     (`stop r2000`).
  4. A game folder: an argument inside games/<platform>/, or the working
     directory inside one.
  5. `status` and `stop` with nothing else to go on run on every platform's
     tools in this clone. Anything else still ambiguous is refused, naming the
     platforms: never a silent default.
The platform chosen is exported as KIT_PLATFORM, so every script the launcher
starts inherits it.

A launcher declares what it serves as two module-level tuples of strings,
read here without running it:
  COMMANDS   the commands its main() accepts
  TOOL_NAMES the tool names its commands take as an argument (`stop vice`)
"""
import ast, os, runpy, subprocess, sys
import browser
import node

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
SELF_DIR = os.path.basename(os.path.dirname(os.path.abspath(__file__)))   # "scripts" is not a platform
EVERY_PLATFORM = ("status", "stop")    # safe to run on every platform's tools at once
SHARED = ("get-node", "node",          # Node and the Playwright client, which every platform's page tests share
          "get-bocfel", "bocfel",      # the Z-machine's, which every platform's Infocom games share
          "get-scummvm", "scummvm")    # SCUMM's, which every platform's Lucasfilm games share


def bocfel():
    """kit/zmachine/bocfel.py, imported when a command needs it."""
    sys.path.insert(0, os.path.join(KIT, "zmachine"))
    import bocfel as b
    return b


def scummvm():
    """kit/scumm/scummvm.py, imported when a command needs it."""
    sys.path.insert(0, os.path.join(KIT, "scumm"))
    import scummvm as s
    return s


def platforms(kit=KIT):
    return sorted(d for d in os.listdir(kit)
                  if d != SELF_DIR and os.path.isfile(os.path.join(kit, d, "tools.py")))


def declared(plat, kit=KIT):
    """A launcher's COMMANDS and TOOL_NAMES, read from its source; empty when it declares none."""
    out = {"COMMANDS": (), "TOOL_NAMES": ()}
    tree = ast.parse(open(os.path.join(kit, plat, "tools.py"), encoding="utf-8").read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name in out:
                out[name] = tuple(ast.literal_eval(node.value))
    return out


class Ambiguous(Exception):
    pass


def _game_platform(path, avail):
    """The platform of games/<platform>/ that `path` lies in, or None."""
    rel = os.path.relpath(os.path.realpath(path), os.path.realpath(ROOT)).split(os.sep)   # on macOS /var is /private/var

    return rel[1] if len(rel) >= 3 and rel[0] == "games" and rel[1] in avail else None


def resolve(args, decl, explicit=None, env=None, cwd=None):
    """The platforms to run `args` on: one, or every platform for status/stop.

    decl maps each platform to what it declared. Raises Ambiguous with the reason."""
    avail = sorted(decl)
    plat = explicit or env
    if plat:
        if plat not in decl:
            raise Ambiguous(f"no launcher at kit/{plat}/tools.py; platforms with one: {', '.join(avail) or 'none'}")
        return [plat]
    if not avail:
        raise Ambiguous("no platform has a launcher under kit/")
    if len(avail) == 1:
        return avail
    cmd = args[0] if args else None
    if cmd:
        serve = [p for p in avail if cmd in decl[p]["COMMANDS"]]
        if len(serve) == 1:
            return serve
        if not serve and all(decl[p]["COMMANDS"] for p in avail):
            raise Ambiguous(f"no launcher has a command '{cmd}'; see `tools.py -h`")
        for a in args[1:]:
            own = [p for p in avail if a in decl[p]["TOOL_NAMES"]]
            if len(own) == 1:
                return own
    games = {_game_platform(a, avail) for a in args[1:] if not a.startswith("-")} - {None}
    if cwd:
        games |= {_game_platform(cwd, avail)} - {None}
    if len(games) == 1:
        return sorted(games)
    if len(games) > 1:
        raise Ambiguous(f"the arguments name games on more than one platform ({', '.join(sorted(games))}); "
                        "say which with --platform")
    if cmd in EVERY_PLATFORM:
        return avail
    raise Ambiguous(f"'{' '.join(args) or '(no command)'}' could be for any of {', '.join(avail)}: "
                    f"name one, e.g. `python3 kit/scripts/tools.py --platform {avail[0]} {' '.join(args)}`")


def usage(avail, decl):
    lines = [__doc__, "platforms with a launcher: " + (", ".join(avail) or "none")]
    for p in avail:
        cmds = ", ".join(decl[p]["COMMANDS"]) or "(not declared)"
        lines.append(f"  {p}: {cmds}   (tools.py --platform {p} -h for details)")
    return "\n".join(lines)


def main():
    a = sys.argv[1:]
    if a and a[0] == "--platforms":
        for p in platforms(): print(p)
        return
    explicit = None
    if a and a[0] == "--platform":
        if len(a) < 2: sys.exit("usage: tools.py --platform <name> <command>")
        explicit, a = a[1], a[2:]
    if a == ["browser"]:
        browser.start(); return
    if a in (["stop", "browser"], ["stop", "browser", "--force"]):
        browser.stop(); return
    if a and a[0] == "get-node":
        sys.exit(node.main(["get"] + a[1:]))
    if a and a[0] == "node":
        sys.exit(node.main(a[1:]))
    if a == ["get-bocfel"]:
        bocfel().get(); return
    if a and a[0] == "bocfel":
        sys.exit(bocfel().main(a[1:]))
    if a == ["get-scummvm"]:
        scummvm().get(); return
    if a and a[0] == "scummvm":
        sys.exit(scummvm().main(a[1:]))
    if os.path.isfile(os.path.join(ROOT, "tools", "node", "bin", "node")):
        os.environ.update(node.environment())    # a launcher's server runs on the Node in tools/, when there is one
    avail = platforms()
    decl = {p: declared(p) for p in avail}
    if not explicit and not os.environ.get("KIT_PLATFORM") and len(avail) > 1 \
            and (not a or a[0] in ("-h", "--help")):
        print(usage(avail, decl)); return
    try:
        chosen = resolve(a, decl, explicit=explicit, env=os.environ.get("KIT_PLATFORM"), cwd=os.getcwd())
    except Ambiguous as e:
        sys.exit(f"{e}\n\n{usage(avail, decl)}")
    if a == ["status"]:
        browser.status()
        if os.path.isdir(os.path.join(ROOT, "tools", "node")):
            print(f"node          {node.build_line()}")
        if os.path.isdir(os.path.join(ROOT, "tools", "zmachine")):
            print(f"bocfel        {bocfel().build_line()}")
        if os.path.isdir(os.path.join(ROOT, "tools", "scumm")):
            print(f"scummvm       {scummvm().build_line()}")
    if a and a[0] == "stop" and all(x in ("all", "--force") for x in a[1:]):
        browser.stop()
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
    if len(chosen) == 1:
        os.environ["KIT_PLATFORM"] = chosen[0]
        launcher = os.path.join(KIT, chosen[0], "tools.py")
        sys.argv = [launcher] + a
        runpy.run_path(launcher, run_name="__main__")
        return
    worst = 0
    for p in chosen:      # status/stop on every platform: each in its own process, all of them run
        print(f"== {p}", flush=True)
        r = subprocess.run([sys.executable, os.path.join(KIT, p, "tools.py"), *a],
                           env=dict(os.environ, KIT_PLATFORM=p))
        worst = worst or r.returncode
    sys.exit(worst)


if __name__ == "__main__":
    main()
