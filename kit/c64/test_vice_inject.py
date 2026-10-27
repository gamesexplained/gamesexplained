#!/usr/bin/env python3
"""inject() in kit/c64/vice.py, on a stand-in for the emulator: a program file put straight into
RAM with $01 at $34 and set back after, read back from the RAM bank, the machine stopped for it
and run after, from the file's start when one is given; a file that would reach past $FFFF or
over the processor port refused (#581). No emulator: inject() itself was run in VICE 3.13.2 on a
file that loads at $0314, hooks the IRQ vector and reaches $D00F."""
import os, sys, tempfile, unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vice


class Fake:
    """The machine as inject() sees it: 64 KB of RAM, the port, and what was done, in order."""
    def __init__(self, running=True, corrupt=None):
        self.ram, self.port, self.running, self.done, self.corrupt = bytearray(0x10000), 0x37, running, [], corrupt

    def paused(self, rpc):
        return not self.running

    def pause(self, rpc):
        self.running = False; self.done.append("pause"); return True

    def read_mem(self, rpc, a, n, bank=None):
        if a == 1 and bank == "cpu":
            return bytes((self.port,))
        assert bank == "ram", bank
        out = bytearray(self.ram[a:a + n])
        if self.corrupt is not None:
            out[self.corrupt - a] ^= 0xFF
        return bytes(out)

    def poke(self, rpc, a, data):
        assert not self.running, "written to a running machine"
        if a == 1:
            self.port = data[0]; self.done.append(f"port ${data[0]:02X}"); return
        assert self.port == 0x34 or a + len(data) <= 0xD000, f"${a:04X} written with the I/O in view"
        self.ram[a:a + len(data)] = bytes(data); self.done.append(f"write ${a:04X}")

    def ask(self, rpc, tool, args):
        self.done.append(f"{tool} {args['register']} ${args['value']:04X}")

    def call(self, rpc, tool, args=None):
        assert tool == "vice_execution_run", tool
        self.running = True; self.done.append("run")


def run(data, **kw):
    fake = Fake(**{k: kw.pop(k) for k in ("running", "corrupt") if k in kw})
    with tempfile.NamedTemporaryFile(suffix=".prg", delete=False) as f:
        f.write(data)
    try:
        with mock.patch.multiple(vice, paused=fake.paused, pause=fake.pause, read_mem=fake.read_mem,
                                 poke=fake.poke, ask=fake.ask, call=fake.call):
            return fake, vice.inject(None, f.name, **kw)
    finally:
        os.unlink(f.name)


FILE = bytes((0x14, 0x03)) + bytes((0x3C, 0x03)) + bytes(0xD010 - 0x0316)   # $0314-$D00F


class InjectTests(unittest.TestCase):
    def test_into_ram_with_the_port_set_and_back(self):
        fake, span = run(FILE)
        self.assertEqual(span, (0x0314, 0xD00F))
        self.assertEqual(fake.done[:2], ["pause", "port $34"])
        self.assertEqual(fake.done[-2:], ["port $37", "run"])
        self.assertEqual(fake.ram[0x0314:0x0316], bytes((0x3C, 0x03)))
        self.assertEqual(fake.port, 0x37)

    def test_a_start_runs_from_it(self):
        fake, _ = run(FILE, running=False, start=0x6D1D)
        self.assertEqual(fake.done[-2:], ["vice_registers_set PC $6D1D", "run"])
        self.assertNotIn("pause", fake.done)

    def test_a_stopped_machine_stays_stopped_without_a_start(self):
        fake, _ = run(FILE, running=False)
        self.assertNotIn("run", fake.done)

    def test_a_byte_that_did_not_go_in_is_an_error(self):
        with self.assertRaisesRegex(vice.ViceError, r"RAM at \$D001"):
            run(FILE, corrupt=0xD001)

    def test_files_it_cannot_place(self):
        with self.assertRaisesRegex(vice.ViceError, "past \\$FFFF"):
            run(bytes((0x00, 0xFF)) + bytes(0x101))
        with self.assertRaisesRegex(vice.ViceError, "processor port"):
            run(bytes((0x00, 0x00)) + bytes(4))
        with self.assertRaisesRegex(vice.ViceError, "not a program file"):
            run(bytes((0x00, 0x10)))


if __name__ == "__main__":
    unittest.main()
