// Plaatide, liimi ja vuugitäite kalkulaator
import { num, val, line, seg, load, save } from '../util.js';

export default {
  id: 'plaadid',
  icon: 'plaadid',
  short: 'Plaadid, vuuk',
  title: 'Plaadid, liim, vuuk',
  desc: 'Kogused ja pakid',
  render(el) {
    const st = load('plaadid', {
      m2: '', a: '60', b: '60', varu: '10', pakk: '1,44',
      liim: '4', kott: '25', vl: '3', vs: '8', vkott: '5', lad: 'otse',
    });
    el.innerHTML = `
      <div class="card">
        <label>Pind (m²)</label>
        <div class="row">
          <input id="m2" inputmode="decimal" placeholder="nt 12,5" value="${st.m2}">
          <div class="seg" id="from"><button data-v="porand">Põrand</button><button data-v="seinad">Seinad</button></div>
        </div>
        <p class="note" style="margin-top:6px">Nupud võtavad pinna ruutude kalkulaatorist.</p>
        <div class="row">
          <div><label>Plaadi laius (cm)</label><input id="a" inputmode="decimal" value="${st.a}"></div>
          <div><label>Plaadi pikkus (cm)</label><input id="b" inputmode="decimal" value="${st.b}"></div>
        </div>
        <label>Ladumine</label>
        <div class="seg" id="lad"><button data-v="otse">Otse (10%)</button><button data-v="diag">Diagonaal (15%)</button><button data-v="muu">Muu</button></div>
        <div class="row">
          <div><label>Varu (%)</label><input id="varu" inputmode="decimal" value="${st.varu}"></div>
          <div><label>m² pakis</label><input id="pakk" inputmode="decimal" value="${st.pakk}"></div>
        </div>
      </div>
      <div class="result" id="outP"></div>

      <h2>Plaatimisliim</h2>
      <div class="card">
        <div class="row">
          <div><label>Kulu (kg/m²)</label><input id="liim" inputmode="decimal" value="${st.liim}"></div>
          <div><label>Koti kaal (kg)</label><input id="kott" inputmode="decimal" value="${st.kott}"></div>
        </div>
        <p class="note">Ligikaudu: 6 mm hammas ≈ 2,5–3 kg/m², 8 mm ≈ 3,5–4, 10 mm ≈ 4,5–5, suured plaadid topeltliimimisega rohkem. Vaata tootja juhendit.</p>
      </div>
      <div class="result" id="outL"></div>

      <h2>Vuugitäide</h2>
      <div class="card">
        <div class="row3">
          <div><label>Vuuk (mm)</label><input id="vl" inputmode="decimal" value="${st.vl}"></div>
          <div><label>Paksus (mm)</label><input id="vs" inputmode="decimal" value="${st.vs}"></div>
          <div><label>Pakk (kg)</label><input id="vkott" inputmode="decimal" value="${st.vkott}"></div>
        </div>
      </div>
      <div class="result" id="outV"></div>
      <p class="note">Vuugitäite valem: (A+B)/(A×B) × vuugi laius × sügavus × 1,6 kg/dm³ (+10% varu). Tsementvuugi tihedus on ligikaudne, epoksü puhul vaata tootja tabelit.</p>`;

    const $ = (id) => el.querySelector('#' + id);
    const ids = ['m2', 'a', 'b', 'varu', 'pakk', 'liim', 'kott', 'vl', 'vs', 'vkott'];
    $('lad').querySelector(`[data-v="${st.lad}"]`).classList.add('on');

    const calc = () => {
      ids.forEach((id) => (st[id] = $(id).value));
      save('plaadid', st);
      const m2 = val($('m2')), a = val($('a')), b = val($('b')), varu = val($('varu')) / 100;
      const vaja = m2 * (1 + varu);
      const plaat = (a * b) / 10000; // m²
      const tk = plaat ? Math.ceil(vaja / plaat) : 0;
      const pakk = val($('pakk'));
      const pakke = pakk ? Math.ceil(vaja / pakk) : 0;
      $('outP').innerHTML =
        line('Vaja koos varuga', num(vaja) + ' m²') +
        line('Plaate', tk + ' tk', true) +
        line('Pakke', pakke ? pakke + ' pk (' + num(pakke * pakk) + ' m²)' : '—', true);

      const liimKg = m2 * val($('liim'));
      const kott = val($('kott'));
      $('outL').innerHTML =
        line('Liimi kokku', num(liimKg, 1) + ' kg') +
        line('Kotte', kott ? Math.ceil(liimKg / kott) + ' kotti' : '—', true);

      const A = a * 10, B = b * 10; // mm
      const kgm2 = A && B ? ((A + B) / (A * B)) * val($('vl')) * val($('vs')) * 1.6 : 0;
      const vuukKg = kgm2 * m2 * 1.1;
      const vk = val($('vkott'));
      $('outV').innerHTML =
        line('Kulu', num(kgm2) + ' kg/m²') +
        line('Vuugitäidet kokku', num(vuukKg, 1) + ' kg') +
        line('Pakke', vk ? Math.ceil(vuukKg / vk) + ' pk' : '—', true);
    };

    seg($('from'), (v) => {
      const p = load('pind', {});
      if (p[v] != null) $('m2').value = num(p[v]).replace(/\s/g, '');
      calc();
    });
    seg($('lad'), (v) => {
      st.lad = v;
      if (v === 'otse') $('varu').value = '10';
      else if (v === 'diag') $('varu').value = '15';
      else $('varu').focus();
      calc();
    });
    ids.forEach((id) => $(id).addEventListener('input', calc));
    calc();
  },
};
