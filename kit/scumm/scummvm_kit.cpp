/* The Games Explained kit's additions to ScummVM: the clock, the trace, the input and the picture
 * (kit_scumm.h says what each is). kit/scumm/scummvm.py copies this file into ScummVM's source as
 * backends/platform/null/kit_scumm.cpp and builds it into the null backend.
 *
 * MIT licence, like the rest of the kit; the program built with it is ScummVM's, GPLv3.
 */

#define FORBIDDEN_SYMBOL_ALLOW_ALL

#include "kit_scumm.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "audio/mixer_intern.h"
#include "backends/graphics/null/null-graphics.h"
#include "common/events.h"
#include "common/keyboard.h"
#include "graphics/surface.h"

// ---- the clock: it moves only when the engine waits ------------------------------------------

static uint32 clockMs = 0;

uint32 kitMillis() {
	return clockMs;
}

void kitDelay(uint msecs) {
	clockMs += msecs ? msecs : 1;
}

// The null mixer mixed a buffer on every poll of events; here it mixes as much sound as the clock
// has moved on, so that a script that waits for a tune or a sound waits as long as it would.
static uint64 framesMixed = 0;

void kitMix(Audio::Mixer *mixer) {
	if (!mixer)
		return;
	static byte buf[2048 * 4];
	const uint32 rate = mixer->getOutputRate();
	const uint64 want = (uint64)clockMs * rate / 1000;
	while (framesMixed + 2048 <= want) {
		((Audio::MixerImpl *)mixer)->mixCallback(buf, sizeof(buf));
		framesMixed += 2048;
	}
}

// ---- the trace ------------------------------------------------------------------------------

bool kitTraceOn = false;
static FILE *traceFile = nullptr;
static unsigned long traceSeq = 0;

struct TraceRec {
	unsigned long seq;
	int depth;
	uint32 ms;
	char where;
	int number;
	int room;
	long at;
	int opcode;
	int nargs;
	int args[16];
	bool fromVar[16];
};

static TraceRec traceStack[64];
static int traceTop = 0;

void kitTraceBegin(int depth, char where, int number, int room, long at, int opcode) {
	if (traceTop >= 64)
		return;
	TraceRec &r = traceStack[traceTop++];
	r.seq = ++traceSeq;
	r.depth = depth;
	r.ms = clockMs;
	r.where = where;
	r.number = number;
	r.room = room;
	r.at = at;
	r.opcode = opcode;
	r.nargs = 0;
}

void kitTraceArg(int value, bool fromVar) {
	if (traceTop == 0)
		return;
	TraceRec &r = traceStack[traceTop - 1];
	if (r.nargs < 16) {
		r.args[r.nargs] = value;
		r.fromVar[r.nargs] = fromVar;
		r.nargs++;
	}
}

void kitTraceEnd(long end) {
	if (traceTop == 0)
		return;
	TraceRec &r = traceStack[--traceTop];
	if (!traceFile)
		return;
	fprintf(traceFile, "%lu %d %u %c%d %d %04lX %02X ", r.seq, r.depth, (unsigned)r.ms, r.where, r.number,
	        r.room, r.at, r.opcode);
	if (end < 0)
		fputs("-", traceFile);
	else
		fprintf(traceFile, "%04lX", end);
	if (r.nargs) {
		fputs(" a:", traceFile);
		for (int i = 0; i < r.nargs; i++)
			fprintf(traceFile, "%s%s%d", i ? "," : "", r.fromVar[i] ? "v" : "", r.args[i]);
	}
	fputc('\n', traceFile);
}

// ---- the picture ----------------------------------------------------------------------------

static char shotPending[1024] = "";

class KitGraphicsManager : public NullGraphicsManager {
public:
	KitGraphicsManager() {
		memset(_palette, 0, sizeof(_palette));
	}
	~KitGraphicsManager() override {
		_screen.free();
	}

