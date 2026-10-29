---
name: 70-minisite
description: Build the game's minisite. The "How it works" page (index.html) from symbols.json, facts.md and the reference images; the Discoveries tab of secrets, quirks and bugs; the listing behind the Source code tab; the Maps / levels tab for a game with more than one level; an optional Play tab. Interactivity first and the best of it high on the page, evidence beside every claim, copy written last under the house style.
---

# The minisite

The minisite is the deliverable: a small site that explains the game, where
the writing is the spine but anything that explains the game can live
(widgets, level browsers, tune players, even a full JavaScript port of the
game itself). If you can build it, build it.

Every game is a small site with the same tabs in the same order: **How it
works** (`index.html`, authored), **Play** (`play.html`, authored, only
when a JavaScript version exists), **Discoveries** (`discoveries.html`,
authored, the secrets, quirks and bugs), **Maps / levels** (`levels.html`,
authored, for every game with more than one level, map, room, stage or
screen), **Source code** (`source.html`, generated from `listing.json`),
**About** (generated from `game.json`, `features.md` and git).
`kit/scripts/build.py` assembles them; you write the authored ones.
`facts.md`, `cheats.md` and `orientation.md` stay in the repository and
no tab shows them, so what a reader should see from them goes on an
authored page, in copy: always a cheat the player enters in the game
itself (a word typed, keys held, a code), as players look for those. A
game that needs other tabs lists all of its tabs as `[file, label]` pairs
in `game.json`'s `"tabs"`; the build publishes the pages named there and
warns about any other `.html` in the folder. The bar always opens with
How it works, Play and Discoveries and closes with Source code and About;
the list orders the tabs between.

When merging or renaming a page, keep its old URL in `game.json`'s
`"redirects"`, for example `{"old.html": "levels.html#area-name"}`. The target
must be a published tab. The build creates a small forwarding page outside
the tab bar; it carries the visitor's query and fragment to the target.
Check an old bookmark as well as the new tab links in the browser.

