/* Code Adventure - interpreter blok: menelusuri blok secara rekursif, tanpa eval JavaScript */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});

  var MOTION = {
    ca_move_forward: { type: 'move', delta: 1, label: 'Maju' },
    ca_move_backward: { type: 'move', delta: -1, label: 'Mundur' },
    ca_turn_left: { type: 'turn', delta: -1, label: 'Belok kiri' },
    ca_turn_right: { type: 'turn', delta: 1, label: 'Belok kanan' },
    ca_jump: { type: 'jump', label: 'Lompat' },
    ca_wait: { type: 'wait', label: 'Tunggu' }
  };

  function Interpreter(options) {
    this.world = options.world;
    this.workspace = options.workspace;
    this.onCommand = options.onCommand || function () {};
    this.onHighlight = options.onHighlight || function () {};
    this.onLog = options.onLog || function () {};
    this.onFinish = options.onFinish || function () {};
    this.speed = options.speed == null ? 600 : options.speed;
    this.maxSteps = options.maxSteps || 4000;
    this.autoDelay = options.autoDelay == null ? null : options.autoDelay;
    this.running = false;
    this.stopped = false;
    this.queue = [];
    this.current = null;
    this.highlighted = null;
    this.variables = {};
    this.functions = {};
    this.handlers = { touch: {}, key: {}, start: [] };
    this.stats = null;
    this._ops = 0;
    this._warned = {};
    this.finished = false;
    this.resetStats();
  }

  Interpreter.prototype.resetStats = function () {
    this.stats = { commands: 0, blocks: 0, loops: 0, functions: 0, errors: [], jumps: 0, events: 0 };
  };

  Interpreter.prototype.reset = function () {
    this.stop();
    this.world.reset();
    this.variables = { energi: 0, skor: 0, langkah: 0, n: 0 };
    this.queue = [];
    this.current = null;
    this.finished = false;
    this._ops = 0;
    this._warned = {};
    this.highlight(null);
    this.resetStats();
  };

  Interpreter.prototype.stop = function () {
    this.running = false;
    this.stopped = true;
  };

  Interpreter.prototype.highlight = function (block) {
    if (this.highlighted && this.highlighted.getSvgRoot) {
      var old = this.highlighted.getSvgRoot();
      if (old && old.classList) old.classList.remove('ca-executing');
    }
    this.highlighted = block || null;
    if (block && block.getSvgRoot) {
      var svg = block.getSvgRoot();
      if (svg && svg.classList) svg.classList.add('ca-executing');
    }
    this.onHighlight(block);
  };

  Interpreter.prototype._warn = function (message) {
    if (this._warned[message]) return;
    this._warned[message] = true;
    this.stats.errors.push(message);
    this.onLog(message, 'error');
  };

  Interpreter.prototype._tick = function () {
    this._ops++;
    if (this._ops > this.maxSteps) {
      throw new Error('Program dihentikan: terlalu banyak langkah (mungkin infinite loop). Batas ' + this.maxSteps + ' langkah.');
    }
  };

  Interpreter.prototype._varName = function (block, fieldName) {
    var value = block.getFieldValue ? block.getFieldValue(fieldName) : '';
    if (!value) return '';
    if (this.workspace) {
      try {
        var map = this.workspace.getVariableMap ? this.workspace.getVariableMap() : null;
        var lookup = map && map.getVariableById ? map.getVariableById(value) :
          (this.workspace.getVariableById ? this.workspace.getVariableById(value) : null);
        if (lookup && lookup.name) return lookup.name;
      } catch (e) { /* field bukan variabel */ }
    }
    return value;
  };

  Interpreter.prototype.evalValue = function (block, depth) {
    if (!block) return 0;
    depth = depth || 0;
    if (depth > 60) throw new Error('Ekspresi terlalu dalam.');
    var type = block.type;
    var field = function (name) { return block.getFieldValue ? block.getFieldValue(name) : undefined; };
    switch (type) {
      case 'ca_num':
      case 'math_number': return Number(field('NUM')) || 0;
      case 'ca_get_var':
      case 'variables_get': {
        var name = this._varName(block, 'VAR');
        return Number(this.variables[name]) || 0;
      }
      case 'ca_sensor_num': return this.world.sensorNum(field('SENSOR'));
      case 'ca_add': return num(this.evalValue(block.getInputTargetBlock('A'), depth + 1)) + num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
      case 'ca_sub': return num(this.evalValue(block.getInputTargetBlock('A'), depth + 1)) - num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
      case 'ca_mul': return num(this.evalValue(block.getInputTargetBlock('A'), depth + 1)) * num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
      case 'math_arithmetic': {
        var op = field('OP');
        var a = num(this.evalValue(block.getInputTargetBlock('A'), depth + 1));
        var b = num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
        return op === 'ADD' ? a + b : op === 'MINUS' ? a - b : op === 'MULTIPLY' ? a * b : op === 'DIVIDE' ? (b ? a / b : 0) : 0;
      }
      default:
        if (type.indexOf('sensor') !== -1) return 0;
        this._warn('Blok nilai "' + type + '" belum dikenal dan diabaikan.');
        return 0;
    }
  };

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  Interpreter.prototype.evalBool = function (block, depth) {
    if (!block) return false;
    depth = depth || 0;
    if (depth > 60) throw new Error('Kondisi terlalu dalam.');
    var type = block.type;
    var field = function (name) { return block.getFieldValue ? block.getFieldValue(name) : undefined; };
    switch (type) {
      case 'ca_sensor_bool': return !!this.world.sensorBool(field('SENSOR'));
      case 'ca_compare': {
        var op = field('OP');
        var a = num(this.evalValue(block.getInputTargetBlock('A'), depth + 1));
        var b = num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
        return op === 'EQ' ? a === b : op === 'GT' ? a > b : op === 'LT' ? a < b : op === 'GTE' ? a >= b : op === 'LTE' ? a <= b : false;
      }
      case 'ca_equals': return num(this.evalValue(block.getInputTargetBlock('A'), depth + 1)) === num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
      case 'ca_gt': return num(this.evalValue(block.getInputTargetBlock('A'), depth + 1)) > num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
      case 'ca_lt': return num(this.evalValue(block.getInputTargetBlock('A'), depth + 1)) < num(this.evalValue(block.getInputTargetBlock('B'), depth + 1));
      case 'ca_and': return this.evalBool(block.getInputTargetBlock('A'), depth + 1) && this.evalBool(block.getInputTargetBlock('B'), depth + 1);
      case 'ca_or': return this.evalBool(block.getInputTargetBlock('A'), depth + 1) || this.evalBool(block.getInputTargetBlock('B'), depth + 1);
      case 'ca_not': return !this.evalBool(block.getInputTargetBlock('A'), depth + 1);
      case 'logic_boolean': return field('BOOL') === 'TRUE';
      case 'ca_bool': return field('BOOL') === 'TRUE';
      default:
        if (type.indexOf('sensor') !== -1) return false;
        this._warn('Blok kondisi "' + type + '" belum dikenal dan dianggap salah.');
        return false;
    }
  };

  Interpreter.prototype._prepare = function () {
    var tops = this.workspace.getTopBlocks ? this.workspace.getTopBlocks(true).slice() : [];
    tops.sort(function (a, b) {
      var ay = a.getRelativeToSurfaceXY ? a.getRelativeToSurfaceXY().y : 0;
      var by = b.getRelativeToSurfaceXY ? b.getRelativeToSurfaceXY().y : 0;
      return ay - by;
    });
    var main = [];
    this.functions = {};
    this.handlers = { touch: {}, key: {}, start: [] };
    var self = this;

    tops.forEach(function (block) {
      switch (block.type) {
        case 'ca_def_func':
          self.functions[String(block.getFieldValue('NAME') || '').trim()] = block.getInputTargetBlock('DO');
          break;
        case 'ca_when_start':
          self.handlers.start.push(block.getInputTargetBlock('DO'));
          break;
        case 'ca_when_touch': {
          var obj = block.getFieldValue('OBJECT') || 'coin';
          (self.handlers.touch[obj] = self.handlers.touch[obj] || []).push(block.getInputTargetBlock('DO'));
          break;
        }
        case 'ca_when_key': {
          var key = block.getFieldValue('KEY') || 'up';
          (self.handlers.key[key] = self.handlers.key[key] || []).push(block.getInputTargetBlock('DO'));
          break;
        }
        default:
          main.push(block);
      }
    });
    return this.handlers.start.concat(main).filter(Boolean);
  };

  Interpreter.prototype.start = function () {
    this.stopped = false;
    this.finished = false;
    this.running = true;
    this.queue = [];
    this.variables = this.world.state.variables || { energi: 0, skor: 0, langkah: 0, n: 0 };
    this._ops = 0;
    this._warned = {};
    this.resetStats();
    var self = this;
    var main = this._prepare();
    this.queue.push(this.runStack(main, 0));
    this.onLog('Program dimulai (' + this.world.level.title + ').', 'info');
    return this;
  };

  /** Menjalankan satu blok atau daftar blok (urutan top-level/isi pernyataan). */
  Interpreter.prototype.runStack = function* (blocks, depth) {
    if (!blocks) return;
    var list = Array.isArray(blocks) ? blocks : [blocks];
    for (var i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      yield* this.runChain(list[i], depth);
      if (this.world.state.status !== 'running') break;
    }
  };

  /** Mengikuti rantai next dari satu blok. */
  Interpreter.prototype.runChain = function* (block, depth) {
    if (!block) return;
    if (depth > 12) { this._warn('Pemanggilan fungsi terlalu dalam.'); return; }
    while (block) {
      if (!block.isEnabled || block.isEnabled()) {
        yield* this.runBlock(block, depth);
      }
      block = block.getNextBlock ? block.getNextBlock() : null;
      if (this.world.state.status !== 'running') break;
    }
  };

  Interpreter.prototype.runBlock = function* (block, depth) {
    var type = block.type;
    this.stats.blocks++;
    var self = this;
    if (MOTION[type]) {
      var m = MOTION[type];
      yield { type: m.type, delta: m.delta, label: m.label, block: block };
      return;
    }
    switch (type) {
      case 'ca_repeat': {
        this.stats.loops++;
        var countField = block.getFieldValue ? block.getFieldValue('COUNT') : undefined;
        var count = Math.floor(num(countField === undefined || countField === null || countField === ''
          ? this.evalValue(block.getInputTargetBlock('COUNT'), depth + 1)
          : countField));
        if (count < 0 || count > 10000) { this._warn('Jumlah Repeat di luar batas wajar.'); return; }
        for (var i = 0; i < count; i++) {
          this._tick();
          if (this.world.state.status !== 'running') break;
          yield* this.runStack(block.getInputTargetBlock('DO'), depth + 1);
        }
        return;
      }
      case 'ca_repeat_until':
      case 'ca_while': {
        this.stats.loops++;
        var guard = 0;
        while (guard++ < this.maxSteps) {
          this._tick();
          var cond = this.evalBool(block.getInputTargetBlock('COND'), depth + 1);
          if (type === 'ca_repeat_until' ? cond : !cond) break;
          if (this.world.state.status !== 'running') break;
          yield* this.runStack(block.getInputTargetBlock('DO'), depth + 1);
        }
        if (guard >= this.maxSteps) throw new Error('Loop tidak pernah berhenti. Periksa kondisi Repeat Until.');
        return;
      }
      case 'ca_if': {
        if (this.evalBool(block.getInputTargetBlock('COND'), depth + 1)) {
          yield* this.runStack(block.getInputTargetBlock('DO'), depth + 1);
        }
        return;
      }
      case 'ca_if_else': {
        var ok = this.evalBool(block.getInputTargetBlock('COND'), depth + 1);
        yield* this.runStack(block.getInputTargetBlock(ok ? 'DO' : 'ELSE'), depth + 1);
        return;
      }
      case 'ca_set_var': {
        var nameSet = this._varName(block, 'VAR') || 'energi';
        var value = num(this.evalValue(block.getInputTargetBlock('VALUE'), depth + 1));
        yield { type: 'varSet', name: nameSet, value: value, label: 'Set ' + nameSet, block: block };
        return;
      }
      case 'ca_change_var': {
        var nameChange = this._varName(block, 'VAR') || 'energi';
        var amount = num(this.evalValue(block.getInputTargetBlock('VALUE'), depth + 1));
        yield { type: 'varChange', name: nameChange, value: amount, label: 'Ubah ' + nameChange, block: block };
        return;
      }
      case 'variables_set': {
        var vn = this._varName(block, 'VAR') || 'energi';
        yield { type: 'varSet', name: vn, value: num(this.evalValue(block.getInputTargetBlock('VALUE'), depth + 1)), label: 'Set ' + vn, block: block };
        return;
      }
      case 'ca_call_func': {
        var fname = String(block.getFieldValue('NAME') || '').trim();
        var def = this.functions[fname];
        this.stats.functions++;
        yield { type: 'call', name: fname, label: 'Panggil ' + fname, block: block };
        if (!def) { this._warn('Fungsi "' + fname + '" belum dibuat.'); return; }
        yield* this.runStack(def, depth + 1);
        return;
      }
      case 'ca_log': {
        var msg = block.getFieldValue('TEXT') || '';
        yield { type: 'log', label: 'Tulis: ' + msg, text: msg, block: block };
        return;
      }
      case 'ca_when_start':
      case 'ca_when_touch':
      case 'ca_when_key':
      case 'ca_def_func':
        return; // sudah diproses di _prepare
      default:
        this._warn('Blok "' + type + '" tidak dikenal dan dilewati.');
    }
  };

  Interpreter.prototype.applyCommand = function (cmd) {
    var result = null;
    switch (cmd.type) {
      case 'move': result = this.world.move(cmd.delta); break;
      case 'turn': result = this.world.turn(cmd.delta); break;
      case 'jump': result = this.world.jump(); this.stats.jumps++; break;
      case 'wait': result = this.world.wait(); break;
      case 'varSet': this.variables[cmd.name] = cmd.value; break;
      case 'varChange': this.variables[cmd.name] = num(this.variables[cmd.name]) + cmd.value; break;
      case 'call': break;
      case 'log': this.onLog(cmd.text, 'info'); break;
    }
    this.world.setVariableSnapshot(this.variables);
    if (cmd.type === 'varSet' || cmd.type === 'varChange') this.world.checkWin();
    this.stats.commands++;
    return result;
  };

  Interpreter.prototype._processWorldEvents = function () {
    var events = this.world.drainEvents();
    var self = this;
    events.forEach(function (ev) {
      if (ev.kind === 'coin') self.fireTouch('coin');
      else if (ev.kind === 'energy') self.fireTouch('energy');
      else if (ev.kind === 'button') self.fireTouch('button');
      else if (ev.kind === 'door-open') self.fireTouch('door');
      else if (ev.kind === 'goal') self.fireTouch('goal');
      self.onLog(describeEvent(ev), ev.kind === 'fail' || ev.kind === 'blocked' ? 'warn' : 'info');
      self.stats.events++;
    });
  };

  function describeEvent(ev) {
    switch (ev.kind) {
      case 'coin': return '🪙 Koin terkumpul! (' + ev.x + ',' + ev.y + ')';
      case 'energy': return '⚡ Kristal energi diambil!';
      case 'button': return '🔘 Tombol ditekan — pintu terbuka.';
      case 'door-open': return '🚪 Pintu terbuka.';
      case 'door-pass': return 'Kiko melewati pintu.';
      case 'goal': return '🎯 Kiko tiba di tujuan.';
      case 'goal-locked': return '🔒 Tujuan terkunci. Lengkapi syarat misi.';
      case 'blocked': return '⛔ ' + (ev.reason || 'Terhalang.');
      case 'fail': return '💥 ' + (ev.reason || 'Gagal.');
      case 'win': return '🎉 Misi berhasil!';
      case 'jump-over': return '🦘 Kiko melompat melewati ' + ev.cell + '.';
      default: return '';
    }
  }

  Interpreter.prototype.fireTouch = function (object) {
    var stacks = this.handlers.touch[object] || [];
    this._queueFront(stacks);
  };

  Interpreter.prototype.fireKey = function (key) {
    if (!this.running) return;
    var stacks = this.handlers.key[key] || [];
    this._queueFront(stacks);
  };

  Interpreter.prototype._queueFront = function (stacks) {
    var stacksList = stacks.filter(Boolean);
    if (!stacksList.length) return;
    var self = this;
    this.queue.unshift((function* () {
      for (var i = 0; i < stacksList.length; i++) {
        yield* self.runStack(stacksList[i], 1);
      }
    })());
  };

  Interpreter.prototype._stepOnce = function () {
    if (!this.running || this.stopped) return null;
    var guard = 0;
    while (this.queue.length && guard++ < 500) {
      var gen = this.queue[0];
      var next;
      try { next = gen.next(); }
      catch (err) { this._fail(err); return null; }
      if (next.done) {
        this.queue.shift();
        continue;
      }
      var cmd = next.value;
      this.highlight(cmd.block);
      var result = this.applyCommand(cmd);
      this._processWorldEvents();
      if (this.world.state.status === 'won') { this._finish('won'); return { cmd: cmd, result: result, status: 'won' }; }
      if (this.world.state.status === 'lost') { this._finish('lost'); return { cmd: cmd, result: result, status: 'lost' }; }
      return { cmd: cmd, result: result, status: 'running' };
    }
    this._finish('done');
    return null;
  };

  Interpreter.prototype._fail = function (err) {
    this.stats.errors.push(err.message || String(err));
    this.onLog('⚠ ' + (err.message || err), 'error');
    this._finish('error');
  };

  Interpreter.prototype._finish = function (reason) {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.highlight(null);
    var payload = {
      reason: reason,
      status: this.world.state.status,
      stats: this.stats,
      variables: Object.assign({}, this.variables),
      world: this.world.state,
      errors: this.stats.errors.slice()
    };
    this.onFinish(payload);
  };

  /** Satu instruksi (mode STEP). */
  Interpreter.prototype.step = async function () {
    if (!this.running) this.start();
    var out = this._stepOnce();
    if (out) await this.onCommand(out.cmd, out.result, out.status);
    return out;
  };

  /** Menjalankan seluruh program dengan animasi. */
  Interpreter.prototype.run = async function () {
    if (!this.running) this.start();
    var limit = this.maxSteps + 10;
    while (this.running && !this.stopped && limit-- > 0) {
      var out = this._stepOnce();
      if (!out) break;
      await this.onCommand(out.cmd, out.result, out.status);
      if (this.stopped) break;
      var delay = this.autoDelay == null ? this.speed : this.autoDelay;
      if (delay > 0) await CA.util.sleep(delay);
    }
    if (limit <= 0 && !this.finished) this._fail('Program melebihi batas waktu eksekusi.');
  };

  /** Versi sinkron untuk pengujian (tanpa animasi). */
  Interpreter.prototype.runSync = function () {
    if (!this.running) this.start();
    var limit = this.maxSteps + 10;
    while (this.running && !this.stopped && limit-- > 0) {
      if (!this._stepOnce()) break;
    }
    return this.stats;
  };

  CA.Interpreter = Interpreter;
  CA.describeEvent = describeEvent;
})(typeof window !== 'undefined' ? window : globalThis);
