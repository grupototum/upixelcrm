import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="flex h-full overflow-x-auto p-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 - i }).map((_, j) => (
            <Skeleton key={j} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
