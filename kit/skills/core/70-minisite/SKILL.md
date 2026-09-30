---
name: 70-minisite
description: Build the game's minisite. The "How it works" page (index.html) from symbols.json, facts.md and the reference images; the listing behind the Source code tab; optional Maps/levels and Play tabs. Interactivity first and the best of it high on the page, evidence beside every claim, copy written last under the house style.
---

# The minisite

Start the clock: `python3 kit/scripts/clock.py start 70-minisite --model <your model id> games/<platform>/<slug>`. No figure yet; yours goes on the runs table.

The minisite is the deliverable: a small site that explains the game, where
the writing is the spine but anything can live. Interactivity is the point,
and the minisite can hold anything that explains the game — widgets, level
browsers, tune players, even a full JavaScript port of the game itself. If
you can build it, build it.

Every game is a small site with the same tabs in the same order: **How it
works** (`index.html`, authored), **Source code** (`source.html`, generated
from `listing.json` plus `facts.md` and `cheats.md`), **Maps / levels**
(`levels.html`, authored, only when the game has level data worth a page),
**Play** (`play.html`, authored, only when a JavaScript version exists),
**About** (generated from `game.json`, `features.md`, `orientation.md`, git).
`kit/scripts/build.py` assembles them; you write the authored ones.

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
   accepts but the programmer never meant anyone to reach. It shows up as
   an exact-match test where a range was intended, a comparison that
   assumes a sign, an eight-bit sum that can wrap, a test run in an order
   that leaves a gap, and it is classic tool-assisted-speedrun material,
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
  the emulator (the platform's tool notes say how), or, for a routine that
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

If the game has a demonstration that replays recorded input, that is the
test for the whole port. Record the real demonstration in the emulator,
one record per pass of the game loop with every variable the port keeps,
then feed the port the demonstration's own input, poll by poll, exactly
where the game reads the controls, and compare every pass. Menus,
movement, fights and spells all come in one run, and a port that
matches it byte for byte is the game's logic, not a likeness of it. For
what the demonstration never does, write short input scripts in the same
format and run them through both the port and the game's code in a 6502
simulator. The port must count polls, not time: the game's delay loops do
not read the controls, so a port paced by the clock drifts off the
recording within a menu or two. This is a
first-class part of the minisite, not an extra: a reader who can play the
game while reading how it works understands it better than one who only
reads. The page's mechanic widgets are usually the seed. Omit the tab only
if there is genuinely nothing playable to put on it. No tier requires the Play tab, so it never blocks Silver or Gold. A Play tab added to a game after its run is timed as its own step: `clock.py start play`.

### A whole game, checked against its own code

With no demonstration to replay, run the game's own code beside the port
and compare them pass by pass. On the C64, `kit/c64/machine.js` is the
machine for it: the simulator with a raster interrupt, the keyboard, the
joystick and colour RAM around it, started from the listing's memory,
counting passes where the main loop begins. `kit/c64/lockstep.js` runs a
port beside it and says what the port gives it: the checkpoints it
yields, its raster waits, its polling loops and its interrupt handlers.
Write the port to that from the start. Each file's header is its manual.

- **Port routine by routine, on the game's own memory.** One function per
  listing label, reading and writing the game's variables where the game
  keeps them, self-modified operands included. A routine that waits for
  the raster or for time becomes a generator that yields where time
  passes. Split the routines into groups, one agent each, with the routine
  addresses in the prompt.
- **Test each routine alone first**, against the game's routine run by the
  simulator (`cpu.call`) on thousands of random states made from real
  moments of play. Start calls with the stack pointer at `$FF`: a deep
  call chain started lower can run down into tables the game keeps in the
  stack page, and the failures look like the game's.
- **Then the whole loop in lockstep.** Make the port's main loop yield at
  checkpoints, the address of each call in its body. The lockstep runs the
  game to the same address and runs the interrupts it took on the way in
  the port there. It compares memory at the start of every pass, from
  saved moments of play with recorded input: `onPass` for input held over
  passes, `onFrame` for a key the game waits for in the middle of one. A
  checkpoint the game reaches that the port did not yield stops the run
  with both named. While a group is unfinished, the game's own code stands
  in for its routines (`standIn`). A polling loop in the port yields at
  each turn and the game moves on a raster line, so the port sees the
  line and the flags the game's loop does. A wait for a line yields the
  line, and the game runs to the loop's exit.
- **What lockstep cannot match is the game's own races.** The port runs an
  interrupt between two steps; the machine runs it wherever it falls. The
  lockstep closes most of that gap: each handler runs on the bytes the
  game's read, at the values it read them, and the game's last writer of
  each byte stands. What is left is the main code reading, in the middle
  of a stretch, what an interrupt wrote there: a scratch byte both use, a
  value the interrupt moves on. The results then depend on where the
  interrupt fell. When a difference survives, hook the machine at the
  addresses involved and look for an interrupt between the store and the
  read before calling it a port bug. Leave those bytes out of the
  comparison only once the race is shown, and say on the page what the
  port shows instead. A byte the port does not keep the game's way (a
  register a routine saves, where the port calls it without that
  register) differs now and then; name it and leave it out too.
  A raster wait that reads the line and then `$D011`'s bit 7 in two
  instructions is one such race: an interrupt between the reads makes
  the game leave on a later line than the port.
