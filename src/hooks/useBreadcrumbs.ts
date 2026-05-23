import { useLocation, useParams } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/**
 * Mapeia a rota atual para a hierarquia de breadcrumbs.
 * Retorna array vazio para páginas de topo (sem hierarquia acima).
 *
 * @param dynamicLabel - Label dinâmico para o último segmento (ex: nome do lead).
 *                       Quando fornecido, substitui o label padrão da rota.
 */
export function useBreadcrumbs(dynamicLabel?: string): BreadcrumbItem[] {
  const location = useLocation();
  const params = useParams<Record<string, string>>();

  const path = location.pathname;

  // ── Rotas com profundidade ≥ 2 (mostram breadcrumb) ────────────────────────

  // /leads/:id → CRM > Leads > {nome do lead}
  if (/^\/leads\//.test(path)) {
    return [
      { label: "CRM", to: "/crm" },
      { label: "Leads", to: "/crm" },
      { label: dynamicLabel ?? "Perfil do Lead" },
    ];
  }

  // /automations/builder/:id/runs
  if (/^\/automations\/builder\/[^/]+\/runs/.test(path)) {
    return [
      { label: "Automações", to: "/automations" },
      { label: "Editor", to: `/automations/builder/${params.id}` },
      { label: "Execuções" },
    ];
  }

  // /automations/builder/:id
  if (/^\/automations\/builder\//.test(path)) {
    return [
      { label: "Automações", to: "/automations" },
      { label: "Editor" },
    ];
  }

  // /bots/:id
  if (/^\/bots\//.test(path)) {
    return [
      { label: "Automações", to: "/automations" },
      { label: "Bot" },
    ];
  }

  // /whatsapp/broadcast
  if (path === "/whatsapp/broadcast") {
    return [
      { label: "Integrações", to: "/integrations" },
      { label: "Disparo em Massa" },
    ];
  }

  // /settings/:tab
  if (/^\/settings\/.+/.test(path)) {
    const tabLabels: Record<string, string> = {
      profile: "Perfil",
      security: "Segurança",
      team: "Equipe",
      data: "Dados",
      integrations: "Integrações",
    };
    const tab = path.split("/")[2];
    return [
      { label: "Configurações", to: "/settings" },
      { label: tabLabels[tab] ?? tab },
    ];
  }

  // /alexandria/rag
  if (path === "/alexandria/rag") {
    return [
      { label: "Alexandria" },
      { label: "Documentos IA" },
    ];
  }

  // /google
  if (path === "/google") {
    return [
      { label: "Integrações", to: "/integrations" },
      { label: "Google" },
    ];
  }

  // /meta-ads
  if (path === "/meta-ads") {
    return [
      { label: "Anúncios" },
      { label: "Meta Ads" },
    ];
  }

  // /google-ads
  if (path === "/google-ads") {
    return [
      { label: "Anúncios" },
      { label: "Google Ads" },
    ];
  }

  // /whatsapp e /whatsapp/templates redirecionam pra /integrations.
  // O painel inline gerencia números + templates como abas.

  // /instagram
  if (path === "/instagram") {
    return [
      { label: "Integrações", to: "/integrations" },
      { label: "Instagram" },
    ];
  }

  // /facebook-page
  if (path === "/facebook-page") {
    return [
      { label: "Integrações", to: "/integrations" },
      { label: "Facebook" },
    ];
  }

  // /import
  if (path === "/import") {
    return [
      { label: "CRM", to: "/crm" },
      { label: "Importar Leads" },
    ];
  }

  // /duplicates
  if (path === "/duplicates") {
    return [
      { label: "CRM", to: "/crm" },
      { label: "Duplicatas" },
    ];
  }

  // /profile
  if (path === "/profile") {
    return [
      { label: "Configurações", to: "/settings" },
      { label: "Perfil" },
    ];
  }

  // /security
  if (path === "/security") {
    return [
      { label: "Configurações", to: "/settings" },
      { label: "Segurança" },
    ];
  }

  // /database
  if (path === "/database") {
    return [
      { label: "Configurações", to: "/settings" },
      { label: "Banco de Dados" },
    ];
  }

  // Rotas de topo sem hierarquia acima — não exibem breadcrumb
  return [];
}
