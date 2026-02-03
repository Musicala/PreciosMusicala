'use strict';

/**
 * Sheet nuevo (confirmado por tu error):
 * Headers:
 * - Categoría
 * - Servicio
 * - Estudiantes Nuevos
 * - (col vacía)
 * - Beneficio/Convenios
 *
 * ✅ Tabla: respeta orden EXACTO del Excel (fila por fila)
 * ✅ Galería: images.json + carpetas locales
 *    - gallery/general -> siempre primero
 *    - gallery/nuevos -> por servicio / categoría
 *    - gallery/convenios -> por servicio / categoría
 */

const TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRw8VZmjjgmjRSeriTc2ITE1VtuwDtxCMntos5N8kljm0svs5nMe-nb07vJSx2L6vRo9iT_S7CCIEZe/pub?gid=1700804701&single=true&output=tsv";
const IMAGES_JSON_URL = "./images.json";

let DATA = [];
let COLS = null;
let IMG = { general: [], nuevos: [], convenios: [] };

const qs = (s) => document.querySelector(s);

boot();
initGalleryUi();
bindEvents();

/* =========================
   Boot
========================= */
async function boot(){
  try{
    // 1) Cargar images.json
    IMG = await loadImagesJson();

    // 2) Cargar TSV
    const res = await fetch(TSV_URL, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status + " al cargar TSV");
    const txt = await res.text();

    const lines = txt.replace(/\r/g,"").trim().split("\n");
    if(lines.length < 2) throw new Error("TSV vacío o sin filas suficientes.");

    const headers = lines.shift().split("\t").map(h => (h||"").trim());
    COLS = detectColumns(headers);

    const missing = [];
    if(COLS.cat == null) missing.push("Categoría");
    if(COLS.serv == null) missing.push("Servicio");
    if(COLS.pNuevos == null) missing.push("Estudiantes Nuevos");
    if(COLS.pConv == null) missing.push("Beneficio/Convenios");

    if(missing.length){
      throw new Error(
        "No pude detectar columnas clave en el Sheet.\n" +
        "Faltan: " + missing.join(", ") + "\n\n" +
        "Headers detectados:\n- " + headers.join("\n- ")
      );
    }

    // Parse rows en el orden del Excel
    DATA = lines.map((line, idx)=>{
      const cols = line.split("\t");
      return {
        __row: idx + 2, // por si quieres debug (fila de sheet aprox)
        Categoria: pick(cols, COLS.cat),
        Servicio: pick(cols, COLS.serv),
        PrecioNuevos: pick(cols, COLS.pNuevos),
        PrecioConvenios: pick(cols, COLS.pConv),
      };
    }).filter(r => r.Categoria || r.Servicio || r.PrecioNuevos || r.PrecioConvenios);

    qs("#metaInfo").textContent =
      `Cargadas ${DATA.length} filas. cat=${COLS.cat} · serv=${COLS.serv} · nuevos=${COLS.pNuevos} · convenios=${COLS.pConv}`;

    populateCategories();
    populateSuggestions();
    renderAll();

  }catch(err){
    showError("Error cargando datos:\n" + (err?.message || err));
    console.error(err);
  }
}

async function loadImagesJson(){
  try{
    const r = await fetch(IMAGES_JSON_URL, { cache: "no-store" });
    if(!r.ok) return { general: [], nuevos: [], convenios: [] };
    const j = await r.json();

    // Normalizamos a listas (ordenables)
    return {
      general: Array.isArray(j.general) ? j.general : [],
      nuevos: Array.isArray(j.nuevos) ? j.nuevos : [],
      convenios: Array.isArray(j.convenios) ? j.convenios : [],
    };
  }catch{
    return { general: [], nuevos: [], convenios: [] };
  }
}

/* =========================
   Detect columns by header
========================= */
function detectColumns(headers){
  const norm = headers.map(h => normalize(h));

  const findAny = (needles) => {
    const ns = needles.map(normalize);
    for(let i=0;i<norm.length;i++){
      const h = norm[i];
      for(const n of ns){
        if(n && h.includes(n)) return i;
      }
    }
    return null;
  };

  const cat = findAny(["categoria", "categoría"]);
  const serv = findAny(["servicio", "paquete", "nombre", "item"]);

  const pNuevos = findAny(["estudiantes nuevos", "nuevos", "precio nuevos", "valor nuevos"]);
  const pConv = findAny(["beneficio/convenios", "beneficios/convenios", "beneficio convenios", "convenios", "beneficios", "precio convenios", "valor convenios"]);

  return { cat, serv, pNuevos, pConv };
}

