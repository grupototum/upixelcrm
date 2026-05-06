import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import {
  ArrowRight, CheckCircle2, MessageSquare, Zap, BarChart3,
  Bot, Kanban, Users, Shield, Globe, Send, TrendingUp,
  Phone, ChevronDown,
} from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";

/* ─── tokens (mirrors index.css Zapier DS) ───────────────────────── */
const C = {
  cream: "#fffefb",
  offWhite: "#fffdf9",
  sand: "#c5c0b1",
  lightSand: "#eceae3",
  warmGray: "#939084",
  charcoal: "#36342e",
  black: "#201515",
  orange: "#ff4f00",
};

const SYNE: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif" };

/* ─── data ───────────────────────────────────────────────────────── */
const STATS = [
  { value: "500+", label: "Empresas ativas" },
  { value: "10M+", label: "Mensagens enviadas" },
  { value: "98%", label: "Uptime garantido" },
  { value: "3×", label: "Velocidade de fechamento" },
];

const PILLARS = [
  {
    num: "01",
    tag: "INBOX MULTI-CANAL",
    headline: "Todos os canais.\nUma só caixa.",
    body: "WhatsApp, Instagram, E-mail e Webchat centralizados com atribuição automática por equipe, SLA configurável e histórico completo de cada conversa — sem alternar abas.",
    items: [
      "WhatsApp Evolution API & Meta Business Oficial",
      "Instagram Direct, Facebook Messenger & Webchat",
      "Gmail / SMTP / SendGrid / AWS SES",
      "Round-robin automático + transferência com histórico",
    ],
  },
  {
    num: "02",
    tag: "DISPAROS EM MASSA",
    headline: "Escale as vendas\nsem ser bloqueado.",
    body: "Segmentação avançada por tags, score e campos customizados. Throttling anti-bloqueio, rotação de instâncias e opt-out automático. ROI calculado por campanha em tempo real.",
    items: [
      "A/B testing com métricas de entrega, leitura e resposta",
      "Intervalo aleatório entre envios (anti-padrão de bot)",
      "Templates HSM aprovados pela Meta + variáveis dinâmicas",
      "Importação de listas via CSV com DNC integrado",
    ],
  },
  {
    num: "03",
    tag: "AUTOMAÇÕES COM IA",
    headline: "Seu time trabalhando\nenquanto você dorme.",
    body: "Builder visual drag-and-drop com 50+ tipos de ação. IA Alexandria com RAG sobre sua base de conhecimento. Lead scoring, churn prediction e win probability automáticos.",
    items: [
      "Workflows sem código — disparos, CRM e integrações",
      "IA Alexandria: base RAG com docs, FAQs e políticas",
      "Follow-up, upsell e re-engagement automatizados",
      "Compatível com Kommo — migração zero-downtime",
    ],
  },
];

const FEATURES = [
  { icon: Kanban, title: "Pipeline Visual", desc: "Arraste leads por etapas customizáveis com forecasting automático e deal tracking." },
  { icon: BarChart3, title: "Analytics em Tempo Real", desc: "Funil de conversão, performance por vendedor, cohort analysis e drilldown interativo." },
  { icon: Bot, title: "AI Copilot", desc: "Sugestões de resposta e detecção de objeções com IA durante o atendimento ao vivo." },
  { icon: Users, title: "RBAC Granular", desc: "6 níveis de permissão por módulo, equipe e território com auditoria completa de ações." },
  { icon: Shield, title: "LGPD & GDPR", desc: "Criptografia end-to-end, soft delete, exportação de dados e log de acesso inclusos." },
  { icon: Globe, title: "Multi-tenant", desc: "Cada cliente em subdomínio isolado. RLS no PostgreSQL garante zero vazamento entre tenants." },
];

const PLANS = [
  {
    name: "Starter",
    price: "R$ 99",
    period: "/mês",
    desc: "Para times que estão começando",
    features: [
      "Inbox + 1 canal (WhatsApp)",
      "100 automações/mês",
      "Pipeline visual",
      "Relatórios básicos",
      "Suporte em PT-BR",
    ],
    cta: "Começar grátis",
    dark: false,
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 299",
    period: "/mês",
    desc: "Para times que querem escalar",
    features: [
      "Todos os canais de comunicação",
      "Disparos ilimitados (anti-bloqueio)",
      "10 000 automações/mês",
      "IA Alexandria (RAG)",
      "Analytics avançado + A/B testing",
      "API REST + Webhooks",
    ],
    cta: "Assinar Pro",
    dark: true,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "R$ 999+",
    period: "/mês",
    desc: "Para operações complexas",
    features: [
      "Tudo do Pro",
      "White-label (logo + domínio próprio)",
      "SLA dedicado + suporte prioritário",
      "Integrações customizadas",
      "API ilimitada",
      "Treinamento para o time",
    ],
    cta: "Falar com especialista",
    dark: false,
    popular: false,
  },
];

