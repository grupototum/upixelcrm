import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, BarChart3,
  Bot, Kanban, Users, Shield, Globe, ChevronDown,
} from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";
import { useTheme } from "@/lib/theme";

/* ─── Cal.com DS tokens ──────────────────────────────────────────── */
const C = {
  bg:      "#ffffff",
  bgSoft:  "#f9fafb",
  card:    "#ffffff",
  fg:      "#111111",
  muted:   "#666666",
  border:  "#e5e7eb",
  primary: "#111111",
  ring:    "#fb923c",
};

/* ─── data ───────────────────────────────────────────────────────── */
const STATS = [
  { value: "500+",  label: "Empresas ativas" },
  { value: "10M+",  label: "Mensagens enviadas" },
  { value: "98%",   label: "Uptime garantido" },
  { value: "3×",    label: "Velocidade de fechamento" },
];

const PILLARS = [
  {
    num: "01", tag: "Inbox multi-canal",
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
    num: "02", tag: "Disparos em massa",
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
    num: "03", tag: "Automações com IA",
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
  { icon: Kanban,    title: "Pipeline visual",         desc: "Arraste leads por etapas customizáveis com forecasting automático e deal tracking." },
  { icon: BarChart3, title: "Analytics em tempo real", desc: "Funil de conversão, performance por vendedor, cohort analysis e drilldown interativo." },
  { icon: Bot,       title: "AI Copilot",              desc: "Sugestões de resposta e detecção de objeções com IA durante o atendimento ao vivo." },
  { icon: Users,     title: "RBAC granular",           desc: "6 níveis de permissão por módulo, equipe e território com auditoria completa de ações." },
  { icon: Shield,    title: "LGPD & GDPR",             desc: "Criptografia end-to-end, soft delete, exportação de dados e log de acesso inclusos." },
  { icon: Globe,     title: "Multi-tenant",            desc: "Cada cliente em subdomínio isolado. RLS no PostgreSQL garante zero vazamento entre tenants." },
];

const PLANS = [
  {
    name: "Starter", price: "R$ 99", period: "/mês",
    desc: "Para times que estão começando",
    features: ["Inbox + 1 canal (WhatsApp)", "100 automações/mês", "Pipeline visual", "Relatórios básicos", "Suporte em PT-BR"],
    cta: "Começar grátis", highlight: false,
  },
  {
    name: "Pro", price: "R$ 299", period: "/mês",
    desc: "Para times que querem escalar",
    features: ["Todos os canais de comunicação", "Disparos ilimitados (anti-bloqueio)", "10 000 automações/mês", "IA Alexandria (RAG)", "Analytics avançado + A/B testing", "API REST + Webhooks"],
    cta: "Assinar Pro", highlight: true,
  },
  {
    name: "Enterprise", price: "R$ 999+", period: "/mês",
    desc: "Para operações complexas",
    features: ["Tudo do Pro", "White-label (logo + domínio próprio)", "SLA dedicado + suporte prioritário", "Integrações customizadas", "API ilimitada", "Treinamento para o time"],
    cta: "Falar com especialista", highlight: false,
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

const INTER: React.CSSProperties = { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };

/* ─── component ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const { theme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const logo = theme === "dark" ? upixelLogoDark : upixelLogoLight;

  return (
    <div style={{ ...INTER, background: C.bg, color: C.fg, overflowX: "hidden" }}>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <img src={logo} alt="uPixel" style={{ height: 26, flexShrink: 0 }} />

          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[["#pilares", "Plataforma"], ["#precos", "Preços"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none", padding: "6px 12px", borderRadius: 8, transition: "background .12s, color .12s" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = C.bgSoft; (e.target as HTMLElement).style.color = C.fg; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.color = C.muted; }}
              >{label}</a>
            ))}
          </nav>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link to="/login" style={{
              fontSize: 14, fontWeight: 500, color: C.fg, textDecoration: "none",
              padding: "7px 16px", border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.bg, transition: "background .12s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = C.bgSoft)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = C.bg)}
            >
              Entrar
            </Link>
            <Link to="/cadastro" style={{
              fontSize: 14, fontWeight: 500, color: "#fff", textDecoration: "none",
              padding: "7px 16px", borderRadius: 8, background: C.primary, border: "none",
              transition: "opacity .12s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = ".85")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 72px", background: C.bg }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 9999, padding: "4px 12px", marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ring, display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>CRM multi-canal para times brasileiros</span>
          </div>

          {/* headline */}
          <h1 style={{
            fontSize: "clamp(40px, 7vw, 80px)",
            fontWeight: 600,
            lineHeight: 1.05,
            color: C.fg,
            letterSpacing: "-0.03em",
            marginBottom: 24,
            whiteSpace: "pre-line",
          }}>
            {"Comunicação, CRM\ne IA "}<span style={{ color: C.muted }}>num só lugar.</span>
          </h1>

          {/* sub */}
          <p style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.65, color: C.muted, maxWidth: 520, marginBottom: 40 }}>
            O uPixel centraliza WhatsApp, Instagram e Email com automações visuais e IA generativa — para seu time vender mais sem depender de developers.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 64 }}>
            <Link to="/cadastro" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.primary, color: "#fff",
              fontWeight: 500, fontSize: 15, textDecoration: "none",
              padding: "10px 20px", borderRadius: 8, border: "none",
              transition: "opacity .12s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = ".85")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Testar 14 dias grátis <ArrowRight size={16} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.bg, color: C.fg,
              fontWeight: 500, fontSize: 15, textDecoration: "none",
              padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.border}`,
              transition: "background .12s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = C.bgSoft)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = C.bg)}
            >
              Ver demonstração
            </a>
          </div>

          {/* stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: `1px solid ${C.border}` }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "24px 0", paddingLeft: i > 0 ? 24 : 0, borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: C.fg, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes _marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        ._mq { display:flex; animation: _marquee 26s linear infinite; }
        ._nb:hover { background: ${C.bgSoft} !important; color: ${C.fg} !important; }
        ._fq:hover { background: ${C.bgSoft} !important; }
      `}</style>
      <div style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "12px 0", overflow: "hidden" }}>
        <div className="_mq">
          {[...CHANNELS, ...CHANNELS].map((ch, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 20px", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>{ch}</span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.border, display: "inline-block" }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── PILLARS ──────────────────────────────────────────────── */}
      <section id="pilares" style={{ background: C.bg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Plataforma</p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 600, color: C.fg, lineHeight: 1.1, maxWidth: 520, letterSpacing: "-0.025em" }}>
              Três pilares que transformam como você vende
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {PILLARS.map((p, i) => (
              <div key={p.num} style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: i === 0 ? "12px 12px 4px 4px" : i === 2 ? "4px 4px 12px 12px" : 4,
                padding: "40px 40px",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px 56px", alignItems: "start",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{p.num}</span>
                    <span style={{ width: 1, height: 12, background: C.border }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{p.tag}</span>
                  </div>
                  <h3 style={{ fontSize: "clamp(20px, 2.5vw, 30px)", fontWeight: 600, color: C.fg, lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                    {p.headline}
                  </h3>
                  <p style={{ fontSize: 15, lineHeight: 1.7, color: C.muted }}>{p.body}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {p.items.map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle2 size={15} color={C.fg} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 14, color: C.fg, lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "88px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Funcionalidades</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 600, color: C.fg, letterSpacing: "-0.025em" }}>
              Tudo que seu time precisa
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1 }}>
            {FEATURES.map(({ icon: Icon, title, desc }, idx) => {
              const r = idx === 0 ? "12px 4px 4px 4px" : idx === 2 ? "4px 12px 4px 4px" : idx === 3 ? "4px 4px 4px 12px" : idx === 5 ? "4px 4px 12px 4px" : "4px";
              return (
                <div key={title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: r, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.bgSoft, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={C.fg} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.fg }}>{title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: C.muted }}>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precos" style={{ background: C.bg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Preços</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 600, color: C.fg, letterSpacing: "-0.025em", marginBottom: 8 }}>
              Simples, sem surpresas
            </h2>
            <p style={{ fontSize: 15, color: C.muted }}>Todos os planos com 14 dias de teste gratuito. Cancele quando quiser.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? C.fg : C.card,
                border: `1px solid ${plan.highlight ? C.fg : C.border}`,
                borderRadius: 12, padding: "36px 32px",
                display: "flex", flexDirection: "column", position: "relative",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: C.ring, color: "#fff", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 14px", borderRadius: "0 0 8px 8px" }}>
                    Mais popular
                  </div>
                )}

                <div style={{ marginBottom: 24, paddingTop: plan.highlight ? 10 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: plan.highlight ? "rgba(255,255,255,.6)" : C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 600, color: plan.highlight ? "#fff" : C.fg, lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: plan.highlight ? "rgba(255,255,255,.5)" : C.muted }}>{plan.period}</span>
                  </div>
                  <p style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,.6)" : C.muted }}>{plan.desc}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CheckCircle2 size={14} color={plan.highlight ? "rgba(255,255,255,.8)" : C.fg} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 14, color: plan.highlight ? "rgba(255,255,255,.85)" : C.fg, lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link to="/cadastro" style={{
                  display: "block", textAlign: "center",
                  background: plan.highlight ? "rgba(255,255,255,.12)" : C.primary,
                  color: plan.highlight ? "#fff" : "#fff",
                  border: plan.highlight ? "1px solid rgba(255,255,255,.2)" : "none",
                  borderRadius: 8, padding: "10px 20px",
                  fontWeight: 500, fontSize: 14, textDecoration: "none",
                  transition: "opacity .12s",
                }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = ".8")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}`, padding: "88px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 600, color: C.fg, letterSpacing: "-0.025em" }}>
              Perguntas frequentes
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {FAQS.map((faq, i) => (
              <div key={faq.q} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : "none", background: C.card }}>
                <button
                  className="_fq"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "18px 20px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 15, fontWeight: 500, color: C.fg,
                    transition: "background .12s",
                  }}
                >
                  {faq.q}
                  <ChevronDown size={16} color={C.muted} style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 18px", fontSize: 14, lineHeight: 1.75, color: C.muted }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section style={{ background: C.fg, padding: "88px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>Comece hoje</p>
          <h2 style={{ fontSize: "clamp(28px, 4.5vw, 56px)", fontWeight: 600, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: 20 }}>
            Pronto para vender mais<br />com menos esforço?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.55)", marginBottom: 40, lineHeight: 1.65 }}>
            Junte-se a 500+ empresas que usam uPixel para centralizar comunicação e fechar negócios mais rápido.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/cadastro" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#fff", color: C.fg,
              fontWeight: 500, fontSize: 15, textDecoration: "none",
              padding: "11px 22px", borderRadius: 8,
              transition: "opacity .12s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = ".85")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Começar 14 dias grátis <ArrowRight size={16} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: "#fff",
              fontWeight: 500, fontSize: 15, textDecoration: "none",
              padding: "11px 22px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)",
              transition: "background .12s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.08)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: "48px 24px 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0 40px", marginBottom: 40, paddingBottom: 40, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <img src={logo} alt="uPixel" style={{ height: 24, marginBottom: 16 }} />
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 240 }}>
                CRM multi-canal para times brasileiros. WhatsApp, automações e IA numa só plataforma.
              </p>
            </div>
            {[
              { title: "Produto",  links: ["Plataforma", "Preços", "Roadmap", "Changelog", "API Docs"] },
              { title: "Empresa",  links: ["Sobre nós", "Blog", "Parceiros", "Imprensa"] },
              { title: "Suporte",  links: ["Central de ajuda", "Status", "Fale conosco", "LGPD"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.fg, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{col.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" style={{ fontSize: 14, color: C.muted, textDecoration: "none", transition: "color .12s" }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = C.fg)}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = C.muted)}
                    >{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: C.muted }}>© {new Date().getFullYear()} uPixel. Todos os direitos reservados.</p>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacidade", "Termos", "LGPD", "Cookies"].map(t => (
                <a key={t} href="#" style={{ fontSize: 13, color: C.muted, textDecoration: "none", transition: "color .12s" }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = C.fg)}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = C.muted)}
                >{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
