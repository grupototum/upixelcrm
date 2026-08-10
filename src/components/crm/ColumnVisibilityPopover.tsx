import { Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type { PipelineColumn } from "@/types";

interface ColumnVisibilityPopoverProps {
  columns: PipelineColumn[];
  hiddenColumnIds: string[];
  onToggle: (columnId: string) => void;
}

export function ColumnVisibilityPopover({ columns, hiddenColumnIds, onToggle }: ColumnVisibilityPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1 h-8">
          <Columns className="h-3 w-3" /> Coluna
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3 space-y-2">
        <p className="text-xs font-semibold mb-2">Colunas visíveis</p>
        {columns.map((col) => (
          <div key={col.id} className="flex items-center gap-2">
            <Checkbox
              id={`vis-${col.id}`}
              checked={!hiddenColumnIds.includes(col.id)}
              onCheckedChange={() => onToggle(col.id)}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor={`vis-${col.id}`} className="text-xs flex items-center gap-1.5 cursor-pointer">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
              {col.name}
            </Label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
