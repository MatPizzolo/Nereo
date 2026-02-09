# Roadmap Frontend - nereo AR (Dashboard)

> **Stack:** Next.js 14 (App Router) · Tailwind CSS · Shadcn/UI · Lucide Icons · TanStack Query · TanStack Table · Recharts
>
> **Usuarios:** Dueño (Admin) · Empleado (Operario) · Cliente Final
>
> **Principios:** Mobile-first · PWA-ready · Componentes reutilizables · Velocidad de carga < 2s en 4G

---

## Fase 0: Librería de Componentes Reutilizables (`@nereo/ui`)

> Componentes compartidos entre el panel admin, la vista operario y la landing del cliente.

- [x] **Design Tokens:** Definir paleta de colores, tipografía, espaciado y radios en `tailwind.config.ts` con variables CSS custom.
- [x] **Componentes Base (Shadcn/UI extendidos):**
    - [x] `<StatusBadge />` — Estado de membresía / estado de lavado (colores semánticos: activo, vencido, pendiente).
    - [x] `<DataTable />` — Wrapper sobre TanStack Table con sorting, filtros, paginación y skeleton loading integrado.
    - [x] `<StatCard />` — Tarjeta de métrica con valor, variación porcentual e ícono. Reutilizable en dashboard admin y landing.
    - [x] `<ConfirmDialog />` — Diálogo de confirmación accesible con variantes (destructivo, informativo).
    - [x] `<LoadingSkeleton />` — Skeletons específicos por layout (tabla, card grid, kanban).
    - [x] `<EmptyState />` — Placeholder ilustrado para listas vacías con CTA contextual.
- [x] **Componentes de Formulario:**
    - [x] `<FormField />` — Wrapper con label, error, helper text y soporte para React Hook Form.
    - [x] `<MultiStepForm />` — Stepper visual con validación por paso (Zod) y persistencia en `sessionStorage`.
    - [x] `<PhoneInput />` — Input de teléfono con formato argentino. Forzar normalización al formato local `+54 9 11 XXXX-XXXX` (móvil) para coincidir con la lógica de normalización del Backend (`internal/notification`). Validación con regex `/^\+549\d{10}$/`, auto-strip del `15` si el usuario lo ingresa, y auto-prepend de `+549` si solo escribe el número local.
    - [x] `<CurrencyInput />` — Input numérico con formato ARS y separador de miles.
- [x] **Componentes de Feedback:**
    - [x] `<Toast />` — Notificaciones con variantes (éxito, error, info) vía Sonner.
    - [x] `<InlineAlert />` — Alerta contextual dentro de formularios/secciones.
    - [x] `<ProgressBar />` — Barra de progreso para operaciones largas (upload, procesamiento).

---

## Fase 1: Estructura, Auth & Performance

### Setup del Proyecto
- [x] **Scaffold:** Next.js 14 (App Router) + Tailwind CSS + Shadcn/UI + Lucide Icons.
- [x] **TanStack Query Provider:** Configurar `QueryClientProvider` con defaults (staleTime, retry, refetchOnWindowFocus).
- [x] **Estructura de carpetas:**
    ```
    src/
    ├── app/
    │   ├── (auth)/          # Login, registro
    │   ├── (admin)/         # Dashboard dueño
    │   ├── (operario)/      # Vista empleado (PWA)
    │   └── (public)/        # Landing + checkout cliente
    ├── components/
    │   ├── ui/              # Shadcn/UI base
    │   ├── shared/          # Componentes reutilizables (@nereo/ui)
    │   ├── admin/           # Componentes exclusivos admin
    │   ├── operario/        # Componentes exclusivos operario
    │   └── public/          # Componentes exclusivos landing/checkout
    ├── hooks/               # Custom hooks (useAuth, useWhatsApp, useBranch)
    ├── lib/                 # Utilidades, API client, validaciones Zod
    └── stores/              # Estado global mínimo (Zustand si necesario)
    ```

