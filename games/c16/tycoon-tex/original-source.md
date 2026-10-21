# The authors' own source: how Tycoon Tex was made

The source code of Tycoon Tex survives. Anthony Clarke gave his source files to Mark Hardisty's collection of Gremlin memorabilia, as [Games That Weren't](https://www.gamesthatwerent.com/gtw64/tycoon-tex/) tells it, and on 21 October 2026 [Plus/4 World](https://plus4world.powweb.com/software/Tycoon_Tex) offered this game's as a download, under "Source files". The download is a copy of one Commodore disk, named PLATFORM, of 98 files: the game's source text, the object file the assembler made from it, the graphics, and the tools that built them. Assembled again, the text gives every byte of the game as it sits in memory but thirteen that nothing uses, and it differs from the game in only three. Those three bytes are the story of what happened between the disk and the tape.

## Extra lives became ten times rarer on the way to the tape

The score routine in the source gives Tex a life each time the score's thousands digit changes, up to nine: `lda scrpos+2 ;* thousands`. The object file on the disk, which the assembler made from that source, does the same. The game on Gremlin's tape reads the digit to the left of it instead, at `$0C57`, in the instruction at `$3261`, and so gives a life every 10,000 points ([How it works](index.html#score)). That byte is the only difference between the disk's program and the tape's. It changed after the last build saved on the disk, by a patch of the one byte or by the line edited and assembled again, and the disk cannot say which. Either way the game was made harder after the program on the disk was finished.

The other two bytes are in the graphics. The first character of the skyline has `$09` `$10` at `$1001`-`$1002` on the tape, where the artist's drawing has `$3E` `$3A`. Those two bytes are `$1009`, the link BASIC writes at the start of a program it keeps at `$1001`. On the way to the tape the graphics sat where BASIC keeps its program, and BASIC wrote its link into them.

## What was switched off before release

The game had a cheat, and the lines that made it are still in the source, commented out. One, at the start of a game, sets a byte the variables file calls "cheat mode on". Three more, near the top of the death routine, return before Tex can die while that byte is set. The byte, `$C0`, is in the game, and nothing reads it.

Each enemy was to have a colour of its own, set for each scene from a table of fifteen bytes: five colours, for the four enemies and the jet's bomb, in each of the three scenes. The lines that read the table are commented out, and the routine gives every enemy the table's first colour instead. The table is still in the game, and Plus/4 World's starting-level cheat writes its patch over it (Cheats, in the reference below).

The picture of a joystick on the menu is, in the source, a "kempston joystick". Beside it, commented out, is a drawing of Commodore's own joystick for the C16 and Plus/4 ([both, drawn as the menu would](index.html#controls)).

The drawings of Tex, the arrow, the jet, its bomb, and the kamikaze plane are on the disk as text as well, and the game's characters differ from them in 107 bytes, most of them in the jet and its bomb.

## A plan for every level, written as comments

Three source files on the disk are not part of the program. One, INIT-ALIENS, is a plan. It was to run at the start of every sheet, the source's word for a level, and its comments list what each sheet would set: how often the pipe breaks; how big the hole is, "max 2 in early levels" and "max 3 in later levels"; how often each of four aliens comes, the arrow, the bouncer, the plane, and the suicide plane; "will the jet's bomb cause a crater or will it just go for your head !"; how far the oil pressure falls at a break, a sentence that stops halfway; and the speed of the main loop. The file's code only switches every alien on, and the crater too.

The released game carries out most of the plan in `next_level` instead. From level 4 a break can have three middles rather than two, the enemies come back sooner as the levels go up, and from level 7 the jet's bomb breaks the pipe. The plan's four aliens are the game's four enemies, and the "surface missiles" on the cover are not among them.

The main file names the other two and comments them out. BONUS, "called regulary for anything", holds three `NOP`s and a row of question marks, and HEXER turns a byte into two hex digits for the screen.

## Written on a Commodore 64 and sent to the C16

The disk starts on a Commodore 64. Its first program, BOOT ALL, sets the 64's screen colours and loads a disk wedge and Commodore's own editor, COMMODORE 64 EDITOR V072982. The assembler beside them is Commodore's too, CBM RESIDENT ASSEMBLER V080282, and both are from 1982. Clarke described the arrangement in 2016: "all the coding / assembling was done on the C64", and "a utility / cable" sent the code to a C16 to run it, which later had a disk drive of its own ([his comment](https://www.gamesthatwerent.com/gtw64/dorks-dilemma/)).

Two more programs on the disk, SUPER-LOAD and MEGA-SUPER, are signed "(C) 1984 BY JASON PERKINS (MERLIN)", and Jason Perkins was Clarke's partner at Micro Projects. SUPER-LOAD's messages make it a loader for the object files the assembler writes: LOADING INTO...$, BAD RECORD COUNT, and CHECKSUM ERROR.

## Notes the authors wrote for themselves

The program is 59 files. The first, TYCOON-TEX, sets the machine up and names the other 58 in the order the assembler reads them, each with a note: "hill on stuff" for the landscape, "kwaheri", Swahili for goodbye, for the game over, and "er??" for the file of interrupt routines. Its header credits the concept to Matthew Clarke, Anthony Clarke, and Ian Stewart (Gremlin Graphics was founded by an Ian Stewart), and the program to Micro Projects, "for gremlin graphics ltd."

The names are the authors' own. The routine this listing calls `menu` is `gloppy`, and `shift_skyline` and `shift_pipe` are `harhil` and `gndhrd`. The bouncy bomb of the inlay is the bouncing ball, and the crash explosive is the suicide plane or the kamikaze. The score routine ends at a label called `xargon`, and Xargon Wars was another of Clarke's games for the C16. The comment above that routine tells off whoever needs telling how to call it: "you've used it in so many games".

The comments are written for the authors, too. The death routine opens with "all the dead nice stuff - although i don't know whats nice about dying ?.", and returns early, when Tex is not dead, with "not actually dead, wally."
