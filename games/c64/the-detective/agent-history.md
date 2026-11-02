# The Detective — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 1 November 2026: Bronze, claude-opus-5-5

- The T64's directory has two entries; the second, `DETECTIVE DOX`, is
  the crackers' instructions. Its text types itself out with deliberate
  mistakes and `$14` (DEL) bytes to correct them; applying the deletions
  to the stored bytes gives the clean text at once.
- The game is packed three times. A stopping checkpoint on `$BD0A` set
  before the load fired inside BASIC's ROM while it read the `SYS`
  number; stopping first on `$0812` (RAM only) and arming from there
  worked. The exit of each stage is code the stage before unpacked, so
  reading one stage's exit and arming it missed the next. What found the
  game's entry was an execute checkpoint over `$0900`-`$CFFF`, re-armed
  around each stub it stopped on: the fourth distinct stop was `$2000`.
- A script named `dis.py` in the working folder shadowed Python's
  standard `dis` module, which `vice.py`'s imports load, so every script
  ran it first and printed its output. Renamed, the problem went away.
- The emulator's snapshot folder already held an `entry.vsf` from another
  game; saving under that name was refused and the copy step picked up
  the old file. The hand-over was saved again as `detective-entry` and
  copied over it.

## 1 November 2026: Silver, claude-opus-5-5 (checker claude-fable-5-1)

- The code map from play (`codemap.json`) and the jump tables found most
  of the code; dispatch tables at `$2B0F`, `$2D48`, `$39B4`, `$3B24`,
  `$87ED`, `$8826`, `$A4C8` and `$A7FB` the rest. `$A7FB` points at byte
  code, not 6502: traced as code by mistake first, then untyped.
- A scan for `JSR $201E` call sites matched three data bytes at `$91CD`
  and typed a table as text; inline-text sites are taken only from code.
- Reading the room unpacker for the Maps port found two of my own
  comments wrong (the order of the rows, the run format) before the
  sample did. The music test found the tunes' sequences at `$E680` and
  `$7AC5`, inside ranges described as room pictures and sprites.
- The live time-limit test looked like a failure: the ending's text goes
  to the message bar, not the panel, and the checkpoint counters read 0
  although the game restarted; the stack showed it waiting in `$25F8`.
- No browser extension was connected; the pages were checked with
  headless Chrome (`--dump-dom`, `--screenshot`) on the built site.

## Follow-ups, 1 November 2026

- The contributor asked for the follow-ups, a search for the original
  manual, a check against the other copies on their desktop, and no
  reliance on the crackers' material. The original instructions were
  not found online; `DETECTIVE DOX` is no longer a source, and the icon
  list it gave was replaced by the game's own pictures. Its "file up" and
  "file down" are the door icons (arrows up and down through a line);
  three icons have pictures and no action.
- Two disk images were run to `$2000` and compared with the tape's
  hand-over. One is the same Trianon crack. The other, by WOW, waits on an
  intro for Space and holds a machine frozen in play; its program is the
  same as the tape's.
- The start of a game resets the doors (`$8680`), so the Maps tab draws
  that state, not the hand-over's.
- The ending was played live with a bot that steers the momentum pointer
  from memory. Its fire presses failed at first. A stick state set while
  the emulator was stopped at a checkpoint never reached `$DC00`, and
  presses started at a frame boundary were mostly lost. Pressing a random
  number of instructions into a frame worked about two times in three,
  which led to the measurement of the game's own lost presses.
- Using the gun goes through the inventory (the gun's own menu offers
  icon 6), not the "use" icon.

## Follow-ups, 1-2 November 2026

- The contributor asked for the follow-ups left in TODO: the furniture's
  depth on the Maps tab, the lost presses by room, and a whole game won
  by play.
- Drawing the depth showed that the listing had `$1B40` and `$1B60` the
  wrong way round ("nearest" and "farthest"). Walking Snide in the hall
  settled it: up adds to the depth, and under the stairs the back limit
  became the staircase's `$1B60` value. Comments and labels were
  corrected.
- The won game took several tries. A first attempt collected the
  evidence in an easy order and found Dingle's room locked after the
  Doctor's report; the hot water bottle (key byte 0) had no unlock icon,
  which led to the discovery that the room locks for good. The second
  attempt waited upstairs for the fake death and searched the body at
  once.
- Things the bot had to learn, each from a failure: the study's door
  shares its columns with the library's front door, so the door the game
  has found (`$63`) must be checked, not just `$62`; Cynthia's body is
  furniture and blocks the hall's front lane; the second tune (state 8)
  holds play for about 200 frames; the library question comes from
  taking the BOOKS; use starts from the main menu, tool first; a closed
  secret passage gets the ordinary menu and is opened by investigating;
  the gun is used from the inventory (as the earlier live test had
  found, and the first accusation forgot).
- Each phase saved a snapshot and its input log, so a failure was
  retried from the phase before. `work/replay.py` plays the whole log
  from the hand-over snapshot in one run.
