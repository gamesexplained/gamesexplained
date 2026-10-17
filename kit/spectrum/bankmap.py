#!/usr/bin/env python3
"""Which code ran, and in which RAM bank: the executed map of a 128K game.

ZEsarUX's `cpu-code-coverage` lists addresses only. On a 128K machine an
address at $C000-$FFFF is in whichever RAM bank $7FFD had paged in when it
ran, so that list cannot say whose code it was: one game ran code there from
two banks, and data at the same addresses in five more. This records the
bank as well. ZEsarUX's transaction log writes a line for every instruction,
with its address and, among the registers, MMU=, the four 16 KB pages the
CPU sees; the log goes to a named pipe (a FIFO) and a thread here keeps one
token per address that ran: the address in hex below $C000, BANK:ADDR at
$C000 and above (3:C123), the form kit/spectrum/codemap.py reads.

The log is about 2 MB a frame, which is why it goes through a pipe and is
never written to disk. ZEsarUX 13.0 opens the log file for reading before it
writes to it, and on a pipe that open waits for a writer: this opens one for
a moment so that it does not wait forever (measured 17 October 2026). A
named pipe needs Linux or macOS.

As a module, round the part of a session to record:

    from bankmap import Recording
    with Recording(rpc, "work/executed-banked.txt"):
        ...                                   # play: set_input, frames, release_input

The file gains what the session ran; it is never emptied, so every session
adds to one map.

Usage:
  bankmap.py <out file> [--frames N]   record N frames (default 500) of the machine as it runs
                                       now, through the emulator the kit started
                                       (kit/scripts/tools.py --platform spectrum zesarux)
  bankmap.py --count <file>            how many addresses the map holds, per bank
"""
import os, select, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
BANKED = 0xC000


def token(line):
    """The map's token for one line of the transaction log, or None (ROM, or no address)."""
    try:
        a = int(line[:4], 16)
    except ValueError:
        return None
    if a < 0x4000:
        return None
    if a < BANKED:
        return f"{a:04X}"
    i = line.find(b"MMU=")
    if i < 0:
        return None
    bank = int(line[i + 16:i + 20], 16)
    return f"{bank}:{a:04X}" if bank < 8 else None


def load(path):
    return set(open(path).read().split()) if os.path.isfile(path) else set()


def save(path, tokens):
    def key(t):
        b, _, a = t.rpartition(":")
        return (int(a, 16), int(b) if b else -1)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write("\n".join(sorted(tokens, key=key)) + "\n")
    os.replace(tmp, path)


class Recording:
    """Record the banked executed map while the block runs, adding it to `out`."""

    def __init__(self, rpc, out, fifo=None):
        self.rpc, self.out = rpc, out
        self.fifo = fifo or os.path.join(ROOT, "tools", "zesarux-home", "bankmap.fifo")
        self.seen, self.done, self.lines = set(), False, 0

    def _read(self):
        while not self.done:
            fd = os.open(self.fifo, os.O_RDONLY)           # waits for a writer
            rest = b""
            while True:
                r, _, _ = select.select([fd], [], [], 0.2)
                if not r:
                    if self.done:
                        break
                    continue
                chunk = os.read(fd, 1 << 20)
                if not chunk:
                    break                                   # every writer closed it
                lines = (rest + chunk).split(b"\n")
                rest = lines.pop()
                self.lines += len(lines)
                for line in lines:
                    t = token(line)
                    if t:
                        self.seen.add(t)
            os.close(fd)

    def _poke(self, wait=0.3):
        """Open the pipe for writing for a moment: a reader waiting on it is let go."""
        time.sleep(wait)
        fd = os.open(self.fifo, os.O_WRONLY)
        time.sleep(0.1)
        os.close(fd)

    def __enter__(self):
        if not os.path.exists(self.fifo):
            os.makedirs(os.path.dirname(self.fifo), exist_ok=True)
            os.mkfifo(self.fifo)
        self.thread = threading.Thread(target=self._read, daemon=True)
        self.thread.start()
        self.rpc.cmd(f"cpu-transaction-log logfile {self.fifo}")
        # the form token() reads, the address first: the settings outlast the call, and the
        # Z80 and machine checks turn the T-states on, which would put a count before the address
        for k, v in (("tstates", "no"), ("datetime", "no"), ("address", "yes"), ("registers", "yes")):
            self.rpc.cmd(f"cpu-transaction-log {k} {v}")
        poke = threading.Thread(target=self._poke, daemon=True)
        poke.start()
        self.rpc.cmd("cpu-transaction-log enabled yes")
        poke.join()
        return self

    def __exit__(self, *exc):
        self.rpc.cmd("cpu-transaction-log enabled no")
        time.sleep(0.5)
        self.done = True
        self._poke(0)                                      # a reader still waiting to open
        self.thread.join(5)
        tokens = load(self.out) | self.seen
        save(self.out, tokens)
        print(f"{self.out}: {len(self.seen)} addresses this session from {self.lines} instructions, "
              f"{len(tokens)} in the map")
        return False


def count(path):
    per = {}
    for t in load(path):
        b, _, _ = t.rpartition(":")
        per[b or "below $C000"] = per.get(b or "below $C000", 0) + 1
    for k in sorted(per, key=str):
        print(f"  {'bank ' + k if k != 'below $C000' else k}: {per[k]}")


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--count":
        count(argv[1]); return
    frames = int(argv[argv.index("--frames") + 1]) if "--frames" in argv else 500
    from zesarux import connect
    rpc = connect()
    with Recording(rpc, argv[0]):
        rpc.frames(frames)


if __name__ == "__main__":
    main()
