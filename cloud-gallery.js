import { firebaseConfig } from './firebase-config.js';
export const editors = ['alekcaballeromusic@gmail.com', 'catalina.medina.leal@gmail.com'];
export const groups = ['general', 'nuevos', 'convenios'];
export async function connectGallery() {
  if (!firebaseConfig) return null;
  const base = 'https://www.gstatic.com/firebasejs/11.10.0/';
  const [app, auth, db, storage] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js'), import(base + 'firebase-storage.js')
  ]);
  const instance = app.initializeApp(firebaseConfig);
  return { auth, db, storage, session: auth.getAuth(instance), store: db.getFirestore(instance), bucket: storage.getStorage(instance) };
}
export function manifestRef(c) { return c.db.doc(c.store, 'gallery', 'manifest'); }
export function validManifest(data) {
  return data && groups.every(group => Array.isArray(data[group]));
}
