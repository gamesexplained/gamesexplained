# Armalyte — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 7 October 2026: the Silver run

One agent did the work, from 13:23 to about 18:00 UTC, with a checker
agent for each of the two comment samples in `60-verify`. Aaron Bell
(`air`) asked for the run and answered `kit/START.md`'s questions:
Silver, the disk from archive.org, web lookup yes, the pull request and
issues by the agent, one agent.

### Setting up and orienting

- The environment already set the commit identity (`GIT_AUTHOR_NAME`,
  `GIT_AUTHOR_EMAIL` and the committer pair) to Aaron as
  `air@users.noreply.github.com`. Those variables override `git config`,
  so setting the address in the clone alone did nothing; every commit
  passes the `18724+air@users.noreply.github.com` form in the
  environment instead, which is the form his commits on `main` use.
- I asked the identity question as "what name should the commits show",
  copying `START.md`'s line about asking for a login and a name. Aaron
  pointed out that the step's point is to make sure the commits are the
  contributor's, which here meant showing the identity the environment
  had set and asking for a yes (`kit-feedback.md`, Maintainer asks).
- Both disk sides came from the C64 Preservation Project collection on
  the Internet Archive. Side 1 boots to a disk menu, the engine unpacks
  to `$0400-$FFFF` with the KERNAL banked out, and side 2 holds eight
  level files and the ending, each packed and loading at `$0801`.

### Finding what each load writes

- The first plan was to fill memory with `$AA`, run a level load, fill
  with `$55`, run it again, and compare. Both loads hung: the snapshot I
  started from had been saved without the drive's state, so the game's
  fast loader, whose drive-side code lives in the 1541's memory, had
  nothing to talk to. Reattaching side 2 did not help. Snapshots saved
  partway through the boot cannot continue a load; the loads had to run
  in one session from a hard reset, which is how the hand-over snapshot
  of every part was then made.
- Instead of filling in VICE, I ran each level file's own unpacker in
  `kit/c64/cpu6502.js` from the snapshot, with the two fills, and
  compared what it wrote: `$0200-$8000`, `$9700-$98FF` and `$D000-$D6FF`
  (RAM under the I/O chips), with a mover at `$9680` then copying parts
  of it into place. The simulated level 1 matched the real snapshot.
- A simulated long run of play (to record which code runs) stopped
  taking interrupts. A lost life restarts the level from inside the
  interrupt and resets the stack, so the simulator's interrupt, which
  ran each handler to its RTI, never returned. Taking interrupts the way
  the processor does, by pushing and jumping, fixed it.
- A run with the infinite-lives poke froze after a few seconds: the
  anti-cheat check banks the KERNAL ROM in over the engine when the
  `DEC` that takes a life has been changed. That became a fact and a
  page section.

### Annotating

- The engine was traced from its entry points and the routines the
  executed-address maps of every level showed, and annotated in level
  1's disassembler session; `symbols_export.py --from` copies the
  engine's part out of it. The level data was annotated by a script that
  decodes each level's tables (map, tiles, waves, paths, script, bosses)
  and writes one comment per entry, so a mistake in one of its templates
  is repeated in all eight levels.
- The two boss tables had their names swapped in all eight levels: the
  table I called the mid-boss's was the end boss's. Found while writing
  the facts, by reading where `level_script` indexes them. Renaming two
  labels into each other's names needs a temporary name first, or the
  disassembler refuses the duplicate.
- The script's stop times were described in units of six frames. A live
  run of level 1 to its end, with no input, showed the bosses blow up
  on a timer and the stops last eight times longer: the script runs once
  a scroll step of eight frames, so a unit is six steps, 48 frames. The
  template was corrected and every level regenerated.
- Each level's sixteen spare bytes hold a message padded with spaces
  and `$FE`; the template wrote the same padding for every level, and
  level 3's has four `$FE`. It now counts them.
- `$DD0D` appeared in the engine's register census, but only the ending
  reads it.

### Verifying

