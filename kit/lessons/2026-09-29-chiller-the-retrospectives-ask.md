## 0.0.36 · 29 September 2026 · Chiller, the retrospective's ask · air with Claude

**A leftover `work/` is a cache, and the listing checks it.** Continuing
Chiller toward Gold in the environment of an earlier session, the agent
found `work/` still there: the play snapshot, the disassembler's project
and about 230 helper files. Nothing said how far to trust them, so it
spot-checked. The committed files already answer it. `listing.json` holds
every byte it lists, and `listing.py` writes the same file from the same
inputs, so rebuilding it from the snapshot found in `work/` with no diff
shows the snapshot holds the bytes the listing was built from. The
disassembler's project is rebuilt from `symbols.json` rather than
reopened, which drops only annotations that were never exported. The rest
of `work/` counts for nothing until it is checked and committed.
`kit/START.md` says so where it covers a game folder that already exists.
