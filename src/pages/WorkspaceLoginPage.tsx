import { useState, type FormEvent } from "react";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTenantUrl } from "@/utils/tenant";

// Página exibida em /login no DOMÍNIO RAIZ (ex.: upixel.app/login), onde não há
// tenant no contexto. Em vez de tentar autenticar (não há workspace) ou redirecionar
// pro master, orienta a pessoa a acessar pelo subdomínio da própria empresa e
// oferece um atalho: digita o workspace e vai direto pra {workspace}.dominio/login.
export default function WorkspaceLoginPage() {
  const [slug, setSlug] = useState("");
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN ?? "upixel.app";

  // Normaliza o que a pessoa digitar: aceita "acme", "acme.upixel.app" ou uma URL
  // colada e reduz ao slug do subdomínio.
  function normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\..*$/, "")
      .replace(/[^a-z0-9-]/g, "");
  }

  const workspace = normalize(slug);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workspace) return;
    window.location.href = `${getTenantUrl(workspace)}/login`;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Entre pela sua empresa</h1>
          <p className="text-sm text-muted-foreground mt-2">
            O acesso ao uPixel é feito no endereço exclusivo da sua empresa. Informe o
            nome do seu workspace para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            autoFocus
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={`suaempresa.${rootDomain}`}
            aria-label="Endereço da sua empresa"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Button type="submit" className="w-full" disabled={!workspace}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {workspace ? (
            <>
              Você será levado para{" "}
              <span className="font-medium text-foreground">
                {workspace}.{rootDomain}/login
              </span>
            </>
          ) : (
            <>
              Ex.: <span className="font-medium text-foreground">suaempresa.{rootDomain}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
