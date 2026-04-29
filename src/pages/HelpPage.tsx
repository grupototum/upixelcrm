import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HelpCircle,
  Search,
  Mail,
  MessageCircle,
  BookOpen,
  Shield,
  Users,
  Zap,
  MessageSquare,
  Kanban,
  Plug,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    category: "Primeiros Passos",
    question: "Como começo a usar o uPixel CRM?",
    answer:
      "Após criar sua conta, conecte seu primeiro canal (WhatsApp, Instagram ou Email) na página de Integrações. Em seguida, importe seus contatos pelo menu Importar ou comece a receber leads naturalmente pelos canais conectados.",
  },
  {
    category: "Primeiros Passos",
    question: "Como crio um novo lead manualmente?",
    answer:
      "Vá até CRM (kanban) ou a página de Contatos e clique em \"Novo Lead\". Preencha nome, telefone/email, origem e atribua a um vendedor da sua equipe.",
  },
  {
    category: "Inbox & Atendimento",
    question: "Como atribuo uma conversa a um colaborador?",
    answer:
      "Abra a conversa no Inbox, clique no menu de ações (ícone de três pontos) no cabeçalho e escolha \"Atribuir agente\". Os usuários listados são membros da sua organização.",
  },
  {
    category: "Inbox & Atendimento",
    question: "Posso responder por WhatsApp Oficial e WhatsApp Web?",
    answer:
      "Sim. O uPixel suporta o WhatsApp Business API (oficial via Meta) e o WhatsApp Web (Evolution API). Configure ambos em Integrações; o canal aparece na conversa.",
  },
  {
    category: "Inbox & Atendimento",
    question: "Como envio mensagens em massa (broadcast)?",
    answer:
      "Acesse WhatsApp → Disparos. Crie uma campanha, selecione o público (filtrando por etapa, origem, etiquetas) e agende ou dispare. Respeite as regras de opt-out e consentimento.",
  },
  {
    category: "Automações",
    question: "Como crio uma automação?",
    answer:
      "Em Automações, clique em \"Nova automação\". Use o construtor visual: escolha um gatilho (novo lead, mensagem, mudança de etapa) e adicione ações (enviar mensagem, criar tarefa, mover lead).",
  },
  {
    category: "Automações",
    question: "Posso ver o histórico de execuções de uma automação?",
    answer:
      "Sim. Dentro do construtor de automação, abra a aba \"Execuções\" para ver cada execução, status (sucesso/falha) e detalhes do passo onde ocorreu o erro.",
  },
  {
    category: "Permissões & Equipe",
    question: "Como adiciono membros à minha empresa?",
    answer:
      "Apenas usuários Master conseguem criar usuários. Vá em Usuários → Novo Usuário, preencha nome, email, senha e função, e selecione a empresa correspondente.",
  },
  {
    category: "Permissões & Equipe",
    question: "Posso editar a matriz de permissões?",
    answer:
      "Sim, usuários com função Master podem clicar em qualquer célula da matriz em Usuários → Matriz de Permissões para conceder ou revogar uma permissão de uma função (Supervisor, Atendente, Vendedor).",
  },
  {
    category: "Integrações",
    question: "Quais integrações estão disponíveis?",
    answer:
      "WhatsApp (oficial e web), Instagram Direct, Email (SMTP/SendGrid/Mailgun/SES), Google Calendar, Google Ads, Meta Ads, e webhooks personalizados. Configure todas em Integrações.",
  },
  {
    category: "Integrações",
    question: "Como conecto meu Google Calendar?",
    answer:
      "Vá em Integrações → Google e clique em \"Conectar\". Autorize o acesso. Suas reuniões aparecerão automaticamente na agenda do CRM.",
  },
  {
    category: "Segurança & Dados",
    question: "Os dados dos meus clientes ficam isolados?",
    answer:
      "Sim. Usamos Row Level Security (RLS) no banco de dados, isolando os dados por tenant_id e organization_id. Apenas usuários da sua organização veem os dados.",
  },
  {
    category: "Segurança & Dados",
    question: "Como exporto ou excluo meus dados (LGPD)?",
    answer:
      "Você pode exportar leads pelo botão de exportação no CRM. Para exclusão de conta e dados, acesse a página /data-deletion ou envie um e-mail para grupototumadm@gmail.com.",
  },
  {
    category: "Cobrança",
    question: "Como funciona a cobrança?",
    answer:
      "Os planos são mensais ou anuais, com renovação automática. Em caso de não pagamento, a conta é suspensa após notificação. Detalhes na página de assinatura.",
  },
];

