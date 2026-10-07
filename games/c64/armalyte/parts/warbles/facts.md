# Walker's Warbles — verified technical facts

The third entry of side 1's menu, "3 Walker's Warbles"
(`reference/disk-menu.png`), and not part of the game: a music demo of
Martin Walker's, dated 1988 on its own screen. Addresses are this part's,
in `listing.json`. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, the hand-over stopped at the program's first
instruction (`$1825`).

## How it is reached

- From the menu, pressing `3`. The program arrives on its own, over the
  machine the menu left: nothing of the game is in memory when it runs,
  so this part is an address space of its own, not a load over the
  engine (`kit/scripts/parts.py`).
- It is not one of the three files the disk's directory can open.
  `c1541 -extract` on side 1 writes `boot!`, `cyberdos` and `armalyte`
  and nothing else, though the directory also lists an entry named `.`
  and one named `.blocks free.`, both with a block count of 65535. The
  menu's own loader (`cyberdos`, `$0326-$0600`) brings the other two
  entries in. Which tracks hold this one was not traced.
- What loads is packed, from `$0801`, with a BASIC stub of `SYS 2066`.
  The unpacker at `$0812` copies itself to `$00FB-$01A0` and
  `$0334-$03D9`, jumps to `$0100` and unpacks backwards with the ROMs
  out (`$01` = `$30`). A second stage ends `PLA, STA $01, PLA, RTI`,
  which restores `$01` = `$37` and enters the program at `$1825`.
- *Live*: from a hard reset and the disk autostarted, 30 seconds of
  emulated time to the menu, `3`, and a checkpoint at `$1825` stopped
  the machine there; that is `work/entry.vsf`
  (`orientation.md`, "The parts"). Run from the loaded bytes at `$0812`
  in the kit's simulator (`kit/c64/cpu6502.js`), the unpacker produced
  the same 64 KB as the emulator but for ten bytes: `$0000`, the stack
  the unpacker left (`$01F8-$01FB`, `$01FD`), two screen cells the
  gauge writes (`$0603`, `$0604`), and the gauge's own two bytes
  (`$18AE`, `$18B8`).

## What it does

- The screen is text, 40 by 25, at `$0400` with the character ROM's
  lower-case set (`$D018` = `$17`, video bank 0, so the VIC sees the ROM
  at `$1800`). It carries the title "MARTIN WALKER", "music demo disk
  V2.0 (c) MW 1988", the four keys' legend, "Press RUN/STOP to fade
  music", and three lines claiming that a typical piece of music lasting
  several minutes occupies 2.5k and takes 26 scan lines of interrupt
  time.
- The program writes none of that, and none of the video registers.
  Both arrive in the loaded image: the screen as bytes at `$0400`, and
  47 bytes copied into `$D000-$D02E` by the last stage of the unpacker,
  which runs in the same pages the screen then occupies. Among them
  `$D01A` = `$F1`, which turns the raster interrupt on, and `$D012` =
  `$5D`, its line.
- `$1825` greys the four digits, silences the SID (`$192B`), sets
  `$0291` so that Commodore and Shift cannot switch the character set,
  and falls into the main loop.
- The main loop (`$2000`) is colour bars and nothing else. It waits for
  raster line 15, then on every line to line 91 writes the next of 32
  colours (`$2050`) to the background, and from line 172 to line 254 the
  next of eight (`$20D0`). Each table's index moves on by one a frame as
  well, so the bands crawl upwards. Below and above the bars the
  background is dark grey (`$0B`).
- Everything else is in the raster interrupt (`$1831`), reached through
  the KERNAL's own handler (`$0314` = `$1831`) and ending in the
  KERNAL's exit (`$EA7B`). It acknowledges the raster, reads `$D012`
  before and after playing the music, and leaves the difference in
  `$18AE`.
