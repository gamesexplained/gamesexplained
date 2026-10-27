#!/usr/bin/env python3
"""The kit's MesenCE server keeps to the jsnes server's protocol, and its two halves agree.

Needs neither Mesen nor Node: the server's behaviour on the machine is checked by `tools.py
--platform nes check-emulator --emulator mesen`, which needs Mesen and is run by hand, as CI
does not install it. This checks what can go wrong in the files themselves:

- the server answers the jsnes server's commands, each of them, and no other;
- every request the server sends the bridge (kit/nes/mesen_bridge.lua) is one the bridge has;
- the bridge's instruction lengths are the jsnes server's, opcode by opcode;
- the cartridge's description and the disassembly are the jsnes server's, on the check's own
  test cartridge;
- kit/nes/snapshot.py reads a snapshot in the MesenCE server's form;
- the settings get-mesen writes keep Mesen's script limit below the value that wraps.
"""
import base64, gzip, json, os, re, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))
import mesen_server   # noqa: E402
import snapshot   # noqa: E402
import tools   # noqa: E402
from test_server import server_commands   # noqa: E402

BRIDGE = os.path.join(HERE, "mesen_bridge.lua")
SERVER = os.path.join(HERE, "mesen_server.py")


def bridge_commands():
    lua = open(BRIDGE, encoding="utf-8").read()
    return set(re.findall(r'^H\.([a-z]+) = ', lua, re.M)) | set(re.findall(r'^H\["([a-z-]+)"\] = ', lua, re.M)) | {"run", "step"}


class Protocol(unittest.TestCase):
    def test_same_commands_as_jsnes(self):
        self.assertEqual(set(mesen_server.COMMANDS), set(server_commands()))

    def test_bridge_has_every_request(self):
        src = open(SERVER, encoding="utf-8").read()
        sent = set(re.findall(r'\.call\("([a-z-]+)"', src)) | {c for c in re.findall(r'run_core\("([a-z]+)"', src)}
        sent |= set(re.findall(r'call\("power" if [^)]*else "([a-z]+)"\)', src)) | {"power"}
        missing = sent - bridge_commands()
        self.assertFalse(missing, f"the server sends {sorted(missing)}, which the bridge does not answer")

    def test_instruction_lengths(self):
        lua = open(BRIDGE, encoding="utf-8").read()
        modes = re.search(r'local modes = "(\d+)"', lua).group(1)
        want = "".join(str(mesen_server.MODE_LEN[m]) for _, m in mesen_server.OPCODES)
        self.assertEqual(modes, want)


class Server(unittest.TestCase):
    def test_describe(self):
        import check_emulator
        info = mesen_server.describe(check_emulator.test_cartridge(), "kit test cartridge", None)
        self.assertEqual((info["mapper"], info["prg_kb"], info["chr_kb"], info["mirroring"]), (0, 16, 8, "vertical"))
        self.assertRaises(mesen_server.Refused, mesen_server.describe, b"not a cartridge" + bytes(16), "x", None)

    def test_disassemble(self):
        server = mesen_server.Server()
        mem = {0xC000: [0xAD, 0x16, 0x40], 0xC003: [0xD0, 0xFB, 0x00], 0xC005: [0x91, 0x10, 0x00]}

        class Fake:
            def call(self, cmd, **a):
                return {"data": bytes(mem[a["address"]]).hex()}
        server.bridge = Fake()
        self.assertEqual(server.disassemble(0xC000)["text"], "LDA $4016")
        self.assertEqual(server.disassemble(0xC003)["text"], "BNE $C000")
        self.assertEqual(server.disassemble(0xC005), {"address": 0xC005, "text": "STA ($10),Y", "length": 2})

    def test_writes_stay_inside(self):
        self.assertRaises(mesen_server.Refused, mesen_server.inside_repository, "/tmp/outside.json.gz")


class Snapshot(unittest.TestCase):
    def test_reads_mesen_form(self):
        cpu = bytearray(0x10000)
        cpu[0x0123] = 0x45
        cpu[0xFFFC:0xFFFE] = b"\x00\xC0"
        ppu, oam = bytes(range(256)) * 64, bytes(255 - i for i in range(256))
        snap = {"format": "kit-nes-snapshot", "kit": {"saved_by": "kit/nes/mesen_server.py", "emulator": "MesenCE 2.2.1",
                                                       "frames": 3},
                "machine": {"cpu": base64.b64encode(bytes(cpu)).decode(), "ppu": base64.b64encode(ppu).decode(),
                            "oam": base64.b64encode(oam).decode(),
                            "registers": {"pc": 0xC09C, "a": 1, "x": 2, "y": 3, "s": 0xFD, "p": 0x24, "flags": "nv-bdIzc",
                                          "cycles": 1000},
                            "ppu_registers": {"ctrl": 0x80, "mask": 0x1E, "scrollX": 5, "scrollY": 6}},
                "mesen_state": ""}
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "s.json.gz")
            with open(path, "wb") as f:
                f.write(gzip.compress(json.dumps(snap).encode()))
            img = snapshot.read(path)
            self.assertEqual((len(img), img[0x0123], img[0xFFFC]), (0x10000, 0x45, 0x00))
            self.assertEqual(snapshot.ppu(path), ppu)
            self.assertEqual(snapshot.oam(path), oam)
            self.assertEqual(snapshot.registers(path), {"ctrl": 0x80, "mask": 0x1E, "scrollX": 5, "scrollY": 6})
            h = snapshot.header(path)
            self.assertEqual((h["pc"], h["s"], h["cycles"], h["kit"]["frames"]), (0xC09C, 0xFD, 1000, 3))


class Install(unittest.TestCase):
    def test_settings(self):
        s = tools.MESEN_SETTINGS["Debug"]["ScriptWindow"]
        self.assertTrue(s["AllowIoOsAccess"] and s["AllowNetworkAccess"])
        self.assertLess(s["ScriptTimeout"] * 1000, 2 ** 32, "Mesen multiplies the limit by 1,000 in 32 bits")

    def test_releases(self):
        for key, (name, size, sha) in tools.MESEN_RELEASES.items():
            self.assertIn(tools.MESEN_VERSION, name)
            self.assertRegex(sha, r"^[0-9a-f]{64}$")
            self.assertGreater(size, 1 << 20)


if __name__ == "__main__":
    unittest.main()
