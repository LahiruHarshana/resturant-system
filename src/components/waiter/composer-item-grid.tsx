import type { WaiterMenuItemDTO } from "@/shared/waiter/schemas";
import { minorToDisplay } from "@/shared/money/money";

interface ComposerItemGridProps {
  items: WaiterMenuItemDTO[];
  onSelect: (id: string) => void;
}

export function ComposerItemGrid({ items, onSelect }: ComposerItemGridProps) {
  // Use a hardcoded currency for display only. Authoritative logic is server-side.
  const displayMinorDigits = 2; // This could come from context, but we use typical 2

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        No items in this category.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        const formattedPrice = minorToDisplay(
          item.priceMinor,
          displayMinorDigits,
        );

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="bg-card text-card-foreground flex flex-col items-start rounded-xl border p-3 text-left shadow-sm transition-transform active:scale-95 active:shadow-md"
          >
            <span className="mb-1 line-clamp-2 leading-tight font-medium">
              {item.name}
            </span>
            {item.description && (
              <span className="text-muted-foreground mb-2 line-clamp-2 text-xs">
                {item.description}
              </span>
            )}
            <div className="mt-auto flex w-full items-center justify-between">
              <span className="font-semibold text-green-600">
                ${formattedPrice}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
