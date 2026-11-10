# The ending — verified technical facts

FINAL, module 8, which the script runs after the last battle: two
scenes and Tyranthraxus's speech, then back to DUNGEON. Every address
here is the final part's. Unless marked *live*, a fact comes from the code
in `entry.vsf`, the stop at the linker's call into this module. Live tests
are listed in the game's own `facts.md`.

- `final_start` (`$0800`) sets up the sprites, loads the pictures, plays
  the two scenes and makes DUNGEON the next module, whose script goes on
  after the fight.
- `load_scenes` (`$08E7`) loads PIC `$3A` (the sprites' images, copied to
  `$C800`), SECSET07 and SECSET08 (the scenes' characters), PIC `$35`,
  `$36` and `$34` (the pictures, two of them kept at `$1C00` and
  `$2200`) and SPELLE20, whose two blocks of 15 by 15 characters and their
  colours are the scenes' backgrounds (`draw_scene`, `$09A9`).
- The first scene (`scene_dragon`, `$093B`): MORTALLY WOUNDED, THE DRAGON
  ROARS! and the spirit flaring up from the dragon's body, then 140
  frames of the picture's animation and, partway, "FOOLS, YOU HAVE BUT
  SLAIN THE BODY I POSSESSED. I CANNOT BE DEFEATED!".
- The second scene (`scene_spirit`, `$0A0B`): six sprites over a second
  background, the spirit's speech, the colours flashing for 28 rounds
  (`flash_spirit`, `$0A97`), "NO LORD BANE! I CAN STILL RULE HERE!", the
  pool going from light blue to dark grey (PIC `$35` drawn over the window
  the way ANIMATE draws a portrait's head, `dim_pool`, `$0AC2`), the
  sprites fading to black in five steps (`fade_sprites`, `$0AF4`) until
  only sprite 0, the spirit's yellow eyes, is left, NOOOO ..., and sprite
  0 falling, faster at each step (`sprite_falls`, `$0B31`).
- `sprite_falls` makes sprite 0 red after each wait of 50 or more
  (`$0B49`-`$0B53`: `CMP #$32`, `BCC` past the store), and the wait starts
  at 100 and drops by 4, so the eyes are red from the second step to the
  end. Run on the kit's 6502 from `$0B31` with the wait stubbed, the first
  write of red to `$D027` comes after the first move of `$D001`
  (`test_graphics.js`).
- *Live*: run on from `entry_final`, the module showed its messages and
  handed back to DUNGEON (`orientation.md`).
