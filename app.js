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
 * ✅ Descuentos visuales en tabla:
 *    - Normal
 *    - 10%
 *    - 15%
 *    - 20%
 */

const TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRw8VZmjjgmjRSeriTc2ITE1VtuwDtxCMntos5N8kljm0svs5nMe-nb07vJSx2L6vRo9iT_S7CCIEZe/pub?gid=1700804701&single=true&output=tsv";
const IMAGES_JSON_URL = "./images.json";

let DATA = [];
let COLS = null;
let IMG = { general: [], nuevos: [], convenios: [] };
let SELECTED_DISCOUNT = 0;

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

    const headers = lines.shift().split("\t").map(h => (h || "").trim());
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
    DATA = lines.map((line, idx) => {
      const cols = line.split("\t");
      return {
        __row: idx + 2, // debug aproximado de fila
        Categoria: pick(cols, COLS.cat),
        Servicio: pick(cols, COLS.serv),
        PrecioNuevos: pick(cols, COLS.pNuevos),
        PrecioConvenios: pick(cols, COLS.pConv),
      };
    }).filter(r => r.Categoria || r.Servicio || r.PrecioNuevos || r.PrecioConvenios);

    updateMetaInfo();
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
    for(let i = 0; i < norm.length; i++){
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
  const pConv = findAny([
    "beneficio/convenios",
    "beneficios/convenios",
    "beneficio convenios",
    "convenios",
    "beneficios",
    "precio convenios",
    "valor convenios"
  ]);

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
  if(!box) return;
  box.style.display = "block";
  box.textContent = msg;
}

function updateMetaInfo(){
  const meta = qs("#metaInfo");
  if(!meta || !COLS) return;

  const extra = SELECTED_DISCOUNT > 0
    ? ` · descuento=${SELECTED_DISCOUNT}%`
    : "";

  meta.textContent =
    `Cargadas ${DATA.length} filas. cat=${COLS.cat} · serv=${COLS.serv} · nuevos=${COLS.pNuevos} · convenios=${COLS.pConv}${extra}`;
}

function populateCategories(){
  const sel = qs("#categoryFilter");
  if(!sel) return;

  sel.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());

  // Respetar orden del Excel: primera aparición de cada categoría
  const seen = new Set();
  for(const r of DATA){
    const c = (r.Categoria || "").trim();
    if(!c || seen.has(c)) continue;
    seen.add(c);

    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  }
}

function populateSuggestions(){
  const dl = qs("#suggestions");
  if(!dl) return;

  dl.innerHTML = "";

  const seen = new Set();
  for(const r of DATA){
    const s = (r.Servicio || "").trim();
    if(!s || seen.has(s)) continue;
    seen.add(s);

    const o = document.createElement("option");
    o.value = s;
    dl.appendChild(o);

    if(seen.size >= 200) break;
  }
}

function bindEvents(){
  ["categoryFilter","searchInput","chkNuevos","chkConvenios"]
    .forEach(id => {
      const el = qs("#" + id);
      if(el) el.addEventListener("input", renderAll);
    });

  const discountWrap = qs("#discountButtons");
  if(discountWrap){
    discountWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".dpill");
      if(!btn) return;

      SELECTED_DISCOUNT = Number(btn.dataset.discount || 0);
      const customInput = qs("#customDiscountInput");
      if(customInput) customInput.value = "";

      discountWrap.querySelectorAll(".dpill").forEach(b => {
        b.classList.toggle("active", b === btn);
      });

      updateMetaInfo();
      renderAll();
    });
  }

  const customInput = qs("#customDiscountInput");
  if(customInput){
    customInput.addEventListener("input", () => {
      const raw = customInput.value.trim();

      if(!raw){
        SELECTED_DISCOUNT = 0;
        setActiveDiscountButton(0);
        updateMetaInfo();
        renderAll();
        return;
      }

      const value = Number(raw.replace(",", "."));
      if(!Number.isFinite(value)) return;

      SELECTED_DISCOUNT = clamp(value, 0, 100);
      setActiveDiscountButton(null);
      updateMetaInfo();
      renderAll();
    });
  }
}

