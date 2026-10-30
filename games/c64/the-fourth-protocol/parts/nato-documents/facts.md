# Episode one, The NATO Documents: facts

File `XXXPART1` (`$4000`-`$C80F`), started at `$4005` (`episode_start`).
Every fact names the routine or table it comes from, in this part's
listing.

## Memory

`$01` = `$15`. The screen is the OS's bitmap at `$2000` with its colours at
`$0C00` (resident `video_setup`).

| Range | What |
|---|---|
| `$0080`-`$00FF` | the episode's zero-page variables |
| `$1000`-`$151F` | the four event lists, 41 days of 8 slots each (`list_bases`) |
| `$1520`-`$15E7` | the four trays: memos, reports, sitreps, calls, 49 bytes each (`tray_bases`) |
| `$15E8`-`$1602` | the trays' counts, and the last day each telephone number answers (`phone_until`) |
| `$1603`-`$1802` | `targets`: the game's 16 targets, then the 16 the player adds, 16 bytes each |
| `$1803`-`$181C` | `blenheim_released`: one byte for each of the 26 Blenheim files |
| `$1833`-`$1932` | `personal_files`: 16 records of 16 bytes |
| `$1933`-`$1969` | the clock, the scores, the telephone's state and the other variables |
| `$4000`-`$7FF8` | the code, the questions' option texts, the event tables |
| `$7FF9`-`$9DF1` | the floor plans, the pictures, the tiles and the dictionary (`$96D0`) |
| `$9DF2`-`$A183` | `pic_maras`, Blodwyn's photograph |
| `$A184`-`$C345` | the packed texts: memos, reports, sitreps, calls, files |

`$1000`-`$19FF` is the game's state: UTILITIES saves it whole to a data
disk under a three-character name, through the OS (resident `save_file`).

## The clock

- `day_clock` (`$5C38`), from the raster interrupt (`irq`, `$5C15`) once
  a frame, ends a day every 14,400 frames: 4 minutes 48 seconds on a PAL
  machine. *Live*: 1,000 frames advanced the count by 1,000.
- The first day begins 50 frames after the clock starts (`init_clock`).
  The calendar starts in June; its picture reads JUN, and an L drawn over
  the N makes JUL (`pic_calendar_l`).
- Each new day runs that day's events from the four lists
  (`run_todays_events`), the watchers' findings (`daily_surveillance`) and
  the watchers' allowance (`daily_watchers`).
- A journey in Sweden takes a day: `end_day` sets the count ten frames
  short of the day's end.

## Events

Everything that happens is an event on a day: a list (0 the story's
memos, 1 reports, 2 surveillance, 3 calls) and a number, put in the first
free slot of that day's eight by `schedule_event` (a day) or
`schedule_in` (days from today; past day 40 it is dropped). Event n of
list 0 posts memo n with whatever goes with it (`events_story`, 46
events); of list 1, report n (`events_reports`, 16). The story-lines
start from `init_stories`: the opening, the Abbs affair, the leaked NATO
papers, Allen, Faulkner, Retson, Nickels, Warburton, Adamson, the
newspaper leak, Johnston and Pasternak, Stockholm, Building 17, Bracton,
and Sopwith and Maras.

Memos, reports and sitreps wait in their trays, shown on three monitors;
each can be filed as a personal file (14 at most, `file_this`), deleted,
or, for memos and reports, acted on: often a question with several
options or a yes or no (`ask_options`), whose answer schedules what
follows.

## Prestige and progress

- `prestige` (`$1939`) starts at 500 (`init_scores`). `add_prestige`
  (`$6131`) ends the game when it falls below 50.
- `progress` (`$193B`) is the percentage of the episode solved, shown by
  ASSESSMENT and at the end.
- The watchers allowed are prestige / 10 + 50: 100 at the start
  (`watcher_allowance`). Each day the change in the allowance is added to
  the watchers free; a cut larger than the watchers free brings memo 43
  (`daily_watchers`).

## Surveillance

