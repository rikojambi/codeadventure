/* Code Adventure - definisi 10 level, kurikulum, dan generator tantangan harian */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});

  var LEVELS = [
    {
      id: 1,
      title: 'Gerakkan Robot',
      theme: 'hutan',
      icon: '🚀',
      story: 'Robot Kiko tersesat di Hutan Kode. Dia harus sampai ke stasiun tujuan sebelum matahari terbenam.',
      objectives: ['Mengenal urutan instruksi', 'Menggunakan Move Forward dan Turn Right'],
      material: 'Program adalah daftar perintah yang dijalankan dari atas ke bawah. Arah robot ditunjukkan oleh panah di atas kepala Kiko. Turn Right memutar arah 90° searah jarum jam.',
      example: 'Maju, Maju, Belok Kanan, Maju, Maju.',
      challenge: 'Bawa Kiko dari titik hijau (S) ke tujuan (G). Dinding (#) tidak bisa ditembus.',
      hints: [
        'Perhatikan arah panah Kiko saat ini.',
        'Hitung berapa petak Kiko harus maju sebelum berbelok.',
        'Gunakan Move Forward 2 kali, Turn Right, lalu Move Forward 2 kali.'
      ],
      concepts: ['sequence', 'direction'],
      grid: [
        '############',
        '#S..########',
        '###.########',
        '###G########',
        '############'
      ],
      dir: 0,
      require: { coins: 0, energy: 0, button: false },
      parBlocks: 5,
      stepTarget: 4,
      maxBlocks: null
    },
    {
      id: 2,
      title: 'Kumpulkan Koin',
      theme: 'hutan',
      icon: '🪙',
      story: 'Kiko butuh tiga koin energi untuk mengisi daya mesinnya. Koin terhampar di sepanjang jalur.',
      objectives: ['Memahami sequence', 'Menyusun perintah berurutan'],
      material: 'Setiap blok dijalankan satu per satu. Koin dikumpulkan otomatis ketika Kiko berdiri di petak koin. Semua koin harus terkumpul sebelum tujuan terbuka.',
      example: 'Move Forward, Move Forward, Move Forward, ... sampai koin habis.',
      challenge: 'Kumpulkan semua koin lalu capai tujuan.',
      hints: [
        'Hitung jumlah petak dari S ke G.',
        'Setiap koin berada tepat di jalur lurus.',
        'Gunakan Move Forward sebanyak 8 kali.'
      ],
      concepts: ['sequence', 'planning'],
      grid: [
        '###########',
        '#S.c.c.c.G#',
        '###########'
      ],
      dir: 0,
      require: { coins: 3, energy: 0, button: false },
      parBlocks: 9,
      stepTarget: 8,
      maxBlocks: 12
    },
    {
      id: 3,
      title: 'Hindari Rintangan',
      theme: 'gurun',
      icon: '🕳️',
      story: 'Gurun Kode memiliki jurang kecil. Kiko harus melompat, bukan berjalan, atau akan jatuh!',
      objectives: ['Algoritma aman', 'Debugging sederhana'],
      material: 'Blok Jump melompat dua petak ke depan dan aman melewati satu petak jurang (~). Jika Kiko menginjak jurang, program gagal.',
      example: 'Maju, Maju, Lompat, Maju.',
      challenge: 'Lewati jurang tanpa jatuh dan sampai ke tujuan.',
      hints: [
        'Jurang berada tepat di depan setelah dua langkah.',
        'Jangan gunakan Move Forward di atas jurang.',
        'Setelah dua Move Forward, gunakan Jump.'
      ],
      concepts: ['algorithm', 'debugging'],
      grid: [
        '############',
        '#S..~..G####',
        '############'
      ],
      dir: 0,
      require: { coins: 0, energy: 0, button: false },
      parBlocks: 4,
      stepTarget: 4,
      maxBlocks: 8
    },
    {
      id: 4,
      title: 'Gerakan Berulang',
      theme: 'gurun',
      icon: '🔁',
      story: 'Jalur koin sangat panjang. Menulis Move Forward berkali-kali membuat program membosankan.',
      objectives: ['Pengenalan loop', 'Efisiensi blok'],
      material: 'Blok Repeat menjalankan isinya sebanyak angka yang ditentukan. Loop membuat program lebih pendek dan mudah diubah.',
      example: 'Repeat 16 kali: [Move Forward].',
      challenge: 'Selesaikan jalur dengan blok sesedikit mungkin (maksimal 6 blok).',
      hints: [
        'Hitung jarak dari S sampai G.',
        'Satu blok Repeat bisa menggantikan banyak blok gerak.',
        'Gunakan Repeat 16 berisi Move Forward.'
      ],
      concepts: ['loop', 'pattern-recognition'],
      grid: [
        '###################',
        '#S.c.c.c.c.c.c.c.G#',
        '###################'
      ],
      dir: 0,
      require: { coins: 7, energy: 0, button: false },
      parBlocks: 2,
      stepTarget: 16,
      maxBlocks: 6
    },
    {
      id: 5,
      title: 'Pintu Otomatis',
      theme: 'kota',
      icon: '🚪',
      story: 'Pintu laboratorium hanya terbuka jika tombol ditekan. Kiko perlu memeriksa kondisi sebelum melangkah.',
      objectives: ['Conditional If', 'Kondisi pintu dan tombol'],
      material: 'Blok If menjalankan isi hanya jika kondisinya benar. Blok If Else memiliki dua cabang. sensor "pintu terbuka" bernilai benar setelah tombol (B) diinjak.',
      example: 'Jika pintu terbuka → Move Forward, jika tidak → cari tombol.',
      challenge: 'Tekan tombol, kembali ke jalur utama, lalu lewati pintu menuju tujuan.',
      hints: [
        'Tombol (B) berada satu petak di bawah jalur utama.',
        'Belok kanan untuk menuju tombol, lalu belok kiri untuk kembali.',
        'Gunakan If dengan kondisi "pintu terbuka" sebelum melewati pintu.'
      ],
      concepts: ['conditional', 'condition'],
      grid: [
        '############',
        '#S...D.G####',
        '#..B....####',
        '############'
      ],
      dir: 0,
      require: { coins: 0, energy: 0, button: true },
      parBlocks: 11,
      stepTarget: 9,
      maxBlocks: 18
    },
    {
      id: 6,
      title: 'Labirin Kode',
      theme: 'lab',
      icon: '🧭',
      story: 'Kiko masuk labirin. Dia harus mengumpulkan tiga koin sambil mencari rute yang efisien.',
      objectives: ['Kombinasi kondisi dan perulangan', 'Pemecahan masalah'],
      material: 'Gabungkan Repeat dengan kontrol arah. Gunakan sensor "depan ada dinding" untuk menghindari tabrakan.',
      example: 'Ulangi sampai tujuan: [jika depan ada dinding → belok kanan, jika tidak → maju].',
      challenge: 'Kumpulkan semua koin dan capai tujuan di labirin.',
      hints: [
        'Jalur paling aman dimulai dengan belok kanan dari posisi awal.',
        'Ikuti koridor bawah, koin tersimpan di sepanjang jalan.',
        'Gunakan RepeatUntil dengan kondisi "di tujuan".'
      ],
      concepts: ['problem-solving', 'loop', 'condition'],
      grid: [
        '############',
        '#S.#......##',
        '#.#.#.##..##',
        '#.#...#.c.##',
        '#.#####.#.##',
        '#..c.c..#G##',
        '############'
      ],
      dir: 1,
      require: { coins: 3, energy: 0, button: false },
      parBlocks: 14,
      stepTarget: 16,
      maxBlocks: 24
    },
    {
      id: 7,
      title: 'Energi Variabel',
      theme: 'lab',
      icon: '⚡',
      story: 'Baterai Kiko hampir habis. Dia harus mengisi energi sampai variabel "energi" bernilai minimal 3.',
      objectives: ['Variabel', 'Operator perbandingan'],
      material: 'Variabel adalah kotak penyimpan nilai. Set Variable menetapkan nilai, Change Variable menambah/mengurangi. Sensor "jumlah energi" membaca energi yang dikumpulkan Kiko.',
      example: 'Set energi = 0. Setiap kristal: Change energi oleh 1. Cek energi > 2.',
      challenge: 'Kumpulkan 3 kristal energi, pastikan variabel energi minimal 3, lalu capai tujuan.',
      hints: [
        'Awalnya variabel energi bernilai 0.',
        'Gunakan Change Variable setiap kali Kiko menginjak kristal (E).',
        'Gunakan RepeatUntil dengan kondisi energi > 2.'
      ],
      concepts: ['variable', 'operator', 'loop'],
      grid: [
        '############',
        '#S.E.E.E.G##',
        '############'
      ],
      dir: 0,
      require: { coins: 0, energy: 3, button: false, variable: { name: 'energi', min: 3 } },
      parBlocks: 6,
      stepTarget: 8,
      maxBlocks: 14
    },
    {
      id: 8,
      title: 'Fungsi Langkah',
      theme: 'kota',
      icon: '🧩',
      story: 'Kiko harus mengambil empat koin dengan pola gerakan yang sama berulang kali.',
      objectives: ['Decomposition', 'Function'],
      material: 'Function adalah nama untuk sekumpulan perintah. Buat fungsi sekali lalu panggil berkali-kali agar program tetap pendek.',
      example: 'Fungsi "ambil": [Maju, Maju]. Panggil "ambil" empat kali.',
      challenge: 'Selesaikan level dengan maksimal 8 blok dengan bantuan fungsi.',
      hints: [
        'Setiap koin berjarak dua petak.',
        'Buat fungsi bernama "ambil" berisi dua Move Forward.',
        'Panggil fungsi "ambil" empat kali lalu maju sekali.'
      ],
      concepts: ['function', 'decomposition', 'pattern-recognition'],
      grid: [
        '############',
        '#S.c.c.c.cG#',
        '############'
      ],
      dir: 0,
      require: { coins: 4, energy: 0, button: false },
      parBlocks: 8,
      stepTarget: 9,
      maxBlocks: 8
    },
    {
      id: 9,
      title: 'Debugging Hero',
      theme: 'kota',
      icon: '🐞',
      story: 'Program Kiko salah! Dia berbelok ke arah dinding. Temukan kesalahannya tanpa melihat jawaban.',
      objectives: ['Debugging', 'Trace program'],
      material: 'Debugging adalah proses menemukan dan memperbaiki kesalahan. Gunakan STEP untuk menjalankan satu perintah agar mudah melacak.',
      example: 'Perbaiki blok Belok Kiri yang seharusnya Belok Kanan.',
      challenge: 'Program sudah disiapkan tetapi sengaja salah. Perbaiki sehingga Kiko sampai ke tujuan.',
      hints: [
        'Gunakan STEP dan perhatikan arah Kiko setelah blok ketiga.',
        'Kiko berbelok ke arah dinding, bukan ke jalur bawah.',
        'Ganti Turn Left menjadi Turn Right.'
      ],
      concepts: ['debugging', 'sequence'],
      grid: [
        '############',
        '#S..#..G####',
        '#.......####',
        '############'
      ],
      dir: 0,
      require: { coins: 0, energy: 0, button: false },
      parBlocks: 9,
      stepTarget: 10,
      maxBlocks: 14,
      buggy: true
    },
    {
      id: 10,
      title: 'Final Project',
      theme: 'langit',
      icon: '🏆',
      story: 'Misi terakhir! Gabungkan semua yang telah dipelajari: koin, energi, tombol, pintu, dan fungsi.',
      objectives: ['Integrasi semua konsep', 'Problem solving kompleks'],
      material: 'Gabungkan loop, kondisi, variabel, dan fungsi. Pikirkan rencana sebelum menyusun blok.',
      example: 'RepeatUntil di tujuan: [kumpulkan koin → tekan tombol → buka pintu].',
      challenge: 'Kumpulkan koin dan energi, tekan tombol, lewati pintu, lalu capai tujuan.',
      hints: [
        'Kiko mulai menghadap kanan. Koin dan kristal ada di jalur atas.',
        'Turun di x=7, lalu turun lagi, dan kembali ke tombol (B).',
        'Setelah tombol aktif, naik kembali dan lewati pintu (D).'
      ],
      concepts: ['problem-solving', 'function', 'variable', 'condition', 'loop'],
      grid: [
        '############',
        '#S.c.E..D.G#',
        '#.#.##..#..#',
        '#...B.....##',
        '############'
      ],
      dir: 0,
      require: { coins: 1, energy: 1, button: true, variable: { name: 'energi', min: 0 } },
      parBlocks: 16,
      stepTarget: 18,
      maxBlocks: 30
    }
  ];

  var CURRICULUM = [
    { no: 1, name: 'Computational Thinking', desc: 'Memecah masalah menjadi langkah kecil', icon: '🧠' },
    { no: 2, name: 'Sequence', desc: 'Urutan perintah yang benar', icon: '1️⃣' },
    { no: 3, name: 'Algorithm', desc: 'Langkah sistematis menuju tujuan', icon: '🗺️' },
    { no: 4, name: 'Decomposition', desc: 'Membagi program menjadi bagian', icon: '🧩' },
    { no: 5, name: 'Pattern Recognition', desc: 'Menemukan pola yang berulang', icon: '🔍' },
    { no: 6, name: 'Looping', desc: 'Repeat dan Repeat Until', icon: '🔁' },
    { no: 7, name: 'Conditional', desc: 'If dan If Else', icon: '❓' },
    { no: 8, name: 'Variable', desc: 'Menyimpan dan mengubah nilai', icon: '📦' },
    { no: 9, name: 'Operator', desc: 'Perbandingan dan logika', icon: '➗' },
    { no: 10, name: 'Function', desc: 'Membuat dan memanggil fungsi', icon: '⚙️' },
    { no: 11, name: 'Debugging', desc: 'Menemukan kesalahan program', icon: '🐞' },
    { no: 12, name: 'Problem Solving', desc: 'Menggabungkan semua konsep', icon: '🏆' }
  ];

  var SANDBOX = {
    id: 'sandbox',
    title: 'Sandbox Mode',
    theme: 'langit',
    icon: '🛠️',
    story: 'Dunia bebas untuk bereksperimen. Tidak ada nilai, hanya kreativitas.',
    objectives: ['Bebas bereksperimen'],
    material: 'Coba semua blok tanpa batasan. Gunakan STEP untuk memahami cara kerja tiap blok.',
    example: 'Buat fungsi, panggil di dalam loop, lalu amati hasilnya.',
    challenge: 'Buat program apa saja dan lihat apa yang terjadi!',
    hints: ['Gunakan Toolbox untuk menambah blok.', 'Tekan RUN untuk menjalankan.', 'Gunakan RESET untuk kembali ke awal.'],
    concepts: ['creative'],
    grid: [
      '##############',
      '#S...c....c..#',
      '#..#....#....#',
      '#.E....B...D.#',
      '#...#....c.G.#',
      '##############'
    ],
    dir: 0,
    require: { coins: 0, energy: 0, button: false },
    parBlocks: 0,
    stepTarget: 0,
    maxBlocks: null,
    sandbox: true
  };

  function getLevel(id) {
    if (id === 'sandbox') return SANDBOX;
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === Number(id)) return LEVELS[i];
    return null;
  }

  /** Tantangan harian yang deterministik berdasarkan tanggal. */
  function createDailyLevel(dateKey) {
    var key = dateKey || CA.util.todayKey();
    var rand = CA.util.mulberry32(CA.util.hashString(key));
    var coinCount = 3 + Math.floor(rand() * 4);
    var cells = [];
    for (var i = 0; i < coinCount; i++) cells.push(rand() > 0.45 ? 'c' : 'E');
    var width = 16;
    var row = '#S.' + cells.join('.') + '.G';
    while (row.length < width - 1) row += '.';
    row = row.slice(0, width - 1) + '#';
    var pitIndex = 4 + Math.floor(rand() * Math.max(1, cells.length - 2));
    if (row.charAt(pitIndex) === '.') row = row.slice(0, pitIndex) + '~' + row.slice(pitIndex + 1);
    return {
      id: 'daily-' + key,
      title: 'Daily Challenge · ' + key,
      theme: 'langit',
      icon: '📅',
      story: 'Tantangan harian yang berbeda setiap hari. Semua siswa mendapat peta yang sama.',
      objectives: ['Latihan harian'],
      material: 'Gunakan strategi terbaikmu. Skor harian tidak menggantikan nilai level utama.',
      example: 'Repeat + kondisi sesuai peta hari ini.',
      challenge: 'Selesaikan peta harian dengan blok sesedikit mungkin.',
      hints: ['Perhatikan posisi jurang.', 'Gunakan Jump agar tidak jatuh.'],
      concepts: ['daily'],
      grid: ['#'.repeat(width), row, '#'.repeat(width)],
      dir: 0,
      require: { coins: cells.filter(function (c) { return c === 'c'; }).length, energy: cells.filter(function (c) { return c === 'E'; }).length, button: false },
      parBlocks: 4,
      stepTarget: row.length - 3,
      maxBlocks: 20,
      daily: true
    };
  }

  /** XML awal untuk level debugging (sengaja salah). */
  function buggyProgramXml() {
    return '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="ca_when_start" x="30" y="30"><statement name="DO">' +
      '<block type="ca_move_forward"><next><block type="ca_move_forward"><next>' +
      '<block type="ca_turn_left"><next><block type="ca_move_forward"><next>' +
      '<block type="ca_turn_right"><next><block type="ca_move_forward"><next>' +
      '<block type="ca_turn_right"><next><block type="ca_move_forward"><next>' +
      '<block type="ca_move_forward">' +
      '</block></next></block></next></block></next></block></next></block></next></block></next></block></next></block>' +
      '</statement></block></xml>';
  }

  CA.LEVELS = LEVELS;
  CA.CURRICULUM = CURRICULUM;
  CA.SANDBOX = SANDBOX;
  CA.getLevel = getLevel;
  CA.createDailyLevel = createDailyLevel;
  CA.buggyProgramXml = buggyProgramXml;
})(typeof window !== 'undefined' ? window : globalThis);
