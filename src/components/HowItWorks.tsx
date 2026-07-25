import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Boxes, Rocket, ShoppingBag, Store, UserRound,
  Package, Wallet, TrendingUp, Sparkles, ChevronDown, Truck, Coins,
  HelpCircle, PlayCircle, ShieldCheck, Users
} from 'lucide-react';

/* ───────────────── Tipos de datos ───────────────── */
type ProfileKey = 'cliente' | 'proveedor' | 'vendedor';

interface Step {
  title: string;
  text: string;
  icon: React.FC<{ className?: string }>;
}

interface Profile {
  key: ProfileKey;
  title: string;
  icon: React.FC<{ className?: string }>;
  tagline: string;
  description: string;
  steps: Step[];
  cta: { label: string; to: string };
  flowNodes: { icon: React.FC<{ className?: string }>; label: string }[];
}

/* ───────────────── Datos de los 3 perfiles ───────────────── */
const profiles: Profile[] = [
  {
    key: 'cliente',
    title: 'Cliente',
    icon: ShoppingBag,
    tagline: 'Compra tecnología, recíbela en casa.',
    description: 'Encuentra tecnología y estilo de vida con precios competitivos, pago seguro y envío nacional cubierto.',
    steps: [
      { title: 'Explora y Compara', text: 'Busca productos en tecnología y estilo de vida con precios competitivos y reseñas reales.', icon: UserRound },
      { title: 'Compra Segura', text: 'Paga con métodos locales (tarjeta, PSE, efectivo) y recibe cobertura en tus envíos nacionales.', icon: ShieldCheck },
      { title: 'Recibe y Disfruta', text: 'Rastrea tu pedido en tiempo real hasta la puerta de tu casa con notificaciones por WhatsApp.', icon: Truck },
    ],
    cta: { label: 'Explorar Tienda', to: '/' },
    flowNodes: [
      { icon: ShoppingBag, label: 'Descubres' },
      { icon: Wallet, label: 'Pagas' },
      { icon: Truck, label: 'Recibes' },
    ],
  },
  {
    key: 'proveedor',
    title: 'Proveedor',
    icon: Store,
    tagline: 'Vende tu inventario a toda la red.',
    description: 'Publica tu catálogo, administralo en tiempo real y llega a miles de vendedores y clientes directos.',
    steps: [
      { title: 'Registra tu Marca', text: 'Completa tu perfil comercial (NIT, logo, datos) y sube tu catálogo con fotos reales.', icon: Store },
      { title: 'Conecta con Vendedores', text: 'Tu inventario se vuelve visible para miles de dropshippers y clientes directos en toda Colombia.', icon: Users },
      { title: 'Despacha y Cobra', text: 'Recibe las órdenes pagadas, prepara el paquete y recibe tus ganancias en batch (martes/viernes).', icon: Wallet },
    ],
    cta: { label: 'Registrar mi Inventario', to: '/register' },
    flowNodes: [
      { icon: Store, label: 'Publicas' },
      { icon: Package, label: 'Despachas' },
      { icon: Coins, label: 'Cobras' },
    ],
  },
  {
    key: 'vendedor',
    title: 'Vendedor',
    icon: Rocket,
    tagline: 'Vende sin inventario, gana desde el día 1.',
    description: 'Dropshipping real: eliges productos de proveedores verificados y los ofreces sin comprar inventario previo.',
    steps: [
      { title: 'Elige Productos', text: 'Explora el catálogo de proveedores verificados sin necesidad de comprar inventario previamente.', icon: Boxes },
      { title: 'Vende a tu Precio', text: 'Ofrece los productos a tus clientes a través de tu tienda, Instagram, TikTok o WhatsApp.', icon: TrendingUp },
      { title: 'Gana Comisiones', text: 'Nosotros nos encargamos de la logística y tú recibes tus ganancias desde el primer pedido.', icon: Sparkles },
    ],
    cta: { label: 'Comenzar como Vendedor', to: '/register' },
    flowNodes: [
      { icon: Boxes, label: 'Eliges' },
      { icon: Users, label: 'Vendes' },
      { icon: Coins, label: 'Ganas' },
    ],
  },
];