Every `$XXXX` inside a `<code>` element on any tab becomes a link into the
Source tab, so write addresses in code spans and the evidence links itself.
One the listing holds no record of (a chip register, a stretch the coverage
leaves out, another part's address) opens the Source tab on a note saying
so. `build.py --addresses` lists them page by page: a chip register can
stay, but an address of the wrong part, or one the listing should hold, is
a mistake to fix. In a BASIC listing every address is inside some line,
so a wrong one opens on the wrong line with no note; the list marks a
link past a line's first byte "(inside a line)", and a line is cited by
its first byte.

# The How it works page

Audience: technical gamers who love game design and want to know how the
game works, and who do not read assembly. Assembly is evidence, shown
beside the claim; the explanation is in terms of what the player sees.

**Interactivity is the point.** A page you can play with beats a page you
read. Every section should have something to press: step a mechanic,
scrub a tune, flip through the level data, toggle an overlay on a
reconstructed screen.

## Sections

Every page opens with the first section below. Not every game has the
rest, and they are in no order: each page chooses its own ("The order",
below). The sound is the exception: a game with music gets its player,
at every tier above Bronze.
It is a starting set, not a form: the page is open to any structure that
works for this game, any number of sections at any depth, and the human
who takes it to Gold will cut what is dull, expand what is interesting and
add what the agent did not think of. What stays fixed is the tab bar, the
address links into the Source tab, and the house style in `kit/style.md`.

- **The game.** What the game is, for a reader who has never played it:
   who you play, what you do and what ends a level, in two or three
   short paragraphs that bring in the words later sections use. Show it
   with a picture or two that introduce it: the title screen and the main
   character in play, from the emulator (the screenshots `20-features`
   saved in `reference/` usually serve). Keep it short, and keep the code
   out of it. It is the one section with nothing to press.
- **One frame, rebuilt from memory.** Draw the play screen from memory
   with the page's own code, not a screenshot. It proves the data is
   understood and it is the base for overlays. A screen whose video
   registers change during the frame (a split by interrupts, which often
   moves the sprite pointers too) draws the wrong picture from one read
   of them, so record the whole frame where the platform can, and draw
   with the site's library for the machine
   (`kit/skills/<platform>/steps`, "frame"). The comparison that counts
   the pixels that differ from the emulator's picture of the same frame
   is the drawing's test: say in the caption how many differ and why. If the renderer lacks something the game does,
   extend it in the site's library and in its test, so that the next game
   has it too.
- **The player and the enemies.** What they are drawn with (character
   graphics, sprites, both), how they move, how they collide.
- **Controls.** What the game reads and how, including anything the
   manual never mentioned.
- **Levels and data.** Where the level lives and what format, shown on
   one level, with a link to the Maps / levels tab, where every level is
   drawn (below). If placement is procedural, show the rule and let the
   reader roll it.
- **Enemy movement and AI.** The actual decision rule, steppable.
- **Progression and difficulty.** The tables, as tables, and what they
   do to play.
- **The sound.** The player for the stored tunes and effects, tied to
   the bytes that produce each note. When the game has music, the player
   is required, with a button for every tune the game stores, unused
   ones too: a run that names the music driver and leaves the player to
   `TODO.md` has not built the page. It plays through the site's model
   of the machine's sound chip, and what drives the model is the game's
   own music: its driver ported, or run on the kit's processor, on the
   page or ahead of time into a recording of what it wrote to the chip,
   which a test beside the page makes again from the listing. The game's
   own driver run on the kit's processor counts as a port, its code and
   tables embedded in the page as data like any widget's. Music the
   machine's own ROM plays for the game, from a queue the game fills, is
   recorded at the chip in the emulator. The platform's steps skill names
   the model and how its pages drive it (`kit/skills/<platform>/steps`,
   "sound"). Say in the caption which it is and how it was checked
   against the game. Say beside a sound below about 100 Hz that laptop
   and phone speakers barely play it: a reader who hears nothing reports
   it missing. Before believing such a report, render the writes through
   the model in node and measure the output.
- **Secrets, quirks and bugs.** These have a tab of their own,
   Discoveries (below). A section here whose mechanic leads to one links
   to it.

## The order

The order serves the explanation and the reader's attention at once. A
section should not lean on one that comes after it, and attention is
highest at the top of the page and falls with every screen, so the best
thing on the page goes as high as the explanation lets it. The page's
order is its own, chosen for this game: no two games have the same best
thing, and no two pages need the same shape.

The page opens with the game (above), so the reader knows what they are
looking at before the first interrupt or table. Then, once the widgets
work and before the copy, choose the one or two things a reader would
most regret missing. They are usually things that move or make a sound:
a tune player, a map to scrub through, a replay of the game playing.
Move each into the two or three sections after the opening, as far as
the sections it relies on allow, and read the moved section again for
anything it now mentions before the page has explained it. No other
section has a fixed place, not even the rebuilt frame: it is a natural
first look inside, the establishing shot, but a page whose best thing is
its music or its maps can put that first instead.

## Building it

- One self-contained `index.html`. Inline CSS and JavaScript; no
  build step; external resources only for fonts. It must open from disk,
  all but the widgets built on the site's shared scripts, which say so
  when the script is missing. Test for a script with
  `typeof Name === 'undefined'`, never `window.Name`: a script's
  top-level `const`, `let` or `class` is no property of `window`, so the
  widget says its script is missing when it is loaded.
- Any page may use the site's shared scripts. Each machine has a library
  that draws its glyphs and screens and rebuilds the game image from
  `listing.json`, so a page draws from the bytes the Source tab shows,
  and a model of its sound chip (`kit/skills/<platform>/steps`, "page"
  and "sound"). `../../lib/cpu6502.js` is the kit's 6502 simulator,
  `kit/cpu/cpu6502.js`, as `C64Cpu`, for a widget that runs the game's
  own code on the listing's bytes. A page never carries a processor of
  its own, and a test hands a block the same one with `g.lib('cpu6502')`
  (`kit/scripts/port_check.js`). Those work only in the built site,
  served as in "Check it in a browser" below. A widget the next game could use as it is belongs
  there, not in the page. One that grew inside a page moves there with a
  test that the page still gives the same result.
- A page draws from the listing through its machine library's loader,
  such as `C64.load('listing.json')`, or `parts/<id>/listing.json` for a part,
  fetches the whole listing, one download the browser caches for every
  tab of the game, the Source tab included.
- Only a game whose listing is withheld (`"publish_source": false`)
  names the pieces of the listing a page reads, because the site serves
  none of it: `<script type="application/json"
  data-listing="listing.json">["charset", "$4000-$43FF"]</script>`, a
  label standing for its record and those after it up to the next label.
  The build puts those records in the page with their addresses, types,
  labels and bytes, and the loaders read them in place of a fetch
  (`kit/scripts/build.py`, `embed_listings`). A byte the pieces leave out
  reads as 0 with no error: a picture drawn black, text drawn as `@`. So
  copy the game's `listing.json` into its folder under `_site/`, open each
  built page with `?listing-reads` after its address and exercise every
  widget, a slider through its values for each choice of the menu beside
  it, and let every animation run its course: the console then names
  each byte and label the page read that its pieces leave out, with the
  line that read it, as the list to add (`site/lib/listing-reads.js`). Do
  it again whenever a widget changes, and after merging `main` into a
  branch that changed one.
- The build publishes the authored pages, `listing.json`, `symbols.json`
  and `reference/`, and nothing else from the game folder; for a game
  whose `game.json` has `"publish_source": false`, neither JSON file. A
  link to any other file would build and then fail in the reader's
  browser, so `build.py` stops on one. It reads every `src=` and `href=` in the page,
  the comments of an inlined script included, so a comment that names a
  file should not put it in an attribute.
- The built page also loads the site's stylesheet, `site/lib/site.css`,
  which has class names of its own (`.strip` is one). A page class with
  the same name picks up its rules and the layout breaks only in the
  built site. `check_docs.py` fails on a class the page's styles (its
  `<style>` or its own stylesheet) share with `site.css`, unless the rule
  is the site's copied word for word or one of the template's. Prefix the
  page's own classes and it never comes up.
