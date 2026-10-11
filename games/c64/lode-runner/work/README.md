# Private working evidence

This directory is gitignored except for this README. Keep supplied G64/CRT
files, extracted programs and sectors, emulator snapshots, ROMs,
disassembler projects, CPU traces, browser screenshots, and detailed audit
reports here. They are never pushed.

The canonical entry is `black-entry.vsf`, captured at PC=$6000 from the
Black Label disk. `play-round1.vsf` is a separate native room-one play
snapshot. See ../orientation.md for the boot procedure and file identity.

Recreate a private disassembler project from the committed symbols:

```
python3 kit/scripts/symbols_import.py games/c64/lode-runner/parts/engine games/c64/lode-runner/parts/engine/work/entry.vsf
```

Run the widget comparisons against the private play snapshot:

```
node games/c64/lode-runner/work/verify-mechanics.cjs games/c64/lode-runner/work/play-round1.vsf
```

All editor-write experiments use `user.d64`, a separate private blank disk.

The local verification helpers are verify-mechanics.cjs, verify-comparison.cjs,
and verify-atlas.cjs. Full comment audits are in comment-audit.md; the
submission-before-cleanup-* files preserve the extended reference/history
records. These private files are available in this workspace and are not
part of a clean checkout or the published site. facts.md retains the public
check and sample summary.

Native room captures and their read/store counts are in multiload-captures/.
Each parts/room-NNN/work/ folder holds that part's real entry.vsf, play.vsf
and recreated private disassembler project. The private capture-multiload.py
and build-multiload-rooms.py helpers record the forced original-loader route.
The independent sample draw and verdict remain private; facts.md keeps the
sample result. No validation/ directory or detailed audit reports are committed.
