import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Kanban,
  Zap,
  BarChart3,
  Bot,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import upixelLogoLight from "@/assets/upixel_light.png";
import upixelLogoDark from "@/assets/upixel_dark.png";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Inbox centralizado",
    description: "WhatsApp, e-mail e web chat no mesmo lugar, com atribuição automática por equipe.",
  },
  {
    icon: Kanban,
    title: "Pipeline visual",
    description: "Acompanhe cada lead por etapas customizáveis e nunca perca uma oportunidade de venda.",
  },
  {
    icon: Zap,
    title: "Automações inteligentes",
    description: "Dispare mensagens, crie tarefas e mova leads automaticamente com regras simples.",
  },
  {
    icon: BarChart3,
    title: "Relatórios em tempo real",
    description: "Conversão por etapa, performance por vendedor e previsão de receita.",
  },
  {
    icon: Bot,
    title: "IA de atendimento",
    description: "Sugestões de resposta e qualificação automática de leads com IA integrada.",
  },
  {
    icon: Calendar,
    title: "Agenda integrada",
    description: "Conecte Google Calendar e gerencie reuniões sem sair do CRM.",
  },
];

const BENEFITS = [
  "Setup em minutos, sem instalar nada",
  "Suporte em português",
  "Integrações com WhatsApp, Google e Asaas",
  "Acesso multi-dispositivo (web + mobile)",
];

export default function LandingPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <img
            src={theme === "dark" ? upixelLogoDark : upixelLogoLight}
            alt="uPixel"
            className="h-8"
          />
          <nav className="flex items-center gap-3">
            <a
              href="#recursos"
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Recursos
            </a>
            <Button asChild variant="ghost" size="sm">
              <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer">
                Fale conosco
              </a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            CRM multi-canal para times de vendas
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Venda mais com menos esforço
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            O uPixel centraliza WhatsApp, e-mail e pipeline em uma única plataforma —
            com automações e IA para sua equipe fechar negócio mais rápido.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg" className="h-12 px-8">
              <Link to="/cadastro">
                Começar agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer">
                Falar com especialista
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Tudo que você precisa num só lugar
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Pare de saltar entre ferramentas. O uPixel integra comunicação, gestão e
              inteligência no mesmo fluxo de trabalho.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Feito para o time brasileiro de vendas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Pronto para transformar seu processo de vendas?
          </h2>
          <p className="text-muted-foreground">
            Fale com nosso time e veja o uPixel rodando no seu negócio.
          </p>
          <div className="flex justify-center pt-4">
            <Button asChild size="lg" className="h-12 px-8">
              <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer">
                Solicitar demonstração
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img
            src={theme === "dark" ? upixelLogoDark : upixelLogoLight}
            alt="uPixel"
            className="h-6 opacity-70"
          />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} uPixel. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
