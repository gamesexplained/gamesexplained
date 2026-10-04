#!/usr/bin/env python3
"""Round-trip a Spectrum control file through symbols.json's vocabulary.

Builds a synthetic 48K .sna, writes the control file from a symbols.json,
adds a label and a comment by hand the way an annotator would, reads it
back and checks the blocks, the added label and the comment survive. A
label on a ROM address must not come back: the control file may name
anything, but only the 48K RAM image is the game.

Usage: test_skoolkit.py
"""
import json, os, struct, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import skoolkit
from snapshot import SNA_HEADER
RAM_LO = skoolkit.RAM_LO


def make(d):
    body = bytearray(0x10000 - RAM_LO)
    body[0x8000 - RAM_LO:0x8000 - RAM_LO + 6] = bytes([0x21, 0x34, 0x12, 0x06, 0x05, 0x76])
    open(os.path.join(d, "x.sna"), "wb").write(bytes(bytearray(SNA_HEADER)) + bytes(body))
    json.dump({"slug": "x", "title": "X", "platform": "spectrum"},
              open(os.path.join(d, "game.json"), "w"))
    json.dump({"blocks": [{"start": 0x8000, "end": 0x8005, "type": "Code"},
                          {"start": 0x8006, "end": 0x8009, "type": "ZX"}],
               "symbols": [{"address": 0x8000, "name": "start", "type": "UserDefined", "kind": "user"},
                           {"address": 0x0000, "name": "rom_entry", "type": "UserDefined", "kind": "user"}],
               "comments": [{"address": 0x8003, "type": "line", "text": "count five"}]},
              open(os.path.join(d, "symbols.json"), "w"))
    return os.path.join(d, "x.sna")


def main():
    with tempfile.TemporaryDirectory() as d:
        sna = make(d)
        ctl = skoolkit.write(d, sna)
        assert os.path.exists(ctl)
        # an annotator adds a label and a comment by hand
        with open(ctl, "a") as f:
            f.write("@ $8005 label=finished\n")
            f.write("@ $0000 label=rom_entry\n")
            f.write("N $8001 set hl\n")
        blocks, symbols, comments = skoolkit.read_file(ctl)
        assert [b["type"] for b in blocks] == ["Code", "ZX"], blocks
        assert blocks[0] == {"start": 0x8000, "end": 0x8005, "type": "Code"}, blocks[0]
        assert blocks[1] == {"start": 0x8006, "end": 0x8009, "type": "ZX"}, blocks[1]
        names = {s["address"]: s["name"] for s in symbols}
        assert names == {0x8000: "start", 0x8005: "finished"}, names
        assert 0x0000 not in names, "a ROM label must not become a symbol"
        texts = {c["address"]: c["text"] for c in comments}
        assert texts == {0x8003: "count five", 0x8001: "set hl"}, texts
        print("ok - test_skoolkit.py: blocks, added label and comments round trip; ROM label refused")
        if skoolkit.skoolkit_bin("sna2skool.py"):
            text = open(skoolkit.disassemble(sna, ctl)).read()
            assert "finished" in text and "count five" in text, text[:300]
            print("ok - test_skoolkit.py: SkoolKit renders the control file with its labels and comments")


if __name__ == "__main__":
    main()