	void initSize(uint width, uint height, const Graphics::PixelFormat *format) override {
		NullGraphicsManager::initSize(width, height, format);
		_screen.free();
		_screen.create(width, height, format ? *format : Graphics::PixelFormat::createFormatCLUT8());
	}
	void setPalette(const byte *colors, uint start, uint num) override {
		if (start < 256)
			memcpy(_palette + start * 3, colors, MIN<uint>(num, 256 - start) * 3);
	}
	void grabPalette(byte *colors, uint start, uint num) const override {
		if (start < 256)
			memcpy(colors, _palette + start * 3, MIN<uint>(num, 256 - start) * 3);
	}
	void copyRectToScreen(const void *buf, int pitch, int x, int y, int w, int h) override {
		if (_screen.getPixels())
			_screen.copyRectToSurface(buf, pitch, x, y, w, h);
	}
	Graphics::Surface *lockScreen() override {
		return _screen.getPixels() ? &_screen : nullptr;
	}
	void fillScreen(uint32 col) override {
		if (_screen.getPixels())
			_screen.fillRect(Common::Rect(_screen.w, _screen.h), col);
	}
	void fillScreen(const Common::Rect &r, uint32 col) override {
		if (_screen.getPixels())
			_screen.fillRect(r, col);
	}
	void updateScreen() override {
		if (shotPending[0]) {
			write(shotPending);
			shotPending[0] = 0;
		}
	}

private:
	void write(const char *path) {
		FILE *f = fopen(path, "wb");
		if (!f || !_screen.getPixels()) {
			if (f)
				fclose(f);
			return;
		}
		fprintf(f, "P6\n%d %d\n255\n", _screen.w, _screen.h);
		for (int y = 0; y < _screen.h; y++) {
			for (int x = 0; x < _screen.w; x++) {
				uint32 c = _screen.getPixel(x, y);
				byte rgb[3];
				if (_screen.format.bytesPerPixel == 1) {
					memcpy(rgb, _palette + (c & 0xFF) * 3, 3);
				} else {
					byte a;
					_screen.format.colorToARGB(c, a, rgb[0], rgb[1], rgb[2]);
				}
				fwrite(rgb, 1, 3, f);
			}
		}
		fclose(f);
	}

	Graphics::Surface _screen;
	byte _palette[256 * 3];
};

GraphicsManager *kitGraphicsManager() {
	return new KitGraphicsManager();
}

// ---- input ----------------------------------------------------------------------------------

// The input file's lines, in order. Each is timed from the start of the run, or from the moment
// the last `until` before it held: `anchor` is that until's number (0: the start).
struct KitInput {
	uint32 ms;
	int anchor;
	int kind;          // the Common::EventType, or one of the kit's below
	int x, y;
	int keycode, ascii;
	int line;
	char what;         // a target: 'v' verb, 'o' object, 'a' actor, 's' the sentence line;
	int number;        //   an until: what kitAsk is asked, and of which number
	char op[8];        // an until: the comparison, the value, at most how long, how long it must hold
	int value;
	uint32 within, hold;
	int ownAnchor;     // an until: the number of the anchor it starts
	int others[7], otherCount;  // a target: the numbers after the first in `object 572|573`, tried in turn
	char text[1024];   // what the input file said, for the trace; the path of a screenshot
};

enum { KIT_SHOT = 10000, KIT_NOTE = 10001, KIT_TARGET = 10002, KIT_UNTIL = 10003, KIT_SHOW = 10004 };

int (*kitWhere)(char kind, int number, int *x, int *y) = nullptr;
int (*kitAsk)(char what, int number) = nullptr;

static KitInput *inputs = nullptr;
static int inputCount = 0, inputCap = 0, inputNext = 0;
static int mouseX = 0, mouseY = 0;
static const char *inputPath = "";
static uint32 anchorAt[100000];          // when each until held
static int anchorCount = 0;

static KitInput &addInput(uint32 ms, int kind) {
	if (inputCount == inputCap) {
		inputCap = inputCap ? inputCap * 2 : 64;
		inputs = (KitInput *)realloc(inputs, inputCap * sizeof(KitInput));
	}
	KitInput &k = inputs[inputCount++];
	memset(&k, 0, sizeof(k));
	k.ms = ms;
	k.anchor = anchorCount;
	k.kind = kind;
	return k;
}