function setActiveDiscountButton(discount){
  const discountWrap = qs("#discountButtons");
  if(!discountWrap) return;

  discountWrap.querySelectorAll(".dpill").forEach((b) => {
    const btnDiscount = Number(b.dataset.discount || 0);
    b.classList.toggle("active", discount != null && btnDiscount === discount);
  });
}

/* =========================
   State + Filters
========================= */
function getState(){
  return {
    selectedCat: qs("#categoryFilter")?.value || "",
    q: (qs("#searchInput")?.value || "").toLowerCase(),
    showNuevos: !!qs("#chkNuevos")?.checked,
    showConvenios: !!qs("#chkConvenios")?.checked,
  };
}

function applyFilters(rows, st){
  return rows.filter(d => {
    const cat = (d.Categoria || "").trim();
    const serv = (d.Servicio || "").trim();

    if(st.selectedCat && cat !== st.selectedCat) return false;

    if(st.q && !serv.toLowerCase().includes(st.q)) return false;

    // Si no hay ningún toggle seleccionado, no mostramos nada
    if(!st.showNuevos && !st.showConvenios) return false;

    return true;
  });
}

function getActiveMode(st){
  // Para galería: si ambos ON, priorizamos "nuevos"
  if(st.showNuevos) return "nuevos";
  return "convenios";
}

