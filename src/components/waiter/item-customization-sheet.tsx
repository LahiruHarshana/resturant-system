import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus } from "lucide-react";
import type {
  WaiterMenuItemDTO,
  OrderLineModifierSelection,
} from "@/shared/waiter/schemas";
import { useOrderCart } from "@/hooks/use-order-cart";
import {
  minorToDisplay,
  addMinor,
  multiplyMinorByQuantity,
} from "@/shared/money/money";

interface ItemCustomizationSheetProps {
  item?: WaiterMenuItemDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
}

export function ItemCustomizationSheet({
  item,
  open,
  onOpenChange,
  ticketId,
}: ItemCustomizationSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [selections, setSelections] = useState<OrderLineModifierSelection[]>(
    [],
  );
  const addItemToCart = useOrderCart((state) => state.addItem);

  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      setNote("");
      // Auto-select first option for radio groups if required
      const initialSelections: OrderLineModifierSelection[] = [];
      item.modifiers?.forEach((group) => {
        if (
          group.minSelections === 1 &&
          group.maxSelections === 1 &&
          group.options.length > 0
        ) {
          initialSelections.push({
            groupName: group.name,
            optionName: group.options[0]?.name || "",
          });
        }
      });
      setSelections(initialSelections);
    }
  }, [open, item]);

  if (!item) return null;

  const handleSelection = (
    groupName: string,
    optionName: string,
    max: number,
    isRadio: boolean,
  ) => {
    setSelections((prev) => {
      if (isRadio) {
        return [
          ...prev.filter((s) => s.groupName !== groupName),
          { groupName, optionName },
        ];
      }

      const exists = prev.find(
        (s) => s.groupName === groupName && s.optionName === optionName,
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.groupName === groupName && s.optionName === optionName),
        );
      }

      const currentGroupSelections = prev.filter(
        (s) => s.groupName === groupName,
      );
      if (currentGroupSelections.length < max) {
        return [...prev, { groupName, optionName }];
      }
      return prev;
    });
  };

  const isFormValid = () => {
    if (!item?.modifiers) return true;
    for (const group of item.modifiers) {
      const selectedCount = selections.filter(
        (s) => s.groupName === group?.name,
      ).length;
      if (
        selectedCount < (group?.minSelections || 0) ||
        selectedCount > (group?.maxSelections || 0)
      ) {
        return false;
      }
    }
    return true;
  };

  const handleAdd = () => {
    if (!isFormValid()) return;
    addItemToCart(ticketId, {
      menuItemId: item.id,
      quantity,
      note,
      modifierSelections: selections,
    });
    onOpenChange(false);
  };

  // Calculate estimated total
  let modifiersTotalMinor = 0;
  for (const sel of selections) {
    const group = item.modifiers?.find((g) => g.name === sel.groupName);
    const opt = group?.options.find((o) => o.name === sel.optionName);
    if (opt?.priceDeltaMinor) {
      modifiersTotalMinor = addMinor(modifiersTotalMinor, opt.priceDeltaMinor);
    }
  }
  const itemBasePrice = item.priceMinor;
  const lineTotalMinor = multiplyMinorByQuantity(
    addMinor(itemBasePrice, modifiersTotalMinor),
    quantity,
  );
  const formattedTotal = minorToDisplay(lineTotalMinor, 2);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl">{item.name}</DrawerTitle>
          {item.description && (
            <p className="text-muted-foreground text-sm">{item.description}</p>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          {/* Modifiers */}
          {item.modifiers?.map((group) => {
            const isRadio =
              group.minSelections === 1 && group.maxSelections === 1;
            const currentSelected = selections.filter(
              (s) => s.groupName === group?.name,
            );
            const isValid =
              currentSelected.length >= group.minSelections &&
              currentSelected.length <= group.maxSelections;

            return (
              <div key={group.name} className="mb-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-semibold">{group.name}</h3>
                  <span className="text-muted-foreground text-xs">
                    {group.minSelections > 0 ? "Required" : "Optional"}
                    {group.maxSelections > 1
                      ? ` (Max ${group.maxSelections})`
                      : ""}
                  </span>
                </div>
                {!isValid && group.minSelections > 0 && (
                  <p className="text-destructive mb-2 text-xs">
                    Please make a selection
                  </p>
                )}

                {isRadio ? (
                  <div className="space-y-3">
                    {group.options.map((opt) => (
                      <div
                        key={opt.name}
                        className="flex items-center justify-between space-x-2"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={group.name}
                            value={opt.name}
                            id={`${group.name}-${opt.name}`}
                            checked={
                              currentSelected[0]?.optionName === opt.name
                            }
                            onChange={(e) =>
                              handleSelection(
                                group.name,
                                e.target.value,
                                group.maxSelections,
                                true,
                              )
                            }
                            className="border-primary text-primary focus-visible:ring-ring h-4 w-4 rounded-full border shadow focus:outline-none focus-visible:ring-1"
                          />
                          <Label
                            htmlFor={`${group.name}-${opt.name}`}
                            className="font-normal"
                          >
                            {opt.name}
                          </Label>
                        </div>
                        {opt.priceDeltaMinor > 0 && (
                          <span className="text-muted-foreground text-sm">
                            +${minorToDisplay(opt.priceDeltaMinor, 2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {group.options.map((opt) => {
                      const isChecked = !!currentSelected.find(
                        (s) => s.optionName === opt.name,
                      );
                      const disabled =
                        !isChecked &&
                        currentSelected.length >= group.maxSelections;
                      return (
                        <div
                          key={opt.name}
                          className="flex items-center justify-between space-x-2"
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${group.name}-${opt.name}`}
                              checked={isChecked}
                              disabled={disabled}
                              onCheckedChange={() =>
                                handleSelection(
                                  group.name,
                                  opt.name,
                                  group.maxSelections,
                                  false,
                                )
                              }
                            />
                            <Label
                              htmlFor={`${group.name}-${opt.name}`}
                              className="font-normal"
                            >
                              {opt.name}
                            </Label>
                          </div>
                          {opt.priceDeltaMinor > 0 && (
                            <span className="text-muted-foreground text-sm">
                              +${minorToDisplay(opt.priceDeltaMinor, 2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quantity */}
          <div className="mb-6 flex items-center justify-between rounded-lg border p-4">
            <span className="font-medium">Quantity</span>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center text-lg font-medium">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <Label htmlFor="note">Special Instructions</Label>
            <Input
              id="note"
              placeholder="e.g. Allergy to peanuts, extra spicy..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="mt-2"
            />
            <p className="text-muted-foreground mt-1 text-right text-xs">
              {note.length}/500
            </p>
          </div>
        </div>

        <DrawerFooter className="border-t pt-2">
          <Button
            onClick={handleAdd}
            disabled={!isFormValid()}
            size="lg"
            className="h-14 w-full text-lg"
          >
            Add to Ticket - ${formattedTotal}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
