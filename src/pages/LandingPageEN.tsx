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
    q: "Does uPixel work with a personal WhatsApp number?",
    a: "Yes. uPixel supports both Evolution API (any number via QR Code, including personal) and Meta Official API (WhatsApp Business with verified business). You choose based on your volume and compliance needs.",
  },
  {
    q: "Can I migrate from Kommo or another CRM?",
    a: "Yes. Native Kommo compatibility: JSON-based automation import, automatic trigger/action mapping, and zero-downtime migration. History and configurations are preserved.",
  },
  {
    q: "Will WhatsApp ban my number for mass messaging?",
    a: "uPixel includes an anti-ban system with configurable throttling, randomized send intervals, multi-instance rotation, and invalid number detection. For maximum safety, we recommend Meta Official API with approved message templates.",
  },
  {
    q: "Do I need a developer to use automations?",
    a: "No. The Visual Workflow Builder is fully drag-and-drop. Build IF/ELSE logic, loops, delays, and API integrations without writing any code. Ready-made templates cover the most common use cases.",
  },
  {
    q: "Is uPixel GDPR compliant?",
    a: "Yes. The platform includes encryption of sensitive data, right to erasure, data portability, full access audit logs, automatic opt-out, and a global blocklist. Designed for GDPR and LGPD compliance from the ground up.",
  },
  {
    q: "How does the free trial work?",
    a: "14 days with full access to the Pro plan, no credit card required. After the trial, choose the plan that fits your operation or cancel at no cost.",
  },
];

