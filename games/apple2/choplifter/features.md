# Choplifter — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The instruction card, archive.org's OCR text of item
  `ChoplifterManualAppleII`,
  https://archive.org/download/ChoplifterManualAppleII/Choplifter%20Manual%20Apple%20II_djvu.txt,
  read 20 October 2026
- The instructions and the folder from a boxed copy, archive.org item
  `broderbund-choplifter-a2-ph`,
  https://archive.org/details/broderbund-choplifter-a2-ph, OCR text of
  `components/choplifter instructions` and `box/choplifter folder`, read
  20 October 2026
- Wikipedia, "Choplifter", https://en.wikipedia.org/wiki/Choplifter, read
  20 October 2026 (its Gameplay section mixes versions; only claims it
  makes of the Apple II are listed here)
- The game's own title screen and play in the emulator. Every picture in
  `reference/` was taken from the emulator during this run.

## Features

| Feature | Status | Where |
|---|---|---|
| Any key starts play | live | SPACE from the attract mode started the first sortie (`orientation.md`, step 5) |
| The helicopter answers the joystick: up, down and sideways | open | the paddles are read through the Monitor's `PREAD` ($FB1E) |
| A sustained push of button 1 reverses the helicopter's direction | open | button 1 is read at `$0DA0` and `$0E3B` |
| A short push of button 1 turns it to face the player ("tank attack" posture) | open | |
| Button 0 fires | open | button 0 is read at `$0D99` and `$0E02`; firing from the pad clicked the speaker (192 clicks in 120 frames) |
| The helicopter can fly one way while facing another (Wikipedia) | open | |
| Hostages are locked in barracks, 16 to a barracks | open | |
| One barracks has been blown open at the start | open | |
| The other barracks must be freed (by shooting them, Wikipedia) without killing the hostages | open | |
| All 16 of a barracks must be rescued or killed before the next | open | |
| Land near the hostages and they climb in | open | |
| The helicopter seats 16 | open | |
| Landing on hostages kills them | open | |
| Landing tilted crushes boarding hostages (Wikipedia, of the Apple II and Atari 7800 versions) | open | |
| Land on the pad by the post office and they scramble out | open | |
| Three counters at the top: killed (red), aboard (blue), returned (green) | open | the bar is part of the loaded title picture; the digits change in play |
| The most that can be saved is 64 | open | |
| Three helicopters a game | open | |
| The game ends with the third helicopter lost, or every hostage dead or rescued | open | |
| Sorties are announced: FIRST SORTIE, SECOND SORTIE | live | seen at the start of play and after a crash (`reference/`) |
| The last message is "The End", not "Game Over" (Wikipedia, from Gorlin) | open | |
| Jet fighters come out of the background and fire air-to-air missiles; they can be shot down | open | |
| Jets bomb a helicopter on the ground (Wikipedia) | open | |
| Tanks amble along, kill hostages and destroy a helicopter on the ground | open | a tank seen on the first sortie |
| Only a helicopter facing forward can shoot back at tanks | open | |
| Drone air mines home in on the helicopter, the only enemy on the post office's side of the barrier | open | |
| ESC pauses | open | `$0DDB` waits for a second ESC |
| CTRL-S toggles the sound | open | `$0DAE` flips `$72F6`, which the speaker routines test |
| The sound goes to the cassette port too, for an external speaker | open | every click of `$C030` is followed by a read of `$C020` (`$76E9`, `$76F7`, `$78BB`, `$78DB`) |
| CTRL-V and CTRL-A reverse the joystick's up and down, left and right | open | `$0DBD` flips `$72F5` on CTRL-V, `$0DCC` flips `$72F4` on CTRL-A |
| "Francis Scott Key plays piano at the post office", "Boris Spasskey plays chess at the post office" (the card's jokes) | open | |
| An attract mode: "your mission: RESCUE HOSTAGES" and a demonstration sortie | live | after the title, with nothing pressed |

## Beyond the documentation

- CTRL-L, then a key, sets `$731D` to the key's low two bits (`$0DED`).
  What it changes is open.
- The disk runs on the Apple II and II Plus only: the loader checks the
  Monitor ROM and stops with `M` on the enhanced IIe (`orientation.md`).
- RESET during play shows `R`, beeps and erases memory
  (`orientation.md`).

## Open questions

- What CTRL-L sets.
