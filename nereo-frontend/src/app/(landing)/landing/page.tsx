"use client";

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CreditCard,
  BarChart3,
  Smartphone,
  QrCode,
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { FrameSequence } from "@/components/landing/frame-sequence";
import { LandingHeader } from "@/components/landing/landing-header";
import { cn } from "@/lib/utils";

// --- Config ---
const FRAME_COUNT = 40;
const framePath = (i: number) =>
  `/landing/frames/ezgif-frame-${String(i + 1).padStart(3, "0")}.jpg`;

// --- Page ---
export default function LandingPage() {
  return (
    <div className="relative bg-black">
      <LandingHeader />
      <HeroSection />
      <ValuePropsSection />
      <HowItWorksSection />
      <MetricsSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}

// ============================================================
// HERO — Scroll-triggered frame animation with synced text
// ============================================================

const heroSlides = [
  {
    // 0% – 20% scroll
    title: "Papeles, cuadernos\ny estrés.",
    subtitle: "Así se gestiona un lavadero hoy.",
    position: "center" as const,
  },
  {
    // 20% – 45% scroll
    title: "¿Y si todo eso\ndesapareciera?",
    subtitle: "",
    position: "center" as const,
  },
  {
    // 45% – 70% scroll
    title: "Turnos, membresías\ny cobros.",
    subtitle: "Todo automático. Todo digital.",
    position: "center" as const,
  },
  {
    // 70% – 100% scroll
    title: "Conocé Nereo.",
    subtitle: "La plataforma que tu lavadero necesita.",
    cta: true,
    position: "center" as const,
  },
];

function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const [activeSlide, setActiveSlide] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.2) setActiveSlide(0);
    else if (latest < 0.45) setActiveSlide(1);
    else if (latest < 0.7) setActiveSlide(2);
    else setActiveSlide(3);
  });

  // Compute opacity for each slide based on scroll progress
  const slide0Opacity = useTransform(scrollYProgress, [0, 0.15, 0.2, 0.25], [1, 1, 0.5, 0]);
  const slide1Opacity = useTransform(scrollYProgress, [0.15, 0.25, 0.4, 0.5], [0, 1, 1, 0]);
  const slide2Opacity = useTransform(scrollYProgress, [0.4, 0.5, 0.65, 0.75], [0, 1, 1, 0]);
  const slide3Opacity = useTransform(scrollYProgress, [0.65, 0.75, 1], [0, 1, 1]);

  const slideOpacities = [slide0Opacity, slide1Opacity, slide2Opacity, slide3Opacity];

  // Y offset for parallax feel
  const slide0Y = useTransform(scrollYProgress, [0, 0.15, 0.25], [0, 0, -40]);
  const slide1Y = useTransform(scrollYProgress, [0.15, 0.25, 0.5], [40, 0, -40]);
  const slide2Y = useTransform(scrollYProgress, [0.4, 0.5, 0.75], [40, 0, -40]);
  const slide3Y = useTransform(scrollYProgress, [0.65, 0.75, 1], [40, 0, 0]);

  const slideYs = [slide0Y, slide1Y, slide2Y, slide3Y];

  return (
    <section ref={sectionRef} className="relative h-[500vh]">
      {/* Sticky container for canvas + text */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Frame animation canvas */}
        <FrameSequence
          frameCount={FRAME_COUNT}
          framePath={framePath}
          className="absolute inset-0"
          scrollTarget={sectionRef}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Text slides */}
        <div className="absolute inset-0 flex items-center justify-center">
          {heroSlides.map((slide, i) => (
            <motion.div
              key={i}
              style={{ opacity: slideOpacities[i], y: slideYs[i] }}
              className="absolute mx-auto max-w-3xl px-6 text-center"
            >
              <h1 className="whitespace-pre-line text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-7xl">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="mx-auto mt-4 max-w-xl text-base text-white/80 drop-shadow-lg sm:mt-6 sm:text-lg md:text-xl">
                  {slide.subtitle}
                </p>
              )}
              {slide.cta && (
                <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
                  <Button
                    size="lg"
                    className="w-full text-base font-semibold sm:w-auto"
                    asChild
                  >
                    <Link href="/registro">
                      Empezá gratis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-white/30 bg-white/10 text-base font-semibold text-white backdrop-blur hover:bg-white/20 sm:w-auto"
                    asChild
                  >
                    <a href="#como-funciona">Ver cómo funciona</a>
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Scroll hint — only on first slide */}
        <motion.div
          style={{ opacity: slide0Opacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="h-6 w-6 animate-bounce text-white/50" />
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// VALUE PROPS
// ============================================================
const features = [
  {
    icon: CalendarCheck,
    title: "Turnos online",
    description:
      "Tus clientes reservan desde WhatsApp o la web. Vos ves todo en un calendario en tiempo real.",
  },
  {
    icon: CreditCard,
    title: "Membresías automáticas",
    description:
      "Cobrá mensual con débito automático. Renovaciones, recordatorios y vencimientos sin intervención.",
  },
  {
    icon: BarChart3,
    title: "Métricas en vivo",
    description:
      "Dashboard con ingresos, lavados por día, tasa de retención y más. Decisiones basadas en datos.",
  },
  {
    icon: QrCode,
    title: "Check-in con QR",
    description:
      "El operario escanea el QR del cliente y en 2 segundos valida la membresía. Sin papeles.",
  },
  {
    icon: Smartphone,
    title: "App para operarios",
    description:
      "PWA optimizada para el empleado: check-in, cola de lavados, estado en tiempo real.",
  },
  {
    icon: Users,
    title: "Gestión de clientes",
    description:
      "Base de datos de clientes con historial de lavados, membresías, pagos y comunicaciones.",
  },
];

function ValuePropsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative z-10 bg-background py-20 sm:py-28 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Todo en un solo lugar
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que necesitás para crecer
          </h2>
          <p className="mt-4 text-muted-foreground">
            Nereo reemplaza las planillas, los cuadernos y los grupos de
            WhatsApp con una plataforma profesional.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================
const steps = [
  {
    number: "01",
    title: "Registrate",
    description:
      "Creá tu cuenta en 2 minutos. Sin tarjeta de crédito, sin compromiso.",
  },
  {
    number: "02",
    title: "Configurá tu lavadero",
    description:
      "Cargá tus servicios, precios, horarios y empleados. Te guiamos paso a paso.",
  },
  {
    number: "03",
    title: "Empezá a facturar",
    description:
      "Compartí el link con tus clientes. Ellos reservan, vos cobrás. Así de simple.",
  },
];

function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="como-funciona"
      ref={ref}
      className="relative z-10 bg-muted/40 py-20 sm:py-28 md:py-32"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Simple y rápido
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Arrancá en 3 pasos
          </h2>
        </motion.div>

        <div className="mt-14 sm:mt-16">
          <div className="relative grid gap-8 md:grid-cols-3 md:gap-12">
            {/* Connector line (desktop) */}
            <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent md:block" />

            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 * i }}
                className="relative text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
                  {step.number}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// METRICS
// ============================================================
const metrics = [
  { value: "500+", label: "Lavaderos activos" },
  { value: "50K+", label: "Lavados gestionados" },
  { value: "98%", label: "Satisfacción" },
  { value: "<2s", label: "Tiempo de check-in" },
];

function MetricsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative z-10 bg-primary py-16 sm:py-20 md:py-24"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="text-center"
            >
              <p className="text-3xl font-extrabold text-primary-foreground sm:text-4xl md:text-5xl">
                {metric.value}
              </p>
              <p className="mt-2 text-sm font-medium text-primary-foreground/70">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS
// ============================================================
const testimonials = [
  {
    name: "Martín R.",
    role: "Dueño — Lavadero Express, CABA",
    quote:
      "Antes perdía 2 horas por día anotando turnos y cobrando. Con Nereo todo es automático. Mis clientes reservan solos y yo me enfoco en el negocio.",
    rating: 5,
  },
  {
    name: "Carolina S.",
    role: "Gerente — AutoSpa Premium, Córdoba",
    quote:
      "Las membresías automáticas nos triplicaron la retención. Los clientes ya no se olvidan de renovar y nosotros cobramos sin perseguir a nadie.",
    rating: 5,
  },
  {
    name: "Diego L.",
    role: "Operario — WashPro, Rosario",
    quote:
      "La app es re fácil. Escaneo el QR, veo qué servicio tiene el cliente y listo. No necesito preguntar nada ni buscar en un cuaderno.",
    rating: 5,
  },
];

function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative z-10 bg-background py-20 sm:py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Testimonios
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que dicen nuestros clientes
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * i }}
              className="flex flex-col rounded-2xl border bg-card p-6"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 border-t pt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PRICING
