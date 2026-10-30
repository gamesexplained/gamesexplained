# The Fourth Protocol — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshots named in `orientation.md`.

The game is five programs, and each has its own facts, listing and
symbols under `parts/<id>/`: `parts/resident/facts.md` (the disk
operating system and the episode loader), `parts/title/facts.md`,
`parts/nato-documents/facts.md` (episode one), `parts/the-bomb/facts.md`
(episode two) and `parts/sas-assault/facts.md` (episode three). An
address is always an address in the part named with it. This file holds
what spans the parts.

## Build

Bantam Software's US disk of 1985, from the C64 Preservation Project's
G64 collection (`orientation.md` has its checksum and the file list).
Fifteen files and 43 sectors that no file holds. The 43 sectors are the
boot's second stage and the episode loader; `XXXCOPY` is run before the
title and returns, and `KIE` is loaded by nothing.

| Part | Files | Runs at | Banking in play |
|---|---|---|---|
| resident | `XXXMYOS1` (or `XXXMYOS2`), the episode loader | the OS `$EB00`-`$FFFF`, the loader `$0800`-`$0947` | `$01` = `$15` |
| title | `XXXTPAGE`, `XXXTITLE`, `XXXCOLMAP`, `XXXMUSIC` | `$4000` | `$01` = `$15` |
| episode one | `XXXPART1` | `$4005` | `$01` = `$15` |
| episode two | `XXXMYOS2`, `XXXICONS`, `XXXPART2` | `$4077` | `$01` = `$15` |
| episode three | `XXXF0`, `XXXF1`, `XXXF2` | `$C000` | the KERNAL's own, `$01` = `$36` |

With `$01` = `$15` the KERNAL and BASIC are switched out and the chips
are in. The title and the first two episodes draw everything through the
resident OS, which lives in the RAM under the KERNAL and is called at
`$EC00` with a function number in A (resident `os_call`). Episode three is
another program by another programmer: the episode loader puts the
KERNAL back (resident `$0850`: `$01` = `$37`, then IOINIT, RAMTAS, RESTOR
and CINT), loads its three files with the KERNAL's LOAD and jumps to
`$C000`; it reads the keyboard through the KERNAL (SCNKEY and GETIN) and
uses none of the OS.

## How one part leads to the next

- The boot (`GAME`, `SYS 3584`) reads track 1 into `$C000`, decodes it
  (`EOR #$FF`) and runs the episode loader at `$080E`, which installs the
  OS from `XXXMYOS1`, runs `XXXCOPY` and then the title program
  (resident `episode_loader`, `run_protection`, `run_title`).
- The title program returns the episode chosen, 0 to 2, and the loader
  loads that episode's files and jumps into it (resident
  `episode_loader`). Episode two first loads `XXXMYOS2` and runs its
  installer again, which differs from `XXXMYOS1` in two bytes: where the
  windows' saved backgrounds may grow to (resident `reset_windows`).
- No episode loads another, and none goes back to the menu. Each ends in
  PRESS <SPACE> FOR A NEW GAME and starts itself again (episode one
  `show_ending`, episode two `game_over`, episode three's epilogues to
  `new_game`).
- Any episode can be chosen from the menu, and episodes one and two ask
  for nothing when they start. Only episode three asks for a code word.

## The code words

The manual says the episodes must be played in order, and the code
words carry the player from one to the next:

| Given by | Code | Taken by |
|---|---|---|
| episode one, the winning memo from Sir Nigel Irvine | YOUR NEW PASSWORD: 10 190 216 277 358 (episode one `text_sir_nigel_irvine`) | — |
| — | ASPEN | the lift at Gordon's, episode two (`lift`, token `$24`) |
| — | 42431282, or the word EPC | the lift at Sentinel House, episode two (`lift`, token `$25`) |
| episode two, the estate guard asked about plot B5 | THAT'S THE TIPTREE BANANA BUILDING (episode two `plot_b5`) | episode three's codename screen (`codename_answer`, TIPTREE) |

- Episode one's password is five numbers. Its registry's codes for the
  Blenheim files are written the same way, one number to a letter:
  FIREBIRD is eight numbers (pad FP2), PHOENIX seven (FP1) and ROCKET
  six (FP3) (episode one `text_registry_new_code` and its two
  neighbours). The pads that turn the numbers into letters are not in
  the program, so which word the five numbers spell is not in it either;
  ASPEN, the code the first lift of episode two takes, has five letters.
