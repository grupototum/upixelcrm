import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";

import { ChevronDown, ChevronRight, Folder, FolderOpen, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Árvore de navegação com linhas de ramificação animadas.
 *
 * Adaptações ao design system uPixel:
 *  - sem framer-motion: o "galho ativo" desliza com transições CSS (tronco com
 *    `height` + cotovelo com `translateY`), o hover é `:hover` puro.
 *  - ícones sempre em `text-primary` (laranja), como o resto do menu.
 *  - cores via tokens de sidebar em vez de border/accent genéricos.
 */

export type TreeVariant = "line" | "pill";

interface TreeContextValue {
  selectedId: string | null;
  variant: TreeVariant;
  activeColor: string;
  onSelect: (id: string) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

function useTreeContext() {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("Tree components must be rendered within a TreeView.");
  }
  return context;
}

function isChildActive(child: ReactNode, activeId: string | null): boolean {
  if (!activeId || !isValidElement(child)) return false;

  const props = child.props as { id?: string; children?: ReactNode };

  if (props.id === activeId) return true;

  if (props.children) {
    return Children.toArray(props.children).some((nested) => isChildActive(nested, activeId));
  }

  return false;
}

export interface TreeListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TreeList({ children, className, ...props }: TreeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = useState<number[]>([]);
  const { selectedId, variant, activeColor } = useTreeContext();

  const childrenCount = Children.count(children);

  const activeIndex = useMemo(() => {
    if (!selectedId) return -1;
    return Children.toArray(children)
      .filter(isValidElement)
      .findIndex((child) => isChildActive(child, selectedId));
  }, [children, selectedId]);

  const selectedOffset =
    activeIndex >= 0 && activeIndex < offsets.length ? offsets[activeIndex] : null;

  const updateOffsets = useCallback(() => {
    if (!containerRef.current) return;
    const rows = Array.from(containerRef.current.children).filter(
      (el) => el.tagName !== "svg" && !el.hasAttribute("data-tree-marker"),
    ) as HTMLElement[];
    setOffsets(rows.map((row) => row.offsetTop + 16));
  }, []);

  useLayoutEffect(() => {
    updateOffsets();
    if (!containerRef.current) return;
    const observer = new ResizeObserver(updateOffsets);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [childrenCount, updateOffsets]);

  const lastOffset = offsets.length > 0 ? offsets[offsets.length - 1] : 0;

  return (
    <div
      ref={containerRef}
      role="group"
      className={cn("relative flex flex-col gap-0.5", className)}
      {...props}
    >
      {offsets.length > 0 && (
        <svg
          aria-hidden="true"
          data-tree-marker
          width="12"
          height={lastOffset + 1}
          viewBox={`0 0 12 ${lastOffset + 1}`}
          fill="none"
          className="pointer-events-none absolute left-[12.5px] top-0 z-10 select-none text-sidebar-border"
        >
          <path d={`M0.5 0 V${lastOffset - 5}`} stroke="currentColor" strokeWidth="1" />
          {offsets.map((y, index) => (
            <path
              key={index}
              d={`M0.5 ${y - 5} Q0.5 ${y} 5.5 ${y} H11.5`}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </svg>
      )}

      {variant === "line" && selectedOffset !== null && (
        <div
          aria-hidden="true"
          data-tree-marker
          className={cn(
            "pointer-events-none absolute left-[12.5px] top-0 z-10 select-none",
            activeColor,
          )}
        >
          <div
            className="w-px bg-current transition-[height] duration-300 ease-out"
            style={{ height: Math.max(selectedOffset - 5, 0) }}
          />
          <svg
            width="12"
            height="6"
            viewBox="0 0 12 6"
            fill="none"
            className="absolute left-0 top-0 transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${selectedOffset - 5}px)` }}
          >
            <path
              d="M0.5 0 Q0.5 5 5.5 5 H11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {children}
    </div>
  );
}

export interface TreeItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

export const TreeItem = forwardRef<HTMLButtonElement, TreeItemProps>(
  ({ id, label, icon: Icon, badge, disabled, className, onClick, ...props }, ref) => {
    const { selectedId, variant, onSelect } = useTreeContext();
    const isSelected = selectedId === id;

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onSelect(id);
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="treeitem"
        aria-selected={isSelected}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "group relative flex h-8 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 pl-8 text-left text-[13px] outline-none transition-colors select-none",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
          "hover:bg-sidebar-accent hover:text-foreground",
          isSelected
            ? cn("font-semibold text-foreground", variant === "pill" && "bg-sidebar-accent")
            : "font-medium text-sidebar-foreground",
          disabled && "pointer-events-none cursor-not-allowed opacity-40",
          className,
        )}
        {...props}
      >
        <div className="relative z-10 flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-primary" />}
          <span className="truncate leading-none">{label}</span>
        </div>

        {badge && (
          <span className="relative z-10 ml-auto shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-primary-foreground">
            {badge}
          </span>
        )}
      </button>
    );
  },
);

TreeItem.displayName = "TreeItem";

export interface TreeFolderProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  disabled?: boolean;
}

export function TreeFolder({
  id,
  label,
  icon: CustomIcon,
  badge,
  defaultExpanded = false,
  children,
  disabled,
  className,
  ...props
}: TreeFolderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  const Icon = CustomIcon || (isExpanded ? FolderOpen : Folder);

  const handleToggle = () => {
    if (!disabled) setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" && !isExpanded) {
      event.preventDefault();
      setIsExpanded(true);
    } else if (event.key === "ArrowLeft" && isExpanded) {
      event.preventDefault();
      setIsExpanded(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)} {...props}>
      <button
        type="button"
        role="treeitem"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative flex h-8 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 pl-8 text-left text-[13px] font-medium text-sidebar-foreground outline-none transition-colors select-none",
          "hover:bg-sidebar-accent hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
          disabled && "pointer-events-none cursor-not-allowed opacity-40",
        )}
      >
        <div className="relative z-10 flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-primary" />
          <span className="truncate leading-none">{label}</span>
        </div>

        <div className="relative z-10 flex items-center gap-1">
          {badge && (
            <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-primary-foreground">
              {badge}
            </span>
          )}
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-primary transition-transform duration-200",
              isExpanded && "rotate-90",
            )}
          />
        </div>
      </button>

      <div
        id={contentId}
        aria-hidden={!isExpanded}
        className={cn(
          "grid pl-4 transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <TreeList>{children}</TreeList>
        </div>
      </div>
    </div>
  );
}

