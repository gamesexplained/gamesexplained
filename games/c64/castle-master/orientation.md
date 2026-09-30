# Castle Master — orientation

## Build and scope

Dualis disk release; physical RAM at the language menu, PC $9B1F. The complete physical RAM capture at the language menu. The game reuses menu storage during play; the listing records the menu occupant.

## Route and capture

The matching VICE snapshot and Dualis disk were recovered from the contributor repository history. Snapshot RAM agrees with all 65,536 bytes of the supplied dump. Restoring the snapshot, attaching the disk to drive 8, and selecting language 1 and character 1 with Return reaches the exterior castle view. The reference images record the restored menu and settled gameplay. A raw RAM dump alone does not preserve video, interrupt, drive, or CPU state. The snapshot RAM begins at file offset 209 in this particular file; do not apply that offset to other snapshot formats.

## Machine state

PC $9B1F; A $00, X $48, Y $01, SP $FD, P $22; CPU port $35, direction $2F. VIC bank $C000, screen $C400, bitmap $E000; $D011=$3B, $D016=$D8, $D018=$1D.

## Reproduction

Keep the supplied image and any recovered snapshots under `work/`. Import `castle_master_full_listing.txt` with `kit/c64/import_ghidra.py` (introduced by the Castle Master contribution) to seed `symbols.json`. Use `--verify-ram` with the supplied 65,536-byte dump when one exists. Build the Source tab with `python3 kit/scripts/listing.py games/c64/castle-master games/c64/castle-master/work/original-menu.vsf`. Its bytes come from the matching snapshot, not the text export. All 65,536 imported bytes matched that snapshot; the coverage ledger decides which bytes appear as Source records.

Original listing SHA-256: `79505396ccd9542c55e67fb381b42210284ceba0dc51aa3d7dd1d39df277753d`. Binary media and emulator state are not published.
