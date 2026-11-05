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
 *                names (kit/scumm/scummvm.py documents the lines)
 *   a picture    the screen kept in memory, so that a screenshot can be written
 *
 * The engine calls the kitTrace functions; the null backend calls the rest. The trace's lines are
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

// Engine side: one call when an instruction starts, one for each operand read through
// getVarOrDirectByte/Word, one when it has finished (end < 0: the script stopped).
extern bool kitTraceOn;
void kitTraceBegin(int depth, char where, int number, int room, long at, int opcode);
void kitTraceArg(int value, bool fromVar);
void kitTraceEnd(long end);

// Backend side.
void kitInit();
uint32 kitMillis();
void kitDelay(uint msecs);
bool kitPollEvent(Common::Event &event);
void kitMix(Audio::Mixer *mixer);
GraphicsManager *kitGraphicsManager();

#endif