function normalize(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(cols, idx){
  if(idx == null) return "";
  return (cols[idx] || "").trim();
}

/* =========================
   UI helpers
========================= */
function showError(msg){
  const box = qs("#errorBox");
  box.style.display = "block";
  box.textContent = msg;
}

function populateCategories(){
  const sel = qs("#categoryFilter");
  sel.querySelectorAll("option:not(:first-child)").forEach(o=>o.remove());

  // 👇 Respetar orden del Excel: primera vez que aparezca cada categoría
  const seen = new Set();
  for(const r of DATA){
    const c = (r.Categoria || "").trim();
    if(!c) continue;
    if(seen.has(c)) continue;
    seen.add(c);

    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  }
}

function populateSuggestions(){
  const dl = qs("#suggestions");
  dl.innerHTML = "";

  const seen = new Set();
  for(const r of DATA){
    const s = (r.Servicio || "").trim();
    if(!s) continue;
    if(seen.has(s)) continue;
    seen.add(s);

    const o = document.createElement("option");
    o.value = s;
    dl.appendChild(o);

    if(seen.size >= 200) break;
  }
}

function bindEvents(){
  ["categoryFilter","searchInput","chkNuevos","chkConvenios"]
    .forEach(id => qs("#"+id).addEventListener("input", renderAll));
}

/* =========================
   State + Filters
========================= */
function getState(){
  return {
    selectedCat: qs("#categoryFilter").value,
    q: (qs("#searchInput").value || "").toLowerCase(),
    showNuevos: qs("#chkNuevos").checked,
    showConvenios: qs("#chkConvenios").checked,
  };
}

function applyFilters(rows, st){
  return rows.filter(d=>{
    const cat = (d.Categoria || "").trim();
    const serv = (d.Servicio || "").trim();

    if(st.selectedCat && cat !== st.selectedCat) return false;

    if(st.q){
      if(!serv.toLowerCase().includes(st.q)) return false;
    }

    // Si no hay ningún toggle seleccionado, no mostramos nada
    if(!st.showNuevos && !st.showConvenios) return false;

    return true;
  });
}

function getDisplayPrice(row, st){
  // Si ambos están activos, mostramos "Nuevos / Convenios"
  if(st.showNuevos && st.showConvenios){
    const a = row.PrecioNuevos || "—";
    const b = row.PrecioConvenios || "—";
    return `${a} / ${b}`;
  }
  if(st.showNuevos) return row.PrecioNuevos || "";
  return row.PrecioConvenios || "";
}

function getActiveMode(st){
  // Para galería: si ambos ON, priorizamos "nuevos" (como default de ustedes)
  if(st.showNuevos) return "nuevos";
  return "convenios";
}

/* =========================
   Render all
========================= */
function renderAll(){
  const st = getState();
  const filtered = applyFilters(DATA, st);

  qs("#priceHeader").textContent = st.showNuevos
    ? (st.showConvenios ? "Precio (Nuevos / Convenios)" : "Precio (Estudiantes nuevos)")
    : "Precio (Beneficios / Convenios)";

  renderTable(filtered, st);
  renderGallery(filtered, st);
}

/* =========================
   Table (RESPETA ORDEN EXCEL)
========================= */
function renderTable(rows, st){
  const tbody = qs("#tbody");
  tbody.innerHTML = "";

  if(rows.length === 0){
    const tr=document.createElement("tr");
    tr.innerHTML = `<td colspan="3" class="empty">Sin resultados con esos filtros.</td>`;
    tbody.appendChild(tr);
    return;
  }

  // 👇 Render secuencial, con “separador” cuando cambia la categoría
  let lastCat = null;

  for(const r of rows){
    const cat = (r.Categoria || "Sin categoría").trim() || "Sin categoría";

    if(cat !== lastCat){
      const trCat = document.createElement("tr");
      trCat.className = "cat-row";
      trCat.innerHTML = `<td colspan="3">${escapeHtml(cat)}</td>`;
      tbody.appendChild(trCat);
      lastCat = cat;
    }

    const price = getDisplayPrice(r, st);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.Categoria || "")}</td>
      <td>${escapeHtml(r.Servicio || "")}</td>
      <td class="price">${price ? escapeHtml(price) : "<span class='empty'>—</span>"}</td>
    `;
    tbody.appendChild(tr);
  }
}

/* =========================
   Gallery (orden por images.json)
========================= */
function renderGallery(rows, st){
  const wrap = qs("#galleryWrap");
  const grid = qs("#galleryGrid");
  const empty = qs("#galleryEmpty");

  if(wrap.classList.contains("hidden")) return;

  grid.innerHTML = "";
  empty.classList.add("hidden");

  const mode = getActiveMode(st); // "nuevos" | "convenios"
  const list = (mode === "nuevos") ? (IMG.nuevos || []) : (IMG.convenios || []);

  // 1) Generales siempre primero (orden del JSON)
  const general = (IMG.general || []).map(x => normalizeImgItem(x));

  // 2) Servicios filtrados (orden del JSON, filtrado por categoría seleccionada)
  //    La idea es: images.json ya tiene items con:
  //    { src, title, categoria, servicioSlug }
  const selectedCat = (st.selectedCat || "").trim();
  const allowedServiceSlugs = new Set(rows.map(r => slug(r.Servicio)));

  const filteredByMode = list
    .map(x => normalizeImgItem(x))
    .filter(item => {
      // si hay categoría seleccionada, solo esa
      if(selectedCat && item.categoria && item.categoria !== selectedCat) return false;

      // si el item tiene servicioSlug, debe existir en los rows filtrados
      if(item.servicioSlug){
        return allowedServiceSlugs.has(item.servicioSlug);
      }

      // si no tiene servicioSlug, lo dejamos pasar (sirve para “banner” de categoría)
      return true;
    });

  const cards = [...general, ...filteredByMode];

  if(cards.length === 0){
    empty.classList.remove("hidden");
    return;
  }

  for(const c of cards){
    const card = document.createElement("article");
    card.className = "g-card";
    card.innerHTML = `
      <img class="g-img" src="${escapeAttr(c.src)}" alt="${escapeAttr(c.title)}" loading="lazy">
      <div class="g-body">
        <p class="g-title">${escapeHtml(c.title)}</p>
        <div class="g-meta">${escapeHtml(c.meta)}</div>
      </div>
    `;
    grid.appendChild(card);
  }
}

function normalizeImgItem(x){
  // soporta:
  // - string: "ruta.png"
  // - objeto: { src, title, categoria, servicioSlug, meta }
  if(typeof x === "string"){
    return { src: x, title: "Imagen", meta: "" };
  }
  const src = (x?.src || "").trim();
  const title = (x?.title || "Imagen").trim();
  const categoria = (x?.categoria || "").trim();
  const servicioSlug = (x?.servicioSlug || "").trim();
  const meta = (x?.meta || (categoria ? categoria : "")).trim();
  return { src, title, categoria, servicioSlug, meta };
}

/* =========================
   Gallery open/close
========================= */
function initGalleryUi(){
  const wrap = qs("#galleryWrap");
  const btn = qs("#btnToggleGaleria");
  const btnClose = qs("#btnCerrarGaleria");

  btn.addEventListener("click", ()=>{
    const isHidden = wrap.classList.contains("hidden");
    wrap.classList.toggle("hidden");

    if(isHidden){
      btn.textContent = "Ocultar galería";
      renderAll();
      setTimeout(()=> wrap.scrollIntoView({ behavior:"smooth", block:"start" }), 50);
    }else{
      btn.textContent = "Galería (imágenes)";
    }
  });

  btnClose.addEventListener("click", ()=>{
    wrap.classList.add("hidden");
    btn.textContent = "Galería (imágenes)";
    setTimeout(()=> window.scrollTo({ top: 0, behavior:"smooth" }), 50);
  });
}

/* =========================
   Utils
========================= */
function slug(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str){
  return (str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return escapeHtml(str).replaceAll("`","&#096;");
}
