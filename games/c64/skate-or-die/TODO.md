# Skate or Die! - TODO

The tier is Silver: all nine parts, the loader, the title, the resident
loader and event manager, the shop and town and the five events, are at
100 % coverage with facts and pages. What is missing for the next tier:

## For Gold

- A human pass over every section of every page (`kit/START.md`). The
  first pass (October 2026) rewrote the Overview, added the Controls tab
  and Rodney's lines, and linked and restyled every tab; the steward's
  own read of each section is still to come.

## Open questions

- Competition play end to end (sign-in, NEXT SKATER, the points, the
  records screen) was read from the code and simulated, not played live.
- Whether the high-score save works on this disk pair was not tested.
- The title's sampled guitars are not in the page's player: `site/lib/sid.js`
  does not model sound made through the volume register. The page plays
  each sample alone.
- Downhill Jam: ride the covered passage under the roof at rows 157-171
  (`parts/jam/facts.md`, "The secret path") live, to confirm it.
- Downhill Race: whether five water jumps without a fall are possible.
- High Jump: whether sprite 7 is meant as a shadow; what the scale value
  `$51`/`$52` does on screen.
- Boot: how the protected track 2 was mastered (only the check is known).
- High Jump: whether pressing fire a little before the top of a pass gains
  the half-foot bonus.
- The reception has one review. Zzap!64's full review (issue 33), and the
  C64 reviews in CCI, C&VG, ACE, and Commodore User, wait on sources this
  session could not read.