### Autenticación & Middleware
- [x] **Middleware de rutas:** Protección basada en rol (`admin`, `operario`, `cliente`) y estado de sesión.
- [x] **Layouts por rol:**
    - [x] `AdminLayout` — Sidebar persistente + Selector de Sucursal + Header con notificaciones.
    - [x] `OperarioLayout` — Bottom navigation simplificada (3 tabs máx.) + Header mínimo.
    - [x] `PublicLayout` — Header con branding del tenant + Footer.
- [x] **Selector de Sucursal:** Dropdown persistente en el layout admin; cambia el contexto de datos globalmente vía TanStack Query key.

### UI Shell — Header, Footer, Sidebar & Landing
- [x] **Admin Sidebar (`<AdminSidebar />`):**
    - [x] Logo Nereo + nombre del tenant.
    - [x] Nav links: Dashboard, Suscriptores, Configuración. Ícono + label, estado activo resaltado.
    - [x] `<BranchSelector />` integrado en la parte superior del sidebar.
    - [x] Botón de colapsar sidebar (desktop). Drawer/sheet en mobile.
    - [x] Footer del sidebar: avatar del usuario + nombre + botón logout.
- [x] **Admin Header (`<AdminHeader />`):**
    - [x] Breadcrumb dinámico basado en la ruta actual.
    - [x] `<ConnectionIndicator />` (badge "En vivo").
    - [x] Botón de notificaciones (campana + badge de count).
    - [x] Mobile: botón hamburguesa que abre el sidebar como sheet.
- [x] **Operario Header (`<OperarioHeader />`):**
    - [x] Logo Nereo mínimo (solo ícono en mobile).
    - [x] `<ConnectionIndicator />`.
    - [x] Toggle de High-Contrast / Outdoor Mode (ícono `Sun` de Lucide).
- [x] **Public Header (`<PublicHeader />`):**
    - [x] Logo/nombre del lavadero (dinámico por tenant vía `[slug]`).
    - [x] Nav links: Planes, Servicios, Contacto (anchor scroll).
    - [x] CTA "Suscribite" (botón primario).
    - [x] Mobile: hamburguesa con sheet/drawer.
- [x] **Public Footer (`<PublicFooter />`):**
    - [x] Datos del lavadero: dirección, teléfono, horarios.
    - [x] Links: Términos, Privacidad.
    - [x] Redes sociales (íconos).
    - [x] `<WhatsAppButton />` flotante (FAB) fijo en esquina inferior derecha.
- [x] **Landing Page Shell (`<LandingHero />`, `<PlanCards />`, `<ServiceList />`):**
    - [x] `<LandingHero />` — Imagen de fondo del local + título + CTA "Suscribite". Responsive (texto sobre imagen en desktop, stacked en mobile).
    - [x] `<PlanCards />` — Grid de cards comparativas de planes (reutiliza `<StatCard />` adaptado). Highlight del plan recomendado.
    - [x] `<ServiceList />` — Lista de servicios con nombre, descripción corta, duración y precio. Usa `<CurrencyInput />` display mode.
    - [x] `<LocationMap />` — Google Maps embed con marker del lavadero. Lazy load con `Suspense`.
    - [x] `<TestimonialCarousel />` — Carrusel de reseñas de clientes (opcional, placeholder si no hay data).

### Performance & Optimización
- [x] **Bundle Splitting:** Route-based code splitting automático (App Router). Lazy load de Recharts y componentes pesados.
- [x] **Image Optimization:** `next/image` con formatos WebP/AVIF y `sizes` responsive.
- [x] **Prefetching:** `<Link prefetch>` en navegación principal. `queryClient.prefetchQuery` para datos críticos.
- [x] **Loading States Globales:**
    - [x] `loading.tsx` por cada route group con skeletons específicos.
    - [x] `Suspense` boundaries granulares para secciones independientes del dashboard:
        - [x] Dashboard: Envolver cada widget (RevenueChart, ChurnRetention, WeatherWidget, RevenueProjection) en `<Suspense>` individual con skeleton fallback.
        - [x] Suscriptores: `<Suspense>` para la tabla vs. los filtros (cargar filtros inmediatamente, tabla después).
        - [x] Detalle de suscriptor: `<Suspense>` separado para el historial de lavados vs. los datos principales.
    - [x] Optimistic updates en mutaciones frecuentes:
        - [x] **Kanban drag & drop:** `queryClient.setQueryData` para mover card instantáneamente entre columnas. `onMutate` → snapshot previo, `onError` → rollback con toast "No se pudo mover el lavado".
        - [x] **Check-in:** Al confirmar check-in, agregar booking al Kanban localmente antes de respuesta del server.
        - [x] **Cambio de estado de suscriptor:** Al pausar/renovar/cancelar, actualizar `StatusBadge` inmediatamente con rollback on error.
        - [x] **Alta de suscriptor:** Agregar fila a la tabla optimistamente al confirmar el modal, revertir si falla la API.
