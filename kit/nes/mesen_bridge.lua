-- The kit's NES on MesenCE: this script runs inside Mesen's headless test runner and does the
-- machine's half of the work; kit/nes/mesen_server.py, which starts Mesen, speaks the kit's
-- protocol to clients and sends this script one request a line.
--
--   Mesen --testRunner kit/nes/mesen_bridge.lua <cartridge.nes> --timeout=<seconds>
--   with KIT_MESEN_BRIDGE=<port>, the port mesen_server.py listens on for this script
--
-- The script connects to that port, takes a save state at the cartridge's first instruction
-- (power on, which `reset` goes back to), and then holds the machine there: while the machine
-- is stopped, the script is inside Mesen's exec callback for the next instruction, waiting on
-- the socket. Mesen runs the instruction only when the callback returns, so a stop always
-- falls between two instructions, an interrupt handler's first included (Mesen takes an
-- interrupt at the end of the instruction before, kit/skills/nes/tool-mesen). Save states can
-- be made and loaded only inside an exec callback, which is why the whole server lives there.
--
-- A request is JSON, {"id": 7, "cmd": "read", ...}; the reply carries the id. A run's reply
-- comes when the run ends; during the run the script looks at the socket every POLL
-- instructions and answers whatever else has come, so a second client can read the machine,
-- save it, or stop the run. Byte strings travel as hex.
--
-- Mesen needs "Allow access to I/O and OS functions" and "Allow network access" for its Lua
-- (Debug.ScriptWindow.AllowIoOsAccess and AllowNetworkAccess in its settings.json), which
-- kit/nes/tools.py writes when it installs Mesen.
local socket = require("socket.core")

local POLL = 2048                       -- instructions between two looks at the socket during a run
local FRAME_CYCLES = 29781              -- one NTSC frame, 29,780.5 CPU cycles
local CPU_HZ = 1789773
local FRAME_BACKSTOP = 4 * FRAME_CYCLES -- cycles a frame may take before a frame advance gives up
local RUN_BACKSTOP = 60 * CPU_HZ        -- a run with no limit of its own stops after a minute of the machine's time
local NES = emu.cpuType.nes
local MT = emu.memType

-- ---- JSON -----------------------------------------------------------------------------------

local ARRAY = {}                        -- metatable marking a table as a JSON array, even when empty
local function array(t) return setmetatable(t or {}, ARRAY) end