- Start from `kit/template/index.html` for the design tokens and layout.
  Keep its `<!-- tabs -->` marker; the build puts the tab bar there.
  A finished example to borrow patterns from is any Gold game in `games/`:
  canvas renderers for character sets and screens, Web Audio note
  players, table explorers.
- Keep every section a top-level `<section>` with the template's label
  line (`<p class="fig">01 · label</p>`) and an `<h2>` heading, on the
  Discoveries, Maps / levels and Play pages too. The build lists each
  page's sections in its left margin by their headings (any further
  `<h2>` gets an entry of its own, and so does a section or heading the
  page's script adds), so the headings are what a reader scans to choose
  where to go. A heading that begins `Bug:`, `Secret:`, `Music:` or
  `Sound:` is tagged in that list, and nothing else is: the prefix is the
  only way to get a tag. Head the section about the tunes `Music:` and the
  one about sound effects `Sound:`. A section off the screen is skipped,
  not laid out or painted (`section.cv` in `site.css`), which makes each
  section a box its contents stay inside: nothing in it can be
  `position: fixed`, and nothing it shows, a tooltip or a pop-up, can
  reach more than 200px past its edges.
- Embed the data a widget needs in the page: extracted character set,
  level data, tables, tune bytes, the pictures a viewer shows. That is
  not what "No binaries" (`AGENTS.md`) forbids, which is files holding
  the game or the machine whole. Small excerpts for commentary; never the
  program. Data the game fetches into a buffer during play, a portrait
  for each fight or a tune for each room, goes in the page that shows
  it, from the game's own loads in the emulator, and not into a part made
  to hold it (`15-parts`).
- A game can read the machine's ROM as data: a table, or code used as
  noise. When a mechanic on the page depends on it, embed only the bytes
  the game reads, or the values it computes from them, and never the
  whole ROM. Read them from the ROM the emulator runs, not from memory,
  and say beside the widget which ROM, which revision and which addresses
  they came from. If the emulator has other revisions of that ROM,
  compare the same addresses: when they differ, the mechanic differs
  between machines, and the page says so.
- Every claim shows its evidence: the table, the bytes, the register, the
  screenshot from `reference/`.
