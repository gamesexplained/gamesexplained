# work/

Gitignored. Everything here is either the contributor's own copy of the
game or derived from it: the image, extracted program files, emulator
snapshots, the disassembler's project files, the annotation logs. Nothing
in this folder is ever committed or uploaded.

To rebuild it from your own copy of the game, follow `../orientation.md`
to take the snapshot, then start the disassembler on it with
`python3 kit/scripts/tools.py r2000 <your snapshot.vsf>`. That builds
`<snapshot name>.regen2000proj` here from `../symbols.json`, with all the
annotations, and starts on it; `kit/scripts/symbols_import.py` does the
building on its own.
