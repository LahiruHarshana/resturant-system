"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver } from "react-hook-form";
import { MenuItemSchema, type MenuItemFormData } from "@/shared/admin/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, ArrowUpDown, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DropdownItem = { _id: string; name: string };

type MenuItemType = MenuItemFormData & { _id: string };

export default function MenuItemsClient({
  initialItems,
  categories,
  stations,
}: {
  initialItems: MenuItemType[];
  categories: DropdownItem[];
  stations: DropdownItem[];
}) {
  const [items, setItems] = useState<MenuItemType[]>(initialItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(
      MenuItemSchema,
    ) as unknown as Resolver<MenuItemFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      stationId: "",
      priceMajor: "0.00",
      isAvailable: true,
      sortOrder: 0,
      imageUrl: "",
      modifiers: [],
    },
  });

  const {
    fields: modifierGroups,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({
    control: form.control,
    name: "modifiers",
  });

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({
      name: "",
      description: "",
      categoryId: categories[0]?._id || "",
      stationId: stations[0]?._id || "",
      priceMajor: "0.00",
      isAvailable: true,
      sortOrder: 0,
      imageUrl: "",
      modifiers: [],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: MenuItemType) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      stationId: item.stationId,
      priceMajor: item.priceMajor,
      isAvailable: item.isAvailable,
      sortOrder: item.sortOrder,
      imageUrl: item.imageUrl,
      modifiers: item.modifiers,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: MenuItemFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingItem
        ? `/api/admin/menu-items/${editingItem._id}`
        : "/api/admin/menu-items";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || errData.message || "Something went wrong",
        );
      }

      toast.success(
        editingItem
          ? "Menu item updated successfully"
          : "Menu item created successfully",
      );
      setIsDialogOpen(false);
      router.refresh();

      if (editingItem) {
        setItems((prev) =>
          prev.map((i) => (i._id === editingItem._id ? { ...i, ...data } : i)),
        );
      } else {
        const { itemId } = await res.json();
        setItems((prev) => [...prev, { _id: itemId, ...data }]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivateItem = async (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (!confirm("Are you sure you want to deactivate this item?")) return;
    }

    try {
      const item = items.find((i) => i._id === id);
      if (!item) return;

      const res = await fetch(`/api/admin/menu-items/${id}?soft=true`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Item ${currentStatus ? "deactivated" : "activated"}`);
      setItems((prev) =>
        prev.map((i) =>
          i._id === id ? { ...i, isAvailable: !currentStatus } : i,
        ),
      );
      router.refresh();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const categoryName =
                  categories.find((c) => c._id === item.categoryId)?.name ||
                  "Unknown";
                return (
                  <TableRow key={item._id}>
                    <TableCell>
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-md text-xs">
                          None
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{categoryName}</TableCell>
                    <TableCell>{item.priceMajor}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.isAvailable ? "default" : "secondary"}
                        className={
                          item.isAvailable
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {item.isAvailable ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            deactivateItem(item._id, item.isAvailable)
                          }
                          title={item.isAvailable ? "Deactivate" : "Activate"}
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Create Menu Item"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">General & Pricing</TabsTrigger>
                  <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Cheeseburger"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Optional description..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="priceMajor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price</FormLabel>
                              <FormControl>
                                <Input placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sortOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sort Order</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((c) => (
                                    <SelectItem key={c._id} value={c._id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="stationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Station</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Station" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {stations.map((s) => (
                                    <SelectItem key={s._id} value={s._id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="isAvailable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Available</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Image</FormLabel>
                            <FormControl>
                              <ImageUpload
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="modifiers" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Modifier Groups</h4>
                        <p className="text-muted-foreground text-xs">
                          Add groups like &apos;Size&apos; or
                          &apos;Add-ons&apos;
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendGroup({
                            name: "",
                            minSelections: 0,
                            maxSelections: 1,
                            options: [{ name: "", priceDeltaMajor: "0.00" }],
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Group
                      </Button>
                    </div>

                    {modifierGroups.map((group, groupIndex) => (
                      <div
                        key={group.id}
                        className="bg-muted/20 space-y-4 rounded-lg border p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="grid flex-1 grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`modifiers.${groupIndex}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Group Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Size" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`modifiers.${groupIndex}.minSelections`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Min Selections</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={0} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`modifiers.${groupIndex}.maxSelections`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Max Selections</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={1} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive mt-6"
                            onClick={() => removeGroup(groupIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Nested Field Array for Options */}
                        <OptionsFieldArray
                          control={form.control}
                          groupIndex={groupIndex}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Control } from "react-hook-form";

// Sub-component to manage nested field array cleanly
function OptionsFieldArray({
  control,
  groupIndex,
}: {
  control: Control<MenuItemFormData>;
  groupIndex: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `modifiers.${groupIndex}.options` as "modifiers.0.options",
  });

  return (
    <div className="space-y-2 border-l-2 pl-4">
      <div className="mb-2 flex items-center justify-between">
        <h5 className="text-muted-foreground text-sm font-medium">Options</h5>
      </div>

      {fields.map((option, optionIndex) => (
        <div key={option.id} className="flex items-start gap-2">
          <FormField
            control={control}
            name={
              `modifiers.${groupIndex}.options.${optionIndex}.name` as "modifiers.0.options.0.name"
            }
            render={({ field }) => (
              <FormItem className="flex-1 space-y-1">
                {optionIndex === 0 && (
                  <FormLabel className="text-xs">Option Name</FormLabel>
                )}
                <FormControl>
                  <Input
                    placeholder="e.g. Large"
                    className="h-8 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={
              `modifiers.${groupIndex}.options.${optionIndex}.priceDeltaMajor` as "modifiers.0.options.0.priceDeltaMajor"
            }
            render={({ field }) => (
              <FormItem className="w-32 space-y-1">
                {optionIndex === 0 && (
                  <FormLabel className="text-xs">Extra Price</FormLabel>
                )}
                <FormControl>
                  <Input
                    placeholder="0.00"
                    className="h-8 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className={optionIndex === 0 ? "pt-5" : "pt-0"}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
              onClick={() => remove(optionIndex)}
              disabled={fields.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-8 text-xs"
        onClick={() => append({ name: "", priceDeltaMajor: "0.00" })}
      >
        <Plus className="mr-1 h-3 w-3" /> Add Option
      </Button>
    </div>
  );
}