/* ───────────────── FAQ ───────────────── */
const faqs = [
  {
    q: '¿Cuesta dinero registrarse como Vendedor o Proveedor?',
    a: 'No. Registrarte en LiluTecno es 100% gratuito. Nosotros ganamos solo cuando tú ganas: una pequeña comisión por venta exitosa. Sin suscripciones, sin pagos ocultos.',
  },
  {
    q: '¿Quién responde por las garantías y los envíos?',
    a: 'El Proveedor garantiza el estado del producto y LiluTecno coordina el envío con mensajeros verificados. Si algo llega dañado, gestionamos la devolución o reposición sin que tengas que pelear con terceros.',
  },
  {
    q: '¿En cuánto tiempo se verifican las cuentas comerciales?',
    a: 'Las cuentas de Cliente activan al instante. Las cuentas de Proveedor y Vendedor se verifican en menos de 24 horas hábiles para proteger a toda la red (logo, NIT y datos de contacto).',
  },
  {
    q: '¿Cómo recibo mi dinero?',
    a: 'Los proveedores reciben transferencias batch los martes y viernes a la cuenta bancaria o Nequi registrada. Los vendedores ven su comisión acumulada en su panel y se paga junto con cada pedido confirmado.',
  },
  {
    q: '¿Puedo cambiar de rol después de registrarme?',
    a: 'Sí. Tu cuenta te permite navegar entre vistas de Cliente, Proveedor y Vendedor según tu actividad actual. Solo elige el panel desde tu menú "Mi cuenta".',
  },
];

/* ───────────────── Helpers ───────────────── */
const useEarningsSimulator = (role: 'vendedor' | 'proveedor') => {
  const [quantity, setQuantity] = useState(role === 'vendedor' ? 30 : 150);
  const [margin, setMargin] = useState(role === 'vendedor' ? 15 : 18);

  const avgTicket = role === 'vendedor' ? 280000 : 195000;
  const monthlyEstimate = useMemo(() => {
    const ticket = avgTicket * (margin / 100);
    return Math.round(quantity * 30 * ticket);
  }, [quantity, margin, avgTicket]);

  return { quantity, setQuantity, margin, setMargin, monthlyEstimate };
};

/* ───────────────── Componentes ───────────────── */

/* Hero intro con badges animados (sin video externo — pura animación CSS) */
const Hero: React.FC = () => (
  <div className="mx-auto max-w-3xl text-center">
    <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[.28em] text-orange-300">
      <Sparkles className="h-3.5 w-3.5" /> El ecosistema Lilu Tecno
    </span>
    <h2 className="mt-6 font-montserrat text-3xl font-light sm:text-5xl tracking-tight">
      La tecnología <span className="text-orange-400">se mueve mejor</span> en equipo.
    </h2>
    <p className="mt-5 text-sm leading-7 text-slate-300">
      Lilu Tecno conecta personas, productos y oportunidades en un solo lugar. Compra, vende o reventa tecnología sin fricciones.
      Elige cómo quieres participar y descubre cómo el dinero y los productos viajan en solo 3 pasos.
    </p>

    {/* Mini demo animada: 3 pasos en una línea horizontal */}
    <div className="mt-10 hidden md:flex items-center justify-center gap-3 text-[10px] uppercase tracking-[.2em] text-slate-400">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-2 animate-fade-up">
        <Package className="h-4 w-4 text-orange-400" /> Producto
      </div>
      <ArrowRight className="h-4 w-4 text-purple-300 animate-pulse" />
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-2 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <Wallet className="h-4 w-4 text-orange-400" /> Pago
      </div>
      <ArrowRight className="h-4 w-4 text-purple-300 animate-pulse" />
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-2 animate-fade-up" style={{ animationDelay: '240ms' }}>
        <Truck className="h-4 w-4 text-orange-400" /> Entrega
      </div>
    </div>
  </div>
);