local function encode(v, out)
  local t = type(v)
  if v == nil then out[#out + 1] = "null"
  elseif t == "boolean" then out[#out + 1] = v and "true" or "false"
  elseif t == "number" then
    if math.type(v) == "integer" then out[#out + 1] = string.format("%d", v)
    elseif v == math.floor(v) and math.abs(v) < 2^53 then out[#out + 1] = string.format("%d", math.floor(v))
    else out[#out + 1] = string.format("%.17g", v) end
  elseif t == "string" then
    out[#out + 1] = '"' .. v:gsub('[%c"\\]', function(c)
      local m = { ['"'] = '\\"', ['\\'] = '\\\\', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }
      return m[c] or string.format("\\u%04x", c:byte())
    end) .. '"'
  elseif t == "table" then
    if getmetatable(v) == ARRAY then
      out[#out + 1] = "["
      for i = 1, #v do if i > 1 then out[#out + 1] = "," end encode(v[i], out) end
      out[#out + 1] = "]"
    else
      out[#out + 1] = "{"
      local first = true
      for k, x in pairs(v) do
        if not first then out[#out + 1] = "," end
        first = false
        encode(tostring(k), out); out[#out + 1] = ":"; encode(x, out)
      end
      out[#out + 1] = "}"
    end
  else error("cannot encode a " .. t) end
  return out
end
local function tojson(v) return table.concat(encode(v, {})) end

local function fromjson(s)
  local i = 1
  local function ws() i = s:find("[^ \t\r\n]", i) or #s + 1 end
  local value
  local function str()
    local out, j = {}, i + 1
    while true do
      local c = s:sub(j, j)
      if c == '"' then i = j + 1; return table.concat(out)
      elseif c == "\\" then
        local e = s:sub(j + 1, j + 1)
        if e == "u" then out[#out + 1] = utf8.char(tonumber(s:sub(j + 2, j + 5), 16)); j = j + 6
        else out[#out + 1] = ({ n = "\n", r = "\r", t = "\t", b = "\b", f = "\f" })[e] or e; j = j + 2 end
      elseif c == "" then error("unterminated string")
      else out[#out + 1] = c; j = j + 1 end
    end
  end
  function value()
    ws()
    local c = s:sub(i, i)
    if c == "{" then
      local t = {}; i = i + 1; ws()
      if s:sub(i, i) == "}" then i = i + 1; return t end
      while true do
        ws(); local k = str(); ws(); i = i + 1    -- the colon
        t[k] = value(); ws()
        local d = s:sub(i, i); i = i + 1
        if d == "}" then return t end
      end
    elseif c == "[" then
      local t = array(); i = i + 1; ws()
      if s:sub(i, i) == "]" then i = i + 1; return t end
      while true do
        t[#t + 1] = value(); ws()
        local d = s:sub(i, i); i = i + 1
        if d == "]" then return t end
      end
    elseif c == '"' then return str()
    elseif s:sub(i, i + 3) == "true" then i = i + 4; return true
    elseif s:sub(i, i + 4) == "false" then i = i + 5; return false
    elseif s:sub(i, i + 3) == "null" then i = i + 4; return nil
    else
      local num = s:match("^-?%d+%.?%d*[eE]?[-+]?%d*", i)
      i = i + #num
      return math.tointeger(tonumber(num)) or tonumber(num)
    end
  end
  return value()
end

local function tohex(get, start, length)
  local out = {}
  for k = 0, length - 1 do out[#out + 1] = string.format("%02x", get(start + k)) end
  return table.concat(out)
end
local function fromhex(h)
  local out = {}
  for k = 1, #h, 2 do out[#out + 1] = tonumber(h:sub(k, k + 1), 16) end
  return out
end

-- ---- the connection -----------------------------------------------------------------------

local S                         -- the machine's state, below
local conn = socket.tcp()
assert(conn:connect("127.0.0.1", tonumber(os.getenv("KIT_MESEN_BRIDGE"))))
conn:setoption("tcp-nodelay", true)
local partial = ""

local function send(t) conn:settimeout(-1); assert(conn:send(tojson(t) .. "\n")) end

-- The next request, or nil: waits for one when `block`, else takes only what has arrived.
local function receive(block)
  conn:settimeout(block and -1 or 0)
  local line, err, part = conn:receive("*l", partial)
  if line then partial = ""; return fromjson(line) end
  partial = part or ""
  if err == "closed" then S.quitting = true; emu.stop(0) end
  return nil
end

-- ---- the machine's state ------------------------------------------------------------------

S = {
  running = false, stopRequested = false, runId = nil,
  frames = 0,                  -- frames completed since power on: Mesen's end of frame
  stoppedBefore = -1,          -- the PC a checkpoint stopped before, counted already
  pc = 0,                      -- the instruction being carried out, for read checkpoints
  checkpoints = {}, nextId = 1, exec = {}, reads = {}, writes = {},
  pending = {}, pendingOrder = {},   -- the writes of the instruction being carried out
  codemap = nil, sound = nil, kept = {},
  held = { [0] = {}, [1] = {} },     -- buttons held on each controller port
  power = nil,                       -- the save state at the first instruction
  sincePoll = 0,
}

local OPLEN = {}
do -- the 6502's instruction lengths by opcode, all 256, from the table in kit/nes/jsnes_server.mjs
  local modes = "1212222212123333221222221313333332122222121233332212222213133333121222221212333322122222131333331212222212123333221222221313333322222222121233332212222213133333222222221212333322122222131333332222222212123333221222221313333322222222121233332212222213133333"
  for op = 0, 255 do OPLEN[op] = tonumber(modes:sub(op + 1, op + 1)) end
end

local function cycles() return emu.getCpuCycleCount(NES) end
local function cpuState() return emu.getCpuState(NES) end

local function registers()
  local c = cpuState()
  local p = (c.ps | 0x20) & 0xEF
  local names, flags = "NV-BDIZC", {}
  for b = 0, 7 do
    local ch = names:sub(b + 1, b + 1)
    flags[#flags + 1] = (p & (0x80 >> b)) ~= 0 and ch or ch:lower()
  end
  return { pc = c.pc, a = c.a, x = c.x, y = c.y, s = c.sp & 0xFF, p = p, flags = table.concat(flags), cycles = c.cycleCount }
end

-- The CPU's view with no side effects: $2000-$401F are the chips and read as nil.
local function cpuByte(a)
  if a < 0x2000 then return emu.read(a & 0x7FF, MT.nesInternalRam) end
  if a < 0x4020 then return nil end
  if a < 0x6000 then return 0 end
  return emu.read(a, MT.nesDebug)
end
local function instructionLength(pc) return OPLEN[cpuByte(pc) or 0] end

-- ---- checkpoints --------------------------------------------------------------------------

local function matches(when, value)
  if not when then return true end
  local r
  for k, v in pairs(when) do
    local have
    if k == "value" then have = value else r = r or registers(); have = r[k] end
    if have ~= v then return false end
  end
  return true
end

local rearm
local function dropTemporary()
  local cp = S.hit and S.checkpoints[S.hit.checkpoint]
  if cp and cp.temporary then S.checkpoints[cp.id] = nil; S.rearmNeeded = true end
end

local function isFetch(addr) return ((addr - S.pc) & 0xFFFF) < instructionLength(S.pc) end

local function access(cp, kind, addr, value)
  if kind == "read" and not cp.fetch and isFetch(addr) then return end
  if not matches(cp.when, value) then return end
  cp.hits = cp.hits + 1
  cp.last = { pc = S.pc, address = addr, value = value }
  if not cp.stop then return end
  if cp.skip > 0 then cp.skip = cp.skip - 1; return end
  if not S.hit then S.hit = { checkpoint = cp.id, kind = kind, address = addr, pc = S.pc, value = value } end
  S.stopAfter = true
  dropTemporary()
end

-- A read-modify-write instruction writes its operand twice, the old value and then the new, as
-- the 6502 does, and Mesen calls a write callback for each; the writes of one instruction are
-- kept until it ends and counted once an address, with the value it was left holding.
local function flushWrites()
  if #S.pendingOrder == 0 then return end
  for _, a in ipairs(S.pendingOrder) do
    local v = S.pending[a]
    for _, cp in ipairs(S.writes) do
      if a >= cp.start and a <= cp["end"] then access(cp, "write", a, v) end
    end
  end
  S.pending, S.pendingOrder = {}, {}
end

local callbacks = {}            -- the memory callbacks the checkpoints and the sound log hold
function rearm()
  for _, c in ipairs(callbacks) do emu.removeMemoryCallback(c.ref, c.type, c.start, c["end"], NES, MT.nesMemory) end
  callbacks = {}
  S.exec, S.reads, S.writes = {}, {}, {}
  local ids = {}
  for id in pairs(S.checkpoints) do ids[#ids + 1] = id end
  table.sort(ids)
  for _, id in ipairs(ids) do
    local cp = S.checkpoints[id]
    if cp.kind == "exec" then S.exec[#S.exec + 1] = cp
    elseif cp.kind == "read" then
      S.reads[#S.reads + 1] = cp
      local ref = emu.addMemoryCallback(function(a, v) if S.running then access(cp, "read", a, v) end end,
        emu.callbackType.read, cp.start, cp["end"], NES, MT.nesMemory)
      callbacks[#callbacks + 1] = { ref = ref, type = emu.callbackType.read, start = cp.start, ["end"] = cp["end"] }
    else
      S.writes[#S.writes + 1] = cp
      local ref = emu.addMemoryCallback(function(a, v)
          if S.pending[a] == nil then S.pendingOrder[#S.pendingOrder + 1] = a end
          S.pending[a] = v
        end, emu.callbackType.write, cp.start, cp["end"], NES, MT.nesMemory)
      callbacks[#callbacks + 1] = { ref = ref, type = emu.callbackType.write, start = cp.start, ["end"] = cp["end"] }
    end
  end
  if S.sound then
    local ref = emu.addMemoryCallback(function(a, v)
        if S.sound and a ~= 0x4014 and a ~= 0x4016 then
          local w = S.sound.writes
          w[#w + 1] = array({ cycles(), a, v })
        end
      end, emu.callbackType.write, 0x4000, 0x4017, NES, MT.nesMemory)
    callbacks[#callbacks + 1] = { ref = ref, type = emu.callbackType.write, start = 0x4000, ["end"] = 0x4017 }
  end
end

local function countCode(pc)
  local m = S.codemap
  if m then
    local n = m.count[pc]
    if not n then m.count[pc] = 1; m.len[pc] = instructionLength(pc) else m.count[pc] = n + 1 end
  end
end

-- ---- running --------------------------------------------------------------------------------

-- The first instruction of a run or a step is counted by every checkpoint on it but never
-- stopped on, so a machine stopped at a checkpoint goes on past it; one a checkpoint stopped
-- before was counted then, and is not counted again.
local function firstInstruction(pc)
  S.pc = pc
  if pc == S.stoppedBefore then
    S.stoppedBefore = -1
    if S.stepLeft > 0 then S.stepLeft = S.stepLeft - 1; if S.stepLeft == 0 then S.stepPending = true end end
    countCode(pc)
    return
  end
  S.stoppedBefore = -1
  for _, cp in ipairs(S.exec) do
    if pc >= cp.start and pc <= cp["end"] and matches(cp.when) then cp.hits = cp.hits + 1; cp.last = { pc = pc } end
  end
  if S.stepLeft > 0 then S.stepLeft = S.stepLeft - 1; if S.stepLeft == 0 then S.stepPending = true end end
  countCode(pc)
end

-- Called before every instruction of a run after the first. Returns why the run stops before
-- this instruction, or nil to carry it out.
local function before(pc)
  -- what the instruction before, or an interrupt's entry, left
  if S.stopAfter then return "checkpoint" end
  if S.frameLimit and S.frames >= S.frameLimit then return "frames" end
  local c = cycles()
  if c >= S.c0 + S.budget then return S.cycleLimit and "cycles" or "timeout" end
  if S.stopRequested then return "stopped" end
  -- this instruction
  if S.stepPending then S.stepPending = false; S.stepDone = true; return "step" end
  local stop = false
  for _, cp in ipairs(S.exec) do
    if pc >= cp.start and pc <= cp["end"] and matches(cp.when) then
      cp.hits = cp.hits + 1
      cp.last = { pc = pc }
      if cp.stop then
        if cp.skip > 0 then cp.skip = cp.skip - 1
        else
          if not S.hit then S.hit = { checkpoint = cp.id, kind = "exec", address = pc, pc = pc } end
          stop = true
        end
      end
    end
  end
  local untilHit = S["until"] == pc
  if S.stepLeft > 0 then S.stepLeft = S.stepLeft - 1; if S.stepLeft == 0 then S.stepPending = true end end
  if stop or untilHit then
    S.stepPending = false
    S.stoppedBefore = pc
    dropTemporary()
    return S.hit and "checkpoint" or "until"
  end
  S.pc = pc
  countCode(pc)
  return nil
end

local serve
local function finishRun(reason)
  S.running = false
  S.stopRequested = false
  S.stepLeft = 0
  S["until"] = -1
  if S.rearmNeeded then S.rearmNeeded = false; rearm() end
  local r = registers()
  send({ id = S.runId, ok = true, reason = reason, pc = r.pc, ran = r.cycles - S.c0, frames = S.frames - S.f0,
         cycles = r.cycles, hit = S.hit, registers = r })
end

local function startRun(req, steps)
  local r = registers()
  S.running, S.stopRequested, S.runId = true, false, req.id
  S.hit, S.stopAfter, S.stepDone, S.stepPending = nil, false, false, false
  S["until"] = req["until"] or -1
  S.stepLeft = steps or 0
  S.c0, S.f0 = r.cycles, S.frames
  S.cycleLimit = req.cycles
  S.frameLimit = req.frames and S.frames + req.frames or nil
  S.budget = req.cycles or req.max_cycles or (req.frames and req.frames * FRAME_BACKSTOP) or RUN_BACKSTOP
  S.sincePoll = 0
  firstInstruction(r.pc)
end

-- ---- requests -------------------------------------------------------------------------------

local function memoryGetter(space)
  if space == "ppu" then return function(a) return emu.read(a & 0x3FFF, MT.nesPpuDebug) end end
  if space == "oam" then return function(a) return emu.read(a & 0xFF, MT.nesSpriteRam) end end
  if space == "prg" then return function(a) return emu.read(a, MT.nesPrgRom) end end
  if space == "chr" then return function(a) return emu.read(a, MT.nesChrRom) end end
  return function(a) return cpuByte(a & 0xFFFF) or 0 end
end

local function ppuRegisters(st)
  local function b(k) return st[k] and 1 or 0 end
  local t = st["ppu.tmpVideoRamAddr"] or 0
  local ctrl = (b("ppu.control.nmiOnVerticalBlank") << 7) | (b("ppu.control.largeSprites") << 5)
    | ((st["ppu.control.backgroundPatternAddr"] ~= 0 and 1 or 0) << 4)
    | ((st["ppu.control.spritePatternAddr"] ~= 0 and 1 or 0) << 3)
    | (b("ppu.control.verticalWrite") << 2) | ((t >> 10) & 3)
  local mask = (b("ppu.mask.intensifyBlue") << 7) | (b("ppu.mask.intensifyGreen") << 6) | (b("ppu.mask.intensifyRed") << 5)
    | (b("ppu.mask.spritesEnabled") << 4) | (b("ppu.mask.backgroundEnabled") << 3) | (b("ppu.mask.spriteMask") << 2)
    | (b("ppu.mask.backgroundMask") << 1) | b("ppu.mask.grayscale")
  local status = (b("ppu.statusFlags.verticalBlank") << 7) | (b("ppu.statusFlags.sprite0Hit") << 6)
    | (b("ppu.statusFlags.spriteOverflow") << 5)
  return { ctrl = ctrl, mask = mask, status = status, t = t, fineX = st["ppu.xScroll"] or 0,
           scrollX = (t & 0x1F) * 8 + (st["ppu.xScroll"] or 0), scrollY = ((t >> 5) & 0x1F) * 8 + ((t >> 12) & 7) }
end

local function chips()
  local st = emu.getState()
  local p = ppuRegisters(st)
  local pal = array()
  for k = 0, 31 do pal[#pal + 1] = emu.read(0x3F00 + k, MT.nesPpuDebug) end
  local function pad(port)
    local out, held = {}, S.held[port]
    for _, n in ipairs({ "a", "b", "select", "start", "up", "down", "left", "right" }) do out[n] = held[n] == true end
    return out
  end
  return {
    ppu = { ctrl = p.ctrl, mask = p.mask, status = p.status, scanline = st["ppu.scanline"], dot = st["ppu.cycle"],
            vram_address = st["ppu.videoRamAddr"], write_toggle = st["ppu.writeToggle"] and 1 or 0, palette = pal },
    controllers = { ["1"] = pad(0), ["2"] = pad(1) },
    frames = S.frames,
  }
end

local function applyInput()
  for port = 0, 1 do
    local t = {}
    for _, n in ipairs({ "a", "b", "select", "start", "up", "down", "left", "right" }) do t[n] = S.held[port][n] == true end
    -- MesenCE 2.2.1 takes the port as setInput's third argument, after a subport: with two,
    -- every call sets controller 1 (kit/skills/nes/tool-mesen, "Traps")
    emu.setInput(t, 0, port)
  end
end

local function loadState(data, frames, stoppedBefore)
  if not emu.loadSavestate(data) then error("Mesen refused the save state") end
  S.frames = frames or 0
  S.stoppedBefore = stoppedBefore or -1
  applyInput()
end

local function readFile(path)
  local f = assert(io.open(path, "rb")); local d = f:read("a"); f:close(); return d
end
local function writeFile(path, data)
  local tmp = path .. ".tmp"
  local f = assert(io.open(tmp, "wb")); f:write(data); f:close()
  assert(os.rename(tmp, path))
end

local H = {}
H.status = function()
  local r, n = registers(), 0
  for _ in pairs(S.checkpoints) do n = n + 1 end
  return { running = S.running, pc = r.pc, cycles = r.cycles, frames = S.frames, checkpoints = n,
           codemap = S.codemap ~= nil, sound = S.sound ~= nil }
end
H.registers = function() return registers() end
H.read = function(q)
  local get = memoryGetter(q.space)
  local io = false
  if (q.space or "cpu") == "cpu" then
    for k = 0, q.length - 1 do local a = (q.address + k) & 0xFFFF; if a >= 0x2000 and a < 0x4020 then io = true; break end end
  end
  return { data = tohex(get, q.address, q.length), io = io }
end
H.write = function(q)
  local bytes = fromhex(q.data)
  for k, v in ipairs(bytes) do
    local a = q.address + k - 1
    if q.space == "oam" then emu.write(a & 0xFF, v, MT.nesSpriteRam)
    elseif q.space == "ppu" then emu.write(a & 0x3FFF, v, MT.nesPpuDebug)
    else
      a = a & 0xFFFF
      if a < 0x2000 then emu.write(a & 0x7FF, v, MT.nesInternalRam)
      elseif a < 0x4020 then emu.write(a, v, MT.nesMemory)      -- a chip's register, through the bus
      else emu.write(a, v, MT.nesDebug) end
    end
  end
  return { written = #bytes }
end
H["set-registers"] = function(q)
  local c = cpuState()
  if q.a then c.a = q.a & 0xFF end
  if q.x then c.x = q.x & 0xFF end
  if q.y then c.y = q.y & 0xFF end
  if q.s then c.sp = q.s & 0xFF end
  if q.p then c.ps = q.p & 0xFF end
  if q.pc then c.pc = q.pc & 0xFFFF; S.stoppedBefore = -1 end
  emu.setCpuState(c, NES)
  return registers()
end
H.chips = chips
H.ppuregs = function() return ppuRegisters(emu.getState()) end
H.checkpoint = function(q)
  local cp = { id = S.nextId, kind = q.kind, start = q.address, ["end"] = q["end"], stop = q.stop, skip = q.ignore or 0,
               temporary = q.temporary or false, fetch = q.fetch or false, when = q.when, hits = 0, last = nil }
  S.nextId = S.nextId + 1
  S.checkpoints[cp.id] = cp
  rearm()
  return { checkpoint = cp.id }
end
H.checkpoints = function()
  local out, ids = array(), {}
  for id in pairs(S.checkpoints) do ids[#ids + 1] = id end
  table.sort(ids)
  for _, id in ipairs(ids) do
    local c = S.checkpoints[id]
    out[#out + 1] = { checkpoint = c.id, kind = c.kind, address = c.start, ["end"] = c["end"], stop = c.stop,
                      ignore = c.skip, temporary = c.temporary, fetch = c.fetch, when = c.when, hits = c.hits, last = c.last }
  end
  return { checkpoints = out, next_id = S.nextId }
end
H.delete = function(q)
  if q.all then S.checkpoints = {}
  elseif S.checkpoints[q.checkpoint] then S.checkpoints[q.checkpoint] = nil
  else error(string.format('no checkpoint %s: give "checkpoint": n, or "all": true', tostring(q.checkpoint))) end
  rearm()
  local n = 0
  for _ in pairs(S.checkpoints) do n = n + 1 end
  return { left = n }
end
H.zero = function(q)
  for id, cp in pairs(S.checkpoints) do
    if q.checkpoint == nil or q.checkpoint == id then cp.hits = 0; cp.last = nil end
  end
  return {}
end
H.input = function(q)
  S.held = { [0] = {}, [1] = {} }
  for port, names in pairs({ [0] = q["1"] or {}, [1] = q["2"] or {} }) do
    for _, n in ipairs(names) do S.held[port][n] = true end
  end
  applyInput()
  return {}
end
-- The whole machine, made at one instruction: Mesen's save state to a file, and the parts the
-- kit's readers take (kit/nes/snapshot.py) beside it.
H.snapshot = function(q)
  local st = emu.createSavestate()
  writeFile(q.path, st)
  local mem = {}
  for a = 0, 0xFFFF do
    local v = a < 0x800 and emu.read(a, MT.nesInternalRam) or ((a < 0x6000) and 0 or emu.read(a, MT.nesDebug))
    mem[a + 1] = string.format("%02x", v)
  end
  return { state_bytes = #st, cpu = table.concat(mem), ppu = tohex(memoryGetter("ppu"), 0, 0x4000),
           oam = tohex(memoryGetter("oam"), 0, 256), registers = registers(), ppu_registers = ppuRegisters(emu.getState()),
           frames = S.frames, stopped_before = S.stoppedBefore }
end
H.load = function(q)
  loadState(readFile(q.path), q.frames, q.stopped_before)
  return { registers = registers(), frames = S.frames }
end
H.keep = function(q)
  S.kept[q.name] = { state = emu.createSavestate(), frames = S.frames, stoppedBefore = S.stoppedBefore }
  local names = array()
  for k in pairs(S.kept) do names[#names + 1] = k end
  table.sort(names)
  return { name = q.name, kept = names }
end
H.back = function(q)
  local k = S.kept[q.name]
  if not k then error("nothing kept as " .. q.name) end
  loadState(k.state, k.frames, k.stoppedBefore)
  return { name = q.name, registers = registers() }
end
H.power = function()
  loadState(S.power, 0, -1)
  return registers()
end
-- the reset button: the 6502's reset sequence, as the kit's jsnes server gives it (the stack
-- pointer three lower, I set, the PC from $FFFC); the PPU and the APU are left as they are
H.softreset = function()
  local c = cpuState()
  c.sp = (c.sp - 3) & 0xFF
  c.ps = c.ps | 0x04
  c.pc = emu.read(0xFFFC, MT.nesDebug) | (emu.read(0xFFFD, MT.nesDebug) << 8)
  emu.setCpuState(c, NES)
  S.stoppedBefore = -1
  return registers()
end
H.screenshot = function(q)
  writeFile(q.path, emu.takeScreenshot())
  return { frames = S.frames }
end
H.sound = function(q)
  if q.action == "start" then
    S.sound = { start = cycles(), writes = array() }
    rearm()
    return { start = S.sound.start }
  end
  if not S.sound then error("no capture running: `sound` start first") end
  local cap = S.sound
  S.sound = nil
  rearm()
  return { start = cap.start, ["end"] = cycles(), writes = cap.writes }
end
H.codemap = function(q)
  local action = q.action or "read"
  if action == "start" then
    if not S.codemap then S.codemap = { count = {}, len = {} } end
    return { recording = true }
  end
  if action == "zap" then
    if S.codemap then S.codemap = { count = {}, len = {} } end
    return { recording = S.codemap ~= nil }
  end
  local ran, m = array(), S.codemap
  if m then
    local pcs = {}
    for a in pairs(m.count) do pcs[#pcs + 1] = a end
    table.sort(pcs)
    for _, a in ipairs(pcs) do ran[#ran + 1] = array({ a, m.len[a], m.count[a] }) end
  end
  if action == "stop" then S.codemap = nil end
  return { recording = S.codemap ~= nil, instructions = ran }
end
H.stop = function()
  local was = S.running
  if was then S.stopRequested = true end
  return { was_running = was }
end
H.quit = function() S.quitting = true; emu.stop(0); return { bye = true } end
-- the checkpoints as `checkpoints` listed them, put back after Mesen was started again with
-- another cartridge, so that a script's checkpoints outlive the change as they do on jsnes
H.setcheckpoints = function(q)
  S.checkpoints = {}
  for _, c in ipairs(q.checkpoints) do
    S.checkpoints[c.checkpoint] = { id = c.checkpoint, kind = c.kind, start = c.address, ["end"] = c["end"], stop = c.stop,
      skip = c.ignore, temporary = c.temporary, fetch = c.fetch, when = c.when, hits = c.hits, last = c.last }
  end
  S.nextId = q.next_id
  rearm()
  return {}
end

local function answer(q)
  local fn = H[q.cmd]
  local ok, r = pcall(function()
    if not fn then error("the bridge has no command " .. tostring(q.cmd)) end
    return fn(q)
  end)
  if ok then r.id = q.id; r.ok = true; send(r)
  else send({ id = q.id, ok = false, error = tostring(r):gsub("^.-:%d+: ", "") }) end
end

-- While the machine is stopped: answer requests until one runs it.
local TRACE = os.getenv("KIT_MESEN_TRACE")
local function trace(...) if TRACE then local f = io.open(TRACE, "a"); f:write(os.clock(), " ", table.concat({...}, " "), "\n"); f:close() end end
function serve()
  trace("serve at", string.format("%04X", cpuState().pc))
  while not S.quitting do
    local q = receive(true)
    trace("got", q and q.cmd or "nil")
    if not q then return end
    if q.cmd == "run" then startRun(q); return
    elseif q.cmd == "step" then startRun(q, math.max(1, q.count or 1)); return
    else answer(q) end
  end
end

local function poll()
  S.sincePoll = 0
  while not S.quitting do
    local q = receive(false)
    if not q then return end
    if q.cmd == "run" or q.cmd == "step" then send({ id = q.id, ok = false, error = "the machine is already running: `stop` it first" })
    else answer(q) end
  end
end

-- ---- the hooks ------------------------------------------------------------------------------

emu.addEventCallback(function() S.frames = S.frames + 1 end, emu.eventType.endFrame)
emu.addEventCallback(applyInput, emu.eventType.inputPolled)

-- An error in a callback ends the callback, and Mesen then runs the instruction: the machine
-- would go on by itself. It is written to the log beside the server's (KIT_MESEN_LOG).
local LOG = os.getenv("KIT_MESEN_LOG")
local function logged(fn)
  return function(...)
    local ok, err = xpcall(fn, debug.traceback, ...)
    if not ok and LOG then local f = io.open(LOG, "a"); if f then f:write(os.date("%H:%M:%S "), err, "\n"); f:close() end end
  end
end

emu.addMemoryCallback(logged(function(pc)
  if S.quitting then return end
  flushWrites()
  if not S.power then
    -- the cartridge's first instruction: power on, kept for `reset`
    S.power = emu.createSavestate()
    applyInput()
    send({ hello = true, registers = registers() })
    serve()
    return
  end
  if S.running then
    S.sincePoll = S.sincePoll + 1
    if S.sincePoll >= POLL then poll() end
    local reason = before(pc)
    if not reason then return end
    finishRun(reason)
  end
  serve()
end), emu.callbackType.exec, 0x0000, 0xFFFF, NES, MT.nesMemory)
