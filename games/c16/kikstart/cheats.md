# Kikstart — cheats

## Built-in course selector

In attract mode, hold **3 and 4 together** for about two seconds, then
release. Use **3** for the previous course, **4** for the next, and **T**
to begin. The selector wraps between 1 and 16. This was reached with
inputs alone; `discoveries.html` shows the selector and course 16.
Evidence: $2DB4 and the split start-pointer tables $1E50/$1E60.

## Candidate memory patches

Plus/4 World's game page documents these patches. Their target
instructions match the supplied unpacked image, but the patches were
not used in normal play or applied as permanent game changes.

| Effect | Unpacked address and replacement | Status |
|---|---|---|
| Stop countdown | $2349=$BD and $234C=$BD | Candidate: replaces the indexed decrements with loads; lowest-digit arithmetic still needs a full patched-play check |
| Keep bikes | $28A3=$A5 | Candidate: changes DEC bikes_left to LDA bikes_left |
| Skip crash entry | $26AC=$60 | Candidate: replaces start_crash with RTS; side effects at callers need a separate check |

These addresses refer to the unpacked game at $2000, rather than the
packed bytes in the PRG. Source: [Kikstart — Plus/4 World](https://plus4world.powweb.com/software/Kikstart),
read 11 November 2026. No patched binary is published.
