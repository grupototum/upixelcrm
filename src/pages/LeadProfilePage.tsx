import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import { LeadDetail, LeadDetailActions } from "@/components/crm/LeadDetail";

/**
 * Rota /leads/:id — casca de layout em volta de <LeadDetail>.
 *
 * O miolo mora em components/crm/LeadDetail.tsx porque o board do CRM abre o
 * mesmo detalhe num Sheet lateral; duplicar as ~1000 linhas nos dois lugares
 * garantiria que um dos dois ficasse para trás na primeira mudança.
 *
 * A rota continua existindo e válida para sempre: link compartilhado por
 * WhatsApp/e-mail abre a página cheia, não o Sheet.
 */
export default function LeadProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads } = useAppState();
  const lead = useMemo(() => leads.find((l) => l.id === id), [id, leads]);

  // Lead pode ser "contato"/"parceiro" — nesses casos a origem é /contacts.
  const backTo = lead?.category === "lead" || !lead ? "/crm" : "/contacts";

  return (
    <AppLayout
      title={lead ? "" : "Lead não encontrado"}
      subtitle=""
      breadcrumbLabel={lead?.name}
      actions={<LeadDetailActions leadId={id} onClose={() => navigate(backTo)} />}
    >
      <LeadDetail leadId={id} onClose={() => navigate(backTo)} />
    </AppLayout>
  );
}
