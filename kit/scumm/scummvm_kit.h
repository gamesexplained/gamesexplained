/* The Games Explained kit's additions to ScummVM (kit/scumm/scummvm.py copies this file into
 * ScummVM's source as kit_scumm.h, and scummvm_kit.cpp beside the null backend).
 *
 * The kit builds ScummVM's SCUMM engine on the null backend, which opens no window and plays no
 * sound, and adds four things to it:
 *
 *   a clock      time moves only when the engine waits, so a run goes as fast as the computer
 *                allows and two runs of the same input are the same, instruction for instruction
 *   a trace      every SCUMM instruction the engine runs, with where it is, what it read and
 *                where the script went next, into the file SCUMM_KIT_TRACE names
 *   input        mouse clicks, keys and screenshots at set times, from the file SCUMM_KIT_INPUT
 *                names (kit/scumm/scummvm.py documents the lines), and clicks on a verb, an
 *                object or an actor by its number, after waiting for the game to be ready
 *   a picture    the screen kept in memory, so that a screenshot can be written
 *
 * The engine calls the kitTrace functions and kitEngineStart; the null backend calls the rest. The trace's lines are
 * documented in kit/scumm/strace.py, which reads them.
 *
 * MIT licence, like the rest of the kit; the program built with it is ScummVM's, GPLv3.
 */
#ifndef KIT_SCUMM_H
#define KIT_SCUMM_H

#include "common/scummsys.h"

namespace Common {
struct Event;
}
namespace Audio {
class Mixer;
}
class GraphicsManager;
namespace Scumm {
class ScummEngine;
}

// Engine side: one call when an instruction starts, one for each operand read through
// getVarOrDirectByte/Word, one when it has finished (end < 0: the script stopped).
extern bool kitTraceOn;
void kitTraceBegin(int depth, char where, int number, int room, long at, int opcode);
void kitTraceArg(int value, bool fromVar);
void kitTraceEnd(long end);

// Engine side, for the input's `verb`, `object`, `actor`, `sentence` and `until` lines
// (engines/scumm/kit_scumm_engine.cpp): the engine calls kitEngineStart when the game starts,
// which sets the two below; until then those lines wait.
//   kitWhere  where on the screen a click lands on verb ('v'), object ('o') or actor ('a') number,
//             or on the sentence line ('s'): 1 and the point; 2 and the point of the inventory's
//             arrow that scrolls towards the object; 0 when it is nowhere on the screen, or -1
//             for an object of the room no click finds, with its left edge on the screen and its
//             state in x and y. For 'w', walking towards an object of the room: 3 and the point
//             at the screen's edge to click, or 4 when it is on the screen (x and y its left and
//             right edges there) or not in the room (both -10000)
//   kitAsk    a variable ('v'), a bit variable ('b'), the room ('r'), the actor the player moves
//             ('e'), an object's owner ('o') or state ('s'), whether a sound or tune plays ('S', 1
//             or 0), or whether the game takes a click and nothing is moving or being said ('i')
void kitEngineStart(Scumm::ScummEngine *engine);
extern int (*kitWhere)(char kind, int number, int *x, int *y);
extern int (*kitAsk)(char what, int number);

// Backend side.
void kitInit();
uint32 kitMillis();
void kitDelay(uint msecs);
bool kitPollEvent(Common::Event &event);
void kitMix(Audio::Mixer *mixer);
GraphicsManager *kitGraphicsManager();

#endif
