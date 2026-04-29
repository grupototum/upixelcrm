import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { ArrowLeft } from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";

export default function PrivacyPolicyPage() {
  const { theme } = useTheme();
  const logo = theme === "dark" ? upixelLogoDark : upixelLogoLight;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="uPixel" className="h-7" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última atualização: 29 de abril de 2026
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A uPixel ("nós", "nosso") opera a plataforma uPixel CRM (o "Serviço"). Esta Política
              de Privacidade descreve como coletamos, usamos e divulgamos informações ao utilizar
              nosso Serviço e as escolhas que você tem associadas a esses dados. Estamos comprometidos
              com a proteção dos seus dados pessoais em conformidade com a LGPD (Lei Geral de
              Proteção de Dados — Lei nº 13.709/2018) e o GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Informações que Coletamos</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              Coletamos diferentes tipos de informações para fornecer e melhorar nosso Serviço:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Dados de Cadastro:</strong> nome, e-mail,
                telefone, empresa, cargo e credenciais de acesso.
              </li>
              <li>
                <strong className="text-foreground">Dados de Uso:</strong> endereço IP, tipo e
                versão de navegador, páginas visitadas, hora e data de acesso.
              </li>
              <li>
                <strong className="text-foreground">Dados de Comunicação:</strong> mensagens
                enviadas via WhatsApp, Instagram, e-mail e outros canais integrados ao Serviço.
              </li>
              <li>
                <strong className="text-foreground">Dados de Clientes Finais:</strong> informações
                de contatos e leads geridos pelos nossos clientes através da plataforma.
              </li>
              <li>
                <strong className="text-foreground">Dados de Integração:</strong> tokens de acesso
                e configurações de APIs de terceiros (Meta, Google, Evolution API, etc.).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Como Usamos Suas Informações</h2>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Fornecer, operar e manter nosso Serviço.</li>
              <li>Processar transações e enviar notificações relacionadas.</li>
              <li>Permitir comunicação multi-canal entre nossos clientes e seus contatos.</li>
              <li>Detectar, prevenir e abordar problemas técnicos e de segurança.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
              <li>Melhorar nosso Serviço com base no uso e feedback.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Integrações com Terceiros</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              O Serviço integra-se com plataformas de terceiros, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Meta (WhatsApp Business / Instagram):</strong>{" "}
                para envio e recebimento de mensagens. O uso desses dados está sujeito também às
                políticas da Meta.
              </li>
              <li>
                <strong className="text-foreground">Google:</strong> para autenticação e
                integrações com Google Ads, Calendar e Sheets.
              </li>
              <li>
                <strong className="text-foreground">Provedores de Email:</strong> SMTP customizado,
                SendGrid, Mailgun, AWS SES.
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
              Não vendemos seus dados a terceiros. Compartilhamos informações apenas com provedores
              de serviço necessários para a operação da plataforma, sob acordos de confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Retenção de Dados</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Mantemos seus dados pessoais apenas pelo tempo necessário para os fins estabelecidos
              nesta Política, ou conforme exigido por lei. Mensagens e conversas são retidas
              enquanto a conta estiver ativa. Após o cancelamento, os dados são mantidos por até
              90 dias para fins de backup e podem ser excluídos a pedido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Segurança</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Empregamos medidas técnicas e organizacionais para proteger seus dados, incluindo
              criptografia em trânsito (TLS/SSL), criptografia em repouso, controle de acesso por
              função (RBAC), isolamento multi-tenant via Row Level Security (RLS) no banco de
              dados e auditoria de acesso. Apesar dos esforços, nenhum método de transmissão pela
              Internet é 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Seus Direitos (LGPD/GDPR)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              Você tem o direito de:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Acessar os dados pessoais que mantemos sobre você.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados.</li>
              <li>Solicitar a portabilidade dos dados.</li>
              <li>Revogar consentimento previamente concedido.</li>
              <li>Opor-se a tratamentos realizados em desacordo com a lei.</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
              Para exercer qualquer destes direitos, entre em contato em{" "}
              <a
                href="mailto:grupototumadm@gmail.com"
                className="text-primary hover:underline"
              >
                grupototumadm@gmail.com
              </a>
              . Também disponibilizamos instruções para exclusão de dados em{" "}
              <Link to="/data-deletion" className="text-primary hover:underline">
                /data-deletion
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Utilizamos cookies essenciais para autenticação e operação básica do Serviço, e
              cookies analíticos para entender o uso do Serviço e melhorá-lo. Você pode configurar
              seu navegador para recusar cookies, mas algumas funcionalidades poderão ser afetadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Crianças</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nosso Serviço não se destina a menores de 18 anos. Não coletamos intencionalmente
              dados de crianças. Caso identifique uso indevido, entre em contato para remoção
              imediata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Alterações nesta Política</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre
              alterações relevantes por e-mail e/ou por aviso no Serviço, e atualizaremos a data
              de "última atualização" no topo desta página.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus
              dados pessoais, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
            </p>
            <ul className="list-none pl-0 mt-3 space-y-1 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">E-mail:</strong>{" "}
                <a
                  href="mailto:grupototumadm@gmail.com"
                  className="text-primary hover:underline"
                >
                  grupototumadm@gmail.com
                </a>
              </li>
              <li>
                <strong className="text-foreground">Empresa:</strong> Grupo Totum / uPixel
              </li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} uPixel. Todos os direitos reservados.</p>
          <nav className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/terms-of-service" className="hover:text-foreground">
              Termos
            </Link>
            <Link to="/data-deletion" className="hover:text-foreground">
              Exclusão de Dados
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
