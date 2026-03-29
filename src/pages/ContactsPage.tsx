import { AppLayout } from "@/components/layout/AppLayout";
import { Users } from "lucide-react";

export default function ContactsPage() {
  return (
    <AppLayout title="Contatos" subtitle="Central de leads e clientes">
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center italic text-muted-foreground gap-2 flex-col animate-fade-in">
        <Users className="h-10 w-10 mb-2" />
        <p>Lista de leads e contatos em breve...</p>
      </div>
    </AppLayout>
  );
}