- The game knows 16 targets (`target_records`), each with the day from
  which its watchers find something; a surname it does not know becomes
  one of 16 added targets (`new_target`), whose day is 99, so watching
  them never finds anything (`target_day`).
- Each day, for a target whose day has come, the watchers find something
  when their number beats a random number from 1 to 50
  (`watcher_chance`): each watcher adds about one chance in 50 a day.
- A sitrep with nothing found picks one of seven texts, the first twice
  as often as the others (`show_sitrep`).

## The telephone

- The bell rings 22 frames, rests 3, rings 22 and rests 80, a British
  double ring, on voice 3 ring-modulated by voice 2 (`ring_tick`,
  `init_sound`). A call rings for 1,920 frames before it is lost, and the
  line then rests 360 frames (`call_timer`, `phone_check`).
- MAKE A CALL takes the vocabulary's tokens `$20`-`$26` (`dial`), each
  answering until its day (`phone_until`): Blenheim 04382731, Medical
  Security 71288989, Sir Anthony Plumb 12377563, and three found in the
  story, 02586141, 79265856 and 179794433. Token `$21` is an underscore,
  a number that never answers (`init_phone`). Anything else is
  *** NOT VALID ***.
- Blenheim asks CODE OF THE WEEK? (`call_blenheim`). The code word is
  picked when the episode starts (`code_word_choices`): FIREBIRD about
  half the time, PHOENIX or ROCKET otherwise, and memo 35, 36 or 37 gives
  it as one-time pad FP2, FP1 or FP3. With it, files are asked for by name
  and released to Cencom. Files 0-8 are in Cencom from the start, 9-25
  only through Blenheim (`init_files`).

## The voice analysis

The unknown caller's voice print and each suspect's are jagged lines
drawn from a random generator seeded per voice (`draw_line_graph`,
`seed_random`, `voice_seeds`). The unknown voice uses seed 0, the same as
STIG NILSON's, so the matching print is the answer. Only people 0 to 11
have a voice on file (`ask_voice`).

## Building 17

The basement's and ground floor's plans (`basement`, `ground_floor`) are
drawn from tiles (`draw_plan`), and the pointer moves from door to door;
each lock is counted by the kind of room (`lock_counts`). `judge_locks`
(`$7C3F`):

- a lock on a WC brings memo 30, on the staircase memo 29 (the fire
  exits), and the job is set again in three days (`judge_amenities`);
- the building is secure with at least two locks on offices, one on the
  security door, two on the main entrance, two on the computer room or
  data storage, and one on the desk and key room (`judge_security`);
  otherwise memo 31, a break-in, once in 99, and memo 32, a serious
  breach, the rest of the time;
- more than 10 locks bring memo 42, the union's threat of a strike; 10 or
  fewer earn progress 10 and memo 33, the computer's security, in four
  days.

## The end

- Sir Anthony Plumb's six questions (`plumb_questions`, `$501B`, number
  12377563): the traitor DEREK or FAULKNER, his contact's nationality
  SWEDISH, his alias STIG or NILSON, his real name TORS(EN) or
  STENB(ERIJ), the proof FINGERPRINT, and where it happened, GAZA. All six
  right, with the fingerprint found among Holmar's effects in Sweden,
  starts a countdown of 10 days; at its end, or on day 41 with it
  running, the game is won (`day_clock`). Any wrong answer brings the
  JIC's memo and 100 prestige off.
- Day 41 without the countdown loses the game, and so does prestige below
  50.
- `show_ending` (`$47A9`) shows the last memo, then YOU HAVE COMPLETED n %
  OF THE GAME and the prestige, and starts the episode again. The winning
  memo is Sir Nigel Irvine's, with the new password, 10 190 216 277 358;
  the losing one, Harcourt Smith's posting to the penguin colonies of the
  West Falklands.

## Live tests

VICE v3.14.0, 30 October 2026, from a snapshot of the Cencom screen in
play.

| Test | Result |
|---|---|
| 1,000 frames advanced, checkpoints on `irq` and `day_clock` | the frame count in `$1936` up by 1,000; both checkpoints hit 1,000 times |
