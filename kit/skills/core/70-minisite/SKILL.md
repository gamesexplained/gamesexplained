---
name: 70-minisite
description: Build the game's minisite. The "How it works" page (index.html) from symbols.json, facts.md and the reference images; the listing behind the Source code tab; optional Maps/levels and Play tabs. Interactivity first and the best of it high on the page, evidence beside every claim, copy written last under the house style.
---

# The minisite

Start the clock: `python3 kit/scripts/clock.py start 70-minisite --model <your model id> games/<platform>/<slug>`. No figure yet; yours goes on the runs table.

The minisite is the deliverable: a small site that explains the game, where
the writing is the spine but anything that explains the game can live
(widgets, level browsers, tune players, even a full JavaScript port of the
game itself). If you can build it, build it.

Every game is a small site with the same tabs in the same order: **How it
works** (`index.html`, authored), **Source code** (`source.html`, generated
from `listing.json` plus `facts.md` and `cheats.md`), **Maps / levels**
(`levels.html`, authored, only when the game has level data worth a page),
**Play** (`play.html`, authored, only when a JavaScript version exists),
**About** (generated from `game.json`, `features.md`, `orientation.md`, git).
`kit/scripts/build.py` assembles them; you write the authored ones. A game
that needs other tabs lists all of its tabs, in order, as `[file, label]`
pairs in `game.json`'s `"tabs"`; the build publishes the pages named there
and warns about any other `.html` in the folder.

Every `$XXXX` inside a `<code>` element on any tab becomes a link into the
Source tab, so write addresses in code spans and the evidence links itself.

# The How it works page

Audience: technical gamers who love game design and want to know how the
game works, and who do not read assembly. Assembly is evidence, shown
beside the claim; the explanation is in terms of what the player sees.

**Interactivity is the point.** A page you can play with beats a page you
read. Every section should have something to press: step a mechanic,
scrub a tune, flip through the level data, toggle an overlay on a
reconstructed screen.

## Sections

Not every game has every section, and the list below is in no order: each
page chooses its own ("The order", below).
It is a starting set, not a form: the page is open to any structure that
works for this game, any number of sections at any depth, and the human
who takes it to Gold will cut what is dull, expand what is interesting and
add what the agent did not think of. What stays fixed is the tab bar, the
address links into the Source tab, and the house style in `kit/style.md`.

- **One frame, rebuilt from memory.** Draw the play screen from memory
   with the page's own code, not a screenshot. It proves the data is
   understood and it is the base for overlays. A screen split by raster
   interrupts changes the video registers, and often the sprite pointers,
   several times a frame, so one read of them draws the wrong picture. On
   the C64 the kit records and draws the frame for you:
   `python3 kit/c64/frame.py capture work/frame.json` records one whole
   frame of the running game (every write to the video chip, the video
   bank and the sprite pointers, with the line and cycle it happened on,
   and memory as the frame began), `compare` draws it with
   `C64.renderFrame` from `../../lib/c64.js` and counts the pixels that
   differ from the emulator's picture of the same frame, line by line, and
   `trim` keeps only the memory the drawing reads, which is what the page
   embeds (`C64.drawFrame` puts it on a canvas). Say in the caption how
   many pixels differ and why. If the renderer lacks something the game
   does, extend it in `site/lib/c64.js` and in `frame.py test`, so that the
   next game has it too.
- **The player and the enemies.** What they are drawn with (character
   graphics, sprites, both), how they move, how they collide.
- **Controls.** What the game reads and how, including anything the
   manual never mentioned.
- **Levels and data.** Where the level lives, what format, a browser for
   it. If placement is procedural, show the rule and let the reader roll
   it.
- **Enemy movement and AI.** The actual decision rule, steppable.
- **Progression and difficulty.** The tables, as tables, and what they
   do to play.