- [x] **Estado en Tiempo Real (WebSockets / SSE):**
    - [x] Configurar conexión SSE (Server-Sent Events) como canal principal de real-time. Preferir SSE sobre WebSockets por simplicidad y compatibilidad con HTTP/2.
    - [x] Hook `useRealtimeChannel(channel: string)` — Suscribe a un canal SSE por tenant. Reconexión automática con backoff exponencial.
    - [x] **Kanban del Operario:** Suscribir a `sse:/bookings/{tenant_id}` → actualizar columnas del Kanban en tiempo real cuando otro operario mueve una card o entra un nuevo turno. Invalidar query de TanStack Query al recibir evento.
    - [x] **Dashboard del Admin:** Suscribir a `sse:/analytics/{tenant_id}` → actualizar KPI cards y gráficos cuando se procesa un pago o cambia el estado de una suscripción. Usar `queryClient.setQueryData` para merge incremental sin refetch completo.
    - [x] **Indicador de conexión:** Badge visual "En vivo" (verde) / "Reconectando..." (amarillo) en el header del layout operario y admin.
    - [x] **Fallback:** Si SSE no se establece en 5s, caer a polling con TanStack Query (`refetchInterval: 15000`).

### Auth Pages
- [x] **Login Page (`/login`):**
    - [x] Formulario email + password con validación Zod.
    - [x] "Recordarme" checkbox (refresh token de larga duración).
    - [x] Link "Olvidé mi contraseña" → flujo de reset por email.
    - [x] Redirect automático a `/admin` o `/operario` según rol del JWT.
    - [x] Error handling: credenciales inválidas, cuenta bloqueada, rate limiting (429).
- [x] **Forgot Password Page (`/forgot-password`):**
    - [x] Input de email + botón "Enviar link".
    - [x] Pantalla de confirmación "Revisá tu email".
- [x] **Reset Password Page (`/reset-password?token=...`):**
    - [x] Validar token en URL. Formulario nueva contraseña + confirmar.
    - [x] Redirect a login con toast "Contraseña actualizada".

### Error Handling Global
- [x] **Error Boundary (`error.tsx`):**
    - [x] `error.tsx` por cada route group con UI de error contextual.
    - [x] Botón "Reintentar" que llama `reset()` del error boundary.
    - [x] Logging de errores al backend (`POST /api/v1/errors`) para monitoreo. *(Implementado en `lib/error-logger.ts`, wired en todos los `error.tsx`)*
- [x] **Not Found (`not-found.tsx`):**
    - [x] Página 404 global con branding Nereo y link a home.
    - [x] 404 específico para `/admin/suscriptores/[id]` inexistente.
- [x] **API Error Toasts:**
    - [x] Interceptor en `api.ts` que muestra toast automático en errores 4xx/5xx.
    - [x] Mapeo de códigos HTTP a mensajes en español (401 → "Sesión expirada", 403 → "Sin permisos", 500 → "Error del servidor").

---

## Fase 2: Panel de Control del Dueño (Admin)

### Módulo de Suscriptores
- [x] **Tabla de Suscriptores (`<DataTable />`):**
    - [x] Columnas: Nombre, Teléfono, Plan, Estado (activo/vencido/por vencer), Fecha de renovación, Último lavado.
    - [x] Filtros rápidos: por estado de membresía, por plan, por sucursal.
    - [x] Búsqueda full-text por nombre o teléfono.
    - [x] Bulk actions: Enviar recordatorio WhatsApp, Exportar CSV.
    - [x] Row expansion: Historial de lavados del cliente inline.
