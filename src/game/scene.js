/* Code Adventure - scene Phaser 3: pixel art prosedural, tanpa aset gambar eksternal */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});

  var THEMES = {
    hutan: { floor: '#2f8a5b', floor2: '#257a4e', wall: '#194c35', edge: '#7bd68f', sky: '#142b2a' },
    gurun: { floor: '#d9a94c', floor2: '#c9943b', wall: '#8a5a2b', edge: '#ffe0a0', sky: '#3a2a20' },
    kota: { floor: '#4d5b70', floor2: '#445268', wall: '#263144', edge: '#9fd0ff', sky: '#141d2e' },
    lab: { floor: '#3b4a7a', floor2: '#34436f', wall: '#1d2748', edge: '#9db8ff', sky: '#10162e' },
    langit: { floor: '#5b4f9c', floor2: '#51468c', wall: '#2e2757', edge: '#d6c4ff', sky: '#1b1640' }
  };

  class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
      this.level = null;
      this.world = null;
      this.tile = 44;
      this.moveDuration = 240;
      this.entities = { coins: {}, energy: {} };
    }

    create() {
      this.createTextures();
      this.bg = this.add.rectangle(480, 270, 960, 540, 0x101528);
      this.board = this.add.container(0, 0);
      this.fxLayer = this.add.container(0, 0);
      this.events.emit('scene-ready');
    }

    createTextures() {
      var self = this;
      function make(key, w, h, draw) {
        if (self.textures.exists(key)) return;
        var g = self.make.graphics({ x: 0, y: 0, add: false });
        draw(g);
        g.generateTexture(key, w, h);
        g.destroy();
      }
      Object.keys(THEMES).forEach(function (name) {
        var t = THEMES[name];
        make('floor-' + name, 32, 32, function (g) {
          g.fillStyle(Phaser.Display.Color.HexStringToColor(t.floor).color, 1); g.fillRect(0, 0, 32, 32);
          g.fillStyle(Phaser.Display.Color.HexStringToColor(t.floor2).color, 1);
          g.fillRect(0, 0, 16, 16); g.fillRect(16, 16, 16, 16);
          g.lineStyle(1, 0x000000, 0.12); g.strokeRect(0.5, 0.5, 31, 31);
        });
        make('wall-' + name, 32, 32, function (g) {
          g.fillStyle(Phaser.Display.Color.HexStringToColor(t.wall).color, 1); g.fillRect(0, 0, 32, 32);
          g.fillStyle(0xffffff, 0.09); g.fillRect(2, 2, 12, 10); g.fillRect(18, 16, 12, 12);
          g.lineStyle(2, Phaser.Display.Color.HexStringToColor(t.edge).color, 0.35); g.strokeRect(1, 1, 30, 30);
        });
      });

      make('pit', 32, 32, function (g) {
        g.fillStyle(0x090b14, 1); g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x1c2030, 1); g.fillRect(4, 4, 24, 24);
        g.fillStyle(0x05060a, 1); g.fillRect(8, 8, 16, 16);
      });
      make('spike', 32, 32, function (g) {
        g.fillStyle(0x7a2030, 1); g.fillRect(0, 0, 32, 32);
        g.fillStyle(0xff6b7d, 1);
        [4, 14, 24].forEach(function (x) { g.fillTriangle(x, 26, x + 5, 6, x + 10, 26); });
      });
      make('coin', 32, 32, function (g) {
        g.fillStyle(0xffd54a, 1); g.fillCircle(16, 16, 12);
        g.fillStyle(0xffa726, 1); g.fillCircle(16, 16, 9);
        g.fillStyle(0xffec9a, 1); g.fillRect(12, 10, 4, 12);
      });
      make('energy', 32, 32, function (g) {
        g.fillStyle(0x00e5ff, 1); g.fillTriangle(16, 2, 28, 18, 16, 30);
        g.fillTriangle(16, 2, 4, 18, 16, 30);
        g.fillStyle(0xffffff, 0.8); g.fillRect(14, 8, 4, 12);
      });
      make('goal', 32, 32, function (g) {
        g.fillStyle(0x123d2b, 1); g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x39ff9e, 1); g.fillRect(4, 4, 24, 24);
        g.fillStyle(0x0b2a1d, 1); g.fillRect(9, 9, 14, 14);
        g.fillStyle(0xd8ffe9, 1); g.fillRect(13, 12, 6, 9);
      });
      make('door-closed', 32, 32, function (g) {
        g.fillStyle(0x6d4b24, 1); g.fillRect(0, 0, 32, 32);
        g.fillStyle(0xa3702f, 1); g.fillRect(4, 2, 24, 30);
        g.fillStyle(0xffd166, 1); g.fillCircle(23, 18, 2);
      });
      make('door-open', 32, 32, function (g) {
        g.fillStyle(0x1d2a3a, 1); g.fillRect(0, 0, 32, 32);
        g.fillStyle(0xa3702f, 1); g.fillRect(2, 2, 7, 30); g.fillRect(25, 2, 6, 30);
        g.fillStyle(0x66ffc2, 0.35); g.fillRect(10, 4, 14, 28);
      });
      make('button-off', 32, 32, function (g) {
        g.fillStyle(0x374151, 1); g.fillRect(2, 10, 28, 14);
        g.fillStyle(0xef4444, 1); g.fillCircle(16, 17, 7);
      });
      make('button-on', 32, 32, function (g) {
        g.fillStyle(0x374151, 1); g.fillRect(2, 12, 28, 12);
        g.fillStyle(0x22c55e, 1); g.fillCircle(16, 16, 7);
        g.fillStyle(0xd8ffe9, 1); g.fillCircle(16, 16, 3);
      });
      make('particle', 8, 8, function (g) { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 8, 8); });

      for (var d = 0; d < 4; d++) {
        (function (dir) {
          make('robot-' + dir, 32, 32, function (g) {
            g.fillStyle(0x0d1626, 1); g.fillRect(4, 4, 24, 24);
            g.fillStyle(0x7dd3fc, 1); g.fillRect(6, 6, 20, 20);
            g.fillStyle(0x2563eb, 1); g.fillRect(8, 9, 16, 14);
            g.fillStyle(0xf8fafc, 1);
            var ex = dir === 2 ? 9 : dir === 0 ? 19 : 12;
            var ey = dir === 1 ? 19 : dir === 3 ? 8 : 12;
            g.fillRect(ex, ey, 5, 6);
            g.fillStyle(0x22d3ee, 1); g.fillRect(ex + 1, ey + 2, 3, 3);
            g.fillStyle(0xfacc15, 1); g.fillRect(15, 1, 3, 5); g.fillCircle(16, 1, 2);
            g.fillStyle(0x111827, 1); g.fillRect(6, 27, 7, 3); g.fillRect(19, 27, 7, 3);
          });
        })(d);
      }
    }

    loadLevel(level, world) {
      this.level = level;
      this.world = world;
      this.board.removeAll(true);
      this.fxLayer.removeAll(true);
      var theme = THEMES[level.theme] || THEMES.hutan;
      this.bg.setFillStyle(Phaser.Display.Color.HexStringToColor(theme.sky).color, 1);
      this.tile = Math.min(Math.floor(880 / world.width), Math.floor(470 / world.height), 60);
      var ox = Math.floor((960 - world.width * this.tile) / 2);
      var oy = Math.floor((540 - world.height * this.tile) / 2) + 6;
      this.offset = { x: ox, y: oy };
      this.entities = { coins: {}, energy: {} };
      this.buttonSprite = null;
      this.doorSprite = null;
      this.startCell = null;

      for (var y = 0; y < world.height; y++) {
        for (var x = 0; x < world.width; x++) {
          var cell = world.cell(x, y);
          var px = ox + x * this.tile + this.tile / 2;
          var py = oy + y * this.tile + this.tile / 2;
          var floorKey = (x + y) % 2 ? 'floor-' + level.theme : 'floor-' + level.theme;
          var base = this.add.image(px, py, 'floor-' + level.theme).setDisplaySize(this.tile, this.tile);
          this.board.add(base);
          if (cell === '#') {
            this.board.add(this.add.image(px, py, 'wall-' + level.theme).setDisplaySize(this.tile, this.tile));
          } else if (cell === '~' || cell === '^') {
            this.board.add(this.add.image(px, py, cell === '~' ? 'pit' : 'spike').setDisplaySize(this.tile, this.tile));
          } else {
            if (cell === 'G') this.board.add(this.add.image(px, py, 'goal').setDisplaySize(this.tile, this.tile));
            if (cell === 'c') {
              var coin = this.add.image(px, py, 'coin').setDisplaySize(this.tile * 0.72, this.tile * 0.72);
              coin.baseY = py;
              coin.baseScale = coin.scaleX;
              this.board.add(coin); this.entities.coins[x + ',' + y] = coin;
              this.tweens.add({ targets: coin, y: py - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
            if (cell === 'E') {
              var energy = this.add.image(px, py, 'energy').setDisplaySize(this.tile * 0.7, this.tile * 0.7);
              this.board.add(energy); this.entities.energy[x + ',' + y] = energy;
              this.tweens.add({ targets: energy, alpha: 0.55, duration: 520, yoyo: true, repeat: -1 });
            }
            if (cell === 'B') {
              this.buttonSprite = this.add.image(px, py, 'button-off').setDisplaySize(this.tile * 0.8, this.tile * 0.8);
              this.board.add(this.buttonSprite);
            }
            if (cell === 'D') {
              this.doorSprite = this.add.image(px, py, 'door-closed').setDisplaySize(this.tile, this.tile);
              this.board.add(this.doorSprite);
            }
          }
          if (cell === 'S') this.startCell = { x: x, y: y };
        }
      }

      this.robot = this.add.image(
        ox + world.state.x * this.tile + this.tile / 2,
        oy + world.state.y * this.tile + this.tile / 2,
        'robot-' + world.state.dir
      ).setDisplaySize(this.tile * 0.88, this.tile * 0.88);
      this.board.add(this.robot);
      this.arrow = this.add.text(this.robot.x, this.robot.y - this.tile * 0.72, '▼', {
        fontSize: Math.max(14, Math.floor(this.tile * 0.42)) + 'px', color: '#ffe066', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.board.add(this.arrow);
      this.updateArrow();
      this.syncState();
    }

    cellToPixel(x, y) {
      return {
        x: this.offset.x + x * this.tile + this.tile / 2,
        y: this.offset.y + y * this.tile + this.tile / 2
      };
    }

    updateArrow() {
      if (!this.arrow || !this.world) return;
      var p = this.cellToPixel(this.world.state.x, this.world.state.y);
      this.arrow.setPosition(p.x, p.y - this.tile * 0.72);
      this.arrow.setAngle([-90, 0, 90, 180][this.world.state.dir] + 90);
    }

    syncState() {
      var s = this.world.state;
      Object.keys(this.entities.coins).forEach(function (key) {
        var part = key.split(',');
        if (s.coins[key]) {
          var coin = this.entities.coins[key];
          coin.setVisible(false);
        }
      }, this);
      Object.keys(this.entities.energy).forEach(function (key) {
        if (s.energy[key]) this.entities.energy[key].setVisible(false);
      }, this);
      if (this.buttonSprite) this.buttonSprite.setTexture(s.pressed ? 'button-on' : 'button-off');
      if (this.doorSprite) this.doorSprite.setTexture(s.doorOpen ? 'door-open' : 'door-closed');
      this.updateArrow();
    }

    resetView() {
      if (!this.world) return;
      this.fxLayer.removeAll(true);
      if (this.robot) this.tweens.killTweensOf(this.robot);
      this.board.list.forEach(function (obj) { if (obj.setData) obj.setAlpha(1); });
      Object.keys(this.entities.coins).forEach(function (k) {
        var coin = this.entities.coins[k];
        this.tweens.killTweensOf(coin);
        coin.setVisible(true).setScale(coin.baseScale).setAlpha(1).setY(coin.baseY);
        this.tweens.add({ targets: coin, y: coin.baseY - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }, this);
      Object.keys(this.entities.energy).forEach(function (k) {
        var energy = this.entities.energy[k];
        this.tweens.killTweensOf(energy);
        energy.setVisible(true).setAlpha(1);
        this.tweens.add({ targets: energy, alpha: 0.55, duration: 520, yoyo: true, repeat: -1 });
      }, this);
      if (this.buttonSprite) this.buttonSprite.setTexture('button-off');
      if (this.doorSprite) this.doorSprite.setTexture('door-closed');
      if (this.robot && this.startCell) {
        var p = this.cellToPixel(this.startCell.x, this.startCell.y);
        this.robot.setPosition(p.x, p.y).setTexture('robot-' + this.world.state.dir).setTint(0xffffff);
      }
      this.updateArrow();
    }

    floatText(text, x, y, color) {
      var t = this.add.text(x, y, text, { fontSize: '18px', fontStyle: 'bold', color: color || '#ffffff', backgroundColor: '#00000088', padding: { x: 5, y: 3 } }).setOrigin(0.5);
      this.fxLayer.add(t);
      this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 700, onComplete: function () { t.destroy(); } });
    }

    burst(x, y, color, count) {
      for (var i = 0; i < (count || 8); i++) {
        var p = this.add.image(x, y, 'particle').setTint(color).setScale(0.5);
        this.fxLayer.add(p);
        var angle = (Math.PI * 2 * i) / (count || 8);
        this.tweens.add({
          targets: p, x: x + Math.cos(angle) * 26, y: y + Math.sin(angle) * 26,
          alpha: 0, scale: 0.1, duration: 420, onComplete: function () { p.destroy(); }
        });
      }
    }

    animateRobot(px, py, jumping) {
      var self = this;
      return new Promise(function (resolve) {
        var duration = jumping ? self.moveDuration * 1.4 : self.moveDuration;
        if (jumping) {
          self.tweens.add({ targets: self.robot, scaleX: self.tile * 0.98 / 32, scaleY: self.tile * 0.98 / 32, duration: duration / 2, yoyo: true, ease: 'Sine.easeOut' });
        }
        self.tweens.add({
          targets: self.robot, x: px, y: py, duration: duration, ease: jumping ? 'Sine.easeInOut' : 'Quad.easeInOut',
          onComplete: function () { resolve(); }
        });
      });
    }

    play(cmd, result, status) {
      var self = this;
      if (!this.robot) return Promise.resolve();
      var s = this.world.state;
      var before = result && result.from ? result.from : { x: s.x, y: s.y };
      var p = this.cellToPixel(s.x, s.y);

      if (cmd.type === 'turn') {
        this.robot.setTexture('robot-' + s.dir);
        this.arrow.setAngle([-90, 0, 90, 180][s.dir] + 90);
        this.floatText(cmd.label, p.x, p.y - this.tile, '#ffe066');
      } else if (cmd.type === 'move' || cmd.type === 'jump') {
        if (result && result.blocked) {
          this.cameras.main.shake(130, 0.004);
          this.floatText('⛔', p.x, p.y - this.tile * 0.6, '#ff7675');
        } else {
          var from = this.cellToPixel(before.x, before.y);
          this.floatText(cmd.type === 'jump' ? '🦘' : '•', from.x, from.y - this.tile * 0.5, '#ffffff');
        }
      } else if (cmd.type === 'wait' || cmd.type === 'log' || cmd.type === 'call' || cmd.type.indexOf('var') === 0) {
        this.floatText(cmd.label, p.x, p.y - this.tile * 0.8, '#bde0fe');
      }

      var events = (result && result.events) || [];
      events.forEach(function (ev) {
        var ep = self.cellToPixel(ev.x != null ? ev.x : s.x, ev.y != null ? ev.y : s.y);
        if (ev.kind === 'coin') {
          var coin = self.entities.coins[ev.x + ',' + ev.y];
          if (coin) self.tweens.add({ targets: coin, scale: 0, alpha: 0, duration: 220, onComplete: function () { coin.setVisible(false); } });
          CA.Audio.play('coin'); self.burst(ep.x, ep.y, 0xffd54a, 8);
        } else if (ev.kind === 'energy') {
          var energy = self.entities.energy[ev.x + ',' + ev.y];
          if (energy) self.tweens.add({ targets: energy, scale: 0, alpha: 0, duration: 220, onComplete: function () { energy.setVisible(false); } });
          CA.Audio.play('button'); self.burst(ep.x, ep.y, 0x00e5ff, 10);
        } else if (ev.kind === 'button') {
          if (self.buttonSprite) self.buttonSprite.setTexture('button-on');
          CA.Audio.play('button'); self.floatText('PINTU TERBUKA', ep.x, ep.y - this.tile, '#69db7c');
        } else if (ev.kind === 'door-open' && self.doorSprite) {
          self.doorSprite.setTexture('door-open'); self.burst(self.doorSprite.x, self.doorSprite.y, 0x69db7c, 6);
          CA.Audio.play('door');
        } else if (ev.kind === 'fail') {
          self.cameras.main.shake(260, 0.008);
          if (self.robot) self.robot.setTint(0xff4444);
          self.floatText('GAGAL!', ep.x, ep.y - this.tile, '#ff6b6b');
          CA.Audio.play('fail');
        } else if (ev.kind === 'jump-over') {
          CA.Audio.play('jump');
        }
      }.bind({ tile: this.tile }));

      var promise = Promise.resolve();
      if ((cmd.type === 'move' || cmd.type === 'jump') && result && !result.blocked) {
        promise = this.animateRobot(p.x, p.y, cmd.type === 'jump');
      } else if (cmd.type === 'turn') {
        CA.Audio.play('turn');
        promise = new Promise(function (r) { setTimeout(r, Math.min(160, self.moveDuration / 2)); });
      } else if (cmd.type === 'move' && result && result.blocked) {
        CA.Audio.play('error');
        promise = new Promise(function (r) { setTimeout(r, 160); });
      } else {
        promise = new Promise(function (r) { setTimeout(r, Math.min(200, self.moveDuration / 2)); });
      }

      return promise.then(function () {
        self.syncState();
        if (status === 'won') { CA.Audio.play('win'); self.burst(p.x, p.y, 0x69db7c, 14); }
      });
    }

    setSpeed(ms) {
      this.moveDuration = Math.max(60, Math.min(700, Math.round(ms * 0.45)));
    }
  }

  CA.GameScene = GameScene;
  CA.THEMES = THEMES;
  CA.createGame = function (parentId) {
    return new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentId,
      width: 960,
      height: 540,
      backgroundColor: '#101528',
      pixelArt: true,
      antialias: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
      scene: [GameScene],
      banner: false
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
