/* The Games Explained kit's additions to ScummVM's SCUMM engine: what the input's `verb`, `object`,
 * `actor`, `sentence` and `until` lines ask of the game (kit_scumm.h). kit/scumm/scummvm.py copies
 * this file into ScummVM's source as engines/scumm/kit_scumm_engine.cpp.
 *
 * Nothing here changes the game: it reads the engine's state and asks the engine's own hit tests
 * (findObject, getActorFromPos, findVerbAtPos) where a click would land, so that the input can
 * click a thing by its number and the click is an ordinary click at a point on the screen.
 *
 * MIT licence, like the rest of the kit; the program built with it is ScummVM's, GPLv3.
 */

#include "kit_scumm.h"

#include "scumm/actor.h"
#include "scumm/scumm.h"
#include "scumm/scumm_v2.h"
#include "scumm/sound.h"
#include "scumm/object.h"
#include "scumm/verbs.h"

namespace Scumm {

class KitScumm {
public:
	static ScummEngine *vm;

	// Where the game's input script, given a click at screen point (x, y), finds the room: the
	// virtual mouse, in the units a version 1 or 2 script reads it in, as findObject and
	// actorFromPos take it back
	static bool roomPoint(int x, int y, int &rx, int &ry) {
		VirtScreen *vs = &vm->_virtscr[kMainVirtScreen];
		int vx = x + vs->xstart, vy = y - vs->topline;
		if (vy < 0 || vy >= vs->h)
			return false;
		if (vm->_game.version <= 2) {
			rx = (vx >> V12_X_SHIFT) * V12_X_MULTIPLIER;
			ry = (vy >> V12_Y_SHIFT) * V12_Y_MULTIPLIER;
		} else {
			rx = vx;
			ry = vy;
		}
		return true;
	}

	// The middle one of the points that hit, so that the click is inside the thing, not on its edge
	static int middle(int n, const int *xs, const int *ys, int *px, int *py) {
		if (!n)
			return 0;
		*px = xs[n / 2];
		*py = ys[n / 2];
		return 1;
	}

