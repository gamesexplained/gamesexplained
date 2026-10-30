# The Armageddon Man — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- One image, `$0800`-`$FFFF`, streamed in whole by Martech's fast loader
  and entered at `game_start` (`$4E96`); nothing loads after it.
- The C64 version keeps the ZX Spectrum's screen: the game draws in a
  32 by 24 cell area (256 by 192 pixels) that starts at screen column 4,
  row 1 (`screen_rows` `$4FD3`, `bitmap_rows`), and `unused_sprite_at`
  (`$51C9`) still takes positions "in the Spectrum's coordinates" and adds
  the C64's border offsets. The manual credits the Spectrum program to
  J Wilson, D Martin, B Notarianni and R France and names nobody for the C64.
- Left in the image from development: a KERNAL loader at `$1000`
  (`dev_loader`) that loads the files `TITCOL`, `TITLES`, `SWMA` and
  `PAIN`, shows the title picture and copies `SWMA` to `$E000`; the title
  picture itself (`$2000` bitmap, `$0C00` colours); and RAM fill patterns
  in `window_records` (`$8C67`) and after the last text (`$CDD7`-`$CFFF`).
  `game_start` writes its state copy over `$1000`-`$1320` before anything
  could call the loader.

## Memory layout

| Thing | Where |
|---|---|
| Title picture, never shown: colours, bitmap | `$0C00`-`$0FE7`, `$2000`-`$3F3F` |
| Developer's loader, then the RAMSAVE copy of the state | `$1000`-`$1320` |
| Window save area (what open windows cover) | from `$2000` up (`window_init`) |
| Music driver, four tunes, 17 sound effects, alarm | `$4000`-`$4DCE` |
| Start-up, script command table, library | `$4E96`-`$54FF` (`script_commands` `$4EB3`) |
| Texts: events, intercepts, Big Bird, relations, ratings | `$5502`-`$5B33` |
| Game state RAMSAVE copies (801 bytes) | `$5B50`-`$5E70` |
| Relationship table, 16 by 16 | `$5C5C` |
| Satellites, 9 records of 8 bytes | `$5D5C` |
| Country records, 16 of 12 bytes | `$5DA4` |
| Windows, interrupt, start-up | `$5E71`-`$63CB` |
| Pictures 0 to 10 | `$63CC`-`$70BF`, table `pictures` `$8C51` |
| Radio, controls, main loop, icons, reports, letters | `$70C0`-`$8832` |
| Font, 96 proportional characters | `$8833`-`$8B32` |
| Event levels, intercept and Big Bird levels | `$9124`, `$91A4`, `$958C` |
| Mail, letter, follow-up and event scripts | `$9C24`-`$A4D5` |
| Event and message texts | `$A4DC`-`$A9AC` |
| Country start values, 6 bytes each | `$A9AD` |
| Script engine and its commands | `$AD15`-`$BDFF` |
| Satellites, war, war report | `$BE64`-`$CDD6` |
| Main screen picture | `$E000`-`$FF3F`, colour cells at `$DC00` |
| Sprites (the cursor's two) | `$DA00`-`$DBFF`, pointers `$DFF8` |

## Timing

- The raster interrupt (`irq`, `$624C`) runs once a frame on line `$EB`;
  its sound part skips one call in ten (`sound_skip`), so `mus_play`
  runs 45 times a second on a PAL machine. *Live*: 100 interrupts in
  100 frames.
- The main loop (`new_game_loop`, from `$7CD3`) makes one pass a frame on
  the main screen, and each pass calls `game_clock` (`$7DD1`). *Live*:
  100 passes and 100 interrupts in 100 frames from `work/am-main1.vsf`.
- `game_clock` counts 192 passes to a tick (`clock_count` `$5B54`), so a
  tick is 192 frames, 3.8 seconds on a PAL machine, when no window is
  open. Every tick runs `country_events`; ticks 0, 4, 8... of the hour
  count (`$5B55`) also try a radio intercept, ticks 1, 5, 9... a Big Bird
  report, and every eighth tick ends the week (`week_end`). A week is
  1,536 frames of the main screen, about 31 seconds, and a year of 52
  weeks about 27 minutes.
- The clock stops while any window waits for the player: the loop that
  calls it is not running. *Live*: 136 passes in 400 frames, the rest
  spent with a memo open.

## Controls

- `options_panel` (`$7D0B`): F1 the keyboard (A up, Z down, N left,
  M right, SPACE fire, `read_keys`), F3 a joystick in port 2
  (`read_joystick`). The choice rewrites the call in `read_controls`.
- RESTORE does nothing: the NMI handler is a lone `rti` (`nmi`, `$62CB`).

## Graphics

- Bitmap mode in video bank 3: bitmap `$E000`, colour cells `$DC00`,
  under the I/O area. The game keeps all RAM switched in (`$01` = `$14`)
  and switches the I/O area in only around each access to a chip
  (`io_in`, `io_out`).
- The cursor is two sprites, white over black, built by `make_sprite`
  from four 16-row shapes (`sprite_sources`); the second shape is shown
  while a satellite is carried.
- Windows save the bitmap and colours they cover (`window_save`) and put
  them back on closing (`window_restore`); up to eight are stacked.
- Text is drawn into the bitmap from a proportional font (`font`,
  `$8833`): seven rows of pixels and a width byte for each character.
- Satellites are 2 by 2 pixel dots flipped into the map's bitmap
  (`satellite_draw`); missiles and laser lines are single dots flipped the
  same way.

## Mechanics

- **Countries.** 16 records at `$5DA4`, 12 bytes: map box (0 to 3),
  natural resources (4) and technology (5), each 0 to 15 and shown
  times 10 as a percentage, missiles MX1 to MX3 (6 to 8), confidence in
  the Commander (9, 128 at the start), hits that destroy it (10) and
  hits taken (11, `$FF` once destroyed). Start values come from
  `countries_table` at `$A9AD`.
- **Relationships.** A 16 by 16 table of hostility at `$5C5C`, 0 the
  friendliest. `relations_init` fills it at the start of a game: each
  country's hostility to each other is its own event 20 level plus or
  minus a random 0 to 15, as a byte that is free to wrap. Then the week's
  end that opens every game (`$BAA1`, from `$7CCD`) raises every byte by
  one, and so does every later week's end (`relations_all_up`, stopping at
  `$FF`); a country with no event to start goes up by one towards everyone
  (`relations_row_up`). Script commands lower it, never below 0
  (`hostility_sub`).
