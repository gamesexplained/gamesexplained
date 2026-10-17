"""Installed Firefox or explicitly selected Chromium for page checks.

Reached through kit/scripts/tools.py; no download or personal profile access.
KIT_BROWSER_CHROMIUM may name an existing chrome-headless-shell or Chromium
executable. KIT_BROWSER_PORT selects an unused debugging port (default 9222).
Keep that port setting for status/stop. Profile and XDG state stay in tools/.
Deep paths can exceed full Chromium's Unix socket limit; headless-shell avoids
that profile-singleton socket.

With no Firefox (on macOS, the one in /Applications counts), start() names any
Chrome, Chromium or Edge it finds and stops: picking one is the contributor's
call, since Google Chrome can start its own updater outside the folder (#331).
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
APPS = ["/Applications", str(Path.home() / "Applications")]
MAC_CHROMIUM = ["Google Chrome", "Chromium", "Microsoft Edge"]   # Name.app/Contents/MacOS/Name
LINUX_CHROMIUM = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
                  "chrome-headless-shell", "microsoft-edge"]


def up():
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
            return True
    except OSError:
        return False


def firefox():
    """An installed Firefox: on PATH, or in an Applications folder on macOS, which puts none on PATH."""
    found = shutil.which("firefox")
    if found or sys.platform != "darwin":
        return found
    return next((str(p) for p in (Path(a) / "Firefox.app/Contents/MacOS/firefox" for a in APPS) if p.is_file()), None)


def installed_chromium():
    """Chrome, Chromium and Edge installed here, for the message when there is no Firefox."""
    if sys.platform == "darwin":
        found = [Path(a) / f"{n}.app/Contents/MacOS/{n}" for a in APPS for n in MAC_CHROMIUM]
        return [str(p) for p in found if p.is_file()]
    return [p for p in (shutil.which(n) for n in LINUX_CHROMIUM) if p]


def no_firefox():
    found = installed_chromium()
    if not found:
        return "no installed Firefox, Chrome, Chromium or Edge; use the session's browser tool or ask before installing one"
    return ("no installed Firefox. Found " + ", ".join(found) + ". To check pages with one, ask the contributor first "
            "(Google Chrome can start its own updater, which runs outside this folder), then:\n"
            f"  KIT_BROWSER_CHROMIUM='{found[0]}' python3 kit/scripts/tools.py browser\n"
            "kit/INSTALL.md, \"Browser checks\", says what that leaves outside the folder")


def start():
    chromium = os.environ.get("KIT_BROWSER_CHROMIUM")
    exe = chromium or firefox()
    if chromium and not Path(chromium).is_file():
        sys.exit("KIT_BROWSER_CHROMIUM must name an existing Chromium executable; nothing is downloaded")
    if not exe:
        sys.exit(no_firefox())
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
    # A macOS app's executable has spaces in its path, so it is matched where it is installed.
    ere = lambda t: re.sub(r"([\\.^$|?*+()\[\]{}])", r"\\\1", t)   # POSIX ERE, where "\ " is undefined
    apps = "|".join(ere(a) for a in APPS)
    names = "|".join(ere(n) for n in MAC_CHROMIUM)
    chromium = (r"^(([^ ]*/)?(chrome|chromium|chromium-browser|chrome-headless-shell|google-chrome(-stable)?|"
                rf"microsoft-edge|msedge)|({apps})/({names})\.app/Contents/MacOS/({names}))"
                r" --headless --user-data-dir="
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
