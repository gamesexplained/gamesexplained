# House style for minisite copy

The audience is adults: technical gamers who love game design and want
to know how a game works, and who are not assembly programmers. Picture
a clever reader of 45 who knows games well and has never read this
game's code, and never talk down to them. Assembly is evidence, not the
deliverable. The tone is Hacker News, not Buzzfeed: quiet, precise,
generous with the interesting detail, never breathless.

Article copy is written as a separate, final pass, after the analysis is
done. Give that pass the verified findings and working pages, and focus
on what the reader will learn. It can be done by the same agent. The
final pass has three steps, described in `kit/skills/core/70-minisite`:
a draft written to these rules, `kit/scripts/copy_lint.py` for the rules
a pattern can catch, and one edit for the rest. The reader review
(`kit/skills/core/75-review`) then checks the finished pages.

## What copy is for

- Explain the mechanic, then show the evidence beside it: the bytes, the
  table, the screenshot, the register.
- Lead with what a player would notice; the implementation is the
  explanation of it.
- Secrets, quirks and bugs are the best part. Give them room. The
  unintended corner case, reachable by a player who knows the code, is
  the pick of them.
- Interactivity lets the reader try the rule and see its consequences.
  Choose controls for the experiment they enable.

## Depth and clarity

Plain language can carry a detailed explanation. For an important
mechanic, connect what the player notices to the rule that causes it,
then work through a concrete situation. Explain a boundary or exception
when it changes what the player can do. The reader should be able to
predict another case after reading the section and using its widget.

A counter value or a table entry is the beginning of an explanation.
Work out what it means during play: how often an enemy moves, how long
a resource lasts, which choice earns more, or why a familiar tactic
fails. Check that consequence against the code or a live observation
before publishing it. What the evidence does not settle stays in
`facts.md` as a lead, and the page states what was shown.

Give a discovery room in proportion to what it teaches. Add the context,
causal steps, and examples a newcomer needs; remove repetition and
irrelevant detail. There is no target word count or paragraph count.
The sentence rules below control how each sentence is built, not the
depth of the section. Rewriting a sentence must keep its explanation.

Use the game's own pictures, words, and sounds where they carry the
point. A message beside the situation that triggers it and its sound
can explain more than a description of the message interpreter. Keep
source links beside the explanation so a reader can investigate further.

## Sentences

