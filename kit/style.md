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
- Secrets, quirks and bugs are the best part. Give them room.
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
- No "testament to", "tapestry", "delve", "nuanced", "landscape",
  "journey", "unpack", "at its core", "crucially", "seamlessly", "robust".
- No summary paragraph that restates the section.
- Do not describe the tooling or the process ("we pointed an AI at the
  bytes"). The reader is here for the game.

The test is a human reading the page without noticing how it was made.
There is no lint for this; a mechanical one was tried and dropped.

## Declare provenance

`game.json` records who wrote the copy: `agent-draft` (agent-written, no
human has read it yet), `agent` (agent-written, read by a human and left
as it was), `human-edited`, or `human`. Silver ships as `agent-draft`.
Gold means a human went through it, so Gold copy is anything but
`agent-draft`: `agent` when they read it and found nothing to change.
Human copy is preferred and always wins a disagreement. Writers who are good at this are
welcome to show it.
