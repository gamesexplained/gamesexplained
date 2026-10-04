"""Installed Firefox for page checks on any emulated platform.

Reached through kit/scripts/tools.py; no download or personal profile access.
"""
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / "tools/firefox"
LOG = ROOT / "tools/logs/firefox.log"
PORT = 9222


def up():
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
            return True
    except OSError:
        return False


def start():
    exe = shutil.which("firefox")
    if not exe:
        sys.exit("no installed Firefox on PATH; use the session's browser tool or ask before installing one")
    if up():
        sys.exit("port 9222 is occupied; leave that browser alone or stop this clone's with tools.py stop browser")
    profile = STATE / "profile"
    profile.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data"), ("TMPDIR", "tmp")):
        path = STATE / sub
        path.mkdir(exist_ok=True)
        env[var] = str(path)
    env["MOZ_CRASHREPORTER_DISABLE"] = "1"
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("ab") as log:
        process = subprocess.Popen(
            [exe, "--headless", "--no-remote", "--profile", str(profile),
             "--remote-debugging-port", str(PORT), "about:blank"],
            env=env, cwd=STATE, stdin=subprocess.DEVNULL,
            stdout=log, stderr=log, start_new_session=True)
    for _ in range(40):
        if up():
            print("browser up on :9222 (log: tools/logs/firefox.log)"); return
        if process.poll() is not None:
            break
        time.sleep(0.5)
    sys.exit("browser did not come up on :9222; read tools/logs/firefox.log")


def stop_pattern():
    # Anchor the executable as well as the exact profile argument: a personal
    # browser, another clone, and shell commands mentioning this path stay up.
    return (r"^([^ ]*/)?firefox(-bin|-esr)? --headless --no-remote --profile "
            + re.escape(str(STATE / "profile"))
            + r" --remote-debugging-port 9222( |$)")


def stop():
    result = subprocess.run(["pkill", "-f", "--", stop_pattern()])
    if result.returncode not in (0, 1):
        sys.exit("could not stop this clone's browser")
    for _ in range(40):
        remaining = subprocess.run(["pgrep", "-f", "--", stop_pattern()],
                                   stdout=subprocess.DEVNULL)
        if remaining.returncode == 1:
            return
        if remaining.returncode != 0:
            break
        time.sleep(0.25)
    sys.exit("this clone's browser has not exited; check tools/logs/firefox.log")


def status():
    if STATE.is_dir():
        print(f"browser       :9222  {'up' if up() else 'down'}   profile: tools/firefox/profile")