export default function LandingPageEN() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function toggleFaq(i: number) {
    setOpenFaq(prev => (prev === i ? null : i));
  }

  return (
    <div lang="en">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <div className="nav-wrap">
        <nav className="nav" aria-label="Main navigation">
          <div className="nav-logo">u<span>Pixel</span></div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#automations">Automations</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="https://upixel.app" className="btn-nav">Start free</a>
        </nav>
      </div>

      <main>
        {/* HERO */}
        <section className="hero" aria-label="Hero">
          <div className="hero-inner">
            <div className="label-tag">CRM + WhatsApp + Automations</div>
            <h1>Stop losing deals to<br /><em>broken toolstacks</em></h1>
            <p>uPixel is the all-in-one CRM with native WhatsApp, mass messaging, visual automations, and AI — everything in one platform. No developer. No fragile integrations.</p>
            <div className="cta-row">
              <a href="https://upixel.app" className="btn-orange">Start free 14-day trial →</a>
              <a href="#features" className="btn-ghost">See how it works</a>
            </div>
            <div className="proof-row">
              <div className="proof-item"><div className="proof-dot"></div>No credit card required</div>
              <div className="proof-item"><div className="proof-dot"></div>Setup in minutes</div>
              <div className="proof-item"><div className="proof-dot"></div>LGPD &amp; GDPR compliant</div>
              <div className="proof-item"><div className="proof-dot"></div>Cancel anytime</div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats-bar" aria-label="Key numbers">
          <div className="stats-inner">
            <div className="stat"><div className="stat-n">50<em>+</em></div><div className="stat-l">automation action types</div></div>
            <div className="stat"><div className="stat-n">6</div><div className="stat-l">channels in one inbox</div></div>
            <div className="stat"><div className="stat-n">5<em>×</em></div><div className="stat-l">more leads converted</div></div>
            <div className="stat"><div className="stat-n">0</div><div className="stat-l">lines of code needed</div></div>
          </div>
        </div>

        {/* PAIN */}
        <section className="section" aria-label="Problems">
          <div className="section-header">
            <div className="label-tag">The problem</div>
            <h2>You're leaving money on the table every day</h2>
            <p>Without an integrated CRM, your team wastes time, energy, and potential customers.</p>
          </div>
          <div className="pain-grid">
            <div className="pain-card"><div className="pain-mark">✗</div><h4>Conversations lost in WhatsApp</h4><p>Leads come through WhatsApp and disappear in personal chats. No history, no tracking, no funnel.</p></div>
            <div className="pain-card"><div className="pain-mark">✗</div><h4>Follow-up depends on memory</h4><p>Every rep has their own system — spreadsheet, notebook, or brain. Hot leads go cold because no one remembered.</p></div>
            <div className="pain-card"><div className="pain-mark">✗</div><h4>5 tools, 5 subscriptions</h4><p>CRM here, WhatsApp blaster there, email marketing somewhere else. Fragmented data, high cost, manual integrations that break.</p></div>
            <div className="pain-card"><div className="pain-mark">✗</div><h4>Automations require a developer</h4><p>Every workflow depends on a dev. Process changed? Open a ticket. Wait. Pay. Repeat next month.</p></div>
          </div>
        </section>

        <hr className="divider" />

        {/* FEATURES */}
        <section className="section" id="features" aria-label="Features">
          <div className="section-header">
            <div className="label-tag">The solution</div>
            <h2>One platform. Everything solved.</h2>
            <p>From first contact to post-sale, uPixel centralizes your entire commercial operation.</p>
          </div>
          <div className="feat-grid">
            <div className="feat-card featured">
              <div className="feat-icon">💬</div>
              <h3>WhatsApp + Unified Inbox</h3>
              <p>WhatsApp (Evolution API &amp; Meta Official), Instagram Direct, Gmail, Facebook Messenger, and Webchat — all in one inbox.</p>
              <ul>
                <li>Zero message loss with auto-dedup</li>
                <li>Smart round-robin assignment</li>
                <li>Real-time status, internal notes</li>
                <li>Multiple WhatsApp instances per account</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">📢</div>
              <h3>Smart Mass Messaging</h3>
              <p>Segmented campaigns with advanced filters, A/B testing, anti-ban throttling, and full performance tracking.</p>
              <ul>
                <li>Segment by tags, lead score, custom fields</li>
                <li>Randomized send intervals</li>
                <li>Auto opt-out on "STOP" keyword</li>
                <li>ROI calculated per campaign</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">⚡</div>
              <h3>Visual Automations — No Code</h3>
              <p>Drag-and-drop builder with 50+ action types. Build follow-up flows, cart recovery, upsell sequences — no developer needed.</p>
              <ul>
                <li>Event, time, and webhook triggers</li>
                <li>IF/ELSE logic, loops, and delays</li>
                <li>Dynamic CRM variables</li>
                <li>Detailed execution logs</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">🧠</div>
              <h3>AI &amp; Alexandria (RAG)</h3>
              <p>Knowledge base with Retrieval-Augmented Generation. Answers with real company context, not generic chatbot responses.</p>
              <ul>
                <li>Real-time response suggestions</li>
                <li>Customer sentiment analysis</li>
                <li>Deal closing probability score</li>
                <li>Automatic conversation summaries</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">📊</div>
              <h3>Full CRM + Pipeline</h3>
              <p>Lead, contact, and opportunity management with visual pipeline, drag-and-drop stages, and full interaction history.</p>
              <ul>
                <li>Auto-deduplication by email/phone</li>
                <li>Activity-based lead scoring</li>
                <li>Automatic forecasting</li>
                <li>Customizable fields per account</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">📈</div>
              <h3>Analytics &amp; Reports</h3>
              <p>Executive dashboard with real-time KPIs, activity heatmaps, cohort analysis, and CSV/Excel/PDF exports.</p>
              <ul>
                <li>Conversion rate by funnel stage</li>
                <li>Rep performance ranking</li>
                <li>Campaign ROI metrics</li>
                <li>Scheduled email reports</li>
              </ul>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* AUTOMATIONS */}
        <section className="section" id="automations" aria-label="Ready-to-use automations">
          <div className="section-header">
            <div className="label-tag">Ready-to-use automations</div>
            <h2>Workflows that run while you sleep</h2>
            <p>Pre-built automation templates. Just configure and activate.</p>
          </div>
          <div className="auto-grid">
            <div className="auto-card"><div className="auto-label" style={{ color: "var(--z-orange)" }}>Acquisition</div><h4>Automatic lead follow-up</h4><p>Lead created → WhatsApp 5 min → email 2h → SMS 1 day → mark "cold" if no reply</p></div>
            <div className="auto-card"><div className="auto-label">Recovery</div><h4>Abandoned cart</h4><p>Webhook → WhatsApp + coupon → 6h no purchase → email → 1 day → free shipping offer</p></div>
            <div className="auto-card"><div className="auto-label" style={{ color: "var(--z-orange)" }}>Expansion</div><h4>Post-close upsell</h4><p>Deal won → related products → email + WhatsApp → follow-up task in 7 days</p></div>
            <div className="auto-card"><div className="auto-label">Retention</div><h4>Automatic NPS</h4><p>Support resolved → 2h → NPS via WhatsApp → score &lt;7 escalates to manager</p></div>
            <div className="auto-card"><div className="auto-label" style={{ color: "var(--z-orange)" }}>Re-engagement</div><h4>Cold lead (60 days silent)</h4><p>Auto trigger → "still interested?" → replied: active / silence: mark inactive</p></div>
            <div className="auto-card"><div className="auto-label">Relationship</div><h4>Birthday offer</h4><p>Daily cron → detects birthdays → "Happy birthday + 15% off" + task for manager to call</p></div>
          </div>
        </section>

        <hr className="divider" />

        {/* HOW IT WORKS */}
        <section className="section" aria-label="How to get started">
          <div className="section-header">
            <div className="label-tag">How it works</div>
            <h2>Live in minutes, not weeks</h2>
          </div>
          <div className="steps-wrap">
            <div className="step"><div className="step-num">01</div><h4>Create your account</h4><p>Guided setup. Nothing to install. 100% cloud.</p></div>
            <div className="step"><div className="step-num">02</div><h4>Connect your channels</h4><p>WhatsApp via QR Code, email, Instagram in a few clicks.</p></div>
            <div className="step"><div className="step-num">03</div><h4>Import your leads</h4><p>CSV, API, or migrate from Kommo automatically.</p></div>
            <div className="step"><div className="step-num">04</div><h4>Activate automations</h4><p>Pick a ready template or build yours in the visual editor.</p></div>
          </div>
        </section>

        {/* INTEGRATIONS */}
        <section className="section-sm" aria-label="Integrations">
          <div className="section-header">
            <div className="label-tag">Integrations</div>
            <h2>Works with your existing stack</h2>
          </div>
          <div className="integ-grid">
            {["WhatsApp Business","Evolution API","Instagram DM","Gmail","Facebook Messenger","Zapier","Make","Google Calendar","Google Sheets","Stripe","MercadoPago","Hotmart","Kommo","RD Station","HubSpot","SendGrid","AWS SES","Supabase"].map(name => (
              <div key={name} className="integ-badge">{name}</div>
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* COMPARE */}
        <section className="section" aria-label="Comparison">
          <div className="section-header">
            <div className="label-tag">Comparison</div>
            <h2>Why uPixel over the alternatives?</h2>
          </div>
          <div className="compare-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th style={{ width: "36%" }}>Feature</th>
                  <th className="upixel">uPixel</th>
                  <th>Kommo</th>
                  <th>Zendesk</th>
                  <th>DIY stack</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="feat-name">Native, stable WhatsApp</td><td className="yes">✓</td><td className="partial">Partial</td><td className="no">—</td><td className="no">—</td></tr>
                <tr><td className="feat-name">Mass messaging with anti-ban</td><td className="yes">✓</td><td className="no">—</td><td className="no">—</td><td className="partial">Complex</td></tr>
                <tr><td className="feat-name">No-code automations</td><td className="yes">✓</td><td className="partial">Limited</td><td className="partial">Limited</td><td className="no">—</td></tr>
                <tr><td className="feat-name">Contextual RAG-based AI</td><td className="yes">✓</td><td className="no">—</td><td className="partial">Basic</td><td className="no">—</td></tr>
                <tr><td className="feat-name">Unified multi-channel (6)</td><td className="yes">✓</td><td className="partial">Some</td><td className="yes">✓</td><td className="no">—</td></tr>
                <tr><td className="feat-name">SMB-friendly pricing</td><td className="yes">✓</td><td className="no">$$$</td><td className="no">$$$</td><td className="partial">Hidden costs</td></tr>
                <tr><td className="feat-name">GDPR/LGPD compliant</td><td className="yes">✓</td><td className="partial">Partial</td><td className="partial">Partial</td><td className="no">—</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="divider" />

        {/* PRICING */}
        <section className="section" id="pricing" aria-label="Pricing">
          <div className="section-header">
            <div className="label-tag">Pricing</div>
            <h2>Simple. No surprises.</h2>
            <p>Scale as you grow. Cancel anytime.</p>
          </div>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Starter</div>
              <div className="plan-price">$49 <span>/mo</span></div>
              <div className="plan-desc">For small teams getting started</div>
              <ul>
                <li>Unified inbox (up to 2 channels)</li>
                <li>1 WhatsApp instance</li>
                <li>100 automations / month</li>
                <li>Full CRM + Pipeline</li>
                <li>Basic reports</li>
                <li className="off">Mass messaging</li>
                <li className="off">AI / Alexandria</li>
                <li className="off">Public API</li>
              </ul>
              <a href="https://upixel.app" className="btn-plan default">Start with Starter</a>
            </div>
            <div className="plan featured">
              <div className="plan-popular-badge">Most popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">$149 <span>/mo</span></div>
              <div className="plan-desc">For active sales teams</div>
              <ul>
                <li>All channels, unlimited</li>
                <li>Multiple WhatsApp instances</li>
                <li>Unlimited mass messaging</li>
                <li>10,000 automations / month</li>
                <li>AI + Alexandria (RAG)</li>
                <li>Public REST API</li>
                <li>Advanced reports + export</li>
                <li>Priority support</li>
              </ul>
              <a href="https://upixel.app" className="btn-plan primary">Activate Pro →</a>
            </div>
            <div className="plan">
              <div className="plan-name">Enterprise</div>
              <div className="plan-price" style={{ fontSize: "1.8rem" }}>Custom</div>
              <div className="plan-desc">For large operations, agencies, white-label</div>
              <ul>
                <li>Everything in Pro</li>
                <li>Full white-label</li>
                <li>Guaranteed SLA</li>
                <li>Dedicated support</li>
                <li>Advanced multi-tenant</li>
                <li>Custom development</li>
                <li>Personalized onboarding</li>
                <li>Assisted migration</li>
              </ul>
              <a href="https://upixel.app" className="btn-plan dark">Talk to sales</a>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* FAQ */}
        <section className="section" id="faq" aria-label="FAQ">
          <div className="section-header">
            <div className="label-tag">FAQ</div>
            <h2>Frequently asked questions</h2>
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
            <div className="label-tag" style={{ color: "var(--z-sand)" }}>Start today</div>
            <h2>Your sales operation deserves<br />tools that actually work</h2>
            <p>14-day free trial. No credit card. Setup in minutes.</p>
            <div className="cta-row">
              <a href="https://upixel.app" className="btn-orange" style={{ fontSize: "16px", padding: "16px 32px" }}>Create my free account →</a>
              <a href="https://upixel.app" className="btn-ghost" style={{ borderColor: "rgba(197,192,177,.3)", color: "var(--z-sand)" }}>Book a demo</a>
            </div>
            <div className="cta-guarantee">✓ No commitment &nbsp;&nbsp; ✓ Cancel anytime &nbsp;&nbsp; ✓ GDPR &amp; LGPD compliant</div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <p>© {new Date().getFullYear()} uPixel CRM — Sales technology for teams that take results seriously.</p>
          <small>Built with Supabase · TypeScript · React · Edge Functions</small>
        </div>
      </footer>
    </div>
  );
}
