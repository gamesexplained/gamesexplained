# The reader's brief

`75-review` gives this file to the reader: an agent that wrote none of
the pages. Send the brief below the line as it is, and add for this
game:

- the game, its platform and folder, and how to open the built site
  (`AGENTS.md`, step 4);
- the leads list from `70-minisite` ("Plan the explanation"), each lead
  with its outcome;
- where to write the findings: `work/reports/reader-review.md`, unless
  the run has a reason to do otherwise.

Tell the reader nothing about which sections you think are weak.

---

You are reading a site that explains how one game works. Its readers
are technical gamers who love game design and do not read assembly. You
wrote none of it. Find where the pages fail that reader, and say exactly
where. Change nothing.

## Read it as the reader

Open the built pages. Read each authored tab from its beginning as
someone who has never played the game. Use every control from its
initial state, at a desktop width and at a phone's. Bring a section into
view before judging its canvas or animation.

For each section, answer from the page itself:

| Question | What a strong section provides |
|---|---|
| What am I learning, and why does it matter in play? | A clear point, grounded in something a player sees or does. |
| What causes it? | A connected explanation of the rule, with the routine linked beside it. |
| Can I follow a concrete case and predict another? | A worked example or demonstration, with the conditions and exceptions that matter. |
| What can I try, and what does the result mean? | Understandable controls, an informative starting state, and visible feedback tied to the rule. A section that teaches its point with a picture or prose needs no controls. |
| Does the page state what happens? | The finding told as fact. What was not settled, and how anything was tested, stays in `facts.md`. |

Answer with a sentence or example from the page, not a score. Quote
each sentence you had to read twice to follow, and say what stopped
you: a phrase you had to decode, a term not yet explained, two
negations, or a subject far from its verb.

## Compare the notes with the pages

The site's reason to exist is what a player who finished the game would
not know: bugs, cut or unreferenced content, places where the code
differs from the instructions, and one case handled differently from the
rest. Read `facts.md` and `features.md` for every such finding, and
check each against the leads list and the pages. Report a finding
missing from the list, a lead whose section reduces it to a number or a
passing sentence, and a lead kept off the pages for a reason that does
not hold.

These weak treatments are common. The pages named show what each should
become; borrow the treatment, not the page's structure.

| A weak treatment | What it should become | Worked example |
|---|---|---|
| `facts.md` says one enemy keeps its own counter; no page says what that means. | A Discoveries section: how often it moves, what that means for escape, compared with the others. | `games/spectrum/ant-attack/discoveries.html` |
| `facts.md` calls a block of shapes, rooms or tunes "retained" or unreferenced. | The content itself, drawn or played from its bytes, beside the search that found nothing uses it. | `games/c64/hammerfist/discoveries.html` |
| `features.md` traces a region drawn another way, or a switch that can lock the game; Discoveries has neither. | A section for each: what the player sees, then the rule behind it. | `games/c64/fantasy-world-dizzy/discoveries.html` |
| A finding ends with what a test did or did not establish. | The finding as fact. | `games/c64/count-duckula/discoveries.html` |
| Two sliders report a decision as numbers. | The figures on a piece of the map, a step, and the decision the code makes. | `games/spectrum/ant-attack/index.html` |
| A sound picker lists numbered effects. | Each effect named by what sets it off, beside that event, message or picture. | `games/c64/impossamole/index.html` |
| A table names the monsters, spells or items in words. | The game's own picture in each row. | `games/spectrum/lords-of-chaos/index.html` |
| Each animation hides behind a selector. | Related figures moving together, each with its part in play. | `games/c64/count-duckula/graphics.html` |
| A switch changes an internal state and the picture stays the same. | A scene on which the switch's effect shows. | `games/spectrum/ant-attack/index.html` |

## Report

For each weakness, give the tab and section, what a reader cannot get
from it (quote the page where you can), and what would fix it. List the
findings missing from the leads list on their own. Name the sections
that passed, each with a line on why. Recommend no padding: a short
section that teaches its point passes, and a missing discovery is never
filled with a guess.
