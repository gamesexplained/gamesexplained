# Karateka — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Brøderbund's manual, the Apple II, Atari and Commodore 64 sheet,
  https://archive.org/details/karatekabroderbund, read 24 October 2026.
  Its text layer is OCR and misreads two keys; the page images were read
  for every key below.
- Wikipedia, "Karateka (video game)",
  https://en.wikipedia.org/wiki/Karateka_(video_game), read 24 October
  2026.
- The disk's item in archive.org's A Woz A Day collection,
  https://archive.org/details/wozaday_Karateka, and its WOZ metadata,
  read 24 October 2026.
- Jordan Mechner, *The Making of Karateka: Journals 1982-1985*,
  https://archive.org/download/the-making-of-karateka-jordan-mechner,
  read 24 October 2026 (the task lists of 19 October 1983 and 15 March
  1984, and the upside-down side B).
- Web search summaries of StrategyWiki and TV Tropes on the falling gate,
  24 October 2026. Second-hand: both sites refused a direct fetch (HTTP
  403). They say only that the gate is a trap that must be set off; the
  how below comes from the code.

## Features

| Feature | Status | Where |
|---|---|---|
| Title, prologue, Akuma's chamber and a self-running demo after boot | live | stage 0; `reference/title.png`, `prologue.png`, `akuma-chamber.png` |
| Any key or the joystick button starts the game | live (SPACE) | the title's key test near $B7DE; other keys and the button not tried |
| The castle picture before the cliff | live | tracks 4-6, `reference/castle.png` |
| The hero climbs onto the cliff while the opening tune plays | live | stage 1, the tune at $0D00; `reference/cliff-climb.png` |
| Keys pressed during a tune are ignored (the tune's loop reads them) | live | $0D10 |
| **K** selects keyboard control | live | $770F-$771D sets $C4 to 1 |
| **J** selects joystick control | live | $76FD-$770D clears $C4, and pressing J cleared it. The manual's OCR reads "I"; the printed page says J |
| Joystick: up to stand, release for stance, buttons punch and kick, up and down aim, left and right move, up-right to run, button 1 to bow | traced | $6E00-$6E68: held up keeps the hero standing, up with a new press of button 1 bows ($6E57), letting go takes the stance; the stick is read at $6D09 and the buttons at $6D6A. The kit's emulator client has no joystick, so it was not driven |
| From stance: **Q / A / Z** punch high, middle, low | confirmed | $6EB9-$6ED8; each shows the punch poses $14-$16 on the hero ($20), attack types 3, 4, 5 ($6B) |
| From stance: kick high, middle, low | differs | the manual prints W / S / Z; the code reads **W / S / X** ($6EE0-$6EFF), and Z is the low punch. X kicks live (attack type 2) |
| From stance: **RIGHT** advances, **LEFT** retreats | live | the hero's position, $62, steps up and down |
| From stance: **SPACE** stands up | live | $6E78-$6E88; $6F reads $FF standing, 0 in stance |
| From standing: **RIGHT** runs forward | live | `reference/cliff-killed-running.png` |
| From standing: **LEFT** stops | live | RIGHT sets $29, which stays set while standing; LEFT clears it ($6E69), and the run wound down to standing still (legs pose 7) within 60 frames |
| From standing: **SPACE** takes a fighting stance | live | |
| From standing: **B** bows | live | $6F04 asks for the bow ($C2), carried out only when standing still ($66FE); the poses run 7, $0B, $0C, $0D and back. A guard standing at column $27 or less bows back ($6B00), `reference/cliff-bow.png` |
| ESC freezes the game until a key is pressed | live | $76AB → $778E; nothing moved for 130 frames after ESC, and play went on after a key |
| CONTROL-R returns to the demo | live | $7722-$772F loads stage 0 through $0206 unless $D2 is negative; pressed on the cliff, the title stage came back ($D0 = 0) with its prologue |
| CONTROL-S cycles music off, then sound off, then both on | live | $76B2-$76CB; from both on, three presses gave music off ($4F = 0), then the sound off too ($86 = 0), then both on |
| CONTROL-X, -Y flip the joystick's axes; CONTROL-E swaps them; CONTROL-B swaps the buttons; CONTROL-N resets all four | confirmed | $76CD-$76FB toggle $C3 (B), $C0 (E), $C2 (Y), $C1 (X); $7732-$773E clears all four. Pressed in turn, each set its flag and CONTROL-N cleared them; their effect on a joystick was not seen |
| Orange arrows bottom left: the hero's hits left; blue arrows bottom right: the opponent's | live | $B6 the hero's, $B7 the opponent's |
| One arrow lost per hit; the last one lost kills | confirmed | $0BC1-$0BD1 takes one of the hero's ($B6) and clears $5D, his alive flag, when the last goes; $0BD2 does the same for the opponent ($B7, $5E). The blows are applied at $7207 |
| Arrows come back while the fighter is not hit | confirmed | $0C06-$0C0C raises $B6 one at a time up to $B0; seen live while running |
| Standing or running, one well-aimed blow kills | live | $712A: a blow on the hero standing, running or bowing kills him, while an opponent caught so only reels. A guard in the stance kicks a standing hero within 8 columns ($6B00), so running at him is fatal. `reference/cliff-killed-running.png`; a script standing in stage 3 died the same way |
| Every guard has his own headgear and fighting style; they get tougher further in | confirmed | each guard wears the next headgear ($3E): 0-5 on the cliff, 1-5 in the palace, 3-6 in the dungeon. Each headgear sets the guard's chances, out of 256, of a kick, a punch and a step forward ($D7-$D9; cliff $BB75, palace $BC45, dungeon $B499): the brain ($6B00) picks a move by the distance from the stage's tables, then the move goes ahead only if a random byte is below its chance. Each guard also has more arrows than the last ("Beyond the documentation") |
| The hawk, sent by Akuma, deflected by well-timed punches or kicks | live | stages 2 and 3, `reference/palace-hawk.png`, `palace-hawk-struck.png`, `dungeon-hawk.png`. It comes from the right edge at one of three heights, two columns a frame ($B653 palace, $A8F9 dungeon). Three to five columns from the hero, a kick or a full-stretch punch at its height strikes it and it flies off; closer, it pecks him, each peck counted as a punch on him ($40 = 2) ($B589, $A806). In the palace each hawk comes sooner than the last |
| The falling portcullis | live | stage 2, `reference/palace-portcullis-fallen.png`; how to pass it under "Beyond the documentation" |
| Falling off the open cliffside | live | on the first screen a hero who steps back past the edge sets $A2 ($BA91); the next frame starts the fall ($B8BD), four pictures ($AC3F), and at $A1 = $30 he is dead. Retreating in the stance from the start of the cliff, `reference/cliff-fall.png` |
| Cutscenes: Akuma ordering attacks, Mariko waiting | live | `reference/palace-akuma-and-hawk.png`, `mariko-cell.png` |
| Fighting Akuma | live | stage 4, `reference/akuma-duel.png`, `akuma-fight-mariko-watching.png`. His chances of a kick, a punch and a step are all $FF ($B700), and he moves and strikes on every frame ($B895, $B8C7), where the dungeon's guards do so on alternate pages |
| Approaching Mariko in a fighting stance: she kicks the hero dead | live | stage 4, `reference/mariko-kicks-hero.png`. $BB05: she holds out an arm (pose $20, the picture at $1F00) while he comes standing, and takes pose $24 while he is in the stance; reaching column $13 when her arm is not out, he is kicked ($9A = $FE, pose $21), a killing blow ($B91D) |
| Approaching her standing: she is rescued, and the closing text | live | `reference/ending-embrace.png`, `ending-text.png`. With her arm out, at column $16 the embrace begins ($BB44): twenty steps of her poses ($BB72), then the eight lines of closing text ($A321) |
| "The end" after the hero dies | live | `reference/the-end.png` |
| Side B: the whole game upside down | open | `work/karateka-side-b.woz` kept, not analysed |

## Beyond the documentation

Found in the code, not in the manual.

- **The portcullis is a trap that must be sprung from outside.** Stage
  2's last portcullis falls whenever the living hero stands under it
  ($62 = $1E-$21; $B93D-$B94F), and it kills him if he is still there
  when it has fallen 14 steps ($B967-$B97D). Its fall takes two of the
  game's frames, faster than he can run clear. A punch or kick one step
  short of it ($62 = $1D) springs it harmlessly ($B951-$B965); it rests
  for 20 frames, then rises one step a frame, and the drop is not tested
  again until it is fully up. Running at it as it rises takes him
  through. **confirmed**: `orientation.md`, step 7.
- **In stages 3 and 4, each doorway the hero has not been through stays
  shut to him until he kicks it.** He bounces off it standing or in
  stance. A kick (not a punch) in stance at $62 = $1D-$1F with no
  opponent alive opens it and counts one more room passed ($C5); the
  test is in the engine, at $73E4-$7418, and runs only when $D0 is 3 or
  more. Stage 3 has four such doorways, rooms 1 to 4 ($C5 goes from 1
  to 5), and stage 4 one, room 5's: it starts with $C5 = 5, and room 6
  is never shut ($B368). **confirmed**: the script's run went through
  every doorway of both stages.
- **The hero's most arrows and his opponent's always add up to 28.**
  Each stage
  sets the hero's most arrows ($B0) and every opponent's ($B1): 14 and 14
  on the cliff, 12 and 16 in the palace, 10 and 18 in the dungeon, 8 and
  20 against Akuma ($B700 in each stage). Each guard beaten moves one
  more from the hero's side to the next guard's, while the hero's most
  stays at 10 or more on the cliff ($B874), 9 or more in the palace
  ($B8A2); in the dungeon the cut has no floor ($B820). The dungeon's
  hawk, its last opponent, has 5 arrows, which never come back
  ($B9 = $FF), and the hero 23 for that fight: 28 again. **traced**.
- **The dungeon's hawk can be killed.** In the palace a struck hawk only
  flies off. In the dungeon, kicking open room 4's doorway, after its
  guard, brings the hawk in as the opponent ($BA62), and each strike costs
  it an arrow ($A806); with the last it falls as a burst of feathers,
  three pictures ($A876, $AA51), and the stage can end. While it lives the
  hero cannot leave room 4 ($B362). **traced**.
- **Akuma opens with kicks.** Entering room 6 sets $58 ($B368), and while
  it is set Akuma is sent a kick every frame, never refused and without
  recoil ($B895). A hero who runs in is killed by the first. One who comes
  in the stance is knocked back into room 5, which clears $58 ($B345),
  and from then on Akuma fights by the brain like any guard. **live**:
  both ways, from the stage's start with room 5 opened.
- **The last stage turns the sound back on.** Stage 4's start sets the
  music and the sound on ($4F, $86 = 1), whatever CONTROL-S had chosen
  ($B700), so the ending is always heard. **traced**.
- **A picture overwrites a jump in the last stage.** Stage 4 loads over
  the dungeon's code, and the last byte of one of Akuma's robe masks
  (the shape at $AFE4) lands at $B000, where the dungeon keeps a JMP. Read
  as code it would double the hero's most arrows (TAX, ASL $B0), but it
  runs only on the first screen, which the hero cannot get back to in
  stage 4: room 1's door is shut behind him ($ED) and he is stopped at
  column 7 ($BA01). **traced**.
- **The IIe waits for the vertical blank.** $779A reads the machine's ID
  byte at $FBB3 and, on a IIe or IIc (6), waits on $C019. **traced**.
- **Reset reboots the disk.** The language card holds a copy of the ROM
  with its reset vector pointed at $0309, which clears memory and boots
  the disk again. **traced** (`orientation.md`, "Steady state").

## Open questions

- $7742-$7746, among the special keys' handlers, sets the opponent's
  arrows to one and clicks, but no key test leads to it: no JMP, JSR or
  branch to $7742 is in any of the six parts. It is unreached in this
  copy; what key once led there is unknown.
- Side B, the game upside down, is not analysed.
