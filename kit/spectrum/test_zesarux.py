#!/usr/bin/env python3
"""Pin the ZRCP framing and the reply parsers, with a fake ZEsarUX on a socket.

No test framework, no emulator: a thread accepts a connection and writes
canned replies in ZEsarUX's own shapes (copied from a live 13.0 session:
the banner, `command> `, `command@cpu-step> `, the one-line hex dump of
`read-memory`, the register line with its `VPS: 0` token, and the
`N: matches limit` lines of `get-breakpointspasscount`).

    python3 kit/spectrum/test_zesarux.py

Every check below is a plain assert; the script exits non-zero on the first
one that fails.
"""
import os
import socket
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zesarux import Rpc, ZesaruxError, connect, _read_reply, _num   # noqa: E402

BANNER = ("Welcome to ZEsarUX remote command protocol (ZRCP)\n"
          "Write help for available commands\n\ncommand> ")

REGISTERS = ("PC=0038 SP=ff48 AF=005c BC=ffff HL=5cb8 DE=5cb9 IX=ffff IY=5c3a AF'=0044 BC'=174b "
             "HL'=107f DE'=0006 I=3f R=11  F=-Z-H3P-- F'=-Z---P-- MEMPTR=15f7 IM1 IFF-- VPS: 0 "
             "MMU=00000000000000000000000000000000")
STEP = REGISTERS.replace("PC=0038", "PC=0039") + " TSTATES: 35\n  0039 PUSH HL"


class Fake:
    """A one-connection ZRCP server replying from `answers`.

    `answers` maps the first word of a command to the reply text; each entry
    is either a string or a callable taking the whole command line. A reply
    is sent with the prompt line, exactly as ZEsarUX does.
    """

    def __init__(self, answers, prompt="command> ", on_run=None):
        self.answers, self.prompt, self.on_run = answers, prompt, on_run
        self.sock = socket.socket()
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(1)
        self.port = self.sock.getsockname()[1]
        self.seen = []
        self.thread = threading.Thread(target=self._serve, daemon=True)
        self.thread.start()

    def _serve(self):
        conn, _ = self.sock.accept()
        with conn:
            conn.sendall(BANNER.encode())
            buf = b""
            while True:
                while b"\n" not in buf:
                    chunk = conn.recv(4096)
                    if not chunk:
                        return
                    buf += chunk
                line, _, buf = buf.partition(b"\n")
                cmd = line.decode()
                self.seen.append(cmd)
                if cmd.split()[0] == "quit":
                    return
                if self.on_run and cmd.split()[0] == "run":
                    self.on_run(conn, cmd)
                    continue
                reply = self.answers.get(cmd.split()[0], "")
                reply = reply(cmd) if callable(reply) else reply
                if reply is None:          # the emulator dying mid-session
                    return
                conn.sendall((reply + "\n" + self.prompt).encode())

    def close(self):
        self.sock.close()


def _connect(port):
    s = socket.create_connection(("127.0.0.1", port), timeout=5)
    s.settimeout(5)
    return s


def check_read_reply_banner():
    f = Fake({})
    got, rest, prompt = _read_reply(_connect(f.port), b"", "banner")
    assert got == ("Welcome to ZEsarUX remote command protocol (ZRCP)\n"
                   "Write help for available commands\n"), repr(got)
    assert rest == b"" and prompt == "command> ", (rest, prompt)
    f.close()


def check_cmd_strips_prompt_and_parses():
    f = Fake({"read-memory": "F3AF11FF", "get-registers": REGISTERS})
    rpc = connect(port=f.port)
    assert rpc.cmd("read-memory", "8000H", 4) == "F3AF11FF"
    assert rpc.read_memory(0x8000, 4) == b"\xf3\xaf\x11\xff"
    regs = rpc.registers()
    assert regs["PC"] == 0x0038 and regs["AF'"] == 0x0044 and regs["R"] == 0x11, regs
    assert "VPS" not in regs and "IM1" not in regs, regs      # no '=', not registers
    assert f.seen == ["read-memory 8000H 4", "read-memory 8000H 4", "get-registers"], f.seen
    rpc.close(); f.close()


