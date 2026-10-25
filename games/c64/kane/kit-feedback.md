# Kane — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A rate read from the code": after the sample found loops' paces stated as once a frame, I put counting checkpoints on the last raster handler and on each loop, and rewrote every comment that gave a pace from the counts.
- `50-coverage`: "An unpacked load can run on past its own data": I ran each unpacker over its stream in a simulator to find where the stream ends, which gave the end of every packed picture and sprite set and the gaps between them.
- `50-coverage`: "Before calling 100 %, go through that list": the list held the status lines' character set and the sprite shapes under the I/O area, now declared in `game.json`, and two short stretches inside tables, now labelled.
- `10-orient`: "Save the hand-over too": the start-up copies three sprite shapes from `$4000` into the stack page and play overwrites `$4000`, so the listing is built from the hand-over with play as the second image.

## What was changed in the kit

- `kit/skills/core/50-coverage`: a rule that a pace in a comment ("once a frame") is a measurement, counted in `60-verify`, and that until it is counted the comment says what the loop waits on; `games/c64/way-of-the-exploding-fist` took its exchange loop for once a frame in the same way (`kit/lessons/2026-10-25-kane.md`).

## Candidates

None.

## Maintainer asks

None.

## Tools and what they did

- Linux x86_64, Ubuntu 24.04.5, in a cloud container. VICE v3.13.2 (the
  release zip) needed its libraries unpacked into `tools/vice-libs`, as
  `kit/c64/INSTALL.md` says; `check-emulator` then passed 57 of 57.
  regenerator2000 0.9.20 built with cargo into `tools/cargo`.
- The original tape (`Kane.tap`, a raw C64 tape image) autostarted and
  loaded in VICE without help: about 331 seconds of emulated time to the
  hand-over. The kit has no tool that lists a tape's files; their names
  came from decoding the standard-speed header blocks by hand. A disk
  game's catalogue comes from `kit/c64/disk.py`, so a tape run spends a
  little longer here.
- Short joystick taps through `vice.joy` often went unread in the
  shoot-out, probably because its loop makes one pass every 2.8 frames:
  hold the input for several frames, or poke the state the press would
  set.
- `frame.py compare` drew the canyon's and the shoot-out's frames with one
  pixel different from VICE's picture, at line 225, light grey in VICE's
  picture; the ride's frame matched in every pixel. The page shows the
  ride's frame.
- A full-page Playwright screenshot of a built page is blank below the
  first screen, because sections off the screen are skipped
  (`content-visibility`). Scroll each section into view and screenshot
  it with `locator.screenshot`.

## What cost the most time

A rule in `50-coverage` that a loop's pace in a comment must be counted before it is stated would have saved the most: the belief that the main loops run once a frame put four wrong comments in the sample and took a round of live counting and the correction of every comment that gave a time in frames to undo.