- The lift at Gordon's is the only way from your office's floor to the
  foyer and the street: the corridor's exits (episode two `location_2`)
  lead to the security office, a small office, your office and the
  document room, and the foyer (`location_11`) has no stair. So episode
  two cannot be left without ASPEN.
- Episode three takes any line that begins with TIPTREE and ignores the
  rest of it (episode three `codename_screen`).

## Code the parts share

- The OS is the same in every part that has it: the resident `$EB00`-`$FFFF`
  in the snapshots of the title and episodes one and two differs only in
  its keyboard state and in operands it writes into itself.
- Episodes one and two do the same jobs with routines of the same names,
  each assembled at its own addresses: `choose_icon`, `move_pointer`,
  `draw_icon_list`, `call_from_table`, `inline_args`, `ask_options`,
  `wait_seconds`, `print_number`, `divide`, `random`, `print_text` and the
  packed-text reader (episode one `next_word`, episode two
  `next_word_number`). `random` is the same 48 bytes in both.
- Episode three shares no code with the others.

## Timing

- Episode one's clock counts frames in its raster interrupt: a day is
  14,400 frames (episode one `day_clock`), 4 minutes 48 seconds on a PAL
  machine, and the game has 40 days. *Live*: 1,000 frames moved the count
  on by 1,000.
- Episode two has no clock and no interrupt. Its only timer is the CIA's
  time-of-day clock, read for the pauses (`wait_seconds`).
- The pauses of the title and episodes one and two run on CIA 1's
  time-of-day clock (episode one and two `wait_seconds`, title
  `wait_for_space`): started from 0, they end when the clock's seconds,
  in binary-coded decimal, are not less than A, so A = `$14` is 14
  seconds and anything above `$59` ends only with SPACE. The CIA is left
  in its 60 Hz mode (`$DC0E` = `$01`), so on a PAL machine each second of
  the clock lasts 1.2 seconds. *Live*: in 1,000 frames from episode two's
  office the clock went from 2:49.3 to 3:06.0, 16.7 seconds in 19.95.
- Episode three counts commands, not time, for the bomb: the 144th line
  typed sets it off (episode three `check_turn`). The guards move on a
  count of keyboard polls (`guard_timer`).

## Controls

- Title: SPACE, then a digit and RETURN at the menu.
- Episodes one and two: a pointing hand chooses an icon. SPACE moves it
  to the next icon and the up/down cursor key to the one before, both
  going round, and RETURN chooses (episode one `choose_icon`). Names,
  numbers and answers are typed (resident `input_line`). The joystick is
  never read.
- Episode three: lines typed at the keyboard and read by the episode's own
  line editor (episode three `input_line`).

## Sound

| Part | What | Voices |
|---|---|---|
| title | the tune, by David Dunn, 2 minutes 29 seconds and repeating (title `tune_play`) | all three, with the filter |
| episode one | the telephone's bell (`ring_tick`, `init_sound`) | voice 3, ring-modulated by voice 2 |
| episode two | nothing: no instruction names the sound chip (register census) | none |
| episode three | the alarm's siren (`alarm_sound`, voice 2), the explosion's noise (`noise_burst`, voice 1); voice 3's output is read for random numbers | voices 1-3 |

## Text

- The OS prints text in its own font, from the space to `$61`: capitals,
  digits and punctuation, `$60` a pound sign and `$61` a solid block
  (resident `font`). Strings after a `JSR $EC06` are plain ASCII.
- Episodes one and two keep most of their text packed. A text is a stream
  of 4-bit codes, the low half of each byte first, and each code or group
  of codes is a word number into a dictionary of 301 zero-terminated
  words and pieces (episode one `dictionary` at `$96D0`, episode two
  `dictionary` at `$C91C`):

  | Codes | Words | What they hold |
  |---|---|---|
  | 3 to 15 | 288 to 300 | the space, E A I S R T N O L D C, and the new line |
  | 1, then n | 256 to 271 | 256 ends the text; then short words and endings such as AND, THE, ING |
  | 0, then n | 272 to 287 | the rarer letters, an asterisk, FROM:, the full stop and the comma |
  | 2, then l, h | 0 to 255 | h × 16 + l: whole words, digits and punctuation |

  The two episodes have their own dictionaries and the same scheme
  (episode one `next_word`, episode two `next_word_number`).
- Episode three's messages are strings of ASCII capitals ended by a
  zero. `print_message` turns each letter into its screen code and
  writes it straight into the bottom row of the screen (`$07C0`), with a
  pause between letters, and scrolls the text window up at each RETURN.

## Registers

