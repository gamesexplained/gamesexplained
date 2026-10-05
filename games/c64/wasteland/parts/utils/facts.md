# Utilities — verified technical facts

The utilities are the program the start-up's Utils loads from side 1,
track 8, logical sector 20: fourteen pages to `$7E00-$8BFF` through the
engine's `load_program`, header `$00 $7E $0E` after a `JMP $7E06`. The
start-up asks for the master side 1 before the load (startup
`$81E4-$81ED`), so the utilities start with the master in the drive and
`$ED` back at 0. Their menu is Copy, Restart and Start: Copy makes play
disks from the masters, Restart strips the party in a saved game, and
Start loads the game as the title's Start does. Nothing returns to the
title.

## Load and layout

- `$7E00-$8BFF` in the hand-over snapshot is side 1's T8/L20 and the
  thirteen sectors below it, byte for byte, and `play-utils.vsf` holds
  the same bytes.

| Range | What |
|---|---|
| `$7E00-$7E5F` | entry, header, main loop, screen, menu set-up |
| `$7E60-$7F15` | menu tables, bar texts and handler tables |
| `$7F16-$80AB` | Copy: format question, format, sector transfer, prompts, the master check |
| `$80AC-$80FD` | reading the save of the disk in the drive |
| `$80FE-$8189` | Restart |
| `$818A-$8333` | Start, prompts, key waits, message printers |
| `$8334-$8449` | the copy loop and its state |
| `$844A-$8788` | a character report for a printer, never reached |
| `$8789-$8B4E` | the packed text |
| `$8B4F-$8BFF` | engine bytes |

- `$8B4F-$8BFF` is the engine's `$0F4F-$0FFF` but for two operands, a
  `JSR $1FF9` and a `JMP $1FF9` where the engine has `$1FFB` (`$8BCB`,
  `$8BEF`). No instruction reaches it (`opcodes.py --refs`, reach 255, at
  `$8B4F`, `$8BA0` and `$8BFF`).
- The utilities make no sound: no instruction of theirs touches
  `$D400-$D7FF` and none calls the engine's sound entries.

## Menus

- The main loop shows menu 0 and the screen and then feeds every key to
  the engine's menu (`$7E06-$7E15`). The menu tables (`$7E43`) point at
  five bar texts (`$7E60`) and four handler tables (`$7E6A`).

| Menu | Bar | Last item `$3A` | Handlers |
|---|---|---|---|
| 0 | "Copy Restart Start" (`$7E72`) | 2 | Copy `$7F16`, Restart `$80FE`, Start `$818A` (`$7ED9`) |
| 1 | "1 2 3 4 Exit", then "Enter side # to copy." on the same bar (`$7EDF`) | 4 | sides 1-4 `$8334`, `$8337`, `$833A`, `$833D`; Exit and the hidden key `$1B` (back-arrow) `$7E43` (`$7F0A`) |
| 2 | "Reading." (`$7E86`) | 0 | `$801F`, `CLC`, `RTS` (`$7ED5`) |
| 3 | "Writing." (`$7EA0`) | 0 | `$801F` (`$7ED5`) |
| 4 | "Formatting." (`$7EBA`) | 0 | none: the table has four words, so menu 4's would be read from `$7E72`, the text "Co" |

- Menus 2-4 are status lines, drawn during a transfer and the format
  with the selection `$39` = 1, past their one item (`$7FFF-$8005`,
  `$7F62-$7F68`). The copy reads no menu key while they are up: between
  sectors it looks only for a back-arrow in `$EC` (`$83DA-$83E4`).

## Copy

- Copy sets the master's drive and the destination's drive both to 1
  (`$7F16-$7F1B`), and nothing else writes them (`$7F89`, `$7F8A`), so
  every pass begins with a disk prompt: "Insert Wasteland Master disk
  side *n* in drive 1." or "Insert destination disk side *n* in drive 1."
  (`$8021-$8043`). Message 55, "Would you like to use 1 drive or 2 for
  making copies?", is printed by nothing.