static bool keyNamed(const char *name, int &keycode, int &ascii) {
	static const struct { const char *name; int keycode, ascii; } named[] = {
		{"RETURN", Common::KEYCODE_RETURN, 13}, {"ENTER", Common::KEYCODE_RETURN, 13},
		{"ESCAPE", Common::KEYCODE_ESCAPE, 27}, {"SPACE", Common::KEYCODE_SPACE, 32},
		{"BACKSPACE", Common::KEYCODE_BACKSPACE, 8}, {"TAB", Common::KEYCODE_TAB, 9},
		{"UP", Common::KEYCODE_UP, 0}, {"DOWN", Common::KEYCODE_DOWN, 0},
		{"LEFT", Common::KEYCODE_LEFT, 0}, {"RIGHT", Common::KEYCODE_RIGHT, 0},
	};
	for (size_t i = 0; i < ARRAYSIZE(named); i++) {
		if (!scumm_stricmp(name, named[i].name)) {
			keycode = named[i].keycode;
			ascii = named[i].ascii;
			return true;
		}
	}
	if ((name[0] == 'F' || name[0] == 'f') && isdigit((unsigned char)name[1])) {
		int n = atoi(name + 1);
		if (n >= 1 && n <= 12) {
			keycode = Common::KEYCODE_F1 + n - 1;
			ascii = Common::ASCII_F1 + n - 1;
			return true;
		}
	}
	if (name[0] && !name[1]) {
		ascii = (unsigned char)name[0];
		keycode = tolower(ascii);
		return true;
	}
	return false;
}

static void addKey(uint32 ms, int keycode, int ascii) {
	KitInput &d = addInput(ms, Common::EVENT_KEYDOWN);
	d.keycode = keycode;
	d.ascii = ascii;
	KitInput &u = addInput(ms + 50, Common::EVENT_KEYUP);
	u.keycode = keycode;
	u.ascii = ascii;
}

static void inputError(int lineNo, const char *what) {
	fprintf(stderr, "kit: %s line %d: %s\n", inputPath, lineNo, what);
	exit(2);
}

// What `until` can wait for: the word, what kitAsk is asked, and whether it takes a number
static const struct { const char *word; char what; bool numbered; } untilWords[] = {
	{"var", 'v', true}, {"bit", 'b', true}, {"owner", 'o', true}, {"state", 's', true}, {"sound", 'S', true},
	{"room", 'r', false}, {"ego", 'e', false}, {"ready", 'i', false},
};

static void readUntil(KitInput &u, char *args, int lineNo) {
	char word[32] = "";
	int n = 0;
	if (sscanf(args, "%31s%n", word, &n) != 1)
		inputError(lineNo, "'until' needs what to wait for: ready, room N, ego N, var N = V, bit N = V, "
		                   "owner OBJECT = ACTOR, state OBJECT = S or sound N = 0");
	args += n;
	size_t i;
	for (i = 0; i < ARRAYSIZE(untilWords); i++)
		if (!strcmp(word, untilWords[i].word))
			break;
	if (i == ARRAYSIZE(untilWords))
		inputError(lineNo, "'until' waits for ready, room, ego, var, bit, owner, state or sound");
	u.what = untilWords[i].what;
	u.within = 120000;
	u.hold = 0;
	if (u.what == 'i') {
		// for two seconds running, unless it says how long: a verb's script can pause before it
		// goes on (a delay, then a message), and a gap between two of its steps is not the end
		u.hold = 2000;
		unsigned long hold;
		if (sscanf(args, "%lu%n", &hold, &n) == 1) {
			u.hold = hold;
			args += n;
		}
		snprintf(u.op, sizeof(u.op), "=");
		u.value = 1;
	} else {
		if (untilWords[i].numbered) {
			if (sscanf(args, "%d%n", &u.number, &n) != 1)
				inputError(lineNo, "'until var', 'bit', 'owner', 'state' and 'sound' need a number");
			args += n;
		}
		char op[8] = "";
		args += strspn(args, " \t");
		if (u.what == 'r' || u.what == 'e') {           // until room 5, until ego 2: = is understood
			snprintf(op, sizeof(op), "=");
			if (*args == '=')
				args++;
		} else if (!strncmp(args, "has", 3) && isspace((unsigned char)args[3])) {
			snprintf(op, sizeof(op), "has");      // every bit of the value is set: a state's bits
			args += 3;
		} else if (!strncmp(args, "lacks", 5) && isspace((unsigned char)args[5])) {
			snprintf(op, sizeof(op), "lacks");    // none of them is
			args += 5;
		} else {
			size_t len = strspn(args, "=!<>");
			if (len < sizeof(op)) {
				memcpy(op, args, len);
				op[len] = 0;
			}
			args += len;
		}
		if (strcmp(op, "=") && strcmp(op, "!=") && strcmp(op, "<") && strcmp(op, ">") && strcmp(op, "<=") &&
		    strcmp(op, ">=") && strcmp(op, "has") && strcmp(op, "lacks"))
			inputError(lineNo, "'until' compares with =, !=, <, >, <=, >=, has or lacks");
		snprintf(u.op, sizeof(u.op), "%s", op);
		if (sscanf(args, "%d%n", &u.value, &n) != 1)
			inputError(lineNo, "'until' needs the value to compare with");
		args += n;
	}
	unsigned long within;
	if (sscanf(args, " within %lu", &within) == 1)
		u.within = within;
}

