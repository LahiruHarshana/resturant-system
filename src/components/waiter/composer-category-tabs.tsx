import { cn } from "@/lib/utils";
import type { WaiterMenuCategoryDTO } from "@/shared/waiter/schemas";

interface ComposerCategoryTabsProps {
  categories: WaiterMenuCategoryDTO[];
  activeId: string;
  onChange: (id: string) => void;
}

export function ComposerCategoryTabs({
  categories,
  activeId,
  onChange,
}: ComposerCategoryTabsProps) {
  return (
    <div className="scrollbar-hide w-full overflow-x-auto whitespace-nowrap">
      <div className="flex w-max space-x-2 p-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onChange(category.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeId === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
