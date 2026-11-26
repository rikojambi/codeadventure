/* Code Adventure - model dunia deterministik (tanpa Phaser, mudah diuji) */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});

  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var DIR_NAMES = ['kanan', 'bawah', 'kiri', 'atas'];

  function mod(n, m) { return ((n % m) + m) % m; }

  function World(level) {
    this.level = level;
    this.width = level.grid[0].length;
    this.height = level.grid.length;
    this.reset();
  }

  World.prototype.reset = function () {
    var start = this.find('S');
    this.state = {
      x: start.x,
      y: start.y,
      dir: this.level.dir == null ? 0 : this.level.dir,
      coins: {},
      energy: {},
      pressed: false,
      doorOpen: false,
      steps: 0,
      jumps: 0,
      status: 'running',
      reason: '',
      variables: { energi: 0, skor: 0, langkah: 0, n: 0 },
      message: 'Siap menjalankan program.'
    };
    this.events = [];
    return this.state;
  };

  World.prototype.find = function (ch) {
    for (var y = 0; y < this.height; y++) {
      var x = this.level.grid[y].indexOf(ch);
      if (x !== -1) return { x: x, y: y };
    }
    return { x: 1, y: 1 };
  };

  World.prototype.cell = function (x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return '#';
    return this.level.grid[y].charAt(x);
  };

  World.prototype.countCells = function (ch) {
    var n = 0;
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) if (this.cell(x, y) === ch) n++;
    }
    return n;
  };

  World.prototype.front = function (delta) {
    var d = DIRS[this.state.dir];
    var n = delta == null ? 1 : delta;
    return { x: this.state.x + d[0] * n, y: this.state.y + d[1] * n };
  };

  World.prototype.setVariableSnapshot = function (vars) {
    if (!vars) return;
    Object.keys(vars).forEach(function (key) {
      var value = Number(vars[key]);
      this.state.variables[key] = isFinite(value) ? value : 0;
    }, this);
  };

  World.prototype.turn = function (delta) {
    if (this.state.status !== 'running') return { type: 'turn', skipped: true };
    this.state.dir = mod(this.state.dir + delta, 4);
    this.state.steps++;
    this.events.push({ type: 'turn', dir: this.state.dir });
    return { type: 'turn', dir: this.state.dir };
  };

  World.prototype.wait = function () {
    if (this.state.status !== 'running') return { type: 'wait', skipped: true };
    this.state.steps++;
    this.events.push({ type: 'wait' });
    return { type: 'wait' };
  };

  World.prototype.move = function (delta, jumping) {
    if (this.state.status !== 'running') return { type: 'move', skipped: true };
    var target = this.front(delta);
    return this.stepTo(target.x, target.y, !!jumping, delta);
  };

  World.prototype.jump = function () {
    if (this.state.status !== 'running') return { type: 'jump', skipped: true };
    var target = this.front(2);
    var result = this.stepTo(target.x, target.y, true, 2);
    result.type = 'jump';
    this.state.jumps++;
    return result;
  };

  World.prototype.stepTo = function (nx, ny, jumping, delta) {
    var result = { type: jumping ? 'jump' : 'move', from: { x: this.state.x, y: this.state.y }, to: { x: nx, y: ny }, events: [], blocked: false };
    var self = this;
    function note(kind, extra) {
      var ev = Object.assign({ kind: kind }, extra || {});
      result.events.push(ev);
      self.events.push(ev);
    }

    var landing = this.cell(nx, ny);
    if (landing === '#') {
      result.blocked = true;
      result.reason = 'Dinding menghalangi pergerakan.';
      note('blocked', { reason: result.reason });
      return result;
    }
    if (landing === 'D' && !this.state.doorOpen) {
      result.blocked = true;
      result.reason = 'Pintu masih terkunci. Cari tombol (B) terlebih dahulu.';
      note('blocked', { reason: result.reason });
      return result;
    }
    if (landing === '~' || landing === '^') {
      this.state.status = 'lost';
      this.state.reason = 'Kiko jatuh ke jurang/rintangan! Gunakan blok Jump untuk melewatinya.';
      note('fail', { reason: this.state.reason });
      return result;
    }

    if (jumping && delta === 2) {
      var middle = this.front(1);
      var midCell = this.cell(middle.x, middle.y);
      if (midCell === '#') {
        result.blocked = true;
        result.reason = 'Dinding terlalu tinggi untuk dilompati.';
        note('blocked', { reason: result.reason });
        return result;
      }
      result.over = { x: middle.x, y: middle.y, cell: midCell };
      note('jump-over', { cell: midCell });
    }

    this.state.x = nx;
    this.state.y = ny;
    this.state.steps++;
    this.state.variables.langkah = this.state.steps;

    var key = nx + ',' + ny;
    if (landing === 'c' && !this.state.coins[key]) {
      this.state.coins[key] = true;
      note('coin', { x: nx, y: ny });
    }
    if (landing === 'E' && !this.state.energy[key]) {
      this.state.energy[key] = true;
      note('energy', { x: nx, y: ny });
    }
    if (landing === 'B' && !this.state.pressed) {
      this.state.pressed = true;
      this.state.doorOpen = true;
      note('button', { x: nx, y: ny });
      note('door-open');
    }
    if (landing === 'D' && this.state.doorOpen) note('door-pass');
    if (landing === 'G') note('goal');

    this.checkWin();
    return result;
  };

  /** Helper pembanding syarat level. */
  World.prototype.requirementsMet = function () {
    var req = this.level.require || {};
    return this.collectedCoins() >= (req.coins || 0) &&
      this.collectedEnergy() >= (req.energy || 0) &&
      (!req.button || this.state.pressed) &&
      (!req.variable || (Number(this.state.variables[req.variable.name]) || 0) >= (req.variable.min || 0));
  };

  World.prototype.collectedCoins = function () { return Object.keys(this.state.coins).length; };
  World.prototype.collectedEnergy = function () { return Object.keys(this.state.energy).length; };

  World.prototype.checkWin = function () {
    if (this.state.status !== 'running') return;
    if (this.cell(this.state.x, this.state.y) !== 'G') return;
    if (this.requirementsMet()) {
      this.state.status = 'won';
      this.state.message = 'Misi berhasil! Kiko mencapai tujuan.';
      this.events.push({ kind: 'win' });
    } else {
      this.state.message = 'Tujuan masih terkunci. Lengkapi syarat misi dulu!';
      this.events.push({ kind: 'goal-locked' });
    }
  };

  World.prototype.sensorBool = function (name) {
    var s = this.state;
    var front = this.front(1);
    var frontCell = this.cell(front.x, front.y);
    switch (name) {
      case 'depan_dinding': return frontCell === '#' || (frontCell === 'D' && !s.doorOpen);
      case 'depan_jurang': return frontCell === '~' || frontCell === '^';
      case 'depan_koin': return frontCell === 'c' && !s.coins[front.x + ',' + front.y];
      case 'depan_tujuan': return frontCell === 'G';
      case 'depan_aman': return frontCell !== '#' && frontCell !== '~' && frontCell !== '^' && !(frontCell === 'D' && !s.doorOpen);
      case 'pintu_terbuka': return s.doorOpen;
      case 'tombol_aktif': return s.pressed;
      case 'di_tujuan': return this.cell(s.x, s.y) === 'G';
      case 'di_koin': return this.cell(s.x, s.y) === 'c';
      case 'di_energi': return this.cell(s.x, s.y) === 'E';
      case 'koin_lengkap': return this.collectedCoins() >= (this.level.require.coins || 0);
      case 'energi_cukup': return this.collectedEnergy() >= (this.level.require.energy || 0);
      case 'syarat_lengkap': return this.requirementsMet();
      case 'berhasil': return s.status === 'won';
      case 'gagal': return s.status === 'lost';
      default: return false;
    }
  };

  World.prototype.sensorNum = function (name) {
    var s = this.state;
    switch (name) {
      case 'jumlah_koin': return this.collectedCoins();
      case 'jumlah_energi': return this.collectedEnergy();
      case 'sisa_koin': return Math.max(0, (this.level.require.coins || 0) - this.collectedCoins());
      case 'langkah': return s.steps;
      case 'posisi_x': return s.x;
      case 'posisi_y': return s.y;
      case 'arah': return s.dir;
      case 'nomor_level': return typeof this.level.id === 'number' ? this.level.id : 0;
      default: return 0;
    }
  };

  World.prototype.directionName = function () { return DIR_NAMES[this.state.dir]; };

  World.prototype.drainEvents = function () {
    var out = this.events.slice();
    this.events = [];
    return out;
  };

  CA.World = World;
  CA.DIRS = DIRS;
})(typeof window !== 'undefined' ? window : globalThis);