static void readInputs(const char *path) {
	inputPath = path;
	FILE *f = fopen(path, "r");
	if (!f) {
		fprintf(stderr, "kit: cannot read the input file %s\n", path);
		exit(2);
	}
	char line[1200];
	uint32 last = 0, segmentEnd = 0;
	int lineNo = 0;
	while (fgets(line, sizeof(line), f)) {
		lineNo++;
		char *p = line + strspn(line, " \t");
		p[strcspn(p, "\r\n")] = 0;
		if (!*p || *p == '#')
			continue;
		char *rest = p;
		bool relative = *rest == '+';
		if (!relative && !isdigit((unsigned char)*rest))
			inputError(lineNo, "a line starts with its time: milliseconds, or +N after the line before");
		uint32 t = strtoul(rest + (relative ? 1 : 0), &rest, 10);
		if (!relative && anchorCount)
			inputError(lineNo, "after an 'until', every line's time is +N: the time it holds is not known "
			                   "before the run");
		t = relative ? last + t : t;
		last = t;
		rest += strspn(rest, " \t");
		char verb[32] = "";
		int n = 0;
		sscanf(rest, "%31s%n", verb, &n);
		char *args = rest + n;
		args += strspn(args, " \t");
		if (strcmp(verb, "type")) {     // a comment after the line, except where it may be typed
			char *hash = strstr(args, " #");
			char *tab = strstr(args, "\t#");
			if (tab && (!hash || tab < hash))
				hash = tab;
			if (hash)
				*hash = 0;
			if (*args == '#')
				*args = 0;
			for (size_t len = strlen(rest); len && (rest[len - 1] == ' ' || rest[len - 1] == '\t'); len--)
				rest[len - 1] = 0;
		}
		KitInput &note = addInput(t, KIT_NOTE);
		snprintf(note.text, sizeof(note.text), "%s", rest);
		note.line = lineNo;
		int x = 0, y = 0;
		uint32 end = t;
		if (!strcmp(verb, "click") || !strcmp(verb, "rclick") || !strcmp(verb, "move")) {
			if (sscanf(args, "%d %d", &x, &y) != 2)
				inputError(lineNo, "'click', 'rclick' and 'move' need x and y");
			KitInput &m = addInput(t, Common::EVENT_MOUSEMOVE);
			m.x = x;
			m.y = y;
			if (verb[0] != 'm') {
				bool right = verb[0] == 'r';
				KitInput &d = addInput(t, right ? Common::EVENT_RBUTTONDOWN : Common::EVENT_LBUTTONDOWN);
				d.x = x;
				d.y = y;
				KitInput &u = addInput(t + 50, right ? Common::EVENT_RBUTTONUP : Common::EVENT_LBUTTONUP);
				u.x = x;
				u.y = y;
				end = t + 50;
			}
		} else if (!strcmp(verb, "verb") || !strcmp(verb, "object") || !strcmp(verb, "actor") ||
		           !strcmp(verb, "sentence") || !strcmp(verb, "walkto")) {
			KitInput &k = addInput(t, KIT_TARGET);
			k.what = verb[0];
			k.line = lineNo;
			snprintf(k.text, sizeof(k.text), "%s", rest);
			int n = 0;
			if (k.what != 's' && sscanf(args, "%d%n", &k.number, &n) != 1)
				inputError(lineNo, "'verb', 'object', 'actor' and 'walkto' need the number of the thing");
			// object 572|573|574: the first of them that is on the screen (a room whose ways out
			// change, say)
			for (const char *a = args + n; *a == '|';) {
				int more = 0, len = 0;
				if (sscanf(a + 1, "%d%n", &more, &len) != 1 || k.otherCount >= (int)ARRAYSIZE(k.others))
					inputError(lineNo, "after a |, the number of another thing (at most eight in all)");
				k.others[k.otherCount++] = more;
				a += 1 + len;
			}
			end = t + 50;
		} else if (!strcmp(verb, "until")) {
			// It waits after everything before it: its time is that of the last thing before it
			KitInput &u = addInput(t > segmentEnd ? t : segmentEnd, KIT_UNTIL);
			u.line = lineNo;
			snprintf(u.text, sizeof(u.text), "%s", rest);
			readUntil(u, args, lineNo);
			if (anchorCount + 1 >= (int)ARRAYSIZE(anchorAt))
				inputError(lineNo, "too many 'until' lines");
			u.ownAnchor = ++anchorCount;
			last = segmentEnd = 0;
			continue;
		} else if (!strcmp(verb, "key")) {
			int keycode, ascii;
			char name[64] = "";
			sscanf(args, "%63s", name);
			if (!keyNamed(name, keycode, ascii)) {
				char msg[128];
				snprintf(msg, sizeof(msg), "no key named '%s'", name);
				inputError(lineNo, msg);
			}
			addKey(t, keycode, ascii);
			end = t + 50;
		} else if (!strcmp(verb, "type")) {
			for (const char *c = args; *c; c++, t += 100)
				addKey(t, tolower((unsigned char)*c), (unsigned char)*c);
			last = t;
			end = t;
		} else if (!strcmp(verb, "show")) {
			// show var 131 6: the values of six variables from 131 on, written in the trace (what
			// the game chose at random, say), and the same for bit, owner and state
			KitInput &s = addInput(t, KIT_SHOW);
			char word[32] = "";
			int count = 1, got = sscanf(args, "%31s %d %d", word, &s.number, &count);
			size_t w;
			for (w = 0; w < ARRAYSIZE(untilWords) && strcmp(word, untilWords[w].word); w++)
				;
			if (got < 2 || w == ARRAYSIZE(untilWords) || !untilWords[w].numbered || count < 1 || count > 64)
				inputError(lineNo, "'show' needs var, bit, owner, state or sound, a number, and how many "
				                   "(1 to 64)");
			s.what = untilWords[w].what;
			s.value = count;
			snprintf(s.text, sizeof(s.text), "%s %d", word, s.number);
		} else if (!strcmp(verb, "shot")) {
			KitInput &s = addInput(t, KIT_SHOT);
			snprintf(s.text, sizeof(s.text), "%s", args);
		} else if (!strcmp(verb, "quit")) {
			addInput(t, Common::EVENT_QUIT);
		} else {
			char msg[160];
			snprintf(msg, sizeof(msg), "no action '%s' (click, rclick, move, verb, object, actor, sentence, "
			         "until, key, type, show, shot, quit)", verb);
			inputError(lineNo, msg);
		}
		if (end > segmentEnd)
			segmentEnd = end;
	}
	fclose(f);
}