- **Read what the interrupt writes through one function.** The KERNAL's
  jiffy clock, its key code and its shift flag change under the main
  program, which may read one several times in a stretch between
  checkpoints and see different values. Have the port read each such
  byte through `P.io.irqByte(a)`, and list the bytes in the lockstep's
  `irqBytes`: it hands the port, one read at a time, every value the
  game read from each in the same stretch, in order (`kit/c64/lockstep.js`
  says how, and what it cannot see). On the page, `irqByte` is
  `a => M[a]`. Handing the port only the first value leaves every later
  read stale.
- **Pace it by the machine's clock.** A game that moves a fixed step per
  pass is only the same game at the same passes per second. The port
  executes no instructions, so fit their cost: the lockstep's `timing`
  gives, for each stretch between checkpoints, the cycles the game took
  (its interrupts excluded) and how often the port called each routine.
  Add the pixels drawn and rows filled from the port's own counters, and
  fit each routine's own cycles by non-negative least squares. Check the
  fit on sessions it was not fitted on, and on every kind of play the
  page offers: a scene the fit never saw can run fast by a routine it
  never costed. Then check the pace itself: passes in the same frames from
  the same moment, on the machine and on the page.
  Where one pass's cost follows mostly from the game's state (a state
  byte the main loop dispatches on), measure instead of fitting: hook the
  machine where each pass begins and ends, leave out the interrupt
  handler's own cycles, and take the median per state over the lockstep
  sessions. It needs no model of the routines, and a state the sessions
  never reached shows up as missing rather than as a wrong fit.
- **A level picker leaves the game as playing there would.** Jumping to a
  level by loading its record skips whatever finishing the ones before it
  left behind: items taken, counters, stored screens. Set that state
  first, the way the game's own code would, or the page shows a level no
  player could see (in one game, items left from a skipped level counted
  towards the next).
  A game with no level records can still have a picker: script a player
  through the game's own start (the menus, the name, the purchases) and
  run it faster than real time without drawing, setting by hand only what
  keys cannot reach, and only where the game itself would have set it.
  The state it hands over is then one play reached.
- **Inlining code with `String.replace`.** A build script that pastes the
  port into the page with a string replacement expands `$'`, `$&` and
  `$1` in it, and 6502 comments are full of `$`. Pass a function as the
  replacement.
- **A clock, not a frame loop.** Each stretch moves a virtual PAL clock on
  by its cost, running the raster interrupts on their lines as it goes; a
  raster wait moves the clock to its line and the interrupts on the way
  take their own time, not the wait's. Let the page move a target one
  frame per real frame and run the port until the clock reaches it. Never
  "run to the next frame boundary": one long stretch then carries the clock
  frames ahead of real time and the game runs fast.
- **The page's own chips.** The page runs the port on chips of its own,
  not on `machine.js`, so it needs the chip behaviour the game leans on:
  the raster latch (the platform reference), the timers a speech or
  sample player counts on, sprite collisions if the game reads them.
  Run the page's runtime in node from the cold start before opening a
  browser: a game that stalls there (waiting for an interrupt the page
  never raises) stalls in the browser with nothing to say why.

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
