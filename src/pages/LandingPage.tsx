import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, MessageSquare, Zap, BarChart3,
  Bot, Kanban, Users, Shield, Globe, ChevronDown,
} from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";

/* ─── n8n DS tokens ──────────────────────────────────────────────── */
const C = {
  canvas:  "#0e0918",
  card:    "#1b1728",
  cardHi:  "#221e30",
  border:  "#1f192a",
  fg:      "#d1cece",
  muted:   "#9ca3af",
  primary: "#ee4f27",
  white:   "#ffffff",
};

const GEO: React.CSSProperties = { fontFamily: "geomanist, ui-sans-serif, system-ui, sans-serif" };
const PILL = "9999px";
const CARD_R = "24px";

/* ─── data ───────────────────────────────────────────────────────── */
const STATS = [
  { value: "500+",  label: "Empresas ativas" },
  { value: "10M+",  label: "Mensagens enviadas" },
  { value: "98%",   label: "Uptime garantido" },
  { value: "3×",    label: "Velocidade de fechamento" },
];

const PILLARS = [
  {
    num: "01", tag: "INBOX MULTI-CANAL",
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
    num: "02", tag: "DISPAROS EM MASSA",
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
    num: "03", tag: "AUTOMAÇÕES COM IA",
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
  { icon: Kanban,    title: "Pipeline Visual",        desc: "Arraste leads por etapas customizáveis com forecasting automático e deal tracking." },
  { icon: BarChart3, title: "Analytics em Tempo Real", desc: "Funil de conversão, performance por vendedor, cohort analysis e drilldown interativo." },
  { icon: Bot,       title: "AI Copilot",              desc: "Sugestões de resposta e detecção de objeções com IA durante o atendimento ao vivo." },
  { icon: Users,     title: "RBAC Granular",           desc: "6 níveis de permissão por módulo, equipe e território com auditoria completa de ações." },
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

/* ─── component ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes upixel-fade-up {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes upixel-pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: .5; transform: scale(1.4); }
      }
      @keyframes upixel-marquee {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      .ul-h1  { animation: upixel-fade-up .7s cubic-bezier(.22,1,.36,1) both; }
      .ul-sub { animation: upixel-fade-up .7s .12s cubic-bezier(.22,1,.36,1) both; }
      .ul-cta { animation: upixel-fade-up .7s .22s cubic-bezier(.22,1,.36,1) both; }
      .ul-st  { animation: upixel-fade-up .7s .34s cubic-bezier(.22,1,.36,1) both; }
      .ul-dot { animation: upixel-pulse-dot 1.8s ease-in-out infinite; }
      .ul-marquee { display:flex; animation: upixel-marquee 22s linear infinite; }
      .ul-btn-primary { transition: background .15s, transform .1s; }
      .ul-btn-primary:hover { background: #d93f18 !important; }
      .ul-btn-primary:active { transform: scale(.97); }
      .ul-btn-ghost:hover { background: ${C.cardHi} !important; }
      .ul-btn-outline:hover { background: ${C.cardHi} !important; }
      .ul-nav-link:hover { color: ${C.fg} !important; }
      .ul-footer-link:hover { color: ${C.fg} !important; }
      .ul-pillar:hover { background: ${C.cardHi} !important; }
      .ul-feat:hover .ul-icon { background: rgba(238,79,39,.2) !important; }
      .ul-plan:hover { transform: translateY(-2px); }
      .ul-plan { transition: transform .2s; }
      .ul-faq-btn:hover { background: ${C.cardHi} !important; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div style={{ ...GEO, background: C.canvas, color: C.fg, overflowX: "hidden", position: "relative" }}>

      {/* bg gradient */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: "45%", background: "radial-gradient(ellipse at bottom left, rgba(166,55,85,.55) 0%, transparent 62%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: "40%", height: "50%", background: "radial-gradient(ellipse at top right, rgba(168,92,92,.08) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.canvas}dd`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <img src={upixelLogoLight} alt="uPixel" style={{ height: 28, flexShrink: 0 }} />

          <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[["#pilares", "Plataforma"], ["#precos", "Preços"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="ul-nav-link" style={{ fontSize: 14, fontWeight: 400, color: C.muted, textDecoration: "none", transition: "color .15s" }}>{label}</a>
            ))}
          </nav>

          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Link to="/login" className="ul-btn-ghost" style={{ fontSize: 14, fontWeight: 400, color: C.fg, textDecoration: "none", padding: "8px 18px", border: `1px solid ${C.border}`, borderRadius: PILL, transition: "background .15s" }}>
              Entrar
            </Link>
            <Link to="/cadastro" className="ul-btn-primary" style={{ fontSize: 14, fontWeight: 400, color: C.white, background: C.primary, textDecoration: "none", padding: "8px 20px", borderRadius: PILL, border: "none", transition: "background .15s" }}>
              Testar grátis →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, padding: "96px 24px 80px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>

          <div className="ul-h1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(238,79,39,.12)", border: `1px solid rgba(238,79,39,.25)`, borderRadius: PILL, padding: "5px 14px", marginBottom: 36 }}>
            <span className="ul-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: C.primary, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" }}>CRM Multi-Canal para Times Brasileiros</span>
          </div>

          <h1 className="ul-h1" style={{
            fontSize: "clamp(52px, 8.5vw, 96px)",
            fontWeight: 300,
            lineHeight: 0.96,
            color: C.fg,
            letterSpacing: "-0.02em",
            marginBottom: 32,
            whiteSpace: "pre-line",
          }}>
            {"Comunicação,\nCRM e IA\n"}<span style={{ color: C.primary }}>num só lugar.</span>
          </h1>

          <p className="ul-sub" style={{ fontSize: 19, fontWeight: 400, lineHeight: 1.6, color: C.muted, maxWidth: 560, marginBottom: 48 }}>
            O uPixel centraliza WhatsApp, Instagram e Email com automações visuais e IA generativa — para seu time vender mais sem depender de developers.
          </p>

          <div className="ul-cta" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 80 }}>
            <Link to="/cadastro" className="ul-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.primary, color: C.white,
              fontWeight: 400, fontSize: 16, textDecoration: "none",
              padding: "15px 28px", borderRadius: PILL, border: "none",
            }}>
              Testar 14 dias grátis <ArrowRight size={17} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="ul-btn-ghost" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: C.fg,
              fontWeight: 400, fontSize: 16, textDecoration: "none",
              padding: "15px 28px", borderRadius: PILL, border: `1px solid ${C.border}`,
              transition: "background .15s",
            }}>
              Ver demonstração
            </a>
          </div>

          <div className="ul-st" style={{ borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "28px 0", paddingLeft: i > 0 ? 28 : 0, borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 38, fontWeight: 300, color: C.fg, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "14px 0", overflow: "hidden" }}>
        <div className="ul-marquee">
          {[...CHANNELS, ...CHANNELS].map((ch, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 24px", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>{ch}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.border, display: "inline-block" }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── PILLARS ──────────────────────────────────────────────── */}
      <section id="pilares" style={{ position: "relative", zIndex: 1, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>PLATAFORMA</p>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 300, color: C.fg, lineHeight: 1.05, maxWidth: 580, letterSpacing: "-0.02em" }}>
              Três pilares que transformam como você vende
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {PILLARS.map((p) => (
              <div key={p.num} className="ul-pillar" style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: CARD_R,
                padding: "48px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "48px 64px",
                alignItems: "start",
                transition: "background .2s",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 300, color: C.muted }}>{p.num}</span>
                    <span style={{ width: 1, height: 14, background: C.border }} />
                    <span style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.tag}</span>
                  </div>
                  <h3 style={{ fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 300, color: C.fg, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.015em", whiteSpace: "pre-line" }}>
                    {p.headline}
                  </h3>
                  <p style={{ fontSize: 15, lineHeight: 1.7, color: C.muted }}>{p.body}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {p.items.map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(238,79,39,.12)", border: `1px solid rgba(238,79,39,.25)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <CheckCircle2 size={12} color={C.primary} />
                      </div>
                      <span style={{ fontSize: 14, color: C.fg, fontWeight: 400, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>FUNCIONALIDADES</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 300, color: C.fg, letterSpacing: "-0.02em" }}>
              Tudo que seu time precisa
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="ul-feat" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: CARD_R, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 14, transition: "background .2s" }}>
                <div className="ul-icon" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(238,79,39,.12)", border: `1px solid rgba(238,79,39,.2)`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}>
                  <Icon size={20} color={C.primary} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 400, color: C.fg }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: C.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precos" style={{ position: "relative", zIndex: 1, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>PREÇOS</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 300, color: C.fg, letterSpacing: "-0.02em", marginBottom: 10 }}>
              Simples, sem surpresas
            </h2>
            <p style={{ fontSize: 15, color: C.muted }}>Todos os planos com 14 dias de teste gratuito. Cancele quando quiser.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
            {PLANS.map(plan => (
              <div key={plan.name} className="ul-plan" style={{
                background: plan.highlight ? C.primary : C.card,
                border: `1px solid ${plan.highlight ? C.primary : C.border}`,
                borderRadius: CARD_R,
                padding: "40px 36px",
                display: "flex", flexDirection: "column",
                position: "relative",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: C.fg, color: C.canvas, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 18px", borderRadius: "0 0 12px 12px" }}>
                    Mais popular
                  </div>
                )}

                <div style={{ marginBottom: 28, paddingTop: plan.highlight ? 12 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 400, color: plan.highlight ? "rgba(255,255,255,.7)" : C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: 46, fontWeight: 300, color: plan.highlight ? C.white : C.fg, lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: plan.highlight ? "rgba(255,255,255,.6)" : C.muted }}>{plan.period}</span>
                  </div>
                  <p style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,.7)" : C.muted }}>{plan.desc}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 36, flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle2 size={15} color={plan.highlight ? "rgba(255,255,255,.9)" : C.primary} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 14, color: plan.highlight ? "rgba(255,255,255,.9)" : C.fg, lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/cadastro"
                  className={plan.highlight ? "ul-btn-ghost" : "ul-btn-outline"}
                  style={{
                    display: "block", textAlign: "center",
                    background: plan.highlight ? "rgba(255,255,255,.15)" : "transparent",
                    color: plan.highlight ? C.white : C.fg,
                    border: plan.highlight ? "1px solid rgba(255,255,255,.3)" : `1px solid ${C.border}`,
                    borderRadius: PILL, padding: "13px 24px",
                    fontWeight: 400, fontSize: 15, textDecoration: "none",
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
      <section id="faq" style={{ position: "relative", zIndex: 1, padding: "96px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>FAQ</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 300, color: C.fg, letterSpacing: "-0.02em" }}>
              Perguntas frequentes
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {FAQS.map((faq, i) => (
              <div key={faq.q} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: CARD_R, overflow: "hidden" }}>
                <button
                  className="ul-faq-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "20px 24px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 15, fontWeight: 400, color: C.fg,
                    transition: "background .15s",
                  }}
                >
                  {faq.q}
                  <ChevronDown size={18} color={C.muted} style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 14, lineHeight: 1.75, color: C.muted }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, padding: "96px 24px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 400, color: C.primary, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>COMECE HOJE</p>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 300, color: C.fg, lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 24 }}>
            Pronto para vender<br />mais com menos esforço?
          </h2>
          <p style={{ fontSize: 17, color: C.muted, marginBottom: 48, lineHeight: 1.6 }}>
            Junte-se a 500+ empresas que usam uPixel para centralizar comunicação e fechar negócios mais rápido.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/cadastro" className="ul-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.primary, color: C.white,
              fontWeight: 400, fontSize: 16, textDecoration: "none",
              padding: "17px 32px", borderRadius: PILL, border: "none",
            }}>
              Começar 14 dias grátis <ArrowRight size={18} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="ul-btn-ghost" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: C.fg,
              fontWeight: 400, fontSize: 16, textDecoration: "none",
              padding: "17px 32px", borderRadius: PILL, border: `1px solid ${C.border}`,
              transition: "background .15s",
            }}>
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${C.border}`, padding: "56px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0 48px", marginBottom: 48, paddingBottom: 48, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <img src={upixelLogoLight} alt="uPixel" style={{ height: 26, marginBottom: 20, opacity: 0.8 }} />
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 260 }}>
                CRM multi-canal para times brasileiros. WhatsApp, automações e IA numa só plataforma.
              </p>
            </div>
            {[
              { title: "Produto",  links: ["Plataforma", "Preços", "Roadmap", "Changelog", "API Docs"] },
              { title: "Empresa",  links: ["Sobre nós", "Blog", "Parceiros", "Imprensa"] },
              { title: "Suporte",  links: ["Central de ajuda", "Status", "Fale conosco", "LGPD"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 11, fontWeight: 400, color: C.fg, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>{col.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" className="ul-footer-link" style={{ fontSize: 14, color: C.muted, textDecoration: "none", transition: "color .15s" }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: C.muted }}>© {new Date().getFullYear()} uPixel. Todos os direitos reservados.</p>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacidade", "Termos", "LGPD", "Cookies"].map(t => (
                <a key={t} href="#" className="ul-footer-link" style={{ fontSize: 13, color: C.muted, textDecoration: "none", transition: "color .15s" }}>{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
