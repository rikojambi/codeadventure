/* Code Adventure - definisi seluruh blok visual (Blockly) */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var B = global.Blockly;

  var COLOR = {
    motion: '#4C86E8',
    control: '#E7A32C',
    logic: '#2FB6A0',
    variable: '#A366D6',
    function: '#D9679C',
    event: '#E27255',
    sensor: '#59A94F',
    math: '#2FB6A0'
  };

  var definitions = [
    /* ---------------- MOTION ---------------- */
    { type: 'ca_move_forward', message0: 'Maju ke depan ➜', previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.motion, tooltip: 'Robot bergerak satu petak ke arah hadap.' },
    { type: 'ca_move_backward', message0: 'Mundur ⬅', previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.motion, tooltip: 'Robot bergerak satu petak ke belakang tanpa berputar.' },
    { type: 'ca_turn_left', message0: 'Belok kiri ↶', previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.motion, tooltip: 'Memutar arah 90 derajat ke kiri.' },
    { type: 'ca_turn_right', message0: 'Belok kanan ↷', previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.motion, tooltip: 'Memutar arah 90 derajat ke kanan.' },
    { type: 'ca_jump', message0: 'Lompat 🦘', previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.motion, tooltip: 'Melompat dua petak dan aman melewati satu jurang.' },
    { type: 'ca_wait', message0: 'Tunggu ⏱', previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.motion, tooltip: 'Menunggu satu langkah waktu.' },

    /* ---------------- CONTROL ---------------- */
    {
      type: 'ca_repeat',
      message0: 'Ulangi %1 kali %2 lakukan %3',
      args0: [
        { type: 'field_number', name: 'COUNT', value: 4, min: 1, max: 999, precision: 1 },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.control,
      tooltip: 'Mengulangblok di dalamnya sebanyak jumlah tertentu.'
    },
    {
      type: 'ca_repeat_until',
      message0: 'Ulangi sampai %1 %2 lakukan %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Bool' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.control,
      tooltip: 'Mengulangblok selama kondisi belum benar.'
    },
    {
      type: 'ca_while',
      message0: 'Selama %1 benar %2 lakukan %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Bool' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.control,
      tooltip: 'Mengulangblok selama kondisi bernilai benar.'
    },
    {
      type: 'ca_if',
      message0: 'Jika %1 maka %2',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Bool' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.control,
      tooltip: 'Menjalankan perintah hanya jika kondisi benar.'
    },
    {
      type: 'ca_if_else',
      message0: 'Jika %1 maka %2 jika tidak %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Bool' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' },
        { type: 'input_statement', name: 'ELSE', check: 'Cmd' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.control,
      tooltip: 'Memilih dua cabang perintah berdasarkan kondisi.'
    },

    /* ---------------- LOGIC / OPERATOR ---------------- */
    {
      type: 'ca_equals', message0: '%1 sama dengan %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Num' }, { type: 'input_value', name: 'B', check: 'Num' }],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Benar jika dua nilai sama.'
    },
    {
      type: 'ca_gt', message0: '%1 lebih besar dari %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Num' }, { type: 'input_value', name: 'B', check: 'Num' }],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Benar jika nilai pertama lebih besar.'
    },
    {
      type: 'ca_lt', message0: '%1 lebih kecil dari %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Num' }, { type: 'input_value', name: 'B', check: 'Num' }],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Benar jika nilai pertama lebih kecil.'
    },
    {
      type: 'ca_compare',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A', check: 'Num' },
        { type: 'field_dropdown', name: 'OP', options: [['=', 'EQ'], ['>', 'GT'], ['<', 'LT'], ['≥', 'GTE'], ['≤', 'LTE']] },
        { type: 'input_value', name: 'B', check: 'Num' }
      ],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Membandingkan dua angka.'
    },
    {
      type: 'ca_and', message0: '%1 dan %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Bool' }, { type: 'input_value', name: 'B', check: 'Bool' }],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Benar jika kedua kondisi benar.'
    },
    {
      type: 'ca_or', message0: '%1 atau %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Bool' }, { type: 'input_value', name: 'B', check: 'Bool' }],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Benar jika salah satu kondisi benar.'
    },
    {
      type: 'ca_not', message0: 'tidak %1',
      args0: [{ type: 'input_value', name: 'A', check: 'Bool' }],
      output: 'Bool', colour: COLOR.logic, tooltip: 'Membalik nilai benar/salah.'
    },
    {
      type: 'ca_bool', message0: '%1',
      args0: [{ type: 'field_dropdown', name: 'BOOL', options: [['benar', 'TRUE'], ['salah', 'FALSE']] }],
      output: 'Bool', colour: COLOR.logic
    },
    {
      type: 'ca_num', message0: '%1',
      args0: [{ type: 'field_number', name: 'NUM', value: 1, precision: 1 }],
      output: 'Num', colour: COLOR.math
    },
    {
      type: 'ca_add', message0: '%1 + %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Num' }, { type: 'input_value', name: 'B', check: 'Num' }],
      output: 'Num', colour: COLOR.math
    },
    {
      type: 'ca_sub', message0: '%1 - %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Num' }, { type: 'input_value', name: 'B', check: 'Num' }],
      output: 'Num', colour: COLOR.math
    },
    {
      type: 'ca_mul', message0: '%1 × %2',
      args0: [{ type: 'input_value', name: 'A', check: 'Num' }, { type: 'input_value', name: 'B', check: 'Num' }],
      output: 'Num', colour: COLOR.math
    },
    {
      type: 'ca_log', message0: 'Tulis pesan %1',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'Halo!' }],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.control
    },

    /* ---------------- VARIABLE ---------------- */
    {
      type: 'ca_set_var', message0: 'Set %1 = %2',
      args0: [
        { type: 'field_variable', name: 'VAR', variable: 'energi' },
        { type: 'input_value', name: 'VALUE', check: 'Num' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.variable
    },
    {
      type: 'ca_change_var', message0: 'Ubah %1 oleh %2',
      args0: [
        { type: 'field_variable', name: 'VAR', variable: 'energi' },
        { type: 'input_value', name: 'VALUE', check: 'Num' }
      ],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.variable
    },
    {
      type: 'ca_get_var', message0: '%1',
      args0: [{ type: 'field_variable', name: 'VAR', variable: 'energi' }],
      output: 'Num', colour: COLOR.variable
    },

    /* ---------------- FUNCTION ---------------- */
    {
      type: 'ca_def_func', message0: 'Buat fungsi %1 %2 lakukan %3',
      args0: [
        { type: 'field_input', name: 'NAME', text: 'langkah' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      colour: COLOR.function, tooltip: 'Membuat kumpulan perintah yang bisa dipanggil ulang.'
    },
    {
      type: 'ca_call_func', message0: 'Panggil fungsi %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'langkah' }],
      previousStatement: 'Cmd', nextStatement: 'Cmd', colour: COLOR.function
    },

    /* ---------------- EVENT ---------------- */
    {
      type: 'ca_when_start', message0: 'Ketika program mulai %1 lakukan %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO', check: 'Cmd' }],
      colour: COLOR.event, tooltip: 'Blok utama yang dijalankan saat RUN ditekan.'
    },
    {
      type: 'ca_when_touch', message0: 'Ketika menyentuh %1 %2 lakukan %3',
      args0: [
        { type: 'field_dropdown', name: 'OBJECT', options: [['koin', 'coin'], ['energi', 'energy'], ['tombol', 'button'], ['pintu', 'door'], ['tujuan', 'goal']] },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      colour: COLOR.event, tooltip: 'Perintah yang dijalankan saat robot menyentuh objek tertentu.'
    },
    {
      type: 'ca_when_key', message0: 'Ketika tombol %1 ditekan %2 lakukan %3',
      args0: [
        { type: 'field_dropdown', name: 'KEY', options: [['panah atas', 'up'], ['panah bawah', 'down'], ['panah kiri', 'left'], ['panah kanan', 'right'], ['spasi', 'space']] },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO', check: 'Cmd' }
      ],
      colour: COLOR.event, tooltip: 'Perintah yang dijalankan saat tombol keyboard ditekan.'
    },

    /* ---------------- SENSOR ---------------- */
    {
      type: 'ca_sensor_bool', message0: '%1',
      args0: [{
        type: 'field_dropdown', name: 'SENSOR', options: [
          ['depan ada dinding', 'depan_dinding'],
          ['depan ada jurang', 'depan_jurang'],
          ['depan ada koin', 'depan_koin'],
          ['depan ada tujuan', 'depan_tujuan'],
          ['depan aman', 'depan_aman'],
          ['pintu terbuka', 'pintu_terbuka'],
          ['tombol aktif', 'tombol_aktif'],
          ['di tujuan', 'di_tujuan'],
          ['di koin', 'di_koin'],
          ['di energi', 'di_energi'],
          ['koin lengkap', 'koin_lengkap'],
          ['energi cukup', 'energi_cukup'],
          ['syarat lengkap', 'syarat_lengkap']
        ]
      }],
      output: 'Bool', colour: COLOR.sensor, tooltip: 'Membaca kondisi dunia permainan.'
    },
    {
      type: 'ca_sensor_num', message0: '%1',
      args0: [{
        type: 'field_dropdown', name: 'SENSOR', options: [
          ['jumlah koin', 'jumlah_koin'],
          ['jumlah energi', 'jumlah_energi'],
          ['sisa koin', 'sisa_koin'],
          ['jumlah langkah', 'langkah'],
          ['posisi X', 'posisi_x'],
          ['posisi Y', 'posisi_y'],
          ['arah (0-3)', 'arah']
        ]
      }],
      output: 'Num', colour: COLOR.sensor, tooltip: 'Membaca nilai angka dari dunia permainan.'
    }
  ];

  function install() {
    if (!B) return false;
    if (!B.Blocks) B.Blocks = {};
    B.defineBlocksWithJsonArray(definitions);
    return true;
  }

  CA.BlockDefinitions = definitions;
  CA.installBlockDefinitions = install;
  CA.BLOCK_COLORS = COLOR;
})(typeof window !== 'undefined' ? window : globalThis);
