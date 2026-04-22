import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TenantNotFoundPage() {
  const handleGoHome = () => {
    const { protocol, port } = window.location;
    const portSuffix = port && port !== "80" && port !== "443" ? `:${port}` : "";
    const rootDomain = import.meta.env.VITE_ROOT_DOMAIN ?? "localhost";
    window.location.href = `${protocol}//${rootDomain}${portSuffix}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresa não encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">
            O endereço que você acessou não corresponde a nenhuma empresa cadastrada na plataforma.
          </p>
        </div>

        <Button variant="outline" onClick={handleGoHome}>
          Voltar para a página inicial
        </Button>
      </div>
    </div>
  );
}
