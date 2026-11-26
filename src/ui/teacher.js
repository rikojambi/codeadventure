/* Code Adventure - dashboard guru (kelas, siswa, tantangan, laporan) */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var util = CA.util;
  var Storage = CA.Storage;

  var Teacher = {
    app: null,
    unlocked: false,

    bind: function (app) {
      this.app = app;
      var self = this;
      var byId = function (id) { return document.getElementById(id); };

      byId('btn-teacher-login').addEventListener('click', function () {
        var pin = byId('teacher-pin').value.trim();
        if (pin === String(Storage.getSetting('teacherPin', '1234'))) {
          self.unlocked = true;
          self.app.settingsUnlocked = true;
          self.app.toast('Mode guru terbuka.', 'success');
          self.app.showScreen('teacher');
          self.render();
        } else {
          self.app.toast('PIN salah. Coba lagi.', 'error');
          CA.Audio.play('error');
        }
      });
      byId('btn-create-class').addEventListener('click', function () {
        var name = byId('class-name').value.trim();
        if (!name) return self.app.toast('Nama kelas wajib diisi.', 'error');
        var cls = { code: util.classCode(6), name: name, students: [], challenges: [], createdAt: new Date().toISOString() };
        Storage.saveClass(cls);
        byId('class-name').value = '';
        self.app.toast('Kelas dibuat. Kode: ' + cls.code, 'success');
        self.render();
      });
      byId('btn-create-challenge').addEventListener('click', function () {
        var name = byId('challenge-name').value.trim();
        var base = Number(byId('challenge-base').value || 1);
        var limit = Math.max(1, Number(byId('challenge-limit').value || 6));
        if (!name) return self.app.toast('Nama tantangan wajib diisi.', 'error');
        var classes = Storage.listClasses();
        if (!classes.length) return self.app.toast('Buat kelas terlebih dahulu.', 'error');
        var cls = classes[0];
        cls.challenges = cls.challenges || [];
        cls.challenges.push({ id: util.uid('ch'), name: name, baseLevel: base, maxBlocks: limit, grid: null, createdAt: new Date().toISOString() });
        Storage.saveClass(cls);
        byId('challenge-name').value = '';
        self.app.toast('Tantangan guru tersimpan.', 'success');
        self.render();
      });

      byId('teacher-classes').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var cls = Storage.getClass(btn.dataset.code);
        if (!cls) return;
        if (btn.dataset.act === 'add-student') {
          var name = global.prompt('Nama siswa yang ditambahkan:');
          if (!name || !name.trim()) return;
          var p = Storage.createProfile(name.trim(), '🧑‍🎓', false);
          cls.students.push(p.id);
          Storage.saveClass(cls);
          self.app.toast('Siswa ditambahkan (profil siswa aktif tidak berubah).', 'success');
          self.render();
        } else if (btn.dataset.act === 'add-current') {
          var active = Storage.getProfile();
          if (!active) return self.app.toast('Belum ada profil siswa aktif.', 'error');
          if (cls.students.indexOf(active.id) === -1) cls.students.push(active.id);
          Storage.saveClass(cls);
          self.app.toast(active.name + ' ditambahkan ke kelas.', 'success');
          self.render();
        } else if (btn.dataset.act === 'delete-class') {
          if (global.confirm('Hapus kelas ' + cls.name + '?')) {
            Storage.deleteClass(cls.code);
            self.render();
          }
        } else if (btn.dataset.act === 'copy-code') {
          if (global.navigator && navigator.clipboard) navigator.clipboard.writeText(cls.code).then(function () { self.app.toast('Kode kelas disalin.'); });
          else self.app.toast('Kode kelas: ' + cls.code);
        }
      });

      byId('teacher-challenges').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var cls = Storage.getClass(btn.dataset.code);
        if (!cls) return;
        var challenge = (cls.challenges || []).filter(function (c) { return c.id === btn.dataset.id; })[0];
        if (!challenge) return;
        if (btn.dataset.act === 'play') self.app.openCustomChallenge(challenge);
        if (btn.dataset.act === 'delete-challenge') {
          cls.challenges = cls.challenges.filter(function (c) { return c.id !== challenge.id; });
          Storage.saveClass(cls);
          self.render();
        }
      });

      var exports = [
        ['btn-export-csv', function () { CA.Export.downloadCsv('code-adventure-siswa.csv', CA.Export.studentRows(Storage.listClasses(), Storage.state.profiles)); }],
        ['btn-export-csv-level', function () { CA.Export.downloadCsv('code-adventure-nilai-level.csv', CA.Export.levelRows(Storage.listClasses(), Storage.state.profiles)); }],
        ['btn-export-xls', function () { CA.Export.downloadExcel('code-adventure-laporan.xls', CA.Export.levelRows(Storage.listClasses(), Storage.state.profiles)); }],
        ['btn-export-json', function () { CA.Export.downloadJson('code-adventure-progres.json', Storage.exportAll()); }]
      ];
      exports.forEach(function (pair) { byId(pair[0]).addEventListener('click', pair[1]); });

      byId('btn-import-json').addEventListener('click', function () { byId('import-file').click(); });
      byId('import-file').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        CA.Export.readFile(file, function (err, text) {
          if (err) return self.app.toast('Gagal membaca berkas.', 'error');
          self.app.showModal({
            icon: '📥',
            title: 'Impor data progres',
            body: '<p>Data dari <b>' + util.escapeHtml(file.name) + '</b> akan dimasukkan. Pilih timpa atau gabung.</p>',
            buttons: [
              { label: 'Timpa semua', className: 'danger', action: function () { Storage.importAll(text, false); self.app.refreshAll(); self.app.toast('Data ditimpa.', 'success'); } },
              { label: 'Gabungkan', className: 'primary', action: function () { Storage.importAll(text, true); self.app.refreshAll(); self.app.toast('Data digabungkan.', 'success'); } },
              { label: 'Batal', className: 'ghost' }
            ]
          });
        });
        e.target.value = '';
      });
    },

    render: function () {
      if (!this.unlocked) {
        document.getElementById('teacher-gate').classList.remove('hidden');
        document.getElementById('teacher-content').classList.add('hidden');
        return;
      }
      document.getElementById('teacher-gate').classList.add('hidden');
      document.getElementById('teacher-content').classList.remove('hidden');
      var self = this;
      var classes = Storage.listClasses();
      var profiles = Storage.state.profiles;

      var classHtml = classes.length ? classes.map(function (cls) {
        return '<div class="class-item"><b>' + util.escapeHtml(cls.name) + '</b> · kode <code>' + cls.code + '</code> · ' + cls.students.length + ' siswa' +
          '<div class="button-row" style="margin-top:8px">' +
          '<button class="btn small ghost" data-act="copy-code" data-code="' + cls.code + '">📋 Kode</button>' +
          '<button class="btn small" data-act="add-student" data-code="' + cls.code + '">+ Siswa</button>' +
          '<button class="btn small ghost" data-act="add-current" data-code="' + cls.code + '">+ Siswa aktif</button>' +
          '<button class="btn small danger" data-act="delete-class" data-code="' + cls.code + '">Hapus</button></div></div>';
      }).join('') : '<p class="muted">Belum ada kelas. Buat kelas untuk mendapat kode kelas.</p>';
      document.getElementById('teacher-classes').innerHTML = classHtml;

      var challenges = [];
      classes.forEach(function (cls) { (cls.challenges || []).forEach(function (c) { challenges.push({ cls: cls, ch: c }); }); });
      document.getElementById('teacher-challenges').innerHTML = challenges.length ? challenges.map(function (item) {
        var base = CA.getLevel(item.ch.baseLevel);
        return '<div class="class-item"><b>' + util.escapeHtml(item.ch.name) + '</b> · dari ' + util.escapeHtml(base ? base.title : 'level ' + item.ch.baseLevel) +
          ' · maks ' + item.ch.maxBlocks + ' blok<div class="button-row" style="margin-top:8px">' +
          '<button class="btn small run" data-act="play" data-code="' + item.cls.code + '" data-id="' + item.ch.id + '">▶ Mainkan</button>' +
          '<button class="btn small danger" data-act="delete-challenge" data-code="' + item.cls.code + '" data-id="' + item.ch.id + '">Hapus</button></div></div>';
      }).join('') : '<p class="muted">Belum ada tantangan khusus.</p>';

      var studentRows = CA.Export.studentRows(classes, profiles);
      document.getElementById('teacher-student-table').innerHTML = tableHtml(
        ['Kelas', 'Siswa', 'XP', 'Level', 'Misi', 'Rata² bintang', 'Aktivitas'],
        studentRows.map(function (r) {
          var p = profiles[r.student === undefined ? '' : findProfileId(profiles, r.student)];
          var recs = p ? Object.keys(p.levels).map(function (k) { return p.levels[k]; }) : [];
          var avg = recs.length ? (recs.reduce(function (s, x) { return s + (x.stars || 0); }, 0) / recs.length).toFixed(1) : '0.0';
          return [r.class, r.avatar + ' ' + r.student, r.xp, r.level, r.completed + '/10', avg, p && p.history.length ? util.formatDate(p.history[p.history.length - 1].date) : '-'];
        })
      );

      document.getElementById('teacher-error-table').innerHTML = tableHtml(
        ['Jenis kesalahan', 'Jumlah'],
        CA.Export.errorRows(profiles).map(function (r) { return [r.jenis_kesalahan, r.jumlah]; })
      );
      document.getElementById('teacher-block-table').innerHTML = tableHtml(
        ['Jenis blok', 'Total penggunaan'],
        CA.Export.blockRows(profiles).map(function (r) { return [r.jenis_blok, r.total_penggunaan]; })
      );

      var select = document.getElementById('challenge-base');
      if (!select.options.length) {
        CA.LEVELS.forEach(function (lv) {
          var opt = document.createElement('option');
          opt.value = lv.id; opt.textContent = lv.id + '. ' + lv.title;
          select.appendChild(opt);
        });
      }
    }
  };

  function findProfileId(profiles, name) {
    return Object.keys(profiles).filter(function (id) { return profiles[id].name === name; })[0] || '';
  }

  function tableHtml(headers, rows) {
    var head = '<tr>' + headers.map(function (h) { return '<th>' + util.escapeHtml(h) + '</th>'; }).join('') + '</tr>';
    var body = rows.length ? rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + util.escapeHtml(c) + '</td>'; }).join('') + '</tr>'; }).join('') :
      '<tr><td colspan="' + headers.length + '" class="muted">Belum ada data</td></tr>';
    return head + body;
  }

  CA.Teacher = Teacher;
})(typeof window !== 'undefined' ? window : globalThis);