/* =========================
   Price helpers
========================= */
function parsePriceNumber(value){
  if(value == null) return null;

  let s = String(value).trim();
  if(!s) return null;

  // Elimina moneda, espacios y caracteres raros
  s = s.replace(/[^\d,.-]/g, "");
  if(!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if(hasComma && hasDot){
    // Si la coma aparece después del punto, asumimos decimal con coma: 1.234,56
    if(s.lastIndexOf(",") > s.lastIndexOf(".")){
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Asumimos decimal con punto: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if(hasComma){
    const parts = s.split(",");
    if(parts.length === 2 && parts[1].length <= 2){
      // decimal tipo 1234,56
      s = parts[0].replace(/\./g, "") + "." + parts[1];
    } else {
      // comas como miles
      s = s.replace(/,/g, "");
    }
  } else if(hasDot){
    const parts = s.split(".");
    if(parts.length > 2){
      // puntos como miles
      s = parts.join("");
    } else if(parts.length === 2 && parts[1].length === 3){
      // 120.000
      s = parts.join("");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatCOP(value){
  if(value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function applyDiscount(value, discount){
  const n = parsePriceNumber(value);
  if(n == null) return null;
  return n * (1 - discount / 100);
}

function clamp(value, min, max){
  return Math.min(max, Math.max(min, value));
}

function renderPriceBlock(originalValue){
  if(!originalValue) return `<span class="empty">—</span>`;

  const originalNumber = parsePriceNumber(originalValue);
  if(originalNumber == null){
    return escapeHtml(originalValue);
  }

  const finalValue = applyDiscount(originalValue, SELECTED_DISCOUNT);

  if(SELECTED_DISCOUNT <= 0){
    return `<span class="price-final">${formatCOP(finalValue)}</span>`;
  }

  return `
    <div class="price-wrap">
      <span class="price-old">${formatCOP(originalNumber)}</span>
      <span class="price-final">${formatCOP(finalValue)}</span>
      <span class="price-badge">-${SELECTED_DISCOUNT}%</span>
    </div>
  `;
}

function getDisplayPriceHtml(row, st){
  if(st.showNuevos && st.showConvenios){
    return `
      <div class="dual-price">
        <div class="dual-row">
          <span class="dual-tag dual-tag-nuevos">Nuevos</span>
          ${renderPriceBlock(row.PrecioNuevos)}
        </div>
        <div class="dual-row">
          <span class="dual-tag dual-tag-conv">Convenios</span>
          ${renderPriceBlock(row.PrecioConvenios)}
        </div>
      </div>
    `;
  }

  if(st.showNuevos){
    return renderPriceBlock(row.PrecioNuevos);
  }

  return renderPriceBlock(row.PrecioConvenios);
}

/* =========================
   Render all
========================= */
function renderAll(){
  const st = getState();
  const filtered = applyFilters(DATA, st);

  const discountText = SELECTED_DISCOUNT > 0
    ? ` · ${SELECTED_DISCOUNT}% OFF`
    : "";

  const priceHeader = qs("#priceHeader");
  if(priceHeader){
    priceHeader.textContent = st.showNuevos
      ? (st.showConvenios
          ? `Precio (Nuevos / Convenios${discountText})`
          : `Precio (Estudiantes nuevos${discountText})`)
      : `Precio (Beneficios / Convenios${discountText})`;
  }

  renderTable(filtered, st);
  renderGallery(filtered, st);
}

/* =========================
   Table (RESPETA ORDEN EXCEL)
========================= */
function renderTable(rows, st){
  const tbody = qs("#tbody");
  if(!tbody) return;

  tbody.innerHTML = "";

  if(rows.length === 0){
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML = `<td colspan="3">Sin resultados con esos filtros.</td>`;
    tbody.appendChild(tr);
    return;
  }

  let lastCat = null;

  for(const r of rows){
    const cat = (r.Categoria || "Sin categoría").trim() || "Sin categoría";

    if(cat !== lastCat){
      const trCat = document.createElement("tr");
      trCat.className = "cat-row";
      trCat.innerHTML = `<td colspan="3"><span class="cat-chip"><span class="cat-chip-dot"></span>${escapeHtml(cat)}</span></td>`;
      tbody.appendChild(trCat);
      lastCat = cat;
    }

    const priceHtml = getDisplayPriceHtml(r, st);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.Categoria || "")}</td>
      <td>${escapeHtml(r.Servicio || "")}</td>
      <td class="price">${priceHtml}</td>
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

  if(!wrap || !grid || !empty) return;
  if(wrap.classList.contains("hidden")) return;

  grid.innerHTML = "";
  empty.classList.add("hidden");

  const mode = getActiveMode(st); // "nuevos" | "convenios"
  const list = (mode === "nuevos") ? (IMG.nuevos || []) : (IMG.convenios || []);

  // Generales al final
  const general = (IMG.general || []).map(x => normalizeImgItem(x));

  const selectedCat = (st.selectedCat || "").trim();
  const allowedServiceSlugs = new Set(rows.map(r => slug(r.Servicio)));

  const filteredByMode = list
    .map(x => normalizeImgItem(x))
    .filter(item => {
      if(selectedCat && item.categoria && item.categoria !== selectedCat) return false;

      if(item.servicioSlug){
        return allowedServiceSlugs.has(item.servicioSlug);
      }

      return true;
    });

  const cards = [...filteredByMode, ...general];

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
  if(typeof x === "string"){
    return { src: x, title: "Imagen", categoria: "", servicioSlug: "", meta: "" };
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
  const layout = qs("#contentLayout");
  const btn = qs("#btnToggleGaleria");
  const btnClose = qs("#btnCerrarGaleria");
  const btnText = qs(".btn-galeria-text");

  if(btn && wrap){
    btn.addEventListener("click", () => {
      const isHidden = wrap.classList.contains("hidden");
      wrap.classList.toggle("hidden");
      if(layout) layout.classList.toggle("gallery-open", isHidden);

      if(isHidden){
        if(btnText) btnText.textContent = "Ocultar galería";
        renderAll();
      }else{
        if(btnText) btnText.textContent = "Ver galería";
      }
    });
  }

  if(btnClose && wrap){
    btnClose.addEventListener("click", () => {
      wrap.classList.add("hidden");
      if(layout) layout.classList.remove("gallery-open");
      if(btnText) btnText.textContent = "Ver galería";
    });
  }
}

/* =========================
   Utils
========================= */
function slug(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str){
  return escapeHtml(str).replaceAll("`", "&#096;");
}
