#!/usr/bin/env python3
"""The kit's Game & Watch server (kit/gnw/gnw_server.mjs), held to kit/EMULATOR.md: runs the nine
checks of kit/gnw/check_emulator.py on its own server and test program, and fails on any. Needs
Node, which every platform's server needs; not MAME.

    python3 kit/gnw/test_server.py
"""
import os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

if not shutil.which("node"):
    if os.environ.get("KIT_REQUIRE_TOOLS"):
        sys.exit("FAIL no node on the path, and KIT_REQUIRE_TOOLS is set")
    print("skip: no node on the path")
    sys.exit(0)

import check_emulator   # noqa: E402

sys.argv = [sys.argv[0]]
sys.exit(check_emulator.main())
