---
description: Reglas para el desarrollo del Frontend (Next.js) de Nereo AR
globs: ["src/app/**", "src/components/**", "src/hooks/**", "src/lib/**"]
---

# Nereo AR - Frontend Standards

## Tech Stack
- **Framework:** Next.js 14/15 (App Router).
- **Styling:** Tailwind CSS + Shadcn/UI.
- **Data Fetching:** TanStack Query (v5).
- **Formularios:** React Hook Form + Zod.

## Reglas de Oro
- **Mobile-First & High Contrast:** La vista de `(operario)` DEBE usar colores de alto contraste y targets táctiles de mínimo 48px para uso bajo sol directo.
- **Validación de Tipos:** Todo componente debe estar tipado con TypeScript. No uses `any`. Las respuestas de la API deben validarse con Zod.
- **Optimistic Updates:** Implementa actualizaciones optimistas en el Kanban de lavados para que la UI se sienta instantánea.
- **Mercado Pago Bricks:** No uses Checkout Pro. Usa Bricks para mantener la experiencia dentro del dominio `nereo.ar`.
- **Patrón de Layouts:** Respeta estrictamente los Route Groups:
    - `(admin)`: Dashboard de gestión.
    - `(operario)`: PWA de playón.
    - `(public)`: Landing pages de clientes.

## Performance
- Usa `loading.tsx` y Skeletons para cada sección.
- Imágenes siempre con `next/image` y prioridad configurada para el Hero de la landing.

## Gestión del Roadmap (CRITICAL)
- **Checklist Sync:** Al terminar un componente o feature, actualiza inmediatamente el `roadmap-frontend.md`.
- **Sync con Backend:** Si una tarea de frontend depende de un endpoint que aún no está marcado como completado en el roadmap de backend, advierte al usuario antes de proceder.
- **Control de Versión de UI:** Marca como completado solo cuando el componente sea responsive y cumpla con las reglas de accesibilidad (a11y) definidas.
- **Nuevos Componentes:** Si creas un componente compartido no previsto originalmente, agrégalo a la "Fase 0" del roadmap para mantener el inventario de la librería `@nereo/ui` actualizado.