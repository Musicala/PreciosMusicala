import { connectGallery, manifestRef, validManifest } from './cloud-gallery.js';
try {
  const c = await connectGallery();
  if (c) c.db.onSnapshot(manifestRef(c), snapshot => {
    const data = snapshot.data();
    if (validManifest(data)) window.dispatchEvent(new CustomEvent('gallery-updated', { detail: data }));
  }, error => console.warn('Galería en línea no disponible; se conserva la copia local.', error.code));
} catch (error) {
  console.warn('Se conserva la galería local.', error.message);
}
