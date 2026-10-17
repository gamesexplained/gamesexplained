#!/usr/bin/env python3
"""The kit's 128K tools on a snapshot made here: banks.py's report and its parts, codemap.py's
banked tokens, trace and image, and bankmap.py's token for a line of ZEsarUX's transaction log.

A 128K .sna with bank b filled with b + 1, bank 3 paged in, and a few instructions placed so the
trace has something to follow: at $8000 a CALL to $C000 and a CALL to $C010; bank 3 holds a RET
at $C000, bank 4 a RET at $C010. Exits 1 on any failure.
python3 kit/spectrum/test_banks.py
"""
import json, os, struct, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import snapshot, codemap, bankmap  # noqa: E402

BANK = 0x4000
fails = 0


def check(ok, what):
    global fails
    print(("ok   " if ok else "FAIL ") + what)
    fails += 0 if ok else 1


def make_sna(path, paged=3):
    bank = {b: bytearray([b + 1]) * BANK for b in range(8)}
    bank[2][0:6] = bytes([0xCD, 0x00, 0xC0, 0xCD, 0x10, 0xC0])     # $8000: CALL $C000, CALL $C010
    bank[2][6] = 0xC9                                                # $8006: RET
    bank[3][0] = 0xC9                                                # bank 3 $C000: RET
    bank[4][0x10] = 0xC9                                             # bank 4 $C010: RET
    header = bytearray(27)
    header[25] = 1                                                   # interrupt mode 1
    struct.pack_into("<H", header, 23, 0xFF00)                       # SP
    body = bytes(header) + bank[5] + bank[2] + bank[paged] + struct.pack("<HBB", 0x8000, 0x10 | paged, 0)
    body += b"".join(bytes(bank[b]) for b in range(8) if b not in (2, 5, paged))
    open(path, "wb").write(body)
    return bank


with tempfile.TemporaryDirectory() as d:
    sna = os.path.join(d, "entry.sna")
    bank = make_sna(sna)
    got = snapshot.banks(sna)
    check(got["paged"] == 3 and got["pc"] == 0x8000, "snapshot.banks: bank 3 paged, the PC after the 48K image")
    check(snapshot.read(sna, bank=4)[0xC000:] == bytes(bank[4]), "snapshot.read with bank=4 puts bank 4 at $C000")

    # banks.py: the report, then a part for each bank the CPU did not see
    out = subprocess.run([sys.executable, os.path.join(HERE, "banks.py"), sna], capture_output=True, text=True)
    check(out.returncode == 0 and "3" in out.stdout, "banks.py reports the paging")
    gdir = os.path.join(d, "game")
    os.makedirs(gdir)
    json.dump({"title": "Test"}, open(os.path.join(gdir, "game.json"), "w"))
    subprocess.run([sys.executable, os.path.join(HERE, "..", "scripts", "parts.py"), "add", gdir, "main"],
                   capture_output=True, check=True)
    out = subprocess.run([sys.executable, os.path.join(HERE, "banks.py"), "parts", gdir, sna, "--over", "main"],
                         capture_output=True, text=True)
    made = sorted(p for p in os.listdir(os.path.join(gdir, "parts")) if p.startswith("bank-"))
    check(out.returncode == 0 and made == ["bank-00", "bank-01", "bank-04", "bank-06", "bank-07"],
          f"banks.py parts: a part for banks 0, 1, 4, 6 and 7, none for 2, 3 and 5 ({made}) {out.stderr.strip()}")
    part = json.load(open(os.path.join(gdir, "parts", "bank-04", "part.json"))) if "bank-04" in made else {}
    check(part.get("bank") == 4, "a bank's part.json names its bank")
    blank0 = json.load(open(os.path.join(gdir, "parts", "bank-00", "part.json"))) if "bank-00" in made else {}
    check(["$C000", "$FFFF", "blank: every byte is $01"] in blank0.get("coverage", {}).get("exclude", [])
          and not any("blank" in e[2] for e in part.get("coverage", {}).get("exclude", [])),
          "a bank of one value throughout is excluded as blank, a bank with code is not")
    check(all(os.path.isfile(os.path.join(gdir, "parts", p, "work", "entry.sna")) for p in made),
          "each bank's part has the snapshot in its work/")

    # codemap: tokens, the image of a bank's part, and the trace across $C000
    mp = os.path.join(d, "map.txt")
    open(mp, "w").write("8000 $8003 3:C000 4:C010\n")
    check(codemap.read_map(mp) == {(None, 0x8000), (None, 0x8003), (3, 0xC000), (4, 0xC010)},
          "codemap.read_map: BANK:ADDR keeps the bank, a bare address has none")
    mem4, b4 = codemap.image(os.path.join(gdir, "parts", "bank-04"), sna) if "bank-04" in made else (None, None)
    check(b4 == 4 and mem4 is not None and mem4[0xC010] == 0xC9, "codemap.image: a bank's part sees its own bank at $C000")
    mem, b = codemap.image(os.path.join(gdir, "parts", "main"), sna)
    check(b == 3, "codemap.image: the RAM part sees the paged bank")
    unfollowed = set()
    starts, code = codemap.trace(mem, [0x8000], high={0xC000}, unfollowed=unfollowed)
    check(0xC000 in starts and 0xC010 not in code and unfollowed == {0xC010},
          "codemap.trace follows a call into $C000 only where the map says this bank ran")
    check(codemap.owns(os.path.join(gdir, "parts", "bank-04"), 0xC010) and not codemap.owns(os.path.join(gdir, "parts", "bank-04"), 0x8000),
          "codemap.owns: a bank's part owns $C000-$FFFF only")

# bankmap: a transaction log line gives its address, with the bank at $C000 and above
line = b"C123 PC=C123 SP=BFF0 AF=0000 BC=0000 HL=0000 DE=0000 MMU=0000000500020004"
check(bankmap.token(line) == "4:C123", f"bankmap.token: an address at $C000 takes the fourth page's bank ({bankmap.token(line)})")
check(bankmap.token(b"8123 PC=8123 MMU=0000000500020004") == "8123", "bankmap.token: below $C000, the address alone")
check(bankmap.token(b"0123 PC=0123 MMU=0000000500020004") is None, "bankmap.token: the ROM is left out")

print(f"{fails} failed" if fails else "all passed")
sys.exit(1 if fails else 0)
