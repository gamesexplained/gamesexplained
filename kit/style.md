# House style for minisite copy

The audience is technical gamers who love game design and want to know how
a game works, and who are not assembly programmers. Assembly is evidence,
not the deliverable. The tone is Hacker News, not Buzzfeed: quiet,
precise, generous with the interesting detail, never breathless.

Article copy is written as a separate, final pass, after the analysis is
done. It is never produced by the same run that produced the facts. The
final pass has two steps: the draft, then a rewrite pass that applies the
rules below mechanically, paragraph by paragraph, as described in
`kit/skills/core/70-minisite`.

## What copy is for

- Explain the mechanic, then show the evidence beside it: the bytes, the
  table, the screenshot, the register.
- Lead with what a player would notice; the implementation is the
  explanation of it.
- Secrets, quirks and bugs are the best part. Give them room. The
  unintended corner case, reachable by a player who knows the code, is
  the pick of them.
- Interactivity beats description. If the reader can press it, let them.

## Rules

- Plain sentences. One idea each. Say the thing.
- Numbers go in tables, not prose, unless the number is the point.
- No hype adjectives: elegant, clever, fascinating, remarkable, brilliant,
  masterful, beautiful, ingenious. If it is clever, the explanation will
  show it.
- No stage directions to the reader: "let's dive in", "here's the thing",
  "buckle up", "spoiler alert", "in other words", "put simply".
- No rhetorical question followed by its answer.
- No "it's not X, it's Y", "not just X but Y", "more than just".
- The page title is the game's name, never a claim ("The X Is A Y").
  A subtitle carries the hook, if a human writes one. Section headings may
  carry a hook of their own; keep them short, and prefer the thing over
  the claim about the thing ("The landing test" over "The gauge lies").
- No tidy triplets for rhythm. Two things or four things are fine when
  there are two or four things.
- No em-dashes as the default joint between clauses. Write two sentences.
- Use the Oxford comma: a list of three or more items takes a comma before
  the final "and" or "or" ("the Doctor, a robot cat, and a mine"). The
  comma removes the doubt over whether the last two items are a pair.
- No summary paragraph that restates the section.
- Do not describe the tooling or the process ("we pointed an AI at the
  bytes"). The reader is here for the game.

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

### Section headings

These are important as hooks for the reader – are they intrigued, do they get an immediate sense of what they can learn or play with?
Real examples:

| Original bad heading | Improved to | Why is it better? |
|-|-|-|
| Eighty minus your speed, and a zero that is always there | Secret: it's possible to land while going UP | Spell out the finding, don't be cryptic |
| The needle cannot tell you whether you are about to land | Secret: the landing gauge lets you go over - by one pixel | Spell out the finding, don't be cryptic |
| Sixteen numbers and then it stops | An uneven difficulty curve | Spell out the finding, don't be cryptic |

## Declare provenance

`game.json` records who wrote the copy: `agent-draft` (agent-written, no
human has read it yet), `agent` (agent-written, read by a human and left
as it was), `human-edited`, or `human`. Silver ships as `agent-draft`.
Gold means a human went through it, so Gold copy is anything but
`agent-draft`: `agent` when they read it and found nothing to change.
Human copy is preferred and always wins a disagreement. Writers who are good at this are
welcome to show it.
