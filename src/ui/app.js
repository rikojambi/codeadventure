/* Code Adventure - pengontrol aplikasi utama */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var Storage = CA.Storage;
  var util = CA.util;
  var byId = function (id) { return document.getElementById(id); };

  var App = {
    profile: null,
    game: null,
    scene: null,
    workspace: null,
    level: null,
    world: null,
    interp: null,
    screen: 'home',
    hintIndex: 0,
    attempts: 0,
    blockedCount: 0,
    blockUsage: {},
    replaySteps: [],
    installPrompt: null,
    settingsUnlocked: false,
    saveTimer: null,

    async init() {
      await Storage.init();
      CA.installBlockDefinitions();
      CA.Audio.setEnabled(Storage.getSetting('sound', true));

      this.game = CA.createGame('game-canvas');
      var self = this;
      this.game.events.once('ready', function () {
        self.scene = self.game.scene.getScene('GameScene');
        self.scene.setSpeed(Storage.getSetting('speed', 600));
      });

      this.initBlockly();
      CA.Teacher.bind(this);
      this.bindEvents();

      var profile = Storage.getProfile();
      if (!profile) {
        var existing = Storage.listProfiles();
        if (existing.length) Storage.setActiveProfile(existing[0].id);
        else {
          await new Promise(function (resolve) {
            self.showModal({
              icon: '🤖',
              title: 'Selamat datang di CODE ADVENTURE!',
              body: '<p>Masukkan nama siswa untuk memulai petualangan. Progres akan tersimpan otomatis di perangkat ini.</p>' +
                '<input id="first-profile-name" placeholder="Nama siswa" value="Petualang">',
              buttons: [{ label: 'Mulai Petualangan', className: 'primary', action: function () {
                var name = byId('first-profile-name').value.trim() || 'Petualang';
                Storage.createProfile(name, '🤖');
                resolve();
              } }]
            });
          });
        }
      }
      this.profile = Storage.getProfile();
      this.refreshAll();
      this.showScreen('home');

      if ('serviceWorker' in navigator && global.location.protocol.indexOf('http') === 0) {
        navigator.serviceWorker.register('sw.js').catch(function (err) {
          console.warn('Service worker tidak terdaftar:', err);
        });
      }

      global.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        self.installPrompt = e;
        var btn = document.createElement('button');
        btn.className = 'btn ghost';
        btn.textContent = '📲 Instal Aplikasi';
        btn.onclick = function () { self.installApp(); };
        document.querySelector('.hero-actions').appendChild(btn);
      });
    },

    installApp() {
      if (!this.installPrompt) return this.toast('Instalasi tersedia lewat menu browser (Add to Home Screen).');
      this.installPrompt.prompt();
      this.installPrompt.userChoice.then(function () { this.installPrompt = null; }.bind(this));
    },

    /* ---------------- Blockly ---------------- */
    initBlockly() {
      var self = this;
      this.workspace = Blockly.inject('blocklyDiv', {
        toolbox: CA.createToolbox({}),
        renderer: 'zelos',
        media: 'vendor/blockly/media/',
        trashcan: true,
        scrollbars: true,
        sounds: false,
        grid: { spacing: 20, length: 3, colour: '#cbd5e1', snap: true },
        zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.8, minScale: 0.35, scaleSpeed: 1.15 }
      });

      this.workspace.registerButtonCallback('ca_create_variable', function () {
        self.showModal({
          icon: '📦', title: 'Buat variabel baru',
          body: '<p>Variabel menyimpan nilai angka, misalnya <b>energi</b>.</p><input id="new-var-name" placeholder="Nama variabel" value="skor">',
          buttons: [
            { label: 'Buat', className: 'primary', action: function () {
              var name = byId('new-var-name').value.trim();
              if (!name) return;
              self.workspace.getVariableMap().createVariable(name);
              self.toast('Variabel "' + name + '" dibuat.');
            } },
            { label: 'Batal', className: 'ghost' }
          ]
        });
      });

      this.workspace.addChangeListener(function (event) {
        if (event.isUiEvent) return;
        self.updateBlockCounter();
        self.updateUndoRedo();
        clearTimeout(self.saveTimer);
        self.saveTimer = setTimeout(function () { self.saveWorkspace(); }, 500);
      });
      this.updateBlockCounter();
      this.updateUndoRedo();
    },

    saveWorkspace() {
      if (!this.profile || !this.workspace || !this.level) return;
      var xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace));
      Storage.saveWorkspace(this.profile.id, String(this.level.id), xml);
    },

    starterXml() {
      return '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '<block type="ca_when_start" x="40" y="40"><statement name="DO"></statement></block></xml>';
    },

    loadXml(xml) {
      Blockly.Events.disable();
      this.workspace.clear();
      try {
        var dom = Blockly.utils.xml.textToDom(xml || this.starterXml());
        Blockly.Xml.domToWorkspace(dom, this.workspace);
      } catch (e) {
        console.warn('XML workspace tidak valid, memakai blok awal.', e);
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(this.starterXml()), this.workspace);
      }
      Blockly.Events.enable();
      this.workspace.clearUndo();
      this.updateBlockCounter();
    },

    updateBlockCounter() {
      var n = this.workspace ? this.workspace.getAllBlocks(false).length : 0;
      byId('block-counter').textContent = n + ' blok';
      var limit = this.currentBlockLimit();
      if (limit) byId('block-counter').classList.toggle('over-limit', n > limit);
    },

    currentBlockLimit() {
      var mode = byId('challenge-mode').checked;
      if (mode && this.level) return this.level.maxBlocks || (this.level.parBlocks ? this.level.parBlocks + 2 : 12);
      return this.level ? this.level.maxBlocks || 0 : 0;
    },

    updateUndoRedo() {
      if (!this.workspace) return;
      byId('btn-undo').disabled = !this.workspace.getUndoStack().length;
      byId('btn-redo').disabled = !this.workspace.getRedoStack().length;
    },

    /* ---------------- Navigasi & render ---------------- */
    showScreen(name) {
      if (name === 'sandbox') { this.setupLevel('sandbox'); name = 'game'; }
      else if (name === 'daily') { this.setupLevel(CA.createDailyLevel()); name = 'game'; }
      else if (name === 'teacher') { CA.Teacher.render(); }
      else if (name === 'settings') { this.renderSettings(); }

      document.querySelectorAll('.screen').forEach(function (el) { el.classList.remove('active'); });
      var target = byId('screen-' + name);
      if (target) target.classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.screen === name);
      });
      this.screen = name;
      Blockly.svgResize(this.workspace);
      global.scrollTo({ top: 0, behavior: 'smooth' });
    },

    refreshAll() {
      this.profile = Storage.getProfile();
      if (!this.profile) return;
      byId('profile-name').textContent = this.profile.name;
      byId('profile-avatar').textContent = this.profile.avatar;
      byId('hero-name').textContent = this.profile.name;
      byId('stat-xp').textContent = this.profile.xp;
      byId('stat-rank').textContent = CA.levelRank(this.profile);
      var done = CA.countCompleted(this.profile);
      byId('stat-done').textContent = done + '/10';
      byId('stat-progress').textContent = Math.round((done / 10) * 100) + '%';
      this.renderDashboard();
      this.renderLevels();
      this.renderSettings();
      CA.Teacher.render();
    },

    isUnlocked(id) {
      if (id === 'sandbox' || String(id).indexOf('daily') === 0 || String(id).indexOf('custom') === 0) return true;
      return Number(id) === 1 || !!(this.profile && this.profile.levels[Number(id) - 1] && this.profile.levels[Number(id) - 1].won);
    },

    renderDashboard() {
      var self = this;
      var p = this.profile;
      byId('dashboard-levels').innerHTML = CA.LEVELS.map(function (lv) {
        var rec = p.levels[lv.id];
        var unlocked = self.isUnlocked(lv.id);
        return '<button class="mini-level ' + (unlocked ? '' : 'locked') + ' ' + (rec && rec.won ? 'done' : '') + '" data-level="' + lv.id + '" ' + (unlocked ? '' : 'disabled') + '>' +
          '<div>' + lv.icon + '</div><div>' + lv.id + '. ' + util.escapeHtml(lv.title) + '</div>' +
          '<div class="stars">' + (rec && rec.won ? '★'.repeat(rec.stars || 1) : unlocked ? '· · ·' : '🔒') + '</div></button>';
      }).join('');

      var comp = CA.competencySummary(p);
      byId('dashboard-competency').innerHTML = CA.CURRICULUM.map(function (topic) {
        var mastered = comp.mastered.indexOf(topic.name) !== -1;
        var needs = comp.needsWork.indexOf(topic.name) !== -1;
        var pct = mastered ? 100 : needs ? 45 : 12;
        return '<div class="skill-row"><span style="width:145px">' + topic.icon + ' ' + util.escapeHtml(topic.name) + '</span>' +
          '<div class="bar"><div style="width:' + pct + '%"></div></div><span style="width:55px;text-align:right">' + (mastered ? 'Mahir' : needs ? 'Latih' : '-') + '</span></div>';
      }).join('');

      byId('dashboard-achievements').innerHTML = CA.ACHIEVEMENTS.map(function (a) {
        var earned = (p.achievements || []).indexOf(a.id) !== -1;
        return '<span class="badge ' + (earned ? 'earned' : 'locked') + '" title="' + util.escapeHtml(a.desc) + '">' + a.icon + ' ' + util.escapeHtml(a.name) + '</span>';
      }).join('');

      byId('dashboard-history').innerHTML = p.history.length ? p.history.slice(-7).reverse().map(function (h) {
        return '<div class="history-item"><span>' + util.escapeHtml(h.title || ('Level ' + h.level)) + '</span><span>' +
          (h.won ? '★'.repeat(h.stars || 1) : 'belum') + ' · ' + util.formatDate(h.date) + '</span></div>';
      }).join('') : '<p class="muted">Belum ada aktivitas. Mulai dari Level 1!</p>';

      var cls = Storage.listClasses().filter(function (c) { return (c.students || []).indexOf(p.id) !== -1; })[0];
      if (cls) {
        var members = cls.students.map(function (id) { return Storage.state.profiles[id]; }).filter(Boolean)
          .sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); });
        byId('dashboard-leaderboard').innerHTML = members.map(function (m, i) {
          return '<div class="leader-item"><span>' + (i + 1) + '. ' + (m.id === p.id ? '⭐ ' : '') + util.escapeHtml(m.avatar + ' ' + m.name) + '</span><b>' + m.xp + ' XP</b></div>';
        }).join('');
      } else {
        byId('dashboard-leaderboard').innerHTML = '<p class="muted">Masukkan kode kelas untuk melihat papan peringkat lokal.</p>';
      }
    },

    renderLevels() {
      var self = this;
      byId('level-grid').innerHTML = CA.LEVELS.map(function (lv) {
        var rec = self.profile.levels[lv.id];
        var unlocked = self.isUnlocked(lv.id);
        return '<button class="level-card" data-level="' + lv.id + '" ' + (unlocked ? '' : 'disabled') + '>' +
          '<span class="num">' + String(lv.id).padStart(2, '0') + '</span>' +
          '<span class="icon">' + lv.icon + '</span><h3>' + util.escapeHtml(lv.title) + '</h3>' +
          '<p>' + util.escapeHtml(lv.objectives.join(' · ')) + '</p>' +
          '<span class="stars">' + (rec && rec.won ? '★'.repeat(rec.stars || 1) : unlocked ? 'Belum selesai' : 'Terkunci') + '</span>' +
          (unlocked ? '' : '<span class="lock">🔒</span>') + '</button>';
      }).join('');
      byId('curriculum-list').innerHTML = CA.CURRICULUM.map(function (c) {
        return '<div class="curriculum-item"><b>' + c.no + '. ' + c.icon + ' ' + util.escapeHtml(c.name) + '</b><div class="muted">' + util.escapeHtml(c.desc) + '</div></div>';
      }).join('');
    },

    renderSettings() {
      var p = this.profile;
      byId('setting-sound').checked = Storage.getSetting('sound', true);
      var speed = Storage.getSetting('speed', 600);
      byId('setting-speed').value = speed;
      byId('speed-label').textContent = speed + ' ms';
      var unlocked = CA.Teacher.unlocked || this.settingsUnlocked;
      byId('settings-gate').classList.toggle('hidden', !!unlocked);
      byId('settings-teacher-content').classList.toggle('hidden', !unlocked);
      byId('setting-pin').value = unlocked ? Storage.getSetting('teacherPin', '1234') : '';
      byId('profile-list').innerHTML = Storage.listProfiles().map(function (item) {
        return '<div class="profile-item ' + (item.id === p.id ? 'active' : '') + '"><span class="avatar">' + item.avatar + '</span>' +
          '<span class="flex">' + util.escapeHtml(item.name) + ' · ' + item.xp + ' XP</span>' +
          (item.id === p.id ? '<span class="chip">Aktif</span>' : '<button class="btn small ghost" data-profile="' + item.id + '">Pakai</button>') +
          '<button class="btn small danger" data-delete-profile="' + item.id + '">✕</button></div>';
      }).join('');
    },

    /* ---------------- Level & misi ---------------- */
    setupLevel(levelOrId) {
      var level = typeof levelOrId === 'object' ? levelOrId : CA.getLevel(levelOrId);
      if (!level) return this.toast('Level tidak ditemukan.', 'error');
      if (typeof levelOrId !== 'object' && !this.isUnlocked(level.id)) return this.toast('Selesaikan level sebelumnya untuk membuka level ini.', 'error');

      this.level = level;
      this.world = new CA.World(level);
      this.hintIndex = 0;
      this.attempts = (this.profile.attempts && this.profile.attempts[level.id]) || 0;
      this.blockedCount = 0;
      this.blockUsage = {};
      this.replaySteps = [];
      this.scene.loadLevel(level, this.world);
      this.scene.setSpeed(Storage.getSetting('speed', 600));
      this.workspace.updateToolbox(CA.createToolbox({ levelId: level.id }));

      var saved = Storage.loadWorkspace(this.profile.id, String(level.id));
      var startXml = level.buggy && !saved ? CA.buggyProgramXml() : (saved || this.starterXml());
      this.loadXml(startXml);

      byId('mission-icon').textContent = level.icon || '🚀';
      byId('mission-title').textContent = (typeof level.id === 'number' ? 'Level ' + level.id + ' · ' : '') + level.title;
      byId('mission-difficulty').textContent = level.sandbox ? 'Sandbox' : level.daily ? 'Harian' : 'Level ' + level.id;
      byId('challenge-mode').checked = false;
      byId('hint-status').textContent = 'Petunjuk membantu Anda berpikir, bukan memberi jawaban.';
      var req = [];
      if (level.require.coins) req.push('🪙 ' + level.require.coins + ' koin');
      if (level.require.energy) req.push('⚡ ' + level.require.energy + ' energi');
      if (level.require.button) req.push('🔘 tekan tombol');
      req.push('🎯 capai tujuan');
      byId('mission-content').innerHTML =
        '<div class="story">' + util.escapeHtml(level.story) + '</div>' +
        '<div class="info-box"><b>TUJUAN PEMBELAJARAN</b><div>' + level.objectives.map(util.escapeHtml).join('<br>') + '</div></div>' +
        '<div class="info-box"><b>MATERI SINGKAT</b><div>' + util.escapeHtml(level.material) + '</div></div>' +
        '<div class="info-box"><b>CONTOH BLOK</b><div>' + util.escapeHtml(level.example) + '</div></div>' +
        '<div class="info-box"><b>TANTANGAN</b><div>' + util.escapeHtml(level.challenge) + '<br><span style="color:#fbbf24">' + req.join(' · ') + '</span>' +
        (this.currentBlockLimit() ? '<br><span style="color:#22d3ee">Batas: ' + this.currentBlockLimit() + ' blok</span>' : '') + '</div></div>';

      this.clearLog();
      this.log('Level dimuat: ' + level.title, 'success');
      this.setStatus('SIAP', 'Arah: ' + this.world.directionName());
      byId('relation-panel').textContent = '🔗 Hubungan blok → gerakan akan muncul saat program berjalan.';
      byId('progress-fill').style.width = '0%';
      this.updateBlockCounter();
    },

    /* ---------------- Eksekusi ---------------- */
    makeInterpreter() {
      var self = this;
      return new CA.Interpreter({
        world: this.world,
        workspace: this.workspace,
        speed: Storage.getSetting('speed', 600),
        maxSteps: 4000,
        onCommand: function (cmd, result, status) { return self.onCommand(cmd, result, status); },
        onHighlight: function () {},
        onLog: function (msg, type) { self.log(msg, type); },
        onFinish: function (payload) { self.onFinish(payload); }
      });
    },

    async runProgram(mode) {
      if (!this.level || !this.scene) return;
      var n = this.workspace.getAllBlocks(false).length;
      var limit = this.currentBlockLimit();
      if (limit && n > limit) {
        this.toast('Terlalu banyak blok (' + n + '/' + limit + '). Mode tantangan membatasi blok.', 'error');
        CA.Audio.play('error');
        return;
      }
      if (!this.workspace.getTopBlocks(true).length) {
        this.toast('Workspace masih kosong. Tambahkan blok terlebih dahulu.', 'error');
        return;
      }

      if (this.interp && this.interp.running) this.interp.stop();
      this.attempts++;
      this.profile.attempts = this.profile.attempts || {};
      this.profile.attempts[this.level.id] = this.attempts;
      Storage.saveProfile(this.profile);
      this.blockedCount = 0;
      this.blockUsage = {};
      this.workspace.getAllBlocks(false).forEach(function (b) {
        this.blockUsage[b.type] = (this.blockUsage[b.type] || 0) + 1;
      }, this);

      this.world.reset();
      this.scene.resetView();
      this.replaySteps = [];
      this.setStatus(mode === 'step' ? 'STEP' : 'BERJALAN', 'Arah: ' + this.world.directionName(), mode === 'step' ? '' : 'running');
      CA.Audio.unlock();

      this.interp = this.makeInterpreter();
      this.clearLog();
      this.log('▶ Program dijalankan (percobaan ke-' + this.attempts + ').', 'info');
      if (mode === 'step') await this.interp.step();
      else await this.interp.run();
    },

    async onCommand(cmd, result, status) {
      var explanation = CA.explainCommand(cmd);
      this.log(explanation, 'info');
      byId('relation-panel').textContent = '🔗 ' + explanation;
      this.replaySteps.push({
        type: cmd.type, delta: cmd.delta, label: cmd.label,
        name: cmd.name, value: cmd.value, text: cmd.text
      });
      if (result && result.blocked) {
        this.blockedCount++;
        this.profile.errorStats = this.profile.errorStats || {};
        var code = result.reason && result.reason.indexOf('Pintu') !== -1 ? 'pintu_terkunci' : 'terhalang_dinding';
        this.profile.errorStats[code] = (this.profile.errorStats[code] || 0) + 1;
      }
      await this.scene.play(cmd, result, status);
      var target = this.level.stepTarget || Math.max(1, this.world.state.steps);
      var pct = util.clamp(Math.round((this.world.state.steps / target) * 100), 0, 100);
      byId('progress-fill').style.width = pct + '%';
      byId('robot-state').textContent = 'Arah: ' + this.world.directionName();
    },

    onFinish(payload) {
      var s = this.world.state;
      if (payload.reason === 'won' || s.status === 'won') return this.handleSuccess(payload);
      if (payload.reason === 'error') {
        this.setStatus('ERROR', payload.errors[0] || 'Kesalahan program', 'error');
        return this.handleFailure('Kesalahan program: ' + payload.errors[0]);
      }
      if (s.status === 'lost') {
        this.setStatus('GAGAL', s.reason, 'error');
        return this.handleFailure(s.reason || 'Kiko tidak berhasil mencapai tujuan.');
      }
      this.setStatus('SELESAI', 'Program habis, misi belum tercapai', 'error');
      this.handleFailure('Program selesai, tetapi Kiko belum mencapai tujuan. Periksa urutan dan jumlah langkah.');
    },

    handleSuccess(payload) {
      var p = this.profile;
      var stats = Object.assign({}, payload.stats, { attempts: this.attempts });
      var score = CA.scoreRun({ level: this.level, stats: stats, won: true });
      var key = String(this.level.id);
      var prev = p.levels[key] || p.levels[Number(key)] || null;
      var xpGain = prev && prev.won ? Math.max(0, score.xp - (prev.xp || 0)) : score.xp;
      p.xp = (p.xp || 0) + xpGain;
      p.levels[key] = {
        won: true,
        stars: Math.max(prev && prev.won ? prev.stars : 0, score.stars),
        total: Math.max(prev && prev.won ? prev.total : 0, score.total),
        xp: Math.max(prev && prev.won ? prev.xp : 0, score.xp),
        blocks: stats.blocks,
        attempts: this.attempts,
        errors: stats.errors.length + this.blockedCount,
        coins: this.world.collectedCoins(),
        energy: this.world.collectedEnergy(),
        concepts: (this.level.concepts || []).slice(),
        replay: this.replaySteps.slice(0, 200),
        date: new Date().toISOString()
      };
      p.history.push({ level: key, title: this.level.title, won: true, stars: score.stars, date: new Date().toISOString() });
      if (p.history.length > 80) p.history = p.history.slice(-80);
      p.errorStats = p.errorStats || {};
      payload.errors.forEach(function (err) {
        var k = String(err).slice(0, 32);
        p.errorStats[k] = (p.errorStats[k] || 0) + 1;
      });
      p.blockStats = p.blockStats || {};
      Object.keys(this.blockUsage).forEach(function (b) { p.blockStats[b] = (p.blockStats[b] || 0) + this.blockUsage[b]; }, this);
      var gained = CA.refreshAchievements(p);
      Storage.saveProfile(p);
      this.setStatus('BERHASIL', score.stars + ' bintang · +' + xpGain + ' XP', '');
      if (gained.length) CA.Audio.play('achievement');

      var breakdown = Object.keys(score.breakdown).map(function (k) {
        return '<div class="score-item"><b>' + score.breakdown[k] + '</b>' + k + '</div>';
      }).join('');
      var next = typeof this.level.id === 'number' && this.level.id < 10 ? this.level.id + 1 : null;
      var buttons = [{ label: 'Ulangi level', className: 'ghost', action: function () { this.runProgram('run'); }.bind(this) }];
      if (next) buttons.push({ label: 'Level berikutnya ▶', className: 'primary', action: function () { this.setupLevel(next); }.bind(this) });
      buttons.push({ label: 'Tutup', className: 'ghost' });

      this.showModal({
        icon: '🎉', title: 'Misi Berhasil!',
        body: '<div class="stars">' + '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars) + '</div>' +
          '<p style="text-align:center">' + util.escapeHtml(score.message) + '</p>' +
          '<div class="score-grid">' +
          '<div class="score-item"><b>+' + xpGain + '</b>XP diperoleh</div>' +
          '<div class="score-item"><b>' + stats.blocks + '</b>blok digunakan</div>' + breakdown + '</div>' +
          (gained.length ? '<p style="text-align:center;color:#fbbf24">🏅 Achievement baru: ' + gained.map(function (a) { return util.escapeHtml(a.name); }).join(', ') + '</p>' : ''),
        buttons: buttons
      });
      this.refreshAll();
    },

    handleFailure(message) {
      CA.Audio.play('error');
      var hint = this.level.hints[Math.min(this.hintIndex, this.level.hints.length - 1)];
      this.showModal({
        icon: '🐞', title: 'Belum berhasil',
        body: '<p>' + util.escapeHtml(message) + '</p>' +
          '<div class="info-box"><b>PETUNJUK ' + (this.hintIndex + 1) + '</b><div>' + util.escapeHtml(hint) + '</div></div>' +
          '<p class="muted" style="margin-top:10px">Jangan menyerah! Coba STEP untuk melihat instruksi satu per satu.</p>',
        buttons: [
          { label: '💡 Petunjuk berikutnya', className: 'warn', action: function () { this.revealHint(); }.bind(this) },
          { label: 'Coba lagi', className: 'primary', action: function () { this.world.reset(); this.scene.resetView(); this.setStatus('SIAP', ''); }.bind(this) },
          { label: 'Tutup', className: 'ghost' }
        ]
      });
    },

    revealHint() {
      if (!this.level) return;
      var hints = this.level.hints || [];
      if (this.hintIndex >= hints.length) {
        this.toast('Semua petunjuk sudah ditampilkan. Coba pikirkan strategi lain!');
        return;
      }
      var text = hints[this.hintIndex];
      this.hintIndex++;
      byId('hint-status').innerHTML = '<b>Petunjuk ' + this.hintIndex + ':</b> ' + util.escapeHtml(text);
      this.log('💡 ' + text, 'warn');
      this.toast('Petunjuk ' + this.hintIndex + ' ditampilkan.');
    },

    /* ---------------- Fitur tambahan ---------------- */
    previewModal() {
      if (!this.workspace) return;
      var code = CA.pseudocode(this.workspace);
      var a = CA.analyzeWorkspace(this.workspace);
      this.showModal({
        icon: '{ }', title: 'Code Preview · Pseudocode',
        body: '<p class="muted">Pseudocode hanya untuk membaca program Anda. Program tetap dijalankan oleh interpreter blok (tanpa eval).</p>' +
          '<pre style="background:#0b1229;border:1px solid var(--line);border-radius:10px;padding:12px;max-height:320px;overflow:auto;font-size:12px;color:#cde4ff">' + util.escapeHtml(code) + '</pre>' +
          '<p class="muted">Total ' + a.total + ' blok · ' + a.loops + ' kontrol · ' + a.variable + ' variabel · ' + a.function + ' fungsi · ' + a.event + ' event' + (a.unknown ? ' · ' + a.unknown + ' tidak dikenal' : '') + '</p>',
        buttons: [{ label: 'Tutup', className: 'primary' }]
      });
    },

    replayModal() {
      if (!this.replaySteps.length) return this.toast('Belum ada proses penyelesaian untuk diputar ulang.', 'error');
      this.showModal({
        icon: '▶|', title: 'Solution Replay',
        body: '<p>Putar ulang ' + this.replaySteps.length + ' instruksi dari percobaan terakhir dengan animasi dan blok yang berjalan.</p>',
        buttons: [
          { label: '▶ Putar', className: 'primary', action: function () { this.playReplay(); }.bind(this) },
          { label: 'Tutup', className: 'ghost' }
        ]
      });
    },

    async playReplay() {
      this.world.reset();
      this.scene.resetView();
      this.setStatus('REPLAY', 'Memutar ulang solusi', 'running');
      for (var i = 0; i < this.replaySteps.length; i++) {
        var cmd = this.replaySteps[i];
        this.log('Replay ' + (i + 1) + '/' + this.replaySteps.length + ': ' + cmd.label, 'info');
        this.applyReplayToWorld(cmd);
        await this.scene.play(cmd, null, i === this.replaySteps.length - 1 ? this.world.state.status : 'running');
        await util.sleep(120);
      }
      this.setStatus('SELESAI', 'Replay selesai', '');
    },

    applyReplayToWorld(cmd) {
      if (!this.world || this.world.state.status !== 'running') return;
      if (cmd.type === 'move') this.world.move(cmd.delta);
      else if (cmd.type === 'turn') this.world.turn(cmd.delta);
      else if (cmd.type === 'jump') this.world.jump();
      else if (cmd.type === 'wait') this.world.wait();
      else if (cmd.type === 'varSet' || cmd.type === 'varChange') {
        this.world.state.variables[cmd.name] = cmd.type === 'varSet' ? cmd.value : (this.world.state.variables[cmd.name] || 0) + cmd.value;
      }
      this.scene.syncState();
    },

    openCustomChallenge(challenge) {
      var base = CA.getLevel(challenge.baseLevel) || CA.LEVELS[0];
      var custom = Object.assign({}, base, {
        id: 'custom-' + challenge.id,
        title: challenge.name,
        maxBlocks: challenge.maxBlocks,
        challenge: 'Tantangan guru: selesaikan dengan maksimal ' + challenge.maxBlocks + ' blok.'
      });
      this.setupLevel(custom);
      this.showScreen('game');
      this.toast('Tantangan guru dimuat: ' + challenge.name, 'success');
    },

    /* ---------------- Util UI ---------------- */
    setStatus(text, sub, cls) {
      var badge = byId('status-badge');
      badge.textContent = text;
      badge.className = 'status-badge ' + (cls || '');
      if (sub) byId('robot-state').textContent = sub;
    },

    log(message, type) {
      var list = byId('message-list');
      if (!message) return;
      var div = document.createElement('div');
      div.className = 'msg ' + (type || 'info');
      div.textContent = '› ' + message;
      list.insertBefore(div, list.firstChild);
      while (list.children.length > 70) list.removeChild(list.lastChild);
    },

    clearLog() { byId('message-list').innerHTML = ''; },

    toast(message, type) {
      var t = document.createElement('div');
      t.className = 'toast ' + (type || '');
      t.textContent = message;
      byId('toast-root').appendChild(t);
      setTimeout(function () { t.remove(); }, 3200);
    },

    showModal(options) {
      var root = byId('modal-root');
      root.innerHTML = '';
      var back = document.createElement('div');
      back.className = 'modal-backdrop';
      var modal = document.createElement('div');
      modal.className = 'modal';
      var buttons = options.buttons || [{ label: 'Tutup', className: 'primary' }];
      modal.innerHTML =
        (options.icon ? '<div class="modal-icon">' + options.icon + '</div>' : '') +
        '<h2>' + util.escapeHtml(options.title || '') + '</h2>' +
        (options.body || '') +
        '<div class="modal-actions"></div>';
      var actions = modal.querySelector('.modal-actions');
      buttons.forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'btn ' + (b.className || 'ghost');
        btn.textContent = b.label;
        btn.onclick = function () {
          var keep = b.action && b.action();
          if (!keep) root.innerHTML = '';
        };
        actions.appendChild(btn);
      });
      back.appendChild(modal);
      back.addEventListener('click', function (e) { if (e.target === back) root.innerHTML = ''; });
      root.appendChild(back);
      var firstInput = modal.querySelector('input');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 30);
    },

    /* ---------------- Event binding ---------------- */
    bindEvents() {
      var self = this;
      document.querySelectorAll('[data-screen]').forEach(function (btn) {
        btn.addEventListener('click', function () { self.showScreen(btn.dataset.screen); });
      });
      byId('btn-continue').addEventListener('click', function () {
        var next = 1;
        for (var i = 1; i <= 10; i++) {
          if (!(self.profile.levels[i] && self.profile.levels[i].won)) { next = i; break; }
          next = Math.min(10, i + 1);
        }
        self.setupLevel(next);
        self.showScreen('game');
      });

      byId('dashboard-levels').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-level]');
        if (btn) { self.setupLevel(Number(btn.dataset.level)); self.showScreen('game'); }
      });
      byId('level-grid').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-level]');
        if (btn) { self.setupLevel(Number(btn.dataset.level)); self.showScreen('game'); }
      });

      byId('btn-run').addEventListener('click', function () { self.runProgram('run'); });
      byId('btn-run-mobile').addEventListener('click', function () { self.runProgram('run'); });
      byId('btn-step').addEventListener('click', function () { self.runProgram('step'); });
      byId('btn-stop').addEventListener('click', function () {
        if (self.interp) self.interp.stop();
        self.setStatus('DIHENTIKAN', 'Program dihentikan', 'error');
        self.log('■ Program dihentikan oleh siswa.', 'warn');
      });
      byId('btn-reset').addEventListener('click', function () {
        if (self.interp) self.interp.reset();
        else { self.world.reset(); }
        self.scene.resetView();
        self.setStatus('SIAP', 'Arah: ' + self.world.directionName());
        byId('progress-fill').style.width = '0%';
        byId('relation-panel').textContent = '🔗 Hubungan blok → gerakan akan muncul saat program berjalan.';
        self.log('↺ Dunia dan program di-reset.', 'info');
      });
      byId('btn-undo').addEventListener('click', function () { self.workspace.undo(); });
      byId('btn-redo').addEventListener('click', function () { self.workspace.redo(); });
      byId('btn-preview').addEventListener('click', function () { self.previewModal(); });
      byId('btn-replay').addEventListener('click', function () { self.replayModal(); });
      byId('btn-clear-log').addEventListener('click', function () { self.clearLog(); });
      byId('btn-hint').addEventListener('click', function () { self.revealHint(); });
      byId('challenge-mode').addEventListener('change', function () {
        self.updateBlockCounter();
        self.toast(byId('challenge-mode').checked ? 'Mode Tantangan aktif: batas blok diterapkan.' : 'Mode Tantangan nonaktif.');
      });
      byId('toolbox-toggle').addEventListener('click', function () {
        byId('blocklyDiv').classList.toggle('toolbox-collapsed');
        document.querySelector('.editor-card').classList.toggle('compact');
        Blockly.svgResize(self.workspace);
      });

      byId('sound-toggle').addEventListener('click', function () {
        var v = !CA.Audio.isEnabled();
        CA.Audio.setEnabled(v);
        Storage.setSetting('sound', v);
        byId('sound-toggle').textContent = v ? '🔊' : '🔇';
        if (v) CA.Audio.play('click');
      });
      byId('profile-chip').addEventListener('click', function () { self.showScreen('settings'); });

      byId('btn-save-settings').addEventListener('click', function () {
        Storage.setSetting('sound', byId('setting-sound').checked);
        Storage.setSetting('speed', Number(byId('setting-speed').value));
        CA.Audio.setEnabled(byId('setting-sound').checked);
        self.scene.setSpeed(Number(byId('setting-speed').value));
        self.renderSettings();
        self.toast('Preferensi tersimpan.', 'success');
      });

      byId('btn-settings-unlock').addEventListener('click', function () {
        var pin = byId('settings-pin').value.trim();
        if (pin !== String(Storage.getSetting('teacherPin', '1234'))) {
          self.toast('PIN salah. Setelan guru tetap terkunci.', 'error');
          CA.Audio.play('error');
          return;
        }
        self.settingsUnlocked = true;
        CA.Teacher.unlocked = true;
        self.renderSettings();
        CA.Teacher.render();
        self.toast('Setelan guru terbuka.', 'success');
      });

      byId('btn-save-teacher-settings').addEventListener('click', function () {
        Storage.setSetting('teacherPin', byId('setting-pin').value.trim() || '1234');
        self.refreshAll();
        self.toast('PIN guru tersimpan.', 'success');
      });
      byId('setting-speed').addEventListener('input', function () { byId('speed-label').textContent = this.value + ' ms'; });

      byId('profile-list').addEventListener('click', function (e) {
        var use = e.target.closest('[data-profile]');
        var del = e.target.closest('[data-delete-profile]');
        if (use) {
          Storage.setActiveProfile(use.dataset.profile);
          self.refreshAll();
          self.toast('Profil siswa diganti.', 'success');
        }
        if (del) {
          if (global.confirm('Hapus profil ini beserta progresnya?')) {
            Storage.deleteProfile(del.dataset.deleteProfile);
            self.refreshAll();
          }
        }
      });
      var chosenAvatar = '🤖';
      byId('avatar-picker').innerHTML = ['🤖', '🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐧'].map(function (a, i) {
        return '<button data-avatar="' + a + '" class="' + (i === 0 ? 'selected' : '') + '">' + a + '</button>';
      }).join('');
      byId('avatar-picker').addEventListener('click', function (e) {
        var b = e.target.closest('[data-avatar]');
        if (!b) return;
        chosenAvatar = b.dataset.avatar;
        this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('selected', x === b); });
      });
      byId('btn-add-profile').addEventListener('click', function () {
        var name = byId('new-profile-name').value.trim();
        if (!name) return self.toast('Nama siswa wajib diisi.', 'error');
        Storage.createProfile(name, chosenAvatar);
        byId('new-profile-name').value = '';
        self.refreshAll();
        self.toast('Profil siswa dibuat.', 'success');
      });
      byId('btn-join-class').addEventListener('click', function () {
        var code = byId('join-class-code').value.trim().toUpperCase();
        var cls = Storage.getClass(code);
        if (!cls) return self.toast('Kode kelas tidak ditemukan.', 'error');
        if (cls.students.indexOf(self.profile.id) === -1) cls.students.push(self.profile.id);
        Storage.saveClass(cls);
        self.refreshAll();
        self.toast('Bergabung dengan kelas ' + cls.name + '.', 'success');
      });
      byId('btn-export-profile').addEventListener('click', function () { CA.Export.downloadJson('progres-' + self.profile.name + '.json', Storage.exportAll()); });
      byId('btn-import-profile').addEventListener('click', function () { byId('import-file').click(); });
      byId('btn-reset-data').addEventListener('click', function () {
        self.showModal({
          icon: '⚠️', title: 'Hapus semua data?',
          body: '<p>Seluruh profil, progres, kelas, dan workspace akan dihapus permanen dari perangkat ini.</p>',
          buttons: [
            { label: 'Ya, hapus', className: 'danger', action: function () { Storage.resetAll(); location.reload(); } },
            { label: 'Batal', className: 'ghost' }
          ]
        });
      });

      global.addEventListener('keydown', function (e) {
        if (self.screen !== 'game' || !self.interp || !self.interp.running) return;
        var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'space' };
        if (map[e.key]) {
          e.preventDefault();
          self.interp.fireKey(map[e.key]);
          self.log('⌨ Tombol ' + map[e.key] + ' ditekan → event dijalankan.', 'info');
        }
      });
    }
  };

  CA.App = App;
  global.addEventListener('DOMContentLoaded', function () {
    App.init().catch(function (err) {
      console.error('Gagal memulai CODE ADVENTURE:', err);
      App.toast('Gagal memulai aplikasi: ' + err.message, 'error');
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
