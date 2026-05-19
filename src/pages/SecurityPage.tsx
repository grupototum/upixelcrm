import { AppLayout } from "@/components/layout/AppLayout";
import { SecuritySettings } from "@/components/settings/SecuritySettings";

export default function SecurityPage() {
  return (
    <AppLayout title="Segurança" subtitle="Proteja sua conta e monitore acessos recentes">
      <SecuritySettings />
    </AppLayout>
  );
}
