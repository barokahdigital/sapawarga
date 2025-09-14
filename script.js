document.addEventListener("DOMContentLoaded", () => {
  const el = s => document.querySelector(s);
  const els = s => Array.from(document.querySelectorAll(s));
  const IDR = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);

  /* ---------------- Storage keys & helpers ---------------- */
  const LS = { warga:'rt_warga_v4', keu:'rt_keu_v4', logo:'rt_logo_v4', accounts:'rt_accounts_v1' };
  function load(k, fallback){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fallback }catch(e){ return fallback; } }
  function save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ console.warn('save error',e); } }

  /* ---------------- Initial state (demo) ---------------- */
  let warga = load(LS.warga, [
    { id:'w_1', nik:'3201', nama:'Budi', tgl_lahir:'1985-06-10', rt:4, rw:1, jk:'L', job:'Petani', penghasilan:1500000 },
    { id:'w_2', nik:'3202', nama:'Siti', tgl_lahir:'1990-02-15', rt:4, rw:1, jk:'P', job:'Guru', penghasilan:2500000 },
    { id:'w_3', nik:'w3', nama:'Andi', tgl_lahir:'2012-09-05', rt:4, rw:1, jk:'L', job:'Pelajar', penghasilan:0 }
  ]);

  let keuangan = load(LS.keu, [
    { id:'k_1', tgl:'2025-08-01', ket:'Sumbangan RT', kategori:'Donasi', masuk:500000, keluar:0 },
    { id:'k_2', tgl:'2025-08-05', ket:'Beli Alat', kategori:'Umum', masuk:0, keluar:150000 },
    { id:'k_3', tgl:'2025-08-10', ket:'Iuran Ronda', kategori:'Ronda', masuk:200000, keluar:0 },
    { id:'k_4', tgl:'2025-08-12', ket:'Pembelian Snack', kategori:'Insiba', masuk:0, keluar:50000 }
  ]);

  let accounts = load(LS.accounts, { Insiba:0, Ronda:0, Donasi:0, Umum:0 });

  /* load saved logo if exist */
  const savedLogo = load(LS.logo, null);
  if(savedLogo){ if(el('#logoMain')) el('#logoMain').src = savedLogo; if(el('#logoLogin')) el('#logoLogin').src = savedLogo; }

  /* ---------------- Auth ---------------- */
  let currentRole = null;
  window.fillDemo = function(){ el('#username').value='admin'; el('#password').value='admin123'; }
  window.login = function(){
    const u = el('#username').value.trim(), p = el('#password').value.trim();
    if(u==='admin' && p==='admin123') currentRole='admin';
    else if(u==='user' && p==='user123') currentRole='user';
    else { alert('Creds salah! (admin/admin123, user/user123)'); return; }
    el('#loginPage').classList.add('hidden');
    el('#app').classList.remove('hidden');
    if(currentRole!=='admin') els('.adminOnly').forEach(x=>x.classList.add('hidden'));
    startClock(); renderAll(); loadInitialBalancesToForm();
  }
  window.logout = function(){ location.reload(); }
  window.openReadme = function(){ new bootstrap.Modal(document.getElementById('modalReadme')).show(); }

  /* ---------------- Clock ---------------- */
  function startClock(){ updateClock(); if(window._clockInterval) clearInterval(window._clockInterval); window._clockInterval = setInterval(updateClock,1000); }
  function updateClock(){ const now=new Date(); const hari=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()]; const fmt = now.toLocaleString('id-ID',{ day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}); el('#dateTime').textContent = `${hari}, ${fmt}`; }

  /* ---------------- Utilities ---------------- */
  function uid(prefix='id'){ return prefix + '_' + Date.now().toString(36).slice(4) + Math.random().toString(36).slice(2,6); }
  function calcAge(birthStr){ if(!birthStr) return null; const b = new Date(birthStr); const now = new Date(); let age = now.getFullYear() - b.getFullYear(); const m = now.getMonth() - b.getMonth(); if(m < 0 || (m === 0 && now.getDate() < b.getDate())) age--; return age; }
  function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  /* ---------------- Render Warga & Demografi ---------------- */
  function renderWargaTable(){
    const tbody = el('#tableWarga tbody'); tbody.innerHTML='';
    warga.forEach((w) => {
      const age = calcAge(w.tgl_lahir);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(w.nik||'')}</td>
        <td>${escapeHtml(w.nama||'')}</td>
        <td>${w.tgl_lahir||''}</td>
        <td>${age===null?'':age+' th'}</td>
        <td>${w.rt||''}</td><td>${w.rw||''}</td><td>${w.jk||''}</td>
        <td>${escapeHtml(w.job||'')}</td><td>${IDR(w.penghasilan||0)}</td>
        <td>${
          currentRole==='admin' ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="editWarga('${w.id}')">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteWarga('${w.id}')">Hapus</button>` : '-'
        }</td>`;
      tbody.appendChild(tr);
    });
    bindSearch('#searchWarga','#tableWarga');
  }

  function computeDemografi(){
    const total = warga.length;
    const laki = warga.filter(w => (w.jk||'').toUpperCase()==='L').length;
    const perempuan = warga.filter(w => (w.jk||'').toUpperCase()==='P').length;
    const jobSet = new Set(warga.map(w => (w.job||'').trim()).filter(Boolean));
    const pekerjaanCount = jobSet.size;
    let anak=0, dewasa=0, lansia=0;
    warga.forEach(w => { const a = calcAge(w.tgl_lahir); if(a===null) return; if(a < 18) anak++; else if(a >= 60) lansia++; else dewasa++; });
    return { total, laki, perempuan, pekerjaanCount, anak, dewasa, lansia };
  }

  let chartDem = null;
  function updateDemografiUI(){
    const d = computeDemografi();
    el('#s_total').textContent = d.total;
    el('#s_laki').textContent = d.laki;
    el('#s_perempuan').textContent = d.perempuan;
    el('#s_pekerjaan').textContent = d.pekerjaanCount;
    el('#s_anak').textContent = d.anak;
    el('#s_dewasa').textContent = d.dewasa;
    el('#s_lansia').textContent = d.lansia;

    const ctx = el('#chartDemografi');
    if(ctx && typeof Chart !== 'undefined'){
      if(chartDem) chartDem.destroy();
      chartDem = new Chart(ctx, {
        type:'doughnut',
        data:{ labels:['Laki-laki','Perempuan','Anak','Dewasa','Lansia'], datasets:[{ data:[d.laki, d.perempuan, d.anak, d.dewasa, d.lansia], backgroundColor:['#3b82f6','#8b5cf6','#f59e0b','#10b981','#60a5fa'] }] },
        options:{ responsive:true, plugins:{legend:{position:'bottom'}}}
      });
    }
  }

  /* ---------------- Render Keuangan & Aggregation ---------------- */
  let chartKeu = null;
  function renderKeuanganTable(){
    const tbody = el('#tableKeuangan tbody'); tbody.innerHTML='';
    const filter = (el('#filterKategori') && el('#filterKategori').value) || '';
    // compute running starting from sum of initial balances
    const init = load(LS.accounts, { Insiba:0, Ronda:0, Donasi:0, Umum:0 });
    let running = Object.values(init).reduce((a,b)=>a+(+b||0),0);
    // sort by date
    const arr = keuangan.slice().sort((a,b)=> (a.tgl||'').localeCompare(b.tgl||''));
    arr.forEach((k)=>{
      if(filter && k.kategori !== filter) return;
      running += (+k.masuk||0) - (+k.keluar||0);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${k.tgl||''}</td><td>${escapeHtml(k.ket||'')}</td><td>${escapeHtml(k.kategori||'Umum')}</td><td>${IDR(k.masuk||0)}</td><td>${IDR(k.keluar||0)}</td><td>${IDR(running)}</td>
        <td>${currentRole==='admin' ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="editKeu('${k.id}')">Edit</button><button class="btn btn-sm btn-outline-danger" onclick="deleteKeu('${k.id}')">Hapus</button>` : '-'}</td>`;
      tbody.appendChild(tr);
    });
    bindSearch('#searchKeu','#tableKeuangan');
  }

  function computeAccountBalances(){
    const acc = load(LS.accounts, { Insiba:0, Ronda:0, Donasi:0, Umum:0 });
    const totals = { Insiba:+acc.Insiba||0, Ronda:+acc.Ronda||0, Donasi:+acc.Donasi||0, Umum:+acc.Umum||0 };
    // ensure keys exist
    ['Insiba','Ronda','Donasi','Umum'].forEach(k=>{ if(!(k in totals)) totals[k]=0; });
    keuangan.forEach(k => {
      const cat = k.kategori || 'Umum';
      const delta = (+k.masuk||0) - (+k.keluar||0);
      if(!(cat in totals)) totals[cat] = 0;
      totals[cat] += delta;
    });
    const masuk = keuangan.reduce((s,k)=> s + (+k.masuk||0), 0);
    const keluar = keuangan.reduce((s,k)=> s + (+k.keluar||0), 0);
    const overall = Object.values(totals).reduce((a,b)=>a+(+b||0),0);
    return { totals, masuk, keluar, overall };
  }

  function updateKeuanganUI(){
    const s = computeAccountBalances();
    el('#k_total_in').textContent = IDR(s.masuk);
    el('#k_total_out').textContent = IDR(s.keluar);
    el('#k_insiba').textContent = IDR(s.totals.Insiba || 0);
    el('#k_ronda').textContent = IDR(s.totals.Ronda || 0);
    el('#k_donasi').textContent = IDR(s.totals.Donasi || 0);
    el('#k_umum').textContent = IDR(s.totals.Umum || s.totals.Umum || s.totals.Umum === 0 ? s.totals.Umum : 0);

    const ctx = el('#chartKeuangan');
    if(ctx && typeof Chart !== 'undefined'){
      if(chartKeu) chartKeu.destroy();
      const labels = ['Insiba','Ronda','Donasi','Umum'];
      const data = labels.map(l => s.totals[l] || 0);
      chartKeu = new Chart(ctx, {
        type:'bar',
        data:{ labels, datasets:[{ label:'Saldo per Kas', data, backgroundColor: labels.map((_,i)=>['#16a34a','#ef4444','#0ea5e9','#f97316'][i%4]) }]},
        options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } }
      });
    }
  }

  /* ---------------- CRUD: Warga ---------------- */
  function saveWargaFromAdmin(){
    if(currentRole!=='admin') return alert('Hanya admin.');
    const id = uid('w');
    const w = {
      id,
      nik: el('#fNIK').value.trim(),
      nama: el('#fNama').value.trim(),
      tgl_lahir: el('#fTglLahir').value || '',
      rt: el('#fRT').value.trim(),
      rw: el('#fRW').value.trim(),
      jk: el('#fJK').value || '',
      job: el('#fJob').value.trim(),
      penghasilan: +el('#fPenghasilan').value || 0
    };
    if(!w.nama){ return alert('Nama wajib diisi'); }
    warga.push(w); save(LS.warga, warga); resetWargaForm(); renderAll();
  }
  window.saveWargaFromAdmin = saveWargaFromAdmin;
  function resetWargaForm(){ ['#fNIK','#fNama','#fTglLahir','#fRT','#fRW','#fJK','#fJob','#fPenghasilan'].forEach(id=>{ if(el(id)) el(id).value=''; }); }

  function editWarga(id){
    const w = warga.find(x=>x.id===id); if(!w) return alert('Tidak ditemukan');
    el('#fNIK').value = w.nik || '';
    el('#fNama').value = w.nama || '';
    el('#fTglLahir').value = w.tgl_lahir || '';
    el('#fRT').value = w.rt || '';
    el('#fRW').value = w.rw || '';
    el('#fJK').value = w.jk || '';
    el('#fJob').value = w.job || '';
    el('#fPenghasilan').value = w.penghasilan || 0;
    const btn = el('#btnSaveWarga');
    btn.textContent = 'Update Warga';
    btn.onclick = () => {
      w.nik = el('#fNIK').value.trim();
      w.nama = el('#fNama').value.trim();
      w.tgl_lahir = el('#fTglLahir').value || '';
      w.rt = el('#fRT').value.trim();
      w.rw = el('#fRW').value.trim();
      w.jk = el('#fJK').value || '';
      w.job = el('#fJob').value.trim();
      w.penghasilan = +el('#fPenghasilan').value || 0;
      save(LS.warga, warga); renderAll();
      btn.textContent = 'Simpan Warga';
      btn.onclick = saveWargaFromAdmin;
      resetWargaForm();
      document.querySelector('#tabs .nav-link[data-target="data"]').click();
    };
    document.querySelector('#tabs .nav-link[data-target="admin"]').click();
  }
  window.editWarga = editWarga;
  function deleteWarga(id){ if(currentRole!=='admin') return alert('Hanya admin.'); if(!confirm('Hapus data warga?')) return; warga = warga.filter(w => w.id !== id); save(LS.warga, warga); renderAll(); }
  window.deleteWarga = deleteWarga;

  /* ---------------- CRUD: Keuangan ---------------- */
  function saveKeuFromAdmin(){
    if(currentRole!=='admin') return alert('Hanya admin.');
    const id = uid('k');
    const k = {
      id,
      tgl: el('#fTgl').value || new Date().toISOString().slice(0,10),
      ket: el('#fKet').value.trim() || '-',
      kategori: el('#fKategori').value || 'Umum',
      masuk: +el('#fMasuk').value || 0,
      keluar: +el('#fKeluar').value || 0
    };
    if(k.masuk===0 && k.keluar===0) return alert('Isi pemasukan atau pengeluaran.');
    keuangan.push(k); save(LS.keu, keuangan); resetKeuForm(); renderAll();
  }
  window.saveKeuFromAdmin = saveKeuFromAdmin;
  function resetKeuForm(){ ['#fTgl','#fKet','#fKategori','#fMasuk','#fKeluar'].forEach(id=>{ if(el(id)) el(id).value=''; }); }

  function editKeu(id){
    const k = keuangan.find(x=>x.id===id); if(!k) return alert('Tidak ditemukan');
    el('#fTgl').value = k.tgl || '';
    el('#fKet').value = k.ket || '';
    el('#fKategori').value = k.kategori || 'Umum';
    el('#fMasuk').value = k.masuk || 0;
    el('#fKeluar').value = k.keluar || 0;
    const btn = el('#btnSaveKeu');
    btn.textContent = 'Update Keuangan';
    btn.onclick = () => {
      k.tgl = el('#fTgl').value || new Date().toISOString().slice(0,10);
      k.ket = el('#fKet').value.trim() || '-';
      k.kategori = el('#fKategori').value || 'Umum';
      k.masuk = +el('#fMasuk').value || 0;
      k.keluar = +el('#fKeluar').value || 0;
      save(LS.keu, keuangan); renderAll();
      btn.textContent = 'Simpan Keuangan';
      btn.onclick = saveKeuFromAdmin;
      resetKeuForm();
      document.querySelector('#tabs .nav-link[data-target="keuangan"]').click();
    };
    document.querySelector('#tabs .nav-link[data-target="admin"]').click();
  }
  window.editKeu = editKeu;
  function deleteKeu(id){ if(currentRole!=='admin') return alert('Hanya admin.'); if(!confirm('Hapus catatan keuangan?')) return; keuangan = keuangan.filter(k => k.id !== id); save(LS.keu, keuangan); renderAll(); }
  window.deleteKeu = deleteKeu;

  /* ---------------- Initial balances (accounts) ---------------- */
  function loadInitialBalancesToForm(){
    const acc = load(LS.accounts, { Insiba:0, Ronda:0, Donasi:0, Umum:0 });
    el('#bInsiba').value = acc.Insiba || 0;
    el('#bRonda').value = acc.Ronda || 0;
    el('#bDonasi').value = acc.Donasi || 0;
    el('#bUmum').value = acc.Umum || acc.Umum || acc.Umum === 0 ? acc.Umum : 0;
  }
  function saveInitialBalances(){
    const acc = { Insiba:+el('#bInsiba').value||0, Ronda:+el('#bRonda').value||0, Donasi:+el('#bDonasi').value||0, Umum:+el('#bUmum').value||0 };
    save(LS.accounts, acc); accounts = acc; alert('Saldo awal disimpan.'); renderAll();
  }
  window.saveInitialBalances = saveInitialBalances;

  /* ---------------- Logo upload ---------------- */
  window.handleLogoUpload = function(e){
    const f = e.target.files[0]; if(!f) return alert('Pilih gambar.');
    const r = new FileReader();
    r.onload = ev => { const data = ev.target.result; if(el('#logoMain')) el('#logoMain').src = data; if(el('#logoLogin')) el('#logoLogin').src = data; save(LS.logo, data); alert('Logo tersimpan (localStorage).'); };
    r.readAsDataURL(f);
  }

  /* ---------------- Export / Print helpers ---------------- */
  function exportCSV(tableId){
    const table = document.getElementById(tableId);
    if(!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows.map(row => {
      const cols = Array.from(row.querySelectorAll('th,td'));
      return cols.map(c => `"${(c.innerText||'').replace(/"/g,'""')}"`).join(',');
    }).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = tableId + '.csv'; a.click(); URL.revokeObjectURL(a.href);
  }
  window.exportCSV = exportCSV;

  function exportTablePrint(tableId, title){
    const table = document.getElementById(tableId);
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>'+title+'</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"></head><body>');
    w.document.write('<h3>'+title+'</h3>');
    w.document.write(table.outerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  }
  window.exportTablePrint = exportTablePrint;

  /* ---------------- Search binding ---------------- */
  function bindSearch(inpSel, tableSel){
    const inp = document.querySelector(inpSel); if(!inp) return;
    inp.addEventListener('input', ()=> {
      const q = inp.value.toLowerCase();
      Array.from(document.querySelectorAll(tableSel + ' tbody tr')).forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ---------------- Tabs binding ---------------- */
  els('#tabs .nav-link').forEach(a=>{
    a.addEventListener('click', ()=>{
      els('#tabs .nav-link').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      const tgt = a.dataset.target;
      ['dashboard','data','keuangan','admin'].forEach(id=>{
        const node = document.getElementById(id); if(!node) return;
        if(id===tgt) node.classList.remove('hidden'); else node.classList.add('hidden');
      });
    });
  });

  /* ---------------- Render all ---------------- */
  function renderAll(){
    renderWargaTable();
    updateDemografiUI();
    renderKeuanganTable();
    updateKeuanganUI();
    loadInitialBalancesToForm();
  }

  // listeners
  if(el('#filterKategori')) el('#filterKategori').addEventListener('change', ()=> renderKeuanganTable());

  // expose debug
  window._debug = { getWarga:()=>warga, getKeuangan:()=>keuangan, getAccounts:()=>load(LS.accounts) };

});