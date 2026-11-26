/* Code Adventure - sistem penilaian, XP, bintang, dan achievement */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var clamp = CA.util.clamp;

  var ACHIEVEMENTS = [
    { id: 'first-step', name: 'Langkah Pertama', icon: '👣', desc: 'Selesaikan level 1', check: function (p) { return !!(p.levels[1] && p.levels[1].won); } },
    { id: 'coin-hunter', name: 'Pemburu Koin', icon: '🪙', desc: 'Kumpulkan 20 koin', check: function (p) { return totalCoins(p) >= 20; } },
    { id: 'loop-master', name: 'Master Loop', icon: '🔁', desc: 'Gunakan Repeat di 3 level', check: function (p) { return countConcept(p, 'loop') >= 3; } },
    { id: 'function-builder', name: 'Arsitek Fungsi', icon: '⚙️', desc: 'Gunakan fungsi di 2 level', check: function (p) { return countConcept(p, 'function') >= 2; } },
    { id: 'debugger', name: 'Debugging Hero', icon: '🐞', desc: 'Selesaikan level debugging', check: function (p) { return !!(p.levels[9] && p.levels[9].won); } },
    { id: 'perfect', name: 'Algoritma Sempurna', icon: '💎', desc: 'Dapatkan 3 bintang di 5 level', check: function (p) { return Object.keys(p.levels).filter(function (k) { return p.levels[k].stars >= 3; }).length >= 5; } },
    { id: 'marathon', name: 'Petualang Ulung', icon: '🏅', desc: 'Selesaikan 10 level', check: function (p) { return completed(p) >= 10; } },
    { id: 'xp-1000', name: 'Pemrogram Muda', icon: '⭐', desc: 'Kumpulkan 1000 XP', check: function (p) { return p.xp >= 1000; } }
  ];

  function completed(profile) {
    return Object.keys(profile.levels || {}).filter(function (k) { return profile.levels[k] && profile.levels[k].won; }).length;
  }

  function totalCoins(profile) {
    return Object.keys(profile.levels || {}).reduce(function (sum, k) {
      return sum + ((profile.levels[k] && profile.levels[k].coins) || 0);
    }, 0);
  }

  function countConcept(profile, concept) {
    return Object.keys(profile.levels || {}).filter(function (k) {
      var r = profile.levels[k];
      return r && r.won && (r.concepts || []).indexOf(concept) !== -1;
    }).length;
  }

  /**
   * Menilai satu kali percobaan. Tidak berdasarkan kecepatan.
   */
  function scoreRun(input) {
    var level = input.level || {};
    var stats = input.stats || {};
    var won = !!input.won;
    if (!won) {
      return { stars: 0, xp: 0, total: 0, breakdown: {}, message: 'Belum berhasil. Coba lagi dan gunakan petunjuk bertahap.' };
    }
    var par = Math.max(1, level.parBlocks || 1);
    var blocks = Math.max(1, stats.blocks || 1);
    var errors = stats.errors || 0;
    var attempts = Math.max(1, stats.attempts || 1);

    var completion = 250;
    var efficiency = Math.round(300 * clamp(par / blocks, 0, 1));
    var accuracy = Math.round(clamp(250 - errors * 40, 0, 250));
    var persistence = Math.round(clamp(150 - (attempts - 1) * 25, 40, 150));
    var creativity = Math.min(150, (stats.loops ? 60 : 0) + (stats.functions ? 80 : 0) + (attempts > 1 ? 40 : 0));
    var total = clamp(completion + efficiency + accuracy + persistence + creativity, 0, 1000);
    var stars = total >= 820 && blocks <= par * 1.25 && errors <= 1 ? 3 : (total >= 600 ? 2 : 1);
    var xp = Math.round(total / 10) + stars * 25;

    return {
      stars: stars,
      xp: xp,
      total: total,
      breakdown: {
        penyelesaian: completion,
        efisiensi: efficiency,
        ketepatan: accuracy,
        ketekunan: persistence,
        kreativitas: creativity
      },
      message: stars === 3 ? 'Luar biasa! Algoritmamu sangat efisien.' : (stars === 2 ? 'Bagus! Program berhasil, masih bisa lebih efisien.' : 'Berhasil! Terus berlatih untuk hasil yang lebih rapi.')
    };
  }

  function levelRank(profile) {
    var xp = profile.xp || 0;
    var level = Math.floor(Math.sqrt(xp / 60)) + 1;
    return clamp(level, 1, 30);
  }

  function xpForNext(level) {
    return 60 * level * level;
  }

  function competencySummary(profile) {
    var mastered = [];
    var needsWork = [];
    CA.CURRICULUM.forEach(function (topic) {
      var key = topic.name.toLowerCase().replace(/[^a-z]/g, '');
      var score = 0;
      Object.keys(profile.levels || {}).forEach(function (id) {
        var rec = profile.levels[id];
        if (!rec || !rec.won) return;
        var lv = CA.getLevel(id);
        if (!lv) return;
        if (lv.concepts.some(function (c) { return c.replace(/[^a-z]/g, '') === key || c.indexOf(key.slice(0, 5)) === 0; })) {
          score += rec.stars || 1;
        }
      });
      if (score >= 2) mastered.push(topic.name);
      else if (score > 0) needsWork.push(topic.name);
    });
    return { mastered: mastered, needsWork: needsWork };
  }

  function refreshAchievements(profile) {
    var gained = [];
    ACHIEVEMENTS.forEach(function (a) {
      if ((profile.achievements || []).indexOf(a.id) === -1 && a.check(profile)) {
        profile.achievements.push(a.id);
        gained.push(a);
      }
    });
    return gained;
  }

  CA.scoreRun = scoreRun;
  CA.levelRank = levelRank;
  CA.xpForNext = xpForNext;
  CA.competencySummary = competencySummary;
  CA.refreshAchievements = refreshAchievements;
  CA.ACHIEVEMENTS = ACHIEVEMENTS;
  CA.countCompleted = completed;
})(typeof window !== 'undefined' ? window : globalThis);