- **Libya's start.** Libya's event 20 level is 0, so each of its starting
  hostilities is 0 to 15 or wraps round to 241 to 255, the second by a
  chance of 15 in 32. After the first week's end, 254 or 255 (a start of
  253 to 255, 3 in 32 for each country) is within one of Libya's level for
  the Total Missile Attack, 255, and Libya's ladder has no level between
  234 and 255, so a hostility from 242 up climbs a step a week to it. In
  500 games of random numbers run through `relations_init` in the kit's
  6502, Libya started at 241 or more to 7.0 countries a game. *Live*: the
  snapshot of a fresh game's first communique, `work/week1-menu.vsf`, has
  Libya at 255 to Israel. In a game left to start on its own, with every
  window closed by fire, Libya began at 255 to Israel and to Pakistan and
  253 to the Central American Alliance, and the first event, 252 frames
  in, was Libya's Total Missile Attack on Israel
  (`reference/libya-missile-attack.png`).
- **Events.** Each tick `country_events` (`$AE77`) picks a random country
  A and looks, from a random country on, for a B such that one of A's 32
  event levels (`event_levels` `$958C`) is within one of A's hostility to
  B, and runs the first such event. Event 0 is the Total Missile Attack
  (level `$FF`) and 31 the Mutual Defence Pact. The difference is a signed
  byte, so a hostility of 0 matches the level `$FF`: two countries at the
  friendliest possible relationship start a Total Missile Attack. *Live*:
  with China's hostility to Israel poked to 0, the next tick showed
  "China has launched a Total Missile Attack on Israel"; at 1 or 2 the
  same tick ran event 21 against Pakistan.