- [x] **Modal de Alta Manual:**
    - [x] Formulario multi-step: Datos personales → Selección de plan → Confirmación.
    - [x] Validación con Zod en cada paso.
    - [x] Preview del resumen antes de confirmar.
- [x] **Detalle de Suscriptor:**
    - [x] Timeline de actividad (lavados, pagos, cambios de plan).
    - [x] Acciones rápidas: Renovar, Pausar, Cancelar membresía, Enviar WhatsApp.

### Dashboard Principal — Métricas & Proyecciones
- [x] **KPI Cards (fila superior):**
    - [x] Ingresos del mes (vs. mes anterior, variación %).
    - [x] Suscriptores activos totales.
    - [x] Churn Rate mensual (% de bajas / total inicio de mes).
    - [x] Ticket promedio (ingresos / lavados totales).
- [x] **Gráfico de Ingresos (Recharts):**
    - [x] Line chart: Ingresos mensuales últimos 12 meses.
    - [x] Stacked bar: Desglose por tipo (suscripción recurrente vs. lavado único).
    - [x] Toggle de período: Semana / Mes / Trimestre / Año.
- [x] **Churn Rate & Retención:**
    - [x] Gauge chart o trend line del churn rate mensual con meta visual (ej: línea roja en 5%).
    - [x] Tabla de "Suscriptores en riesgo": clientes que no lavaron en los últimos 15 días o con pago próximo a vencer.
    - [x] Acción directa: botón "Contactar por WhatsApp" en cada fila.
- [x] **Proyección de Ingresos:**
    - [x] Gráfico de área: Proyección a 3 meses basada en suscripciones activas (MRR) + estimación de lavados únicos (promedio histórico).
    - [x] Escenarios: Optimista (0% churn) / Realista (churn actual) / Pesimista (churn x2).
    - [x] Indicador de MRR (Monthly Recurring Revenue) destacado.
- [x] **Widget de Clima + Sugerencia IA:**
    - [x] Clima actual y pronóstico 3 días (API OpenWeatherMap).
    - [x] Sugerencia contextual: "Hoy llueve → esperá un 30% menos de tráfico" o "Semana de calor → promocioná lavados express".

---

## Fase 3: Operaciones — Vista Empleado (PWA)

> **Objetivo:** Interfaz ultra-simple, operable con una mano, manos mojadas o con guantes. Feedback visual y háptico inmediato.

### PWA Setup
- [x] **Manifest & Service Worker:**
    - [x] `manifest.json` con `display: standalone`, theme color, íconos 192/512px.
    - [ ] Service Worker con `next-pwa` o `serwist`: cache de shell estático + estrategia network-first para datos. *(Requiere configuración de producción)*
    - [x] Prompt de instalación ("Agregar a pantalla de inicio") al segundo acceso.
- [ ] **Offline Fallback:** Pantalla offline con último estado conocido del Kanban (cache en IndexedDB). *(Requiere Service Worker)*
- [ ] **Push Notifications:** Notificación cuando un lavado cambia de estado (ej: "Nuevo vehículo en espera"). *(Requiere backend push endpoint)*

### Kanban de Lavados
- [x] **Columnas:** "En Espera" → "Lavando" → "Listo para Retirar".
- [x] **Cards de Lavado:**
    - [x] Info: Patente/modelo, tipo de servicio, nombre del cliente, hora de ingreso.
    - [x] Indicador visual de tiempo transcurrido (badge que cambia de color: verde < 30min, amarillo < 60min, rojo > 60min).
    - [x] Drag & drop entre columnas (touch-optimized con `@dnd-kit/core`).
- [x] **Acciones Rápidas (botones grandes, min 48x48px, idealmente 56x56px):**
    - [x] "Empezar Lavado" — Un tap para mover de "En Espera" a "Lavando".
    - [x] "Listo" — Un tap para mover a "Listo para Retirar" + dispara notificación WhatsApp al cliente.
    - [x] "Problema" — Abre modal simplificado para reportar incidencia.
