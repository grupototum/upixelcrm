// Página de Política de Privacidade — necessária pra App Review da Meta.
// Texto baseado em LGPD + práticas Meta. NÃO é parecer jurídico — recomendar
// revisão por advogado antes de operação em larga escala.

import upixelDark from "@/assets/upixel_dark.png";

const LAST_UPDATED = "11 de maio de 2026";
const CONTACT_EMAIL = "grupototumadm@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fffefb] text-[#201515] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-block mb-8">
          <img src={upixelDark} alt="uPixel" className="h-8" />
        </a>

        <h1 className="text-3xl font-bold tracking-tight mb-1">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: {LAST_UPDATED}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">1. Quem somos</h2>
            <p>
              O uPixel CRM (<strong>upixel.app</strong>) é uma plataforma SaaS multi-tenant
              de gestão de relacionamento com clientes (CRM) e atendimento omnichannel
              operada pelo Grupo Totum. Os dados coletados são tratados em conformidade
              com a Lei Geral de Proteção de Dados (Lei 13.709/2018) e com o GDPR para
              clientes europeus.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">2. Quais dados coletamos</h2>
            <p>Coletamos as seguintes categorias de dados pessoais:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, empresa, subdomínio escolhido.</li>
              <li><strong>Dados de leads e contatos:</strong> dados que o usuário (cliente final) importa ou recebe via mensagens nos canais conectados — nome, telefone, e-mail, mensagens trocadas, mídia anexada.</li>
              <li><strong>Dados de integração Meta:</strong> tokens de acesso de longa duração, identificadores de WhatsApp Business Account, Instagram Business Account, Página Facebook e contas de anúncio que o usuário autoriza explicitamente.</li>
              <li><strong>Dados de uso:</strong> ações executadas no painel, logs de auditoria por 90 dias.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo, timestamp de acessos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">3. Como usamos os dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Operar a plataforma uPixel CRM e seus canais de atendimento</li>
              <li>Enviar e receber mensagens via WhatsApp Cloud API e Instagram Direct nas contas que o cliente autorizou</li>
              <li>Sincronizar métricas de campanhas Meta Ads e Google Ads para análise de performance dentro do CRM</li>
              <li>Identificar problemas técnicos e melhorar o produto</li>
              <li>Cumprir obrigações legais e contratuais</li>
            </ul>
            <p className="mt-3">
              <strong>Não vendemos dados pessoais.</strong> Dados de leads dos clientes finais não são compartilhados entre tenants — cada conta tem isolamento completo via Row-Level Security no banco de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">4. Integrações com Meta (Facebook, WhatsApp, Instagram)</h2>
            <p>
              O uPixel se integra à Meta Platforms via OAuth (Facebook Login for Business) e WhatsApp Business Cloud API. Quando você autoriza essas integrações:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>O uPixel recebe e armazena um <strong>access token de longa duração</strong> emitido pela Meta, encriptado em repouso.</li>
              <li>Lemos mensagens recebidas via webhook e exibimos na sua caixa de entrada unificada.</li>
              <li>Enviamos mensagens, criamos templates e gerenciamos webhooks <strong>apenas em resposta a ações suas</strong> (clique em "Enviar", "Criar template", etc.).</li>
              <li>Sincronizamos métricas de campanhas Meta Ads <strong>somente em modo leitura</strong> — não criamos, editamos ou pausamos campanhas.</li>
              <li>Você pode revogar a autorização a qualquer momento em Configurações → WhatsApp/Instagram/Meta Ads no painel uPixel ou diretamente no <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="text-[#ff4f00] underline">Meta Business Suite</a>.</li>
            </ul>
            <p className="mt-3">
              O uso dos dados da Meta segue os <a href="https://developers.facebook.com/terms/" target="_blank" rel="noreferrer" className="text-[#ff4f00] underline">Termos da Plataforma Meta</a>. Quando você revoga acesso, removemos os tokens em até 24 horas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">5. Onde os dados ficam armazenados</h2>
            <p>
              Banco de dados PostgreSQL hospedado pelo Supabase (infraestrutura AWS São Paulo — região sa-east-1). Mídia (imagens, áudio, vídeo) é armazenada no Supabase Storage com replicação automática. Logs e backups são mantidos por períodos definidos abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">6. Retenção</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> enquanto a conta estiver ativa.</li>
              <li><strong>Mensagens e conversas:</strong> indefinido por padrão — o cliente pode configurar política de retenção (planos pagos).</li>
              <li><strong>Logs de auditoria:</strong> 90 dias.</li>
              <li><strong>Tokens de acesso Meta:</strong> renovados automaticamente; removidos em até 24h após revogação.</li>
              <li><strong>Backups:</strong> 30 dias rolling.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">7. Seus direitos (LGPD)</h2>
            <p>Como titular dos dados pessoais, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento dos seus dados</li>
              <li>Acessar e corrigir dados incorretos</li>
              <li>Solicitar anonimização, bloqueio ou eliminação</li>
              <li>Portabilidade dos dados</li>
              <li>Revogação do consentimento</li>
              <li>Informação sobre compartilhamentos com terceiros</li>
            </ul>
            <p className="mt-3">
              Para exercer qualquer direito, envie e-mail para <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ff4f00] underline">{CONTACT_EMAIL}</a> com sua identificação. Respondemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">8. Exclusão de dados (Meta Data Deletion Request)</h2>
            <p>
              Caso você desinstale o app uPixel do seu Facebook ou solicite exclusão pelo Meta Business Suite, recebemos automaticamente uma requisição via webhook que apaga seus dados associados a integrações Meta em até 24 horas.
            </p>
            <p className="mt-2">
              URL do callback de exclusão: <code className="bg-gray-100 px-1 rounded text-[12px]">https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/data-deletion-callback</code>
            </p>
            <p className="mt-2">
              Para confirmar o status de uma solicitação de exclusão, acesse: <a href="https://upixel.app/data-deletion-status" className="text-[#ff4f00] underline">upixel.app/data-deletion-status</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">9. Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Conexões HTTPS/TLS 1.2+ em todas as comunicações</li>
              <li>Tokens de acesso encriptados em repouso</li>
              <li>Row-Level Security no banco isolando dados por tenant</li>
              <li>Audit log de todas as ações administrativas</li>
              <li>Backup diário com retenção de 30 dias</li>
              <li>2FA disponível para usuários (em desenvolvimento)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">10. Cookies</h2>
            <p>
              Usamos cookies essenciais para autenticação (Supabase Auth) e armazenamento de preferências (tema, sidebar). Não usamos cookies de rastreamento de terceiros para publicidade. Cookies de análise são opt-in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">11. Alterações</h2>
            <p>
              Esta política pode ser atualizada para refletir mudanças no produto ou na legislação. Alterações materiais serão comunicadas por e-mail aos usuários ativos com 30 dias de antecedência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">12. Contato</h2>
            <p>
              <strong>Encarregado de Proteção de Dados (DPO):</strong><br />
              E-mail: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ff4f00] underline">{CONTACT_EMAIL}</a><br />
              Endereço: Grupo Totum — Brasil
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
          © 2026 uPixel CRM — <a href="/" className="text-[#ff4f00] underline">Voltar para o site</a>
          {" · "}
          <a href="/terms-of-service" className="text-[#ff4f00] underline">Termos de Serviço</a>
        </footer>
      </div>
    </div>
  );
}
