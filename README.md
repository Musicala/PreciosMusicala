# Precios Musicala 2026 (Tabla + Galería local)

## 1) Qué cambió
- El Sheet ya NO tiene "TipoEstudiante".
- Ahora hay 2 columnas de precio:
  - "Estudiantes Nuevos"
  - "Beneficio/Convenios"

## 2) Cómo funciona la galería
La galería NO usa iframe.
Lee un archivo `images.json` con rutas locales a imágenes.

Carpetas:
- /gallery/general     -> SIEMPRE salen primero
- /gallery/nuevos      -> imágenes por servicio para Estudiantes nuevos
- /gallery/convenios   -> imágenes por servicio para Beneficios/Convenios

## 3) Cómo nombrar servicios (clave)
En `images.json` las llaves son el *slug* del nombre del Servicio:
- Convierte a minúscula
- Quita tildes
- Espacios -> guiones
Ej: "Beneficios Clases virtuales" -> "beneficios-clases-virtuales"

## 4) Editar images.json
Ejemplo:
{
  "general": ["./gallery/general/intro-1.png"],
  "nuevos": { "clases-virtuales": "./gallery/nuevos/clases-virtuales.png" },
  "convenios": { "clases-virtuales": "./gallery/convenios/clases-virtuales.png" }
}

## 5) Default
- "Estudiantes nuevos" viene marcado por defecto.
- "Beneficios / Convenios" está apagado por defecto.