- **Replies.** After an event the target answers through its own levels
  (`country_reply`), until no level fits (`exchange_on`).
- **Demands.** Before an event other than 0 and 1, a country at least as
  strong as its target in missile power may first demand 10 units of food
  (natural resources) or technology, likelier the closer the two are
  (`demand`, `demand_check`). Yes moves one unit
  and cancels the event, No lets it happen, Ignore makes both countries
  as hostile as the next harsher event and runs that one instead.
- **Answers.** Most events open a memo with Neutral, Support, Criticise
  and Ask for Talks; each answer is a script that changes confidence and
  hostility and may post mail. For events 15 to 18 (an assassinated
  diplomat, a mobbed embassy, a car bomb, aid to a fanatical opposition)
  Neutral ends the game half the time: a random byte below 128 recalls
  the Commander "for incompetence" (`ev15_18_1`). *Live*: China's aid to
  the opposition in Israel, answered Neutral, ended the game in week 1.
- **Mail.** Scripts post mail into four weekly slots (`mail_slots`
  `$5B58`, 20 entries each); the IN tray shows the newest of this week's
  first (`in_tray_next`). Mail still unread at the week's end runs its
  follow-up script instead (`mail_unread`, `followup_scripts` `$9E5F`).
  Mail 9 and mail 16 have scripts that nothing posts.
- **Letters.** The OUT tray's eight letters each run a script
  (`letter_scripts` `$9ECD`); most roll a random byte against the
  country's confidence in you, and a country with the U.N.N. Force on its
  soil complies whatever the roll.
- **The U.N.N. Force.** One force, starting in a random country
  (`force_init`); re-directing it takes up to three weeks
  (`force_weeks`). Where it is stationed, letters are obeyed, and a Total
  Missile Attack from or on that country is stopped with a request to
  remove or send the force (`force_check`).
- **War.** Script command `$1B` (`script_exchange`): A fires as many
  missiles as B can still take, MX1 first, and B fires back as many as A
  can take, from its own stock. Each landing is one hit, whatever its
  type; the hit that brings a country to its limit destroys it
  (`war_damage`). Each frame a missile flies, every SDI satellite in orbit
  catches it by a 1 in 4 chance if the missile is under it (`sdi_check`,
  called from `missile_fly`). Three launchers
  on each side launch whenever their type's count is not 0, and the
  count falls only when a missile lands (`missile_done`), so the last
  missiles of each type can fly twice or three times. *Live*: China at
  hostility 0 to Israel fired 16, Israel's whole stock of 85 came back,
  and 108 missiles landed: China took 90 hits and Israel 18.
- **Radiation.** `$5B53`, 0 to 255: every hit except the one that
  destroys a country raises it by one by a 1 in 4 chance
  (`radiation_up`). At 255 the week's end shows "All life on Earth has
  been extinguished by massive radiation. ARMAGEDDON...." and the game
  starts again. *Live*: radiation poked to 255, the week's end showed it.
- **The communique.** Every week (`week_end`): a rating from the sum of
  the 16 confidences divided by 512, Disastrous (0) to Excellent (7), and
  the radiation divided by 32 as a word, "Background." at 0. *Live*:
  every confidence poked to 255 gave "rated as Excellent".
- **Endings.** `game_over_texts` (`$B428`): recalled for lack of
  confidence (agreeing to a "replace the commander" mail), Armageddon,
  the end of the year, recalled for incompetence. After week 52
  `year_over` shows a rating of (16 less the countries destroyed)
  × 25 / 4: 100 with none destroyed. *Live*: week poked to 51, the
  week's end showed "Your year as Supreme Commander is over. Your rating
  is 100", then a new game.