- [x] **Optimistic Updates:** Cambio de columna instantáneo en UI; rollback automático si falla la API (con toast de error).
- [x] **Feedback Visual & Háptico:**
    - [x] Animación de transición entre columnas (Framer Motion, `layout` prop).
    - [x] Vibración del dispositivo al completar acción (`navigator.vibrate(100)`).
    - [x] Colores de alto contraste y tipografía grande (mín. 16px body, 20px títulos).
- [x] **High-Contrast Theme (Outdoor Mode):**
    - [x] Toggle en el header del `OperarioLayout`: ícono de sol (`Sun` de Lucide) para activar/desactivar. Persistir preferencia en `localStorage`.
    - [x] Aplicar vía clase CSS en `<html>` (`class="theme-high-contrast"`) con override de variables CSS custom de Tailwind.
    - [x] Paleta: fondo blanco puro (`#FFFFFF`), textos negro puro (`#000000`), acciones primarias en azul saturado (`#0050FF`), estados en rojo/verde/amarillo saturados. Eliminar grises intermedios — usar escala binaria (blanco/negro) con acentos de color.
    - [x] Tipografía: escalar a mín. 18px body, 24px títulos, font-weight 600+ en labels de botones.
    - [x] Bordes de 2px sólidos en cards y botones (en lugar de sombras que se pierden bajo luz solar).
    - [ ] Detección de luminosidad ambiental (`AmbientLightSensor` API donde esté disponible) para activar automáticamente. *(API experimental, baja prioridad)*

### Scanner QR & Check-in
- [x] **Lector QR:** Componente de cámara (`html5-qrcode`) para validar membresía al llegar.
- [x] **Resultado del Scan:**
    - [x] Membresía activa → Pantalla verde con datos del cliente + botón "Registrar Lavado".
    - [x] Membresía vencida → Pantalla roja con opción "Cobrar lavado único" o "Renovar membresía".
    - [x] QR inválido → Pantalla de error con opción de búsqueda manual por patente.
- [x] **Check-in Manual — Búsqueda por Patente (fallback primario, objetivo < 3 segundos):**
    - [x] Input de patente como campo principal y visible por defecto (no oculto detrás de un botón). Autofocus al entrar a la pantalla de check-in.
    - [x] Autocompletado instantáneo filtrado contra los turnos del día (`bookings` con `status: confirmed` para el `tenant_id` actual). Prefetch de turnos del día al montar el componente (`staleTime: 60s`).
    - [x] Mostrar resultados mientras se tipea (mín. 2 caracteres). Cada resultado muestra: patente (destacada), nombre del cliente, hora del turno, tipo de servicio.
    - [x] Un tap en el resultado → directo a pantalla de confirmación (sin pasos intermedios).
    - [ ] Si no hay match en turnos del día → buscar en base de clientes general (segunda query, debounce 300ms). *(Requiere endpoint backend de búsqueda general)*
    - [x] Búsqueda secundaria por nombre del cliente (tab o toggle, no reemplaza patente como default).

---

## Fase 4: Integración WhatsApp

> **Estrategia:** WhatsApp como canal principal de comunicación con el cliente. Integración vía API de WhatsApp Business (Cloud API) o proveedor (Twilio/360dialog).

### Componentes de UI
- [x] **`<WhatsAppButton />`:** Botón reutilizable con ícono WA. Variantes: inline (en tablas), floating (FAB), y CTA (en landing). *(Implementado en Fase 1 — `components/public/whatsapp-button.tsx`)*
- [ ] **`<WhatsAppTemplateSelector />`:** Selector de plantillas pre-aprobadas con preview del mensaje.
    - [ ] Plantillas: Confirmación de turno, Recordatorio de renovación, Vehículo listo, Promoción.
    - [ ] Variables dinámicas: `{{nombre}}`, `{{patente}}`, `{{fecha_turno}}`, `{{monto}}`.
- [ ] **`<WhatsAppChatPreview />`:** Preview del mensaje antes de enviar (simula burbuja de chat WA).

### Flujos de Envío
- [ ] **Desde Tabla de Suscriptores (Admin):**
    - [ ] Acción individual: Botón WA en cada fila → abre `<WhatsAppTemplateSelector />` → envía.
    - [ ] Acción masiva: Seleccionar múltiples clientes → enviar plantilla a todos (con rate limiting visual).