From `kit/cpu/census.py` over each part's code.

| Part | Video chip | Sound chip | CIAs |
|---|---|---|---|
| resident | sprites 0 and 1 (the pointer), raster interrupt, bitmap mode, `$D018` | volume only | keyboard, time-of-day clock, video bank |
| title | raster interrupt, border | all voices, filter | time-of-day clock, video bank |
| episode one | raster interrupt, border | voices 2 and 3, filter, volume | time-of-day clock |
| episode two | the border, and the raster line read once for a seed | none | time-of-day clock |
| episode three | sprites 0-7, raster interrupts, multicolour bitmap, `$D018`, `$D016` | voices 1-3, voice 3's output read for random numbers | joystick port 2 (the unused shoot-out), CIA 1's timer interrupt off, video bank |

## Leftovers

Every part carries bytes its program never reads, as memory held them
when each file was saved:

- resident: fragments of a machine-code monitor at `$0948`-`$0B7F`.
- title: the first 905 and the last 216 bytes of `XXXMUSIC`.
- episode one: 1,226 bytes after the last text (`filler`, `$C346`).
- episode two: 291 bytes after the dictionary (`filler`, `$CEDC`).
- episode three: an earlier build of episode two's code, locations and
  texts in several places, a machine-code monitor's fragment at
  `$C13F`-`$C1FF`, and a tape writer at `$9000` that saves `$1000`-`$CDFF`
  (`parts/sas-assault/facts.md`).

## The listing's error rate

- Sample, seed 20261030: 80 of the 4,383 line comments of the five
  parts, in two strata: 60 of the 3,038 written by hand and 20 of the
  1,345 a script wrote from templates (the decoders of the packed texts,
  the location records, the messages and the pictures), drawn in
  `work/reports/sample-1.json`. The checker, a fresh agent on
  claude-opus-5-5 that wrote none of them, found 8 wrong, all of them hand
  comments, and each was confirmed against the code: episode one's
  `draw_line` said its pixels are black, where a cleared bit shows the
  cell's background, red in the voice-print windows; `held_message` said
  254 seconds end the wait, which the clock's decimal seconds never
  reach; `call_blenheim` named a symbol that does not exist for
  `blenheim_code`; `store_target_name` gave one of its two callers; the
  raster seed at `$6949` put the random state at `$88`-`$8B`, which is
  `$88`-`$8A`; episode three's `look_count` was called a count of frames
  where it is an index into `guard_look_frames`; the leftover texts at
  episode three's `$9400` were listed in part; and episode two's note was
  said to have five rows of digits, which has six. All eight were
  corrected, with 32 comments that said the same: every wait of episode
  one and two given in seconds as if A were binary (the time-of-day
  clock counts its seconds in decimal digits, so `$14` is 14 seconds and
  anything past `$59` waits for SPACE alone), and every comment that named
  a routine or variable by a name the listing does not have. The plain
  rate is 8 in 80, 10 % (95 % interval 5.2 % to 18.5 %); the hand
  comments' is 8 in 60 (6.9 % to 24.2 %) and the templates' 0 in 20 (0 %
  to 16.1 %), so the rate weighted by the strata's sizes is 9.2 %. A
  checker misses some, so these are lower bounds.

## Live tests

All in VICE v3.14.0 from the snapshots in `orientation.md`, 29 and 30
October 2026.

| Test | Part | Result |
|---|---|---|
| boot to the title and the menu, each episode loaded | all | as `orientation.md` |
| 1,000 frames from the Cencom screen | episode one | day count +1,000; 1,000 interrupts |
| taxi from Gordon Street, WHERE TO? BOMB | episode two | the Faslane estate (location 200), £5 paid |
| the telephone, PAPER and SVETOFOR dialled | episode two | NUMBER UNOBTAINABLE; the machine halts |
| look around at the estate gate (213) | episode two | YOU SEE A PIECE OF NOTICE BOARD |
| a checkpoint on the interrupt vector's handler in play | episode two | no hits |
| 1,000 frames from the office, CIA 1's time-of-day clock read before and after | episode two | 16.7 of its seconds, `$DC0E` = `$01` |
| TIPTREE at the codename screen | episode three | play begins |
| the defusing, step by step | episode three | as `parts/sas-assault/facts.md`, ending in the good epilogue |
| the 144th command, odd and even counts at an explosion, PUSH ALL, CUT BOX, CUT BLUE, USE FIRST, EIOK, LOOK, HIDE | episode three | `parts/sas-assault/facts.md`, "Live tests" |