def check_cpu_step_prompt():
    f = Fake({"cpu-step": STEP}, prompt="command@cpu-step> ")
    rpc = connect(port=f.port)
    rpc.enter_step()
    out = rpc.step()
    assert out["PC"] == 0x0039 and out["disasm"] == "0039 PUSH HL", out
    rpc.close(); f.close()


BUSY = "Error. Can not enter cpu step mode. You can try closing the menu"


def check_enter_step_asks_again_then_knows_it_stopped():
    """ZEsarUX refuses cpu-step for a moment after leaving it; the refusal is text, not an error."""
    state = {"asked": 0}

    def enter(cmd):
        state["asked"] += 1
        if state["asked"] < 3:
            return BUSY
        f.prompt = "command@cpu-step> "
        return ""
    f = Fake({"enter-cpu-step": enter})
    rpc = connect(port=f.port)
    assert not rpc.stepping
    rpc.enter_step()
    assert rpc.stepping and state["asked"] == 3, (rpc.prompt, state)
    rpc.close(); f.close()


def check_enter_step_raises_when_the_machine_runs_on():
    """An accepted enter-cpu-step whose prompt is still `command> ` is a machine that never stopped."""
    for answers in ({"enter-cpu-step": ""}, {"enter-cpu-step": BUSY}):
        f = Fake(answers)
        rpc = connect(port=f.port)
        try:
            rpc.entering("enter-cpu-step", tries=3, wait=0.01) if answers["enter-cpu-step"] else rpc.enter_step()
        except ZesaruxError as e:
            assert "still running" in str(e) or "Can not enter" in str(e), e
        else:
            raise AssertionError("a machine that did not stop must raise")
        rpc.close(); f.close()


def check_loads_refuse_a_missing_file():
    """ZEsarUX answers a missing file with nothing and loads nothing: the client says so first."""
    f = Fake({"snapshot-load": "", "smartload": "", "enable-breakpoints": ""})
    rpc = connect(port=f.port)
    for call in (rpc.snapshot_load, rpc.smartload):
        try:
            call(os.path.join(os.path.dirname(__file__), "no-such-file.sna"))
        except ZesaruxError as e:
            assert "no such file" in str(e), e
        else:
            raise AssertionError("a missing file must raise")
    assert f.seen == [], f.seen                       # nothing was sent
    rpc.snapshot_load(__file__)                       # an existing path goes through
    assert f.seen[0].startswith("snapshot-load "), f.seen
    rpc.close(); f.close()


def check_load_asks_again_while_busy():
    state = {"asked": 0}

    def load(cmd):
        state["asked"] += 1
        return BUSY if state["asked"] == 1 else ""
    f = Fake({"smartload": load})
    rpc = connect(port=f.port)
    rpc.smartload(__file__)
    assert state["asked"] == 2, state
    rpc.close(); f.close()


def check_unknown_command_raises():
    f = Fake({"nonsense": "Unknown command. Type help for available commands"})
    rpc = connect(port=f.port)
    try:
        rpc.cmd("nonsense")
    except ZesaruxError as e:
        assert "Unknown command" in str(e)
    else:
        raise AssertionError("an unknown command must raise")
    rpc.close(); f.close()


def check_counts_and_conditions():
    counts = "\n".join(f"{i}: {i * 3} {0 if i != 2 else 1000000}" for i in range(1, 101))
    bps = ("Breakpoints: On\nEnabled 1: PC=8004H\nEnabled 2: TSTATESP>69888\n"
           + "\n".join(f"Disabled {i}: None" for i in range(3, 101)))
    f = Fake({"get-breakpointspasscount": counts, "get-breakpoints": bps})
    rpc = connect(port=f.port)
    assert rpc.bp_counts()[0] == (3, 0) and rpc.bp_counts()[1] == (6, 1000000), rpc.bp_counts()[:2]
    assert len(rpc.bp_counts()) == 100
    assert rpc.bp_count(2) == (6, 1000000)
    assert rpc.bp_conditions() == {1: "PC=8004H", 2: "TSTATESP>69888"}, rpc.bp_conditions()
    rpc.close(); f.close()