	static int where(char kind, int number, int *px, int *py) {
		if (!vm || !vm->_virtscr[kMainVirtScreen].h)
			return 0;
		static int xs[64000], ys[64000];
		int n = 0;
		const int w = vm->_screenWidth, h = vm->_screenHeight;
		VirtScreen *verbs = &vm->_virtscr[kVerbVirtScreen];
		if (kind == 's') {                      // the sentence line, at the top of the verbs
			*px = w / 2;
			*py = verbs->topline + 4;
			return 1;
		}
		if (kind == 'v') {
			for (int y = 0; y < h; y++)
				for (int x = 0; x < w; x += 2) {
					int slot = vm->findVerbAtPos(x, y);
					if (slot && vm->_verbs[slot].verbid == number && n < 64000) {
						xs[n] = x;
						ys[n++] = y;
					}
				}
			return middle(n, xs, ys, px, py);
		}
		if (kind == 'o' && vm->_game.version <= 2 && vm->getOwner(number) == vm->VAR(vm->VAR_EGO) &&
		    vm->_game.platform != Common::kPlatformNES) {
			// In the inventory: its line if it shows, otherwise the arrow that scrolls towards it
			ScummEngine_v2 *v2 = (ScummEngine_v2 *)vm;
			int count = vm->getInventoryCount(vm->VAR(vm->VAR_EGO)), idx = 0;
			for (int i = 1; i <= count; i++)
				if (vm->findInventory(vm->VAR(vm->VAR_EGO), i) == number)
					idx = i;
			if (!idx)
				return 0;
			int box = idx - 1 - v2->_inventoryOffset, result = 1;
			if (box < 0) {
				box = 4;                        // the up arrow (verbs.cpp, kInventoryUpArrow)
				result = 2;
			} else if (box >= 4) {
				box = 5;                        // the down arrow (kInventoryDownArrow)
				result = 2;
			}
			const Common::Rect &r = v2->_mouseOverBoxesV2[box].rect;
			*px = (r.left + r.right) / 2;
			*py = verbs->topline + (r.top + r.bottom) / 2;
			return result;
		}
		if (kind == 'w') {
			// Towards an object of the room until it is on the screen: 4 when it is, otherwise 3 and
			// a point on the floor at the screen's edge on its side, at the height actors reach it
			VirtScreen *vs = &vm->_virtscr[kMainVirtScreen];
			for (int i = 1; i < vm->_numLocalObjects; i++) {
				const ObjectData &od = vm->_objs[i];
				if (od.obj_nr != number)
					continue;
				int left = od.x_pos - vs->xstart, right = left + MAX<int>(od.width, 8);
				if (right > 0 && left < w) {    // some of it shows: a click can find it
					*px = left;
					*py = right;
					return 4;
				}
				// If a door or a way out covers that point (an object with a script for Walk to),
				// the nearest point along the edge that none covers: the click would go through it
				int ex = right <= 0 ? 4 : w - 5, ey = vs->topline + MIN<int>(od.walk_y, vs->h - 1);
				*px = ex;
				*py = ey;
				int rx, ry, at;
				if (!roomPoint(ex, ey, rx, ry) || !(at = vm->findObject(rx, ry)) ||
				    !vm->getVerbEntrypoint(at, kVerbWalkTo))
					return 3;
				for (int dx = 0; dx < 48; dx += 2)
					for (int dy = 0; dy <= 24; dy += 2)
						for (int s = -1; s <= 1; s += 2) {
							int x = right <= 0 ? ex + dx : ex - dx, y = ey + s * dy;
							if (y >= vs->topline && roomPoint(x, y, rx, ry) && !vm->getActorFromPos(rx, ry) &&
							    (!(at = vm->findObject(rx, ry)) || !vm->getVerbEntrypoint(at, kVerbWalkTo))) {
								*px = x;
								*py = y;
								return 3;
							}
						}
				return 3;
			}
			*px = *py = -10000;
			return 4;                           // not in the room (carried, say): nothing to walk to
		}
		if (kind == 'o' || kind == 'a') {
			// Points in the room: first those where no actor stands, for an object
			for (int pass = 0; pass < 2 && !n; pass++)
				for (int y = 0; y < h; y++)
					for (int x = 0; x < w; x += 2) {
						int rx, ry;
						if (!roomPoint(x, y, rx, ry))
							continue;
						int actor = vm->getActorFromPos(rx, ry);
						bool hit = kind == 'a' ? actor == number
						                       : vm->findObject(rx, ry) == number && (pass == 1 || actor == 0);
						if (hit && n < 64000) {
							xs[n] = x;
							ys[n++] = y;
						}
					}
			if (n || kind != 'o')
				return middle(n, xs, ys, px, py);
			// Not found: if the object is in the room, say where it is and its state, so that the
			// input's author can see what covers it or hides it
			for (int i = 1; i < vm->_numLocalObjects; i++)
				if (vm->_objs[i].obj_nr == number) {
					*px = vm->_objs[i].x_pos - vm->_virtscr[kMainVirtScreen].xstart;
					*py = vm->_objs[i].state;
					return -1;
				}
			return 0;
		}
		return 0;
	}

	static int ask(char what, int number) {
		if (!vm)
			return -1;
		switch (what) {
		case 'v':                               // a variable
			return number >= 0 && number < vm->_numVariables ? vm->_scummVars[number] : -1;
		case 'b':                               // a bit variable, as versions 1 and 2 keep them
			if (number < 0 || (number >> 4) >= vm->_numVariables)
				return -1;
			return (vm->_scummVars[number >> 4] >> (number & 15)) & 1;
		case 'r':
			return vm->VAR(vm->VAR_ROOM);
		case 'e':
			return vm->VAR(vm->VAR_EGO);
		case 'o':
			return number > 0 && number < vm->_numGlobalObjects ? vm->getOwner(number) : -1;
		case 's':
			return number > 0 && number < vm->_numGlobalObjects ? vm->getState(number) : -1;
		case 'S':                               // a sound or tune playing: 1, or 0
			return vm->_sound && vm->_sound->isSoundRunning(number) ? 1 : 0;
		case 'i': {                             // the game takes a click and nothing is going on
			if (vm->_userPut <= 0 || vm->_sentenceNum || vm->_haveMsg)
				return 0;
			int ego = vm->VAR(vm->VAR_EGO);
			if (ego > 0 && ego < vm->_numActors && vm->_actors[ego]->_moving)
				return 0;
			return 1;
		}
		default:
			return -1;
		}
	}
};

ScummEngine *KitScumm::vm = nullptr;

} // End of namespace Scumm

static int kitWhereImpl(char kind, int number, int *x, int *y) {
	return Scumm::KitScumm::where(kind, number, x, y);
}

static int kitAskImpl(char what, int number) {
	return Scumm::KitScumm::ask(what, number);
}

void kitEngineStart(Scumm::ScummEngine *engine) {
	Scumm::KitScumm::vm = engine;
	kitWhere = kitWhereImpl;
	kitAsk = kitAskImpl;
}
