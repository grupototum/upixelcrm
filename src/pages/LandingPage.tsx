import { useState } from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --z-black:#201515;
  --z-cream:#fffefb;
  --z-offwhite:#fffdf9;
  --z-orange:#ff4f00;
  --z-charcoal:#36342e;
  --z-warm-gray:#939084;
  --z-sand:#c5c0b1;
  --z-light-sand:#eceae3;
  --z-mid-warm:#b5b2aa;
}
body{background:var(--z-cream);color:var(--z-black);font-family:'Inter',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;overflow-x:hidden}
h2{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:clamp(1.8rem,3.5vw,2.25rem);font-weight:600;line-height:1.15;letter-spacing:-0.03em;color:var(--z-black)}
h3{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:1.25rem;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:var(--z-black)}
h4{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:1rem;font-weight:600;letter-spacing:-0.01em;color:var(--z-black)}
p{color:var(--z-charcoal);line-height:1.6}
a{color:var(--z-black);text-decoration:none}
a:hover{text-decoration:underline}
.label-tag{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--z-warm-gray);display:inline-block;margin-bottom:1rem}
.btn-orange{background:var(--z-orange);color:#fff;border:1px solid var(--z-orange);padding:14px 28px;border-radius:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:opacity .18s;display:inline-flex;align-items:center;gap:8px;text-decoration:none}
.btn-orange:hover{opacity:.88;text-decoration:none}
.btn-dark{background:var(--z-black);color:#fff;border:1px solid var(--z-black);padding:14px 24px;border-radius:8px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:background .18s;display:inline-flex;align-items:center;gap:8px;text-decoration:none}
.btn-dark:hover{background:var(--z-charcoal);text-decoration:none}
.btn-ghost{background:transparent;color:var(--z-black);border:1px solid var(--z-sand);padding:14px 24px;border-radius:8px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:background .18s,border-color .18s;display:inline-flex;align-items:center;gap:8px;text-decoration:none}
.btn-ghost:hover{background:var(--z-light-sand);border-color:var(--z-mid-warm);text-decoration:none}
.nav-wrap{position:sticky;top:0;z-index:100;background:var(--z-cream);border-bottom:1px solid var(--z-sand)}
.nav{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;max-width:1200px;margin:0 auto}
.nav-logo{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:1.3rem;font-weight:700;letter-spacing:-0.04em;color:var(--z-orange)}
.nav-logo span{color:var(--z-black)}
.nav-links{display:flex;gap:28px}
.nav-links a{font-size:.9rem;font-weight:500;color:var(--z-black);transition:color .15s}
.nav-links a:hover{color:var(--z-warm-gray);text-decoration:none}
.btn-nav{background:var(--z-orange);color:#fff;border:none;padding:8px 20px;border-radius:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .15s;text-decoration:none;display:inline-block}
.btn-nav:hover{opacity:.88;text-decoration:none}
.section{padding:80px 24px;max-width:1200px;margin:0 auto}
.section-sm{padding:60px 24px;max-width:1200px;margin:0 auto}
.section-header{text-align:center;margin-bottom:3.5rem}
.section-header h2{margin-bottom:.75rem}
.section-header p{color:var(--z-warm-gray);max-width:540px;margin:0 auto;font-size:.97rem}
.divider{border:none;border-top:1px solid var(--z-sand)}
.hero{padding:100px 24px 80px;text-align:center;background:var(--z-cream);border-bottom:1px solid var(--z-sand)}
.hero-inner{max-width:860px;margin:0 auto}
.hero h1{font-size:clamp(2.8rem,6vw,4.5rem);font-weight:600;line-height:0.95;letter-spacing:-0.04em;color:var(--z-black);margin-bottom:1.5rem}
.hero h1 em{font-style:normal;color:var(--z-orange)}
.hero p{font-size:1.2rem;color:var(--z-charcoal);max-width:580px;margin:0 auto 2.5rem;font-weight:400;line-height:1.5}
.cta-row{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.proof-row{margin-top:2.5rem;display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
.proof-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--z-warm-gray);font-weight:500}
.proof-dot{width:5px;height:5px;border-radius:50%;background:var(--z-orange);flex-shrink:0}
.stats-bar{background:var(--z-offwhite);border-bottom:1px solid var(--z-sand)}
.stats-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr)}
.stat{padding:36px 32px;text-align:center;border-right:1px solid var(--z-sand)}
.stat:last-child{border-right:none}
.stat-n{font-size:2.6rem;font-weight:600;letter-spacing:-0.04em;color:var(--z-black);line-height:1;margin-bottom:6px}
.stat-n em{color:var(--z-orange);font-style:normal}
.stat-l{font-size:.83rem;color:var(--z-warm-gray);font-weight:500}
.pain-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1px;background:var(--z-sand);border:1px solid var(--z-sand);border-radius:8px;overflow:hidden}
.pain-card{background:var(--z-cream);padding:28px 24px}
.pain-mark{width:24px;height:24px;border-radius:50%;background:var(--z-light-sand);border:1px solid var(--z-sand);color:var(--z-warm-gray);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-bottom:1rem}
.pain-card h4{margin-bottom:.5rem;font-size:.97rem}
.pain-card p{font-size:.875rem;color:var(--z-warm-gray);line-height:1.65}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1px;background:var(--z-sand);border:1px solid var(--z-sand);border-radius:8px;overflow:hidden}
.feat-card{background:var(--z-cream);padding:28px 24px;transition:background .15s}
.feat-card:hover{background:var(--z-offwhite)}
.feat-card.featured{background:var(--z-offwhite)}
.feat-icon{width:40px;height:40px;border-radius:8px;border:1px solid var(--z-sand);background:var(--z-cream);display:flex;align-items:center;justify-content:center;margin-bottom:1rem;font-size:18px}
.feat-card h3{font-size:.97rem;margin-bottom:.5rem}
.feat-card p{font-size:.875rem;color:var(--z-warm-gray);line-height:1.65;margin-bottom:.75rem}
.feat-card ul{list-style:none;padding:0}
.feat-card ul li{font-size:.83rem;color:var(--z-charcoal);padding:4px 0 4px 1rem;position:relative;border-top:1px solid var(--z-light-sand)}
.feat-card ul li::before{content:'→';position:absolute;left:0;color:var(--z-orange);font-size:.8rem}
.auto-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:var(--z-sand);border:1px solid var(--z-sand);border-radius:8px;overflow:hidden}
.auto-card{background:var(--z-cream);padding:22px 20px;transition:background .15s}
.auto-card:hover{background:var(--z-offwhite)}
.auto-label{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--z-warm-gray);margin-bottom:.4rem}
.auto-card h4{font-size:.93rem;margin-bottom:.4rem}
.auto-card p{font-size:.83rem;color:var(--z-warm-gray);line-height:1.6}
.steps-wrap{border:1px solid var(--z-sand);border-radius:8px;overflow:hidden;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));background:var(--z-sand)}
.step{background:var(--z-cream);padding:32px 24px;text-align:center}
.step-num{width:40px;height:40px;border-radius:50%;border:1px solid var(--z-sand);background:var(--z-cream);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:.87rem;font-weight:600;color:var(--z-orange)}
.step h4{font-size:.92rem;margin-bottom:.35rem}
.step p{font-size:.83rem;color:var(--z-warm-gray)}
.integ-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.integ-badge{background:var(--z-cream);border:1px solid var(--z-sand);border-radius:5px;padding:10px 12px;text-align:center;font-size:.8rem;font-weight:500;color:var(--z-charcoal);transition:border-color .15s,background .15s}
.integ-badge:hover{border-color:var(--z-mid-warm);background:var(--z-offwhite)}
.compare-wrap{border:1px solid var(--z-sand);border-radius:8px;overflow:hidden}
.compare-table{width:100%;border-collapse:collapse;font-size:.88rem}
.compare-table th{padding:14px 16px;text-align:left;background:var(--z-offwhite);font-size:11px;font-weight:600;color:var(--z-warm-gray);letter-spacing:.07em;text-transform:uppercase;border-bottom:1px solid var(--z-sand)}
.compare-table th:not(:first-child){text-align:center}
.compare-table th.upixel{color:var(--z-orange)}
.compare-table td{padding:12px 16px;border-bottom:1px solid var(--z-light-sand);color:var(--z-warm-gray)}
.compare-table td.feat-name{color:var(--z-black);font-weight:500}
.compare-table td:not(:first-child){text-align:center}
.compare-table td.yes{color:var(--z-orange);font-weight:600}
.compare-table td.no{color:var(--z-mid-warm)}
.compare-table td.partial{color:var(--z-charcoal)}
.compare-table tr:last-child td{border-bottom:none}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;align-items:start}
.plan{background:var(--z-cream);border:1px solid var(--z-sand);border-radius:8px;padding:32px 28px}
.plan.featured{border:2px solid var(--z-black)}
.plan-popular-badge{display:inline-block;background:var(--z-black);color:var(--z-cream);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:4px 14px;border-radius:4px;margin-bottom:1rem}
.plan-name{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--z-warm-gray);margin-bottom:.5rem}
.plan-price{font-size:2.6rem;font-weight:600;letter-spacing:-0.04em;color:var(--z-black);margin-bottom:.25rem;line-height:1}
.plan-price span{font-size:1rem;font-weight:400;color:var(--z-warm-gray)}
.plan-desc{font-size:.87rem;color:var(--z-warm-gray);margin-bottom:1.5rem;padding-bottom:1.25rem;border-bottom:1px solid var(--z-sand)}
.plan ul{list-style:none;padding:0;margin-bottom:2rem}
.plan ul li{font-size:.875rem;padding:7px 0 7px 1.5rem;position:relative;border-bottom:1px solid var(--z-light-sand);color:var(--z-charcoal)}
.plan ul li::before{content:'✓';position:absolute;left:0;color:var(--z-orange);font-size:.85rem;font-weight:600}
.plan ul li.off{color:var(--z-mid-warm)}
.plan ul li.off::before{content:'—';color:var(--z-light-sand)}
.btn-plan{width:100%;padding:13px;border-radius:4px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:opacity .15s;display:block;text-align:center;text-decoration:none}
.btn-plan.default{background:var(--z-light-sand);color:var(--z-black);border-color:var(--z-sand)}
.btn-plan.default:hover{background:var(--z-sand);text-decoration:none}
.btn-plan.primary{background:var(--z-orange);color:#fff}
.btn-plan.primary:hover{opacity:.88;text-decoration:none}
.btn-plan.dark{background:var(--z-black);color:#fff}
.btn-plan.dark:hover{background:var(--z-charcoal);text-decoration:none}
.faq-list{display:flex;flex-direction:column;border:1px solid var(--z-sand);border-radius:8px;overflow:hidden}
.faq-item{background:var(--z-cream);border-bottom:1px solid var(--z-sand);padding:20px 24px;cursor:pointer;transition:background .15s}
.faq-item:last-child{border-bottom:none}
.faq-item:hover{background:var(--z-offwhite)}
.faq-q{font-size:.95rem;font-weight:500;color:var(--z-black);display:flex;justify-content:space-between;align-items:center;gap:16px}
.faq-a{font-size:.87rem;color:var(--z-warm-gray);margin-top:12px;line-height:1.7}
.faq-toggle{color:var(--z-orange);font-size:1.3rem;line-height:1;flex-shrink:0;transition:transform .18s;font-weight:300}
.faq-toggle.open{transform:rotate(45deg)}
.cta-block{background:var(--z-black);border-radius:8px;padding:64px 40px;text-align:center}
.cta-block h2{color:var(--z-cream);font-size:clamp(1.8rem,3.5vw,2.5rem);margin-bottom:.75rem}
.cta-block p{color:var(--z-sand);max-width:480px;margin:0 auto 2.5rem;font-weight:400}
.cta-guarantee{margin-top:1.5rem;font-size:.82rem;color:var(--z-mid-warm)}
.footer{background:var(--z-black);border-top:1px solid rgba(197,192,177,.15);padding:40px 24px;text-align:center}
.footer-inner{max-width:1200px;margin:0 auto}
.footer p{color:var(--z-sand);font-size:.84rem;margin-bottom:.5rem}
.footer small{color:var(--z-warm-gray);font-size:.79rem}
@media(max-width:768px){
  .nav-links{display:none}
  .hero{padding:60px 20px 50px}
  .stats-inner{grid-template-columns:1fr 1fr}
  .stat{border-right:none;border-bottom:1px solid var(--z-sand)}
  .stat:nth-child(even){border-left:1px solid var(--z-sand)}
  .stat:nth-last-child(-n+2){border-bottom:none}
  .cta-block{padding:40px 20px}
  .pricing-grid{grid-template-columns:1fr}
  .compare-wrap{overflow-x:auto}
}
`;

const FAQS = [
  {
    q: "O uPixel funciona com WhatsApp pessoal ou precisa do WhatsApp Business?",
    a: "Suporta ambos: Evolution API (conecta qualquer número via QR Code, inclusive pessoal) e Meta Official API (WhatsApp Business com CNPJ). Você escolhe conforme sua operação e volume.",
  },
  {
    q: "Posso migrar minha base do Kommo para o uPixel?",
    a: "Sim. Compatibilidade nativa com Kommo: importação de automações via JSON, mapeamento automático de triggers e ações, e migração zero-downtime. Histórico e configurações preservados.",
  },
  {
    q: "O sistema pode ser bloqueado pelo WhatsApp por causa dos disparos?",
    a: "O uPixel inclui anti-bloqueio com throttling configurável, intervalo aleatório entre envios, rotação de instâncias e detecção de números inválidos. Para máxima segurança, recomendamos Meta Official API com templates aprovados.",
  },
  {
    q: "Preciso de um developer para usar as automações?",
    a: "Não. O Visual Workflow Builder é completamente drag-and-drop. IF/ELSE, loops, delays e integrações de API sem escrever código. Templates prontos para os casos de uso mais comuns.",
  },
  {
    q: "O uPixel é LGPD compliant?",
    a: "Sim. Criptografia de dados sensíveis, direito ao esquecimento, exportação de dados do titular, auditoria completa de acesso, opt-out automático e blocklist global. LGPD desde a arquitetura.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "14 dias com acesso completo ao plano Pro, sem precisar de cartão de crédito. Após o período, escolhe o plano mais adequado ou cancela sem custo algum.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function toggleFaq(i: number) {
    setOpenFaq(prev => (prev === i ? null : i));
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <div className="nav-wrap">
        <nav className="nav" aria-label="Navegação principal">
          <div className="nav-logo">u<span>Pixel</span></div>
          <div className="nav-links">
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#automacoes">Automações</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="https://upixel.app" className="btn-nav">Começar grátis</a>
        </nav>
      </div>

      <main>
        {/* HERO */}
        <section className="hero" aria-label="Hero">
          <div className="hero-inner">
            <div className="label-tag">CRM + WhatsApp + Automações</div>
            <h1>Pare de perder vendas<br />por <em>falta de sistema</em></h1>
            <p>uPixel é o CRM completo com WhatsApp nativo, disparos em massa e automações visuais — tudo em uma plataforma. Sem developer. Sem integração frágil.</p>
            <div className="cta-row">
              <a href="https://upixel.app" className="btn-orange">Testar 14 dias grátis →</a>
              <a href="#funcionalidades" className="btn-ghost">Ver como funciona</a>
            </div>
            <div className="proof-row">
              <div className="proof-item"><div className="proof-dot"></div>Sem cartão de crédito</div>
              <div className="proof-item"><div className="proof-dot"></div>Setup em minutos</div>
              <div className="proof-item"><div className="proof-dot"></div>Suporte em português</div>
              <div className="proof-item"><div className="proof-dot"></div>100% LGPD compliant</div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats-bar" aria-label="Números do produto">
          <div className="stats-inner">
            <div className="stat"><div className="stat-n">50<em>+</em></div><div className="stat-l">tipos de ação em automações</div></div>
            <div className="stat"><div className="stat-n">6</div><div className="stat-l">canais num único inbox</div></div>
            <div className="stat"><div className="stat-n">5<em>×</em></div><div className="stat-l">mais leads convertidos</div></div>
            <div className="stat"><div className="stat-n">0</div><div className="stat-l">linhas de código necessárias</div></div>
          </div>
        </div>

        {/* PAIN */}
        <section className="section" id="dor" aria-label="Problemas que o uPixel resolve">
          <div className="section-header">
            <div className="label-tag">O problema</div>
            <h2>Você está deixando dinheiro na mesa todo dia</h2>
            <p>Sem um CRM integrado, seu time perde tempo, energia e clientes em potencial.</p>
          </div>
          <div className="pain-grid">
            <div className="pain-card"><div className="pain-mark">✗</div><h4>Conversas perdidas no WhatsApp</h4><p>Leads chegam pelo WhatsApp e somem nas conversas pessoais do vendedor. Sem histórico, sem rastreamento, sem funil.</p></div>
            <div className="pain-card"><div className="pain-mark">✗</div><h4>Follow-up dependendo da memória</h4><p>Cada vendedor tem o próprio sistema. Planilha, caderninho ou cabeça. Leads quentes esfriam porque ninguém lembrou.</p></div>
            <div className="pain-card"><div className="pain-mark">✗</div><h4>5 ferramentas, 5 assinaturas</h4><p>CRM aqui, disparo de WhatsApp ali, e-mail marketing lá. Dados fragmentados, custo alto, integração manual que quebra.</p></div>
            <div className="pain-card"><div className="pain-mark">✗</div><h4>Automação só pra quem sabe codar</h4><p>Qualquer fluxo depende de um dev. Mudou o processo? Abre chamado. Espera. Paga. Repete no mês seguinte.</p></div>
          </div>
        </section>

        <hr className="divider" />

        {/* FEATURES */}
        <section className="section" id="funcionalidades" aria-label="Funcionalidades do uPixel CRM">
          <div className="section-header">
            <div className="label-tag">A solução</div>
            <h2>Uma plataforma. Tudo resolvido.</h2>
            <p>Do primeiro contato ao pós-venda, o uPixel centraliza sua operação comercial completa.</p>
          </div>
          <div className="feat-grid">
            <div className="feat-card featured">
              <div className="feat-icon">💬</div>
              <h3>WhatsApp + Inbox Multi-Canal</h3>
              <p>WhatsApp (Evolution API e Meta Oficial), Instagram Direct, Gmail, Facebook Messenger e Webchat em uma única caixa de entrada.</p>
              <ul>
                <li>Zero perda de mensagem com dedup automático</li>
                <li>Round-robin inteligente entre atendentes</li>
                <li>Status em tempo real, notas internas</li>
                <li>Múltiplas instâncias por conta</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">📢</div>
              <h3>Disparos em Massa Inteligentes</h3>
              <p>Campanhas segmentadas com filtros avançados, A/B testing, throttling anti-bloqueio e rastreamento completo.</p>
              <ul>
                <li>Segmentação por tags, score, custom fields</li>
                <li>Intervalo aleatório entre envios</li>
                <li>Opt-out automático "PARAR"/"CANCELAR"</li>
                <li>ROI calculado por campanha</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">⚡</div>
              <h3>Automações Visuais Sem Código</h3>
              <p>Editor drag-and-drop com 50+ tipos de ação. Crie follow-ups, recuperação de carrinho e upsell sem escrever código.</p>
              <ul>
                <li>Triggers por evento, tempo ou webhook</li>
                <li>Lógica IF/ELSE, loops e delays</li>
                <li>Variáveis dinâmicas de CRM</li>
                <li>Logs de execução detalhados</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">🧠</div>
              <h3>IA &amp; Alexandria (RAG)</h3>
              <p>Base de conhecimento com geração aumentada por recuperação. Responde com contexto real da sua empresa.</p>
              <ul>
                <li>Sugestões de resposta em tempo real</li>
                <li>Análise de sentimento do cliente</li>
                <li>Score de probabilidade de fechamento</li>
                <li>Resumo automático de conversas</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">📊</div>
              <h3>CRM Completo + Pipeline</h3>
              <p>Gestão de leads, contatos e oportunidades com funil visual, drag-and-drop e histórico completo de interações.</p>
              <ul>
                <li>Deduplicação automática por email/CPF</li>
                <li>Lead scoring por engajamento</li>
                <li>Forecasting automático</li>
                <li>Campos customizáveis por conta</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">📈</div>
              <h3>Analytics &amp; Relatórios</h3>
              <p>Dashboard executivo com KPIs em tempo real, heatmaps de atividade, cohort analysis e exports em CSV/Excel/PDF.</p>
              <ul>
                <li>Taxa de conversão por etapa do funil</li>
                <li>Ranking de representantes</li>
                <li>Métricas de campanha com ROI</li>
                <li>Relatórios agendados por e-mail</li>
              </ul>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* AUTOMATIONS */}
        <section className="section" id="automacoes" aria-label="Automações prontas">
          <div className="section-header">
            <div className="label-tag">Automações prontas</div>
            <h2>Fluxos que trabalham enquanto você dorme</h2>
            <p>Templates prontos para ativar. Só configurar e ligar.</p>
          </div>
          <div className="auto-grid">
            <div className="auto-card"><div className="auto-label" style={{ color: "var(--z-orange)" }}>Atração</div><h4>Follow-up automático de leads</h4><p>Lead criado → WhatsApp 5 min → e-mail 2h → SMS 1 dia → "cold" se silêncio total</p></div>
            <div className="auto-card"><div className="auto-label">Recuperação</div><h4>Carrinho abandonado</h4><p>Webhook → WhatsApp + cupom → 6h sem compra → e-mail → 1 dia → frete grátis</p></div>
            <div className="auto-card"><div className="auto-label" style={{ color: "var(--z-orange)" }}>Expansão</div><h4>Upsell pós-fechamento</h4><p>Deal won → produtos relacionados → e-mail + WhatsApp → task de follow-up 7 dias</p></div>
            <div className="auto-card"><div className="auto-label">Retenção</div><h4>NPS automático</h4><p>Suporte resolvido → 2h → NPS via WhatsApp → score &lt;7 vai pro gerente</p></div>
            <div className="auto-card"><div className="auto-label" style={{ color: "var(--z-orange)" }}>Reengajamento</div><h4>Lead frio (60 dias)</h4><p>Trigger automático → "ainda interessado?" → respondeu: ativo / silêncio: inativo</p></div>
            <div className="auto-card"><div className="auto-label">Relacionamento</div><h4>Aniversário com oferta</h4><p>Cron diário → detecta aniversários → "Parabéns + 15% de desconto" + task pro gerente</p></div>
          </div>
        </section>

        <hr className="divider" />

        {/* HOW IT WORKS */}
        <section className="section" aria-label="Como começar">
          <div className="section-header">
            <div className="label-tag">Como funciona</div>
            <h2>Ativo em minutos, não em semanas</h2>
          </div>
          <div className="steps-wrap">
            <div className="step"><div className="step-num">01</div><h4>Crie sua conta</h4><p>Setup guiado. Sem instalar nada. 100% na nuvem.</p></div>
            <div className="step"><div className="step-num">02</div><h4>Conecte seus canais</h4><p>WhatsApp via QR Code, e-mail, Instagram em poucos cliques.</p></div>
            <div className="step"><div className="step-num">03</div><h4>Importe seus leads</h4><p>CSV, via API ou migre do Kommo automaticamente.</p></div>
            <div className="step"><div className="step-num">04</div><h4>Ative as automações</h4><p>Template pronto ou crie o seu no builder visual sem código.</p></div>
          </div>
        </section>

        {/* INTEGRATIONS */}
        <section className="section-sm" aria-label="Integrações disponíveis">
          <div className="section-header">
            <div className="label-tag">Integrações</div>
            <h2>Integra com o que você já usa</h2>
          </div>
          <div className="integ-grid">
            {["WhatsApp Business","Evolution API","Instagram DM","Gmail","Facebook Messenger","Zapier","Make","Google Calendar","Google Sheets","Stripe","MercadoPago","Hotmart","Kommo","RD Station","HubSpot","SendGrid","AWS SES","Supabase"].map(name => (
              <div key={name} className="integ-badge">{name}</div>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* COMPARE */}
        <section className="section" aria-label="Comparativo com concorrentes">
          <div className="section-header">
            <div className="label-tag">Comparativo</div>
            <h2>Por que uPixel e não as outras opções?</h2>
          </div>
          <div className="compare-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th style={{ width: "36%" }}>Recurso</th>
                  <th className="upixel">uPixel</th>
                  <th>Kommo</th>
                  <th>Zendesk</th>
                  <th>Solução caseira</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="feat-name">WhatsApp nativo e estável</td><td className="yes">✓</td><td className="partial">Parcial</td><td className="no">—</td><td className="no">—</td></tr>
                <tr><td className="feat-name">Disparos em massa anti-bloqueio</td><td className="yes">✓</td><td className="no">—</td><td className="no">—</td><td className="partial">Complexo</td></tr>
                <tr><td className="feat-name">Automações sem código</td><td className="yes">✓</td><td className="partial">Limitado</td><td className="partial">Limitado</td><td className="no">—</td></tr>
                <tr><td className="feat-name">IA com RAG contextual</td><td className="yes">✓</td><td className="no">—</td><td className="partial">Básico</td><td className="no">—</td></tr>
                <tr><td className="feat-name">Multi-canal (6 canais)</td><td className="yes">✓</td><td className="partial">Alguns</td><td className="yes">✓</td><td className="no">—</td></tr>
                <tr><td className="feat-name">Preço acessível para PMEs</td><td className="yes">✓</td><td className="no">$$$</td><td className="no">$$$</td><td className="partial">Custo oculto</td></tr>
                <tr><td className="feat-name">LGPD + suporte em PT-BR</td><td className="yes">✓</td><td className="no">—</td><td className="no">—</td><td className="no">—</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="divider" />

        {/* PRICING */}
        <section className="section" id="planos" aria-label="Planos e preços">
          <div className="section-header">
            <div className="label-tag">Planos</div>
            <h2>Simples, sem surpresa no boleto</h2>
            <p>Escale conforme sua operação cresce. Cancele quando quiser.</p>
          </div>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Starter</div>
              <div className="plan-price">R$ 297 <span>/mês</span></div>
              <div className="plan-desc">Para quem está começando ou tem equipe pequena</div>
              <ul>
                <li>Inbox unificado (até 2 canais)</li>
                <li>1 instância de WhatsApp</li>
                <li>100 automações / mês</li>
                <li>CRM + Pipeline completo</li>
                <li>Relatórios básicos</li>
                <li className="off">Disparos em massa</li>
                <li className="off">IA / Alexandria</li>
                <li className="off">API pública</li>
              </ul>
              <a href="https://upixel.app" className="btn-plan default">Começar com Starter</a>
            </div>
            <div className="plan featured">
              <div className="plan-popular-badge">Mais popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">R$ 897 <span>/mês</span></div>
              <div className="plan-desc">Para operações comerciais ativas com time de vendas</div>
              <ul>
                <li>Todos os canais ilimitados</li>
                <li>Múltiplas instâncias WhatsApp</li>
                <li>Disparos em massa ilimitados</li>
                <li>10.000 automações / mês</li>
                <li>IA + Alexandria (RAG)</li>
                <li>API REST pública</li>
                <li>Relatórios avançados + export</li>
                <li>Suporte prioritário</li>
              </ul>
              <a href="https://upixel.app" className="btn-plan primary">Ativar plano Pro →</a>
            </div>
            <div className="plan">
              <div className="plan-name">Enterprise</div>
              <div className="plan-price" style={{ fontSize: "1.8rem" }}>Sob consulta</div>
              <div className="plan-desc">Para operações grandes, agências e white-label</div>
              <ul>
                <li>Tudo do Pro</li>
                <li>White-label completo</li>
                <li>SLA garantido</li>
                <li>Suporte dedicado</li>
                <li>Multi-tenant avançado</li>
                <li>Customizações sob medida</li>
                <li>Onboarding personalizado</li>
                <li>Migração assistida</li>
              </ul>
              <a href="https://upixel.app" className="btn-plan dark">Falar com especialista</a>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* FAQ */}
        <section className="section" id="faq" aria-label="Perguntas frequentes">
          <div className="section-header">
            <div className="label-tag">FAQ</div>
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className="faq-item" onClick={() => toggleFaq(i)}>
                <div className="faq-q">
                  {faq.q}
                  <span className={`faq-toggle${openFaq === i ? " open" : ""}`}>+</span>
                </div>
                {openFaq === i && <div className="faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <div className="section">
          <div className="cta-block">
            <div className="label-tag" style={{ color: "var(--z-sand)" }}>Comece hoje</div>
            <h2>Sua operação comercial merece<br />uma ferramenta à altura</h2>
            <p>14 dias grátis. Sem cartão de crédito. Setup em minutos.</p>
            <div className="cta-row">
              <a href="https://upixel.app" className="btn-orange" style={{ fontSize: "16px", padding: "16px 32px" }}>Criar minha conta grátis →</a>
              <a href="https://upixel.app" className="btn-ghost" style={{ borderColor: "rgba(197,192,177,.3)", color: "var(--z-sand)" }}>Ver demonstração</a>
            </div>
            <div className="cta-guarantee">✓ Sem fidelidade &nbsp;&nbsp; ✓ Cancele quando quiser &nbsp;&nbsp; ✓ Suporte em português</div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <p>© {new Date().getFullYear()} uPixel CRM — Tecnologia de vendas para times que levam resultado a sério.</p>
          <small>Desenvolvido com Supabase · TypeScript · React · Edge Functions</small>
        </div>
      </footer>
    </div>
  );
}
