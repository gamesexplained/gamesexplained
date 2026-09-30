"""Seam-lift equivalence harness.

Runs a given listing.py over every C64 game against a .vsf reconstructed from
the committed listing.json, in both the full-rebuild and --relabel modes, and
writes each result to <outdir>. Two runs must agree byte for byte for the move
to be behaviour-preserving.

  equiv.py <listing.py path> <outdir>

Kept from the ZX Spectrum seam lift (kit/spectrum-listing). See README.md
beside this file for the pre-lift listing.py and the reproduction steps.
"""
import glob, hashlib, json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not (os.path.isdir(os.path.join(ROOT, "kit")) and os.path.isdir(os.path.join(ROOT, "games"))):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        break
    ROOT = parent
MAGIC, OFF = b"VICE Snapshot File", 209


def vsf_from_listing(lp, out):
    L = json.load(open(lp))
    ram = bytearray(0x10000)
    for r in L["records"]:
        for i, b in enumerate(r.get("b", [])):
            if r["a"] + i < 0x10000:
                ram[r["a"] + i] = b
    blob = bytearray(MAGIC + b" C64SC\0") + bytes(OFF - len(MAGIC) - 6)
    open(out, "wb").write(bytes(blob) + bytes(ram))


def one(listing, gdir, mode, out):
    slug = os.path.basename(gdir.rstrip("/"))
    env = dict(os.environ, PYTHONPATH=os.path.join(ROOT, "kit", "scripts"))
    with tempfile.TemporaryDirectory() as t:
        g = os.path.join(t, slug)
        os.makedirs(os.path.join(g, "work"))
        for f in ("game.json", "symbols.json", "listing.json"):
            shutil.copy(os.path.join(gdir, f), os.path.join(g, f))
        if mode == "relabel":
            args = [sys.executable, listing, g, "--relabel"]
        else:
            vsf = os.path.join(g, "work", "play.vsf")
            vsf_from_listing(os.path.join(gdir, "listing.json"), vsf)
            args = [sys.executable, listing, g, vsf]
        r = subprocess.run(args, capture_output=True, text=True, env=env)
        if r.returncode:
            return f"ERROR {slug} {mode}: {r.stderr.strip()[:160]}"
        data = open(os.path.join(g, "listing.json"), "rb").read()
        open(os.path.join(out, f"{slug}.{mode}.json"), "wb").write(data)
        return f"{hashlib.sha256(data).hexdigest()[:16]} {slug} {mode}"


def main():
    listing, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for gdir in sorted(glob.glob(os.path.join(ROOT, "games", "c64", "*"))):
        for mode in ("rebuild", "relabel"):
            print("  " + one(listing, gdir + "/", mode, out))


if __name__ == "__main__":
    main()
