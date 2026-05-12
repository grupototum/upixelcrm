// Termos de Serviço — necessário pra App Review da Meta.
// Texto base — recomendar revisão jurídica antes de operação grande.

import upixelDark from "@/assets/upixel_dark.png";

const LAST_UPDATED = "11 de maio de 2026";
const CONTACT_EMAIL = "grupototumadm@gmail.com";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#fffefb] text-[#201515] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-block mb-8">
          <img src={upixelDark} alt="uPixel" className="h-8" />
        </a>

        <h1 className="text-3xl font-bold tracking-tight mb-1">Termos de Serviço</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: {LAST_UPDATED}</p>

        <div className="space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">1. Aceitação</h2>
            <p>
              Ao criar uma conta no uPixel (<strong>upixel.app</strong>) ou usar qualquer funcionalidade da plataforma,
              você concorda com estes Termos de Serviço e com a <a href="/privacy-policy" className="text-[#ff4f00] underline">Política de Privacidade</a>.
              Se não concordar, não use o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">2. O que oferecemos</h2>
            <p>
              O uPixel é uma plataforma SaaS multi-tenant que centraliza atendimento (WhatsApp, Instagram, e-mail),
              gestão de leads (CRM), automações de marketing, disparos em massa e sincronização de campanhas
              Meta Ads e Google Ads.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">3. Conta e responsabilidades</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Você é responsável por manter suas credenciais seguras</li>
              <li>É proibido compartilhar acesso com terceiros não autorizados</li>
              <li>Você responde pelo conteúdo das mensagens enviadas pela sua conta</li>
              <li>Você deve respeitar a legislação aplicável: LGPD, Marco Civil da Internet, Código de Defesa do Consumidor</li>
              <li>Não é permitido usar o uPixel para spam, fraude, discurso de ódio, conteúdo ilegal ou qualquer atividade que viole as políticas da Meta, Google ou outros provedores integrados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">4. Integrações com Meta (Facebook, WhatsApp, Instagram) e Google</h2>
            <p>
              Ao conectar contas Meta ou Google ao uPixel, você concede ao uPixel permissão para acessar e operar
              essas contas exclusivamente conforme suas instruções na plataforma. Você concorda em:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cumprir os <a href="https://developers.facebook.com/terms/" target="_blank" rel="noreferrer" className="text-[#ff4f00] underline">Termos da Plataforma Meta</a> e a <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noreferrer" className="text-[#ff4f00] underline">Política Comercial do WhatsApp</a></li>
              <li>Obter consentimento dos destinatários antes de enviar mensagens em massa</li>
              <li>Não usar a plataforma para spam ou conteúdo enganoso</li>
              <li>Responder por qualquer banimento ou suspensão decorrente do uso da sua conta</li>
            </ul>
            <p className="mt-3">
              O uPixel age como Tech Provider/Business Service Provider. Não temos controle sobre decisões de aprovação,
              banimento ou suspensão das plataformas integradas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">5. Pagamento, planos e cancelamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Os planos pagos (Starter, Pro, Business) são cobrados conforme periodicidade escolhida (mensal, trimestral, semestral, anual)</li>
              <li>Cobranças adicionais por add-ons (números WhatsApp extras, créditos de disparo) são previamente comunicadas</li>
              <li>Você pode cancelar a qualquer momento — não há taxa de cancelamento, mas não há reembolso proporcional de períodos já pagos</li>
              <li>Em caso de inadimplência superior a 30 dias, sua conta pode ser suspensa e dados removidos após 90 dias adicionais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">6. Disponibilidade do serviço</h2>
            <p>
              Buscamos manter uptime superior a 99%, mas não garantimos disponibilidade ininterrupta.
              Manutenções programadas serão anunciadas com antecedência. Não somos responsáveis por
              indisponibilidades de provedores terceiros (Meta, Google, Evolution API, Supabase).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">7. Propriedade intelectual</h2>
            <p>
              O código, design, marca e conteúdo do uPixel são propriedade do Grupo Totum. Os dados que você
              insere e gera na plataforma (leads, mensagens, configurações) permanecem seus — fornecemos
              exportação a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">8. Limitação de responsabilidade</h2>
            <p>
              Na máxima extensão permitida em lei, o uPixel não responde por:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Lucros cessantes, perda de dados ou dano indireto decorrente do uso ou indisponibilidade</li>
              <li>Decisões de banimento/suspensão das plataformas integradas</li>
              <li>Conteúdo enviado por usuários da sua conta</li>
              <li>Ataques de terceiros que comprometam credenciais não protegidas pelo usuário</li>
            </ul>
            <p className="mt-3">
              Em qualquer hipótese, nossa responsabilidade está limitada ao valor pago pelo serviço nos
              últimos 6 meses anteriores ao evento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">9. Alterações</h2>
            <p>
              Estes termos podem ser atualizados. Alterações materiais serão comunicadas por e-mail com
              30 dias de antecedência. O uso continuado da plataforma após a vigência implica concordância.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">10. Foro</h2>
            <p>
              Fica eleito o foro da Comarca de Belo Horizonte/MG como competente para dirimir qualquer
              controvérsia, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">11. Contato</h2>
            <p>
              E-mail: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ff4f00] underline">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
          © 2026 uPixel CRM — <a href="/" className="text-[#ff4f00] underline">Voltar para o site</a>
          {" · "}
          <a href="/privacy-policy" className="text-[#ff4f00] underline">Política de Privacidade</a>
        </footer>
      </div>
    </div>
  );
}
