# Lemmings — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status. Every address names its part.

Sources:

- The C64 manual, Psygnosis 1993, scanned at
  https://www.gamesdatabase.org/Media/SYSTEM/Commodore_64/manual/Formated/Lemmings_-_Psygnosis.pdf,
  read 20 October 2026: the rules, the skills, the controls and the
  sixteen tables of numbers the code sheet asks for (pages 3-18)
- C64-Wiki, "Lemmings", https://www.c64-wiki.com/wiki/Lemmings, read 19 October 2026: credits, the menu and in-game keys, the eight skills, the four ratings, level passwords, two screenshots and the icon bar (saved in `reference/` as `wiki-*`)
- Codetapper's C64 Site, "The Making of Lemmings", parts 1 and 2, https://codetapper.com/c64/diary-of-a-game/lemmings/the-making-of-lemmings-part-1 and https://codetapper.com/c64/diary-of-a-game/lemmings/the-making-of-lemmings-part-2, read 19 October 2026: the programmer's development diary. Read through a page summariser; its quotations were not checked word for word
- A web search on 19 October 2026 whose result summaries quote Commodore Format (an "unobtrusive multiload"; 30 lemmings at most) and 64'er 2/94 (Psygnosis brought the first copies in February 1994). Second-hand: used for plain claims only
- Mark Knibbs's notes with the disk images (`Lemmings.readme`, 1997): the printing on the three disks
- The game's own screens and text, observed in VICE on 19 and 20 October 2026

Credits, from the title scroller (`$5A49`, menu part), which the C64-Wiki
and the diary agree with: "Lemmings by DMA Design", "C64 Version by E&E
SOFTWARE", programmed by Thomas Mittelmeyer, graphics by Leon van Rooy,
Alain Janssen and Nikaj Eyk, audio by Jeroen Tel (Maniacs of Noise),
additional graphics by Remi Ebus and Thomas Mittelmeyer, produced by Greg
Duddle, project management by Remi Ebus, "Copyright 1993 Psygnosis". The
manual also credits Jeff Culshaw with testing. The play engine's sound
driver carries the text "(C) 1993 JEROEN TEL / MANIACS OF NOISE" (`$3009`,
game part). The disks are printed © Psygnosis 1994.

## Features