- The gauge (`$1852`) draws `$18AE` as a bar five cells tall at the
  right of the screen, eight raster lines to a cell, filled from the
  bottom with reverse spaces and topped with one of the eight
  part-blocks at `$18B0`. Each cell is written to two screen bytes, so
  the bar is two columns wide; a full bar would be 40 lines.
- The keys (`$18BD`) are read from the KERNAL's `$C5`, with the five
  codes at `$195E`: 1 (`$38`), 2 (`$3B`), 3 (`$08`), 4 (`$0B`) and
  RUN/STOP (`$3F`). A key acts once until it is let go (`$195D`). The
  four digits start a tune (`$1963`: 10, 3, 0 and 1) and turn their own
  three colour cells yellow (`$1967`, from `$D995`); RUN/STOP starts the
  fade, and while the fade runs no key is read.
- The fade (`$1914`) is the program's, not the driver's: the volume
  drops by one every five frames from 15, and at 0 everything is
  silenced. It writes `$D418` over whatever the driver set.

## The music driver

- The same driver as Armalyte's (`parts/engine`, `music_play`,
  `$C059`), two years earlier and smaller. Set side by side instruction
  for instruction, the two differ only in the addresses they use except
  where this file says otherwise.
- `$1000` starts a tune: the eight-byte header from `$30C0` + 8 × tune
  to `$144C`, the three voices silenced, each voice's first track entry
  read, the volume to `$1F` and the music on (`$104C` = `$FF`). The
  volume's bit 4 selects the low pass, which does nothing: `$D417` is
  set to 0 and no voice is ever routed to the filter.
- `$104D` plays one frame, voices 2 down to 0. Unlike Armalyte's, it has
  no fade of its own, and it is not called at all until a key is
  pressed: nothing starts a tune at boot.
- A track (`$13F9`) is only repeat counts and pattern numbers: a byte
  below `$80` is a count for the pattern number after it, and a byte of
  `$80` up is the pattern, where `$FF` starts the track again and
  anything else stops the music. Armalyte's track language adds loops
  (bit 6) and a fade command (`$FD`).
- A note is a head byte (length in beats less one in bits 0-5, bit 6 a
  rest, bit 7 an extra byte), the extra byte when there is one (an
  instrument below `$80`, a slide above it), and the note byte. `$FF`
  ends a pattern.
- The note byte's bit 7 ties the note to the one after it, where
  Armalyte's ties it to the one before. The driver reads each voice's
  stored note byte (`$149F`) before overwriting it, so a note sets its
  instrument up and attacks only when the note before it was not tied
  (`$10FE`); and a note that is not tied itself has its gate mask
  dropped to `$FE` on its last beat (`$1063`), which is where the
  release comes from. Armalyte's driver instead writes the gate off and
  on again inside the frame a note starts.
- A new instrument does not force a note to attack. Armalyte's driver
  compares the note's instrument with the voice's and makes a change
  attack (`$C130`); there is no such test here.
- Two three-byte variables are written and never read: `$14B1`, cleared
  for each voice when a tune starts (`$1019`), and `$14B4`, cleared when
  a note starts (`$1186`). Armalyte's driver has neither.
- Effects, every frame but the one a note starts (`$118F`): the pulse
  sweep between the instrument's two limits, vibrato after a delay of up
  to 75 frames, a slide from the note's extra byte, and the effect flags
  at +3 of the instrument. `$01` alternates two waveforms frame about,
  `$02` a two-note arpeggio, `$04` drops the gate after the first beat
  and falls in pitch, `$10` and `$20` hold an attack waveform and an
  attack note for the instrument's attack frames.
- No instrument of the demo's that holds data matches any of Armalyte's
  21, byte for byte. Its seven empty ones match Armalyte's instrument 0,
  which is empty too. The frequency table (`$3140`, 96 notes), the
  vibrato lengths and shifts (`$1424`, `$1434`) and the eight vibrato
  delays (`$1444`) are the same 232 bytes in both.
