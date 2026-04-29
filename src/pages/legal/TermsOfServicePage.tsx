import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { ArrowLeft } from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última atualização: 29 de abril de 2026
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ao acessar ou utilizar a plataforma uPixel CRM (o "Serviço"), você concorda em
              cumprir e estar vinculado a estes Termos de Serviço ("Termos"). Se você não
              concordar com qualquer parte destes Termos, não poderá utilizar o Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O uPixel CRM é uma plataforma SaaS de gestão de relacionamento com clientes (CRM)
              que oferece funcionalidades de inbox unificado multi-canal (WhatsApp, Instagram,
              Email, Webchat), automações de marketing, gestão de leads e oportunidades, disparos
              em massa, integrações com APIs de terceiros e ferramentas de inteligência artificial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Conta de Usuário</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              Para utilizar o Serviço, você deve criar uma conta fornecendo informações precisas e
              completas. Você é responsável por:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Todas as atividades realizadas em sua conta.</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado.</li>
              <li>Garantir que seus dados de cadastro estejam sempre atualizados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Uso Aceitável</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              Você concorda em NÃO usar o Serviço para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>
                Enviar spam, mensagens não solicitadas ou conteúdo abusivo, fraudulento ou ilegal.
              </li>
              <li>
                Violar políticas de plataformas integradas (Meta WhatsApp, Instagram, Google,
                etc.).
              </li>
              <li>Infringir direitos de propriedade intelectual de terceiros.</li>
              <li>
                Coletar dados pessoais sem consentimento explícito e fundamento legal (LGPD/GDPR).
              </li>
              <li>Tentar acessar partes não autorizadas do Serviço ou outros sistemas.</li>
              <li>Sobrecarregar nossa infraestrutura ou interferir no funcionamento do Serviço.</li>
              <li>Revender o Serviço sem autorização expressa.</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
              <strong className="text-foreground">Disparos em massa:</strong> Você é o único
              responsável por garantir que possui consentimento dos destinatários e que cumpre
              todas as leis aplicáveis sobre comunicação eletrônica. Recomendamos respeitar opt-outs,
              janelas de horário comercial e políticas anti-spam das plataformas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Propriedade Intelectual</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O Serviço, incluindo todo seu conteúdo, código, design, logotipos e marcas, é de
              propriedade exclusiva da uPixel/Grupo Totum e está protegido por leis de direitos
              autorais. O conteúdo gerado por você (mensagens, leads, configurações) permanece de
              sua propriedade — concedemos a você uma licença limitada e revogável para usar o
              Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Pagamento e Assinatura</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Os planos e preços do Serviço são apresentados na página de assinatura. Os pagamentos
              são processados via provedores terceiros. As assinaturas são renovadas
              automaticamente, salvo cancelamento prévio. Em caso de não pagamento, o acesso ao
              Serviço pode ser suspenso após notificação. Reembolsos seguem nossa política de
              reembolso disponível mediante solicitação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Suspensão e Encerramento</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos,
              sem aviso prévio em casos de violação grave. Você pode cancelar sua conta a qualquer
              momento através das configurações ou contatando o suporte. Após o encerramento, seus
              dados serão tratados conforme nossa Política de Privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disponibilidade e Suporte</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Empenhamo-nos em manter o Serviço disponível 24/7, porém não garantimos uptime de
              100%. Manutenções programadas serão comunicadas com antecedência sempre que possível.
              O suporte está disponível por e-mail e canais oficiais conforme o plano contratado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Na máxima extensão permitida por lei, a uPixel não será responsável por danos
              indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de
              lucros, dados ou oportunidades de negócio, decorrentes do uso ou da incapacidade de
              uso do Serviço. Nossa responsabilidade total agregada não excederá o valor pago por
              você nos 12 meses anteriores ao evento que deu origem à reclamação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Indenização</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Você concorda em indenizar e isentar a uPixel de quaisquer reivindicações, danos ou
              despesas decorrentes do seu uso indevido do Serviço, violação destes Termos ou
              violação de direitos de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Lei Aplicável</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer
              disputa será submetida ao foro da comarca da sede da uPixel, com renúncia a qualquer
              outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Alterações dos Termos</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações
              materiais serão notificadas com ao menos 30 dias de antecedência. O uso continuado
              do Serviço após as alterações constitui aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contato</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Para dúvidas sobre estes Termos, entre em contato:
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
