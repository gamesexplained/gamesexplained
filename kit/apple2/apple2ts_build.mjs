// Builds the kit's Apple II server: kit/apple2/apple2ts_server.mjs and kit/apple2/apple2ts_clock.mjs,
// bundled with the worker sources of an Apple2TS checkout into one Node script.
//
//   node kit/apple2/apple2ts_build.mjs --apple2ts <checkout> --esbuild <folder> --out <file.cjs> [--stamp <text>]
//
// kit/apple2/tools.py runs it (`get-apple2ts`, and again whenever these files change); --esbuild is
// the folder npm installed esbuild into, and --stamp goes on the bundle's first line so that the
// launcher can tell a bundle built from older kit files. The bundle holds Apple2TS's copies of the
// Apple IIe's ROMs, so it stays in tools/ and is never committed.
//
// What the build changes in Apple2TS, each checked to apply exactly once:
//  - every module's setTimeout and setInterval run on the machine's cycle count (apple2ts_clock.mjs);
//  - worker2main, which posts to Apple2TS's page, passes the speaker's clicks and the Mockingboard's
//    registers to the server's hooks instead;
//  - the game patches are off (games/game_mappings.ts: Apple2TS changes some twenty games it recognises);
//  - the Disk II controller and the paddle timer get a save and a restore of the private state that
//    Apple2TS's own save state leaves out;
//  - memory.ts lends its table of where each page's writes land, and cpu6502.ts's watchpoint test
//    tells the server's hook about every data read and write.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

