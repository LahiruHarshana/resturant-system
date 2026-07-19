"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver } from "react-hook-form";
import { CategorySchema, type CategoryFormData } from "@/shared/admin/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Pencil,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Save,
  Plus,
} from "lucide-react";

type CategoryType = {
  _id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export default function CategoriesClient({
  initialCategories,
}: {
  initialCategories: CategoryType[];
}) {
  const [categories, setCategories] =
    useState<CategoryType[]>(initialCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  const router = useRouter();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(
      CategorySchema,
    ) as unknown as Resolver<CategoryFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: {
      name: "",
      isActive: true,
      sortOrder:
        categories.length > 0
          ? Math.max(...categories.map((c) => c.sortOrder)) + 1
          : 1,
    },
  });

  // Sort and filter locally
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories]);

  const filteredCategories = sortedCategories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      isActive: true,
      sortOrder:
        categories.length > 0
          ? Math.max(...categories.map((c) => c.sortOrder)) + 1
          : 1,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: CategoryType) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory._id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";

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
        editingCategory
          ? "Category updated successfully"
          : "Category created successfully",
      );
      setIsDialogOpen(false);
      router.refresh();

      if (editingCategory) {
        setCategories((prev) =>
          prev.map((c) =>
            c._id === editingCategory._id ? { ...c, ...data } : c,
          ),
        );
      } else {
        const { categoryId } = await res.json();
        setCategories((prev) => [...prev, { _id: categoryId, ...data }]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivateCategory = async (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (!confirm("Are you sure you want to deactivate this category?"))
        return;
    }

    try {
      const category = categories.find((c) => c._id === id);
      if (!category) return;

      const res = await fetch(`/api/admin/categories/${id}?soft=true`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Category ${currentStatus ? "deactivated" : "activated"}`);
      setCategories((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, isActive: !currentStatus } : c,
        ),
      );
      router.refresh();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    }
  };

  const moveCategory = (index: number, direction: "up" | "down") => {
    if (search !== "") {
      toast.warning("Clear search before reordering");
      return;
    }
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sortedCategories.length - 1) return;

    const newCategories = [...sortedCategories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap sortOrders
    const currentSortOrder = newCategories[index]!.sortOrder;
    newCategories[index]!.sortOrder = newCategories[targetIndex]!.sortOrder;
    newCategories[targetIndex]!.sortOrder = currentSortOrder;

    setCategories(newCategories);
    setHasUnsavedOrder(true);
  };

  const saveOrder = async () => {
    setIsReordering(true);
    try {
      const updates = sortedCategories.map((c) => ({
        id: c._id,
        sortOrder: c.sortOrder,
      }));

      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) throw new Error("Failed to save order");

      toast.success("Category order saved successfully");
      setHasUnsavedOrder(false);
      router.refresh();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {hasUnsavedOrder && (
            <Button
              variant="secondary"
              onClick={saveOrder}
              disabled={isReordering}
            >
              <Save className="mr-2 h-4 w-4" />
              {isReordering ? "Saving..." : "Save Order"}
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category, index) => (
                <TableRow key={category._id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || search !== ""}
                        onClick={() => moveCategory(index, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={
                          index === filteredCategories.length - 1 ||
                          search !== ""
                        }
                        onClick={() => moveCategory(index, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <span className="text-muted-foreground ml-2 w-4 text-center text-sm">
                        {category.sortOrder}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={category.isActive ? "default" : "secondary"}
                      className={
                        category.isActive
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deactivateCategory(category._id, category.isActive)
                        }
                        title={category.isActive ? "Deactivate" : "Activate"}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mains" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-4 flex items-center gap-4">
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="mt-8 flex flex-1 flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
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

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
