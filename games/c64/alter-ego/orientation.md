# Alter Ego — orientation

## Build and route

Male edition disk 01a, first directory entry. Hard reset, autostart, run until the FNC introduction appears. Hold Space in the keyboard matrix for 60 frames, release, and allow loading to finish. Select Begin a new game with Return held for 60 frames, release, then wait for the name prompt. Use direct matrix keys; an ordinary timed Space event did not leave the intro in this run. An early Space during autostart cancelled its queued RUN once; entering RUN then reached the intro.

## Captures and comparison

`work/name-prompt.vsf` is the canonical Source snapshot. A second cold boot stopped on execution at $4000 before startup and saved `work/entry.vsf`. Both snapshots retain all 9,794 imported code bytes unchanged. At the prompt, all 2,718 imported word bytes match the contributor capture and 30 byte-data bytes differ as state. Between hand-over and prompt, 338 word bytes and 14,598 byte-data bytes change; 7,593 bitmap bytes differ. No imported code is lost at the hand-over.

The Source listing uses the fresh prompt and `--entry work/entry.vsf` for the untracked-data audit. Its physical RAM begins at offset 209. Snapshots, original exports and replacement-phase leads are private under `work/`.

## Machine state

Visible processor registers $00=$2F, $01=$36; their shadow RAM bytes do not describe banking. IRQ vector $0314 points to $4229; the NMI vector $0318 points to KERNAL $FE47. $DD00=$C7 selects VIC bank zero; $D018=$19 selects screen $0400 and hires bitmap $2000. VICE uses dummy audio on a virtual display. Emulator health workarounds apply for instruction pause and unpaced transport calls.

## Scope and reconstruction

Male first name prompt only. Later male/female gameplay loads remain separate states under RFC #124. Rebuild the private regenerator project with `symbols_import.py` on `symbols.json` and `work/name-prompt.vsf`; export with `symbols_export.py`, then generate Source with `listing.py` on that same snapshot. The original Ghidra text seeds annotations and is not published as a parallel listing.
