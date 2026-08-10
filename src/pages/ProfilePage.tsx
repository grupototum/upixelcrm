import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

export default function ProfilePage() {
  return (
    <AppLayout title="Meu Perfil" subtitle="Gerencie suas informações pessoais e preferências">
      <ProfileSettings />
    </AppLayout>
  );
}
