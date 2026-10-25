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
  (`flash_spirit`, `$0A97`), "NO LORD BANE! I CAN STILL RULE HERE!", a
  head drawn over the picture (`show_head`, `$0AC2`), the sprites fading
  to black in five steps (`fade_sprites`, `$0AF4`), NOOOO ..., and sprite
  0 falling, faster at each step and red at the end (`sprite_falls`,
  `$0B31`).
- *Live*: run on from `entry_final`, the module showed its messages and
  handed back to DUNGEON (`orientation.md`).