// ============================================================
const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    description: "Para lavaderos que recién arrancan",
    features: [
      "Hasta 50 clientes",
      "Turnos online",
      "Check-in con QR",
      "1 operario",
      "Soporte por email",
    ],
    cta: "Empezá gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29.990",
    period: "/mes",
    description: "Para lavaderos en crecimiento",
    features: [
      "Clientes ilimitados",
      "Membresías automáticas",
      "Dashboard completo",
      "Hasta 5 operarios",
      "Notificaciones WhatsApp",
      "Soporte prioritario",
    ],
    cta: "Probá 14 días gratis",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Personalizado",
    period: "",
    description: "Para cadenas y franquicias",
    features: [
      "Multi-sucursal",
      "API personalizada",
      "Operarios ilimitados",
      "Integraciones custom",
      "Account manager dedicado",
      "SLA garantizado",
    ],
    cta: "Contactanos",
    highlighted: false,
  },
];

function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="precios"
      ref={ref}
      className="relative z-10 bg-muted/40 py-20 sm:py-28 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Precios
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Elegí tu plan
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sin contratos. Cancelá cuando quieras. Empezá gratis.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:mt-16 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * i }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 sm:p-8",
                plan.highlighted &&
                  "border-primary shadow-xl ring-1 ring-primary/20"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Más popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <div className="mt-5">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                size="lg"
                asChild
              >
                <Link href="/registro">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FINAL CTA
// ============================================================
function FinalCTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative z-10 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 py-20 sm:py-28 md:py-32"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl md:text-5xl">
            Tu lavadero merece
            <br />
            funcionar mejor.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
            Unite a los lavaderos que ya dejaron de perder tiempo y plata con
            métodos manuales.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="w-full text-base font-semibold sm:w-auto"
              asChild
            >
              <Link href="/registro">
                Empezá gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              asChild
            >
              <a href="mailto:hola@nereo.ar">Hablá con ventas</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer() {
  return (
    <footer className="relative z-10 border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                N
              </div>
              <span className="text-lg font-bold">Nereo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma de gestión integral para lavaderos de autos.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Producto
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#como-funciona"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cómo funciona
                </a>
              </li>
              <li>
                <a
                  href="#precios"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Precios
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terminos"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Política de privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contacto
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:hola@nereo.ar"
                  className="text-muted-foreground hover:text-foreground"
                >
                  hola@nereo.ar
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nereo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
