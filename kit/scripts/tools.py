#!/usr/bin/env python3
"""Start, check and stop the tools, through the platform's launcher.

Every tool the kit uses is started only through this script (AGENTS.md,
"Leave the cleanest footprint you can"), so that the containment lives in
one place per platform: kit/<platform>/tools.py. This script picks the
platform and hands the command over unchanged.

Usage:
  tools.py [--platform <name>] <command> [args]     e.g. tools.py status
  tools.py --platforms                              list platforms that have a launcher

With one platform under kit/, it is the default. With more, name it with
--platform or the KIT_PLATFORM environment variable. Each launcher prints
its own commands with `tools.py --platform <name> -h`.
"""
import os, runpy, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


SELF_DIR = os.path.basename(os.path.dirname(os.path.abspath(__file__)))   # "scripts" is not a platform


def platforms():
    return sorted(d for d in os.listdir(KIT)
                  if d != SELF_DIR and os.path.isfile(os.path.join(KIT, d, "tools.py")))


def main():
    a = sys.argv[1:]
    if a and a[0] == "--platforms":
        for p in platforms(): print(p)
        return
    plat = os.environ.get("KIT_PLATFORM")
    if a and a[0] == "--platform":
        if len(a) < 2: sys.exit("usage: tools.py --platform <name> <command>")
        plat, a = a[1], a[2:]
    avail = platforms()
    if not plat:
        if len(avail) == 1:
            plat = avail[0]
        else:
            sys.exit(__doc__ + "\nplatforms with a launcher: " + (", ".join(avail) or "none"))
    if plat not in avail:
        sys.exit(f"no launcher at kit/{plat}/tools.py; platforms with one: {', '.join(avail) or 'none'}")
    launcher = os.path.join(KIT, plat, "tools.py")
    sys.argv = [launcher] + a
    runpy.run_path(launcher, run_name="__main__")


if __name__ == "__main__":
    main()