static void sortInputs() {
	// in time order within each stretch between two untils, keeping the file's order at the same time
	for (int i = 1; i < inputCount; i++) {
		KitInput k = inputs[i];
		int j = i - 1;
		while (j >= 0 && (inputs[j].anchor > k.anchor || (inputs[j].anchor == k.anchor && inputs[j].ms > k.ms))) {
			inputs[j + 1] = inputs[j];
			j--;
		}
		inputs[j + 1] = k;
	}
}

// The input stops the run: a thing it was to click is not on the screen, or an until never held
static void inputStop(const KitInput &k, const char *why) {
	fprintf(stderr, "kit: %s line %d, '%s': %s at %u ms on the game's clock; the run stops\n", inputPath,
	        k.line, k.text, why, (unsigned)clockMs);
	if (traceFile) {
		fprintf(traceFile, "# %u stopped: line %d, '%s': %s\n", (unsigned)clockMs, k.line, k.text, why);
		fflush(traceFile);
	}
	fflush(stderr);
	_exit(3);
}

static bool compare(int a, const char *op, int b) {
	if (!strcmp(op, "="))
		return a == b;
	if (!strcmp(op, "!="))
		return a != b;
	if (!strcmp(op, "<"))
		return a < b;
	if (!strcmp(op, ">"))
		return a > b;
	if (!strcmp(op, "<="))
		return a <= b;
	if (!strcmp(op, "has"))
		return (a & b) == b;
	if (!strcmp(op, "lacks"))
		return (a & b) == 0;
	return a >= b;
}