- No instrument here arpeggiates relative to the note: the arpeggio byte
  at +5 of the second entry (`$3305`) has bit 7 clear in all 32, where
  Armalyte uses the relative form in six of its 21. Three instructions
  of the driver (`$1322-$1325`) are the path that bit takes, and the
  demo's own data never reaches them.

## The editor's memory

Laid out as a fixed array, which is how the music editor that made the
disk kept it. Nothing in the program writes any of it.

| Range | What |
|---|---|
| `$2FC0-$303F` | low bytes of 128 pattern addresses: `$4000`, `$4080`, … `$7F80` |
| `$3040-$30BF` | their high bytes |
| `$30C0-$313F` | 16 tune headers of 8 bytes: three track addresses (low, then high) and two tempo counts |
| `$3140-$31FF` | the 96 notes' frequencies, low bytes then high |
| `$3200-$32FF` | 32 instruments, first 8 bytes each |
| `$3300-$33FF` | the same instruments, second 8 bytes each |
| `$3400-$3FFF` | 48 track slots of 64 bytes: `$3400` + 192 per tune + 64 per voice |
| `$4000-$7FFF` | 128 pattern slots of 128 bytes; `$6B00` up is empty |

- Forty-six of the forty-eight track addresses in the headers are the
  slot the array would give them, and the two that are not follow from
  one track that outgrew its slot. Tune 3's second voice fills its 64
  bytes with 32 entries and no `$FF`, so it runs on into the slot after
  it, `$36C0`, and ends there. That slot is tune 3's own third voice, so
  its third voice is pointed at `$3780` instead, which is tune 4's third
  slot; and tune 4's second voice is pointed at `$36C0`, the tail of
  tune 3's second. Tune 4's own first and second slots are empty.
- Eight of the sixteen headers have music: 0, 1, 2, 3, 4, 6, 10 and 13.
  The other eight point at slots of zeros, which the track reader takes
  as pattern 0 with a repeat count of 0, meaning 256 plays.
- 84 of the 128 pattern slots hold a pattern, and a track names 81 of
  them. Patterns 1, 7 and 8 hold notes no track reaches, and slots 45
  and 78 are empty between full ones.
- Instruments 6 to 10 and 12 to 31 hold data; 0 to 5 and 11 are all
  zeros. A pattern names 5 to 10 and 12 to 30, so instrument 31 is never
  played and instrument 5 is: patterns 1 and 74 ask for it, and with
  every byte zero its waveform is 0, which makes no sound.

## The tunes

A beat is two frames at the tempo counts 1 and 1, and the second count
lengthens the odd beat: 1 and 4 give four beats in ten frames (2, 2, 3,
3), 1 and 8 five beats in eleven (2, 2, 2, 2, 3). Lengths below are the
frames in which the whole driver state repeats, measured by running the
port (`tests/warbles.js`) and hashing its variables and registers each
frame.

| Tune | Key | Tempo | Patterns | Repeats after |
|---|---|---|---|---|
| 0 | 3 | 1, 1 | 16 | 8,544 frames, 2:50.5 |
| 1 | 4 | 1, 1 | 18 | 3,840 frames, 1:16.6 |
| 2 | none | 1, 1 | 3 | 192 frames, 3.8 s |
| 3 | 2 | 1, 4 | 17 | 15,360 frames, 5:06.4; voices 2 and 3 repeat at 7,680 |
| 4 | none | 1, 4 | 8, and pattern 0 | voices 2 and 3 at 1,440 and 7,680 frames; voice 1 not within 300,000 |
| 6 | none | 1, 8 | 4 | 648 frames, 12.9 s |
| 10 | 1 | 1, 8 | 24 | 6,480 frames, 2:09.3 |
| 13 | none | 1, 8 | 8, and pattern 0 | not within 300,000 frames |

- Tune 4 is tune 3 with the lead taken out. Its third voice plays the
  same track as tune 3's third; its second is the six runs of twelve,
  over patterns 46 to 49, that end tune 3's second; and its first is a
  slot of zeros, so pattern 0 plays under it instead of a melody.
