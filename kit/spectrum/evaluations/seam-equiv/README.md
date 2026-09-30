# Seam-lift equivalence proof

`kit/scripts/listing.py`, `symbols_export.py` and `symbols_import.py` were
lifted off the C64 in the ZX Spectrum platform work. The move had to leave
every C64 listing byte-identical, and no `.vsf` is committed, so this harness
reconstructs one from each game's committed `listing.json` (every tracked byte
is in it) and runs `listing.py` over it, in the full-rebuild and `--relabel`
modes. Two `listing.py` implementations must agree byte for byte.

Reproduce from the repository root. `listing.before.py` is the pre-lift
`kit/scripts/listing.py`; it must sit in `kit/scripts/` for its own path
constant to resolve:

```
cp kit/spectrum/evaluations/seam-equiv/listing.before.py kit/scripts/
python3 kit/spectrum/evaluations/seam-equiv/equiv.py kit/scripts/listing.before.py /tmp/before
python3 kit/spectrum/evaluations/seam-equiv/equiv.py kit/scripts/listing.py /tmp/after
for f in /tmp/before/*.json; do
  cmp -s "$f" "/tmp/after/$(basename "$f")" || echo "DIFF $f"
done
rm kit/scripts/listing.before.py
```

Result on 29 September 2026: 11 games x full rebuild and `--relabel`,
**22 of 22 byte-identical**.
