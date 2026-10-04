---
name: 10-orient
description: First step for any game. Boot it in the emulator, get past the loader with the least effort that works, reach real gameplay, save the steady-state snapshot, write orientation.md and start the disassembler on the snapshot.
---

# Orient: boot, get past the loader, capture the game

Check your model first: `python3 kit/scripts/models.py is-proven <your model id>`, the model id as your system prompt names it. If nothing in the session names the model, ask the contributor; never infer it (`AGENTS.md`, "Know your model; never infer it"). If it is not proven, tell the contributor before going further, as the script says (`AGENTS.md`, "Model").

The goal is the game engine: mechanics, graphics, sound, input, level
data. The loader, decompressor, trainer menu or copy-protection in front
of it is an obstacle to get past efficiently, not the subject. Do not
annotate it byte by byte.

## Steps

0. **Check the emulator** before the game goes in:
   `python3 kit/scripts/tools.py status`, then
   `python3 kit/scripts/tools.py --platform <platform> check-emulator`. It resets the machine and
   takes about a minute. Copy the build line from `status` into
   `game.json` under `tools.emulator`, and the list of failed checks into
   `orientation.md`. Then read the emulator's tool skill, and of its
   `workarounds.md` only the sections for the checks that failed. A
   workaround you did not need is slower than the tool it replaces.
1. **Attach and autostart** the contributor's image with the emulator.
   Screenshot. If a trainer or cracktro menu appears, note the options,
   choose the plain game (no cheats) unless the contributor says
   otherwise, and record the choice in `orientation.md`.

   **Read the file's header before trusting its name.** An extension
   says what the file was called, not what it is: a file named as a
   plain sector image can be a GCR image of a protected original, which
   needs the drive emulation the platform's tool notes describe. Record
   what the header says in `orientation.md`.

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
   second known address before trusting it. A game whose interrupt
   handlers chain, each writing the next one's address into the vector,
   shows only one of them in a vector read. Record a frame
   (`kit/c64/frame.py capture` on the C64): its writes to the vector name
   every handler in the chain, and tracing from all of them can reach code
   that nothing else calls, such as the music driver. The line beside each
   write is where the handler before it wrote the vector, usually a line
   or a handler earlier than the one the named handler runs on; read the
   handler's own write to the raster register for that.
4. **Save a snapshot** of the machine in play. Name it by state
   (`work/play-round1.vsf`, not by timestamp) with the platform's own
   snapshot extension (`kit/<platform>/INSTALL.md` and
   `kit/skills/<platform>/` name it: a `.vsf` on the C64, a `.sna` on the
   ZX Spectrum). This snapshot is the image
   everything downstream is read from, unless the hand-over (next) holds
   more of the program. Save more at each distinct state you can reach:
   title, first frame of play, each interlude, death, game over.

   **Save the hand-over too**: a stopping checkpoint on the game's first
   instruction (the loader's jump into it), then `work/entry.<ext>` with
   the same extension. Compare
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
7. **Map the disk's files onto memory.** Extract every file (on the C64,
   `c1541` from the emulator's build reads a G64 or D64), then search the
   hand-over and play snapshots for each file's bytes in 16-byte pieces,
   take the offset most pieces agree on, and count the bytes equal there.
   A file that lands whole says what a region is before any code is read
   (one run found its speech samples and its speech timing table this way,
   and caught a table it had credited to the wrong file); a file that is
   found nowhere is the loader's, or is built from. Put the table in
   `orientation.md`.
8. **Understand the loader well enough to describe it in a paragraph**,
   then stop. If the game reloads data per level (overlays), say so in
   `orientation.md`: it means one snapshot per state, and a game of
   several parts (below).

## A game of several parts

Some games are not one image. The same addresses hold something else at
different times: an intro, then each level loaded on its own, then an
ending; or an engine that stays in memory while one level after another
is loaded over part of it. Each of those is a **part**, with its own
snapshot, symbol map, listing and facts. Forced into one image, all but
one of them is lost.

What makes a part is the machine's. On one that loads from disk or tape,
a part is a load as the player meets it: the program as it stands when
the loading is over and something happens. Ten files behind one loading
screen are one part, so count what the player waits for, not what the
disk holds. A state that differs only in its variables is not a part: a
title screen and play in one load are one, and step 4 chooses its
snapshot. The loader, a protection check and a cracker's menu are not
parts either; they stand in front of the game.

1. **Give every part a folder**, in the order they are played, analysed
   or not: `python3 kit/scripts/parts.py add <game dir> <id> --title "..."`
   makes `parts/<id>/` (`parts.py -h` has the layout). The folder says
   everything about the part, in its `part.json`: its title, its place
   in the order, the part it lies over. No file lists the parts, so
   adding one writes nothing another part shares. A part with no symbol
   map shows as not analysed on the page and in `coverage.py`, and that
   is what keeps the game's figure honest: the parts with no folder are
   the ones nobody knows are missing. When the first load was analysed
   before the others were found, `--adopt` makes the game folder's own
   symbol map that part's.
2. **A snapshot for each part**, in the part's own `work/`: the
   hand-over as `entry.<ext>` and one in play, as above. The game's own
   loader puts the part in memory. Never assemble an image from the
   disk's files: the listing must show bytes and a machine that existed
   together.
3. **Write the route to each part** in `orientation.md`, from power-on
   or from the part before, so that someone else can reach every
   snapshot. Where playing to a late part is not practical, say what was
   done in its place (a level code, the game's own level select, the
   level number set and the game's loader called), and add a part
   column to the table of files in step 7.
4. **Find what stays.** Compare the parts' snapshots byte for byte. Code
   that is the same at the same address in every part is resident: make
   it a part of its own, and add each load with `--over <its id>`, giving
   the addresses the load writes as `"ranges"` in its `part.json`. Find
   them by watching the load (a store checkpoint over all of memory
   while the loader runs), or by comparing the snapshots either side of
   it. The part beneath then owns everything else, each byte has one
   owner, and the game's coverage counts it once. A stretch that matches
   another part's where nothing calls it is a leftover of an earlier
   build, not shared code.
5. **A program that replaces the whole of memory** needs no `over`. Run
   its file's unpacker in the simulator over memory filled with two
   different values before trusting its snapshot: whatever the unpacker
   does not write is the program before it, not this one.

From here on, every script that takes a game's folder takes a part's in
its place.

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
- A loaded snapshot can seem to come back dead: the CPU in a wait loop
  and nothing moving, or `$01` changed and the CPU in the KERNAL with a
  garbage screen. On an emulator that fails its check that checkpoints
  survive a load, the instrument is off, not the game; read that
  workaround first. The file is still good for the disassembler; autostart
  the image again rather than fighting it. **Before believing that, sample the
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
