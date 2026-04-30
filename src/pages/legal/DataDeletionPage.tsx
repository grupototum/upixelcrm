import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { ArrowLeft, Mail, Trash2, ShieldCheck, Clock } from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";

export default function DataDeletionPage() {
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
        <div className="mb-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <Trash2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Instruções para Exclusão de Dados</h1>
          <p className="text-sm text-muted-foreground">
            Como solicitar a remoção dos seus dados pessoais da plataforma uPixel.
          </p>
        </div>

        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Seu Direito à Exclusão
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Em conformidade com a <strong className="text-foreground">LGPD (Lei Geral de
              Proteção de Dados)</strong> no Brasil e o <strong className="text-foreground">GDPR
              </strong> na União Europeia, você tem o direito de solicitar a exclusão dos seus
              dados pessoais armazenados em nossa plataforma a qualquer momento, sem custo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Como Solicitar a Exclusão</h2>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      Pelas configurações da sua conta
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Se você possui uma conta ativa, faça login e acesse{" "}
                      <strong className="text-foreground">
                        Configurações → Perfil → Excluir Conta
                      </strong>
                      . O processo é automatizado e iniciará a remoção em até 24 horas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      Por e-mail (recomendado para contatos finais)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Envie um e-mail para nosso Encarregado de Proteção de Dados (DPO) com:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mb-3">
                      <li>Assunto: <strong className="text-foreground">"Solicitação de Exclusão de Dados"</strong></li>
                      <li>Nome completo</li>
                      <li>E-mail e/ou telefone associado(s)</li>
                      <li>Empresa (se aplicável)</li>
                      <li>Confirmação de identidade (documento ou método de verificação)</li>
                    </ul>
                    <a
                      href="mailto:grupototumadm@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Exclus%C3%A3o%20de%20Dados"
                      className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Mail className="h-4 w-4" />
                      grupototumadm@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      Para usuários do Facebook / Instagram / WhatsApp
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Se você interagiu com a uPixel através de canais Meta (WhatsApp Business,
                      Instagram Direct, Messenger), pode solicitar a remoção dos dados associados
                      ao seu perfil pelo mesmo e-mail acima, informando o número de telefone ou
                      handle do Instagram/Facebook utilizado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Prazo de Atendimento
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              Após receber sua solicitação devidamente identificada:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Em até 15 dias:</strong> confirmaremos o
                recebimento e iniciaremos a verificação.
              </li>
              <li>
                <strong className="text-foreground">Em até 30 dias:</strong> os dados serão
                removidos dos sistemas em produção.
              </li>
              <li>
                <strong className="text-foreground">Em até 90 dias:</strong> os dados serão
                expurgados também dos backups, conforme política de retenção.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">O Que Acontece Após a Exclusão</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-3">
              Após a confirmação da exclusão:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Sua conta será desativada e não poderá mais ser acessada.</li>
              <li>Mensagens, leads e contatos associados serão removidos permanentemente.</li>
              <li>
                Tokens de integração com Meta, Google e demais serviços serão revogados.
              </li>
              <li>
                Alguns dados podem ser retidos por obrigação legal (por exemplo, registros fiscais
                ou exigências judiciais), pelo período mínimo previsto em lei.
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="text-xl font-semibold mb-3 text-amber-600 dark:text-amber-400">
              Atenção
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A exclusão de dados é{" "}
              <strong className="text-foreground">permanente e irreversível</strong>. Recomendamos
              exportar previamente todos os dados relevantes (leads, contatos, mensagens) através
              da funcionalidade de exportação disponível na plataforma. Após a exclusão, não
              poderemos recuperar nenhuma informação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Outros Direitos</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Além da exclusão, você tem direito a acessar, corrigir, anonimizar, portar e
              opor-se ao tratamento dos seus dados. Consulte nossa{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>{" "}
              para mais detalhes.
            </p>
          </section>

          <section className="text-[11px] text-muted-foreground bg-secondary/5 rounded-lg p-4 mt-8 border border-border/50">
            <p className="font-semibold text-foreground mb-2">Para desenvolvedores:</p>
            <p className="mb-2">
              Esta página serves como "Data Deletion Instructions URL" para Meta's App Dashboard.
            </p>
            <p>
              Para integração com Meta's Data Deletion Callback, use o endpoint:{" "}
              <code className="bg-secondary/20 px-2 py-1 rounded text-[10px] block mt-1 font-mono break-all">
                https://[seu-projeto].supabase.co/functions/v1/data-deletion-callback
              </code>
            </p>
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
