import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { ArrowRight, CheckCircle2, BarChart3, Bot, Kanban, Users, Shield, Globe, ChevronDown } from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";

/* ─── Zapier DS tokens ───────────────────────────────────────────── */
const C = {
  cream:     "#fffefb",
  offWhite:  "#fffdf9",
  black:     "#201515",
  charcoal:  "#36342e",
  warmGray:  "#939084",
  sand:      "#c5c0b1",
  lightSand: "#eceae3",
  orange:    "#ff4f00",
};

const INTER: React.CSSProperties = { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };

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
  { icon: Kanban,    title: "Pipeline visual",          desc: "Arraste leads por etapas customizáveis com forecasting automático e deal tracking." },
  { icon: BarChart3, title: "Analytics em tempo real",  desc: "Funil de conversão, performance por vendedor, cohort analysis e drilldown interativo." },
  { icon: Bot,       title: "AI Copilot",               desc: "Sugestões de resposta e detecção de objeções com IA durante o atendimento ao vivo." },
  { icon: Users,     title: "RBAC granular",            desc: "6 níveis de permissão por módulo, equipe e território com auditoria completa de ações." },
  { icon: Shield,    title: "LGPD & GDPR",              desc: "Criptografia end-to-end, soft delete, exportação de dados e log de acesso inclusos." },
  { icon: Globe,     title: "Multi-tenant",             desc: "Cada cliente em subdomínio isolado. RLS no PostgreSQL garante zero vazamento entre tenants." },
];

