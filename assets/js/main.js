/* Simulasi ASAS SMP Bina Putra — Matematika Kelas VIII & IX
   Statis, tanpa server. Tiap kelas punya bank soal sendiri: 80 soal,
   2 varian per indikator 1-40. Tiap sesi: 1 varian acak per indikator,
   urutan soal diacak, urutan pilihan PG/Menjodohkan diacak.
   Skor otomatis: 30 soal. Kelas 7 masih Segera Hadir. */
(function () {
  'use strict';

  var TOTAL_TIME = 120 * 60; // 120 menit, dalam detik
  var AUTO_TYPES = ['PG', 'Benar-Salah', 'Menjodohkan'];
  var HISTORY_KEY = 'asas_bina_putra_history';

  /* Bank soal per kelas (diisi saat halaman dimuat). Kelas 7 belum ada. */
  var GRADES = {
    '8': {
      roman: 'VIII', file: 'assets/data/questions-8.json',
      materi: [['Bilangan Berpangkat', 14], ['Teorema Pythagoras', 14], ['PLSV dan PtLSV', 12]],
      note: 'Kelas 8: Bilangan Berpangkat, Teorema Pythagoras, dan PLSV dan PtLSV.'
    },
    '9': {
      roman: 'IX', file: 'assets/data/questions.json',
      materi: [['SPLDV', 10], ['Bangun Ruang Sisi Datar', 11], ['Lingkaran', 9], ['Bangun Ruang Sisi Lengkung', 10]],
      note: 'Kelas 9: SPLDV, Bangun Ruang Sisi Datar, Lingkaran, dan Bangun Ruang Sisi Lengkung.'
    }
  };
  var banks = {};            // bank soal per kelas: { '8': [...], '9': [...] }
  var selectedGrade = '9';   // kelas yang dipilih di halaman awal (default: 9)

  var bank = [];
  var session = [];      // 40 soal terpilih untuk sesi ini (dengan _options bila ada)
  var answers = [];      // jawaban siswa, sejajar dengan session (string atau null)
  var current = 0;
  var remaining = TOTAL_TIME;
  var timerId = null;
  var student = { nama: '', kelas: '' };
  var submitted = false;

  var $ = function (id) { return document.getElementById(id); };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  /* ---------- Pengacakan sesi ---------- */
  function buildSession() {
    var byIndikator = {};
    bank.forEach(function (q) {
      (byIndikator[q.indikator] = byIndikator[q.indikator] || []).push(q);
    });
    var picked = [];
    Object.keys(byIndikator).sort(function (a, b) { return a - b; }).forEach(function (key) {
      var variants = byIndikator[key];
      var chosen = variants[Math.floor(Math.random() * variants.length)];
      var copy = Object.assign({}, chosen);
      if (copy.tipe === 'PG' || copy.tipe === 'Menjodohkan') {
        copy._options = shuffle(copy.pilihan);
      }
      picked.push(copy);
    });
    session = shuffle(picked);
    answers = session.map(function () { return null; });
    current = 0;
    submitted = false;
  }

  /* ---------- Layar ---------- */
  function show(id) {
    ['screen-start', 'screen-test', 'screen-result'].forEach(function (s) {
      $(s).hidden = (s !== id);
    });
    window.scrollTo(0, 0);
  }

  /* ---------- Riwayat (localStorage) ---------- */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveHistory(entry) {
    var h = loadHistory();
    h.unshift(entry);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 10))); } catch (e) {}
  }
  function renderHistory() {
    var h = loadHistory();
    var list = $('history-list');
    list.innerHTML = '';
    $('history-empty').hidden = h.length > 0;
    $('btn-clear-history').hidden = h.length === 0;
    h.forEach(function (e) {
      var li = el('li');
      var gradePart = e.tingkat && GRADES[e.tingkat] ? ' [Kelas ' + GRADES[e.tingkat].roman + ']' : '';
      li.textContent = e.tanggal + ' — ' + e.nama + gradePart + ' (' + e.kelas + '): ' +
        e.benar + ' benar dari 30, nilai ' + e.nilai;
      list.appendChild(li);
    });
  }

  /* ---------- Timer ---------- */
  function fmtTime(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(s);
  }
  function startTimer() {
    stopTimer();
    remaining = TOTAL_TIME;
    var timerEl = $('timer');
    timerEl.textContent = fmtTime(remaining);
    timerEl.classList.remove('danger');
    timerId = setInterval(function () {
      remaining -= 1;
      timerEl.textContent = fmtTime(Math.max(remaining, 0));
      if (remaining <= 600) timerEl.classList.add('danger');
      if (remaining <= 0) {
        stopTimer();
        alert('Waktu habis. Jawabanmu dikumpulkan otomatis.');
        submitTest(true);
      }
    }, 1000);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  /* ---------- Tampilan soal ---------- */
  function answeredCount() {
    return answers.filter(function (a) { return a !== null && String(a).trim() !== ''; }).length;
  }

  function renderNav() {
    var grid = $('nav-grid');
    grid.innerHTML = '';
    session.forEach(function (q, i) {
      var b = el('button', String(i + 1), 'nav-btn');
      b.type = 'button';
      if (answers[i] !== null && String(answers[i]).trim() !== '') b.classList.add('done');
      if (i === current) b.classList.add('current');
      b.addEventListener('click', function () { saveCurrentAnswer(); current = i; renderQuestion(); });
      grid.appendChild(b);
    });
    $('test-progress').textContent = 'Terjawab ' + answeredCount() + ' dari 40';
  }

  function saveCurrentAnswer() {
    var input = $('q-input');
    if (!input) return;
    var q = session[current];
    if (q.tipe === 'PG' || q.tipe === 'Benar-Salah' || q.tipe === 'Menjodohkan') {
      var checked = input.querySelector('input[type="radio"]:checked');
      answers[current] = checked ? checked.value : null;
    } else if (q.tipe === 'Isian Singkat') {
      var v = input.querySelector('input').value.trim();
      answers[current] = v === '' ? null : v;
    } else if (q.tipe === 'Uraian') {
      var t = input.querySelector('textarea').value.trim();
      answers[current] = t === '' ? null : t;
    }
  }

  function renderQuestion() {
    var q = session[current];
    $('q-number').textContent = 'Soal ' + (current + 1) + ' dari 40';
    $('q-type').textContent = q.tipe;
    var materiLabel = { SPLDV: 'SPLDV', BRSD: 'Bangun Ruang Sisi Datar', Lingkaran: 'Lingkaran', BRSL: 'Bangun Ruang Sisi Lengkung' };
    $('q-materi').textContent = materiLabel[q.materi] || q.materi;
    $('q-text').textContent = q.soal;

    var card = $('q-text').parentNode;
    var oldImg = card.querySelector('.question-image');
    if (oldImg) oldImg.remove();
    if (q.gambar) {
      var qimg = document.createElement('img');
      qimg.className = 'question-image';
      qimg.src = q.gambar;
      qimg.alt = 'Gambar soal ' + q.id;
      card.insertBefore(qimg, $('q-input'));
    }

    var box = $('q-input');
    box.innerHTML = '';
    var saved = answers[current];

    if (q.tipe === 'PG' || q.tipe === 'Menjodohkan') {
      if (q.tipe === 'Menjodohkan') box.appendChild(el('p', 'Pilih pasangan yang tepat:', 'hint'));
      var letters = ['A', 'B', 'C', 'D'];
      q._options.forEach(function (opt, i) {
        var label = el('label', null, 'option');
        var radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'answer'; radio.value = opt;
        if (saved === opt) radio.checked = true;
        radio.addEventListener('change', function () { answers[current] = opt; renderNav(); });
        label.appendChild(radio);
        label.appendChild(el('span', letters[i] + '. ' + opt));
        box.appendChild(label);
      });
    } else if (q.tipe === 'Benar-Salah') {
      ['Benar', 'Salah'].forEach(function (opt) {
        var label = el('label', null, 'option');
        var radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'answer'; radio.value = opt;
        if (saved === opt) radio.checked = true;
        radio.addEventListener('change', function () { answers[current] = opt; renderNav(); });
        label.appendChild(radio);
        label.appendChild(el('span', opt));
        box.appendChild(label);
      });
    } else if (q.tipe === 'Isian Singkat') {
      box.appendChild(el('p', 'Tulis angka saja, tanpa satuan.', 'hint'));
      var inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'decimal'; inp.placeholder = 'Contoh: 120';
      inp.value = saved || '';
      inp.addEventListener('input', function () { answers[current] = inp.value.trim() === '' ? null : inp.value.trim(); renderNav(); });
      box.appendChild(inp);
    } else if (q.tipe === 'Uraian') {
      box.appendChild(el('p', 'Tulis jawabanmu dengan langkah-langkahnya. Soal ini dicek mandiri setelah selesai.', 'hint'));
      var ta = document.createElement('textarea');
      ta.placeholder = 'Tulis jawabanmu di sini...';
      ta.value = saved || '';
      ta.addEventListener('input', function () { answers[current] = ta.value.trim() === '' ? null : ta.value.trim(); renderNav(); });
      box.appendChild(ta);
    }

    $('btn-prev').disabled = current === 0;
    $('btn-next').disabled = current === session.length - 1;
    renderNav();
  }

  /* ---------- Hasil ---------- */
  function isAuto(q) { return AUTO_TYPES.indexOf(q.tipe) !== -1; }

  function submitTest(auto) {
    if (submitted) return;
    if (!auto) {
      var unanswered = answers.filter(function (a) { return a === null || String(a).trim() === ''; }).length;
      var msg = unanswered > 0
        ? 'Masih ada ' + unanswered + ' soal belum dijawab. Tetap kumpulkan?'
        : 'Kumpulkan jawabanmu dan lihat hasil?';
      if (!confirm(msg)) return;
    }
    saveCurrentAnswer();
    submitted = true;
    stopTimer();

    var benar = 0;
    session.forEach(function (q, i) {
      if (isAuto(q) && answers[i] !== null && String(answers[i]).trim() === String(q.jawaban).trim()) benar += 1;
    });
    var nilai = Math.round(benar / 30 * 100);

    $('result-student').textContent = student.nama + ' (' + student.kelas + ')';
    $('result-score').textContent = nilai;
    $('result-summary').textContent = 'Jawaban benar: ' + benar + ' dari 30 soal yang dinilai otomatis.';

    var dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    saveHistory({ nama: student.nama, kelas: student.kelas, tingkat: selectedGrade, tanggal: dateStr, benar: benar, nilai: nilai });

    var list = $('review-list');
    list.innerHTML = '';
    session.forEach(function (q, i) {
      var item = el('div', null, 'review-item');
      var head = el('div', null, 'review-head');
      head.appendChild(el('strong', 'Soal ' + (i + 1) + ' — ' + q.tipe + ' (' + q.materi + ')'));
      var verdict;
      if (isAuto(q)) {
        var ok = answers[i] !== null && String(answers[i]).trim() === String(q.jawaban).trim();
        verdict = el('span', answers[i] === null || String(answers[i]).trim() === '' ? 'Tidak dijawab' : (ok ? 'Benar' : 'Salah'),
          'verdict ' + (answers[i] === null || String(answers[i]).trim() === '' ? 'verdict-empty' : (ok ? 'verdict-correct' : 'verdict-wrong')));
      } else {
        verdict = el('span', 'Cek Mandiri — tidak masuk skor otomatis', 'verdict verdict-self');
      }
      head.appendChild(verdict);
      item.appendChild(head);
      item.appendChild(el('p', q.soal, 'review-q'));

      if (q.gambar) {
        var rimg = document.createElement('img');
        rimg.className = 'question-image';
        rimg.src = q.gambar;
        rimg.alt = 'Gambar soal ' + q.id;
        item.appendChild(rimg);
      }

      var ans = el('p', null, 'review-answer');
      ans.appendChild(el('strong', 'Jawabanmu: '));
      ans.appendChild(document.createTextNode(answers[i] === null || String(answers[i]).trim() === '' ? '— (tidak dijawab)' : String(answers[i])));
      item.appendChild(ans);

      if (isAuto(q)) {
        var key = el('p', null, 'review-answer');
        key.appendChild(el('strong', 'Jawaban benar: '));
        key.appendChild(document.createTextNode(String(q.jawaban)));
        item.appendChild(key);
      } else {
        var box = el('div', null, 'review-key');
        box.appendChild(el('strong', 'Kunci jawaban (cek mandiri): '));
        box.appendChild(document.createTextNode(String(q.jawaban)));
        item.appendChild(box);
      }

      var disc = el('div', null, 'review-discussion');
      disc.appendChild(el('strong', 'Pembahasan: '));
      disc.appendChild(document.createTextNode(q.pembahasan || ''));
      item.appendChild(disc);

      list.appendChild(item);
    });

    show('screen-result');
  }

  /* ---------- Pemilih kelas ---------- */
  function selectGrade(grade) {
    if (!GRADES[grade] || !banks[grade]) return;
    selectedGrade = grade;
    var meta = GRADES[grade];
    Array.prototype.forEach.call(document.querySelectorAll('.grade-btn'), function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-grade') === grade);
    });
    $('hero-sub').textContent = 'Matematika Kelas ' + meta.roman + ' — ASAS Ganjil 2026/2027';
    $('grade-note').textContent = meta.note;
    var rows = $('materi-rows');
    rows.innerHTML = '';
    meta.materi.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.appendChild(el('td', row[0]));
      tr.appendChild(el('td', String(row[1])));
      rows.appendChild(tr);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.footer'), function (f) {
      f.textContent = 'Simulasi ASAS SMP Bina Putra · Matematika Kelas ' + meta.roman + ' · Kurikulum Merdeka';
    });
  }

  /* ---------- Mulai / navigasi ---------- */
  function startTest() {
    bank = banks[selectedGrade];
    buildSession();
    $('test-student').textContent = student.nama + ' (' + student.kelas + ')';
    show('screen-test');
    renderQuestion();
    startTimer();
  }

  function init() {
    renderHistory();
    selectGrade(selectedGrade);
    if (!banks['8']) {
      var btn8 = document.querySelector('.grade-btn[data-grade="8"]');
      if (btn8) { btn8.disabled = true; btn8.innerHTML = 'Kelas 8<span class="badge-soon">Segera Hadir</span>'; }
    }
    Array.prototype.forEach.call(document.querySelectorAll('.grade-btn'), function (btn) {
      btn.addEventListener('click', function () {
        if (!btn.disabled) selectGrade(btn.getAttribute('data-grade'));
      });
    });
    $('btn-clear-history').addEventListener('click', function () {
      if (confirm('Hapus semua riwayat skor di perangkat ini?')) {
        try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
        renderHistory();
      }
    });

    $('start-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var nama = $('input-nama').value.trim();
      var kelas = $('input-kelas').value.trim();
      if (!nama || !kelas) { alert('Isi nama dan kelas dulu ya.'); return; }
      student = { nama: nama, kelas: kelas };
      startTest();
    });

    $('btn-prev').addEventListener('click', function () {
      if (current > 0) { saveCurrentAnswer(); current -= 1; renderQuestion(); }
    });
    $('btn-next').addEventListener('click', function () {
      if (current < session.length - 1) { saveCurrentAnswer(); current += 1; renderQuestion(); }
    });
    $('btn-finish').addEventListener('click', function () { submitTest(false); });
    $('btn-retry').addEventListener('click', function () { startTest(); });
    $('btn-home').addEventListener('click', function () { renderHistory(); show('screen-start'); });
  }

  /* Muat bank Kelas 9 (wajib), lalu bank Kelas 8 (opsional: bila gagal,
     tombol Kelas 8 dinonaktifkan dan situs tetap berjalan untuk Kelas 9). */
  fetch('assets/data/questions.json')
    .then(function (r) { if (!r.ok) throw new Error('Gagal memuat bank soal Kelas 9 (' + r.status + ')'); return r.json(); })
    .then(function (data) {
      banks['9'] = data;
      bank = data;
      return fetch('assets/data/questions-8.json')
        .then(function (r) { if (!r.ok) throw new Error('Gagal memuat bank soal Kelas 8 (' + r.status + ')'); return r.json(); })
        .then(function (data8) { banks['8'] = data8; })
        .catch(function () { banks['8'] = null; });
    })
    .then(function () {
      init();
    })
    .catch(function (err) {
      document.body.innerHTML = '<main class="container"><div class="card"><h2>Bank soal tidak bisa dimuat</h2><p>' +
        err.message + '</p><p>Pastikan file assets/data/questions.json ada dan buka situs ini lewat server lokal atau GitHub Pages, bukan langsung dari file.</p></div></main>';
    });
})();
