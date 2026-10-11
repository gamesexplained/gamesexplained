# Skate or Die! - TODO

The tier is Silver: all nine parts, the loader, the title, the resident
loader and event manager, the shop and town and the five events, are at
100 % coverage with facts and pages. What is missing for the next tier:

## For Gold

- A human pass over every section of every page (`kit/START.md`).

## Open questions

- Competition play end to end (sign-in, NEXT SKATER, the points, the
  records screen) was read from the code and simulated, not played live.
- Whether the high-score save works on this disk pair was not tested.
- The title's sampled guitars are not in the page's player: `site/lib/sid.js`
  does not model sound made through the volume register. The page plays
  each sample alone.
- The event music of the ramp, race, Jam and joust has no player on the
  page; the drivers are High Jump's, moved, and would need a test each
  against the game (`tests/music.js` is High Jump's).
- Downhill Race: whether five water jumps without a fall are possible.
- High Jump: whether sprite 7 is meant as a shadow; what the scale value
  `$51`/`$52` does on screen.
- Boot: how the protected track 2 was mastered (only the check is known).
