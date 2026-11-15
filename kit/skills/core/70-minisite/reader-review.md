# Review the site as a reader

Silver should stand on its own, with at most a few human edits. Use this
review when planning the pages and again after the copy and browser
checks. Passing tests establishes specific facts about the implementation;
read and use the pages to judge whether they explain the game.

## Start from the published experience

Open the built pages with the verified notes available for checking.
Read each authored tab from its beginning as someone who has never
played the game. Use the controls from their initial states. Bring a
section into view before judging its canvas or animation. Inspect both
desktop and narrow layouts.

For each important section, answer these questions from the page itself:

| Question | What a strong section provides |
|---|---|
| What am I learning, and why does it matter in play? | A clear point, grounded in something a player sees or does. |
| What causes it? | A connected explanation of the rule, with evidence beside it. |
| Can I follow a concrete case and predict another? | A worked example or demonstration, with the relevant conditions and exceptions. |
| What can I try, and what does the result mean? | Understandable controls, an informative starting state, and visible feedback tied to the rule. A static explanation may need no controls. |
| What am I being asked to take on trust? | Source links and honest limits; checked conclusions, with speculation kept out of the explanation. |

Answer with a sentence or example from the page, not a score or a list
of completed components. A section that names a routine and shows its
inputs can still leave all of these questions unanswered.

## Compare the findings with the explanation

Return to `facts.md` and `features.md`. Check that the strongest verified
consequences reached the page. A value left unexplained, a message
mentioned without showing what it says, or an exception buried in a
table is a candidate for development. Choose what helps explain this
game; an exhaustive listing does not require an article about every byte.

These are patterns to adapt, not a required set of widgets:

| A weak treatment | Develop it into |
|---|---|
| “One enemy uses a different delay.” | Explain how often it moves and what that means for escape; compare the enemies moving under the same conditions. |
| Two distance sliders report a pursuit decision. | Show positions, a step, and the resulting decision; let the reader try a case where a wall or direction changes the outcome. |
| A sound picker lists numbered effects. | Identify what triggers each sound and show the associated event, message, or picture where useful. |
| Every animation is hidden behind a selector. | Put related moving figures together when that makes comparison easier, with their gameplay roles. |
| A toggle changes an internal state but the picture stays the same. | Choose data that visibly demonstrates the property, then assert the promised change in the browser check. |

For worked examples, inspect `games/spectrum/ant-attack/index.html`
(following, pursuit, and messages), its `discoveries.html` (the race),
and `games/spectrum/lords-of-chaos/index.html` (pictures in tables).
Notice how each presentation connects an observation to an explanation.
Their page structure and widget count are not targets for another game.

## Repair and finish

Fix missing causal steps, useful examples, unexplained terms, and
controls whose result is hard to see. Cut repetition and process talk.
Read the changed section again: added detail must be checked, and a
shorter version must still teach the same thing. Repeat the affected
browser and routine checks when a repair changes behaviour.

Do not add words, controls, or speculative discoveries merely to fill
out a page. Open research questions remain open under the existing
verification rules. Explain any limitation that changes what the reader
can conclude, and keep the detailed research record in `facts.md`.

Record a short review in `agent-history.md`: the sections inspected,
the concrete weaknesses found and fixed, the browser outcomes checked,
and any remaining limits. If no change was needed, give a concrete
example of a section that passed the review and why. This record makes
the judgement reviewable; it does not replace making the judgement.

Complete the repairs before calling the minisite Silver. Gold still
requires a human to curate every section, even when they leave it as it
is. A later human pass can refine the emphasis or add a personal
perspective to an already useful explanation.