function option(name) {
    const i = process.argv.indexOf(name);
    return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

const checkout = option("--apple2ts");
const esbuildDir = option("--esbuild");
const out = option("--out");
const stamp = option("--stamp") ?? "";
if (!checkout || !esbuildDir || !out) {
    console.error("usage: node kit/apple2/apple2ts_build.mjs --apple2ts <checkout> --esbuild <folder> --out <file.cjs> [--stamp <text>]");
    process.exit(2);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const src = path.resolve(checkout, "src");
const clock = path.join(here, "apple2ts_clock.mjs");
const realW2M = path.join(src, "worker", "worker2main.ts");
const realGames = path.join(src, "worker", "games", "game_mappings.ts");
for (const f of [realW2M, realGames, path.join(here, "apple2ts_server.mjs"), clock])
    if (!fs.existsSync(f)) {
        console.error(`missing ${f}: is ${checkout} a checkout of Apple2TS (kit/apple2/INSTALL.md)?`);
        process.exit(1);
    }
const esbuild = createRequire(path.join(path.resolve(esbuildDir), "package.json"))("esbuild");

const at = JSON.stringify(clock);

// Code added to the end of a module. `needs` are the module's own names the code uses: each must
// be declared there, or the build stops (an undeclared name would only fail when the code runs).
const APPEND = {
    "worker/devices/diskdata.ts": {
        needs: ["prevCycleCount", "cycleRemainder", "dataRegister", "dataRegHold", "MOTOR_RUNNING", "DATA_LATCH",
            "fullRevolutionCount", "randPos", "headWindow", "motorOffTimeout", "doMotorTimeout", "getCurrentDriveState"],
        code: `
import { vSetTimeoutAt as kitAt, vTimerDue as kitDue } from ${at}
export const kitDiskSave = () => ({ prevCycleCount, cycleRemainder, dataRegister, dataRegHold, MOTOR_RUNNING,
  DATA_LATCH, fullRevolutionCount, randPos, headWindow, motorOffDue: motorOffTimeout ? kitDue(motorOffTimeout as number) : -1 })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const kitDiskRestore = (s: any) => {
  if (!s) return
  prevCycleCount = s.prevCycleCount; cycleRemainder = s.cycleRemainder; dataRegister = s.dataRegister
  dataRegHold = s.dataRegHold; MOTOR_RUNNING = s.MOTOR_RUNNING; DATA_LATCH = s.DATA_LATCH
  fullRevolutionCount = s.fullRevolutionCount; randPos = s.randPos; headWindow = s.headWindow
  motorOffTimeout = s.motorOffDue >= 0 ? kitAt(() => doMotorTimeout(getCurrentDriveState()), s.motorOffDue) : 0
}
`,
    },
    "worker/devices/joystick.ts": {
        needs: ["countStart"],
        code: `
export const kitJoySave = () => ({ countStart })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const kitJoyRestore = (s: any) => { if (s) countStart = s.countStart }
`,
    },
    "worker/memory.ts": {
        needs: ["addressSetTable", "ADDRESS_GUARD"],
        code: `
export const kitAddressSetTable = addressSetTable
export const kitAddressGuard = ADDRESS_GUARD
`,
    },
};

// Text replaced in a module: each `from` must occur exactly once.
const REPLACE = {
    "worker/cpu6502.ts": [
        {
            from: "export const isWatchpoint = (addr: number, value: number, set: boolean) => {\n",
            to: "export const isWatchpoint = (addr: number, value: number, set: boolean) => {\n  if (kitHooks.access !== null) kitHooks.access(addr, value, set)\n",
            head: `import { hooks as kitHooks } from ${at}\n`,
        },
    ],
};

// A name the module declares or imports.
function declared(text, name) {
    return new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?(?:let|const|var|function)\\s+${name}\\b`).test(text) ||
        new RegExp(`(?:^|\\n)import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(text);
}

function patch(rel, text) {
    let head = "";
    for (const r of REPLACE[rel] ?? []) {
        const n = text.split(r.from).length - 1;
        if (n !== 1) throw new Error(`Apple2TS's ${rel} has ${n} copies of the line the kit changes (${JSON.stringify(r.from.trim())}): the release differs from the one kit/apple2/INSTALL.md names`);
        text = text.replace(r.from, r.to);
        head += r.head ?? "";
    }
    const add = APPEND[rel];
    if (add) {
        const gone = add.needs.filter((name) => !declared(text, name));
        if (gone.length) throw new Error(`Apple2TS's ${rel} no longer declares ${gone.join(", ")}: the release differs from the one kit/apple2/INSTALL.md names`);
        text += add.code;
    }
    return head + text;
}

const applied = new Set();
const VIRTUAL = "kit-apple2ts";

const plugin = {
    name: "kit-apple2ts",
    setup(b) {
        b.onResolve({ filter: /^A2TS_REAL_WORKER2MAIN$/ }, () => ({ path: realW2M }));
        b.onResolve({ filter: /^A2TS_REAL_GAMES$/ }, () => ({ path: realGames }));
        b.onResolve({ filter: /^A2TS\// }, (a) => ({ path: path.join(src, a.path.slice(5)) + ".ts" }));
        // Apple2TS's own modules import worker2main and the game list: give them the kit's
        b.onResolve({ filter: /worker2main$/ }, (a) =>
            a.importer.startsWith(src) && a.importer !== realW2M ? { path: "worker2main", namespace: VIRTUAL } : undefined);
        b.onResolve({ filter: /game_mappings$/ }, (a) =>
            a.importer.startsWith(src) && a.importer !== realGames ? { path: "game_mappings", namespace: VIRTUAL } : undefined);
        b.onLoad({ filter: /^worker2main$/, namespace: VIRTUAL }, () => ({
            resolveDir: here,
            loader: "js",
            contents: `export * from "A2TS_REAL_WORKER2MAIN";
import { hooks } from ${at};
export const passClickSpeaker = (cycleCount) => hooks.speaker(cycleCount);
export const passMockingboard = (sound) => hooks.mockingboard(sound);
`,
        }));
        b.onLoad({ filter: /^game_mappings$/, namespace: VIRTUAL }, () => ({
            resolveDir: here,
            loader: "js",
            contents: `export * from "A2TS_REAL_GAMES";
export const handleGameSetup = (_reset = false) => {};
export const handleKeyMapping = (key) => key;
`,
        }));
        // icons the debugger's breakpoint list imports: the server draws nothing, so the build
        // needs none of Apple2TS's npm packages
        b.onResolve({ filter: /^@fortawesome\// }, (a) => ({ path: a.path, namespace: "kit-stub" }));
        b.onLoad({ filter: /.*/, namespace: "kit-stub" }, () => ({ contents: "module.exports = new Proxy({}, { get: () => ({}) })", loader: "js" }));
        // every Apple2TS module: the machine's clock in place of the host's, and the patches
        b.onLoad({ filter: /\.tsx?$/ }, (a) => {
            if (!a.path.startsWith(src)) return undefined;
            const rel = path.relative(src, a.path).split(path.sep).join("/");
            let text = fs.readFileSync(a.path, "utf8");
            if (REPLACE[rel] || APPEND[rel]) {
                text = patch(rel, text);
                applied.add(rel);
            }
            const timers = `import { vSetTimeout as setTimeout, vClearTimeout as clearTimeout, vSetInterval as setInterval, vClearTimeout as clearInterval } from ${at};\n`;
            return { contents: timers + text, loader: a.path.endsWith("x") ? "tsx" : "ts" };
        });
    },
};

try {
    await esbuild.build({
        entryPoints: [path.join(here, "apple2ts_server.mjs")],
        bundle: true,
        platform: "node",
        format: "cjs",
        target: "node20",
        outfile: out,
        plugins: [plugin],
        logLevel: "warning",
        banner: { js: `// kit Apple2TS server ${stamp}\n// Built by kit/apple2/apple2ts_build.mjs from the kit's files and Apple2TS's sources (MIT). Holds the Apple IIe's ROMs: never commit it.` },
    });
} catch (e) {
    console.error(String(e && e.message ? e.message : e));
    process.exit(1);
}
const missed = [...Object.keys(APPEND), ...Object.keys(REPLACE)].filter((rel) => !applied.has(rel));
if (missed.length) {
    fs.rmSync(out, { force: true });
    console.error(`the build never loaded ${missed.join(", ")}, which the kit changes: the release differs from the one kit/apple2/INSTALL.md names`);
    process.exit(1);
}
console.log(`built ${out}`);