- **The sound.** The player for the stored tunes and effects, tied to
   the bytes that produce each note. Port the game's own music driver
   and play it through the site's model of the SID, `../../lib/sid.js`:
   it runs the driver once a frame, plays it, and shows each voice on a
   piano roll with the lines the port supplies about what the driver
   read. The script's header gives the driver's contract and what the
   model leaves out. The filter is off unless the page passes
   `filter: '6581'` (or `'8580'`) to `mount`, which also shows a switch
   to compare it with no filter; pass it when the game sets the filter,
   and say in the caption that the cutoff is one chip's. Say beside a
   sound below about 100 Hz that laptop and phone speakers barely play
   it: a reader who hears nothing reports it missing. Before believing such a report, render the writes through
   the model (`C64Sid.engine()` in node) and measure the output.
- **Secrets, quirks and bugs.** The best part. Things a player who
   finished the game would not know, each verified live, with the
   evidence beside it. One kind deserves a special look: a state the code
   accepts but the programmer never meant anyone to reach (the open
   questions `50-coverage` notes and `60-verify`, "What a test lets
   through", settles). It is classic tool-assisted-speedrun material,
   invisible in play and plain in the listing. Landing while climbing, and
   being paid more for it, is one. When you find one, do not stop at the
   poke: prove a player could get there (`60-verify`, reachability), and
   build the section around a stepper the reader can walk through. It is
   one kind of interesting fact among several, not the point of the page.

## The order

The order serves the explanation and the reader's attention at once. A
section should not lean on one that comes after it, and attention is
highest at the top of the page and falls with every screen, so the best
thing on the page goes as high as the explanation lets it. The page's
order is its own, chosen for this game: no two games have the same best
thing, and no two pages need the same shape.

Once the widgets work, and before the copy, choose the one or two things a
reader would most regret missing. They are usually things that move or
make a sound: a tune player, a map to scrub through, a replay of the game
playing. Move each into the first two or three sections, as far as the
sections it relies on allow, and read the moved section again for anything
it now mentions before the page has explained it. No section has a fixed
place, not even the rebuilt frame: it is a natural opener, the
establishing shot, but a page whose best thing is its music or its maps
can open with that instead.

## Building it

- One self-contained `index.html`. Inline CSS and JavaScript; no
  build step; external resources only for fonts. It must open from disk,
  all but the widgets built on the site's shared scripts, which say so
  when the script is missing.
- Any page may use the site's shared scripts: `../../lib/c64.js` draws
  glyphs, screens and sprites, and rebuilds the game image from
  `listing.json`, so a page draws from the bytes the Source tab shows;
  `../../lib/sid.js` plays a music driver's port through a model of the
  SID. Those work only in the built site, served as in "Check it in a
  browser" below. A widget the next game could use as it is belongs
  there, not in the page. One that grew inside a page moves there with a
  test that the page still gives the same result.
- The build publishes the authored pages, `listing.json`, `symbols.json`
  and `reference/`, and nothing else from the game folder. A link to any
  other file would build and then fail in the reader's browser, so
  `build.py` stops on one. It reads every `src=` and `href=` in the page,
  the comments of an inlined script included, so a comment that names a
  file should not put it in an attribute.
- The built page also loads the site's stylesheet, `site/lib/site.css`,
  which has class names of its own (`.strip` is one). A page class with
  the same name picks up its rules and the layout breaks only in the
  built site. Check the stylesheet before naming a class, or prefix the
  page's own. <!-- until #143 -->
- Start from `kit/template/index.html` for the design tokens and layout.
  Keep its `<!-- tabs -->` marker; the build puts the tab bar there.
  A finished example to borrow patterns from is any Gold game in `games/`:
  canvas renderers for character sets and screens, Web Audio note
  players, table explorers.
- Keep every section a top-level `<section>` with the template's label
  line (`<p class="fig">01 · label</p>`) and an `<h2>` heading, on the
  Maps / levels and Play pages too. The build lists each page's sections
  in its left margin by their headings (any further `<h2>` gets an entry
  of its own, and so does a section or heading the page's script adds),
  so the headings are what a reader scans to choose where to go. A
  heading that begins `Bug:`, `Secret:`, `Music:` or `Sound:` is tagged
  in that list, and nothing else is: the prefix is the only way to get a
  tag. Head the section about the tunes `Music:` and the one about sound
  effects `Sound:`.
- Embed only the data you need: extracted character set, level data,
  tables, tune bytes. Small excerpts for commentary; never the program.
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
  only computes, against the original code run in a 6502 simulator on the
  snapshot's memory. Write node tests that do the comparison and say in
  the caption how it was checked. On the C64 use the kit's simulator,
  `kit/c64/cpu6502.js`, rather than writing one; its header is the
  manual. `CPU.fromSnapshot(vsf, { io })` gives the machine as the snapshot
  left it, the port's banking included, and `call(entry, regs)` runs a
  routine to its return. The chips belong to the test: `io.write` sees
  every write in order, which is how a music driver's port is checked
  register by register, frame by frame. A read of a chip the test does not
  answer stops the run, and so does a call into ROM unless a hook stands
  in for the routine. `irq()` runs the game's interrupt, `cycles` times a
  routine, and the `executed` map shows which instructions the cases
  reached. For random cases in
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
- **Draw from the memory the game draws from.** A renderer fed from the
  listing reads the hand-over image, and a game that swaps character
  shapes per area or per level has different glyphs there than in play:
  one map drawn that way showed letters where the stalactites belong.
  Compare the character set and the colour table of the hand-over with a
  play snapshot, and embed the bytes that differ for the state the
  picture claims to show.
- Reference images go in `reference/`; the page refers to them by
  relative path from the game folder (`reference/<name>.png`).

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
   thing over the claim about the thing.
5. Collapse triplets written for rhythm into a plain list or two sentences.
   Three genuine items are fine; three arranged for a drumbeat are not.
6. State it positively. A one-beat correction is fine when the reader would
   genuinely expect the wrong thing ("A reconstruction, not a screenshot"),
   but never "it's not X, it's Y" as the sentence's whole move.
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

Set `copy` in `game.json` honestly: `agent-draft` when the agent wrote it
and no human has read it yet, `agent` once a human has read it and left it
as it was, `human-edited` when a human changed it, `human` when a human
wrote it. An unattended run ends at `agent-draft` and at Silver. Gold is
a human going through it section by section, whether or not that changes
anything: `agent` records a pass that found nothing to cut or add.

The page is titled with the game's name and nothing else, in both the
`<title>` and the `<h1>`, with the platform, year and publisher in the
eyebrow above it. Readers arrive looking for a game, and a headline in
place of the name hides it in a tab, a search result and a link. Say the
interesting thing in the standfirst under the title, where the template
puts it, and in the section headings.

## Maps / levels, when there is one

Render the level data the How it works page only excerpts: every maze, screen or
room as a picture drawn from the extracted bytes, with the per-level
parameter tables beside them. Reuse the page's renderers. Omit the page
rather than pad it.

## Play

A behavioural port of the full game in JavaScript, built from the
documented mechanics and the extracted data, not a transpile.

This is a first-class part of the minisite, not an extra: a reader who
can play the game while reading how it works understands it better than
one who only reads. The page's mechanic widgets are usually the seed.
Omit the tab only if there is genuinely nothing playable to put on it.
No tier requires the Play tab, so it never blocks Silver or Gold. A Play
tab added to a game after its run is timed as its own step:
`clock.py start play`.

Before you start one, read `play.md` beside this file: how to check the
port against the game's own demonstration, or against the game's code in
lockstep, pace it by the machine's clock, give it a level picker and the
chips it leans on.

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
and record its name/version and Firefox package origin. The 30 September
2026 run did not record its client or package origin; see the containment
limits in `kit/INSTALL.md`.
`tools.py stop browser` stops only this clone's test browser. It downloads
nothing and does not use the contributor's personal browser session. See
`kit/INSTALL.md`, "Browser checks", for the tested host and containment.

Check, at least: every canvas has drawn something; the console has no
errors; every control does something when clicked; and the rebuilt screen
matches a reference screenshot from `reference/`. The reconstruction is
the one section that is either right or obviously wrong the moment you
see it, which makes it the best test that the data is understood.

## Outputs

`index.html` opening cleanly from disk, loaded in a browser with every
widget exercised, its best thing high on the page; `listing.json` built
and passing `check_listing.py`; `game.json` with `copy` set; `build.py`
producing the minisite without errors.
