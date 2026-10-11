"""Installed Firefox or explicitly selected Chromium for page checks.

Reached through kit/scripts/tools.py; no download or personal profile access.
KIT_BROWSER_CHROMIUM may name an existing chrome-headless-shell or Chromium
executable. KIT_BROWSER_PORT selects an unused debugging port (default 9222).
Keep that port setting for status/stop. Profile and XDG state stay in tools/.
Deep paths can exceed full Chromium's Unix socket limit; headless-shell avoids
that profile-singleton socket.
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
PORT = int(os.environ.get("KIT_BROWSER_PORT", "9222"))
CHROMIUM_STATE = ROOT / "tools/chromium"


def up():
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
            return True
    except OSError:
        return False


def start():
    chromium = os.environ.get("KIT_BROWSER_CHROMIUM")
    exe = chromium or shutil.which("firefox")
    if chromium and not Path(chromium).is_file():
        sys.exit("KIT_BROWSER_CHROMIUM must name an existing Chromium executable; nothing is downloaded")
    if not exe:
        sys.exit("no installed Firefox on PATH; use the session's browser tool or ask before installing one")
    if up():
        sys.exit(f"port {PORT} is occupied; leave that browser alone or stop this clone's with tools.py stop browser")
    state = CHROMIUM_STATE if chromium else STATE
    profile = state / "profile"
    profile.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data"), ("TMPDIR", "tmp")):
        path = state / sub
        path.mkdir(exist_ok=True)
        env[var] = str(path)
    env["MOZ_CRASHREPORTER_DISABLE"] = "1"
    LOG.parent.mkdir(parents=True, exist_ok=True)
    command = ([exe, "--headless", "--user-data-dir=" + str(profile),
                "--remote-debugging-port=" + str(PORT), "--no-first-run",
                "--no-default-browser-check", "--disable-breakpad", "--disable-crash-reporter",
                "--no-sandbox", "about:blank"] if chromium else
               [exe, "--headless", "--no-remote", "--profile", str(profile),
                "--remote-debugging-port", str(PORT), "about:blank"])
    with LOG.open("ab") as log:
        process = subprocess.Popen(
            command,
            env=env, cwd=state, stdin=subprocess.DEVNULL,
            stdout=log, stderr=log, start_new_session=True)
    for _ in range(40):
        if up():
            print(f"browser up on :{PORT} ({'Chromium CDP' if chromium else 'Firefox BiDi'}; profile: {profile}; log: tools/logs/firefox.log)"); return
        if process.poll() is not None:
            break
        time.sleep(0.5)
    sys.exit(f"browser did not come up on :{PORT}; read tools/logs/firefox.log")


def stop_pattern():
    # Anchor the executable as well as the exact profile argument: a personal
    # browser, another clone, and shell commands mentioning this path stay up.
    firefox = (r"^([^ ]*/)?firefox(-bin|-esr)? --headless --no-remote --profile "
            + re.escape(str(STATE / "profile"))
            + rf" --remote-debugging-port {PORT}( |$)")
    chromium = (r"^([^ ]*/)?(chrome|chromium|chromium-browser|chrome-headless-shell) --headless --user-data-dir="
                + re.escape(str(CHROMIUM_STATE / "profile"))
                + rf" --remote-debugging-port={PORT}( |$)")
    return "(" + firefox + "|" + chromium + ")"


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
    if CHROMIUM_STATE.is_dir():
        print(f"browser       :{PORT}  {'up' if up() else 'down'}   profile: tools/chromium/profile")
    if STATE.is_dir():
        print(f"browser       :{PORT}  {'up' if up() else 'down'}   profile: tools/firefox/profile")
