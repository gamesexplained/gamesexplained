---
name: 10-orient
description: First step for any game. Boot it in the emulator, get past the loader with the least effort that works, reach real gameplay, save the steady-state snapshot, write orientation.md and start the disassembler on the snapshot.
---

# Orient: boot, get past the loader, capture the game

Start the clock: `python3 kit/scripts/clock.py start 10-orient --model <your model id> games/<platform>/<slug>`, the model id as your system prompt names it, and again at every step, because a run may change model. Runs to 19 September 2026: twenty minutes to an hour, nearly all of it reaching play. Past an hour, the retro wants to know what ate it.

The goal is the game engine: mechanics, graphics, sound, input, level
data. The loader, decompressor, trainer menu or copy-protection in front
of it is an obstacle to get past efficiently, not the subject. Do not
annotate it byte by byte.

## Steps

0. **Check the emulator** before the game goes in:
   `python3 kit/scripts/tools.py status`, then
   `python3 kit/scripts/tools.py check-emulator`. It resets the machine and
   takes about a minute. Copy the build line from `status` into
   `game.json` under `tools.emulator`, and the list of failed checks into
   `orientation.md`. Then read the emulator's tool skill, and of its
   `workarounds.md` only the sections for the checks that failed. A
   workaround you did not need is slower than the tool it replaces.
1. **Attach and autostart** the contributor's image with the emulator.
   Screenshot. If a trainer or cracktro menu appears, note the options,
   choose the plain game (no cheats) unless the contributor says
   otherwise, and record the choice in `orientation.md`.

   **Ask what the image is before trusting it.** A backup of a running
   game (a snapshot saved by a freezer cartridge, a packed memory dump)
   is the game as it stood when it was saved, not as its loader left it,
   and a part of memory it did not save comes back as the emulator's
   fill. The platform reference says how to recognise one. If it is one,
   restart it at the game's own entry, and before the analysis rests on
   it, check every range that looks like fill with a store and an execute
   checkpoint while you play: a range the game calls is missing code, and
   the contributor needs to know before the run goes further.
2. **Reach real gameplay, not the title screen.** If a key press seems not
   to register, hold it far longer than feels sensible before concluding
   anything: a game that only samples input from a timer interrupt, or only
   between long waits, drops short taps. Where the key matrix fails
   entirely, the system's own keyboard buffer may work. A title or attract
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
   everything downstream is read from, unless the hand-over (next) holds
   more of the program. Save more at each distinct state you can reach:
   title, first frame of play, each interlude, death, game over.

   **Save the hand-over too**: a stopping checkpoint on the game's first
   instruction (the loader's jump into it), then `work/entry.vsf`. Compare
   it with the play snapshot byte for byte. Code that exists only at the
   hand-over (an initialisation that runs from what becomes screen
   memory), or authored data the game overwrites once it runs (a title
   character set replaced by a level's), makes the hand-over image the one
   to disassemble and to build the listing from; where the two agree
   except in variables, either will do.

   Two traps on the way to it. A checkpoint on an address that a ROM
   covers at that moment fires while the ROM runs there: read `$01` (on
   the C64) at the stop, or stop first on an address only RAM holds (the
   loader's `SYS` target) and step on from it. And an autostart resets
   the CPU but keeps RAM, so on a second boot every byte the loader does
   not write still holds the first boot's: power-cycle (a hard reset)
   before any boot whose memory you will read. A packed program may pass
   through several hand-overs (depacker, copier, start-up): the one to
   keep is the last, where the game's own code first runs.
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

## Several versions on one disk

When the image carries more than one crack or release of the game, take
each to the same screen and compare their memory. A byte that differs and
that the game itself changes between two of its own states (title and
play) is working state; what is left is each version's own. Two versions
that agree everywhere else are the best evidence you will get that the
code is the original. One that differs across the program is a different
build (a tape version, or bug fixes its crackers announce): not the image
to analyse, but read its intro and notes, which may list claims about the
original worth checking.

## Snapshot facts that bite

- A snapshot file holds the whole RAM image at a fixed offset (platform
  reference), so it can be read directly for sweeps without the emulator.
- Chip state (video, sound, timers) lives in named modules inside the
  snapshot; the names are readable text, so a string search finds them.
- On an emulator that fails its check that checkpoints survive a load,
  a loaded snapshot looks exactly like one that came back without its
  timer interrupt running; read that workaround first.
- A loaded snapshot can come back without its timer interrupt running.
  Symptom: the CPU sits in a wait loop and nothing moves. It can also
  come back with the processor port `$01` at a different value and the
  CPU somewhere in the KERNAL with a garbage screen; the file is still
  good for the disassembler. Autostart the
  image again rather than fighting it. **Before believing that, sample the
  program counter several times.** A live machine returns a scatter of
  addresses; one that returns the same address every time is parked in a
  sync loop or is not executing at all, and the second of those is usually
  your test rig rather than the game. A running interrupt does not prove
  the game is running: the interrupt can fire, the screen can be drawn and
  every read can look sensible while the main loop has not advanced once.
- A loaded snapshot **starts running immediately**. If you want the state
  you saved, stop the machine in the same breath as the load; otherwise the
  screen you compare against has already moved on and every check fails for
  the wrong reason.
- Save snapshots **without** ROMs. The offsets in the platform reference
  assume it, the file is smaller, and a game that banks the ROMs out does
  not need them.
- Take the snapshot at a moment you have *looked at*. A frame captured
  during an explosion or a transition looks like steady-state play in the
  variables and will have you describing the wrong thing for an hour.
- Autostart may leave the emulator in warp mode; turn it off before
  timing anything.

## Outputs

`orientation.md` filled in; at least one steady-state snapshot in `work/`;
the disassembler running on it; a first `work/annotations.jsonl` (the
client script creates it on the first mutating call).