const CHANNELS = ["WhatsApp", "Instagram", "Facebook", "Gmail", "Zapier", "Make", "Stripe", "MercadoPago", "HubSpot", "RD Station", "Google Calendar", "Hotmart"];

const FAQS = [
  { q: "Preciso instalar alguma coisa?", a: "Não. uPixel é 100% web — acesse pelo navegador em qualquer dispositivo, sem instalação." },
  { q: "O WhatsApp pode ser bloqueado nos disparos?", a: "Nosso sistema usa throttling configurável, intervalo aleatório entre envios, rotação de instâncias e opt-out automático para minimizar ao máximo o risco de bloqueio." },
  { q: "Posso migrar do Kommo (Amojo)?", a: "Sim. uPixel é Kommo-compatible — importamos suas automações via JSON e mapeamos triggers/ações automaticamente. Migração zero-downtime." },
  { q: "A IA funciona em português?", a: "Sim. Alexandria é treinada com sua base de conhecimento em PT-BR e responde no idioma do cliente automaticamente." },
  { q: "Como funciona o multi-tenant?", a: "Cada empresa recebe um subdomínio isolado (empresa.upixel.app). Os dados são separados por RLS no PostgreSQL — zero contato entre tenants." },
];

/* ─── component ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const { theme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes upixel-fade-up {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes upixel-pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: 0.5; transform: scale(1.4); }
      }
      @keyframes upixel-marquee {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      .upixel-hero-h1 { animation: upixel-fade-up 0.7s cubic-bezier(.22,1,.36,1) both; }
      .upixel-hero-sub { animation: upixel-fade-up 0.7s 0.12s cubic-bezier(.22,1,.36,1) both; }
      .upixel-hero-ctas { animation: upixel-fade-up 0.7s 0.22s cubic-bezier(.22,1,.36,1) both; }
      .upixel-hero-stats { animation: upixel-fade-up 0.7s 0.34s cubic-bezier(.22,1,.36,1) both; }
      .upixel-dot { animation: upixel-pulse-dot 1.8s ease-in-out infinite; }
      .upixel-marquee-inner { display: flex; animation: upixel-marquee 22s linear infinite; }
      .upixel-btn-primary:hover { background: #e04400 !important; }
      .upixel-btn-outline:hover { background: ${C.lightSand} !important; }
      .upixel-btn-ghost:hover { background: ${C.lightSand} !important; }
      .upixel-faq-btn:hover { background: ${C.lightSand}; }
      .upixel-pillar:hover { background: ${C.offWhite}; }
      .upixel-feature-card:hover .upixel-icon-wrap { background: #ff4f0020; }
      .upixel-plan-card:hover { transform: translateY(-2px); }
      .upixel-plan-card { transition: transform 0.2s ease; }
      .upixel-footer-link:hover { color: ${C.sand} !important; }
      .upixel-nav-link:hover { color: ${C.black} !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  const logo = theme === "dark" ? upixelLogoDark : upixelLogoLight;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.cream, color: C.black, overflowX: "hidden" }}>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.cream}ee`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.sand}`,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <img src={logo} alt="uPixel" style={{ height: 30, flexShrink: 0 }} />

          <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[["#pilares", "Plataforma"], ["#precos", "Preços"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="upixel-nav-link" style={{ fontSize: 14, fontWeight: 500, color: C.warmGray, textDecoration: "none", transition: "color .15s" }}>{label}</a>
            ))}
          </nav>

          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Link to="/login" className="upixel-btn-ghost" style={{ fontSize: 14, fontWeight: 600, color: C.black, textDecoration: "none", padding: "8px 16px", border: `1px solid ${C.sand}`, borderRadius: 8, transition: "background .15s" }}>
              Entrar
            </Link>
            <Link to="/cadastro" className="upixel-btn-primary" style={{ fontSize: 14, fontWeight: 600, color: C.cream, background: C.orange, textDecoration: "none", padding: "8px 20px", borderRadius: 8, border: `1px solid ${C.orange}`, transition: "background .15s" }}>
              Testar grátis →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: "88px 24px 72px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>

          {/* badge */}
          <div className="upixel-hero-h1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ff4f0012", border: `1px solid #ff4f0028`, borderRadius: 999, padding: "5px 14px", marginBottom: 36 }}>
            <span className="upixel-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: C.orange, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase" }}>CRM Multi-Canal para Times Brasileiros</span>
          </div>

          {/* headline */}
          <h1 className="upixel-hero-h1" style={{
            ...SYNE,
            fontSize: "clamp(52px, 8.5vw, 96px)",
            fontWeight: 800,
            lineHeight: 0.94,
            color: C.black,
            letterSpacing: "-0.03em",
            marginBottom: 32,
            whiteSpace: "pre-line",
          }}>
            {"Comunicação,\nCRM e IA\n"}<span style={{ color: C.orange }}>num só lugar.</span>
          </h1>

          {/* sub */}
          <p className="upixel-hero-sub" style={{ fontSize: 19, fontWeight: 400, lineHeight: 1.55, color: C.charcoal, maxWidth: 560, marginBottom: 44 }}>
            O uPixel centraliza WhatsApp, Instagram e Email com automações visuais e IA generativa — para seu time vender mais sem depender de developers.
          </p>

          {/* CTAs */}
          <div className="upixel-hero-ctas" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 72 }}>
            <Link to="/cadastro" className="upixel-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.orange, color: C.cream,
              fontWeight: 600, fontSize: 16, textDecoration: "none",
              padding: "15px 28px", borderRadius: 8, border: `1px solid ${C.orange}`, transition: "background .15s",
            }}>
              Testar 14 dias grátis <ArrowRight size={17} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="upixel-btn-outline" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: C.black,
              fontWeight: 600, fontSize: 16, textDecoration: "none",
              padding: "15px 28px", borderRadius: 8, border: `1px solid ${C.sand}`, transition: "background .15s",
            }}>
              Ver demonstração
            </a>
          </div>

          {/* stats */}
          <div className="upixel-hero-stats" style={{ borderTop: `1px solid ${C.sand}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "28px 0", paddingLeft: i > 0 ? 28 : 0, borderRight: i < 3 ? `1px solid ${C.sand}` : "none" }}>
                <div style={{ ...SYNE, fontSize: 38, fontWeight: 800, color: C.black, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: C.warmGray, marginTop: 6, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHANNELS MARQUEE ─────────────────────────────────────── */}
      <div style={{ background: C.lightSand, borderTop: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}`, padding: "14px 0", overflow: "hidden" }}>
        <div className="upixel-marquee-inner" style={{ gap: 0 }}>
          {[...CHANNELS, ...CHANNELS].map((ch, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 24px", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.charcoal }}>{ch}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.sand, display: "inline-block" }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── PILLARS ──────────────────────────────────────────────── */}
      <section id="pilares" style={{ background: C.cream, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>PLATAFORMA</p>
            <h2 style={{ ...SYNE, fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 800, color: C.black, lineHeight: 1.05, maxWidth: 580, letterSpacing: "-0.025em" }}>
              Três pilares que transformam como você vende
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {PILLARS.map((p, i) => (
              <div key={p.num} className="upixel-pillar" style={{
                border: `1px solid ${C.sand}`,
                borderRadius: i === 0 ? "12px 12px 0 0" : i === 2 ? "0 0 12px 12px" : 0,
                marginTop: i > 0 ? -1 : 0,
                padding: "48px 48px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "48px 64px",
                alignItems: "start",
                transition: "background .2s",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: C.sand }}>{p.num}</span>
                    <span style={{ width: 1, height: 14, background: C.sand }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.tag}</span>
                  </div>
                  <h3 style={{ ...SYNE, fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 800, color: C.black, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                    {p.headline}
                  </h3>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: C.charcoal }}>{p.body}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {p.items.map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ff4f0012", border: `1px solid #ff4f0028`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <CheckCircle2 size={12} color={C.orange} />
                      </div>
                      <span style={{ fontSize: 14, color: C.black, fontWeight: 500, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <section style={{ background: C.lightSand, borderTop: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}`, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>FUNCIONALIDADES</p>
            <h2 style={{ ...SYNE, fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 800, color: C.black, letterSpacing: "-0.025em" }}>
              Tudo que seu time precisa
            </h2>
          </div>

          {/* mosaic grid — border-forward, no shadows */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", background: C.sand, border: `1px solid ${C.sand}`, borderRadius: 12, overflow: "hidden", gap: 1 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="upixel-feature-card" style={{ background: C.cream, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="upixel-icon-wrap" style={{ width: 44, height: 44, borderRadius: 10, background: "#ff4f0010", border: `1px solid #ff4f0022`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}>
                  <Icon size={20} color={C.orange} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.black }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.warmGray }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precos" style={{ background: C.cream, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>PREÇOS</p>
            <h2 style={{ ...SYNE, fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 800, color: C.black, letterSpacing: "-0.025em", marginBottom: 10 }}>
              Simples, sem surpresas
            </h2>
            <p style={{ fontSize: 15, color: C.warmGray }}>Todos os planos com 14 dias de teste gratuito. Cancele quando quiser.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.sand, border: `1px solid ${C.sand}`, borderRadius: 12, overflow: "hidden" }}>
            {PLANS.map(plan => (
              <div key={plan.name} className="upixel-plan-card" style={{ background: plan.dark ? C.black : C.cream, padding: "40px 36px", display: "flex", flexDirection: "column", position: "relative" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: C.orange, color: C.cream, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 18px", borderRadius: "0 0 8px 8px" }}>
                    Mais popular
                  </div>
                )}

                <div style={{ marginBottom: 28, paddingTop: plan.popular ? 12 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: plan.dark ? C.warmGray : C.warmGray, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ ...SYNE, fontSize: 46, fontWeight: 800, color: plan.dark ? C.cream : C.black, lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: C.warmGray }}>{plan.period}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.warmGray }}>{plan.desc}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 36, flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle2 size={15} color={C.orange} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 14, color: plan.dark ? C.lightSand : C.black, lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={plan.name === "Enterprise" ? "/cadastro" : "/cadastro"}
                  className={plan.dark ? "upixel-btn-primary" : "upixel-btn-outline"}
                  style={{
                    display: "block", textAlign: "center",
                    background: plan.dark ? C.orange : "transparent",
                    color: plan.dark ? C.cream : C.black,
                    border: plan.dark ? `1px solid ${C.orange}` : `1px solid ${C.sand}`,
                    borderRadius: 8, padding: "13px 24px",
                    fontWeight: 600, fontSize: 15, textDecoration: "none",
                    transition: "background .15s",
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: C.lightSand, borderTop: `1px solid ${C.sand}`, padding: "96px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>FAQ</p>
            <h2 style={{ ...SYNE, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 800, color: C.black, letterSpacing: "-0.025em" }}>
              Perguntas frequentes
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sand}` }}>
            {FAQS.map((faq, i) => (
              <div key={faq.q} style={{ borderTop: i > 0 ? `1px solid ${C.sand}` : "none", background: C.cream }}>
                <button
                  className="upixel-faq-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "20px 24px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 15, fontWeight: 600, color: C.black,
                    transition: "background .15s",
                  }}
                >
                  {faq.q}
                  <ChevronDown size={18} color={C.warmGray} style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 14, lineHeight: 1.7, color: C.charcoal }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DARK CTA ─────────────────────────────────────────────── */}
      <section style={{ background: C.black, padding: "96px 24px", borderTop: `1px solid ${C.charcoal}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>COMECE HOJE</p>
          <h2 style={{ ...SYNE, fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 800, color: C.cream, lineHeight: 0.98, letterSpacing: "-0.025em", marginBottom: 24 }}>
            Pronto para vender<br />mais com menos esforço?
          </h2>
          <p style={{ fontSize: 17, color: C.warmGray, marginBottom: 48, lineHeight: 1.55 }}>
            Junte-se a 500+ empresas que usam uPixel para centralizar comunicação e fechar negócios mais rápido.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/cadastro" className="upixel-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.orange, color: C.cream,
              fontWeight: 600, fontSize: 16, textDecoration: "none",
              padding: "17px 32px", borderRadius: 8, border: `1px solid ${C.orange}`, transition: "background .15s",
            }}>
              Começar 14 dias grátis <ArrowRight size={18} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="upixel-btn-ghost" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: C.cream,
              fontWeight: 600, fontSize: 16, textDecoration: "none",
              padding: "17px 32px", borderRadius: 8, border: `1px solid ${C.charcoal}`,
              transition: "background .15s",
            }}>
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: C.black, borderTop: `1px solid ${C.charcoal}`, padding: "56px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* cols */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0 48px", marginBottom: 48, paddingBottom: 48, borderBottom: `1px solid ${C.charcoal}` }}>
            <div>
              <img src={upixelLogoLight} alt="uPixel" style={{ height: 28, filter: "brightness(0) invert(1)", marginBottom: 20, opacity: 0.85 }} />
              <p style={{ fontSize: 14, color: C.warmGray, lineHeight: 1.65, maxWidth: 260 }}>
                CRM multi-canal para times brasileiros. WhatsApp, automações e IA numa só plataforma.
              </p>
            </div>
            {[
              { title: "Produto", links: ["Plataforma", "Preços", "Roadmap", "Changelog", "API Docs"] },
              { title: "Empresa", links: ["Sobre nós", "Blog", "Parceiros", "Imprensa"] },
              { title: "Suporte", links: ["Central de ajuda", "Status", "Fale conosco", "LGPD"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.cream, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>{col.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" className="upixel-footer-link" style={{ fontSize: 14, color: C.warmGray, textDecoration: "none", transition: "color .15s" }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* bottom */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: C.warmGray }}>© {new Date().getFullYear()} uPixel. Todos os direitos reservados.</p>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacidade", "Termos", "LGPD", "Cookies"].map(t => (
                <a key={t} href="#" className="upixel-footer-link" style={{ fontSize: 13, color: C.warmGray, textDecoration: "none", transition: "color .15s" }}>{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
