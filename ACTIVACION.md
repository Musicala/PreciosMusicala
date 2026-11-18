# Administrador de imágenes · Musicala

## Configuración aplicada el 18 de noviembre de 2026

- Proyecto existente `rip-musicala` y su aplicación web de RIP.
- Google Authentication con `musicala.github.io` autorizado.
- Firebase Storage activado, bucket `rip-musicala.firebasestorage.app`, ubicación `US-CENTRAL1`.
- Reglas de Firestore y Storage publicadas. Se conservaron las reglas vigentes de
  docentes, Spaces, pagos, estudiantes y auditoría que no estaban todavía en GitHub.
- Catálogo inicial importado: 16 entradas de `images.json`, revisión 1.

## Uso diario

Abre https://musicala.github.io/PreciosMusicala/admin.html y entra con Google.
Solo pueden editar `alekcaballeromusic@gmail.com` y `catalina.medina.leal@gmail.com`.

1. Selecciona un grupo y una categoría. Puedes seleccionar varias imágenes a la vez.
2. Pulsa **Subir y publicar**. Se aceptan PNG, JPG y WebP de hasta 10 MB cada una.
3. Ajusta títulos, categoría, grupo y orden con las flechas.
4. Pulsa **Guardar organización**. La galería pública recibe los cambios en línea.

La categoría debe coincidir exactamente con la del selector de precios, por ejemplo
`Personalizado`. Una categoría vacía se muestra en todas. Las imágenes generales
aparecen al final, conservando el comportamiento anterior.

**Quitar de la galería** retira una imagen del catálogo al guardar y conserva su
archivo. Esto evita eliminar originales o archivos compartidos. Si otra persona
publicó cambios antes, recarga la página para revisar su versión antes de guardar.

## Precios y pagos

**Registro de pagos** abre https://rip-musicala.web.app/registrar-pagos.html.
El formulario y la página pública consultan la misma hoja de precios. RIP sugiere
la tarifa del tipo de estudiante elegido y conserva la referencia junto al pago.

## Mantenimiento

`firebase-config.js` contiene configuración web pública, sin claves privadas.
`firestore.rules` incluye los permisos internos y el nuevo documento público
`gallery/manifest`. `storage.rules` restringe las cargas a los dos administradores.
Antes de futuros despliegues, compara las reglas con producción para conservar
cambios realizados desde otros proyectos que comparten este Firebase.

```powershell
firebase login
firebase deploy --only firestore:rules,storage --project rip-musicala
```

El catálogo usa un documento Firestore con límite de 1 MiB. Las imágenes se guardan
por separado en Storage. Si Firebase falla, la página conserva `images.json` como
respaldo, que puede ser anterior a los cambios publicados. Storage usa la facturación
existente del proyecto; el consumo puede generar cargos según las tarifas de Firebase.

## Validación

Las reglas se probaron con Firebase Rules API: lectura pública de galería, edición
para ambos administradores, rechazo de otras cuentas, privacidad de pagos y estudiantes,
rechazo de archivos mayores de 10 MB y rechazo de tipos no admitidos.
No se registraron pagos de prueba. Las pruebas de reglas usan identidades simuladas;
no sustituyen una comprobación del inicio de sesión desde las cuentas personales.
