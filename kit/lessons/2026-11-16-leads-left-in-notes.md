## 0.0.350 · 2026-11-16 · Ant Attack (Spectrum) and Fantasy World Dizzy (C64) · air and 64kramsystem with Codex, reviewed by air with Claude

- **A run's best findings can sit in its notes and never reach a page.**
  The Ant Attack run (gpt-6.1-sol, 6 November 2026) wrote in `facts.md`
  that "`$BC00–$BCFF` contains retained shapes whose actor-frame consumer
  is unestablished", and that BASIC line 190 resets the movement counters
  of ants 2 to 5 while "ant 1 retains its separate initial value 20".
  Neither reached a page. The pass that followed (#934 and #940, 15
  November 2026) made them its two Discoveries headlines: four pictures
  of an aeroplane that no code draws, and one ant that moves on 19 turns
  in 20 while the others stop every other turn. The Fantasy World Dizzy
  run (#907, gpt-6.1-sol) traced Australia's reversed rooms and left the
  cage that can lock a coin away as an open row of `features.md`; its
  Discoveries tab held one section until #925 checked both in VICE and
  added them. A list of every lead, each given a section or a reason it
  stays a lead, puts a dropped one in front of the reviewer
  (`70-minisite`, "Plan the explanation").
- **The gap shows to a reader holding the notes beside the pages.** Both
  runs passed their own checks and CI, and merged as Silver. A
  later pass that read `facts.md` and `features.md` against the pages
  found what they had left out. `60-verify` gives the listing to a
  checker that wrote none of it for the same reason, and the new step
  `75-review` gives the finished pages to such a reader.
- **A browser check that only clicks proves nothing.** The Ant Attack
  check pressed the FLASH button and asserted nothing after it, accepted
  the Listen button's label changing to "Playing" as proof of sound, and
  the Animate button's pressed state as proof of animation. A check now
  asserts the result the widget promises (`70-minisite`, "Check it in a
  browser").
