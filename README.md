# Precios Musicala 2026

Lista pública de precios conectada a Google Sheets, con filtros de categoría,
tipo de estudiante, búsqueda, descuentos y galería de imágenes.

- Sitio: https://musicala.github.io/PreciosMusicala/
- Administrador: https://musicala.github.io/PreciosMusicala/admin.html
- Pagos en RIP: https://musicala.github.io/RIP2026/registrar-pagos.html

## Administrar imágenes

Entra con Google como `alekcaballeromusic@gmail.com` o
`catalina.medina.leal@gmail.com`. Puedes subir varios archivos, cambiar títulos,
categorías y grupos, y ordenar con flechas. Los cambios guardados se publican
en la galería sin editar archivos ni volver a desplegar GitHub Pages.

Firebase usa el proyecto existente `rip-musicala`. Solo las imágenes y su catálogo
son públicos; pagos, estudiantes y auditoría conservan sus permisos internos.
Consulta [ACTIVACION.md](./ACTIVACION.md) para operación y mantenimiento.

## Datos y respaldo

Los precios proceden de las columnas «Categoría», «Servicio», «Estudiantes Nuevos»
y «Beneficio/Convenios» de la hoja publicada configurada en `app.js`.

La galería usa `gallery/manifest` en Firestore y archivos en Firebase Storage.
`images.json` y las carpetas `gallery/general`, `gallery/nuevos` y
`gallery/convenios` conservan el catálogo original como respaldo.

Cada grupo contiene una lista ordenada de objetos con `src`, `title`, `categoria`,
`servicioSlug` y `meta` opcionales. `servicioSlug` permite filtrar por servicio
(por ejemplo, «Clases virtuales» se convierte en `clases-virtuales`).
Las imágenes generales aparecen al final. Si seleccionas ambos tipos de estudiante,
se muestran ambos grupos y las imágenes compartidas aparecen una sola vez.

Para probar localmente, sirve el directorio por HTTP y autoriza el dominio de prueba
en Firebase Authentication. Los módulos no se ejecutan desde una URL `file://`.
