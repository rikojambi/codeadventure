/* Code Adventure - efek suara sintetis (bisa dimatikan) */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});

  var ctx = null;
  var enabled = true;

  function context() {
    if (!enabled) return null;
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  function tone(freq, duration, type, volume, delay) {
    var c = context();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume || 0.04, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  var sounds = {
    step: function () { tone(260, 0.08, 'square', 0.025); },
    turn: function () { tone(400, 0.06, 'triangle', 0.025); },
    jump: function () { tone(520, 0.16, 'sine', 0.035); tone(780, 0.12, 'sine', 0.02, 0.06); },
    coin: function () { tone(880, 0.09, 'square', 0.035); tone(1320, 0.14, 'square', 0.03, 0.08); },
    button: function () { tone(330, 0.1, 'triangle', 0.03); tone(440, 0.1, 'triangle', 0.03, 0.09); },
    door: function () { tone(180, 0.25, 'sawtooth', 0.025); tone(300, 0.2, 'triangle', 0.02, 0.1); },
    error: function () { tone(160, 0.2, 'sawtooth', 0.03); tone(120, 0.25, 'sawtooth', 0.03, 0.12); },
    fail: function () { tone(300, 0.15, 'triangle', 0.03); tone(220, 0.15, 'triangle', 0.03, 0.13); tone(150, 0.3, 'triangle', 0.03, 0.26); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, 'square', 0.03, i * 0.1); }); },
    click: function () { tone(620, 0.04, 'triangle', 0.02); },
    achievement: function () { [659, 880, 1174].forEach(function (f, i) { tone(f, 0.22, 'sine', 0.03, i * 0.12); }); }
  };

  CA.Audio = {
    setEnabled: function (value) { enabled = !!value; },
    isEnabled: function () { return enabled; },
    play: function (name) { if (sounds[name]) sounds[name](); },
    unlock: function () { context(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