- Tune 13's track begins with sixteen entries of zeros, 4,096 plays of
  pattern 0, before the eight patterns it shares with tune 10. Its other
  two voices are empty slots.
- The lowest and highest notes that sound, by tune: 0, 46.2 Hz to
  1,479.9 Hz; 1, 61.7 to 1,479.9; 3, 55.0 to 1,318.4; 10, 55.0 to
  2,636.9.
- The 2.5k the screen claims checks out for the longest tune. Key 1's
  packs into 735 bytes of tracks and patterns and uses 13 instruments,
  208 bytes; the driver's code, variables and tables are 1,399. That is
  2,342 bytes.

## Hardware registers

Every chip address the program's own code touches. The unpacker's writes
to the VIC and the CIAs, which happen before `$1825`, are above.

| Register | What the program does | Where |
|---|---|---|
| `$D011` | read, waiting for the raster to pass line 255 | `$1FFA`, which nothing reaches |
| `$D012` | read, four times a frame: twice to time the music, twice a line in each half of the bars | `$1836`, `$1840`, `$2000`, `$2080` |
| `$D019` | written `$01` to acknowledge the raster interrupt | `$1833` |
| `$D021` | the background colour, once a raster line through the bars | `$201F`, `$202B`, `$209F`, `$20AB` |
| `$D400`-`$D406` etc. | each voice's frequency, pulse width, control and envelope, through the offsets 0, 7 and 14 | `$13AE` and the driver |
| `$D417` | 0: no voice is filtered | `$103E`, `$1189` |
| `$D418` | `$1F` when a tune starts, then the fade's own steps down to 0 | `$1043`, `$1927`, `$1933` |
| `$D995`-`$D9AC` | twelve colour cells: the four digits' three each | `$18EB`, `$1938` |

Not touched by the program's code at all: `$D011` as a write, `$D015`,
`$D016`, `$D018`, `$D01A`, the sprites, both CIAs, and the SID's read
registers.

## Strings and leftovers

- The screen text is screen codes at `$0400-$07FF`, in the character
  ROM's lower-case set. "guage" is misspelt on the last line, as it is
  in the original.
- `$9FF5-$9FFF` holds "DEMO LOADER" in PETSCII, four pages above
  anything the program uses, and nothing reads it. The BASIC input
  buffer still holds the tail of a load command, `O LOADER"` at `$0205`,
  with the start of the line overwritten. Both are left from before the
  program ran.
- `$1FFA-$1FFF` is six bytes of code nothing reaches: a wait for the
  raster to pass line 255 and a NOP, with four kilobytes of zeros before
  them and the colour bars immediately after.
- `$2031-$204E` and `$20B6-$20CE` are NOPs nothing reaches, padding
  between each half of the bars and its colour table.

## Live tests

- *Live*: each of the four keys played its tune in the emulator and
  turned its own digit yellow; the header the key loaded was read back
  from `$144C` and matched the tune `$1963` names (1 → `$3B80`, tune 10;
  2 → `$3640`, tune 3; 3 → `$3400`, tune 0; 4 → `$34C0`, tune 1).
- *Live*: the gauge byte `$18AE` was sampled 240 times over five seconds
  while key 4's tune played: 16 to 27 raster lines, and 17, 18 or 19 in
  three quarters of the samples. Sampled at one instant each, the four
  tunes read 23, 21, 16 and 18 lines.
- The port of the driver in `index.html` was run beside the driver
  itself in the kit's 6502 simulator, from the bytes of `listing.json`:
  all sixteen headers for 20,000 frames each and 200 seeded random tunes
  with random instruments, comparing every SID write in order, all 25
  registers and the variables `$104C` and `$141A-$14B6` after every
  frame. All match, and together they run every instruction of
  `$1000-$1419` (`tests/warbles.js`).
