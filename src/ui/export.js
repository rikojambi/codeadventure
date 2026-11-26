/* Code Adventure - ekspor CSV / Excel / JSON dan impor data */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var util = CA.util;

  function studentRows(classes, profiles) {
    var list = classes;
    if (!Array.isArray(list)) list = classes ? [classes] : [];
    var rows = [];
    list.forEach(function (cls) {
      (cls.students || []).forEach(function (studentId) {
        var p = profiles[studentId];
        if (!p) return;
        rows.push({ class: cls.name, code: cls.code, student: p.name, avatar: p.avatar, xp: p.xp, level: CA.levelRank(p), completed: CA.countCompleted(p) });
      });
    });
    return rows;
  }

  function levelRows(classes, profiles) {
    var rows = [];
    (classes || []).forEach(function (cls) {
      (cls.students || []).forEach(function (id) {
        var p = profiles[id];
        if (!p) return;
        CA.LEVELS.forEach(function (lv) {
          var rec = p.levels[lv.id] || {};
          rows.push({
            kelas: cls.name, kode: cls.code, siswa: p.name, level: lv.id,
            judul: lv.title, status: rec.won ? 'Selesai' : 'Belum',
            bintang: rec.stars || 0, skor: rec.total || 0,
            blok: rec.blocks || 0, percobaan: rec.attempts || 0,
            error: rec.errors || 0, tanggal: rec.date ? rec.date.slice(0, 10) : '-'
          });
        });
      });
    });
    return rows;
  }

  function errorRows(profiles) {
    var rows = [];
    Object.keys(profiles || {}).forEach(function (id) {
      var p = profiles[id];
      Object.keys(p.errorStats || {}).forEach(function (code) {
        rows.push({ siswa: p.name, jenis_kesalahan: code, jumlah: p.errorStats[code] });
      });
    });
    return rows.sort(function (a, b) { return b.jumlah - a.jumlah; });
  }

  function blockRows(profiles) {
    var totals = {};
    Object.keys(profiles || {}).forEach(function (id) {
      var p = profiles[id];
      Object.keys(p.blockStats || {}).forEach(function (key) {
        totals[key] = (totals[key] || 0) + Number(p.blockStats[key] || 0);
      });
    });
    return Object.keys(totals).map(function (key) { return { jenis_blok: key, total_penggunaan: totals[key] }; })
      .sort(function (a, b) { return b.total_penggunaan - a.total_penggunaan; });
  }

  function toHtmlTable(rows) {
    if (!rows.length) return '<table><tr><td>Tidak ada data</td></tr></table>';
    var keys = Object.keys(rows[0]);
    var head = '<tr>' + keys.map(function (k) { return '<th style="background:#2563eb;color:white">' + util.escapeHtml(k) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (row) {
      return '<tr>' + keys.map(function (k) { return '<td>' + util.escapeHtml(row[k]) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<table border="1" cellspacing="0">' + head + body + '</table>';
  }

  function downloadExcel(filename, rows) {
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
      '<head><meta charset="utf-8"></head><body>' + toHtmlTable(rows) + '</body></html>';
    util.download(filename, html, 'application/vnd.ms-excel;charset=utf-8');
  }

  function downloadCsv(filename, rows) {
    if (!rows.length) rows = [{ info: 'Tidak ada data' }];
    var keys = Object.keys(rows[0]);
    var matrix = [keys].concat(rows.map(function (row) { return keys.map(function (k) { return row[k]; }); }));
    util.download(filename, util.toCsv(matrix), 'text/csv;charset=utf-8');
  }

  function downloadJson(filename, data) {
    util.download(filename, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
  }

  function readFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function () { callback(null, String(reader.result || '')); };
    reader.onerror = function () { callback(reader.error); };
    reader.readAsText(file);
  }

  CA.Export = {
    studentRows: studentRows,
    levelRows: levelRows,
    errorRows: errorRows,
    blockRows: blockRows,
    downloadCsv: downloadCsv,
    downloadExcel: downloadExcel,
    downloadJson: downloadJson,
    readFile: readFile
  };
})(typeof window !== 'undefined' ? window : globalThis);
