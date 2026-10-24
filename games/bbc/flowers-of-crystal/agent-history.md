# Flowers Of Crystal — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 24 October 2026, the Silver run

Aaron asked whether the game was on archive.org, then for the whole run
to Silver with a plug for 4Mation's Retro edition on the front page. The
disc came from the TOSEC BBC Micro set (`game.json`, `build`). 4Mation
still sells the game, so Aaron chose to withhold the listing, as for
Granny's Garden: `publish_source` is false and the pages carry only the
listing pieces they read.

- **Orient.** The disc holds 17 files: eight BBC BASIC programs and the
  machine code the adventures call. Each program load is a part, eight in
  all, each analysed as `CHAIN` loads it at &1900. Menu choice 1 stopped
  with `Bad program`: `STORY`'s catalogue length is one byte short
  (`orientation.md`). Writing &FF after the program, `OLD` and `RUN` got
  the story going for the screenshots.
- **Features.** The story book scan on mocagh.org named the people and
  places; the teacher's guide was not found. Part 1 was played through in
  jsbeeb to all seven treasures, with `P%` and `N%` poked to reach places
  quickly; part 2 was reached with 197 and its places by `jump.py`, which
  sets the resident integers, patches line 32000 to keep `A%` and presses
  SHIFT-f0 to make the program `RUN` at `Z%`.
- **Annotate.** The six small programs first, then the story, then the
  two adventures and their machine code, to 100 % with one agent. Each
  routine of machine code is the same eleven instructions round a VDU
  table, which made the flower's six pieces quick to read and exact to
  port.
- **Verify.** One checker on a fresh agent read 60 comments drawn with
  seed 20261024. It marked five wrong in a detail and one doubtful; read
  against the code, all six were wrong. The errors were in what pictures
  show (the factory gate's railings called gum trees, the forest's back
  row of trees called the front, the Pouncer's arms held out called
  hidden) and in conditions stated too broadly. All six were corrected,
  with the comments that said the same. Live checks: the river and its
  `B%` flag across a fresh start, all 56 journeys, the 19th `Map`
  (error 44), the LIST guard, Fibber's detector, the Fright Freak taking
  every item, `END` at the end of part 1, and PROChaz run 2,000 times for
  each of six settings by `work/scripts/hazardroll.py`.
- **Minisite.** The flower and the map are drawn by the pages' own copy
  of the MOS's VDU handling and matched jsbeeb's screens byte for byte.
  A full-page screenshot showed every section below the first screen
  blank, because the pages skip drawing sections off the screen; a
  script that scrolled each section into view and shot it alone fixed
  that. A link to `source-sound-1.html` failed the build: a withheld game
  has no Source page for each part.
- **Wrong turns caught on the page.** The Maps tab's first spells table
  printed the three next-place DATA lists for all ten places; reading
  lines 10035-10062 and each danger's own line showed most entries are
  never read or are set again by the place, and the table was rewritten
  from the code. The Discoveries draft called the spitter's "You are
  safe." an accident and the storm's and the cave's deliberate; all three
  lines are built the same way, and the section was rewritten
  (`kit/lessons/2026-10-24-flowers-of-crystal.md`).
- **Not played.** A flower spell in the bubble's flight sets `Z%` to 1,
  and line 10050 then takes a later vanishing spell for a moving one.
  That is read from the code only (`features.md`, open questions).
