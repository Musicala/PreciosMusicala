import { connectGallery, editors, groups, manifestRef, validManifest } from './cloud-gallery.js';
const $ = id => document.getElementById(id);
let c, items = [], revision = 0, busy = false, dirty = false;
const message = text => { $('status').textContent = text; };
function setBusy(value) {
  busy = value;
  document.querySelectorAll('#editor button, #editor input, #editor select, #logout').forEach(el => { el.disabled = value; });
}
function unpack(data) {
  return groups.flatMap(group => data[group].map(item => ({ ...(typeof item === 'string' ? {src:item,title:'Imagen'} : item), group })));
}
async function load() {
  const snapshot = await c.db.getDoc(manifestRef(c));
  const data = snapshot.exists() ? snapshot.data() : await fetch('./images.json', {cache:'no-store'}).then(r => { if (!r.ok) throw Error('No se pudo cargar la galería local.'); return r.json(); });
  if (!validManifest(data)) throw Error('El formato de la galería no es válido.');
  items = unpack(data); revision = data.revision || 0; dirty = false; render();
}
async function publish(next) {
  const data = Object.fromEntries(groups.map(group => [group, next.filter(item => item.group === group).map(({group, ...item}) => item)]));
  await c.db.runTransaction(c.store, async transaction => {
    const snapshot = await transaction.get(manifestRef(c));
    if ((snapshot.data()?.revision || 0) !== revision) throw Error('La otra persona modificó la galería. Recarga la página antes de continuar para evitar sobrescribir sus cambios.');
    transaction.set(manifestRef(c), {...data, revision:revision + 1});
  });
  revision++; items = next; dirty = false; render();
}
function render() {
  $('items').replaceChildren();
  for (const group of groups) {
    const heading = document.createElement('h3'); heading.textContent = {general:'Información general',nuevos:'Estudiantes nuevos',convenios:'Beneficios / Convenios'}[group]; $('items').append(heading);
    const members = items.filter(item => item.group === group);
    members.forEach((item, index) => {
      const card = document.createElement('article'); card.className = 'admin-card';
      const image = document.createElement('img'); image.src = item.src; image.alt = item.title || 'Imagen'; image.loading = 'lazy';
      const fields = document.createElement('div');
      for (const [key, title] of [['title','Título'],['categoria','Categoría'],['servicioSlug','Servicio (opcional, en formato clases-virtuales)']]) {
        const label = document.createElement('label'); label.textContent = title;
        const input = document.createElement('input'); input.value = item[key] || ''; input.maxLength = 150;
        input.addEventListener('input', () => { item[key] = input.value.trim(); dirty = true; }); label.append(input); fields.append(label);
      }
      const label = document.createElement('label'); label.textContent = 'Grupo'; const select = document.createElement('select');
      for (const value of groups) { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); }
      select.value = group; select.onchange = () => { item.group = select.value; dirty = true; render(); }; label.append(select); fields.append(label);
      for (const [text, offset] of [['↑ Subir',-1],['↓ Bajar',1]]) {
        const button = document.createElement('button'); button.textContent = text; button.disabled = !members[index + offset];
        button.onclick = () => { const a = items.indexOf(item), b = items.indexOf(members[index + offset]); [items[a],items[b]] = [items[b],items[a]]; dirty = true; render(); }; fields.append(button);
      }
      const remove = document.createElement('button'); remove.textContent = 'Quitar de la galería'; remove.onclick = () => { items = items.filter(x => x !== item); dirty = true; render(); }; fields.append(remove);
      card.append(image,fields); $('items').append(card);
    });
  }
}
async function action(fn) {
  if (busy) return;
  setBusy(true);
  try { await fn(); } catch (error) { console.error(error); message(error.message || 'No se pudo completar la acción.'); }
  finally { setBusy(false); render(); }
}
$('save').onclick = () => action(async () => { await publish(items); message('Organización guardada y publicada.'); });
$('upload').onsubmit = event => {
  event.preventDefault();
  action(async () => {
    const files = [...$('files').files];
    if (!files.length) throw Error('Selecciona al menos una imagen.');
    if (files.some(file => !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) throw Error('Usa PNG, JPG o WebP de máximo 10 MB por archivo.');
    const group = $('group').value, categoria = $('category').value.trim(), uploaded = [], uploadedPaths = [];
    try {
      for (const [index,file] of files.entries()) {
        message(`Subiendo ${index + 1} de ${files.length}…`);
        const storagePath = `gallery/${crypto.randomUUID()}`;
        const ref = c.storage.ref(c.bucket, storagePath);
        await c.storage.uploadBytes(ref,file,{contentType:file.type});
        uploadedPaths.push(storagePath);
        uploaded.push({storagePath,group,categoria,title:file.name.replace(/\.[^.]+$/, ''),src:await c.storage.getDownloadURL(ref)});
      }
      await publish([...items,...uploaded]);
      $('files').value = ''; message('Imágenes publicadas. Puedes ajustar sus títulos y orden abajo.');
    } catch (error) {
      // Las cargas que no se publicaron no deben quedar ocupando espacio.
      await Promise.allSettled(uploadedPaths.map(path => c.storage.deleteObject(c.storage.ref(c.bucket,path))));
      throw error;
    }
  });
};
window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
try {
  c = await connectGallery();
  if (!c) message('Falta activar la galería en línea. Sigue la guía ACTIVACION.md del repositorio para configurar Firebase.');
  else {
    $('login').onclick = () => action(async () => { await c.auth.signInWithPopup(c.session,new c.auth.GoogleAuthProvider().setCustomParameters({prompt:'select_account'})); });
    $('logout').onclick = () => action(async () => { await c.auth.signOut(c.session); });
    c.auth.onAuthStateChanged(c.session, async user => {
      $('editor').hidden = true; $('login').hidden = !!user; $('logout').hidden = !user;
      if (!user) { message('Entra con una de las dos cuentas autorizadas para administrar las imágenes.'); return; }
      if (!user.emailVerified || !editors.includes(user.email?.toLowerCase())) { message('Esta cuenta no tiene permiso para editar. Cierra sesión y elige una cuenta autorizada.'); return; }
      try { await load(); $('editor').hidden = false; message(`Sesión de ${user.email}. Galería lista para editar.`); }
      catch (error) { message(error.message); }
    });
  }
} catch (error) { message(`No se pudo conectar: ${error.message}`); }