export interface TreeSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}

export function TreeSection({
  title,
  defaultExpanded = true,
  children,
  className,
}: TreeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-sidebar-ring"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground transition-colors group-hover:text-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-primary transition-transform duration-200",
            !isExpanded && "-rotate-90",
          )}
        />
      </button>

      <div
        id={contentId}
        aria-hidden={!isExpanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <TreeList>{children}</TreeList>
        </div>
      </div>
    </div>
  );
}

export interface TreeViewProps extends Omit<HTMLAttributes<HTMLElement>, "onSelect"> {
  selectedId?: string;
  defaultSelectedId?: string;
  variant?: TreeVariant;
  activeColor?: string;
  onSelect?: (id: string) => void;
  children: ReactNode;
}

export function TreeView({
  selectedId: controlledSelectedId,
  defaultSelectedId,
  variant = "line",
  activeColor = "text-primary",
  onSelect: controlledOnSelect,
  children,
  className,
  ...props
}: TreeViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    defaultSelectedId || null,
  );

  const selectedId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;

  const handleSelect = useCallback(
    (id: string) => {
      if (controlledSelectedId === undefined) setInternalSelectedId(id);
      controlledOnSelect?.(id);
    },
    [controlledSelectedId, controlledOnSelect],
  );

  const contextValue = useMemo(
    () => ({ selectedId, variant, activeColor, onSelect: handleSelect }),
    [selectedId, variant, activeColor, handleSelect],
  );

  return (
    <TreeContext.Provider value={contextValue}>
      <nav
        role="tree"
        aria-orientation="vertical"
        className={cn("flex w-full select-none flex-col gap-0.5 px-1", className)}
        {...props}
      >
        {children}
      </nav>
    </TreeContext.Provider>
  );
}
