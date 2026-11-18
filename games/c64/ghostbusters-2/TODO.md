# Ghostbusters II — follow-up work

The analysis is at Silver: 100% annotation coverage across 11 parts, an answered media ledger, and a maintainer's sample of 60 listing comments on a proven model that found two wrong, both corrected (`facts.md`, "The listing's error rate"). What is missing for the next tiers, and the leads that stay open:

- A full independent audit of the listing remains recommended. Every sample so far is a lower bound on the error rate.
- Reproduce the stale proton-beam hit (`parts/museum/facts.md`, "Stale beam flags and pickup suppression") in ordinary play against Vigo. Only a forced setup has shown it. Twelve shots at the moving opponent from the original disk on 17 November 2026 did not land, so it stays a lead with no Discoveries section; once a recorded play route shows one beam doing damage alone, it becomes a `Bug:` entry.
- Find what two sound requests mark on the screen: effect 6 in the airshaft (`$898C`, `$8A20`, the end of a sixteen-step character-set animation while `$AF0F` is set) and in the museum (`$824A`, the timer at `$820F` running out after Oscar leaves his crib). Effect 7 is settled (`parts/museum/facts.md`, "Proton-beam sound").
- Find what Broadway's extra animation shows: while sprite 0's pointer (`$B1F4`) holds one of nine values, `$876F` runs `$8B88` instead of the scroll, with effects 5 (`$8BC2`) and 24 (`$8BF0`), and it ends by replacing the fireball (`$91A2`). A VICE run of 600 frames without input did not reach it. Once it is identified, add its two requests to the How it works sound table.
- Test Broadway's ghost-script commands `$0D`, `$11` and `$12`, which none of the 113 scripts uses and whose handlers move the processor's stack pointer (`parts/broadway/facts.md`).
- Check whether anything reads the pointer sequences at `$A346–$A363` after the opponent's emergence animation (`parts/museum/facts.md`).
- Check the nine pitch-offset sequences at `$E668` that the complete cycles of three tunes did not select against the remaining tunes.
- Record a complete museum playthrough. The airshaft and Broadway each have a complete clean-play-to-win input recording, replayed in VICE; the museum has the rope segment and the doorway trap (`museum-trap-route.json`), both from a captured museum start.
- Record and replay a complete route from power-on. The later-episode captures use forced success paths.
- Investigate whether retained helper code and load fragments have additional consumers beyond the recorded routes, including the 10,878 retained airshaft bytes and the story-engine self-copy routine.
- Analyse the original release (C64 Preservation Project G64, both PAL sides) as parts of its own. It stores its loads unpacked, its story engine and loader differ from the cracks', and its second story's text and outcome messages are the real ones (`facts.md`, "The original disk"). The listings describe the Censor and Jondi loads.
- Find which film songs the tunes are. The credits name Ray Parker Jr.'s Ghostbusters theme and Higher and Higher, and the player labels the tunes by where they play.
- Find what a player sees when the second Ghostbuster's proton toggle (`$A080`) reads the first one's pickup flag `$9486` in place of his own `$9487` (`parts/museum/facts.md`, "Stale beam flags and pickup suppression").
- Rule out computed pointers for the museum's shapes `$A0–$A7`: no immediate load or pointer table selects them (`parts/museum/facts.md`, "Shapes `$A0–$A7`"), but a base plus a frame number could. If none reaches them, draw them on Discoveries.
- Draw the six bytes of each airshaft map record that the expander never reads (153 records of 20 bytes; it reads 14) through the same tables, to see whether they are wall columns.
- Check the museum lookup grid's value 5, which no reader treats differently from the others (`parts/museum/facts.md`).
- Find out what the Censor crack's Broadway street is beyond its first 298 bytes: 4,593 more bytes differ from the original's, and whether they are a shift, damage or a different street is not recorded.
- Check whether the original disk has the text `newline` between Broadway's coordinate views (21 spans, 167 bytes, never read), and whether the airshaft's emptied routine `$B343` (a lone `RTS` with two callers) is a cut behaviour.
- Check whether the beam and shot restores, which repaint a fixed colour (`$0A` in the airshaft, `$0D` for Broadway's shots) in place of the cell's own, leave a visible trail.
- Draw the story-font characters above `$75` that no stored text selects (`parts/title/facts.md`).
- Say on the museum panel picture which item picture is the slime weapon, the proton beam and the empty hand (`$3C`, `$3D`, `$3E`).
- Name the sprite shapes the Graphics tab's shape chooser shows as "Not on a card above": the airshaft's `$00`, Broadway's `$07`, `$09`, `$0E`, `$0F`, `$BE` and `$BF`, and the museum's `$05–$07`, `$09–$0B`, `$97` and `$B8–$BF`. Also name Broadway's `$06`, `$0A` and `$0B` and the museum's `$04` and `$08`, which the chooser knows only as sprites in the captured frames, and the equipment panel's `$3B`.
- Consider a Discoveries entry for the two sequences whose first shape is never drawn: the airshaft's hit sequence (`$A8`) and Broadway's knocked-down frames (`$96`) both step their count before reading.
- Find what happens when Broadway's fireball touches one of the three walkers (`$9AEA`, `$9B71`: a flag is set and the fireball goes back to `$66/$74`), and say it on How it works once it is seen in play.
- Human curation is required for Gold. A complete independently checked JavaScript port would be a separate Platinum project.
