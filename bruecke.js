// Bild-Brücke – Bausteine für mcp__Claude_Browser__javascript_tool (Stand 14.11.2026)
// Einmal pro Tab den Block "Basis" ausführen, danach die Funktionen über window.bb nutzen.
// Quelle der Bilder: raw-URLs aus `bild.cmd push` (CORS offen, beide Seiten dürfen sie laden).

// ---------- Basis (auf d4guides.gg UND raiddex.com) ----------
window.bb = window.bb || {};
bb.hole = async (url, name) => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('Brücke ' + r.status + ' ' + url);
  const b = await r.blob();
  name = name || decodeURIComponent(url.split('/').pop());
  const ext = name.split('.').pop().toLowerCase();
  const type = /^image\//.test(b.type) ? b.type
    : ({ webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' })[ext];
  return new File([b], name, { type });
};
bb.inInput = (input, file) => {               // Datei in ein echtes <input type=file> legen
  const dt = new DataTransfer(); dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};
bb.masse = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = no; i.src = src; });

// ---------- d4guides.gg (Guide-Editor /en/guides/new oder /en/guides/edit/<slug>) ----------
// Dateiname wird Teil der Server-Adresse: sprechend benennen (z. B. d4-s16-tempern-01-ui.webp).
bb.d4Upload = async file => {                 // → '/assets/img/guide-uploads/39/<name>-<hash>.webp'
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const fd = new FormData(); fd.append('image', file);
  const r = await fetch('/api/v1/guide-media.php', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: fd });
  const j = await r.json();
  if (!j.success) throw new Error('d4guides: ' + j.message);
  return j.data.path;
};
bb.d4Banner = async file => {                 // Hero/Banner über das Dateifeld des Editors (prüft ≥ 1200 px selbst)
  bb.inInput(document.getElementById('ge-hero-file'), file);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const src = document.getElementById('ge-hero-img')?.getAttribute('src') || '';
    if (src.includes('/guide-uploads/')) return src;
  }
  throw new Error('d4guides: Banner nicht gesetzt (Konsole/Alert prüfen)');
};
// Markdown im Body: ![Alt mit Fokus-Keyword](/assets/img/guide-uploads/39/…webp){caption="…"}

// ---------- raiddex.com (Mediathek-Upload geht von jeder /admin-Seite) ----------
bb.rdCsrf = () => document.querySelector('[data-csrf]')?.dataset.csrf
  || document.querySelector('input[name=_csrf]')?.value;
bb.rdUpload = async (file, spiel) => {        // spiel: path-of-exile-2, witcher-3, … oder allgemein
  const fd = new FormData();
  fd.set('file', file); fd.set('spiel', spiel || 'allgemein'); fd.set('_csrf', bb.rdCsrf());
  const r = await fetch('/admin/mediathek/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j.item) throw new Error('RaidDex ' + r.status + ': ' + JSON.stringify(j).slice(0, 300));
  return j;                                   // { item:{id,name,url|path,…}, duplicate }
};
bb.rdAlt = async (id, de, en) => {            // Alt-Text DE/EN in der Mediathek
  for (const [locale, alt] of [['de', de], ['en', en]]) {
    const fd = new FormData(); fd.set('locale', locale); fd.set('alt', alt); fd.set('_csrf', bb.rdCsrf());
    const r = await fetch('/admin/mediathek/' + id + '/alt', { method: 'POST', body: fd, credentials: 'same-origin' });
    if (!r.ok) throw new Error('Alt ' + locale + ' ' + r.status);
  }
  return true;
};
bb.rdKarte = async (q, spiel) => {            // Karte(n) der Mediathek lesen: id, url, Maße, Alt-Texte
  const html = await (await fetch('/admin/mediathek?' + new URLSearchParams({ q, spiel: spiel || '' }), { credentials: 'same-origin' })).text();
  const d = new DOMParser().parseFromString(html, 'text/html');
  return [...d.querySelectorAll('[data-card]')].map(c => ({
    id: c.dataset.id, url: c.dataset.url, w: +c.dataset.width, h: +c.dataset.height,
    altDe: c.querySelector('[data-alt=de]')?.value ?? c.querySelector('[data-alt=de]')?.textContent,
    altEn: c.querySelector('[data-alt=en]')?.value ?? c.querySelector('[data-alt=en]')?.textContent }));
};
bb.rdKopfbild = file => {                     // im Guide-Editor: Kopfbild ins Feld hero_file, danach speichern
  bb.inInput(document.querySelector('input[name=hero_file]'), file);
};
// Bild im Text: <figure><img src="<url>" alt="…" width="…" height="…" loading="lazy"><figcaption>…</figcaption></figure>
