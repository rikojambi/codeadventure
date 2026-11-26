/* Code Adventure - susunan toolbox Blockly */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var C = CA.BLOCK_COLORS;

  function blocks(types) {
    return types.map(function (type) { return { kind: 'block', type: type }; });
  }

  function createToolbox(options) {
    options = options || {};
    var categories = [
      {
        kind: 'category', name: 'Gerak', colour: C.motion,
        contents: blocks(['ca_when_start', 'ca_move_forward', 'ca_move_backward', 'ca_turn_left', 'ca_turn_right', 'ca_jump', 'ca_wait'])
      },
      {
        kind: 'category', name: 'Kontrol', colour: C.control,
        contents: blocks(['ca_repeat', 'ca_repeat_until', 'ca_while', 'ca_if', 'ca_if_else', 'ca_log'])
      },
      {
        kind: 'category', name: 'Logika', colour: C.logic,
        contents: blocks(['ca_equals', 'ca_gt', 'ca_lt', 'ca_compare', 'ca_and', 'ca_or', 'ca_not', 'ca_bool'])
      },
      {
        kind: 'category', name: 'Angka', colour: C.math,
        contents: blocks(['ca_num', 'ca_add', 'ca_sub', 'ca_mul'])
      },
      {
        kind: 'category', name: 'Variabel', colour: C.variable,
        contents: [
          { kind: 'button', text: '+ Variabel baru', callbackKey: 'ca_create_variable' },
          { kind: 'block', type: 'ca_set_var' },
          { kind: 'block', type: 'ca_change_var' },
          { kind: 'block', type: 'ca_get_var' }
        ]
      },
      {
        kind: 'category', name: 'Fungsi', colour: C.function,
        contents: blocks(['ca_def_func', 'ca_call_func'])
      },
      {
        kind: 'category', name: 'Event', colour: C.event,
        contents: blocks(['ca_when_touch', 'ca_when_key'])
      },
      {
        kind: 'category', name: 'Sensor', colour: C.sensor,
        contents: blocks(['ca_sensor_bool', 'ca_sensor_num'])
      }
    ];

    /*Level awal membatasi kategori agar siswa tidak kewalahan.*/
    var id = options.levelId;
    if (id && id !== 'sandbox' && String(id).indexOf('daily') !== 0) {
      var allowed = {
        1: ['Gerak'],
        2: ['Gerak'],
        3: ['Gerak', 'Sensor'],
        4: ['Gerak', 'Kontrol'],
        5: ['Gerak', 'Kontrol', 'Logika', 'Sensor'],
        6: ['Gerak', 'Kontrol', 'Logika', 'Sensor'],
        7: ['Gerak', 'Kontrol', 'Logika', 'Sensor', 'Angka', 'Variabel'],
        8: ['Gerak', 'Kontrol', 'Fungsi'],
        9: ['Gerak', 'Kontrol', 'Sensor'],
        10: null
      };
      var allow = allowed[id];
      if (allow) categories = categories.filter(function (cat) { return allow.indexOf(cat.name) !== -1; });
    }

    categories.push({
      kind: 'category', name: 'Semua Blok', colour: '#607D8B',
      contents: categories.reduce(function (all, cat) { return all.concat(cat.contents); }, [])
    });

    return { kind: 'categoryToolbox', contents: categories };
  }

  CA.createToolbox = createToolbox;
})(typeof window !== 'undefined' ? window : globalThis);
