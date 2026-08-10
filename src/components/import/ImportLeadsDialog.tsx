import { lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Lazy import — o ImportPage carrega o parser do xlsx + lógica pesada de mapeamento.
// Não vale baixar isso até o usuário realmente abrir o modal.
const ImportPage = lazy(() => import("@/pages/ImportPage"));

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pipeline alvo. Quando combinado com columnId, pula a tela de seleção. */
  pipelineId?: string;
  /** Coluna alvo. Pré-selecionada e travada se lockTarget=true. */
  columnId?: string;
  /** Quando true, usuário não pode trocar pipeline/coluna no modal. */
  lockTarget?: boolean;
  /** Texto opcional pro título (default: "Importar leads"). */
  title?: string;
  /** Subtítulo opcional. */
  subtitle?: string;
  /** Callback ao concluir importação. Recebe contadores. */
  onComplete?: (result: { inserted: number; skipped: number; errors: number }) => void;
}

/**
 * Modal que abre o ImportWizard (página /import) sem o AppLayout, com pipeline/coluna
 * pré-selecionados conforme o contexto onde foi aberto (botão Novo Lead, menu da
 * coluna). Reusa toda a infraestrutura do ImportPage: parser CSV+XLSX, mapping,
 * detecção de tipo de custom field, retries de chunk, etc.
 */
export function ImportLeadsDialog({
  open,
  onOpenChange,
  pipelineId,
  columnId,
  lockTarget = false,
  title = "Importar leads",
  subtitle,
  onComplete,
}: ImportLeadsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {subtitle && <DialogDescription className="text-xs">{subtitle}</DialogDescription>}
        </DialogHeader>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          {open && (
            <ImportPage
              embedded
              initialPipelineId={pipelineId}
              initialColumnId={columnId}
              lockTarget={lockTarget}
              onComplete={(result) => {
                onComplete?.(result);
                // Não fecha automaticamente — usuário decide quando sair da tela de resultado.
              }}
            />
          )}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
