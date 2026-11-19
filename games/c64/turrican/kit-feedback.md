# Turrican — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Keep those outcomes in a browser check beside the page": writing `site-browser.js` found eight of the thirteen maps on the Levels tab drawn as a plain sky, because the second and third levels of each world keep the first level's characters and the page did not lay them in.
- `60-verify`: "For each wrong comment, whether the sample is bad or not, say what it believed, search the listing for every comment that says the same, and correct them together": the eight wrong comments of the sample became 178 comments and 8 labels corrected in 14 parts.
- `70-minisite`: "Start with the leads, because a run's best findings can sit in its notes and never reach a page": rereading the leads list against the finished pages found five outcomes that no page held, and the logo, the junk rain and the cut object records went onto pages.
- `70-minisite`: "A `Bug:` is shown happening in a state normal play reaches": ten level bugs seen only in the code stayed leads in `TODO.md`; the ending's tune was watched reading the engine's code in VICE before it became a `Bug:` section.
- `12-media`: "Answer them `data`, and `70-minisite` draws the picture on the Graphics tab and plays the tune with the game's other music": the loading picture, its tune and the speech, which only the boot's own sector chains hold, are on the pages.

## What was changed in the kit

- `kit/c64/snapshot.py` read every snapshot 23 bytes out, because vice-mcp v4.0.0 adds a `C64MEMHACKS` module before the RAM. This run made `snapshot.py` and `check_emulator.py` find the `C64MEM` module by name; A Nightmare on Elm Street's run (#958) made the same fix first, so the merge keeps that one. `kit/skills/c64/c64-reference` now says where the RAM is, in place of a fixed offset of 209. A tool change, shown by the emulator check failing.
- `kit/scripts/parts.py` (`names_under`) takes a name for an address outside a part only from the part whose load wrote that address, or from one whose "names" rows claim it, with a test in `kit/scripts/test_parts.py`. Before, a deeper part's label won where a nearer part's load had replaced the bytes, so level code here read `title_tune_program_21`, and three listings of Turrican 2 changed with it. A script fix.
- The bottom part could not count the hero's last 24 sprite shapes at `$E000`-`$E5FF`, which the title's logo lies over while the title shows, and the coverage stopped short of 100 %. This run added a `"keeps"` row to `part.json` for it; The Spy Who Loved Me's run (#978) added the same idea as `"ranges"` on the bottom part, so the merge keeps that one, and the engine's `part.json` lists `$E000`-`$E5FF` in its `"ranges"`. `kit/skills/core/15-parts`, "A load over a load", now says the bottom part lists such addresses as `"ranges"`; `games/c64/the-spy-who-loved-me` (its `main` part) needed the same.

## Candidates

- **A sprite's mode flag read backwards.** Eight comments in four
  levels said "hi-res" where the game's own flag (bit 0 of `$0259,x`)
  meant multicolour, because the multiplexer moves the bit through the
  carry and sets `$D01C` when it is clear. The sample missed them all;
  drawing the levels' sprites on the Graphics tab, which takes the mode
  from the same reading, showed shapes that only made sense the other
  way, and VICE's sprite registers settled it. A skill could say: when a
  page draws from what a comment claims, compare the drawing with the
  game's screen before trusting either. No other game folder showed the
  same mistake on 18 November 2026.
- **A tune that reads outside its module.** The ending's player reads
  191 bytes of the engine's code through a stray entry in its table of
  sound programs. A page that embeds only the tune's module plays the
  right writes for 14 frames and then drifts, and a test that runs the
  game's player on the same embedded bytes cannot see it. Holding every
  button to the player run on the part's whole memory image, the parts
  beneath included, found it at once (`test_pages.js`). The
  `70-minisite` rule ("which a test beside the page makes again from the
  listing") already implies it; a sentence saying "from the whole
  listing image of the moment, not the bytes the page embeds" would make
  it explicit. No other game folder showed it on 18 November 2026.

## Maintainer asks

None.

## What cost the most time

Knowing that the bottom part can list `"ranges"` would have saved the most: working out why the bottom part could not count bytes that a load above it writes for a while, and giving the parts module a way to say so, was the longest stall of the run.

## Notes for the next run

- Two parts' snapshots called `play.vsf` cannot both be loaded by
  `snapshot_load()` in `kit/c64/vice.py`, which copies a file into
  VICE's snapshot folder under its own name and refuses a different file
  with that name. Copy the second to `/tmp` under another name first.
  The error says so.
- To change a comment in a listing, run `listing.py <part> --recomment`.
  A rebuild from a snapshot other than the one the listing names changes
  bytes that the game changes as it runs. `listing.py` says so when it
  builds over a listing from another snapshot, so read its whole output
  rather than its last lines.
- Host: Linux 6.18 x86_64 in a cloud container with no display; VICE
  release v4.0.0 (vice-mcp) under Xvfb, check-emulator 54 of 54;
  regenerator2000 0.9.20; Python 3.13.18; Node 22.23.5.
