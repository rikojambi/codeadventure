/* Uji otomatis tanpa dependency: node tests/run.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { console, setTimeout, clearTimeout, Math, Date, JSON, Object, Array, String, Number, Boolean };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}
load('src/core/util.js');
load('src/game/levels.js');
load('src/game/world.js');
load('src/core/scoring.js');
load('src/engine/interpreter.js');
const CA = sandbox.CA;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e)); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'expected') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }
function ok(value, msg) { if (!value) throw new Error(msg || 'expected truthy'); }

console.log('\n[1] Struktur level');
CA.LEVELS.forEach(function (level) {
  test('Level ' + level.id + ' grid valid', function () {
    const w = level.grid[0].length;
    level.grid.forEach(function (row, i) { eq(row.length, w, 'baris ' + i + ' level ' + level.id); });
    ok(level.grid.join('').includes('S'), 'harus ada S');
    ok(level.grid.join('').includes('G'), 'harus ada G');
    ok(level.hints.length >= 3, 'minimal 3 petunjuk');
  });
  test('Level ' + level.id + ' tujuan dapat dicapai', function () {
    const world = new CA.World(level);
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const queue = [[world.state.x, world.state.y, 0]];
    const seen = new Set();
    let found = false;
    while (queue.length) {
      const [x, y, jumps] = queue.shift();
      const key = x + ',' + y + ',' + jumps;
      if (seen.has(key)) continue;
      seen.add(key);
      if (level.grid[y].charAt(x) === 'G') { found = true; break; }
      for (const [dx, dy] of dirs) {
        for (const dist of [1, 2]) {
          if (dist === 2 && jumps >= 1) continue;
          const nx = x + dx * dist, ny = y + dy * dist;
          const cell = world.cell(nx, ny);
          if (cell === '#' || cell === '~' || cell === '^') continue;
          if (dist === 2 && world.cell(x + dx, y + dy) === '#') continue;
          queue.push([nx, ny, jumps + (dist === 2 ? 1 : 0)]);
        }
      }
    }
    ok(found, 'tidak ada jalur ke tujuan');
  });
  test('Level ' + level.id + ' jumlah syarat sesuai peta', function () {
    const world = new CA.World(level);
    const req = level.require || {};
    ok(world.countCells('c') >= (req.coins || 0), 'koin kurang');
    ok(world.countCells('E') >= (req.energy || 0), 'energi kurang');
    if (req.button) ok(world.countCells('B') > 0, 'tombol tidak ada');
  });
});

console.log('\n[2] Dunia游戏');
test('Belok kanan mengubah arah', function () {
  const w = new CA.World(CA.getLevel(1));
  eq(w.state.dir, 0);
  w.turn(1); eq(w.state.dir, 1);
  w.turn(1); eq(w.state.dir, 2);
  w.turn(-1); eq(w.state.dir, 1);
});
test('Dinding memblokir gerakan', function () {
  const w = new CA.World(CA.getLevel(1));
  w.move(1); w.move(1); w.move(1);
  const r = w.move(1);
  ok(r.blocked, 'dinding harus memblokir');
  eq(w.state.x, 3);
});
test('Level 1 selesai dengan urutan benar', function () {
  const w = new CA.World(CA.getLevel(1));
  w.move(1); w.move(1); w.turn(1); w.move(1); w.move(1);
  eq(w.state.status, 'won');
});
test('Jurang membuat gagal tanpa Jump', function () {
  const w = new CA.World(CA.getLevel(3));
  w.move(1); w.move(1); w.move(1);
  eq(w.state.status, 'lost');
});
test('Jump melewati jurang', function () {
  const w = new CA.World(CA.getLevel(3));
  w.move(1); w.move(1); w.jump(); w.move(1); w.move(1);
  eq(w.state.status, 'won');
});
test('Koin terkumpul saat dilalui', function () {
  const w = new CA.World(CA.getLevel(2));
  for (let i = 0; i < 8; i++) w.move(1);
  eq(w.collectedCoins(), 3);
  eq(w.state.status, 'won');
});
test('Tombol membuka pintu', function () {
  const w = new CA.World(CA.getLevel(5));
  const r = w.move(1);
  eq(r.blocked, false);
  ok(!w.state.doorOpen);
});
test('Sensor membaca kondisi dunia', function () {
  const w = new CA.World(CA.getLevel(3));
  w.move(1); w.move(1);
  ok(w.sensorBool('depan_jurang'));
  ok(!w.sensorBool('depan_dinding'));
});

console.log('\n[3] Penilaian');
test('Skor bintang 1-3', function () {
  const result = CA.scoreRun({
    level: CA.getLevel(1),
    stats: { blocks: 5, commands: 4, errors: 0, loops: 0, functions: 0, attempts: 1 },
    won: true
  });
  ok(result.stars >= 1 && result.stars <= 3);
  ok(result.xp > 0);
});
test('Gagal mendapat 0 bintang', function () {
  const result = CA.scoreRun({ level: CA.getLevel(1), stats: { blocks: 5, attempts: 1 }, won: false });
  eq(result.stars, 0);
  eq(result.xp, 0);
});

console.log('\n[4] Interpreter (block mock)');
function fakeBlock(type, fields, children) {
  return {
    type: type,
    id: 'b-' + Math.random().toString(36).slice(2),
    fields: fields || {},
    children: children || {},
    getFieldValue: function (name) { return this.fields[name]; },
    getInputTargetBlock: function (name) { return this.children[name] || null; },
    getSvgRoot: function () { return null; },
    isEnabled: function () { return true; }
  };
}
test('Interpreter menjalankan urutan perintah', function () {
  const level = CA.getLevel(1);
  const world = new CA.World(level);
  const stack = [
    fakeBlock('ca_move_forward'), fakeBlock('ca_move_forward'),
    fakeBlock('ca_turn_right'), fakeBlock('ca_move_forward'), fakeBlock('ca_move_forward')
  ];
  stack.forEach(function (b, i) { b.getNextBlock = function () { return stack[i + 1] || null; }; });
  const workspace = { getTopBlocks: function () { return stack; } };
  const interp = new CA.Interpreter({ world: world, workspace: workspace, autoDelay: 0 });
  interp.runSync();
  eq(world.state.status, 'won');
  eq(interp.stats.commands, 5);
});
test('Interpreter tidak memakai eval', function () {
  const source = fs.readFileSync(path.join(root, 'src/engine/interpreter.js'), 'utf8');
  ok(!/\beval\s*\(/.test(source), 'eval ditemukan');
});
test('Repeat berjalan sesuai jumlah', function () {
  const world = new CA.World(CA.getLevel(2));
  const inner = fakeBlock('ca_move_forward');
  const repeat = fakeBlock('ca_repeat', { COUNT: '4' }, { DO: inner });
  const interp = new CA.Interpreter({ world: world, workspace: { getTopBlocks: function () { return [repeat]; } }, autoDelay: 0 });
  interp.runSync();
  eq(world.state.x, 5);
});
test('Guard infinite loop bekerja', function () {
  const world = new CA.World(CA.getLevel(1));
  const repeat = fakeBlock('ca_repeat', { COUNT: '99999' }, { DO: fakeBlock('ca_move_forward') });
  const interp = new CA.Interpreter({ world: world, workspace: { getTopBlocks: function () { return [repeat]; } }, autoDelay: 0, maxSteps: 50 });
  interp.runSync();
  ok(interp.stats.errors.length > 0, 'harus ada error');
});

console.log('\n' + passed + ' lulus, ' + failed + ' gagal.');
process.exit(failed ? 1 : 0);