- **Satellites.** Six SDI satellites and three Big Birds (`$5D5C`),
  placed from the satellite panel anywhere on the map. A satellite covers
  a country when its x lies from the box's x less 4 (the reach, 5, less
  one) to the box's x plus its width plus 4, and its y the same way
  (`in_cover`, worked on bytes with carries; the upper limit does not
  depend on the reach). The eye
  lists the cover (`cover_report`), and says "No Foot prints!" when no
  Big Bird covers anything, whatever the SDI satellites cover. Every
  fourth tick a Big Bird report is tried (`bigbird_report`): a message
  picked by `bigbird_levels`, shown only for a country under a Big Bird,
  or an opinion of one country about another.
- **Radio.** Six bands (`band_bottoms`, `band_tops`), each country on one
  (`country_bands`). An intercept is tried every fourth tick from a
  country on the radio's band (`radio_intercept`), picked by
  `intercept_levels`. The message is scrambled by eight filters: each
  filter set to the country's key (`scramble_keys`) lets about another
  eighth of the characters through (`scramble_char`). The intercept
  levels of Japan and the Eastern Block are read from the code of
  `relations_row`, past the end of the table.
- **RAMSAVE.** Copies the 801 bytes of state at `$5B50` to `$1000`;
  RAMLOAD copies them back. Where the tape and disk versions would save,
  the C64 version calls `do_nothing`.

## Data tables

| Table | Where | What |
|---|---|---|
| `countries_table` | `$A9AD` | each country's natural resources, technology, MX1, MX2, MX3 and the hits that destroy it |
| `event_levels` | `$958C` | 32 hostility levels a country, one for each event, 0 for an event it never starts |
| `bigbird_levels` | `$9124` | eight levels, the same for every country: 200, 190, 100, 220, 210, 70, 140, 230 |
| `intercept_levels` | `$91A4` | eight levels a country, 14 countries' rows |
| `event_scripts`, `event_texts` | `$9F79`, `$55B8` | 35 events: 32 between countries, the force's two messages and talks |
| `mail_scripts`, `mail_texts` | `$9C24`, `$9C46` | 17 kinds of mail, 16 texts |
| `followup_scripts` | `$9E5F` | 22 follow-ups |
| `letter_scripts`, `letter_texts` | `$9ECD`, `$9C66` | eight letters |
| `script_commands` | `$4EB3` | the 77 commands of the script engine |
| `band_bottoms`, `band_tops` | `$7666`, `$7674` | 1800, 3500, 7000, 14000, 21000, 28500 to 3499, 6999, 13999, 20999, 25000, 50000 kHz |
| `scramble_keys` | `$7C41` | each country's filter setting, and `$00` for the scan off |

Start values (`countries_table`): natural resources, technology, MX1,
MX2, MX3, hits to destroy.

| Country | Res | Tech | MX1 | MX2 | MX3 | Hits |
|---|---|---|---|---|---|---|
| Canada | 15 | 13 | 0 | 0 | 50 | 192 |
| U.S.A | 15 | 15 | 100 | 110 | 90 | 224 |
| Central American Alliance | 9 | 7 | 0 | 0 | 30 | 64 |
| European Unite | 9 | 15 | 20 | 100 | 160 | 144 |
| Libya | 6 | 8 | 0 | 20 | 30 | 80 |
| Argentina | 9 | 8 | 0 | 20 | 30 | 128 |
| Black African Republic | 5 | 5 | 0 | 0 | 70 | 208 |
| South Africa | 12 | 8 | 5 | 50 | 80 | 96 |
| Israel | 12 | 10 | 5 | 50 | 30 | 16 |
| Islamic Alliance | 8 | 5 | 0 | 30 | 140 | 160 |
| Pakistan | 7 | 8 | 0 | 10 | 20 | 48 |
| India | 6 | 8 | 0 | 20 | 20 | 112 |
| Australia | 15 | 10 | 0 | 50 | 10 | 176 |
| China | 13 | 15 | 50 | 100 | 110 | 240 |
| Japan | 10 | 14 | 0 | 30 | 20 | 32 |
| Eastern Block | 9 | 11 | 100 | 150 | 60 | 254 |