const PLANS = [
  {
    name: "Starter", price: "R$ 99", period: "/mês",
    desc: "Para times que estão começando",
    features: ["Inbox + 1 canal (WhatsApp)", "100 automações/mês", "Pipeline visual", "Relatórios básicos", "Suporte em PT-BR"],
    cta: "Começar grátis", dark: false, popular: false,
  },
  {
    name: "Pro", price: "R$ 299", period: "/mês",
    desc: "Para times que querem escalar",
    features: ["Todos os canais de comunicação", "Disparos ilimitados (anti-bloqueio)", "10 000 automações/mês", "IA Alexandria (RAG)", "Analytics avançado + A/B testing", "API REST + Webhooks"],
    cta: "Assinar Pro", dark: true, popular: true,
  },
  {
    name: "Enterprise", price: "R$ 999+", period: "/mês",
    desc: "Para operações complexas",
    features: ["Tudo do Pro", "White-label (logo + domínio próprio)", "SLA dedicado + suporte prioritário", "Integrações customizadas", "API ilimitada", "Treinamento para o time"],
    cta: "Falar com especialista", dark: false, popular: false,
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
  const logo = theme === "dark" ? upixelLogoDark : upixelLogoLight;

  return (
    <div style={{ ...INTER, background: C.cream, color: C.black, overflowX: "hidden" }}>
      <style>{`
        @keyframes _mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        ._mq { display:flex; animation:_mq 24s linear infinite; }
        ._nav:hover { color:${C.black} !important; }
        ._btn-or:hover { background:#e04400 !important; }
        ._btn-dk:hover { background:${C.sand} !important; color:${C.black} !important; }
        ._btn-lt:hover { background:${C.sand} !important; }
        ._faq:hover { background:${C.offWhite} !important; }
        ._pillar:hover { background:${C.offWhite} !important; }
        ._flink:hover { color:${C.sand} !important; }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.cream}ee`,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.sand}`,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <img src={logo} alt="uPixel" style={{ height: 28, flexShrink: 0 }} />
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {[["#pilares", "Plataforma"], ["#precos", "Preços"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="_nav" style={{ fontSize: 14, fontWeight: 500, color: C.warmGray, textDecoration: "none", transition: "color .15s" }}>{label}</a>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Link to="/login" className="_btn-lt" style={{ fontSize: 14, fontWeight: 600, color: C.black, textDecoration: "none", padding: "8px 16px", border: `1px solid ${C.sand}`, borderRadius: 8, background: "transparent", transition: "background .15s" }}>
              Entrar
            </Link>
            <Link to="/cadastro" className="_btn-or" style={{ fontSize: 14, fontWeight: 600, color: C.cream, background: C.orange, textDecoration: "none", padding: "8px 20px", borderRadius: 8, border: `1px solid ${C.orange}`, transition: "background .15s" }}>
              Testar grátis →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: "88px 24px 72px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>

          {/* badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.orange}12`, border: `1px solid ${C.orange}28`, borderRadius: 9999, padding: "5px 14px", marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.orange, display: "inline-block", animation: "pulse 1.8s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase" }}>CRM multi-canal para times brasileiros</span>
          </div>

          {/* headline */}
          <h1 style={{ fontSize: "clamp(44px, 7.5vw, 84px)", fontWeight: 600, lineHeight: 1.02, color: C.black, letterSpacing: "-0.03em", marginBottom: 28, whiteSpace: "pre-line" }}>
            {"Comunicação, CRM\ne IA "}<span style={{ color: C.orange }}>num só lugar.</span>
          </h1>

          {/* sub */}
          <p style={{ fontSize: 19, fontWeight: 400, lineHeight: 1.55, color: C.charcoal, maxWidth: 540, marginBottom: 44 }}>
            O uPixel centraliza WhatsApp, Instagram e Email com automações visuais e IA generativa — para seu time vender mais sem depender de developers.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 72 }}>
            <Link to="/cadastro" className="_btn-or" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.orange, color: C.cream, fontWeight: 600, fontSize: 16, textDecoration: "none", padding: "15px 28px", borderRadius: 8, border: `1px solid ${C.orange}`, transition: "background .15s" }}>
              Testar 14 dias grátis <ArrowRight size={17} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="_btn-dk" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.black, color: C.cream, fontWeight: 600, fontSize: 16, textDecoration: "none", padding: "15px 28px", borderRadius: 8, border: `1px solid ${C.black}`, transition: "background .15s, color .15s" }}>
              Ver demonstração
            </a>
          </div>

          {/* stats */}
          <div style={{ borderTop: `1px solid ${C.sand}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "28px 0", paddingLeft: i > 0 ? 28 : 0, borderRight: i < 3 ? `1px solid ${C.sand}` : "none" }}>
                <div style={{ fontSize: 38, fontWeight: 600, color: C.black, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: C.warmGray, marginTop: 6, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────── */}
      <div style={{ background: C.lightSand, borderTop: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}`, padding: "14px 0", overflow: "hidden" }}>
        <div className="_mq">
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
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Plataforma</p>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 600, color: C.black, lineHeight: 1.05, maxWidth: 560, letterSpacing: "-0.025em" }}>
              Três pilares que transformam como você vende
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {PILLARS.map((p, i) => (
              <div key={p.num} className="_pillar" style={{
                border: `1px solid ${C.sand}`,
                borderRadius: i === 0 ? "12px 12px 0 0" : i === 2 ? "0 0 12px 12px" : 0,
                marginTop: i > 0 ? -1 : 0,
                padding: "48px",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px 64px", alignItems: "start",
                transition: "background .2s",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.sand }}>{p.num}</span>
                    <span style={{ width: 1, height: 14, background: C.sand }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.tag}</span>
                  </div>
                  <h3 style={{ fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 600, color: C.black, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                    {p.headline}
                  </h3>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: C.charcoal }}>{p.body}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {p.items.map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${C.orange}12`, border: `1px solid ${C.orange}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
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

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section style={{ background: C.lightSand, borderTop: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}`, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Funcionalidades</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 600, color: C.black, letterSpacing: "-0.025em" }}>Tudo que seu time precisa</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", background: C.sand, border: `1px solid ${C.sand}`, borderRadius: 12, overflow: "hidden", gap: 1 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: C.cream, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 14, transition: "background .2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = C.offWhite)}
                onMouseLeave={e => (e.currentTarget.style.background = C.cream)}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${C.orange}10`, border: `1px solid ${C.orange}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} color={C.orange} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.black }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: C.warmGray }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precos" style={{ background: C.cream, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Preços</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 600, color: C.black, letterSpacing: "-0.025em", marginBottom: 10 }}>Simples, sem surpresas</h2>
            <p style={{ fontSize: 15, color: C.warmGray }}>Todos os planos com 14 dias de teste gratuito. Cancele quando quiser.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.sand, border: `1px solid ${C.sand}`, borderRadius: 12, overflow: "hidden" }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background: plan.dark ? C.black : C.cream, padding: "40px 36px", display: "flex", flexDirection: "column", position: "relative" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: C.orange, color: C.cream, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 18px", borderRadius: "0 0 8px 8px" }}>
                    Mais popular
                  </div>
                )}
                <div style={{ marginBottom: 28, paddingTop: plan.popular ? 12 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.warmGray, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: 46, fontWeight: 600, color: plan.dark ? C.cream : C.black, lineHeight: 1 }}>{plan.price}</span>
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
                <Link to="/cadastro" className={plan.dark ? "_btn-or" : "_btn-lt"} style={{
                  display: "block", textAlign: "center",
                  background: plan.dark ? C.orange : "transparent",
                  color: plan.dark ? C.cream : C.black,
                  border: plan.dark ? `1px solid ${C.orange}` : `1px solid ${C.sand}`,
                  borderRadius: 8, padding: "13px 24px",
                  fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "background .15s",
                }}>
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
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 600, color: C.black, letterSpacing: "-0.025em" }}>Perguntas frequentes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sand}` }}>
            {FAQS.map((faq, i) => (
              <div key={faq.q} style={{ borderTop: i > 0 ? `1px solid ${C.sand}` : "none", background: C.cream }}>
                <button className="_faq" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", textAlign: "left", padding: "20px 24px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 15, fontWeight: 600, color: C.black, transition: "background .15s",
                }}>
                  {faq.q}
                  <ChevronDown size={18} color={C.warmGray} style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 14, lineHeight: 1.75, color: C.charcoal }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DARK CTA ─────────────────────────────────────────────── */}
      <section style={{ background: C.black, padding: "96px 24px", borderTop: `1px solid ${C.charcoal}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Comece hoje</p>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 600, color: C.cream, lineHeight: 0.98, letterSpacing: "-0.025em", marginBottom: 24 }}>
            Pronto para vender mais<br />com menos esforço?
          </h2>
          <p style={{ fontSize: 17, color: C.warmGray, marginBottom: 48, lineHeight: 1.55 }}>
            Junte-se a 500+ empresas que usam uPixel para centralizar comunicação e fechar negócios mais rápido.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/cadastro" className="_btn-or" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.orange, color: C.cream, fontWeight: 600, fontSize: 16, textDecoration: "none", padding: "17px 32px", borderRadius: 8, border: `1px solid ${C.orange}`, transition: "background .15s" }}>
              Começar 14 dias grátis <ArrowRight size={18} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="_btn-lt" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: C.cream, fontWeight: 600, fontSize: 16, textDecoration: "none", padding: "17px 32px", borderRadius: 8, border: `1px solid ${C.charcoal}`, transition: "background .15s" }}>
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: C.black, borderTop: `1px solid ${C.charcoal}`, padding: "56px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0 48px", marginBottom: 48, paddingBottom: 48, borderBottom: `1px solid ${C.charcoal}` }}>
            <div>
              <img src={upixelLogoLight} alt="uPixel" style={{ height: 28, filter: "brightness(0) invert(1)", marginBottom: 20, opacity: .85 }} />
              <p style={{ fontSize: 14, color: C.warmGray, lineHeight: 1.65, maxWidth: 260 }}>
                CRM multi-canal para times brasileiros. WhatsApp, automações e IA numa só plataforma.
              </p>
            </div>
            {[
              { title: "Produto",  links: ["Plataforma", "Preços", "Roadmap", "Changelog", "API Docs"] },
              { title: "Empresa",  links: ["Sobre nós", "Blog", "Parceiros", "Imprensa"] },
              { title: "Suporte",  links: ["Central de ajuda", "Status", "Fale conosco", "LGPD"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.cream, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>{col.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" className="_flink" style={{ fontSize: 14, color: C.warmGray, textDecoration: "none", transition: "color .15s" }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: C.warmGray }}>© {new Date().getFullYear()} uPixel. Todos os direitos reservados.</p>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacidade", "Termos", "LGPD", "Cookies"].map(t => (
                <a key={t} href="#" className="_flink" style={{ fontSize: 13, color: C.warmGray, textDecoration: "none", transition: "color .15s" }}>{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
