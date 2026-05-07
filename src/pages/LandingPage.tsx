import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, BarChart3, Bot, Kanban, Users, Shield, Globe, ChevronDown } from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import { useTheme } from "@/lib/theme";

/* ─── Amazon DS tokens ───────────────────────────────────────────── */
const C = {
  bg:      "#ffffff",
  bgSoft:  "#f3f3f3",
  nav:     "#232f3e",
  navHov:  "#37475a",
  fg:      "#0f1111",
  muted:   "#565959",
  border:  "#d5d9d9",
  orange:  "#ff9900",
  yellow:  "#ffd814",
  link:    "#007185",
  linkHov: "#c45500",
  prime:   "#00a8e0",
  deal:    "#cc0c39",
};

const AMAZON: React.CSSProperties = { fontFamily: '"Amazon Ember", Arial, sans-serif' };

/* ─── data ───────────────────────────────────────────────────────── */
const STATS = [
  { value: "500+", label: "Empresas ativas" },
  { value: "10M+", label: "Mensagens enviadas" },
  { value: "98%",  label: "Uptime garantido" },
  { value: "3×",   label: "Velocidade de fechamento" },
];

const PILLARS = [
  {
    num: "01", tag: "Inbox multi-canal",
    headline: "Todos os canais. Uma só caixa.",
    body: "WhatsApp, Instagram, E-mail e Webchat centralizados com atribuição automática por equipe, SLA configurável e histórico completo de cada conversa.",
    items: [
      "WhatsApp Evolution API & Meta Business Oficial",
      "Instagram Direct, Facebook Messenger & Webchat",
      "Gmail / SMTP / SendGrid / AWS SES",
      "Round-robin automático + transferência com histórico",
    ],
  },
  {
    num: "02", tag: "Disparos em massa",
    headline: "Escale as vendas sem ser bloqueado.",
    body: "Segmentação avançada por tags, score e campos customizados. Throttling anti-bloqueio, rotação de instâncias e opt-out automático.",
    items: [
      "A/B testing com métricas de entrega, leitura e resposta",
      "Intervalo aleatório entre envios (anti-padrão de bot)",
      "Templates HSM aprovados pela Meta + variáveis dinâmicas",
      "Importação de listas via CSV com DNC integrado",
    ],
  },
  {
    num: "03", tag: "Automações com IA",
    headline: "Seu time trabalhando enquanto você dorme.",
    body: "Builder visual drag-and-drop com 50+ tipos de ação. IA Alexandria com RAG sobre sua base de conhecimento.",
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

export default function LandingPage() {
  const { theme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const logo = theme === "dark" ? upixelLogoLight : upixelLogoLight;

  return (
    <div style={{ ...AMAZON, background: C.bg, color: C.fg, overflowX: "hidden" }}>
      <style>{`
        @keyframes _mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        ._mq { display:flex; animation:_mq 26s linear infinite; }
        ._nbtn { transition:background .1s; }
        ._nbtn:hover { background:${C.navHov} !important; }
        ._link:hover { color:${C.linkHov} !important; text-decoration:underline; }
        ._faq:hover { background:${C.bgSoft} !important; }
        ._footlink:hover { color:${C.fg} !important; text-decoration:underline; }
      `}</style>

      {/* ── TOP NAV ──────────────────────────────────────────────── */}
      <header>
        {/* primary nav */}
        <div style={{ background: C.nav, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <img src={logo} alt="uPixel" style={{ height: 26, flexShrink: 0 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "flex-end" }}>
            {[["#pilares", "Plataforma"], ["#precos", "Preços"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="_nbtn" style={{
                fontSize: 14, fontWeight: 400, color: "#fff", textDecoration: "none",
                padding: "6px 10px", borderRadius: 3, border: "1px solid transparent",
                transition: "border-color .1s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >{label}</a>
            ))}
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.2)", margin: "0 8px" }} />
            <Link to="/login" className="_nbtn" style={{ fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", padding: "6px 10px", borderRadius: 3, border: "1px solid transparent" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >Entrar</Link>
            <Link to="/cadastro" style={{ fontSize: 14, fontWeight: 700, color: C.fg, textDecoration: "none", padding: "6px 14px", borderRadius: 8, background: C.yellow, border: `1px solid #f2b900`, marginLeft: 4, transition: "background .1s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f7ca00")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = C.yellow)}
            >Testar grátis</Link>
          </div>
        </div>

        {/* sub nav */}
        <div style={{ background: C.navHov, padding: "0 24px", height: 38, display: "flex", alignItems: "center", gap: 2 }}>
          {["Inbox", "Automações", "CRM", "Campanhas", "Relatórios", "Integrações"].map(item => (
            <a key={item} href="#" className="_nbtn" style={{ fontSize: 13, fontWeight: 400, color: "#fff", textDecoration: "none", padding: "4px 10px", borderRadius: 3, border: "1px solid transparent", whiteSpace: "nowrap" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >{item}</a>
          ))}
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(180deg, ${C.nav} 0%, ${C.nav} 60%, ${C.bg} 100%)`, padding: "56px 24px 48px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,153,0,.15)", border: `1px solid ${C.orange}`, borderRadius: 3, padding: "3px 10px", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.orange }}>Novo — IA Alexandria com RAG</span>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: 16 }}>
              Comunicação, CRM e IA num só lugar.
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.75)", lineHeight: 1.65, marginBottom: 28, maxWidth: 480 }}>
              O uPixel centraliza WhatsApp, Instagram e Email com automações visuais e IA generativa — para seu time vender mais sem depender de developers.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/cadastro" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.yellow, color: C.fg, fontWeight: 700, fontSize: 15, textDecoration: "none", padding: "10px 22px", borderRadius: 8, border: `1px solid #f2b900` }}>
                Testar 14 dias grátis <ArrowRight size={16} />
              </Link>
              <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#fff", fontWeight: 500, fontSize: 15, textDecoration: "none", padding: "10px 22px", borderRadius: 8, border: "1px solid rgba(255,255,255,.35)" }}>
                Ver demonstração
              </a>
            </div>
          </div>

          {/* stats card */}
          <div style={{ background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, padding: "28px", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Números da plataforma</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {STATS.map(s => (
                <div key={s.label} style={{ padding: "16px", background: C.bgSoft, borderRadius: 4, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.fg, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────── */}
      <div style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "10px 0", overflow: "hidden" }}>
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
      <section id="pilares" style={{ background: C.bg, padding: "64px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: C.fg, marginBottom: 8, letterSpacing: "-0.01em" }}>
            Três pilares que transformam como você vende
          </h2>
          <div style={{ width: 40, height: 3, background: C.orange, borderRadius: 2, marginBottom: 36 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {PILLARS.map((p) => (
              <div key={p.num} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "24px", boxShadow: "0 2px 5px rgba(15,17,17,.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{p.num}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.tag}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.fg, lineHeight: 1.3, marginBottom: 10 }}>{p.headline}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: C.muted, marginBottom: 16 }}>{p.body}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                  {p.items.map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CheckCircle2 size={14} color="#007600" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: C.fg, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}`, padding: "64px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: C.fg, marginBottom: 8 }}>Tudo que seu time precisa</h2>
          <div style={{ width: 40, height: 3, background: C.orange, borderRadius: 2, marginBottom: 32 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "20px", display: "flex", gap: 14, alignItems: "flex-start", boxShadow: "0 1px 3px rgba(15,17,17,.06)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 4, background: "#fff3e0", border: `1px solid #ffe0b2`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color={C.orange} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.fg, marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: C.muted }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precos" style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: "64px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: C.fg, marginBottom: 8 }}>Planos simples, sem surpresas</h2>
          <div style={{ width: 40, height: 3, background: C.orange, borderRadius: 2, marginBottom: 8 }} />
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>14 dias de teste gratuito em todos os planos. Cancele quando quiser.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                background: C.bg,
                border: plan.highlight ? `2px solid ${C.orange}` : `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "24px",
                display: "flex", flexDirection: "column",
                position: "relative",
                boxShadow: plan.highlight ? `0 4px 16px rgba(255,153,0,.15)` : "0 2px 5px rgba(15,17,17,.08)",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: C.orange, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 12px", borderRadius: "0 0 6px 6px" }}>
                    Mais popular
                  </div>
                )}
                <div style={{ marginBottom: 20, paddingTop: plan.highlight ? 8 : 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, color: C.fg, lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: C.muted }}>{plan.period}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.muted }}>{plan.desc}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CheckCircle2 size={14} color="#007600" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: C.fg, lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/cadastro" style={{
                  display: "block", textAlign: "center",
                  background: plan.highlight ? C.yellow : C.bgSoft,
                  color: C.fg,
                  border: plan.highlight ? `1px solid #f2b900` : `1px solid ${C.border}`,
                  borderRadius: 8, padding: "9px 20px",
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  transition: "background .1s",
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}`, padding: "64px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: C.fg, marginBottom: 8 }}>Perguntas frequentes</h2>
          <div style={{ width: 40, height: 3, background: C.orange, borderRadius: 2, marginBottom: 28 }} />

          <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden", background: C.bg }}>
            {FAQS.map((faq, i) => (
              <div key={faq.q} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                <button className="_faq" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", textAlign: "left", padding: "16px 18px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, color: C.fg, transition: "background .1s",
                }}>
                  {faq.q}
                  <ChevronDown size={16} color={C.muted} style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 18px 16px", fontSize: 14, lineHeight: 1.75, color: C.muted }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{ background: C.nav, padding: "64px 24px", borderTop: `1px solid rgba(255,255,255,.08)` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 44px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.01em", marginBottom: 16 }}>
            Pronto para vender mais com menos esforço?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.65)", marginBottom: 36, lineHeight: 1.6 }}>
            Junte-se a 500+ empresas que usam uPixel para centralizar comunicação e fechar negócios mais rápido.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/cadastro" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.yellow, color: C.fg, fontWeight: 700, fontSize: 15, textDecoration: "none", padding: "11px 24px", borderRadius: 8, border: `1px solid #f2b900` }}>
              Começar 14 dias grátis <ArrowRight size={16} />
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#fff", fontWeight: 500, fontSize: 15, textDecoration: "none", padding: "11px 24px", borderRadius: 8, border: "1px solid rgba(255,255,255,.3)" }}>
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: "#131a22", padding: "40px 24px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0 40px", marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            <div>
              <img src={upixelLogoLight} alt="uPixel" style={{ height: 22, marginBottom: 14, opacity: .85 }} />
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 240 }}>
                CRM multi-canal para times brasileiros. WhatsApp, automações e IA numa só plataforma.
              </p>
            </div>
            {[
              { title: "Produto",  links: ["Plataforma", "Preços", "Roadmap", "Changelog", "API Docs"] },
              { title: "Empresa",  links: ["Sobre nós", "Blog", "Parceiros", "Imprensa"] },
              { title: "Suporte",  links: ["Central de ajuda", "Status", "Fale conosco", "LGPD"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{col.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" className="_footlink" style={{ fontSize: 13, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>© {new Date().getFullYear()} uPixel. Todos os direitos reservados.</p>
            <div style={{ display: "flex", gap: 18 }}>
              {["Privacidade", "Termos", "LGPD", "Cookies"].map(t => (
                <a key={t} href="#" className="_footlink" style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