- The generators were described everywhere (listing, facts, features)
  as ticking every 60, 50, 40, 30 or 18 frames. A live check had
  measured "about 460 frames" for the 480 predicted for eight ticks with
  no generators, and the gap was let go. Writing the energy widget meant
  reading the routine again: it compares the counter with the table
  value and ticks on `BCS`, so the counter runs from 0 to the value and
  a tick comes every value + 1 frames: 61, 51, 41, 31, 19. Measured
  live: ticks at 61 and 122 frames, and 19 and 38 with four generators.
  Eight ticks are 488 frames.
- The first independent check, of 80 comments (seed 20261007), found 13
  wrong: 5 of the 60 written by hand and 8 of the 20 written by the
  level script, all eight from the path template. The common cause was
  rate. The main loop (`$A1A0`) runs the enemy paths and wave spawning
  when `$68` is 0 and the animation and the pod checks when it is 1, and
  the interrupt flips `$68` every frame. So the path steps, the
  animation, the anti-cheat check and the pod checks each run every
  second frame (the pod checks every fourth for each ship), where the
  comments said every frame. I had read each routine and never the
  branch above the call. The whole listing was audited for the class by
  following every reader of `$68` (`opcodes.py --refs`), 16 engine
  comments and all 640 path comments were corrected, and a second
  sample was drawn from what was left.
- The other errors in that sample were details: objects 16-19, which I
  had called escorts, are the four enemy shots; the NMI vector in play
  is the RTI at `$A07B`; and the boss's break-up starts those four
  objects in their burst state.
- The second check, of 80 comments drawn after the corrections (seed
  20261008), found 5 wrong, all hand-written. Two came from one cause:
  I had read the title font's punctuation as ASCII, but `$2C` is a full
  stop, `$2D` a comma and `$2E` a colon, so the credits read "CREDITS:"
  and "PRODUCED BY:" and the default high-score name is "...". The
  near stars were the one reader of `$68` whose comment the first audit
  had left at "every frame". The others: the wipe in the front end's
  protection clears `$E000-$FFFF` and only one page at `$A000` and one
  at `$B000`, since only the first store's operand is stepped; the
  scoreboard sprites are not evenly spaced; and a table of colour-RAM
  places was called screen places.

### The page

- The level browser first opened at column 0, which is empty space in
  every level, and levels 4 and 7 stayed black at every column. They
  have no scenery: every map entry is tile 0 and tile 0 is blank. Level
  7 even carries level 1's tiles, byte for byte, which its map never
  uses. The page now says so on the canvas.
- The draft said that shooting a battery pod more than 32 times gave
  nothing more. The copy pass checked it against `pod_next_type` and
  found the opposite: the type wraps round, to 0 with forward fire's
  look, so for one round the pod looks like forward fire and gives only
  an unshot pod's invulnerability. The page, the notes and the listing
  say so now.
- `build.py` turned the disk image's file name in `orientation.md`,
  `armalyte_s1[thalamus_1988](pal)(!).g64`, into a link to "pal" on the
  About tab, because its link markup ran inside code spans. Fixed in
  `build.py`, with a test.

## 7 October 2026: the music

The Silver run annotated the music driver and left the player to
`TODO.md`. Aaron Bell (`air`) asked for it the same evening, and for the
kit to require one: `70-minisite` and the Silver row of `AGENTS.md` now
say that a game with music gets a player for every tune it stores.

- The driver is short (`$C000-$C4B1`) and keeps all its state in its own
  page, so the port lays the engine's `$C000-$CFFF` out at its own
  addresses and the test compares the variables as well as the SID.
  The four tunes matched the game's code on the first run, every write
  in order.
- The random tunes found one difference: a track made of commands alone,
  a fade and then the restart, restarts onto pattern `$FF` and reads
  that pattern's address from past the table, out of memory the port
  does not hold. No tune has such a track, so the random tracks now end
  on a pattern, and the port's comment says so.
- The first draft of the page said that instruments 1 and 2 fall in
  pitch. Their arpeggio sets the frequency from the note table every
  frame before the fall lowers it, so they sit one step of the high
  byte below the pair instead; only instrument 5, with no arpeggio,
  falls.