- Choosing side *n* asks "COPY SIDE *n*. WARNING!!! Formatting will
  destroy the entire contents of the destination disk. Do you want to
  format the destination disk (Y/N)?" (message 53): Y formats, N does
  not, back-arrow ends the copy, and every other key, RETURN among them,
  is ignored (`$7F2C-$7F52`).
- Before every read pass the inserted disk must be that side's master:
  T35/L8 is read with no retry and its last three bytes must be `$D7`,
  `$CC` and the side (`$8068-$80A4`). A read error prints message 56 "I/O
  ERROR. Check to make sure you have side *n* in the drive.", any other
  disk message 57 "You have the wrong disk in the drive. Insert side
  *n*."; RETURN or space tries again, back-arrow ends the copy
  (`$8047-$8065`). The destination is never checked.
- The copy starts at T35/L16 and steps down with the loader's own rule
  (`$FD0B`) until the track becomes 0, after T1/L0 (`$8347-$8358`,
  `$8401-$840E`): 642 sectors of a side's 683. The other 41 are track
  17's physical sectors 1-20, all of track 18 and physical sector 11 of
  tracks 24 and 30; on all four masters those hold the filler `$4B` and 255 bytes of
  `$01`, and on track 18 a CBM header and directory, the disk named
  "WASTELAND".
- A pass moves up to 119 sectors (`$83D1`), a page each, into
  `$3400-$59FF`, `$9000-$C5FF`, `$CA00-$CFFF`, `$E000-$EDFF` and
  `$F500-$FBFF`: 38 + 54 + 6 + 14 + 7 pages (`$8418-$8443`). Read and
  write passes alternate, each keeping its own track and sector
  (`$836F-$83BB`, `$8445-$8449`). 642 is five passes of 119 and one of 47,
  so a side takes six read passes, six write passes and twelve disk
  prompts.
- The copy overwrites the game state's character records and the map
  area as its buffer; Restart and Start both read the save again before
  they use any of it.
- When the sector just moved is T35/L8, its byte `$FD` is set to 0
  (`$83ED-$83FD`), so the copy's identity is `$00 $CC` *side*. On the
  images, each master side against its copy: of the 642 sectors Copy
  visits, 641 are identical and T35/L8 differs only at byte `$FD`, `$D7`
  against `$00`.
- A back-arrow pending between two sectors ends the copy (`$83DA-$83E4`).
  The copy ends with message 7, "Copy was successful." when the last
  write pass reaches track 0 (`$836A`), "Copy was unsuccessful." after
  any back-arrow (`$8367`), through the text's singular and plural switch
  on the count 1 or 2 (`$7F8D-$7F91`).
- A sector transfer calls the loader itself (`$7FB4`), with no engine
  retry. On an error it prints "I/O error" on row 23, or "Write protected"
  when the status `$FC` is `$10` (`$7FC2-$7FC8`), then ". (RETURN)";
  RETURN or space tries again, back-arrow ends the copy (`$7FD6-$7FF2`).
  The loader returns the drive's status in `$FC` with the carry set for
  any status but 0 (engine `$FF7F-$FF8C`), and the drive code's only
  statuses are 0, `$27` and `$2B` (drive `$0309`, `$048E`, `$0620`; `$2B`
  for a protected disk), so a protected destination shows "I/O error".

## Format

- The format runs once a copy, before the first write pass, only when Y
  was answered (`$7F54-$7F78`): "Formatting." is shown and the loader is
  called with command 3 (`$7F6D-$7F73`). It is the fast loader's own
  command, not the drive's DOS format: the drive code's command 3 (drive
  `$0363`) writes the sector headers of tracks 1-35, then a data block of
  zeros in every sector of tracks 35 down to 1, and sends status 0
  whatever happened (drive `$0386`). The headers it builds carry the disk
  ID "IP" (drive `$050D-$0514`).
- So "Format was unsuccessful." (message 8, `$7F7B-$7F86`) cannot be
  shown: it needs a status the format never sends.
- On the images every header of every copy reads ID "IP", against "ID" on
  masters 1-3 and "IP" on master 4, and the 41 sectors Copy never writes
  are zeros on every copy: a copy has no CBM directory on track 18.