const QUICK_LINKS = [
  { icon: Kanban, label: "CRM Kanban", description: "Gerencie seu pipeline de vendas", href: "/crm" },
  { icon: MessageSquare, label: "Inbox", description: "Atendimento multi-canal", href: "/inbox" },
  { icon: Zap, label: "Automações", description: "Construa fluxos automáticos", href: "/automations" },
  { icon: Users, label: "Usuários & Permissões", description: "Gestão de equipe", href: "/users" },
  { icon: Plug, label: "Integrações", description: "Conecte WhatsApp, Email e mais", href: "/integrations" },
  { icon: Shield, label: "Segurança", description: "Senha e sessões", href: "/security" },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, FAQ[]>();
    for (const f of filtered) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AppLayout title="Central de Ajuda" subtitle="Tire suas dúvidas e encontre recursos">
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Hero / Search */}
        <Card className="rounded-2xl ghost-border overflow-hidden bg-gradient-to-br from-primary/5 via-card/30 to-accent/5 backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mx-auto">
              <HelpCircle className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Como podemos ajudar?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pesquise nas perguntas frequentes ou acesse atalhos do sistema.
              </p>
            </div>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar dúvida ou recurso..."
                className="pl-11 h-12 rounded-xl text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Atalhos rápidos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map((q) => (
              <a
                key={q.href}
                href={q.href}
                className="group rounded-xl ghost-border bg-card/50 p-4 hover:bg-card transition-colors flex items-start gap-3"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <q.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{q.label}</p>
                  <p className="text-[11px] text-muted-foreground">{q.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Perguntas frequentes
          </h3>
          {grouped.length === 0 ? (
            <Card className="rounded-2xl ghost-border bg-card/30">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{search}". Tente outra palavra-chave ou entre em contato com o suporte.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map(([category, faqs]) => (
                <div key={category}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 pl-1">
                    {category}
                  </p>
                  <div className="space-y-2">
                    {faqs.map((f) => {
                      const idx = FAQS.indexOf(f);
                      const isOpen = openIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setOpenIdx(isOpen ? null : idx)}
                          className={`w-full text-left rounded-xl ghost-border bg-card/40 hover:bg-card transition-all ${
                            isOpen ? "ring-1 ring-primary/30" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3 p-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{f.question}</p>
                              {isOpen && (
                                <p className="text-[12px] text-muted-foreground leading-relaxed mt-2">
                                  {f.answer}
                                </p>
                              )}
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact */}
        <Card className="rounded-2xl ghost-border bg-card/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-accent" />
              </div>
              Não encontrou o que procurava?
            </CardTitle>
            <CardDescription className="text-xs">
              Nossa equipe está pronta para ajudar com qualquer dúvida.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="rounded-xl h-12 justify-start gap-3"
              asChild
            >
              <a href="mailto:grupototumadm@gmail.com">
                <Mail className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-semibold">E-mail</p>
                  <p className="text-[10px] text-muted-foreground">grupototumadm@gmail.com</p>
                </div>
              </a>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-12 justify-start gap-3"
              asChild
            >
              <a
                href="https://wa.me/5500000000000"
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4 text-success" />
                <div className="text-left flex-1">
                  <p className="text-xs font-semibold">WhatsApp</p>
                  <p className="text-[10px] text-muted-foreground">Atendimento via WhatsApp</p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
