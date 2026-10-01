# Doctor Who And The Mines Of Terror — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor allowed looking the game up online. On 30 September
  2026 this session's network refused every game site it tried (C64-Wiki
  over HTTP and HTTPS, Lemon64, GameBase64, MobyGames, Wikipedia, Games
  That Weren't, archive.org, bbcmicro.co.uk, the TARDIS wiki). What is
  below comes from web search result summaries of those pages, read the
  same day, and is weaker than reading the pages: treat each row as a
  lead, not a statement.
- Search summaries of Wikipedia, "Doctor Who and the Mines of Terror",
  and of the Games That Weren't entry (2022): released by Micro Power on
  the BBC Micro in 1985 and on the Amstrad CPC and C64 in 1986; a ZX
  Spectrum version was developed and not released. Wikipedia (read 30
  September 2026) also says it began as a sequel to the BBC Micro game
  Castle Quest and became a Doctor Who game mid-development, and that the
  BBC version came with its own ROM chip. The Games That
  Weren't page itself (read 30 September 2026) is about the Spectrum
  version; it opens with its author's own story that he had thought the
  C64 version unreleased, after a Commodore Force feature on unreleased
  games included it by mistake, until he found an original copy.
- Search summaries of the Wikipedia and GiantBomb pages: the Sixth Doctor
  and Splinx, a programmable robot cat; the Master is mining heatonite to
  build a TIRU; the Doctor recovers the plans and escapes. The Doctor can
  jump, climb ladders, press buttons, and throw or use items, and carries
  four items in his pockets. Deaths: monster attack, robot attack, too
  great a fall, forced regeneration, lack of oxygen, spikes.
- Search summaries of stardot.org.uk forum threads (BBC Micro version):
  the Master tries to take the TIRU crystal at the end, and getting it
  past him with Splinx's help earns a 4096 escape bonus; oxygen lets the
  Doctor go outside; cloth disables controllers that run over it.
- Reception, read 30 September 2026: GameBase64's Game of the Week page
  reproduces Zzap!64's review (April 1986, 86 %); Wikipedia adds the
  Castle Quest likeness; The Register (2013) gives the £14.95 price and
  the ROM chip, and says the development cost "did for Micro Power".
  Reviews of other versions (ASM's 4/10, of a version Wikipedia does not
  name; Amtix's 48 % for the Amstrad CPC) are left off the page: the
  contributor asked for C64 reviews only. Lemon64 and MobyGames refused the request.
- Key lists found by search (Z, X, `:`, `/`, RETURN, U, P, I, C, E, H, F0)
  are for the BBC Micro version and do not match the C64's reader at
  `$8F3C`; the C64 keys below are read from that code.
- The game's own screens: the Splinx Programmer screen (`reference/splinx-programmer.png`).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in control port 2: left, right, up, down, fire | confirmed (left, right, fire live) | `$8F3C` |
| Keys Z left, X right, `;` up, `/` down, RETURN jump | traced | `$8FD5`-`$9013` |
| F1 moves the pocket selector | live | `$A530` |
| F3 puts an item in a pocket or drops a marker, or takes one out | confirmed (MARKER 4 shown live) | `$A575`, `$A60C` |
| F5 picks up the object in front, or uses the held item | traced | `$A929`, `$BACC` |
| F7 with a direction throws the held item | traced | `$A7D7` |
| S opens the Splinx Programmer | live | `$AF58` |
| A scrolling cavern map | live | `$8C32`, map `$E000` |
| Ladders to climb | live (seen); climbing traced | `$9D15` |
| Four pockets for items | traced | `$3E`-`$41` |
| Score, six digits | live (000000) | `$A50D` |
| Figures beside the score are lives | live (five at the start, four after a death) | `$94AC` |
| Splinx follows the Doctor | live | `$B3EF` |
| Splinx programmer: modes, ten-step program, commands | confirmed (cursor live) | `$AF58`-`$B16C`, `$B1A0` |
| Splinx battery drains and is recharged | traced | `$B1EA`, command 9 |
| Markers 1-4 placed in the mines for Splinx | confirmed | `$A575`, `$42`-`$45` |
| Pick up, use, throw and drop items | traced | `$A929`, `$BACC`, `$A6CB` |
| Push buttons | traced: the code lock's three buttons | `$BE29` |
| Robots and monsters that kill | traced: controllers (shock), madrag (bite), baby madrag | `$CE5A`, `$B96F`, `$B902` |
| Death by falling too far | traced: a drop of `$60` or more | `$CD62` |
| Death on stalagmites | live | `$CA67` |
| Oxygen needed outside | traced; live: no drain in the start cavern | `$CA90` |
| Spikes | open: the only terrain deaths found are stalagmite tiles `$74`/`$51`; every `$E8` writer was read | |
| Forced regeneration | live (key R) | `$9051` |
| Explosions | traced | `$C09A`-`$C260` |
| Heatonite mining, TIRU, recovering the plans | traced: the end bonus asks whether production was halted and whether the CAPSULE (TIRU plans) was brought back | `$9102`-`$920F`, `$B9B6` |
| The Master takes the TIRU crystal at the end; escape bonus 4096 | traced: object `$0C` goes after the CRYSTAL, from the Doctor or a pocket; the end bonus is 1024, doubled for the CRYSTAL and doubled for Splinx, 4096 with both, as the forum said. That `$0C` is the Master is not shown by the code | `$B48A`, `$9163`, `$928C` |
| Escape by TARDIS or escape pod, Time Lords' rating | traced | `$9102` |
| Save to cassette or disc | traced; the game ends after saving | `$94FF` |
| Load saved games | traced: start-up restores a saved block in `$7800`; nothing in the program loads it | `$49C6` |
| Music, five tunes by area | confirmed (live: music plays) | `$74EA` |

## Beyond the documentation

- The status bar's font lives in the unused rows of its own screen.
- A code lock whose six-press sequence is dealt from a shuffled deck.
- The madrag guards two eggs and carries a moved egg back to its nest.
- Seven zones that each swap in their own character shapes.
- A countdown worth up to 10,800 points at the end that only ticks once every 21.8 minutes.
- Several tests that want an exact value: the carrier boards only at Y `$0450`, the lift only at a height difference of 8.

## Open questions

See `facts.md`, Open questions.