- A widget that runs a mechanic is a claim too. Port the routine, then
  test the port against the game itself before it goes on the page:
  against a pass-by-pass trace of the game's own variables recorded in
  the emulator (the platform's tool notes say how) while the mechanic
  runs, its objects alive and its counters moving, since a trace taken
  between waves passes any port (`60-verify`, "A test must contain cases
  that have to succeed"); or, for a routine that
  only computes, against the original code run in the kit's simulator
  for the machine's processor on the snapshot's memory. Write node tests that do the comparison and say in
  the caption how it was checked. A test that needs only the committed
  listing goes beside the page as `test_<what>.js`, where CI runs it, and
  takes the port from the page itself, so the two cannot drift apart:
  `kit/scripts/port_check.js` cuts the block out, runs it and gives the
  listing's memory, and `kit/scripts/port_check.py` does the same for a
  test whose simulator is in Python. Open the block with a line
  `/* name */`, or end a function inside the page's own script with a
  line `// end of name`; the header is the manual. When more than one
  page carries the block, `g.sameBlock(name)` fails when any copy
  differs, so a page that gains a copy is checked without a change to
  the test. Use the kit's simulator rather than writing one
  (`kit/skills/<platform>/steps`, "simulator"); its header is the
  manual. For random cases in
  JavaScript, a generator written `seed * 1103515245 + 12345` overflows the
  doubles' 53 bits and loses its low bits, so its "random" inputs repeat far
  sooner than they seem to; use `Math.imul(seed, 1103515245)` or xorshift. A trace is a copy of game memory, so it
  and the tests that read it stay in the game's gitignored `work/`, like
  the snapshots.
  Porting is work that splits well across agents: one mechanic each, each
  with its own trace and its own files.
  **Sweep the whole input space, not a few plausible values.** A port that
  is right on the game's own numbers can still be wrong at the edges of the
  arithmetic. Run the routine and the port over every boundary value of each
  input register, plus a few hundred random ones, and say in the caption how
  many cases there were. One port of a shift-and-add masked its accumulator
  to 16 bits *before* taking the carry out of the top for the routine's
  final fold, so the carry was always zero: it agreed with the game on the
  page's own inputs and returned 29 where the routine returns 285. A sweep
  of 789 cases found it in one run; reading the two implementations side by
  side had not.
  **Start each case where the game starts it, and feed it what the page
  feeds it.** Every value the test sets before it calls the routine, a
  flag, a timer, the frame a request arrives on, is a case of its own
  choosing, and the port is checked only for that choice. List what the
  routine reads that the test sets, and take each from where the game sets
  it (the object's spawn record, the routine that resets it) and from where
  the page sends it (its own button data). One sound driver's port matched
  the game on 99,762 calls while every effect button on its page stayed
  silent: the test asked a frame after the mode change, and the page on the
  same frame. One animation port matched the engine on every script while
  the page ran two enemies that stand still until shot: the test started
  every object running, and their spawn records start them stopped.
- **Draw from the memory the game draws from.** A renderer fed from the
  listing reads the hand-over image, and a game that swaps character
  shapes per area or per level has different glyphs there than in play:
  one map drawn that way showed letters where the stalactites belong.
  Compare the character set and the colour table of the hand-over with a
  play snapshot, and embed the bytes that differ for the state the
  picture claims to show.
- Reference images go in `reference/`; the page refers to them by
  relative path from the game folder (`reference/<name>.png`).
- **A game of several parts** (`15-parts`) gets a Source page for each
  part that has a listing, `source-<id>.html`, with the parts named above
  the listing and a control beside it that steps from one to the next.
  `source.html` is the first part's. The build makes these; the page's
  part is to say which part an address belongs to. The site links a bare
  `<code>$1234</code>` to `source.html`, so put `data-part="<id>"` on the
  section (or any element) whose addresses are one part's, and
  `data-part=""` where they are several parts' and should link nowhere.
  Write a link by the part's own page, `source-<id>.html#1234`, never
  `source.html#1234`: the first part changes when a part is added before
  it. A part that lies over another is shown laid over it, its own rows
  marked. The About tab keeps one map of memory, as for any game:
  the part the others are loaded over, with what they load marked as
  varying with the part. An About layout of the game's own writes
  `{{data_links}}` where the symbol maps and listings are named.
- **Stepping through things of one kind**, the rooms of a levels page as
  much as the parts of a game, uses one control: the one before, a list
  of them all, the one after. Write it as the build writes the parts'
  (`<div class="pick">`, a `step` either side of a `select`; `site.css`
  styles it), so the reader meets the same control on every page.

## Copy

Write the copy **last**, as a separate pass, under `kit/style.md`. Then do
a **rewrite pass** as its own step, with the draft in front of you. An
agent reads a rule list once and then reverts to its default voice; the
rewrite pass is where the house style actually lands. Work through this
checklist mechanically, paragraph by paragraph:

1. Search the draft for em-dashes. Every one that joins two clauses becomes
   two sentences, a colon, or parentheses. Parenthetical asides may stay if
   they are rare.
2. Delete any sentence that only announces the next sentence ("Here is the
   odd part", "And here's the kicker"). The next sentence does the work.
3. Cut imperatives addressed to the reader ("Listen to the last note",
   "Notice how") unless the thing is interactive, in which case point at
   the control ("Press a direction").
4. Headings name the thing, never a tautology ("Every character is a
   character") and never a claim the section still has to prove. Prefer the
   thing over the claim about the thing. Read each heading for a list: two
   or more things joined by commas or "and", with no verb saying what they
   do, is an inventory of the section ("Five digits, one key and one
   column: how the bomb is defused"). Rewrite it as the one finding, or as
   the plain name of the subject (`kit/style.md`, "Section headings").
5. Collapse triplets written for rhythm into a plain list or two sentences.
   Three genuine items are fine; three arranged for a drumbeat are not.
6. State it positively. A one-beat correction is fine when the reader would
   genuinely expect the wrong thing ("A reconstruction, not a screenshot"),
   but never "it's not X, it's Y" as the sentence's whole move. Search
   for "no " as well: where "no X" is the one acting ("no gate leads to
   it"), rewrite the sentence so a real thing acts, or say "there is no
   X" (`kit/style.md`, the section on "no X" as the subject).
7. Give every paragraph its purpose, in a line written to yourself
   (`kit/style.md`, "Paragraphs"). First check that purpose against the
   page's subtitle and the section's heading, and move the paragraph to the
   tab or section it serves if it serves another. Then read each sentence
   against it. Move or
   cut any sentence that serves another point, however interesting; split
   a paragraph whose purpose needs an "and"; put the point first or last;
   reorder sentences until each opens with something the last one gave the
   reader; and replace any "it" that could mean more than one thing. Do
   this before the other steps polish sentences that are about to move.

Before/after, from real drafts:

- "Using the font for graphics is a classic C64 move — it costs almost no
  memory and the hardware draws it for free."
  → "Using the font for graphics costs almost no memory, and the hardware
  draws it for free."
- "Not a screenshot — a reconstruction."
  → "A reconstruction, not a screenshot."
- "That's the whole renderer — there is no interpolation, no sprite
  multiplexing, no in-between frames."
  → "That's the whole renderer. There is no interpolation, no sprite
  multiplexing and no in-between frames."
- "Listen to the last note: it's held twice as long as the rest."
  → "The last note is held twice as long as the rest."
- A story paragraph doing four jobs: the plot, where it is set, who else is
  there, and why one enemy looks the way it does (a licensing detail placed
  in the middle of the plot).
  → Two paragraphs. The first is the plot, each sentence the cause of the
  next: what was stolen, why the villain needs the place, what the hero is
  sent to do. The second is who else is there, ending on that enemy and
  why it looks the way it does.

Last, do an **ELI15 pass** ("explain it like I'm fifteen"): rewrite every
authored page so that a reader of fifteen who has never programmed can
follow each sentence. The Source tab stays as it is, since its reader came
for the code. Commit the pages first, so that `git diff` puts each changed
sentence beside the one it replaced. Then:

1. Explain each term where it first appears on a page, in a few words,
   since a reader can open any tab first: a keyword of the game's
   language, a chip or its register, a hexadecimal address, a kind of
   variable. Keep the code, the addresses and the numbers, which are the
   evidence.
2. Split every sentence that holds more than one idea, and put plain words
   in place of shorthand ("turns down" for "declines").
3. Check the diff sentence by sentence against the original. Every fact
   the original gave (a number, a name, an address, a condition, a cause)
   is still on the page, and every explanation added is true. Put back
   what was lost, and check what was added against `facts.md` and the
   platform reference.

The standfirst, the headings, the captions, the table cells and the text
the widgets write are copy too, and the rewrite follows `kit/style.md`
like the draft.

Set `copy` in `game.json` honestly: `agent-draft` when the agent wrote it
and no human has read it yet, `agent` once a human has read it and left it
as it was, `human-edited` when a human changed it, `human` when a human
wrote it. An unattended run ends at `agent-draft` and at Silver. Gold is
a human going through it section by section, whether or not that changes
anything: `agent` records a pass that found nothing to cut or add.

The page is titled with the game's name and nothing else, in both the
`<title>` and the `<h1>`, with the year and publisher in the
eyebrow above it. Readers arrive looking for a game, and a headline in
place of the name hides it in a tab, a search result and a link. Say the
interesting thing in the standfirst under the title, where the template
puts it, and in the section headings. The standfirst is yours to write,
a sentence or two, with the rest of the copy: leave it neither empty nor
for the contributor. The home page shows it on the game's card unless
`game.json` has a `blurb`, and the Gold pass may rewrite it.

## Discoveries

Secrets, quirks and bugs are the best part of the minisite: things a
player who finished the game would not know, each verified live, with the
evidence beside it, one section each. Head each one `Secret:` or `Bug:`
with the finding in the heading, so the section list tags it, and put the
best first. Where a discovery rests on a mechanic the How it works page
explains, link to that section rather than explaining it again.

One kind deserves a special look: a state the code accepts but the
programmer never meant anyone to reach (the open questions `50-coverage`
notes and `60-verify`, "What a test lets through", settles). It is classic
tool-assisted-speedrun material, invisible in play and plain in the
listing. Landing while climbing, and being paid more for it, is one. When
you find one, do not stop at the poke: prove a player could get there
(`60-verify`, reachability), and build the section around a stepper the
reader can walk through. It is one kind of discovery among several.

When the run found none, leave the tab out and say so in
`agent-history.md`.

## Maps / levels

A game with more than one level, map, room, stage or screen gets this
tab: a shooter's stages, a platformer's rooms, an adventure's map, a
puzzle game's boards, the bonus stages between levels. Draw every one
of them as a picture from the extracted bytes, with the per-level
parameter tables beside them, and reuse the How it works page's
renderers. A scrolling level is drawn whole, or scrolled at the game's
speed. The How it works page keeps the format, shown on one level, and
links here for the rest, so the levels are never a run of sections on
that page.

Leave the tab out only when every level is the same screen (one arena,
or one board whose contents a table changes), and say why in
`agent-history.md`.

## Play

A behavioural port of the full game in JavaScript, built from the
documented mechanics and the extracted data, not a transpile.

**The Play tab is always a port.** Never put the game's own code on the
page to run on a model of the machine, even when that would be quicker
and play exactly like the original. A port runs only if every routine in
it was understood, and the lockstep shows it does what the original does,
so it is new work that rests on the listing. The original code on an
emulator is the original product shipped again, and it plays the same
whether the listing is right or wrong. The maintainers have ruled on
this: do not offer the choice to the contributor. The game's own code
runs only in the tests, as the game the port is checked against (and a
music driver run on the kit's processor counts as a port, as "The
sound" above says).

This is a first-class part of the minisite, not an extra: a reader who
can play the game while reading how it works understands it better than
one who only reads. The page's mechanic widgets are usually the seed.
Omit the tab only if there is genuinely nothing playable to put on it.
Only Platinum needs the Play tab (`AGENTS.md`, "Definition of done"),
so it never blocks Silver or Gold.

Every Play tab that draws on a canvas offers the site's CRT screen, on
by default: load `../../lib/crt.js`, put a "📺 CRT screen" button with
`data-crt` and `aria-pressed="true"` in the page's bar, and call
`CRT.attach(canvas, { button })` once the canvas exists. It draws the
picture again on the GPU each time the page draws, so the page adds
nothing to its loop; the header of
`site/lib/crt.js` says what to pass for a picture scaled into the canvas
from another (`source`), one drawn at twice the size (`pixel`), and a
view at the screen's own resolution, which goes off when the CRT screen
goes on (`onChange`). `kit/scripts/test_crt_screen.js` fails a Play page that
leaves it out, and a CRT button on any page that starts unpressed.

Every Play tab whose game makes a sound offers the site's sound switch,
on by default: load `../../lib/sound.js`, put
`<button type="button" data-sound aria-pressed="true">🔊 Sound</button>`
in the page's bar, and call `Sound.attach(button, set)` with the page's
own `set(on)`, which starts or stops its sound and resolves to whether
it is on. A browser lets a page start sound only inside a click or a key
press, so the switch starts it at the viewer's first one and keeps the
viewer's choice for every Play tab; the page starts no sound of its own,
neither when its game starts nor in its key handlers.
`kit/scripts/test_sound_switch.js` fails a Play page that leaves it out.
The page hands its game's writes to the sound chip's model through the
site's live queue (`kit/skills/<platform>/steps`, "sound") and keeps no
queue of its own: the site's holds half a second, since a page's frames
come unevenly and the audio device can take 100 ms at once, and a
shorter queue runs dry and overflows by turns, which is heard as the
music skipping. `kit/scripts/test_live_sound.js` fails a Play page with
a queue of its own.

Every Play tab's Reset works whatever the page is doing, a stop
included: it builds a new machine, lets go of the page's own pause, sets
the sound chip's registers as the new machine has them, and starts the
page's loop again. The loop catches whatever a frame throws, says the
port stopped and that Reset starts it again, and goes no further, since
a page that only rebuilds the machine leaves a reader whose port stopped
with a button that does nothing.

Before you start one, read `play.md` beside this file: how to check the
port against the game's own demonstration, or against the game's code in
lockstep, pace it by the machine's clock, give it a level picker and the
chips it leans on. A game with a recorded route can play it on the page
(`kit/skills/core/65-inputs`, "Publish it"). A game whose speed rides on its render can also offer Fast CPU,
at 60 frames a second: `fast-cpu.md` beside it says how.

## Check it in a browser

The page is a visual, interactive artefact and none of the kit's checks
render one. `check_docs.py` and `check_listing.py` read files; `build.py`
assembles the site and checks its links without opening a page. A canvas that draws nothing, a
widget that throws on load and a layout that collapses all pass every
check there is.

So load it and look at it before calling this step done:

```
python3 kit/scripts/build.py
python3 -m http.server -d _site 8000
```

then open `http://127.0.0.1:8000/<platform>/<slug>/index.html`; if 8000
is taken, any free port will do. The agent
needs a browser it can screenshot and click: either a browser extension
that exposes the page to it, or a harness desktop app with a built-in browser. Without one you are writing a visual artefact blind.

When the session's browser connector lacks its bundled executable but Firefox
is already installed, the shared launcher offers `python3 kit/scripts/tools.py
browser`. It starts an isolated headless profile under `tools/firefox/`,
with the WebDriver BiDi endpoint at `ws://127.0.0.1:9222/session`.
Use a BiDi client to navigate, exercise controls and capture screenshots,
and record its name/version and Firefox package origin.
`tools.py stop browser` stops only this clone's test browser. It downloads
nothing and does not use the contributor's personal browser session. See
`kit/INSTALL.md`, "Browser checks", for the tested host and containment.

`node kit/scripts/shoot.js <page url> <output prefix> --click` clicks every
button and steps every select, then saves one picture of each section,
scrolled into view first: a full-page screenshot is blank below the first
screen, because the page skips drawing a section off the screen. It prints
the console, exits 1 on an error, and with `?listing-reads` prints
`ListingReads.report()`. It needs Playwright, which the kit does not
install; `-h` says how it uses the browser above instead.

Check, at least: every canvas has drawn something; the console has no
errors, and for a withheld game none with `?listing-reads` after the
address either; every control does
something when clicked; and the rebuilt screen
matches a reference screenshot from `reference/`. The reconstruction is
the one section that is either right or obviously wrong the moment you
see it, which makes it the best test that the data is understood.

## Outputs

`index.html` opening cleanly from disk, loaded in a browser with every
widget exercised, its best thing high on the page; `discoveries.html`
with every secret, quirk and bug; `levels.html` with
every level, map or room drawn, or the line in `agent-history.md` saying
why the game has none; `listing.json` built and passing
`check_listing.py`; `game.json` with `copy` set; `build.py` producing the
minisite without errors.
