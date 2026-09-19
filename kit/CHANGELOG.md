# How the method has changed

The kit is the site's method for reverse engineering a game: the rules,
the skills an agent follows, the scripts, the platform reference. Every
game run through it comes back with a list of where it was wrong or
silent, and the fixes go in before the next game starts. This is the
record of that, in plain words, newest first. Each entry names the game
that taught it.

## 0.0.5 · 19 September 2026 · the copy pass, and Fable's review

**The copy step is a draft plus a rewrite pass.** An agent reads a rule
list once and then reverts to its default voice, so the house style never
lands in the draft. `70-minisite` now ends with a mechanical rewrite
pass — em-dash clause joints, announcing sentences, reader imperatives,
tautology headings, rhythm triplets — worked paragraph by paragraph, with
four before/after pairs from the Radar Rat Race deslop as calibration.

**Provenance states what actually happened.** `agent-draft` is
agent-written with no human read yet; `agent` is agent-written and read
by a human, for example at the gold-tier read; `human-edited` and
`human` are what they say. New games start at `agent-draft`, and the
skill says to set it honestly.

**The skills are numbered.** `re-orient` through `re-retro` are now
`10-orient` through `80-retro`, so the pipeline order reads off the
folder listing.

**Catalogue cards show the game.** Each card carries the title screen
next to the memory map — the maps are most interesting when games are
compared, and the card should show something of the game itself.

**The Play tab is first-class but never required.** A reader who can play
along understands more, so the tab is built by default and omitted only
when there is genuinely nothing playable. No tier requires it, so it
never blocks Silver or Gold.

**Everything arrives as a pull request.** The delivery rule briefly said
"commit to `main`", which only one person can do and which stops working
the day there is a second maintainer. It now says the same thing to
everyone: branch, run the checks, open a pull request. `AGENTS.md` also
gains a short section for work on the kit or the site itself, which the
workflow had never described, so an agent asked to change a script had
nothing to follow but the game rules.

## 0.0.4 · 16 September 2026 · after Choplifter, and a second look

**A counter you cannot find is usually another counter.** Choplifter
promises three helicopters and holds no life counter. It counts sorties,
and a sortie ends only when the helicopter is destroyed; the third one is
the end of the game. The verify skill now says to trace the path from the
destruction flag to the next start of play before calling a counter
absent.

**The emulator's joystick tool drives the wrong port.** It passes the
port number straight to an API that counts from zero, so asking for port
1 moves port 2 and asking for port 2 moves nothing. Most C64 games read
port 2, so the bug hides behind "ask for port 1 and it works"; the early
Commodore games here read port 1 and could not be driven at all. The
cause is in the tool notes with the one-line fix, sent upstream; the
kit's scripted client carries a workaround through the CIA's
data-direction register.

**The footprint principle.** The kit leaves the cleanest footprint we can
manage, so a contributor can trust it with their computer. It is now a
rule for agents, a section of the install notes with a checklist for
whoever is first on Linux or Windows, and a command,
`tools.py verify-footprint`, that runs a whole launch, use and exit and
lists anything written outside the repository.

**Everything installs inside the repository.** The emulator build, its
settings and snapshots, and the disassembler binary all live under a
gitignored `tools/` folder, and one launcher starts them with the
emulator's paths pointed there. Uninstalling is deleting the folder; the
install notes list the two small things that can be left outside it, and
say so before anything is installed. Tested: the emulator wrote nothing
under the home directory at launch, in use or on exit.

**How to get the emulator.** The install notes said where the emulator
lives and never how to get it. Upstream publishes builds for macOS, Linux
and Windows; the notes now say which file, that only the macOS GUI build
has been used, and to ask before downloading.

**The footprint.** Every game's About tab shows all 64 KB of the machine,
one pixel per byte, with its code, graphics, level data, sound, text,
tables and variables coloured where they sit, and the byte counts beside
it. Contributors declare the regions the rules cannot see.

## 0.0.3 · 15 September 2026 · after Choplifter

Choplifter is a 16 KB cartridge with a double-buffered bitmap and no
sprites, three times the size of either earlier game, and it exposed four
gaps the small games never could.

**Inline parameters.** Five routines take their argument from the bytes
after the `jsr` that calls them, and a flow disassembler walks into the
argument and decodes it as code. Coverage stalled at 9 KB and a scan of
every jump target found nothing new, which reads like "the rest is data".
The coverage skill now describes the idiom and the stack-unwinding shape
to look for; one pass took the tracked image to 16 KB.

**One log per agent.** Nine annotation agents shared one disassembler and
needed separate logs, which the client could not give them. It can now.

**How far a description reaches.** A symbol owns the bytes to the next
boundary, capped at 64 for plain data. A long table needs a named symbol
every 64 bytes or most of it stays unexplained however well the whole was
described. Now stated in the skill.

**Cartridge images, invisible RAM, the emulator's RAM pattern.** A `CBM80`
header at `$8004` means a cartridge dump with a loader bolted on; the
video chip cannot see RAM under the character ROM's shadow, so games keep
tables there; unwritten RAM in the emulator has a repeating pattern that
is not data.

**The last symbol.** The ledger gave the last symbol in an image a span
of one byte, so a fifteen-byte table at the end of Radar Rat Race was one
byte tracked. Found while building the maps tab; fixed.

## 0.0.2 · 14 September 2026 · after Jupiter Lander

The first game run through the kit by an agent that had only the kit.
Silver at 100 % in 93 minutes, and a page of corrections.

**Wrong data-type names.** The disassembler skill listed types the tool
does not accept. Every call in the first typing pass was rejected.

**No scripted emulator client.** Live verification is a loop of halt,
poke, run, read, and doing it through one tool call at a time is slow and
lets the machine run between steps. `vice.py` was written during the run.

**Failed calls in the replay log.** Rejected annotation calls were logged
anyway, so a replay reproduced the mistakes. Fixed.

**Measuring without fooling yourself.** Poke a variable and read a derived
value, and a whole game update may have run in between; numbers that are
consistently one step out are this, not a misreading of the code. The
verify skill has a section on it.

**Snapshots.** Save them without ROMs, look at the frame you save (the
first "steady state" was an explosion), and stop the machine the moment a
snapshot loads.

**Statuses.** A feature can be clear in the code and impossible to
exercise with the tools at hand; "traced" is now a status, distinct from
"confirmed" and "live".

**The copy lint** was tried on the first two games and dropped: it caught
nothing a reader would not, and flagged ordinary words. A human read is
the check.

## 0.0.1 · 13 September 2026 · from Radar Rat Race

The kit was written from the first game, which was analysed before any of
it existed. The rules (prefer unknown to a guess; a negative result is a
claim about your search; verify before publishing; correct in place), the
skills (orient, features, text, sweep, coverage, verify, article, retro),
the C64 reference, the coverage metric and the symbol map are its
retrospective.
