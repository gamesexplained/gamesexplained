# work/

Gitignored. Everything here is either the contributor's own copy of the
game or derived from it: the image, extracted program files, emulator
snapshots, the disassembler's project file, the annotation log. Nothing in
this folder is ever committed or uploaded.

To rebuild it from your own copy of the game, follow `../orientation.md`,
then run `python3 kit/scripts/symbols_import.py <part> <entry snapshot>`
for each of the seven parts to recreate its disassembler project. The
entry snapshots are at `parts/<slug>/work/entry.vsf` relative to the
game folder. The resident uses the Wastelands handover. The snapshot is
in the platform's own format, which its `steps` skill names under
`snapshot`, and `../orientation.md` names the file this game used.

Found this folder already here, left by an earlier session? It is a
cache, not a record. `kit/START.md`, on a game folder that already
exists, says what to keep from it and how to check it.
