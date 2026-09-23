# Little Computer People — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

A single-file crack by Mr Z of the 1985 Activision game; see
`orientation.md` for the image, the loader and the crack screen. The crack
hands over at `$0340`, the game's own jump table, after putting three
blocks back where the game expects them: `$0340`–`$03FF` from `$4B40`,
`$0400`–`$07FF` from `$4C00`, and colour RAM from `$CC00`. Nothing in the
program touches the disk (`orientation.md`, "Steady state").

## Memory layout

| Thing | Where |
|---|---|
| Zero page: parser, switch, counters, keyboard, both music players, text | `$0000`–`$00FF` |
| Text output queue; typed-line ring (128 bytes, write index `$0222`) | `$0200`–`$0221`; `$0224`–`$02A3` |
| Jump table: cold start, random number, mood score | `$0340`–`$0349` |
| Settings and state: mood, illness, needs, house clock, figure arrays | `$034A`–`$03F4` |
| The name "Billy Bob Binkle", referenced by nothing | `$03FC`–`$040B` |
| Random number state; activity script pointer; real-time clock | `$0414`–`$0417`; `$0423`; `$0426`–`$0429` |
| Cold start, time prompt, keyboard | `$0434`–`$0690` |
| Keyboard tables, VIC start values | `$0691`–`$070F` |
| Raster interrupt | `$0713`–`$08D2` |
| Main loop, house clock, illness, daily schedule, wall clock | `$0931`–`$0CF1` |
| Figure sprites: unpacking, sharing out, outlines, clipping | `$0E41`–`$13EE` |
| Walking, stairs, the dog, 55 places, random numbers | `$16AE`–`$1E59` |
| Activities and their handlers | `$1E5A`–`$3F0B`, `$52D8`–`$5BF7`, `$8D99`–`$96C4`, `$A80B`–`$AFFB`, `$BEFF`–`$BFFC`, `$E000`–`$E452` |
| House events: CTRL keys, TV, stereo, fire, phone, alarm, stove | `$2B45`–`$2E92` |
| Sound request scheduler; typed input | `$3476`–`$3730`; `$3731` |
| Record player music: tunes; driver; note table | `$39C7`–`$3E43`; `$3F3B`–`$46BC`, `$7F40`–`$801F`; `$46C9` |
| The switch | `$3F0C`–`$3F3A` |
| Sprite shape buffers (VIC bank 1) | `$4800`–`$4BFF` |
| Font, 91 glyphs | `$5000`–`$52D7` |
| Letter pieces | `$5600`–`$56DC` |
| Colour matrix, sprite pointers | `$5C00`–`$5FFF` |
| The house picture, a multicolour bitmap | `$6000`–`$7F3F` |
| Letter buffer (inside the record player's work area) | `$7F40`–`$7FDE` |
| Four piano pieces | `$8020`–`$8D98` |
| House objects: states, drawing, frames | `$96C5`–`$A807` |
| Head turning; pose view classes | `$ACF3`–`$AEE9` |
| Piano and effects sound driver | `$B000`–`$B9BD`, interpreter `$D000`–`$D586`, data `$D587`–`$DD8E` |
| Clothes colours; text output | `$B9BE`–`$BA35`; `$BA36`–`$BECF` |
| Parser: code, word lists, rules | `$C000`–`$C233`, `$C234`–`$C969`, `$C96A`–`$CB8A` |
| Colour RAM image of the house | `$CC00`–`$CFE7` |
| Activity chooser; piano activity | `$E13F`; `$E3CA` |
| Packed figure graphics: offsets, 183 images | `$E453`–`$E5C0`, `$E5C1`–`$FFB9` |
| Hardware vectors | `$FFFA`–`$FFFF` |

## Banking

- The main program runs with `$01` = `$35` and drops to `$34` (`AND #$FE`)
  around each use of the RAM under the I/O area: the piano and effects
  driver's interpreter at `$D000` (entered by `JMP $D000` at `$B635`) and
  its tables at `$D587`–`$DD8E` (for example `$AB21`, `$B26F`, `$B62E`).
- The IRQ handler saves the low bits of `$01` in `$092D`, forces I/O in
  for its own work, and puts them back on the way out (`$0822`). One of its
  routines, `$B4FB`, touches `$D7AC`–`$D7B0` with I/O still in, so those
  writes reach SID mirrors instead of the RAM table meant.
- The disassembler names `$D000`–`$D02E` and `$D400`–`$D418` after the
  VIC and SID registers. In this game the same addresses are also RAM
  code and tables, so a label there can name either: the listing's
  `snd_event` at `$D000` is also the VIC's sprite 0 x register, and the
  comments say which is meant.

## Timing

- **Raster interrupt:** one a frame, at line `$28` (set once by the cold
  start). It switches the top text band to hi-res at a timed point,
  borrows the lowest sprite as the text cursor, runs the real-time clock
  (`$2E94`) and the frame counters, and ticks one of the two sound drivers:
  the record player's (`$800C`) while `$801E` is set, the piano and
  effects driver's (`$B003`) otherwise (`$080D`–`$0818`).
- **CIA1 timers:** only while a record plays. Timer A, every `$3B00`
  cycles, is the record player's note clock; timer B, every `$4295`,
  drives its effects (`$4424`). The interrupt handler passes them to
  `$3959`.
- **Main loop** (`$0931`): twelve stages, at most one pass a frame,
  because stage 1 waits for raster line `$FA` before writing the sprite
  registers (`$1275`).
- **Frame counters** (`$07FC`): `$2B` counts frames and carries into `$2C`
  and `$2D`, so `$2D` counts 65,536-frame periods (about 22 minutes at 50
  Hz); the keyboard scanner clears `$2C` and `$2D` on a key. `$0430`
  counts frames for the house clock.
- **House clock** (`$09EB`): every 256 frames a divider counts down from
  9; at 0 a tick happens. 12 ticks make an hour (`$037A`, `$0379`, hours
  0–23, starting at 15), so a house day is 12 × 24 × 2304 frames. *Live:*
  one tick measured as 45,287,427 cycles, exactly 2304.00 PAL frames or
  45.97 s, which makes a house day 3.68 hours on PAL.
- **The typed time of day** only sets the real-time clock (`$2E94`, one
  BCD second every 50 frames), which the wall clock in the study shows
  (`$0AAC`). The house's own hour is separate; the am/pm byte `$0429` is
  counted up and never read.

## Controls

- The game reads the keyboard itself (`scan_keyboard`, `$05C7`, from main
  loop stage 2); the KERNAL is never used. The scan does nothing while
  `$037B` is non-zero, and only runs when no joystick line is held (it
  checks that `$DC00` and `$DC01` read `$FF` with no row selected). The
  joysticks are read (`$059E`) and the result never used.
- It walks all 64 keys (index in `$34`, 63 down to 0) and looks each one
  up in `key_ascii` (`$0691`), indexed by row + 8 × column (row selected
  through `$DC00`, column read from `$DC01`). Codes `$23` and `$24` there
  count SHIFT and CTRL, `$21` marks a key it ignores, and `$5C` a key with
  no character. The lowest-numbered key held wins.
- Letters come out lower case; SHIFT makes them upper case. With CTRL a
  letter becomes its control code (`AND #$1F`), so CTRL F is `$06`. SHIFT
  turns `/` into `?`, `:` into `[`, `;` into `]`, and clears bit 4 of a
  digit (SHIFT-0 types a space).
- A new key is stored in `$30`, `$31` and `$33`. `$33` is the last key
  seen; the same key held again is ignored until a scan finds no key.
  *Live:* `$30` goes back to 0 once the game has taken the key, and a key
  has to stay down until a scan has seen it: at 46 scans a second, a
  press of three frames was often missed.
- **The time prompt** (`$04F8`): digits, a colon, digits, then A or P and
  M in either case. Hours below 13 (0 is accepted) and minutes below 60;
  only the last two digits of each count; 16 characters restart the
  prompt.
- **Typing** (`$3731`): each key goes into the 128-byte typed-line ring
  and is echoed on the top band. It refuses printable keys while a letter
  is being typed (`$54DF`).
- **CTRL keys** (`house_events`, `$2B54`, every pass). Most raise a
  request flag at `$BEF3`–`$BEFC`; `request_scan` (`$BED0`) turns the
  first one set into an activity through the table at `$BEE9`.

  | Key | Code | What it does |
  |---|---|---|
  | CTRL F | `$06` | food delivery, activity 44; ignored while the cupboard is full (`$30B4` = `$0F`) |
  | CTRL W | `$17` | one more line of water in the tank `$2B51`, up to 11 |
  | CTRL A | `$01` | rings the alarm clock (`$2B4E`); ignored while a record plays (`$801E`) |
  | CTRL D | `$04` | dog food delivery, activity 33 |
  | CTRL C | `$03` | the phone rings: activity 25 |
  | CTRL P | `$10` | pats him if he is in the easy chair (place `$2B`), setting the mood to happy; otherwise activity 6 walks him there |
  | CTRL R | `$12` | a record delivered, activity 50 (only while `$0711` is 0, which it always is) |
  | CTRL B | `$02` | a book delivered, activity 51 |

  *Live:* each of D, C, P, R and B started its activity (after the brief
  activity 16) within a third of a second; W raised the tank from 5 to
  11 and no further; F did nothing with the cupboard full and started
  activity 44 at once after `$30B4` was set to `$07`.

## The person, the dog and what they carry

- **Figures:** 0 is the person's body, 1 the dog, 2 and 3 objects he
  carries or uses, 4 the person's head. Per-figure arrays at
  `$0381`–`$03F4` hold the pose, facing, place, depth, speed and state.
- **Sprites:** `update_figure_sprites` (`$0FD2`) shares the eight hardware
  sprites out each pass, nearest figure first: the person gets four (body
  colour, head colour, and two black hi-res outlines that `$12B7` builds
  at run time by growing the silhouette a pixel each way), the dog two,
  each object one. The shadow registers are written at raster line `$FA`
  (`$11B6`). There is no raster multiplexing.
- **Images:** 183 packed images, `$E5C1`–`$FFB9`, found through the offset
  table at `$E453` (stored offset − `$5000` + `$E453`). A count byte with
  bit 7 set copies n × 3 literal bytes; any other count repeats the next
  three bytes n times; the unpacker (`$0E41`) stops once 61 bytes are
  written, so every image comes out at 63 bytes (decoded: all 183 do).
  Body 0–97, dog 98–105, objects 106–130, head 131–137, then three sets
  of 15 heads for the three moods (138–152, 153–167, 168–182). Facing
  left is made by mirroring at run time (`$135F`).
- **The piano player** is composited from three part images at `$1610`,
  chosen from the piano driver's key-down bits (`$1585`, `$365D`).
- **Places:** 55 walk targets (`$1D36` floor line 101, 165 or 229;
  `$1D6D` x in 2-pixel units; `$1DA4` depth), entry 54 filled at run time.
  A sprite's y is the floor line minus depth minus the pose's offset. A
  flight of stairs is walked in two parts (`$1B32`). A sick person walks at
  half speed (`$170E`).
- **The dog** wanders between 21 places (`$173C`, `$180C`), rests, and
  eats from its bowl (`$2A62`, 0–6, drawn at row 23 column 1): one unit
  each time a random 0–63-pass wait runs out.
- **The head** turns by itself towards a target direction (`$ACF3`),
  steered by the activity (`$ACF2`), through view classes 0–4 per pose
  (`$AE8D`).
- **Clothes colours** come from pairs at `$BA0E` and single colours at
  `$BA2E` (`$B9BE`); he changes them inside the closet or the bathroom
  (activities 107–110).

## Activities

- **The switch** (`$3F0C`, `$3F11`, `$3F13`) is "on n go to": `JSR $3F13`
  takes n in A; `$3F11` loads it from `$4C`, `$3F0C` from `$68`. It pulls
  its own return address, picks the n-th word of the table after the
  `JSR`, pushes it and returns into it. Each word is a handler's address
  minus one, nothing checks n against the table's length, and control
  never comes back to the call site. There are 103 call sites.
- **An activity** is a state machine: `$8D9B` holds the activity number,
  `$4C` its phase and `$68` a sub-phase. The main loop's last stage calls
  `activity_dispatch` (`$8DAB`), which switches on `$8D9B` at `$8DC6`
  through the 128-entry `activity_table` (`$8DC9`–`$8EC8`) whenever the
  low three bits of `$03C4` are clear. `$8F0B` advances the phase, and
  `$AB5D` adds to it, so a table can hold several sequences one after
  another (`$2797`'s runs to 56 entries).
- **Scripts:** some activities are lists of activity numbers ended by 0,
  started through `$AA4D` (pointer in `$0423`/`$0424`) and stepped by
  `$8F0E`, the handler at the end of nearly every table. Putting on a
  record is the list 121, 119, 118, 120 (`$AAEC`).
- **The chooser**, activity 0 (`$E13F`, also 77 and 123–127), decides what
  comes next. It checks, in order: a CTRL-key request, typed requests,
  needs, bed, the daily timed activities, the morning and evening lists,
  then a random pick from the lists at `$E345`, `$E367` and `$E399` by
  time of day, weekday and the routine setting `$0350`.
- **An interrupted activity** is saved by `$8FC1` and taken up again by
  activity 15 (`$916A`), all but its pose and facing.
- **The first activity** is 122, coming in through the front door, forced
  by `$037B` = `$7A` in the image. *Live:* `$037B` is `$7A` at the time
  prompt, and he is at the front door two seconds after the time is typed.
- **Activities identified,** by number:

  | Activity | What he does |
  |---|---|
  | 0 | chooses the next activity |
  | 1 | a cooked meal (a script chosen at random, `$AAC8`) |
  | 2 | takes a typed request |
  | 5 | sits in the attic armchair (the TV) |
  | 6 | walks to the easy chair to be patted |
  | 7 | lights a fire: fetches a log from outside, puts it in the fireplace |
  | 9 | puts on a record (script 121, 119, 118, 120) |
  | 12, 13, 23, 60–69, 105, 106 | looks inside: upstairs closet, bedroom closet, filing cabinet, kitchen cupboard, fridge, freezer, dresser, nightstand |
  | 15 | takes up an interrupted activity |
  | 16 | switches the TV on or off at random |
  | 19 | tidies up |
  | 20 | uses the computer |
  | 21 | the piano: turns the stereo off first |
  | 22 | writes a letter |
  | 24 | the easy chair, with a white object (possibly the newspaper) |
  | 25 | answers the phone |
  | 27 | exercises |
  | 28 | brushes his teeth (a script) |
  | 29 | drinks a glass of water |
  | 30, 31 | goes to bed; gets up |
  | 32 | eats |
  | 33, 50, 51 | fetches a delivery: dog food, a record, a book |
  | 34 | feeds the dog |
  | 43, 44 | takes food from the cupboard; puts delivered food in it |
  | 46 | turns towards the player and makes a face, before a request that scored 12 or more |
  | 48, 49 | cooks: a pot on the stove, then to the sink |
  | 52 | answers a greeting |
  | 53 | dances (3, 7, 11 or 15 moves) |
  | 78, 79 | picks a piano piece; plays it |
  | 84, 102 | takes a bath |
  | 107–110 | changes clothes |
  | 113 | unknown |
  | 118, 119, 120, 121 | rummages at the stereo; picks one of the four tunes; starts the music; stops it |
  | 122 | comes in through the front door |

  The rest are phases of these or small helpers; each is named in its
  state machine's comment.

## The parser

- **Words** (`parse_typed_line`, `$C040`, called from the main loop at
  `$097F`): any
  character that is not a letter ends a word, the apostrophe included.
  `$C0B2` copies the word, upper case, at most 31 letters; `$C147` looks
  it up in word list 1 (`$C234`) and, only if it is not there, in list 2
  (`$C5E0`); the first exact match wins. A word's record is five bytes of
  concept bits, the word, and `$00`; the five bytes are ORed into the
  sentence's bits for its list (`$C016` or `$C01B`).
- **Two lists:** list 1 holds verbs, question words, feelings and manners,
  86 records to the `$FF` at `$C5DF`; list 2 holds things, rooms and
  games, 74 words then two records with empty words, to the `$FF` at
  `$C969`. Words with the same bits are synonyms. A word can never match
  if it has an apostrophe (WHAT'S) or if it is a second record of a word
  already listed (START, LIKE, APATHETIC and IS appear twice).
- **Rules** (`$C96A`, 34 of 16 bytes, `$FF` after the last): five bytes of
  list-1 bits, five of list-2 bits, then activity numbers ended by a byte
  of `$80` or more. After every word `$C1C5` tests the rules in order; a
  rule matches when every bit it names is present. The first match adds its
  activity numbers to the list at `$C00B`, adds the low 7 bits of its end
  byte to the score, and clears the sentence's bits.
- **The score,** at the end of a sentence (RETURN, `.`, `!` or `?`): 3, 1
  or 0 for the mood (happy, content, sad), plus the rules' part, plus a
  random 0–3. PLEASE is a rule on its own worth 4; the rules for things to
  do are worth 2 to 8; HELLO is worth 15. At 12 or more activity 46 goes in
  front.
- **What the score does:** the main loop (`$0986`–`$09B6`) puts the
  activities in a 16-entry ring at `$E12A`. At 8 or more it first empties
  the ring and raises the typed-request flag `$BEFC` (activity 2), so the
  request is carried out at once. Below that the request waits in the ring
  for the chooser.
- *Live, with the model in `work/parser_model.py`:* "please light a fire"
  (46, then 7), "hello" (46, then 52), "please type a letter to me" (46,
  then 22), "please dance" (the record script, then 53), "please put on a
  record" (121, 118, 120) and "please play the piano" (121, then 79) all
  did what the rules say. "please play a record" matches no rule for the
  record player (PLAY pairs only with piano and song words), and he did
  nothing in answer. Game words (CARDS, POKER, WAR, ANAGRAMS, HANGMAN, GAME)
  make activity 126, which is the chooser: no game starts.
- *Live, manners:* sad (mood 2), "light a fire" scored 4 and was still in
  the ring 25 s later; "please light a fire" scored 8 and started at once;
  happy (mood 0), "light a fire" scored 7 and started when the current
  activity ended, 21 s later.
- **Words with no rule:** THANK is not a word, and YOU alone matches
  nothing, so "thank you" does nothing. LOGON, PROGRAM, MATH and the rest
  of their group have no rule. One rule pairs the allergy words with the
  arithmetic words (activity 42).

## Needs, mood and illness

- **Food and water:** each need, 0–3 (`$0371`, `$036E`), rises when its
  timer runs out, every 20 ticks for food and 15 for water
  (`house_clock`). A rise from level 2 starts an illness (`$0B91`), except
  when no key has been pressed for ten 65,536-frame periods (`$2D` at 10 or
  more, about 3.6 hours), which is also when the screen blanks (`$0589`).
- **Illness** (`$0365`, 1–4): sprite multicolour 1 (`$D026`) turns green
  (5); it worsens a level every 12 ticks while `$0367` is set and ends once
  both needs are below 3 (`$392F`). Level 2 or more holds the mood at sad.
  The chooser sends him to bed (activity 30) at level 3 or more, or at
  night; it looks after the needs first.
- *Live:* with the illness level set to 3 he turned green at the next tick
  and, with food and water within reach, drank, ate and recovered. With the
  cupboard and the tank emptied as well, the level went 1, 2, 3 one house
  hour apart, and at 3 he went to bed, green (`reference/sick-in-bed.png`).
- **Mood** (`$035F`, 0 happy, 1 content, 2 sad) picks one of three sets of
  head images (`$0D65`: offsets 0, `$0F`, `$1E`). It moves along the cycle
  1, 0, 1, 2 every two days (`$0A6C`); CTRL P in the easy chair sets it to
  happy (`$2C39`). *Live:* the three faces, smile, straight mouth and
  frown (`reference/moods.png`).
- **Food** is four packets in the kitchen cupboard (`$30B4`, a bit each,
  drawn by `$3198`); he takes one to eat (activity 43, then 32) and puts
  delivered ones back (44). **Water** is the tank, 0–11 lines (`$2B51`).

## The house

- **Sixteen objects** with frames (`$96ED`, tables `$97EC`–`$A807`):
  front door, the fridge and freezer doors, the bathroom door, two
  closets, the mirror cabinet, the fire, the phone-table drawer, the
  nightstand and dresser drawers, the filing cabinet, the kitchen cupboard,
  the bookcase cupboard, and the petting arm and hand.
- **House state** (`$2B45`–`$2B53`): the stereo playing, petting phase, fire
  fuel, TV on, lamp colour, phone, alarm, water level, stove burner. The
  animated spots are drawn straight into the house picture: the turntable
  (row 5, columns 9–10, four frames at `$2D72`), the TV screen (rows 6–7,
  column 5, by `$2D59`/`$2D6B`), the fire (object 7), the stove flame
  (`$2CD9`), the alarm bell, the phone handset, the water level, the food
  packets, the dog bowl, the clock hands (`$0AAC`), the typewriter's paper
  (`$5756`) and the computer screen (`$59B6`).
- *Live:* in `play-02` the TV was on (`$2B4A` = 1) and its two cells were
  the only ones changing; with a record on (`$2B45` = `$FF`) the turntable
  cells animate and the SID plays; asked to light a fire, he walked to the
  fireplace, logs were in it at 50 s and burning at 80 s.
- **The phone** also rings by itself every 32–63 ticks (`$09EA`), as if
  CTRL C were pressed. **The alarm** rings at house hour 3 (`$0BB2`), and
  two ticks later, or at once after CTRL A, the morning list runs; at hour
  23 the evening list.

## Letters

- Activity 22 turns off a playing record, goes to the typewriter in the
  attic, builds the letter at `$7F40` (`$55C4`) and types it into the top
  band, a character every two or three passes (`$56E3`), with word wrap.
- The body is the thank-you ("Thank you for keeping me well stocked with
  food and water.") only when the cupboard (`$30B4`) and the tank
  (`$2B51`) are both non-zero; otherwise it is the complaint ("Please
  notice that my supplies are running low. I can't stay happy and healthy
  without your support."). The greeting is always "Dear Friend," and the
  signature "Your Friend": the name is never used. *Live:* with both
  emptied, the buffer at `$7F40` held the complaint
  (`reference/letter-complaint.png`).
- `letter_done` (`$54E2`) is set when a letter starts and cleared only when
  he takes a bite (`$5444`) or a drink (`$38C2`).
- The letter buffer is the record player's work area: the complaint, 158
  characters, overwrites the SID shadow registers at `$7FCD`–`$7FDE`, which
  is harmless because the stereo is stopped first.

## Sound

- **Two drivers.** The record player's (`$394E`–`$46BC`) is a byte-code
  interpreter on three voices, clocked by CIA1 timer A. The piano and
  effects driver (`$B000`, interpreter `$D000`) has two sets of three
  channels, set A winning a voice over set B, and is ticked by the raster
  interrupt when no record plays.
- **Tuning:** both drivers' note tables are exact for the NTSC clock
  (`$452F` starts with `$861E`, C7 = 2093.0 Hz at 1.0227 MHz), so on PAL
  all the music is about 0.65 semitone flat.
- **Records:** four tunes (`$3A03`, 4 × 3 voices), made of two pieces:
  tunes 0 and 3 are piece A, tune 1 is piece B, and tune 2 is piece A with
  every step turned upside down. Activity 119 picks one at random (`$AB0F`,
  into `$478C`). *Live* (tunes 0 and 2 forced at `$AB14`): tune 0's melody
  moves −1, +1, −5, +1, −3, −1, +1, +4 … and tune 2's +1, −1, +5, −1, +3,
  +1, −1, −4 …, the exact mirror, for every note recorded; in tune 2 the
  other two voices play the same inverted melody an octave above and an
  octave below, where tune 0 has an accompaniment and a bass. Notes are bytes: the low nibble is a step of −6 to +6
  semitones (13 a tie, 14 a rest, 15 a larger step in the next byte), and
  the high nibble the length.
- **The piano:** four pieces (`$8020`, `$838D`, `$85BA`, `$8730`), in the
  other driver's byte code. Activity 78 picks one at random (`$AB1A`) and
  installs it as sound 12; activity 79 plays it. *Live* (each piece forced
  at `$AB1F`, notes named with the NTSC clock): piece 0 is Mozart's Sonata
  in C, K. 545 (C5 E5 G5 B4 over the Alberti bass C4 G4 E4 G4); piece 2 is
  Für Elise (E5 D♯5 E5 D♯5 E5 B4 D5 C5 A4); piece 3 is the fugue in C minor
  from the Well-Tempered Clavier, BWV 847 (C5 B4 C5 G4 A♭4 C5 B4 C5 D5).
  Piece 1 is not identified.
- **Sound requests** (`$3476`, once a pass): 22 slots at `$3560`, the
  highest served first; sound numbers at `$35A8`.
- **Talking:** slot 18 (`$3572`), sound `$15`, raised by the mouth routine
  (`$24C8`) each time it picks the widest mouth. A call starts with a random
  "syllable" of noise through one of four band-pass filters, then a random
  phrase of gliding notes. A quarter of the phrases for one channel come
  from `$FF00`–`$FF4F`, uninitialised memory (`$B7FE` entries 96–99).
  *Live:* during a phone call the mouth routine ran 39 times and raised
  slot 18 24 times, and the SID sounded at 22 different pitches; during a
  greeting, when his mouth does not move, neither happened.
- **Footsteps** sound only on the tiled floors, the kitchen and the
  bathroom (`$34BC`); the attic is silent.
- **The eight "sound jobs"** of the record player's driver (`$4574`–
  `$4677`, dispatched by `$396E` for each bit of `$478D`) are never
  enabled: nothing that runs sets `$478D`. Several of them have wrong
  register writes.

## Hardware register census

From the code (`work/census.py`: every absolute-mode operand in
`$D000`–`$DFFF`, plus the indexed start-up copy). Registers reached through
an index are listed under the base the instruction names.

| Register | What the game does with it | Where |
|---|---|---|
| `$D000`–`$D02E`, all of the VIC | set from the 47-byte table `vic_init_values` (`$06E1`) at the cold start: border and background black, screen off | `$0487` |
| `$D000`–`$D010` sprite positions | written once a pass by the sprite update | `$11B6` (after `$1275`) |
| `$D015`, `$D01B`, `$D01C`, `$D027`+ | likewise; the text cursor borrows one sprite | `$11B6`; `$0836`, `$0865` |
| `$D025`, `$D026` sprite multicolours | clothes colour; `$D026` = `$0A` normally and 5 (green) while ill | `$B9BE`; `$04F5`; `$0B51`–`$0BA7` |
| `$D011` | screen on after start; blanked when no key has been pressed for about 3.6 hours; raster high bit cleared in the interrupt | `$04E6`, `$0589`, `$07F4` |
| `$D012` | the raster line `$28`, set once; `$07DB` and `$1277` only wait on it | `$049A` |
| `$D016` | multicolour off for the text band (`AND #$EF`), put back at a timed raster position | `$0759`, `$07E9` |
| `$D018`, `$DD00` | VIC bank 1, bitmap `$6000`, matrix `$5C00`, set once | `$04EB`; `$046F` |
| `$D019`, `$D01A` | raster interrupt enabled at start, acknowledged in the handler | `$0492`, `$0495`; `$07F1` |
| `$D020`–`$D024` | set to black by the start-up copy and never changed | `$0487` |
| colour RAM `$D800`+ | the TV screen, the objects' colours, the text band | `$2D6B`, `$96ED`, `$BAF3` |
| SID `$D400`–`$D414` | cleared at start; both music drivers and the effects | `$3726`; `$42DF`–`$43F2`; `$B34D` |
| SID `$D415`–`$D418` | filter and volume, from the presets at `$B6A1` | `$B474`–`$B486`; `$046C` |
| CIA1 `$DC00`–`$DC03` | keyboard and joysticks | `$059E`–`$060C` |
| CIA1 timers, `$DC0D`–`$DC0F` | the record player's clocks; interrupts off at start | `$4487`–`$44A5`, `$3FFD`–`$401D`; `$045B` |
| CIA2 `$DD0D`–`$DD0F` | interrupts and timers off, once at start | `$0450`–`$0469` |

## Text

- **Alphabet: plain ASCII,** mixed case. Strings end with `$FF` (the time
  prompt and the letter pieces), `$0D` is a new line, and the parser's
  words are upper case followed by `$00`.
- **One font** (`$5000`–`$52D7`, 91 glyphs, space to `z`), proportional:
  the first byte of a glyph holds its drop in the high nibble and its width
  in the low. `print_char` (`$BB08`) takes bit 7 of a character as a font
  number (the second base, `$5800`, points at code and no caller sets bit
  7) and draws the glyph with EOR.
- **Output is queued:** `queue_char` (`$BA50`) puts a character in the
  32-byte ring at `$0202`; `print_queued` (`$BA5E`), once a pass, prints
  one. RETURN scrolls the band a line smoothly (`$BCC0`); `$BAD4` puts the
  sky and roof back when the band closes, copying `$BDD0`–`$BECF` into the
  bitmap at `$62C0`.

## Live tests

All from `work/play-02.vsf` with the machine running at normal speed
unless warp is named. The game is deterministic from a snapshot: with no
input the same activities come at the same times, so a difference after
an input is the input's doing. The activity number is `$8D9B`, sampled
every quarter second, so an activity shorter than that can be missed.
After an interruption, the next activity he chooses for himself is the
same in every run (the same random state).

| Input | Activities, in order (seconds after the input) |
|---|---|
| none | 5; 40 at 18.8; 79 at 23.2 |
| "please type a letter to me" | 5; 46 at 0.5; 22 at 2.9; the letter is typed into the top band |
| "please light a fire" | 5; 46 at 0.5; 7 at 6.4; the fire burns by 80 s |
| "please play the piano" | 5; 121 at 0.3; 79 at 0.5; the piano plays |
| "hello" | 5; 46 at 0.5; 52 at 2.9; 5 at 6.7 |
| "please dance" | 5; 118 at 0.5; 120 at 4.9; 53 at 5.4 |
| "please put on a record" | 5; 121; 118 at 0.7; 120 at 4.9; the record plays |
| "please play poker" | 5; 46 at 0.5; 25 at 2.9 (his own choice); no game |
| CTRL F (cupboard full) | nothing but a moment of activity 0 |
| CTRL W, CTRL A | the same as no input |
| CTRL D, C, P, R, B | 16 at once, then 33, 25, 6, 50 and 51 respectively |

Other tests are described above, beside their facts: the house tick
(timing), the first activity, CTRL W's limit and CTRL F with the cupboard
not full (controls), manners (parser), illness and bed, the three faces
(needs), the TV and the turntable (house), the complaint letter (letters),
the piano pieces and the talking sound (sound). Unprompted, over nine
minutes from `play-02`, he spent 166 s at the piano (79), 116 s on the
phone (25), 107 s in the attic armchair (5), 49 s exercising (27), 46 s
switching the TV (16) and 29 s in 8; activity 0 lasted a moment each
time. He did not knock on the glass to ask for a
game.

## Open questions and oddities

- **A sentence that matches no rule** queues the previous request again,
  because the action list at `$C00B` is never cleared. *Live:* after
  "hello", each of "banana", "xyzzy" and "ok" added another greeting to the
  ring (scores 4 with a happy mood), but none was carried out within 20 s.
  What the chooser needs before it takes a request that scored 4–7 is not
  settled: "light a fire" at 7 was taken, "light a fire" at 4 when sad was
  not.
- **Eight activity numbers in one sentence** (two four-code rules) leave no
  terminator in `$C002`–`$C009`, so 17 entries go into the 16-entry ring.
- **Backspacing over a finished word** keeps its bits (`$C000` never moves
  back).
- **Request flags 1, 7 and 8** (activities 52, 29 and 74) have no setter
  anywhere in the image.
- **Unused and unreferenced code** is named `unused_*` in the listing:
  among it `hex_digits_unused` (`$198E`), the RTS stubs of the driver jump
  table, stages 5 and 6 of the main loop (`$2E6F`, `$2E71`: CLC and RTS),
  and the handlers `$BB02` (a JMP to itself) and `$BB18`.
- **The idle counter** `$2D` is 8-bit: after about 93 hours without a key
  it wraps, the screen comes back on and the protection against illness
  lapses (`$0589`, `$0B91`).
- **Slot 7 can block sounds:** its handler (`$36CB`) returns without
  clearing itself when no piece is playing, and then slots 0–6 (water,
  hang-up, phone ring) never play.
- **The fridge and freezer** frames share six colour cells, so drawing one
  door redraws part of the other; the kitchen cupboard's colour data
  starts three bytes late and overlaps the nightstand's.
- **"RAMS" at `$B1A4` and "ANGMAN" at `$B1C4`** are two note lists of the
  piano driver, filled before `sound_init` from stream pointers left over
  from BASIC's zero page, which point into the word list just before
  ANAGRAMS. This rests on a simulation of the driver, not a live test.
- **Why the crack has no guestbook, no disk data and a fixed name** is not
  known. The name "Billy Bob Binkle" and "Zeke" (the random number
  generator's starting state) are in the image, and nothing reads the name.
