# Target Renegade — facts

These findings refer to the supplied OneLoad64 EasyFlash cartridge. Listings use the four recorded entry snapshots in orientation.md. Silver analysis is in progress; unnamed routines and explicitly open roles are not established mechanics.

## Memory and loading

The processor port $35 exposes RAM under BASIC/KERNAL and keeps I/O visible. The shared engine remains in RAM while resource files replace $2C00–$33FF, $68C0–$7DFF and $B000–$FBFE. Alternate graphics under I/O are reached by $84FE with port $30. Native directory records and exact E/F/G/H/I comparisons establish these loaded extents. Cartridge storage copies are counted in their RAM owners; generic edition boot/loading code is outside the game-engine analysis.

Title entry $2600 copies source $3546–$3645 to $020D–$030C. The source belongs to first-load; the destination is generated runtime state. Ending files H/I replace sprite data and $3400–$35FF. The ending entry is $3400; the shared return path reloads A–D before title when necessary. Stage and ending captures use explicit state changes and native loading/setup, rather than a completed playthrough.

## Verified mechanics and data

| Finding | Evidence |
|---|---|
| Title fire reads joystick port 1 | $26CC reads $DC01 bit 4; live port-1/port-2 comparison. |
| The supplied edition starts with five lives | $8000 stores $35 AND $0F at $020C; live HUD agrees. The manual says three; the edition difference remains unexplained. |
| Extra life requires passing the threshold | $FC00 compares packed BCD score with $020A/$020B. Equality does not award; above does. Initial displayed threshold is 50,000; each award advances it by 100,000. Lives are capped at nine. Four native cases passed. |
| Stored score units are hundreds of displayed points | $FC43 formats four BCD digits and the template supplies two trailing zero digits. All 256 formatter inputs passed; pending-score addition is $FC5A. |
| The HUD template copy is 160 cells | $A803 uses X=$A0 down through $01, copying characters $2BF0–$2C8F to $3720–$37BF and colours $2B50–$2BEF to $DB20–$DBBF. |
| One horizontal colour-scroll direction omits row zero | $A6A9 shifts 39 cells in each of rows 1–19. Independent simulation recorded 741 writes; row zero remained unchanged. |
| Background maps are 80 columns by 20 metatiles | $2A6C reads column-major indices at $2DC0. Each selects sixteen row-major character codes at $B000. Native draws matched 48 column/row cases across both loads. |
| Stage changes exchange graphics resources | $84FE exchanges 8 font pages, 1 colour page or 21 sprite pages according to six pointer/count entries. Flags $03F8–$03FD track the exchanges. |
| Sprite reflection tables are generated | $A8C8 generates bit reversal at $0400 and two-bit-pixel reversal at $0500. All 256 inputs matched each mapping. The generated sprite cache is $7E00–$7FFF. |
| Sprite pointers reach both playfield screens | $AD10–$AD15 reads $6A,X or a generated-cache pointer and writes $43F8,Y/$47F8,Y. $9567 selects actor depth/slot ordering. |
| IRQ/NMI use hardware vectors | $AF0F writes $AAF0/$A973 to $FFFE/$FFFA. Live first-stage reads agree. IRQ dispatch pushes target-minus-one words from $AB2F. |
| One recorded frame reproduces exactly | 38 recorded video writes; all 104,448 pixels matched the emulator picture. This validates that captured frame. |

## Text

Title rows use screen codes, A–Z=$01–$1A and space=$20. $2659–$2699 copies six rows of 27 characters from $2791/$27AC/$27C7/$27E2/$27FD/$2818. Credits name Dave Collier, John Palmer, Martin McDonald and Gary Biasillo. Status messages at $84AA are XOR-$17 encoded with a negative decoded terminator; $848E writes their low six bits. Logo and status graphics use the authored charset at $3800.

## Sound

Music initializer $0700 selects nine sets of three stream pointers from $15E7–$161C; tick $07BF advances enabled streams. Notes below $80 index frequency tables, $5E skips a new pitch, and commands $80–$97 control substreams, loops, instruments, durations and modulation. Invalid slots $85/$94/$96/$97 enter the border-colour trap at $1433. Undocumented LAX instructions in direct-SID-write commands are preserved explicitly.

The isolated driver $0700–$2022 agrees with the full snapshot in every ordered SID write across 150,497 calls and 2,018,480 writes. Cues 0–4 ran for 30,000 calls each without ending; cues 5–8 ended after 78,145,129,145 calls. This is a bounded observation, not proof of all looping periods. `test_music.js` repeats the comparison from committed listing bytes and checks the page's own driver. Effects use a separate driver at $20C2/$21F5 and thirteen definitions.

## The listing's error rate

Foundation sample seed 2026102501 drew 40 of 60 handwritten and 20 of 856 generated comments. The independent gpt-6-astra checker found 19 wrong-detail comments, no wholly wrong comments, one doubtful claim and four unverifiable citations. Native checks supported the 19 errors: four handwritten details and fifteen instances of an incorrect sprite-writer reference. All occurrences were corrected through the generators. The unsupported mutation claim and future-browser citations were removed. The unweighted wrong-detail rate was 31.7% (Wilson 95% interval about 21.3–44.2%); the stratum-weighted estimate was 70.7%, dominated by that repeated sprite citation. The sample is over the mark and gives a lower bound on the error rate; correcting sampled claims does not establish the remaining comments as correct. A full audit is recommended.