- [ ] **Desde Kanban (Operario):**
    - [ ] Al mover a "Listo para Retirar" → envío automático de "Tu vehículo está listo" (configurable on/off).
    - [ ] Botón manual en la card para enviar mensaje custom.
- [ ] **Desde Checkout (Cliente):**
    - [ ] Confirmación de suscripción → mensaje WA automático con detalles del plan y QR de membresía.
    - [ ] Confirmación de turno → mensaje WA con fecha, hora y dirección del local.
- [ ] **Hook `useWhatsApp()`:**
    - [ ] `sendTemplate(templateId, phone, variables)` — Envía plantilla vía API.
    - [ ] `openWhatsAppWeb(phone, message)` — Fallback: abre `wa.me/` con mensaje pre-armado.
    - [ ] Estado de envío: `idle` → `sending` → `sent` / `error` (con retry).

---

## Fase 5: Checkout & Cliente Final

### Landing Page del Lavadero
- [ ] **Generación Dinámica por Tenant:** Ruta `nereo.ar/[slug]` con datos del lavadero (nombre, logo, servicios, horarios, fotos).
- [ ] **Secciones:**
    - [ ] Hero con foto del local + CTA "Suscribite".
    - [ ] Planes de suscripción (cards comparativas con `<StatCard />` reutilizado).
    - [ ] Servicios disponibles con precios.
    - [ ] Mapa de ubicación (Google Maps embed).
    - [ ] Reseñas / testimonios.
    - [ ] Footer con datos de contacto + botón WhatsApp flotante.
- [ ] **SEO & Performance:**
    - [ ] Metadata dinámica por tenant (`generateMetadata`).
    - [ ] Open Graph tags para compartir en redes.
    - [ ] Lighthouse score objetivo: Performance > 90, Accessibility > 95.

### Flujo de Pago (Suscripción)
- [ ] **Multi-Step Checkout (`<MultiStepForm />`):**
    - [ ] Paso 1: Selección de plan (con toggle mensual/anual si aplica).
    - [ ] Paso 2: Datos personales + vehículo (patente, modelo).
    - [ ] Paso 3: Resumen + Pago in-app con **Mercado Pago Bricks** (ver detalle abajo).
    - [ ] Paso 4: Confirmación + generación de QR de membresía + envío WhatsApp.
- [ ] **Integración Mercado Pago Bricks (pago in-app):**
    - [ ] Usar `CardPayment Brick` del SDK `@mercadopago/sdk-react` para renderizar el formulario de tarjeta embebido directamente en el checkout. **No redirigir a Checkout Pro** — el flujo completo ocurre sin salir del sitio para maximizar conversión.
    - [ ] Configurar `initialization.amount` y `initialization.payer` con datos del paso anterior.
    - [ ] Manejar `onSubmit` callback: enviar `token` + `payment_method_id` + `installments` al backend (`POST /api/v1/payments/process`).
    - [ ] **Manejo de errores de tarjeta in-app:** Capturar `onError` y mapear códigos de error de MP a mensajes claros en español (ej: `cc_rejected_insufficient_amount` → "Fondos insuficientes. Probá con otra tarjeta."). Mostrar error inline debajo del formulario de tarjeta, sin recargar la página.
    - [ ] **Reintentos:** Permitir al usuario corregir datos o cambiar de tarjeta sin perder el estado del formulario (pasos 1 y 2 preservados en `sessionStorage`).
    - [ ] Fallback: Si Bricks no carga (timeout 10s), ofrecer link a Checkout Pro como alternativa.
    - [ ] Para suscripciones recurrentes: usar `CardPayment Brick` para tokenizar la tarjeta y luego crear el `preapproval` en el backend con el token.
- [ ] **Estados de Carga del Checkout:**
    - [ ] Skeleton del formulario mientras carga la config de planes.
    - [ ] Skeleton del Brick de MP mientras carga el SDK (evitar layout shift con `min-height` reservado).
    - [ ] Spinner + "Procesando pago..." durante la transacción (bloquear botón, deshabilitar back, deshabilitar cierre de pestaña con `beforeunload`).
    - [ ] Pantalla de éxito con animación (confetti o check animado).
    - [ ] Pantalla de error con mensaje específico del rechazo + opción de reintentar o contactar por WhatsApp.
