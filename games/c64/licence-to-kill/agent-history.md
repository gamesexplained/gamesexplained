# Licence To Kill — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 16 November 2026, first run (Silver, story-first layout)

- Orientation: two G64 images, both Trilogic Expert freezer backups. The
  first snapshots read as nonsense until `kit/c64/snapshot.py` was taught
  to find the RAM by the C64MEM module, which VICE 4.0 moved. The entry
  snapshot resumes the program at `$07F8`.
- Coverage reached 100 % (59,597 bytes) on claude-opus-5-5. Typing
  `$C550`-`$C5F5` as bytes clobbered the end of `voice_update`, which
  check_listing caught; the code part was retyped.
- Sample seed 2616 (checker on claude-fable-5-2): 11 of 60 wrong. The two
  worst showed the enemy type tables' labels shifted a field against the
  spawn loop; all eight were relabelled from the loop. Two more comments
  of the same kind were fixed (`$C116`, `$BF8F`).
- While building the Gameplay page, the crash test's `CMP #$02` turned
  out to compare against the throttle, which `player_hits_scenery` writes
  into the operand each frame; the comment had read the snapshot's value.
  A simulator sweep over 530 positions confirmed it.
- `facts.md`'s first energy rule said every level starts at 47; the play
  snapshot's damage count of 3 did not fit, and levels 1 and 3 turned out
  to set 6 after `start_timer`.
- The "no in-game music" line of the Zzap!64 review belongs to its Amiga
  ratings, not the C64's; `features.md` had it wrong.
- The disassembler and VICE stopped when the worker restarted; the
  launcher rebuilt the project from `symbols.json` with nothing lost.
- Reader review (claude-fable-5-2): found the level 2 shot count wrong
  (the sixth shot kills, not the seventh), the crash prose contradicting
  its own widget (height-12 characters can never be cleared, since the
  throttle stops at 47), effect 15 given to the plane, the reception
  overstating "the one complaint", phone-width tables, missing Oxford
  commas, "It" openings and inline test narrative. All fixed. Added from
  its missing leads: the shootable jeep and its hits bar, the closing
  text, the restart's fixed random seed, `$8131`, level 2-4 screenshots
  and the extra mechanics on Gameplay. Left: animated or assembled
  sprites on Graphics, pictures for the reset screen, and the meaning of
  level 2's height values, noted in TODO.md.
