import { useTenantUsers } from "@/hooks/useTenantUsers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCheck, UserX } from "lucide-react";

interface LeadAssignmentSelectProps {
  value?: string | null;
  onChange: (userId: string | null) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
  placeholder?: string;
}

const UNASSIGNED = "__unassigned__";

export function LeadAssignmentSelect({
  value,
  onChange,
  disabled,
  className,
  size = "default",
  placeholder = "Sem responsável",
}: LeadAssignmentSelectProps) {
  const { users, loading } = useTenantUsers();

  const handleChange = (next: string) => {
    if (next === UNASSIGNED) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  return (
    <Select
      value={value || UNASSIGNED}
      onValueChange={handleChange}
      disabled={disabled || loading}
    >
      <SelectTrigger
        className={`${size === "sm" ? "h-8 text-xs" : "h-9 text-xs"} ${className || ""}`}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED} className="text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            <UserX className="h-3 w-3" /> Sem responsável
          </span>
        </SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id} className="text-xs">
            <span className="flex items-center gap-2">
              <UserCheck className="h-3 w-3 text-primary" />
              <span className="font-medium">{u.name}</span>
              <span className="text-[10px] text-muted-foreground">
                ({u.role})
              </span>
            </span>
          </SelectItem>
        ))}
        {users.length === 0 && !loading && (
          <SelectItem value="__no_users__" disabled className="text-xs">
            <span className="text-muted-foreground">
              Nenhum usuário disponível
            </span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