/* Tabs de selección de perfil */
const ProfileTabs: React.FC<{ active: ProfileKey; setActive: (k: ProfileKey) => void }> = ({ active, setActive }) => (
  <div className="mt-12 grid gap-4 md:grid-cols-3">
    {profiles.map(item => {
      const ItemIcon = item.icon;
      const isActive = active === item.key;
      return (
        <button
          key={item.key}
          onClick={() => setActive(item.key)}
          className={`group rounded-2xl border p-6 text-left transition-all duration-400 cubic-bezier(0.16,1,0.3,1) ${
            isActive
              ? 'border-orange-400/60 bg-white/[.08] shadow-[0_18px_45px_rgba(123,44,191,.22)] -translate-y-1'
              : 'border-white/10 bg-white/[.03] hover:bg-white/[.06] hover:border-white/20'
          }`}
        >
          <div className={`flex items-center justify-center rounded-2xl transition-colors duration-400 ${isActive ? 'bg-gradient-to-br from-orange-500 to-purple-700' : 'bg-white/[.06] group-hover:bg-white/[.10]'}`} style={{ height: 56, width: 56 }}>
            <ItemIcon className={`h-7 w-7 transition-colors duration-400 ${isActive ? 'text-white' : 'text-purple-300 group-hover:text-orange-300'}`} />
          </div>
          <h3 className="mt-5 font-montserrat text-xl text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{item.tagline}</p>
          {isActive && (
            <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.22em] text-orange-400 animate-fade-up">
              Ver flujo <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/* Diagrama de flujo interactivo — al hover pulsa el nodo */
const FlowDiagram: React.FC<{ profile: Profile }> = ({ profile }) => (
  <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-5">
    {profile.flowNodes.map((node, idx) => {
      const NodeIcon = node.icon;
      return (
        <div key={node.label} className="relative animate-fade-up" style={{ animationDelay: `${idx * 120}ms` }}>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 transition-all duration-400 hover:border-orange-400/40 hover:bg-white/[.08] hover:-translate-y-1 group cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-700/20 border border-white/10 transition-all duration-400 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-purple-700">
              <NodeIcon className="h-6 w-6 text-orange-300 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-200 group-hover:text-white">{node.label}</span>
          </div>
          {idx < 2 && (
            <ArrowRight className="absolute top-1/2 -right-3 hidden -translate-y-1/2 h-5 w-5 text-purple-300 md:block animate-pulse" />
          )}
        </div>
      );
    })}
  </div>
);

/* Lista de pasos detallada */
const StepList: React.FC<{ profile: Profile }> = ({ profile }) => (
  <ol className="mt-8 grid gap-4 sm:grid-cols-3">
    {profile.steps.map((step, idx) => {
      const StepIcon = step.icon;
      return (
        <li
          key={step.title}
          className="group relative rounded-2xl border border-white/10 bg-white/[.03] p-6 transition-all duration-400 hover:border-orange-400/30 hover:bg-white/[.06] hover:-translate-y-1 animate-fade-up"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/15 border border-orange-400/30">
              <StepIcon className="h-4 w-4 text-orange-400" />
            </div>
            <span className="text-[10px] font-bold tracking-[.2em] text-orange-400">PASO 0{idx + 1}</span>
          </div>
          <h4 className="mt-4 text-sm font-semibold text-white">{step.title}</h4>
          <p className="mt-2 text-xs leading-6 text-slate-400">{step.text}</p>
        </li>
      );
    })}
  </ol>
);

/* Simulador de ganancias interactivo */
const EarningsSimulator: React.FC<{ role: 'vendedor' | 'proveedor' }> = ({ role }) => {
  const { quantity, setQuantity, margin, setMargin, monthlyEstimate } = useEarningsSimulator(role);

  const qMax = role === 'vendedor' ? 100 : 500;
  const mMax = role === 'vendedor' ? 30 : 35;
  const mMin = role === 'vendedor' ? 5 : 8;

  const fmt = (n: number) => '$' + n.toLocaleString('es-CO');
  const dailyRevenue = Math.round(monthlyEstimate / 30);

  return (
    <div className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0e29]/80 to-[#15101e]/80 p-7 backdrop-blur-xl sm:p-10">
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.22em] text-orange-300">
          <TrendingUp className="h-3.5 w-3.5" /> Simulador en vivo
        </span>
        <h3 className="mt-3 font-montserrat text-2xl font-light text-white">¿Cuánto puedes ganar como {role === 'vendedor' ? 'Vendedor' : 'Proveedor'}?</h3>
        <p className="mt-1 text-xs text-slate-400 leading-6">Mueve los sliders y descubre tu estimado mensual en tiempo real.</p>
      </div>

      <div className="mt-7 grid gap-7 md:grid-cols-2">
        {/* Sliders */}
        <div className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">Ventas / día</label>
              <span className="font-montserrat text-lg font-medium text-white">{quantity}</span>
            </div>
            <input
              type="range"
              min={1}
              max={qMax}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="mt-3 w-full appearance-none h-[4px] rounded-full bg-white/10 cursor-pointer"
              style={{ accentColor: '#ff7a00' }}
            />
            <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[.18em] text-slate-500">
              <span>1</span><span>{qMax}</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">Margen (%)</label>
              <span className="font-montserrat text-lg font-medium text-white">{margin}%</span>
            </div>
            <input
              type="range"
              min={mMin}
              max={mMax}
              value={margin}
              onChange={e => setMargin(Number(e.target.value))}
              className="mt-3 w-full appearance-none h-[4px] rounded-full bg-white/10 cursor-pointer"
              style={{ accentColor: '#7b2cbf' }}
            />
            <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[.18em] text-slate-500">
              <span>{mMin}%</span><span>{mMax}%</span>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="rounded-2xl border border-orange-400/25 bg-gradient-to-br from-orange-500/[.08] to-purple-500/[.08] p-6 flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-300">Ingreso mensual estimado</p>
          <p className="mt-3 font-montserrat text-4xl sm:text-5xl font-light text-orange-400 tracking-tight tabular-nums">
            {fmt(monthlyEstimate)}
          </p>
          <p className="mt-3 text-[11px] text-slate-400">
            Aprox. <span className="text-white font-medium">{fmt(dailyRevenue)}</span> al día · {quantity * 30} ventas/mes
          </p>
          <p className="mt-4 text-[10px] text-slate-500 leading-5">* Estimado orientativo basado en ticket promedio. Tu ganancia real depende de los productos que elijas.</p>
        </div>
      </div>
    </div>
  );
};

/* Quiz "¿Cuál es tu rol ideal?" */
const Quiz: React.FC<{ onPick: (k: ProfileKey) => void }> = ({ onPick }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{ q1?: 'yes' | 'no'; q2?: 'buy' | 'sell' }>({});

  const questions = [
    {
      prompt: '¿Tienes productos propios para vender?',
      options: [
        { label: 'Sí, tengo inventario', value: 'yes' as const },
        { label: 'No, tengo clientes', value: 'no' as const },
      ],
      answerKey: 'q1' as const,
    },
    {
      prompt: '¿Qué te emociona más?',
      options: [
        { label: 'Comprar tecnología para mí', value: 'buy' as const },
        { label: 'Venderle a otros y ganar', value: 'sell' as const },
      ],
      answerKey: 'q2' as const,
    },
  ];

  const result = useMemo<ProfileKey | null>(() => {
    if (!answers.q1 || !answers.q2) return null;
    if (answers.q1 === 'yes') return 'proveedor';
    if (answers.q2 === 'buy') return 'cliente';
    return 'vendedor';
  }, [answers]);

  const reset = () => { setAnswers({}); setStep(0); };

  return (
    <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.03] p-7 backdrop-blur-xl sm:p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-400/30">
          <HelpCircle className="h-4 w-4 text-purple-300" />
        </div>
        <div>
          <h3 className="font-montserrat text-xl font-light text-white">¿Cuál es tu rol ideal?</h3>
          <p className="text-[11px] text-slate-400">2 preguntas rápidas y te lo decimos.</p>
        </div>
      </div>

      {result === null ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-200">{questions[step].prompt}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {questions[step].options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers(prev => ({ ...prev, [questions[step].answerKey]: opt.value }));
                  if (step < questions.length - 1) setStep(step + 1);
                }}
                className="rounded-xl border border-white/12 bg-white/[.04] px-4 py-3.5 text-left text-sm text-white transition-all duration-300 hover:border-orange-400/40 hover:bg-orange-400/[.08] hover:-translate-y-0.5"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2">
            {questions.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-orange-400' : 'w-4 bg-white/15'}`} />
            ))}
            <span className="ml-2 text-[10px] uppercase tracking-[.2em] text-slate-500">Pregunta {step + 1} de {questions.length}</span>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/[.08] to-purple-500/[.08] p-6 animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-orange-400">Tu rol sugerido</p>
          <p className="mt-2 font-montserrat text-2xl font-light text-white">
            {profiles.find(p => p.key === result)!.title}
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-6">{profiles.find(p => p.key === result)!.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onPick(result)}
              className="btn-glass-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.2em]"
            >
              Ver mi flujo <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={reset}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.2em] text-white hover:bg-white/10 transition-colors"
            >
              Hacerlo de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* FAQ acordeón */
const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mt-12 mx-auto max-w-3xl">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[.28em] text-purple-300">
          <HelpCircle className="h-3.5 w-3.5" /> Preguntas frecuentes
        </span>
        <h3 className="mt-4 font-montserrat text-2xl sm:text-3xl font-light text-white">Resolver tus dudas primero</h3>
      </div>
      <div className="space-y-3">
        {faqs.map((item, i) => (
          <div
            key={i}
            className={`rounded-2xl border transition-all duration-300 ${
              open === i ? 'border-orange-400/30 bg-white/[.05]' : 'border-white/10 bg-white/[.03] hover:bg-white/[.05]'
            }`}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-white">{item.q}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-orange-400 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-5 pt-0 animate-fade-up">
                <p className="text-xs leading-7 text-slate-300">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ───────────────── Componente principal ───────────────── */
const HowItWorks: React.FC = () => {
  const [active, setActive] = useState<ProfileKey>('cliente');
  const profile = profiles.find(item => item.key === active)!;

  return (
    <section id="como-funciona" className="relative overflow-hidden py-20 sm:py-28">
      {/* Glow ambientales */}
      <div className="absolute left-[-8rem] top-28 h-80 w-80 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="absolute right-[-8rem] bottom-0 h-80 w-80 rounded-full bg-purple-600/15 blur-[120px]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <Hero />

        {/* Tabs de selección */}
        <ProfileTabs active={active} setActive={setActive} />

        {/* Panel dinámico con el flujo del perfil seleccionado */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#12091c]/70 p-7 backdrop-blur-xl sm:p-10 animate-fade-up" key={active}>
          <div className="grid items-start gap-8 lg:grid-cols-[.9fr_1.1fr]">
            {/* Bloque izquierdo: descripcion + CTA */}
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-purple-700">
                <profile.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mt-5 font-montserrat text-2xl sm:text-3xl font-light text-white tracking-tight">Tu ruta como {profile.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{profile.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={profile.cta.to} className="btn-glass-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-bold uppercase tracking-[.22em]">
                  {profile.cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/register" className="rounded-xl border border-white/15 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.22em] text-white hover:bg-white/10 transition-colors">
                  Crear mi cuenta
                </Link>
              </div>
            </div>

            {/* Bloque derecho: diagrama de flujo animado */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-400 mb-3">Así fluyen los productos y el dinero</p>
              <FlowDiagram profile={profile} />
              <StepList profile={profile} />
            </div>
          </div>
        </div>

        {/* Simulador de ganancias (solo para roles comerciales) */}
        {active === 'vendedor' && <EarningsSimulator role="vendedor" />}
        {active === 'proveedor' && <EarningsSimulator role="proveedor" />}

        {/* Quiz interactivo */}
        <Quiz onPick={(k) => { setActive(k); window.scrollTo({ top: 320, behavior: 'smooth' }); }} />

        {/* FAQ */}
        <FAQ />

        {/* CTA final */}
        <div className="mt-14 rounded-3xl border border-white/10 bg-white/[.03] p-7 backdrop-blur-xl sm:p-10 text-center">
          <div className="mx-auto max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[.28em] text-orange-300">
              <PlayCircle className="h-3.5 w-3.5" /> Empieza hoy
            </span>
            <h3 className="mt-5 font-montserrat text-2xl sm:text-3xl font-light text-white tracking-tight">Tres decisiones, cero complicaciones.</h3>
            <p className="mt-3 text-sm text-slate-300 leading-6">Crea tu cuenta en menos de 2 minutos. Clientes entran al instante; perfiles comerciales se verifican en 24h.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-glass-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-bold uppercase tracking-[.22em]">
                Registrarme ahora <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/" className="rounded-xl border border-white/15 px-6 py-3 text-[10px] font-semibold uppercase tracking-[.22em] text-white hover:bg-white/10 transition-colors">
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