// A click the input asked for by a thing's number: the mouse to the point, the button down, up
struct Injected {
	uint32 ms;
	int kind;
};
static Injected injected[3];
static int injectedCount = 0, injectedNext = 0;
static uint32 untilSince = 0, untilHeldSince = 0;
static bool untilStarted = false, untilHeld = false;
static uint32 retryAt = 0;
static int retries = 0;
static uint32 stopAt = 0;            // SCUMM_KIT_STOP: the game's clock at which the run stops, whatever the input

static void inject(int x, int y) {
	mouseX = x;
	mouseY = y;
	injected[0] = {clockMs, Common::EVENT_MOUSEMOVE};
	injected[1] = {clockMs, Common::EVENT_LBUTTONDOWN};
	injected[2] = {clockMs + 50, Common::EVENT_LBUTTONUP};
	injectedCount = 3;
	injectedNext = 0;
}

static uint32 dueAt(const KitInput &k) {
	return (k.anchor ? anchorAt[k.anchor] : 0) + k.ms;
}

bool kitPollEvent(Common::Event &event) {
	static int lastRoom = -1;               // each room the game moves to, noted in the trace
	if (traceFile && kitAsk) {
		int room = kitAsk('r', 0);
		if (room != lastRoom && room > 0) {
			fprintf(traceFile, "# %u room %d\n", (unsigned)clockMs, room);
			lastRoom = room;
		}
	}
	if (stopAt && clockMs >= stopAt) {
		stopAt = 0;                     // once: the engine takes it from there
		event = Common::Event();
		event.type = Common::EVENT_QUIT;
		return true;
	}
	for (;;) {
		if (injectedNext < injectedCount) {
			if (injected[injectedNext].ms > clockMs)
				return false;
			event = Common::Event();
			event.type = (Common::EventType)injected[injectedNext++].kind;
			event.mouse = Common::Point(mouseX, mouseY);
			return true;
		}
		if (inputNext >= inputCount)
			return false;
		KitInput &k = inputs[inputNext];
		if (dueAt(k) > clockMs || retryAt > clockMs)
			return false;
		if (k.kind == KIT_UNTIL) {
			if (!untilStarted) {
				untilStarted = true;
				untilSince = clockMs;
				untilHeld = false;
			}
			bool holds = kitAsk && compare(kitAsk(k.what, k.number), k.op, k.value);
			if (holds && !untilHeld) {
				untilHeld = true;
				untilHeldSince = clockMs;
			} else if (!holds) {
				untilHeld = false;
			}
			if (untilHeld && clockMs - untilHeldSince >= k.hold) {
				anchorAt[k.ownAnchor] = clockMs;
				if (traceFile)
					fprintf(traceFile, "# %u held: %s\n", (unsigned)clockMs, k.text);
				untilStarted = false;
				inputNext++;
				continue;
			}
			if (clockMs - untilSince > k.within) {
				char why[96];
				snprintf(why, sizeof(why), "it did not hold within %u ms", (unsigned)k.within);
				inputStop(k, why);
			}
			return false;
		}
		if (k.kind == KIT_TARGET) {
			int x = 0, y = 0;
			int found = kitWhere ? kitWhere(k.what, k.number, &x, &y) : 0;
			for (int i = 0; i < k.otherCount && found <= 0 && kitWhere; i++)
				found = kitWhere(k.what, k.others[i], &x, &y);
			if (!found)
				inputStop(k, kitWhere ? "it is nowhere on the screen" : "the game has not started");
			if (found < 0) {
				char why[160];
				snprintf(why, sizeof(why), "it is in the room, its left edge at screen x %d and its state %d, "
				         "but no click on the screen finds it", x, y);
				inputStop(k, why);
			}
			if (found == 4) {               // walkto: the object is on the screen
				if (traceFile && x > -10000)
					fprintf(traceFile, "# %u in view, from screen x %d to %d: %s\n", (unsigned)clockMs, x, y,
					        k.text);
				else if (traceFile)
					fprintf(traceFile, "# %u not in the room: %s\n", (unsigned)clockMs, k.text);
				anchorAt[k.anchor] += clockMs - dueAt(k);
				retryAt = 0;
				retries = 0;
				inputNext++;
				continue;
			}
			if (traceFile)
				fprintf(traceFile, "# %u click %d %d for %s%s\n", (unsigned)clockMs, x, y, k.text,
				        found == 2 ? ": the inventory's arrow first" : found == 3 ? ": the screen's edge" : "");
			inject(x, y);
			if (found == 2) {               // scroll the inventory, then look again
				if (++retries > 50)
					inputStop(k, "the inventory's arrow did not bring it into view");
				retryAt = clockMs + 200;
			} else if (found == 3) {        // walk towards it, then look again
				if (++retries > 30)
					inputStop(k, "walking to the screen's edge did not bring it into view");
				retryAt = clockMs + 1500;
			} else {
				// A click that came late, after the inventory scrolled, moves the lines after it on
				// as much, so that they keep their distance from it
				uint32 late = clockMs - dueAt(k);
				anchorAt[k.anchor] += late;
				retryAt = 0;
				retries = 0;
				inputNext++;
			}
			continue;
		}
		inputNext++;
		if (k.kind == KIT_NOTE) {
			if (traceFile)
				fprintf(traceFile, "# %u %s\n", (unsigned)clockMs, k.text);
			continue;
		}
		if (k.kind == KIT_SHOT) {
			snprintf(shotPending, sizeof(shotPending), "%s", k.text);
			continue;
		}
		if (k.kind == KIT_SHOW) {
			if (traceFile) {
				fprintf(traceFile, "# %u %s on:", (unsigned)clockMs, k.text);
				for (int i = 0; i < k.value; i++)
					fprintf(traceFile, " %d", kitAsk ? kitAsk(k.what, k.number + i) : -1);
				fputc('\n', traceFile);
			}
			continue;
		}
		event = Common::Event();
		event.type = (Common::EventType)k.kind;
		if (k.kind == Common::EVENT_KEYDOWN || k.kind == Common::EVENT_KEYUP) {
			event.kbd = Common::KeyState((Common::KeyCode)k.keycode, k.ascii);
		} else {
			if (k.kind == Common::EVENT_MOUSEMOVE) {
				mouseX = k.x;
				mouseY = k.y;
			}
			event.mouse = Common::Point(mouseX, mouseY);
		}
		return true;
	}
}

void kitInit() {
	const char *trace = getenv("SCUMM_KIT_TRACE");
	if (trace && *trace) {
		traceFile = fopen(trace, "w");
		if (!traceFile) {
			fprintf(stderr, "kit: cannot write the trace file %s\n", trace);
			exit(2);
		}
		setvbuf(traceFile, nullptr, _IOFBF, 1 << 20);
		fputs("# SCUMM trace from ScummVM with the Games Explained kit's additions (kit/scumm/strace.py)\n", traceFile);
		kitTraceOn = true;
	}
	const char *input = getenv("SCUMM_KIT_INPUT");
	if (input && *input)
		readInputs(input);
	const char *stop = getenv("SCUMM_KIT_STOP");
	if (stop && *stop)
		stopAt = strtoul(stop, nullptr, 10);
	sortInputs();
}
