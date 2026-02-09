---
description: Reglas para el desarrollo del Backend (Go + FastAPI) de Nereo AR
globs: ["internal/**", "cmd/**", "pkg/**", "migrations/**", "nereo-ml/**"]
---

# Nereo AR - Backend Standards

## Tech Stack
- **API Principal:** Go 1.22+ (Gin/Fiber).
- **ML & Clima:** FastAPI (Python 3.12).
- **Persistencia:** PostgreSQL 16 (con pgx pool).
- **Cache/Events:** Redis 7.

## Reglas de Oro
- **Multi-tenancy RLS:** Todas las queries deben asumir el aislamiento por `tenant_id`. No generes código que salte el Middleware de Tenant.
- **Normalización de Datos:** Todo teléfono debe pasar por el normalizador E.164 (Argentina +54 9).
- **Tratamiento de Errores en Go:** Prohibido usar `panic`. Los errores se propagan y se loguean usando `slog` incluyendo el `trace_id`.
- **Concurrencia en Turnos:** Usa el patrón de "Doble Barrera": 
    1. Lock en Redis (SETNX).
    2. SQL Exclusion Constraint (gist).
- **Mercado Pago:** Implementar siempre lógica de idempotencia al procesar Webhooks para evitar cobros o registros duplicados.

## Documentación
- Cada nuevo endpoint debe generar automáticamente un comentario con el formato: `// @Summary | @Description | @Tags | @Accept | @Produce | @Success`.

## Gestión del Roadmap (CRITICAL)
- **Checklist Sync:** Antes de finalizar cualquier tarea, DEBES actualizar el archivo `roadmap-backend.md`.
- **Estado de Tareas:** - Cambia `[ ]` a `[x]` solo cuando el código esté testeado y funcional.
    - Si una tarea queda a medias, añade un comentario debajo con `> [Pausado]: razón`.
- **Nuevas Tareas:** Si durante el desarrollo detectas un edge case técnico necesario (ej: un nuevo middleware), añádelo al roadmap en la sección correspondiente antes de implementarlo.
- **Contexto:** Al iniciar una sesión, lee siempre el `roadmap-backend.md` para saber exactamente en qué fase te encuentras.