## Restart

- Restart asks "WARNING!!! Restarting will remove all items and cash and
  place all parties near Ranger Center. Continue (Y/N)?" (message 54): Y
  goes on, N or back-arrow leaves, other keys are ignored
  (`$80FE-$8110`).
- It asks "Please put side 1 in drive 1." and reads the save of whatever
  disk is in the drive, with no side or identity check (`$82ED-$82FB`);
  back-arrow there leaves instead (`$82F5-$82FA`, then `$8115`).
  With no characters (`$0A` = 0) it prints the report's "No players to
  print." and stops (`$82FE-$830B`).
- For each character record 1 up to `$0A` it zeroes the 30 item and count
  pairs (`+$BD-+$F8`), the weapon slot `+$1F`, the armour class `+$1A`,
  the armour slot `+$25` and the cash `+$15-+$17` (`$8117-$8149`).
- For each party 0 up to `$0B` it sets table byte `+$0A` to 0 and the
  position bytes `+8`, `+9` to 62, 62, and sets the map `$09` to 0
  (`$814B-$816E`); then `$02/$03` = 53, 58 (`$8170-$8176`).
- Then "Please put destination Wasteland character disk in drive 1."
  (message 50) and, unless back-arrow, the engine's `save_game` to
  whatever disk is in the drive (`$8178-$8184`). Names, attributes,
  skills, CON, rank, the clock and the game-time count are left as they
  were.

## Start

- Start is the start-up's Start (startup `$81FA-$829E`) instruction for
  instruction in its search and its loads (`$818A-$8226`): "Use last
  saved game (Y/N)?", RETURN or Y for side 1 after "Insert side 1.
  (RETURN)", N for the side whose 32-bit count `$04`, `$05`, `$06`,
  `$F4FD` is largest (a tie to the later side, `$81CF-$81FA`), back-arrow
  to the menu. It differs only around the search: it turns no voice
  off, keeps no animation flag and does not ready the engine for the
  disk before each side (`$8254-$825E`).
- Each side it reads goes through the engine's side check, which wants
  the identity byte `$00`, a copy's (`$8259`, `$821B`).

## Reading a save

- The save reader (`$80AC-$80FD`) is the start-up's (startup `$830E`)
  with its own addresses: eight pages from T35/L7 down, unscrambled and
  checked; a checksum that does not match leaves each byte as stored EOR
  `$F4FF` with no message (`$80CD-$80EA`); then `$F478-$F485` back to
  `$02-$0F` and the line buffer cleared.

## Text

- The packed text block is at `$8789` (`$8323`): alphabet
  `$8789-$87C4`, a table of fifteen group words (`$87C5`), messages
  `$87E3-$8B4E`, numbered 0 to 57.
- Messages the reached code prints: 1-8, 29, 30, 32, 49, 50, 53, 54, 56
  and 57. The unreached report prints 11-28, 33-41, 43-48, 51 and 52.
  Nothing prints 0 (empty), 9 ("Setup printer to the top of form and
  enter the slot # the printer card is in. Default slot = 1."), 10, 31
  ("No characters on disk."), 42 ("There is no card in that slot.") or 55
  (every call of the five message printers and `$86C6` traced back to the
  number in A; the engine's `print_message` is called from `$832B`
  alone).

## Code nothing reaches

- The character report `$844A-$8788`, which would gather each
  character's name, rank, attributes, CON, cash, sex, nationality,
  equipment, items and skills and send them through the KERNAL, with its
  ROM banked in and 4 in A for the call at `$8659`: no instruction or table word leads to `$844A` (`opcodes.py
  --refs`, reach 255; no word `$844A` in either snapshot), and the menu's
  handler tables hold only the entries above.
- The entry `$831A`, a word-wrapped message at a cursor position, and the
  back-arrow test at `$8683`, which follows the report loop's closing
  `JMP $8671` (`$8680`): no instruction reaches either.
- The lone `RTS` at `$800A`.
- A `BIT $C010` at `$82B3` reads RAM and nothing uses its result.
