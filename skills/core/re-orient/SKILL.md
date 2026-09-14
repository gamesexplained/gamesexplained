---
name: re-orient
description: First step for any game. Boot it in the emulator, get past the loader with the least effort that works, reach real gameplay, save the steady-state snapshot, write orientation.md and start the disassembler on the snapshot.
---

# Orient: boot, get past the loader, capture the game

The goal is the game engine: mechanics, graphics, sound, input, level
data. The loader, decompressor, trainer menu or copy-protection in front
of it is an obstacle to get past efficiently, not the subject. Do not
annotate it byte by byte.

## Steps

1. **Attach and autostart** the contributor's image with the emulator.
   Screenshot. If a trainer or cracktro menu appears, note the options,
   choose the plain game (no cheats) unless the contributor says
   otherwise, and record the choice in `orientation.md`.
2. **Reach real gameplay, not the title screen.** A title or attract
   screen may run on default system housekeeping with none of the game's
   own code installed; checking state there is misleading. Press whatever
   starts the game (a function key, fire) and confirm with a screenshot
   that play is happening.
3. **Find the steady-state entry point.** During play, read the interrupt
   vectors (the platform reference says where they live and what the
   system defaults are). A vector pointing into RAM is the game's own
   handler; that handler is the spine of the engine. Verify against a
   second known address before trusting it.
4. **Save a snapshot** of the machine in play. Name it by state
   (`work/play-round1.vsf`, not by timestamp). This snapshot is the image
   everything downstream is read from. Save more at each distinct state
   you can reach: title, first frame of play, each interlude, death, game
   over.
5. **Write the recipe** into `orientation.md`: which file on the disk, the
   exact key presses and waits from power-on to the snapshot, the
   interrupt vectors observed, what the loader appears to do in one
   paragraph. Someone else must be able to rebuild the snapshot from their
   own copy by following it.
6. **Start the disassembler on the snapshot** and confirm it answers. Note
   which processor-port or banking configuration was active when the
   snapshot was taken: what is visible at a given address depends on it.
7. **Understand the loader well enough to describe it in a paragraph**,
   then stop. If the game reloads data per level (overlays), say so in
   `orientation.md`: it means one snapshot per state.

## Snapshot facts that bite

- A snapshot file holds the whole RAM image at a fixed offset (platform
  reference), so it can be read directly for sweeps without the emulator.
- Chip state (video, sound, timers) lives in named modules inside the
  snapshot; the names are readable text, so a string search finds them.
- A loaded snapshot can come back without its timer interrupt running.
  Symptom: the CPU sits in a wait loop and nothing moves. Autostart the
  image again rather than fighting it.
- Autostart may leave the emulator in warp mode; turn it off before
  timing anything.

## Outputs

`orientation.md` filled in; at least one steady-state snapshot in `work/`;
the disassembler running on it; a first `work/annotations.jsonl` (the
client script creates it on the first mutating call).