| Feature | Status | Where |
|---|---|---|
| Copy protection: a number from one of sixteen tables in the manual, picked by the lemming picture beside it | live | `code_sheet` (`$A0D8`, menu part). The page (0-15) and line (0-19) come from mixing the raster line ($9EF6); every number is the page's first ($A070/$A080) plus 23,171 per line, less 56,831 when the sum reaches it. All 320 match the game's code (`test_code_sheet.js`); the manual's tables checked by eye on pages 15 and 18 |
| Title menu: 1 starts the game, 2 the intro, 3 enters an access code, 4 switches music and sound effects, cursor up and down the rating | live (1, 3, 4), traced (2, cursor) | `title_screen` (`$9195`, menu part). 1, 3 and 4 tried on 20 October 2026 (`work/menurun.py`); cursor down left the rating at Fun as the run drove the keyboard, so the rating keys are traced only |
| Four ratings, Fun, Tricky, Taxing and Mayhem, 25 levels each | confirmed | the names at `$9D64` (menu part); one disk side each, 25 level files a side; `level_number` (`$CB48`, resident part) runs 0-99 |
| 100 levels ("100 brain-teasing levels", title scroller) | confirmed | all 100 level files unpacked with the game's own code and drawn (`levels.html`, `work/levels.js`, `work/maps.js`). The diary's 120 was a plan |
| An access code for each level | live | ten letters in each level's header (`$E005`, game part) and in a table of all 100 (`access_codes`, `$9701`, menu part). the access code prompt answered WANNABFREE (`reference/cheat-mode.png`); the end screen prints the next level's code (`reference/cheat-level-end.png`). Another level's code typed at the prompt was not checked on screen |
| Each level's briefing: number of lemmings, percentage to save, release rate, time, rating | live | from the level header at `$E000` (game part); level 1: "Just dig!", 10 lemmings, 10 % to be saved, release rate 50, 5 minutes, Fun (`reference/briefing-fun1.png`). All 100 in `levels.html` |
| Eight skills with a count each: climber, floater, bomber, blocker, builder, basher, miner, digger | confirmed | the counts at `$E044`/`$E04C` in the header, in the panel's order; the eight routines that give a skill from `$15BA`/`$15C2` (game part); 21 action handlers from `$1E6A` |
| Keys 1-8 pick a skill, + and - change the release rate, fire gives the skill to the lemming under the cursor | traced | `read_keys` (`$0A5A`) and `key_action` (`$0AB4`, game part): 1-8, +, -, SHIFT, DEL and the back arrow; the rate goes no lower than the level's own and no higher than step 23 |
| SHIFT pauses; DEL twice blows up every lemming | live (pause), traced (nuke) | `key_action` (`$0AB4`); pause used live on 20 October 2026 |
| Run/Stop returns to the menu (C64-Wiki) | differs | the play engine reads no RUN/STOP; the back arrow ends the level, and only while paused (`$0AF5`, game part). *Live*, 20 October 2026 |
| Mouse or joystick | traced | joystick on port 2 (`read_joystick`, `$0B3C`); a 1351 mouse through the SID's paddle registers (`read_mouse`, `$1704`, game part; the menu's test at `$A279`). No mouse was attached in VICE |
| The panel shows the type under the cursor, lemmings out, saved percentage and time left | live | `draw_panel_text` (`$29B5`, game part); `reference/play-fun1.png` |
| A five-second count over a bomber before it explodes | traced | count digits drawn above a lemming whose fuse burns (`$48D4`, `$1CD2`, game part); the nuke gives every lemming a fuse of `$BF`. The count was not timed |
| The play area scrolls left and right at the cursor; levels are two screens wide | confirmed | `scroll_view` (`$0C90`) and `read_mouse`'s edges (game part). A level is 312 multicolour pixels, 624 screen pixels, wide, and the play area shows 168 screen pixels of it |
| The scenery is drawn with sprites, the lemmings in characters (the diary) | live | one recorded frame redrawn to the pixel (`index.html`, section 2): eight sprites side by side, moved down every 21 lines by raster interrupts; the lemmings ORed into fresh characters each pass (`draw_lemming`, `$1AA2`, game part) |
| Up to about 100 lemmings on screen (the diary), 30 at most (Commodore Format via a search summary) | differs | the tables of play hold 50 lemmings (`lemming_action`, `$0424`, resident part), and the most any level has is 50 |
| Digitised "Let's go" and "Oh no" (the diary) | open | the play engine's driver writes the three voices only, and the NMI vector in play is an RTI (`$0B56`), so a sample would need another way; none was found. The six effects are SID notes (`facts.md`, "Sound"). The ending has a sample channel (`sample_nmi`, `$0938`, ending part) |
| Music by Jeroen Tel, "10 pieces of music" (title scroller) | confirmed | eleven tunes: the intro's (intro part), nine level tunes in the files SA-SI and the end tune (ending part); `index.html` plays them all on the game's own players |
| A multiload | live | each level is a file on its rating's disk side; starting the game asks for disk 2 side A (`reference/insert-disk-2a.png`) |
| Messages at the end of a level, by how well it went | live | `choose_message` (`$53CF`, game part) by the lemmings saved against the level's count and the number to save; `reference/cheat-level-end.png` |
| A message for finishing all 100 levels, then an end sequence | traced | "You are one of the very few players who will complete all the levels" (`$DACA`, game part); the file IC, run at `$C400` (ending part): a picture and a tune with a sampled applause, 2,592 frames or until fire. *Live*: reached in VICE by setting the level number (`$CB48`, resident part) to 99 at level 1's briefing and winning that level (`work/toend.py`); level 100 itself was not played |
| Skills that last (climber and floater; both make an "Athlete") (manual) | traced | flags in `lemming_flags` (`$0456`, resident part): bit 1 climber, bit 2 floater |
| Metal that cannot be dug or blown away (manual) | traced | the level's map of special cells, two bits a cell: 1 steel, 2 and 3 one-way walls (`cell_kind`, `$2E07`, game part) |

## Beyond the documentation

Found in the code, not in the manual.

- The access code of level 1, WANNABFREE, typed at the title turns on a
  cheat: "Cheatmode Activated", and a level given up counts as 100 %
  saved. **live** (`find_access_code`, `$9BC4`, menu part; `$CB61`,
  resident part; `discoveries.html`).
- The briefing compares the access code in the loaded level file with the
  one the menu expects, and stops the machine with a red border when they
  differ. **live** (`show_briefing`, `$526E`, game part).
- "HACKING AT THE END OF THE LEMNIVERSE" at `$A184` (menu part); no
  instruction reads it.
- An unused routine at `$2910` (game part) that would read a terrain
  pixel's colour.
- 33 of the 300 lemming frames, 31 images, are never drawn: the odd
  frames of the basher and the miner, 189-195 and the floater's first
  (`graphics.html`).
- The panel's character set at `$7000` holds the panel's text and its
  four sprite shapes inside it (game part).
- Each level stores the number to save already rounded up from the
  percentage (`$E040`); the end screen compares with it.
- The intro's lemmings are pairs of sprites, a black hires outline over a
  multicolour body, with the lower pairs multiplexed by raster bands
  (intro part).
- The title scroller holds a greeting list, skill hints, a Star Trek line
  and a disclaimer ("4. The kindergarten music.").
- The disk has a second boot file, `THE SHORTCUT`, three bytes longer than
  `LEMMINGS`; what it does differently is open.

## Open questions

- The digitised speech the diary mentions.
- What `THE SHORTCUT` does differently from `LEMMINGS`.
- The bomber's count in seconds.