- [ ] **Flujo de Lavado Único (sin suscripción):**
    - [ ] Checkout simplificado: Selección de servicio → Pago → Confirmación.

---

## Fase 6: Configuración del Local (Admin)

- [ ] **Ajustes Generales:**
    - [ ] Nombre, logo, dirección, teléfono WhatsApp del local.
    - [ ] Slug personalizado para la landing (`nereo.ar/[slug]`).
- [ ] **Horarios de Atención:**
    - [ ] Grilla semanal editable (Lun-Dom, apertura/cierre).
    - [ ] Soporte para feriados y días especiales.
- [ ] **Servicios & Precios:**
    - [ ] CRUD de servicios (nombre, descripción, duración estimada, precio).
    - [ ] Ordenamiento drag & drop para la landing.
- [ ] **Planes de Suscripción:**
    - [ ] CRUD de planes (nombre, cantidad de lavados, precio, período).
    - [ ] Activar/desactivar planes sin eliminarlos.
- [ ] **Configuración de WhatsApp:**
    - [ ] Vincular número de WhatsApp Business.
    - [ ] Activar/desactivar envíos automáticos por evento (vehículo listo, recordatorio de renovación).
    - [ ] Editar plantillas de mensaje (dentro de las aprobadas por Meta).
- [ ] **Gestión de Empleados:**
    - [ ] Alta/baja de operarios con acceso a la vista empleado.
    - [ ] Asignación de sucursal.

---

## Fase 7: Testing, Accesibilidad & Deploy

### Testing
- [ ] **Unit Tests (Vitest + Testing Library):**
    - [ ] Componentes shared: StatusBadge, DataTable, StatCard, PhoneInput, CurrencyInput, MultiStepForm.
    - [ ] Hooks: useAuth, useBranch, useRealtimeChannel, useBookingsRealtime, useAnalyticsRealtime.
    - [ ] Utilidades: api.ts (mock fetch), validations.ts, formatARS, normalizePhone.
- [ ] **Integration Tests:**
    - [ ] Flujo de checkout completo (plan selection → datos → pago → confirmación).
    - [ ] Check-in QR: scan → resultado → registro de lavado.
    - [ ] Kanban: drag & drop → optimistic update → SSE sync.
    - [ ] Login → redirect por rol → middleware protection.
- [ ] **E2E (Playwright):**
    - [ ] Flujo completo de suscripción: landing → checkout → pago → confirmación WA.
    - [ ] Admin: login → dashboard → suscriptores → detalle → acciones.
    - [ ] Operario: login → kanban → check-in → mover card → listo.
    - [ ] Mobile viewport tests para operario (PWA behavior).

### Accesibilidad (a11y)
- [ ] **Navegación por teclado** en todos los formularios, tablas y el Kanban.
- [ ] **ARIA labels** en componentes interactivos (Kanban drag zones, modales, tabs, dropdowns).
- [ ] **Contraste mínimo WCAG AA** en toda la app. Verificar con axe-core.
- [ ] **Touch targets mínimo 48x48px** en vista operario (verificar con Lighthouse).
- [ ] **Screen reader testing** en flujos críticos (checkout, check-in).

### Deploy & CI/CD
- [ ] **Deploy en Vercel** con preview deployments por PR.
- [ ] **Variables de entorno** por ambiente (dev/staging/prod): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_WA_PHONE`.
- [ ] **CI Pipeline (GitHub Actions):**
    - [ ] Lint + TypeScript check en cada PR.
    - [ ] Vitest unit tests.
    - [ ] Playwright E2E en preview deployment.
    - [ ] Bundle size check (fail si > threshold).
- [ ] **Monitoreo:**
    - [ ] Vercel Analytics o custom Web Vitals reporting.
    - [ ] Error tracking (Sentry) con source maps.
    - [ ] Uptime monitoring del SSE endpoint.