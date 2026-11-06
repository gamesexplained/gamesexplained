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

struct KitInput {
	uint32 ms;
	int kind;          // the Common::EventType, or one of the two below
	int x, y;
	int keycode, ascii;
	char text[1024];   // what the input file said, for the trace; the path of a screenshot
};

enum { KIT_SHOT = 10000, KIT_NOTE = 10001 };

static KitInput *inputs = nullptr;
static int inputCount = 0, inputCap = 0, inputNext = 0;
static int mouseX = 0, mouseY = 0;

static KitInput &addInput(uint32 ms, int kind) {
	if (inputCount == inputCap) {
		inputCap = inputCap ? inputCap * 2 : 64;
		inputs = (KitInput *)realloc(inputs, inputCap * sizeof(KitInput));
	}
	KitInput &k = inputs[inputCount++];
	memset(&k, 0, sizeof(k));
	k.ms = ms;
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

static void readInputs(const char *path) {
	FILE *f = fopen(path, "r");
	if (!f) {
		fprintf(stderr, "kit: cannot read the input file %s\n", path);
		exit(2);
	}
	char line[1200];
	uint32 last = 0;
	int lineNo = 0;
	while (fgets(line, sizeof(line), f)) {
		lineNo++;
		char *p = line + strspn(line, " \t");
		p[strcspn(p, "\r\n")] = 0;
		if (!*p || *p == '#')
			continue;
		char *rest = p;
		bool relative = *rest == '+';
		uint32 t = strtoul(rest + (relative ? 1 : 0), &rest, 10);
		t = relative ? last + t : t;
		last = t;
		rest += strspn(rest, " \t");
		char verb[32] = "";
		int n = 0;
		sscanf(rest, "%31s%n", verb, &n);
		char *args = rest + n;
		args += strspn(args, " \t");
		KitInput &note = addInput(t, KIT_NOTE);
		snprintf(note.text, sizeof(note.text), "%s", rest);
		int x = 0, y = 0;
		if (!strcmp(verb, "click") || !strcmp(verb, "rclick") || !strcmp(verb, "move")) {
			if (sscanf(args, "%d %d", &x, &y) != 2) {
				fprintf(stderr, "kit: %s line %d: '%s' needs x and y\n", path, lineNo, verb);
				exit(2);
			}
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
			}
		} else if (!strcmp(verb, "key")) {
			int keycode, ascii;
			if (!keyNamed(args, keycode, ascii)) {
				fprintf(stderr, "kit: %s line %d: no key named '%s'\n", path, lineNo, args);
				exit(2);
			}
			addKey(t, keycode, ascii);
		} else if (!strcmp(verb, "type")) {
			for (const char *c = args; *c; c++, t += 100)
				addKey(t, tolower((unsigned char)*c), (unsigned char)*c);
			last = t;
		} else if (!strcmp(verb, "shot")) {
			KitInput &s = addInput(t, KIT_SHOT);
			snprintf(s.text, sizeof(s.text), "%s", args);
		} else if (!strcmp(verb, "quit")) {
			addInput(t, Common::EVENT_QUIT);
		} else {
			fprintf(stderr, "kit: %s line %d: no action '%s' (click, rclick, move, key, type, shot, quit)\n",
			        path, lineNo, verb);
			exit(2);
		}
	}
	fclose(f);
}

static void sortInputs() {
	// in time order, keeping the file's order at the same time
	for (int i = 1; i < inputCount; i++) {
		KitInput k = inputs[i];
		int j = i - 1;
		while (j >= 0 && inputs[j].ms > k.ms) {
			inputs[j + 1] = inputs[j];
			j--;
		}
		inputs[j + 1] = k;
	}
}

bool kitPollEvent(Common::Event &event) {
	while (inputNext < inputCount && inputs[inputNext].ms <= clockMs) {
		KitInput &k = inputs[inputNext++];
		if (k.kind == KIT_NOTE) {
			if (traceFile)
				fprintf(traceFile, "# %u %s\n", (unsigned)clockMs, k.text);
			continue;
		}
		if (k.kind == KIT_SHOT) {
			snprintf(shotPending, sizeof(shotPending), "%s", k.text);
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
	return false;
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
		addInput(strtoul(stop, nullptr, 10), Common::EVENT_QUIT);
	sortInputs();
}