def check_reply_split_across_reads():
    """A reply arriving in pieces must still be framed by its prompt."""
    def slow(conn, cmd):
        for part in ("Running until a breakpoint, key press or data sent, menu opening, "
                     "1000 opcodes run, or other event\n", "Returning after 1000 opcodes\n", "PC=8000\n"):
            conn.sendall(part.encode())
            time.sleep(0.05)
        conn.sendall(b"\ncommand@cpu-step> ")
    srv = Fake({}, prompt="command@cpu-step> ", on_run=slow)
    rpc = connect(port=srv.port)
    out = rpc.run(limit=1000, timeout=5)
    assert "Returning after 1000 opcodes" in out and "PC=8000" in out, out
    assert not out.endswith("> "), out
    rpc.close(); srv.close()


def check_run_times_out_instead_of_hanging():
    """An unanswered `run` is a timeout, never a half-read reply (`kit/EMULATOR.md`)."""
    def mute(conn, cmd):
        pass
    srv = Fake({}, on_run=mute)
    rpc = connect(port=srv.port, timeout=0.3)
    t0 = time.time()
    try:
        rpc.run(timeout=0.3)
    except ZesaruxError as e:
        assert time.time() - t0 < 5, "the timeout was not honoured"
        assert "no reply" in str(e), e
    else:
        raise AssertionError("an unanswered run must raise")
    rpc.close(); srv.close()


def check_frames_is_bounded():
    """`frames` retries, then raises: it never spins (`kit/EMULATOR.md` phase 4)."""
    f = Fake({"get-tstates-partial": "0", "run": "Running until a breakpoint, key press or data sent, menu opening or other event",
              "reset-tstates-partial": "", "set-breakpoint": "", "set-breakpointpasscount": "",
              "enable-breakpoints": "", "disable-breakpoint": ""})
    rpc = connect(port=f.port)
    t0 = time.time()
    try:
        rpc.frames(1, timeout=1, tries=5)
    except ZesaruxError as e:
        assert "did not reach 69888" in str(e), e
    else:
        raise AssertionError("frames must raise when the boundary is never reached")
    assert time.time() - t0 < 10
    assert sum(1 for c in f.seen if c.startswith("run")) == 5, f.seen
    rpc.close(); f.close()


def check_address_forms():
    """The CLI takes the assembler forms ZEsarUX's own help uses, as well as JSON's."""
    assert _num("4000H") == 0x4000 and _num("$8000") == 0x8000
    assert _num("32768") == 32768 and _num("0x8000") == 0x8000 and _num(32768) == 32768


def check_set_input_validates():
    f = Fake({"set-ui-io-ports": "", "get-ui-io-ports": "EFFFFFFFFFFFFFFF00"})
    rpc = connect(port=f.port)
    rpc.set_input("efffffffffffffff00")
    assert f.seen[-1] == "set-ui-io-ports efffffffffffffff00", f.seen[-1]
    try:
        rpc.set_input("EF")
    except ValueError:
        pass
    else:
        raise AssertionError("a short matrix must be refused")
    rpc.close(); f.close()


def check_connection_closed():
    """ZEsarUX dying mid-session raises, naming the command (Review Focus 2)."""
    f = Fake({"get-registers": None})
    rpc = connect(port=f.port)
    try:
        rpc.cmd("get-registers")
    except ZesaruxError as e:
        assert "closed" in str(e) or "lost" in str(e), e
    else:
        raise AssertionError("a closed socket must raise")
    rpc.close(); f.close()


def main():
    checks = [v for k, v in sorted(globals().items()) if k.startswith("check_")]
    for c in checks:
        c()
        print(f"ok    {c.__name__}")
    print(f"{len(checks)} checks passed")


if __name__ == "__main__":
    main()
