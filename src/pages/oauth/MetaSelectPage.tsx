import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMetaOAuth, type DiscoveredAccounts, type MetaIntegrationType } from "@/hooks/useMetaOAuth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MessageCircle, Instagram, BarChart3, Phone } from "lucide-react";
import { toast } from "sonner";

// This page runs on the TENANT subdomain (e.g. https://acme.upixel.app/oauth/meta/select)
// after the root-domain callback has exchanged the OAuth code. The user is now
// authenticated and we show them the discovered accounts so they can pick.
export default function MetaSelectPage() {
  const navigate = useNavigate();
  const { fetchDiscovered, saveSelection, getPending, clearPending } = useMetaOAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredAccounts>({});
  const [type, setType] = useState<MetaIntegrationType>("all");
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    if (!session) {
      toast.error("Sessão OAuth ausente");
      navigate("/integrations");
      return;
    }
    setSessionId(session);

    (async () => {
      try {
        const data = await fetchDiscovered(session);
        setType(data.type);
        setDiscovered(data.discovered || {});
      } catch (err: any) {
        toast.error(`Erro: ${err.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchDiscovered, navigate]);

  const handleConnectWhatsApp = async (waba: any, phone: any) => {
    setSaving(`wa-${phone.id}`);
    try {
      await saveSelection(sessionId, "whatsapp_official", {
        waba_id: waba.id,
        business_id: waba.business_id,
        phone_number_id: phone.id,
        display_phone_number: phone.display_phone_number,
        instance_name: phone.verified_name || phone.display_phone_number,
      });
      toast.success(`WhatsApp ${phone.display_phone_number} conectado!`);
      const pending = getPending();
      clearPending();
      navigate(pending?.return_to || "/whatsapp");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleConnectInstagram = async (acc: any) => {
    setSaving(`ig-${acc.ig_account_id}`);
    try {
      await saveSelection(sessionId, "instagram", acc);
      toast.success(`Instagram @${acc.ig_username} conectado!`);
      const pending = getPending();
      clearPending();
      navigate(pending?.return_to || "/instagram");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleConnectAds = async (acc: any) => {
    setSaving(`ads-${acc.id}`);
    try {
      await saveSelection(sessionId, "meta_ads", {
        ad_account_id: acc.id,
        name: acc.name,
        currency: acc.currency,
      });
      toast.success(`Meta Ads (${acc.name}) conectado!`);
      const pending = getPending();
      clearPending();
      navigate(pending?.return_to || "/meta-ads");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando contas descobertas…</p>
        </div>
      </div>
    );
  }

  const hasWA = (discovered.whatsapp?.length || 0) > 0;
  const hasIG = (discovered.instagram?.length || 0) > 0;
  const hasAds = (discovered.ads?.length || 0) > 0;
  const hasAny = hasWA || hasIG || hasAds;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center space-y-2 pt-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <h1 className="text-xl font-bold">Escolha o que conectar</h1>
          <p className="text-xs text-muted-foreground">
            Selecione abaixo qual conta deseja vincular ao seu CRM.
          </p>
        </div>

        {!hasAny && (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm">Nenhuma conta encontrada para o tipo solicitado.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Verifique se sua conta Meta tem acesso a uma WABA, conta Instagram Business ou conta
              de anúncios.
            </p>
          </div>
        )}

        {hasWA && (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp Business Accounts
            </h2>
            <div className="space-y-3">
              {discovered.whatsapp!.map((waba) => (
                <div key={waba.id} className="border border-border/40 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-semibold">
                    {waba.name} <span className="text-muted-foreground font-normal">· {waba.business_name}</span>
                  </div>
                  {waba.phone_numbers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">
                      Nenhum número configurado nesta WABA
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {waba.phone_numbers.map((phone) => (
                        <div
                          key={phone.id}
                          className="flex items-center justify-between p-2 rounded bg-secondary/30"
                        >
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="text-xs font-mono">{phone.display_phone_number}</div>
                              {phone.verified_name && (
                                <div className="text-[10px] text-muted-foreground">
                                  {phone.verified_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="text-[11px] h-7"
                            onClick={() => handleConnectWhatsApp(waba, phone)}
                            disabled={saving === `wa-${phone.id}`}
                          >
                            {saving === `wa-${phone.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Conectar"
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {hasIG && (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" /> Contas Instagram Business
            </h2>
            <div className="space-y-2">
              {discovered.instagram!.map((acc) => (
                <div
                  key={acc.ig_account_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40"
                >
                  <div className="flex items-center gap-3">
                    {acc.ig_picture ? (
                      <img src={acc.ig_picture} alt="" className="h-9 w-9 rounded-full" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-pink-500/10 flex items-center justify-center">
                        <Instagram className="h-4 w-4 text-pink-500" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold">@{acc.ig_username}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {acc.ig_followers ? `${acc.ig_followers.toLocaleString("pt-BR")} seguidores · ` : ""}
                        Page: {acc.page_name}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="text-[11px] h-7 bg-pink-500 hover:bg-pink-600 text-white"
                    onClick={() => handleConnectInstagram(acc)}
                    disabled={saving === `ig-${acc.ig_account_id}`}
                  >
                    {saving === `ig-${acc.ig_account_id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Conectar"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasAds && (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Contas de Anúncios
            </h2>
            <div className="space-y-2">
              {discovered.ads!.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40"
                >
                  <div>
                    <div className="text-xs font-semibold">{acc.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {acc.id} · {acc.currency}
                      {acc.business_name ? ` · ${acc.business_name}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="text-[11px] h-7 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => handleConnectAds(acc)}
                    disabled={saving === `ads-${acc.id}`}
                  >
                    {saving === `ads-${acc.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Conectar"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="text-center pt-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/integrations")}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