These rules take the sentence rules of Simplified Technical English
(ASD-STE100), the standard that aircraft maintenance manuals are written
in so that a reader gets one meaning on the first reading, and leave out
its fixed dictionary, because a page about a game needs the game's own
words. The rest come from a study of why AI-written text is hard to read
(Clark, Martin and Mahowald, "Why is AI-generated language so hard to
understand?", arXiv 2610.29162). Its finding matches what the pages
show: the fault in an agent's sentence is rarely its length. It is
compression, more meaning packed into fewer words than a reader can
take in at reading speed. A long sentence that reads at once is fine; a
short one that has to be unpacked is not. Each rule below undoes one
kind of compression.

- One idea to a sentence. A cause and its consequence can share a
  sentence; two findings cannot.
- Say who or what acts: "the game clears the flag", not "the flag is
  cleared". A passive is fine when the actor does not matter.
- Give a thing a thing's verb. A routine reads, sets, checks and skips;
  it does not "swallow" an error or "cheer" a side. Write "the check
  ignores the error".
- Use a noun as a noun. "Footnote it" and "the routine tables the
  scores" make the reader turn a noun into an action; write "add a
  footnote" and "puts the scores in a table".
- Use words in pairings the reader has met before. A phrase made up for
  the page ("a slip in the frame counter", "once a pass", "ten pictures
  apart") stops the reader to decode it. Say the literal thing ("a bug
  in the frame counter", "once each time round the main loop"), or
  explain the term once and keep it.
- One negation to a sentence, and what happens before what does not.
  Two negations make the reader work out what is true ("the animation
  is a monster state that nothing ever sets, so those two frames are
  never seen"). Say it once: "the code holds two frames for a monster
  state that the game never sets".
- Keep the subject next to its verb. "The routine that the game calls
  every frame while the player is in the air sets the flag" holds the
  reader through a clause before the verb arrives; "every frame while
  the player is in the air, the game calls a routine that sets the
  flag" does not.
- Keep the small words: the articles, "that", "which", the verb. A
  sentence with them squeezed out reads like a telegram, and the reader
  has to rebuild it, as with a telegram heading ("Section headings",
  below). Keep "that" before a clause with a subject of its own: "the
  picture that its neighbour had", not "the picture its neighbour had".
- No more than three nouns in a row. "The enemy spawn timer reset value"
  becomes "the value that the spawn timer starts from".
- One name for one thing. Once a page calls something "the energy bar",
  it stays the energy bar, not "the fuel gauge" or "the meter": a reader
  takes a new word for a new thing. Use the game's own name where it has
  one.
- Explain a term where it first appears on each page, in a few words,
  since a reader can open any tab first: a keyword of the game's
  language, a chip or its register, a hexadecimal address, a kind of
  variable. Keep the code, the addresses and the numbers, which are the
  evidence.
- The plainest exact verb, in a simple tense: "starts" for
  "initialises", "the game reads the stick" for "the game will be
  reading the stick". The present tense for what the code does, the past for
  what happened to the game.

## Rules

- Say the thing.
- Numbers go in tables, not prose, unless the number is the point.
- No hype adjectives: elegant, clever, fascinating, remarkable, brilliant,
  masterful, beautiful, ingenious. If it is clever, the explanation will
  show it.
- No stage directions to the reader: "let's dive in", "here's the thing",
  "buckle up", "spoiler alert", "in other words", "put simply". Do not
  tell the reader to notice, listen to or imagine something; say what is
  there ("The last note is held twice as long as the rest"). An
  instruction is fine when it names a control ("Press a direction").
- No rhetorical question followed by its answer.
- No "it's not X, it's Y", "not just X but Y", "more than just". A
  one-beat correction is fine when the reader would genuinely expect
  the wrong thing ("A reconstruction, not a screenshot").
- The page title is the game's name, never a claim ("The X Is A Y").
  The standfirst, the subtitle under the title, carries the hook: the
  most interesting thing inside the game, in a sentence or two. The agent
  writes it with the rest of the copy, and the Gold pass may rewrite it
  like any other line. Section headings may carry a hook of their own;
  keep them short, and prefer the thing over the claim about the thing
  ("The landing test" over "The gauge lies").
- No tidy triplets for rhythm. Two things or four things are fine when
  there are two or four things.
- No em-dashes as the default joint between clauses. Write two sentences,
  or use a colon or parentheses.
- Use the Oxford comma: a list of three or more items takes a comma before
  the final "and" or "or" ("the Doctor, a robot cat, and a mine"). The
  comma removes the doubt over whether the last two items are a pair.
- No summary paragraph that restates the section.
- Name the thing instead of "it" when the reader could mean two things.
  When a sentence opens with "it" ("It ...", "Once it is ..."), and the
  sentence before holds two or more singular nouns, replace "it" with the
  noun it stands for. Not "The hero finds the scroll in a room and takes it
  to a chamber. Once it is delivered, it gives him a power." but "... A
  delivered scroll gives the hero a power."
- Do not describe the tooling or the process ("we pointed an AI at the
  bytes", "all 104,448 pixels match the emulator's picture", "checked
  against the game's code on 6,400 cases"). The reader is here for the
  game. A caption says what the reader is looking at or listening to;
  how it was checked goes in its test and `facts.md`. When a widget
  differs from the game in a way a reader would see or hear, say what
  differs and why.

### Paragraphs

A paragraph makes one point, and the reader should be able to say what it
was. Before keeping a paragraph, state its purpose in a line: "why the
villain needs the base", "how the game picks a walking frame". Then:

- Every sentence serves that purpose. A sentence that is true and
  interesting but supports a different point moves to the paragraph or
  section whose point it serves, or to Discoveries, or is cut. Interesting
  is not a reason to stay.
- The point goes first or last, never in the middle. First suits an
  explanation, so a reader who stops there still has it. Last suits a story
  or a discovery, where each sentence builds towards it.
- Each sentence flows from the one before. Open it with something the
  reader already has (the subject of the last sentence, or a word from its
  end) and end it with what is new. That puts each new fact where the next
  sentence can pick it up. If two neighbouring sentences could be swapped
  without anyone noticing, the paragraph is a list. Order them, or make it
  a list or a table.
- A pronoun has one possible antecedent. Do not open a sentence with "it"
  or "they" when the sentence before names two or more things it could
  mean. Name the thing again.
- One paragraph, one purpose. When the purpose line has an "and" in it,
  it is two paragraphs.
- The paragraph serves its page. Each tab has a purpose of its own, the
  one its subtitle states (Gameplay: what the player does; Graphics: how
  the picture is made). A paragraph whose purpose belongs to another tab
  moves there and leaves a link behind, however well it reads where it is.
  The same holds one level down: a paragraph serves its section's heading.

The test is a human reading the page without noticing how it was made.

### "No X" as the subject

Do not make an absence the thing that acts. "No gate leads to it" and
"no player is told" put "no X" where the subject goes, and the reader
has to turn the sentence round to find what is true. If "no X" would be
the actor, rewrite the sentence so that a real thing acts, or state the
absence plainly. "There is no X" is fine: "There is no music in this
game."

Real examples:

| Original | Improved to |
|-|-|
| Secret: no Malir gate leads to Ja-Karn | Secret: there is no Malir gate that leads to Ja-Karn |
| Its map lists no gates, and no gate in the other eight leads to it | Its map does not list any gates, and none of the other eight systems have a gate leading to it |
| What the code does that no player is told | What the code does that the game never tells the player |

### Section headings

These are important as hooks for the reader – are they intrigued, do they get an immediate sense of what they can learn or play with?
Real examples:

| Original bad heading | Improved to | Why is it better? |
|-|-|-|
| Eighty minus your speed, and a zero that is always there | Secret: it's possible to land while going UP | Spell out the finding, don't be cryptic |
| The needle cannot tell you whether you are about to land | Secret: the landing gauge lets you go over - by one pixel | Spell out the finding, don't be cryptic |
| Sixteen numbers and then it stops | An uneven difficulty curve | Spell out the finding, don't be cryptic |
| A gun barrel, a gunshot, a spoken line and the credits, all driven from one interrupt | One raster interrupt runs the whole intro | The point was at the end of the list; say only that |
| Five digits, one key and one column: how the bomb is defused | The bomb code the game checks is 67134, not 32768 | The finding was in the section, not the heading |
| Codes you cannot win without, a fire that ends the level, and a reset that starts the car chase | Without its code, a section can be played but never won | Lead with the strongest finding; the others have sections of their own |
| City Hall: 75 rooms, a fire that spreads, and two ways out | City Hall, room by room | A map section names the map; the fire that wins the level earns a `Secret:` heading of its own |
| The mine: four winch parts, five digits and the detonator | Every object in the mine, in the order it is needed | Name what the section shows; a count of items is not a hook |
| Secret: the lava burns only the creatures a player moves | Secret: everything the computer moves is immune to lava | Make the surprise the subject; "a player" left the reader to work out who is spared |
| Secret: the dungeon's hawk can be killed, the palace's only driven off | Secret: the hawk can be killed in the dungeon, but in the palace it always comes back | Put back the words the reader was left to carry over |
| Bug: wrecking the scenery cheers whoever killed last | Bug: damaging the scenery raises the morale of whichever side made the last kill | A plain verb says what happens; "cheers" has to be decoded |
| Secret: a death can take an extra back | Secret: dying can take away a power-up you have already collected | Use a plain word for the game's own term until the section has explained it |

A heading is never an inventory. Two to four things strung together with
commas and an "and", often counted, sometimes behind a colon, and with no
verb saying what they do, list what the section contains without saying
what any of it means. The counts mean nothing until the section has
explained them, and the reader has to read all of it to learn which item
mattered. It is the rhythmic triplet from the rules above, moved into the
heading, and a margin full of them is the plainest sign that a machine
wrote the page. Pick the one thing a reader would most want to know and
say it, or name the subject plainly. A section with three findings that
each deserve a heading is three sections.

A heading is never a telegram either. The section list shows it alone,
before the section has explained anything, so it keeps the words that
make a plain sentence: the articles, the "that", the verb, and who does
what to whom. Squeeze them out and the reader has to rebuild the
sentence: a clause stripped of its "that" and its actor ("the creatures
a player moves"), a word to carry over from the first half ("the
palace's only driven off"), a verb used as a figure of speech ("cheers",
"walls out", "paints"), or a term that only the section explains ("an
extra", "the arcade"). Put them back: twelve words that read at once beat
six that have to be worked out. Make the surprise the subject and say it
positively: the news in a lava that burns only the players' creatures is
that the computer's are immune.

## Declare provenance

`game.json` records who wrote the copy: `agent-draft` (agent-written, no
human has read it yet), `agent` (agent-written, read by a human and left
as it was), `human-edited`, or `human`. Silver ships as `agent-draft`.
Gold means a human went through it, so Gold copy is anything but
`agent-draft`: `agent` when they read it and found nothing to change.
Human copy is preferred and always wins a disagreement. Writers who are good at this are
welcome to show it.
