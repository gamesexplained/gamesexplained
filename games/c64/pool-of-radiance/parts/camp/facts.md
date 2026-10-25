# The camp — verified technical facts

CAMP, module 9: the Encamp Menu, with resting, memorising and casting
spells, saving, and changing the party. Every address here is the camp
part's. Unless marked *live*, a fact comes from the code in `camp`. Live
tests are listed in the game's own `facts.md`.

## The menus

- ENCAMP: SAVE VIEW MAGIC REST ALTER EXIT (`encamp_menu`, `$083E`;
  routines from `encamp_handlers`, `$088E`). The adventure's CAST also
  comes here and goes straight to casting (`camp_restart`, `$0803`).
- MAGIC: CAST MEMORIZE SCRIBE DISPLAY REST EXIT (`magic_command`,
  `$14E2`). ALTER: ORDER DROP SPEED ICON PICS EXIT (`alter_handlers`,
  `$091C`).
- Leaving the camp makes DUNGEON the next module and loads the area's
  script again (`leave_camp`, `$0859`).

## Resting

- REST (`rest_command`, `$1C0A`) starts the rest time at what the
  members' studies need: 15 minutes for each level of spells, after the
  hours of rest they must have first (`rest_hours_by_level`, `$1A83`: 4
  hours before spells of levels 1 and 2, 6 before 3 and 4). INCREASE and
  DECREASE change it five minutes a press.
- Each pass of the rest is five minutes on the clock (`rest_loop`,
  `$1D74`); every quarter hour a member who is studying counts its spell
  down, every hour a member still resting before its studies counts its
  hours down.
- In an area that sets `$6DD2`, every that many passes a roll of 0 to 99
  under `$6DD3` (a chance of `$6DD3` in 100) interrupts the rest: YOUR REST IS RUDELY INTERRUPTED!, the
  studies cancelled, and the camp leaves for the encounter (`$1E0F`).
  *Live*: New Phlan sets 1 and 101, so a rest there ends after five
  minutes.
- Each 24 hours of rest gives every member one hit point and THE WHOLE
  PARTY IS HEALED! (`daily_heal`, `$1FB6`). The count to the next day
  starts on arrival in camp (`day_hours`, `$28DB`), so two rests of 12
  hours on one visit heal like one of 24.
- `clock_add` (`$124A`) adds to the days gone by (`$49EC`) only when the
  days figure comes round, once a month. *Live*: a day's rest left
  `$49EC` at 0.

## Spells

- MEMORIZE (`memorize_command`, `$184A`) and SCRIBE (`scribe_command`,
  `$152E`) choose spells to study during the next rest; saving the game
  cancels studies half done (`$0CD5`).
- Casting a spell that works only in combat asks ARE YOU SURE ABOUT
  CASTING THIS SPELL?, and OKAY loses the spell with no effect
  (`combat_only_spell`, `$1467`).
- A spell cast from a scroll with USE is cast at level 6 (`camp_use`,
  `$1122`).
- The headings of the spell lists are 1ST, 2ND and 3RD LEVEL, and the
  fourth reads 7TH LEVEL (`level_headings`, `$2AC1`).

## Changing the party

- ORDER (`order_command`, `$0A03`) asks who takes each position, copies all eight
  slots out, and puts each member back from slot 7 down at its new place
  (`$0AF9`). The timed effects on a member's old slot are moved onto the
  new one a slot at a time, so an effect moved onto a slot handled later
  is moved again and ends on another member. *Live*: an effect on Lara
  Spellsword ended on Arax the Bold when the two changed places.
- DROP removes a member for good (`drop_command`, `$0BC8`): BIDS YOU
  FAREWELL, or IS DUMPED IN A DITCH when it is down.
- SPEED sets the message speed, 0 fast to 9 slow (`speed_command`,
  `$0C56`); PICS turns the portraits and the monsters' pictures on and off
  (`pics_command`, `$09BF`).
- SAVE writes the game as GEN does, through the KERNAL rather than the
  fast loader (`save_command`, `$0CAB`).
