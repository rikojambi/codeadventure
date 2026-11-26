/* Code Adventure - pratinjau pseudocode & analisis blok (tanpa eval) */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});

  var LABEL = {
    ca_move_forward: 'MAJU',
    ca_move_backward: 'MUNDUR',
    ca_turn_left: 'BELOK_KIRI',
    ca_turn_right: 'BELOK_KANAN',
    ca_jump: 'LOMPAT',
    ca_wait: 'TUNGGU'
  };

  function pad(n) { return '  '.repeat(Math.max(0, n)); }

  function value(block, depth) {
    depth = depth || 0;
    if (!block || depth > 40) return '?';
    var f = function (n) { return block.getFieldValue ? block.getFieldValue(n) : null; };
    switch (block.type) {
      case 'ca_num':
      case 'math_number': return String(f('NUM'));
      case 'ca_get_var':
      case 'variables_get': return String(f('VAR') || '?');
      case 'ca_sensor_num': return 'sensor(' + String(f('SENSOR')) + ')';
      case 'ca_add': return value(block.getInputTargetBlock('A'), depth + 1) + ' + ' + value(block.getInputTargetBlock('B'), depth + 1);
      case 'ca_sub': return value(block.getInputTargetBlock('A'), depth + 1) + ' - ' + value(block.getInputTargetBlock('B'), depth + 1);
      case 'ca_mul': return value(block.getInputTargetBlock('A'), depth + 1) + ' * ' + value(block.getInputTargetBlock('B'), depth + 1);
      default: return '?';
    }
  }

  function condition(block, depth) {
    depth = depth || 0;
    if (!block || depth > 40) return 'SALAH';
    var f = function (n) { return block.getFieldValue ? block.getFieldValue(n) : null; };
    switch (block.type) {
      case 'ca_sensor_bool': return 'sensor(' + f('SENSOR') + ')';
      case 'ca_bool': return f('BOOL') === 'TRUE' ? 'BENAR' : 'SALAH';
      case 'ca_equals': return value(block.getInputTargetBlock('A')) + ' == ' + value(block.getInputTargetBlock('B'));
      case 'ca_gt': return value(block.getInputTargetBlock('A')) + ' > ' + value(block.getInputTargetBlock('B'));
      case 'ca_lt': return value(block.getInputTargetBlock('A')) + ' < ' + value(block.getInputTargetBlock('B'));
      case 'ca_compare': {
        var ops = { EQ: '==', GT: '>', LT: '<', GTE: '>=', LTE: '<=' };
        return value(block.getInputTargetBlock('A')) + ' ' + (ops[f('OP')] || '==') + ' ' + value(block.getInputTargetBlock('B'));
      }
      case 'ca_and': return '(' + condition(block.getInputTargetBlock('A'), depth + 1) + ' DAN ' + condition(block.getInputTargetBlock('B'), depth + 1) + ')';
      case 'ca_or': return '(' + condition(block.getInputTargetBlock('A'), depth + 1) + ' ATAU ' + condition(block.getInputTargetBlock('B'), depth + 1) + ')';
      case 'ca_not': return 'BUKAN ' + condition(block.getInputTargetBlock('A'), depth + 1);
      default: return '?';
    }
  }

  function walk(block, indent, out) {
    var level = indent;
    while (block) {
      var f = function (n) { return block.getFieldValue ? block.getFieldValue(n) : null; };
      switch (block.type) {
        case 'ca_when_start':
          out.push(pad(level) + 'MULAI');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          out.push(pad(level) + 'SELESAI');
          break;
        case 'ca_move_forward':
        case 'ca_move_backward':
        case 'ca_turn_left':
        case 'ca_turn_right':
        case 'ca_jump':
        case 'ca_wait':
          out.push(pad(level) + LABEL[block.type]);
          break;
        case 'ca_repeat':
          out.push(pad(level) + 'ULANGI ' + f('COUNT') + ' KALI:');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_repeat_until':
          out.push(pad(level) + 'ULANGI SAMPAI ' + condition(block.getInputTargetBlock('COND')) + ':');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_while':
          out.push(pad(level) + 'SELAMA ' + condition(block.getInputTargetBlock('COND')) + ':');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_if':
          out.push(pad(level) + 'JIKA ' + condition(block.getInputTargetBlock('COND')) + ':');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_if_else':
          out.push(pad(level) + 'JIKA ' + condition(block.getInputTargetBlock('COND')) + ':');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          out.push(pad(level) + 'JIKA TIDAK:');
          walk(block.getInputTargetBlock('ELSE'), level + 1, out);
          break;
        case 'ca_set_var':
          out.push(pad(level) + 'SET ' + f('VAR') + ' = ' + value(block.getInputTargetBlock('VALUE')));
          break;
        case 'ca_change_var':
          out.push(pad(level) + 'UBAH ' + f('VAR') + ' OLEH ' + value(block.getInputTargetBlock('VALUE')));
          break;
        case 'ca_def_func':
          out.push(pad(level) + 'FUNGSI ' + f('NAME') + '():');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_call_func':
          out.push(pad(level) + 'PANGGIL ' + f('NAME') + '()');
          break;
        case 'ca_when_touch':
          out.push(pad(level) + 'KETIKA SENTUH ' + f('OBJECT') + ':');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_when_key':
          out.push(pad(level) + 'KETIKA TOMBOL ' + f('KEY') + ':');
          walk(block.getInputTargetBlock('DO'), level + 1, out);
          break;
        case 'ca_log':
          out.push(pad(level) + 'TULIS("' + f('TEXT') + '")');
          break;
        default:
          out.push(pad(level) + '# blok ' + block.type + ' (tidak dikenal)');
      }
      block = block.getNextBlock ? block.getNextBlock() : null;
    }
  }

  function generate(workspace) {
    if (!workspace) return '';
    var tops = workspace.getTopBlocks(true).slice();
    tops.sort(function (a, b) {
      var ay = a.getRelativeToSurfaceXY ? a.getRelativeToSurfaceXY().y : 0;
      var by = b.getRelativeToSurfaceXY ? b.getRelativeToSurfaceXY().y : 0;
      return ay - by;
    });
    var out = [];
    tops.forEach(function (block) { walk(block, 0, out); });
    return out.length ? out.join('\n') : '// Workspace masih kosong. Tambahkan blok dari Toolbox.';
  }

  function analyze(workspace) {
    var stats = { total: 0, motion: 0, control: 0, logic: 0, variable: 0, function: 0, event: 0, sensor: 0, loops: 0, functions: 0, unknown: 0 };
    if (!workspace || !workspace.getAllBlocks) return stats;
    workspace.getAllBlocks(false).forEach(function (b) {
      stats.total++;
      var t = b.type || '';
      if (t.indexOf('ca_move') === 0 || t.indexOf('ca_turn') === 0 || t === 'ca_jump' || t === 'ca_wait') stats.motion++;
      else if (t.indexOf('ca_repeat') === 0 || t === 'ca_if' || t === 'ca_if_else' || t === 'ca_while') { stats.control++; stats.loops++; }
      else if (t.indexOf('ca_get_var') === 0 || t.indexOf('ca_set_var') === 0 || t.indexOf('ca_change_var') === 0) stats.variable++;
      else if (t === 'ca_def_func' || t === 'ca_call_func') { stats.function++; if (t === 'ca_def_func') stats.functions++; }
      else if (t.indexOf('ca_when_') === 0) stats.event++;
      else if (t.indexOf('ca_sensor') === 0) stats.sensor++;
      else if (t.indexOf('ca_') === 0 || t.indexOf('math_') === 0) stats.logic++;
      else stats.unknown++;
    });
    return stats;
  }

  var EXPLAIN = {
    move: function (cmd) { return 'Blok ' + cmd.label + ' → Kiko bergerak ' + (cmd.delta === 1 ? 'maju' : 'mundur') + ' satu petak.'; },
    turn: function (cmd) { return 'Blok ' + cmd.label + ' → arah hadap berubah ' + (cmd.delta === 1 ? 'searah jarum jam' : 'berlawanan jarum jam') + '.'; },
    jump: function () { return 'Blok Lompat → Kiko meloncat dua petak melewati rintangan.'; },
    wait: function () { return 'Blok Tunggu → tidak ada pergerakan, waktu berjalan satu langkah.'; },
    varSet: function (cmd) { return 'Blok Set → variabel ' + cmd.name + ' sekarang bernilai ' + cmd.value + '.'; },
    varChange: function (cmd) { return 'Blok Ubah → variabel ' + cmd.name + ' bertambah ' + cmd.value + '.'; },
    call: function (cmd) { return 'Blok Panggil → menjalankan isi fungsi "' + cmd.name + '".'; },
    log: function (cmd) { return 'Blok Tulis → pesan: ' + cmd.text; }
  };

  CA.pseudocode = generate;
  CA.analyzeWorkspace = analyze;
  CA.explainCommand = function (cmd) { return EXPLAIN[cmd.type] ? EXPLAIN[cmd.type](cmd) : cmd.label || ''; };
})(typeof window !== 'undefined' ? window : globalThis);
