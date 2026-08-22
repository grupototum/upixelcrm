import { useState, useEffect, useRef } from "react";
import upixelDark from "@/assets/upixel_dark.png";

declare global { interface Window { sendPrompt?: (msg: string) => void } }
const sp = (msg: string) => {
  if (typeof window !== "undefined" && typeof window.sendPrompt === "function") {
    window.sendPrompt(msg);
    return;
  }
  // Fallback: leva o visitante pro cadastro quando o widget de chat não está disponível.
  window.location.href = "/cadastro";
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
:root{
  --u-dark:#131210;--u-surface:#1a1915;--u-card:#1c1b18;--u-border:#393731;
  --u-accent:#ff9500;--u-accent2:#19a34a;--u-accent3:#ff7c40;
  --u-text:#fffefb;--u-muted:#938e84;--u-subtle:#5c5850;
}
.lp{background:var(--u-dark);color:var(--u-text);font-family:'Inter',sans-serif;font-size:16px;line-height:1.65;overflow-x:hidden}
h1,h2,h3,h4{font-family:'Inter',sans-serif;line-height:1.15}
.tag{display:inline-flex;align-items:center;gap:6px;background:rgba(255,79,0,.12);border:1px solid rgba(255,79,0,.3);color:var(--u-accent);font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:1.5rem}
.badge-green{background:rgba(25,163,74,.1);border-color:rgba(25,163,74,.3);color:var(--u-accent2)}
.badge-orange{background:rgba(255,124,64,.08);border-color:rgba(255,124,64,.3);color:var(--u-accent3)}
.nav{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;max-width:1100px;margin:0 auto}
.nav-logo{display:flex;align-items:center}
.nav-links{display:flex;gap:28px}
.nav-links a{font-size:.87rem;color:var(--u-muted);text-decoration:none;transition:color .2s}
.nav-links a:hover{color:var(--u-text)}
.hero{padding:100px 0 60px;text-align:center;position:relative;overflow:hidden}
.hero-network-bg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:900px;height:600px;opacity:.12;pointer-events:none}
.hero::before{content:'';position:absolute;top:-80px;left:50%;transform:translateX(-50%);width:700px;height:500px;background:radial-gradient(ellipse at center,rgba(255,79,0,.2) 0%,transparent 70%);pointer-events:none}
.hero-inner{position:relative;z-index:1;max-width:1060px;margin:0 auto;padding:0 24px}
.hero h1{font-size:clamp(2.6rem,5vw,4.4rem);font-weight:800;letter-spacing:-.03em;max-width:800px;margin:0 auto 1.5rem}
.hero h1 .grad{background:linear-gradient(135deg,#ff9500,#ff8c40);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.15rem;color:var(--u-muted);max-width:600px;margin:0 auto 2.5rem;font-weight:300}
.cta-row{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
.btn-primary{background:var(--u-accent);color:#fff;border:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;transition:opacity .2s,transform .15s;font-family:'Inter',sans-serif}
.btn-primary:hover{opacity:.88;transform:translateY(-1px)}
.btn-ghost{background:transparent;color:var(--u-text);border:1px solid var(--u-border);padding:14px 28px;border-radius:10px;font-size:15px;font-weight:400;cursor:pointer;transition:border-color .2s,background .2s;font-family:'Inter',sans-serif}
.btn-ghost:hover{border-color:var(--u-accent);background:rgba(255,79,0,.06)}
.social-proof{margin-top:1.5rem;display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap}
.sp-item{display:flex;align-items:center;gap:8px;color:var(--u-muted);font-size:13px}
.sp-dot{width:6px;height:6px;border-radius:50%;background:var(--u-accent2)}
.dock-wrap{margin:2.5rem auto 0;display:flex;flex-direction:column;align-items:center;gap:12px}
.dock-label{font-size:.78rem;color:var(--u-subtle);letter-spacing:.06em;text-transform:uppercase}
.dock-bar{display:flex;gap:10px;justify-content:center;padding:14px 22px;background:rgba(22,22,31,.85);backdrop-filter:blur(14px);border-radius:22px;border:1px solid var(--u-border)}
.dock-item{position:relative;cursor:default;transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
.dock-item:hover{transform:scale(1.25) translateY(-8px)}
.dock-item:hover .dock-tip{opacity:1;transform:translateX(-50%) translateY(0)}
.dock-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.di-wpp{background:linear-gradient(135deg,#25D366,#128C7E)}
.di-ig{background:linear-gradient(135deg,#E4405F,#833AB4)}
.di-fb{background:linear-gradient(135deg,#1877F2,#0056B3)}
.di-gm{background:linear-gradient(135deg,#EA4335,#FBBC05)}
.di-chat{background:linear-gradient(135deg,#FF6B4A,#cc4a2a)}
.di-msn{background:linear-gradient(135deg,#00B2FF,#006AFF)}
.dock-tip{position:absolute;top:-34px;left:50%;transform:translateX(-50%) translateY(4px);background:var(--u-card);border:1px solid var(--u-border);padding:3px 10px;border-radius:6px;font-size:10px;white-space:nowrap;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}
.section{padding:80px 24px;max-width:1060px;margin:0 auto}
.section-sm{padding:60px 24px;max-width:1060px;margin:0 auto}
.section-header{text-align:center;margin-bottom:3.5rem}
.section-header h2{font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:700;letter-spacing:-.025em;margin-bottom:.75rem}
.section-header p{color:var(--u-muted);font-size:1rem;max-width:520px;margin:0 auto;font-weight:300}
.divider{border:none;border-top:1px solid var(--u-border);margin:0 24px}
.stats-bar{background:var(--u-card);border:1px solid var(--u-border);border-radius:16px;padding:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:32px;text-align:center}
.stat-n{font-family:'Inter',sans-serif;font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,#ff9500,#ff8c40);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:6px}
.stat-l{font-size:.85rem;color:var(--u-muted)}
.pain-narrative{background:var(--u-card);border:1px solid rgba(255,107,74,.25);border-radius:20px;padding:40px 48px;position:relative;overflow:hidden;margin-bottom:2rem}
.pain-narrative::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,107,74,.12) 1px,transparent 1px);background-size:22px 22px;opacity:.35}
.pain-narrative-inner{position:relative}
.pain-narrative h3{font-size:clamp(1.4rem,3vw,2.2rem);font-weight:700;margin-bottom:1rem;letter-spacing:-.02em}
.pain-narrative h3 span{background:linear-gradient(135deg,var(--u-accent3),#ff9a4a);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.pain-narrative p{color:var(--u-muted);font-size:1.05rem;max-width:560px;font-weight:300;line-height:1.75}
.pain-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:1.5rem}
.pain-card{background:var(--u-card);border:1px solid var(--u-border);border-radius:14px;padding:22px;position:relative;overflow:hidden}
.pain-card::before{content:'✗';position:absolute;top:14px;right:14px;color:rgba(255,107,74,.3);font-size:20px;font-weight:700}
.pain-card h4{font-size:.93rem;font-weight:600;margin-bottom:.45rem;font-family:'Inter',sans-serif}
.pain-card p{font-size:.86rem;color:var(--u-muted);line-height:1.6}
.ss-placeholder{aspect-ratio:16/10;background:linear-gradient(135deg,rgba(255,79,0,.06),rgba(255,140,64,.04));border:2px dashed var(--u-border);border-radius:12px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-bottom:1.25rem}
.ss-placeholder::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,var(--u-border) 1px,transparent 1px);background-size:18px 18px;opacity:.3}
.ss-ph-inner{position:relative;text-align:center;color:var(--u-subtle)}
.ss-ph-inner svg{width:36px;height:36px;opacity:.5;margin:0 auto 8px;display:block}
.ss-ph-inner span{display:block;font-size:.78rem;font-weight:500;color:var(--u-muted)}
.ss-ph-inner small{display:block;font-size:.68rem;opacity:.6;margin-top:3px}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.feat-card{background:var(--u-card);border:1px solid var(--u-border);border-radius:16px;overflow:hidden;transition:border-color .25s,transform .25s,box-shadow .25s}
.feat-card:hover{border-color:rgba(255,79,0,.4);transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.feat-card-body{padding:22px 22px 24px}
.feat-card h3{font-size:1.05rem;font-weight:600;margin-bottom:.45rem}
.feat-card p{font-size:.87rem;color:var(--u-muted);line-height:1.65;margin-bottom:.85rem}
.feat-card ul{padding-left:0;list-style:none}
.feat-card ul li{font-size:.83rem;color:var(--u-muted);padding:3px 0 3px 1.2rem;position:relative}
.feat-card ul li::before{content:'→';position:absolute;left:0;color:var(--u-accent);font-size:.78rem}
.use-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.use-card{background:var(--u-card);border:1px solid var(--u-border);border-radius:16px;padding:28px;border-left:4px solid var(--u-accent);transition:box-shadow .25s}
.use-card.team{border-left-color:var(--u-accent2)}
.use-card.mgr{border-left-color:var(--u-accent3)}
.use-card:hover{box-shadow:0 0 0 1px rgba(255,79,0,.2),0 8px 30px rgba(0,0,0,.3)}
.use-card.team:hover{box-shadow:0 0 0 1px rgba(25,163,74,.2),0 8px 30px rgba(0,0,0,.3)}
.use-card.mgr:hover{box-shadow:0 0 0 1px rgba(255,107,74,.2),0 8px 30px rgba(0,0,0,.3)}
.use-icon{font-size:28px;margin-bottom:1rem;display:block}
.use-role{font-size:.78rem;color:var(--u-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:1rem}
.use-card ul{list-style:none;padding:0;margin-bottom:1.25rem}
.use-card ul li{font-size:.875rem;padding:6px 0 6px 1.5rem;position:relative;border-bottom:1px solid rgba(255,255,255,.04)}
.use-card ul li::before{content:'✓';position:absolute;left:0;font-weight:700;font-size:.8rem}
.use-card.sales ul li::before{color:var(--u-accent)}
.use-card.team ul li::before{color:var(--u-accent2)}
.use-card.mgr ul li::before{color:var(--u-accent3)}
.quote-block{position:relative;padding:22px 20px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);overflow:hidden;margin-top:1.25rem}
.quote-block::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,var(--u-border) 1px,transparent 1px);background-size:16px 16px;opacity:.25}
.quote-text{position:relative;font-size:.9rem;font-weight:300;line-height:1.6;color:var(--u-muted);font-style:italic}
.quote-text .qh{font-weight:700;font-style:normal;background:linear-gradient(135deg,var(--u-accent),var(--u-accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.wa-card{background:var(--u-card);border:1px solid var(--u-border);border-radius:16px;padding:20px}
.wa-header{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--u-border)}
.wa-avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--u-accent),var(--u-accent3));display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-weight:700;font-size:1rem;color:#fff;flex-shrink:0}
.wa-name{font-size:.88rem;font-weight:600}
.wa-info{font-size:.76rem;color:var(--u-muted)}
.wa-msgs{display:flex;flex-direction:column;gap:8px}
.wa-bubble{max-width:82%;padding:9px 13px;border-radius:12px;font-size:.83rem;line-height:1.55}
.wa-bubble.recv{background:#1E1E2A;border:1px solid var(--u-border);border-radius:4px 12px 12px 12px;align-self:flex-start}
.wa-bubble.sent{background:rgba(37,211,102,.12);border:1px solid rgba(37,211,102,.2);border-radius:12px 4px 12px 12px;align-self:flex-end}
.wa-time{font-size:.65rem;color:var(--u-subtle);display:block;text-align:right;margin-top:4px}
.wa-bubble.sent .wa-time{color:rgba(37,211,102,.6)}
.demo-banner{position:relative;background:linear-gradient(135deg,rgba(255,79,0,.13),rgba(255,140,64,.08));border:1px solid rgba(255,79,0,.35);border-radius:22px;padding:56px 48px;text-align:center;overflow:hidden}
.demo-banner::before{content:'';position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse at center,rgba(255,79,0,.18) 0%,transparent 70%);pointer-events:none}
.float-icons{position:absolute;inset:0;pointer-events:none}
.float-icon{position:absolute;font-size:26px;opacity:.22;animation:floatY 6s ease-in-out infinite}
.float-icon:nth-child(1){top:18%;left:8%;animation-delay:0s}
.float-icon:nth-child(2){top:25%;right:12%;animation-delay:1.5s}
.float-icon:nth-child(3){bottom:22%;left:18%;animation-delay:3s}
.float-icon:nth-child(4){bottom:18%;right:8%;animation-delay:4.5s}
.float-icon:nth-child(5){top:50%;left:5%;animation-delay:2s}
.float-icon:nth-child(6){top:45%;right:5%;animation-delay:3.5s}
@keyframes floatY{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(8deg)}}
.demo-banner-inner{position:relative}
.demo-banner h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:800;letter-spacing:-.025em;margin-bottom:.75rem}
.demo-banner p{color:var(--u-muted);max-width:500px;margin:0 auto 2rem;font-size:1rem;font-weight:300;line-height:1.7}
.btn-pulse{animation:pulseGlow 2.2s infinite}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,79,0,.45)}50%{box-shadow:0 0 28px 10px rgba(255,79,0,.18)}}
.demo-guarantees{display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:1.5rem;font-size:.82rem;color:var(--u-subtle)}
.demo-guarantees span::before{content:'✓ ';color:var(--u-accent2);font-weight:700}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0}
.step{text-align:center;padding:32px 20px;position:relative}
.step:not(:last-child)::after{content:'';position:absolute;top:42px;right:0;width:1px;height:60px;background:var(--u-border)}
.step-num{width:52px;height:52px;border-radius:50%;background:rgba(255,79,0,.1);border:1.5px solid rgba(255,79,0,.35);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-family:'Inter',sans-serif;font-size:1.1rem;font-weight:700;color:var(--u-accent)}
.step h4{font-size:.95rem;font-weight:600;margin-bottom:.4rem}
.step p{font-size:.84rem;color:var(--u-muted)}
.integ-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
.integ-badge{background:var(--u-card);border:1px solid var(--u-border);border-radius:10px;padding:14px 10px;text-align:center;font-size:.82rem;color:var(--u-muted);transition:border-color .2s,color .2s}
.integ-badge:hover{border-color:var(--u-accent);color:var(--u-text)}
.pricing-tabs{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--u-card);border:1px solid var(--u-border);border-radius:100px;padding:6px;width:fit-content;margin:0 auto 2.5rem}
.pricing-tab{padding:8px 20px;border-radius:100px;font-size:.84rem;font-weight:500;cursor:pointer;border:none;background:transparent;color:var(--u-muted);transition:all .2s;font-family:'Inter',sans-serif}
.pricing-tab.active{background:var(--u-accent);color:#fff}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;align-items:start}
.plan{background:var(--u-card);border:1px solid var(--u-border);border-radius:18px;padding:32px 28px}
.plan.featured{border-color:rgba(255,79,0,.6);background:rgba(255,79,0,.06);position:relative}
.plan-popular{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--u-accent);color:#fff;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:5px 16px;border-radius:100px;white-space:nowrap}
.plan-name{font-size:.85rem;font-weight:500;color:var(--u-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
.plan-price{font-family:'Inter',sans-serif;font-size:2.6rem;font-weight:800;letter-spacing:-.04em;margin-bottom:.25rem}
.plan-price span{font-size:.95rem;font-weight:400;color:var(--u-muted)}
.plan-meta{font-size:.8rem;color:var(--u-subtle);margin-bottom:.75rem}
.plan-meta strong{color:var(--u-muted)}
.plan-desc{font-size:.87rem;color:var(--u-muted);margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--u-border)}
.plan ul{list-style:none;margin-bottom:2rem}
.plan ul li{font-size:.875rem;padding:7px 0 7px 1.6rem;position:relative;border-bottom:1px solid rgba(255,255,255,.04)}
.plan ul li::before{content:'✓';position:absolute;left:0;color:var(--u-accent2);font-size:.85rem;font-weight:600}
.plan ul li.muted{color:var(--u-subtle)}
.plan ul li.muted::before{content:'—';color:var(--u-subtle)}
.btn-plan{width:100%;padding:13px;border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;border:none}
.btn-plan.default{background:var(--u-border);color:var(--u-text)}
.btn-plan.default:hover{background:#4a4640}
.btn-plan.accent{background:var(--u-accent);color:#fff}
.btn-plan.accent:hover{opacity:.88;transform:translateY(-1px)}
.pricing-note{text-align:center;margin-top:1.5rem;font-size:.84rem;color:var(--u-subtle)}
.pricing-note a{color:var(--u-accent);text-decoration:none;cursor:pointer}
.compare-table{width:100%;border-collapse:collapse;font-size:.9rem}
.compare-table th{padding:14px 16px;text-align:left;font-family:'Inter',sans-serif;font-size:.85rem;font-weight:600;color:var(--u-muted);border-bottom:1px solid var(--u-border);letter-spacing:.04em;text-transform:uppercase}
.compare-table th:not(:first-child){text-align:center}
.compare-table td{padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.04);color:var(--u-muted);font-size:.875rem}
.compare-table td.feat-name{color:var(--u-text);font-weight:400}
.compare-table td:not(:first-child){text-align:center}
.compare-table td.yes{color:var(--u-accent2);font-weight:600}
.compare-table td.no{color:var(--u-subtle)}
.compare-table td.partial{color:var(--u-accent3)}
.compare-table tr:last-child td{border-bottom:none}
.compare-wrap{background:var(--u-card);border:1px solid var(--u-border);border-radius:16px;overflow:hidden}
.compare-table th.upixel{color:var(--u-accent)}
.faq-list{display:flex;flex-direction:column;gap:12px}
.faq-item{background:var(--u-card);border:1px solid var(--u-border);border-radius:12px;padding:20px 24px;cursor:pointer}
.faq-q{font-size:.95rem;font-weight:500;display:flex;justify-content:space-between;align-items:center;gap:16px}
.faq-a{font-size:.875rem;color:var(--u-muted);margin-top:12px;line-height:1.7;display:none}
.faq-item.open .faq-a{display:block}
.faq-item.open .faq-toggle{transform:rotate(45deg)}
.faq-toggle{color:var(--u-accent);font-size:1.4rem;line-height:1;flex-shrink:0;transition:transform .2s}
.footer{border-top:1px solid var(--u-border);padding:40px 24px;text-align:center;color:var(--u-subtle);font-size:.84rem;max-width:1060px;margin:0 auto}
.fab-demo{position:fixed;bottom:24px;right:24px;z-index:1000;opacity:0;transform:translateY(20px);transition:opacity .4s,transform .4s;pointer-events:none}
.fab-demo.visible{opacity:1;transform:translateY(0);pointer-events:auto}
.fab-btn{display:flex;align-items:center;gap:8px;padding:14px 22px;background:linear-gradient(135deg,var(--u-accent),#ff7c40);color:#fff;border:none;border-radius:50px;font-weight:600;font-size:.9rem;cursor:pointer;box-shadow:0 4px 20px rgba(255,79,0,.45);transition:transform .2s,box-shadow .2s;font-family:'Inter',sans-serif}
.fab-btn:hover{transform:scale(1.05);box-shadow:0 6px 30px rgba(255,79,0,.55)}
.conn-line{stroke:url(#netGrad);stroke-width:1.5;fill:none;stroke-dasharray:8 6;animation:dataFlow 2.5s linear infinite}
.conn-line:nth-child(2){animation-duration:3s;animation-delay:-.5s}
.conn-line:nth-child(3){animation-duration:2.8s;animation-delay:-1s}
.conn-line:nth-child(4){animation-duration:3.2s;animation-delay:-.8s}
.conn-line:nth-child(5){animation-duration:2.6s;animation-delay:-1.5s}
.conn-line:nth-child(6){animation-duration:3.4s;animation-delay:-2s}
@keyframes dataFlow{to{stroke-dashoffset:-42}}
.net-node{fill:var(--u-accent);animation:nodePulse 3s ease-in-out infinite}
.net-node:nth-child(2){animation-delay:.5s;fill:#25D366}
.net-node:nth-child(3){animation-delay:1s;fill:#E4405F}
.net-node:nth-child(4){animation-delay:1.5s;fill:#1877F2}
.net-node:nth-child(5){animation-delay:2s;fill:#FF6B4A}
.net-node:nth-child(6){animation-delay:2.5s;fill:#19a34a}
@keyframes nodePulse{0%,100%{opacity:.7}50%{opacity:1}}
.net-center{fill:url(#centerGrad);filter:drop-shadow(0 0 12px rgba(79,110,255,.5))}
.fade-up{opacity:0;transform:translateY(40px);transition:opacity .8s ease,transform .8s ease}
.fade-up.visible{opacity:1;transform:translateY(0)}
@media(max-width:768px){
  .nav-links{display:none}
  .hero{padding:70px 20px 50px}
  .hero h1{font-size:clamp(2rem,7vw,3rem)}
  .dock-bar{gap:6px;padding:12px 16px}
  .dock-icon{width:40px;height:40px;font-size:18px;border-radius:11px}
  .pain-narrative{padding:28px 24px}
  .demo-banner{padding:40px 24px}
  .step:not(:last-child)::after{display:none}
  .stats-bar{padding:28px 20px;gap:24px}
  .fab-btn .fab-text{display:none}
  .fab-btn{padding:14px}
  .pricing-tabs{flex-wrap:wrap}
}
@media(prefers-reduced-motion:reduce){
  .conn-line,.net-node,.float-icon,.btn-pulse,.fade-up{animation:none!important;transition:none!important;opacity:1!important;transform:none!important}
}
`;

const PRICES: Record<string, Record<string, number>> = {
  starter:  { mensal: 149, trimestral: 134, semestral: 127, anual: 119 },
  pro:      { mensal: 297, trimestral: 267, semestral: 252, anual: 238 },
  business: { mensal: 397, trimestral: 357, semestral: 337, anual: 318 },
};

type Period = "mensal" | "trimestral" | "semestral" | "anual";

const Placeholder = ({ label }: { label: string }) => (
  <div className="ss-placeholder">
    <div className="ss-ph-inner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
      </svg>
      <span>{label}</span>
    </div>
  </div>
);

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("mensal");
  const [fabVisible, setFabVisible] = useState(false);
  const lpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      setFabVisible(pct > 30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".fade-up");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fmt = (plan: string) => `R$ ${PRICES[plan][period]}`;
  const suffix = period === "mensal" ? "/mês" : "/mês*";
  const periodLabel: Record<Period, string> = { mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };
  const periodDiscount: Record<Period, string> = { mensal: "", trimestral: "−10%", semestral: "−15%", anual: "−20%" };
  const periodCobranca: Record<Period, string> = { mensal: "", trimestral: "trimestralmente", semestral: "semestralmente", anual: "anualmente" };

  return (
    <div ref={lpRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lp">

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(19,18,16,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #393731" }}>
          <div className="nav">
            <div className="nav-logo"><img src={upixelDark} alt="uPixel" style={{ height: "32px" }} /></div>
            <div className="nav-links">
              <a href="#funcionalidades">Funcionalidades</a>
              <a href="#para-quem">Para quem</a>
              <a href="#planos">Planos</a>
              <a href="#faq">FAQ</a>
            </div>
            <button className="btn-primary" style={{ padding: "10px 22px", fontSize: "13px" }} onClick={() => sp("Quero começar meu teste grátis de 14 dias no uPixel CRM")}>Teste grátis →</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <svg className="hero-network-bg" viewBox="0 0 900 600" aria-hidden="true">
            <defs>
              <linearGradient id="netGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: "#ff9500", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#ff8c40", stopOpacity: 1 }} />
              </linearGradient>
              <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: "#ff9500", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#ff8c40", stopOpacity: 1 }} />
              </radialGradient>
            </defs>
            <path className="conn-line" d="M450,300 L160,120" />
            <path className="conn-line" d="M450,300 L740,120" />
            <path className="conn-line" d="M450,300 L100,300" />
            <path className="conn-line" d="M450,300 L800,300" />
            <path className="conn-line" d="M450,300 L200,460" />
            <path className="conn-line" d="M450,300 L700,460" />
            <circle className="net-node" cx="160" cy="120" r="10" />
            <circle className="net-node" cx="740" cy="120" r="10" />
            <circle className="net-node" cx="100" cy="300" r="10" />
            <circle className="net-node" cx="800" cy="300" r="10" />
            <circle className="net-node" cx="200" cy="460" r="10" />
            <circle className="net-node" cx="700" cy="460" r="10" />
            <circle className="net-center" cx="450" cy="300" r="36" />
            <text x="450" y="307" textAnchor="middle" fill="white" fontSize="22" fontFamily="sans-serif">💬</text>
          </svg>
          <div className="hero-inner">
            <div className="tag"><span>🚀</span> Plataforma de vendas #1</div>
            <h1>Nunca mais perca cliente por <span className="grad">falta de resposta.</span></h1>
            <p>O uPixel responde na hora, manda follow-up automático e lembra de cada lead no WhatsApp, Instagram e onde mais seu cliente estiver!</p>
            <div className="cta-row">
              <button className="btn-primary btn-pulse" style={{ fontSize: "16px", padding: "16px 34px" }} onClick={() => sp("Quero começar meu teste grátis de 14 dias no uPixel CRM agora")}>🔥 Teste grátis!</button>
              <button className="btn-ghost" onClick={() => sp("Quero ver uma demonstração do uPixel CRM")}>Ver demonstração →</button>
            </div>
            <div className="social-proof">
              <div className="sp-item"><div className="sp-dot" />Sem cartão de crédito</div>
              <div className="sp-item"><div className="sp-dot" />Cancela quando quiser</div>
              <div className="sp-item"><div className="sp-dot" />Setup em 5 minutos</div>
            </div>
            <div className="dock-wrap">
              <span className="dock-label">6 canais num único inbox</span>
              <div className="dock-bar">
                {[{cls:"di-wpp",icon:"📱",label:"WhatsApp"},{cls:"di-ig",icon:"📸",label:"Instagram"},{cls:"di-fb",icon:"👍",label:"Facebook"},{cls:"di-gm",icon:"✉️",label:"Gmail"},{cls:"di-chat",icon:"💬",label:"Webchat"},{cls:"di-msn",icon:"🗨️",label:"Messenger"}].map((d) => (
                  <div key={d.label} className="dock-item">
                    <div className={`dock-icon ${d.cls}`}>{d.icon}</div>
                    <div className="dock-tip">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px 80px" }}>
          <div className="stats-bar fade-up">
            {[["50+","tipos de ação em automações"],["6","canais num único inbox"],["5x","mais leads convertidos"],["0","código necessário"]].map(([n,l]) => (
              <div key={l}><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
        </div>

        <hr className="divider" />

        {/* DOR */}
        <div className="section fade-up" id="dor">
          <div className="section-header">
            <div className="tag badge-orange">O problema</div>
            <h2>Quantos clientes você perdeu essa semana sem saber?</h2>
          </div>
          <div className="pain-narrative">
            <div className="pain-narrative-inner">
              <h3>O cliente mandou mensagem. Você demorou <span>3 horas</span> pra responder.</h3>
              <p>Ele já tinha fechado com o concorrente. Isso acontece todo dia e você nem fica sabendo.</p>
            </div>
          </div>
          <Placeholder label="Screenshot: Inbox vazio / Notificação perdida" />
          <div className="pain-grid">
            {[["Resposta lenta mata a venda","Leads que esperam mais de 5 minutos têm 80% menos chance de fechar. Seu time está sempre no timing errado."],["Follow-up depende da memória","A maioria das vendas acontece no 5º contato. Mas ninguém lembra do lead que sumiu há 3 dias."],["Mensagens espalhadas em todo lugar","WhatsApp no celular, Instagram no computador, Gmail na outra aba. Você perde o fio da conversa todo dia."],["Sem visibilidade do que está acontecendo","Você não sabe quantos leads estão parados, qual vendedor está respondendo e o que está funcionando."]].map(([h,p]) => (
              <div key={h} className="pain-card"><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
        </div>

        <hr className="divider" />

        {/* FUNCIONALIDADES */}
        <div className="section fade-up" id="funcionalidades">
          <div className="section-header">
            <div className="tag">A solução</div>
            <h2>O que o uPixel faz por você</h2>
            <p>Cada funcionalidade resolve uma dor real. Nada de feature inútil.</p>
          </div>
          <div className="feat-grid">
            {[
              {title:"Todas as mensagens em um só lugar",desc:"WhatsApp, Instagram, Facebook, Gmail e mais, tudo em uma única tela. Nenhuma mensagem some. Nenhum cliente fica sem resposta.",bullets:["Zero perda de mensagem","Inbox unificado de todos os canais","Responde de qualquer canal em segundos","Notificações inteligentes por prioridade"],ph:"Inbox com múltiplos canais"},
              {title:"Resposta automática",desc:"O sistema responde na hora, de madrugada, no domingo, no seu dia de folga. Você configura o que ele fala uma vez.",bullets:["24/7 sem pausa","Respostas personalizadas por canal","Fora de horário coberto automaticamente","Nenhum lead esfriando enquanto você descansa"],ph:"Resposta automática fora de horário"},
              {title:"Follow-up que nunca esquece",desc:"A maioria das vendas acontece no 5º contato. Lead sumiu? O sistema manda mensagem no dia seguinte. E no dia depois. No ritmo que você definir.",bullets:["Sequência automática configurável","Nenhum lead esquecido jamais","Ritmo e canal definidos por você","Mais conversões com menos esforço"],ph:"Fluxos de follow-up automático"},
              {title:"Disparo pra toda sua base com um clique",desc:"Promoção, lançamento, novidade. Você escreve a mensagem, escolhe quem recebe e dispara.",bullets:["Segmentação por lista, tag ou comportamento","Anti-bloqueio com throttling inteligente","Agendamento de campanhas","Relatório de entrega em tempo real"],ph:"Função de disparo em massa"},
              {title:"IA que conhece seu negócio",desc:"Você ensina o sistema sobre seus produtos, preços e perguntas frequentes. Ele responde por você com as suas informações, do seu jeito.",bullets:["Respostas no seu tom e linguagem","Aprende todo o seu catálogo","FAQ automático 24/7","Se atualiza conforme seu negócio cresce"],ph:"IA respondendo com base de conhecimento"},
              {title:"Você sabe exatamente onde está cada cliente",desc:"Funil visual, histórico completo, próximo passo definido. Em 30 segundos você enxerga toda sua operação.",bullets:["Funil visual drag-and-drop","Histórico completo de cada contato","Próximos passos definidos automaticamente","Visão 360° de toda a operação"],ph:"Funil visual / Pipeline de leads"},
              {title:"Relatórios que mostram onde está o dinheiro",desc:"Qual canal traz mais cliente? Qual mensagem converte mais? Onde os leads somem? O uPixel te mostra tudo!",bullets:["Canal que mais converte por período","Mensagem vencedora identificada","Onde os leads somem no funil","ROI calculado por campanha"],ph:"Dashboard de relatórios e analytics"},
            ].map((f) => (
              <div key={f.title} className="feat-card">
                <Placeholder label={f.ph} />
                <div className="feat-card-body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <ul>{f.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="divider" />

        {/* DEMO */}
        <div className="section fade-up">
          <div className="demo-banner">
            <div className="float-icons">{["📅","⚡","📈","💬","🔔","🎯"].map((ic) => <span key={ic} className="float-icon">{ic}</span>)}</div>
            <div className="demo-banner-inner">
              <div className="tag" style={{ margin: "0 auto 1.25rem", display: "inline-flex" }}>📅 Apresentação gratuita</div>
              <h2>Quer ver o uPixel funcionando na prática?</h2>
              <p>Agende uma apresentação gratuita de 15 minutos com um especialista. Vamos mostrar EXATAMENTE como o uPixel resolve o problema da sua operação.</p>
              <button className="btn-primary btn-pulse" style={{ fontSize: "16px", padding: "16px 36px" }} onClick={() => sp("Quero agendar uma apresentação gratuita do uPixel CRM com um especialista")}>📅 Agendar apresentação gratuita</button>
              <div className="demo-guarantees"><span>Sem compromisso</span><span>Personalizado para seu negócio</span><span>Ao vivo com especialista</span></div>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* USE CASES */}
        <div className="section fade-up" id="para-quem">
          <div className="section-header">
            <div className="tag">Para quem é</div>
            <h2>Como o uPixel pode ajudar?</h2>
            <p>Para cada papel, uma solução diferente. Todos no mesmo sistema.</p>
          </div>
          <div className="use-grid">
            <div className="use-card sales">
              <span className="use-icon">🎯</span>
              <div className="use-role">uPixel para vendas</div>
              <ul><li>Responde o lead na hora que ele chega</li><li>Follow-up automático sem depender de memória</li><li>Lembra de cada cliente no momento certo</li><li>Você só entra na conversa pra fechar</li></ul>
              <div className="quote-block"><p className="quote-text">"O vendedor que usa o uPixel atende <span className="qh">3x mais leads</span> ao mesmo tempo."</p></div>
            </div>
            <div className="use-card team">
              <span className="use-icon">👥</span>
              <div className="use-role">uPixel para equipes</div>
              <ul><li>Todas as mensagens num inbox compartilhado</li><li>Cada atendimento atribuído a uma pessoa</li><li>Histórico completo visível pra todo o time</li><li>Quando alguém sai, nada vai junto</li></ul>
              <div className="quote-block"><p className="quote-text">"Novo no time? Em <span className="qh">10 minutos</span> já sabe o histórico de cada cliente."</p></div>
            </div>
            <div className="use-card mgr">
              <span className="use-icon">📊</span>
              <div className="use-role">uPixel para gerentes</div>
              <ul><li>Funil visual atualizado ao vivo</li><li>Ranking de desempenho por vendedor</li><li>Alertas automáticos quando algo sai do padrão</li><li>Relatórios prontos sem montar planilha</li></ul>
              <div className="quote-block"><p className="quote-text">"Em <span className="qh">30 segundos</span> você sabe o que está funcionando e o que não está."</p></div>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* DEPOIMENTOS */}
        <div className="section fade-up">
          <div className="section-header">
            <div className="tag badge-green">Quem usa, recomenda</div>
            <h2>O que dizem quem já usa</h2>
          </div>
          <div className="testi-grid">
            <div className="wa-card">
              <div className="wa-header"><div className="wa-avatar">M</div><div><div className="wa-name">Marcos</div><div className="wa-info">Clínica · São Paulo, SP</div></div></div>
              <div className="wa-msgs">
                <div className="wa-bubble recv">Cara, que ferramenta boa essa. Faz 2 semanas que a gente configurou e já notei diferença. Paciente manda mensagem de noite e já recebe resposta na hora.<span className="wa-time">14:32 ✓✓</span></div>
                <div className="wa-bubble sent">Bom demaaais Marcos! E como tem sido pra equipe?<span className="wa-time">14:33 ✓✓</span></div>
                <div className="wa-bubble recv">A menina da recepção gostou, ficou bem mais organizado agora 👏👏<span className="wa-time">14:35 ✓✓</span></div>
              </div>
            </div>
            <div className="wa-card">
              <div className="wa-header"><div className="wa-avatar" style={{ background: "linear-gradient(135deg,#E4405F,#833AB4)" }}>C</div><div><div className="wa-name">Camila</div><div className="wa-info">Loja online · Curitiba, PR</div></div></div>
              <div className="wa-msgs">
                <div className="wa-bubble recv">Gente, esse mês eu fechei 34 vendas só de direct no Instagram. Antes eu não tinha tempo pra ver tudo, fico só pensando quantas vendas eu já perdi 🥲<span className="wa-time">10:18 ✓✓</span></div>
                <div className="wa-bubble sent">Isso é incrível! E você gerencia tudo pelo uPixel?<span className="wa-time">10:20 ✓✓</span></div>
                <div className="wa-bubble recv">Sim! Tudo num lugar só. Não perco mais nada 🔥<span className="wa-time">10:21 ✓✓</span></div>
              </div>
            </div>
            <div className="wa-card">
              <div className="wa-header"><div className="wa-avatar" style={{ background: "linear-gradient(135deg,#19a34a,#0f7a35)" }}>T</div><div><div className="wa-name">Thiago</div><div className="wa-info">Consultoria · Belo Horizonte, MG</div></div></div>
              <div className="wa-msgs">
                <div className="wa-bubble recv">Ontem fiz uma venda de R$3500 por causa do follow up. Cliente sumiu mas configurei pra mandar mensagem todos os dias. Consegui reunir com o cara e fechamos!!!<span className="wa-time">09:14 ✓✓</span></div>
                <div className="wa-bubble sent">Notícia boaa demais Thiago! Vamos pra cima!<span className="wa-time">09:15 ✓✓</span></div>
              </div>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* COMO FUNCIONA */}
        <div className="section fade-up">
          <div className="section-header">
            <div className="tag">Como funciona</div>
            <h2>Ativo em minutos, não em semanas</h2>
          </div>
          <div style={{ background: "var(--u-card)", border: "1px solid var(--u-border)", borderRadius: 16, overflow: "hidden" }}>
            <div className="steps">
              {[["01","Crie sua conta","Setup guiado. Sem instalar nada. 100% na nuvem."],["02","Conecte seus canais","WhatsApp via QR Code, Instagram, Gmail em poucos cliques."],["03","Importe seus leads","CSV, via API ou migre do Kommo automaticamente."],["04","Ative as automações","Templates prontos ou crie o seu no builder visual drag-and-drop."]].map(([n,h,p]) => (
                <div key={n} className="step"><div className="step-num">{n}</div><h4>{h}</h4><p>{p}</p></div>
              ))}
            </div>
          </div>
        </div>

        {/* INTEGRAÇÕES */}
        <div className="section-sm fade-up">
          <div className="section-header"><h2>Integra com o que você já usa</h2></div>
          <div className="integ-grid">
            {["WhatsApp Business","Evolution API","Instagram DM","Gmail","Facebook Messenger","Zapier","Make (Integromat)","Google Calendar","Google Sheets","Stripe","MercadoPago","Hotmart","Kommo","RD Station","HubSpot","SendGrid","AWS SES","Supabase"].map((i) => <div key={i} className="integ-badge">{i}</div>)}
          </div>
        </div>

        <hr className="divider" />

        {/* COMPARATIVO */}
        <div className="section fade-up">
          <div className="section-header">
            <div className="tag">Comparativo</div>
            <h2>Por que uPixel e não as outras opções?</h2>
          </div>
          <div className="compare-wrap">
            <table className="compare-table">
              <thead><tr><th style={{ width: "36%" }}>Recurso</th><th className="upixel">uPixel</th><th>Kommo</th><th>Zendesk</th><th>Solução caseira</th></tr></thead>
              <tbody>
                {[["WhatsApp nativo e estável","✓","Parcial","✗","✗","yes","partial","no","no"],["Resposta automática 24/7","✓","✗","Básico","✗","yes","no","partial","no"],["Follow-up automático","✓","Limitado","✗","✗","yes","partial","no","no"],["Disparos em massa anti-bloqueio","✓","✗","✗","Complexo","yes","no","no","partial"],["IA com RAG contextual","✓","✗","Básico","✗","yes","no","partial","no"],["Multi-canal unificado (6 canais)","✓","Alguns","✓","✗","yes","partial","yes","no"],["Preço acessível para PMEs","✓","$$$","$$$","Custo oculto","yes","no","no","partial"],["LGPD + suporte em PT-BR","✓","✗","✗","✗","yes","no","no","no"]].map(([feat,u,k,z,c,uc,kc,zc,cc]) => (
                  <tr key={feat as string}>
                    <td className="feat-name">{feat}</td>
                    <td className={uc as string}>{u}</td>
                    <td className={kc as string}>{k}</td>
                    <td className={zc as string}>{z}</td>
                    <td className={cc as string}>{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <hr className="divider" />

        {/* PLANOS */}
        <div className="section fade-up" id="planos">
          <div className="section-header">
            <div className="tag">Planos</div>
            <h2>Pronto para escalar suas vendas?<br />Escolha o plano certo para sua operação.</h2>
            <p>Comece com 14 dias grátis. Cancele quando quiser.</p>
          </div>
          <div className="pricing-tabs">
            {(["mensal","trimestral","semestral","anual"] as Period[]).map((p) => (
              <button key={p} className={`pricing-tab${period === p ? " active" : ""}`} onClick={() => setPeriod(p)}>
                {periodLabel[p]}{periodDiscount[p] && <small style={{ color: "var(--u-accent2)", fontSize: ".7em" }}> {periodDiscount[p]}</small>}
              </button>
            ))}
          </div>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Starter</div>
              <div className="plan-price">{fmt("starter")} <span>{suffix}</span></div>
              <div className="plan-meta"><strong>2 usuários</strong> · <strong>2.000 leads</strong></div>
              <div className="plan-desc">Para quem está começando ou tem operação pequena</div>
              <ul><li>Inbox unificado (WPP + IG + FB)</li><li>CRM básico + Pipeline</li><li>Respostas automáticas</li><li>Relatórios básicos</li><li className="muted">Disparos em massa</li><li className="muted">Automações avançadas</li><li className="muted">IA / Alexandria</li></ul>
              <button className="btn-plan default" onClick={() => sp("Quero assinar o plano Starter do uPixel CRM")}>Assinar o Starter →</button>
            </div>
            <div className="plan featured">
              <div className="plan-popular">Mais popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">{fmt("pro")} <span>{suffix}</span></div>
              <div className="plan-meta"><strong>6 usuários</strong> · <strong>10.000 leads</strong></div>
              <div className="plan-desc">Para operações comerciais ativas com time de vendas</div>
              <ul><li>Tudo do Starter</li><li>Disparos em massa ilimitados</li><li>Automações visuais completas</li><li>IA + Alexandria (RAG)</li><li>API REST pública</li><li>Relatórios avançados + export CSV</li><li>Suporte prioritário</li></ul>
              <button className="btn-plan accent btn-pulse" onClick={() => sp("Quero assinar o plano Pro do uPixel CRM")}>Assinar o Pro →</button>
            </div>
            <div className="plan">
              <div className="plan-name">Business</div>
              <div className="plan-price">{fmt("business")} <span>{suffix}</span></div>
              <div className="plan-meta"><strong>10+ usuários</strong> · <strong>50.000 leads</strong></div>
              <div className="plan-desc">Para operações grandes, agências e white-label</div>
              <ul><li>Tudo do Pro</li><li>Tudo ilimitado</li><li>White-label completo</li><li>SLA garantido</li><li>Suporte dedicado</li><li>Multi-tenant avançado</li><li>Onboarding personalizado</li></ul>
              <button className="btn-plan default" onClick={() => sp("Quero assinar o plano Business do uPixel CRM")}>Assinar o Business →</button>
            </div>
          </div>
          <div className="pricing-note">
            {period !== "mensal" && `* Cobrado ${periodCobranca[period]}. `}
            Ficou com alguma dúvida?{" "}<a onClick={() => sp("Tenho dúvidas sobre os planos do uPixel CRM. Pode me ajudar?")}>Falar com o assistente →</a>
          </div>
        </div>

        <hr className="divider" />

        {/* FAQ */}
        <div className="section fade-up" id="faq">
          <div className="section-header">
            <div className="tag">FAQ</div>
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="faq-list">
            {[["O uPixel funciona com WhatsApp pessoal ou precisa do WhatsApp Business?","O uPixel suporta ambos: Evolution API (conecta qualquer número via QR Code, inclusive pessoal) e a Meta Official API (WhatsApp Business com CNPJ). Você escolhe o modelo conforme sua operação e volume."],["Em quanto tempo vou ver resultado?","A maioria dos clientes reporta diferença na primeira semana — especialmente nas respostas automáticas e no follow-up. Leads que antes esfriavam passam a receber atenção imediata, e isso se traduz em mais conversões rapidamente."],["Posso migrar minha base do Kommo para o uPixel?","Sim. O uPixel tem compatibilidade nativa com Kommo: importação via JSON, mapeamento automático de triggers e ações, e migração zero-downtime. Você não perde histórico nem configurações."],["O sistema pode ser bloqueado pelo WhatsApp por uso de disparos?","O uPixel inclui sistema anti-bloqueio com throttling configurável, intervalo aleatório entre envios, rotação de instâncias e detecção automática de números inválidos. Para máxima segurança, recomendamos a Meta Official API com templates aprovados."],["Preciso de um developer para usar as automações?","Não. O builder de automações é completamente drag-and-drop. Você cria fluxos com IF/ELSE, loops, delays e integrações de API sem escrever uma linha de código. Há também templates prontos para os casos de uso mais comuns."],["Como funciona o período de teste?","14 dias com acesso completo ao plano Pro, sem precisar de cartão de crédito. Após o período, você escolhe o plano mais adequado ou cancela sem custo algum."]].map(([q,a],i) => (
              <div key={i} className={`faq-item${openFaq === i ? " open" : ""}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="faq-q">{q}<span className="faq-toggle">+</span></div>
                <div className="faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <hr className="divider" />

        {/* CTA FINAL */}
        <div className="section fade-up">
          <div className="demo-banner" style={{ background: "linear-gradient(135deg,rgba(0,212,160,.1),rgba(79,110,255,.12))", borderColor: "rgba(0,212,160,.3)" }}>
            <div className="float-icons">{["🔥","⚡","💬","📱","📈","🎯"].map((ic) => <span key={ic} className="float-icon">{ic}</span>)}</div>
            <div className="demo-banner-inner">
              <div className="tag badge-green" style={{ margin: "0 auto 1.25rem", display: "inline-flex" }}>Comece hoje</div>
              <h2>Teste grátis por 14 dias</h2>
              <p>Descubra como o uPixel transforma seu WhatsApp e redes sociais na sua maior fonte de clientes!</p>
              <button className="btn-primary btn-pulse" style={{ fontSize: "16px", padding: "16px 40px" }} onClick={() => sp("Quero começar meu teste gratuito de 14 dias no uPixel CRM agora")}>🔥 Começar agora →</button>
              <div className="demo-guarantees"><span>Sem cartão de crédito</span><span>Cancela quando quiser</span><span>Setup em 5 minutos</span></div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer">
          <p>© 2025 uPixel CRM — Tecnologia de vendas para times que levam resultado a sério.</p>
          <p style={{ marginTop: 8 }}>Desenvolvido com Supabase · TypeScript · React · Edge Functions</p>
        </div>

      </div>

      {/* FAB */}
      <div className={`fab-demo${fabVisible ? " visible" : ""}`}>
        <button className="fab-btn" onClick={() => sp("Quero agendar uma apresentação gratuita do uPixel CRM")}>
          <span>📅</span>
          <span className="fab-text">Apresentação gratuita</span>
        </button>
      </div>
    </div>
  );
}