## Sound

- One music driver (`mus_play`, `$4159`) on all three voices, with
  patterns, arpeggio tables, vibrato, slides and drums, and four tunes
  (`tune_table` `$46E3`): tune 0 at speed 6 is the only one started,
  by `options_panel`, and plays on through the game; tunes 1 and 2 (speed 8)
  and 3 (speed 5) are short pieces nothing starts.
- A sound effect player with 17 effects on voices 1 and 3 (`sfx_start`,
  `sfx_table` `$4B17`) and an alarm on voice 2 (`alarm_start`): no
  instruction calls either, and no pointer holds their addresses, so the
  game plays no sound effects.
- The pattern command `$86` (glide down) loads the wrong register and
  turns the note into a drum as well; no tune uses it.

## The listing's error rate

One sample, seed 20261030, of 80 comments drawn from the listing's
1,529 in two strata: 60 from the 1,083 written one by one, and 20 from
the 446 a script wrote from each record's bytes (the event, mail and
letter scripts, the texts, the rows of the two big pictures). One
checker on claude-opus-5-5 marked them with
`kit/skills/core/60-verify/checker.md`, and every verdict other than
right was read against the code. 13 of 80 were wrong, 16.3 % (95 %
interval 9.7 % to 25.8 %), over the mark and a lower bound on the true
rate; weighted by the strata's sizes, 16.7 %. Of the 60 written one by
one, 8 were wrong (13.3 %): an operand byte taken for a loop (`$7249`);
slides placed on the wrong notes (`$48F8`); a sound effect's restarts
counted from its record when its steps run out first (`$4C65`); a reader
left out (`$4FA0`); a loop with no wait said to run once a frame
(`$52FB`); a cover count that is only ever 0 or 1, a search that gives up
where it was said to go on, and a variable said to be set only by the
last message (`$AF99`); a garbled sentence on where the saved state
starts (`$5B51`); and a guess at what the original did where this version
does nothing (`$5438`). Of the 20 a script wrote, 5 were wrong, all one
template: each answer table named the switch command that reads it as
its menu (`$9C7F`, `$9D03`, `$9D3F`, `$A1B5`, `$A21B`). All 13 were
corrected, with the comments that said the same: all 44 answer tables,
the restarts of the ten other sound effects whose steps run out first
(each effect run on the kit's 6502), the cover counts of `bigbird_cover`,
`sdi_cover` and `satellite_census`, and the window size at `$8445`. The
checker also noted that `$01` is `$14` in play, which `orientation.md`
and this file had as `$15`; both were corrected.

## Live tests

All from `work/am-main1.vsf` (week 1, the main screen, joystick chosen)
unless named, in VICE 3.10 (the vice-mcp release v3.14.0) with the kit's client.

- The load: screenshots through the fast load show a blank screen with
  stripes in the border; no instruction left in memory but the
  developer's loader at `$1000` writes `$D018`, and at the hand-over the
  video chip is in text mode with `$D018` = `$14`. The title picture is
  never shown.
- Clock: non-stopping checkpoints on `irq`, the main loop, `game_clock`
  and `country_events` for 100 and 400 frames (Timing, above).
- Hostility 0: `$5D34` (China's hostility to Israel) poked to 0, 1 and
  2; checkpoint on `run_event` (`$B161`) read event 0, 21 and 21.
- The war that follows, with fire pressed through the memos: checkpoints
  on `war_damage`, `missile_done` and `radiation_up` counted 108, 108
  and 107; records read before and after.
- Year end: `$5B51` = 51, `$5B54` = 191, `$5B55` = 7.
- Armageddon: `$5B53` = 255 with the same clock pokes.
- Rating: every byte 9 of the country records poked to 255.
- Recalled for incompetence: `$5D34` = 117, China's level for event 18;
  Neutral chosen.
