"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver } from "react-hook-form";
import { RoleSchema, type RoleFormData } from "@/shared/admin/schemas";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ShieldAlert } from "lucide-react";

type RoleType = RoleFormData & { _id: string; isSystem: boolean };
type PermissionType = { key: string; group: string; desc: string };

export default function RolesClient({
  initialRoles,
  permissionCatalog,
}: {
  initialRoles: RoleType[];
  permissionCatalog: PermissionType[];
}) {
  const [roles, setRoles] = useState<RoleType[]>(initialRoles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const form = useForm<RoleFormData>({
    resolver: zodResolver(RoleSchema) as unknown as Resolver<RoleFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: { name: "", description: "", permissions: [] },
  });

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Group permissions for UI
  const groupedPermissions = permissionCatalog.reduce(
    (acc, perm) => {
      if (!acc[perm.group]) acc[perm.group] = [];
      acc[perm.group]!.push(perm);
      return acc;
    },
    {} as Record<string, PermissionType[]>,
  );

  const openCreateDialog = () => {
    setEditingRole(null);
    form.reset({ name: "", description: "", permissions: [] });
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: RoleType) => {
    if (role.isSystem) {
      toast.error("System roles cannot be edited");
      return;
    }
    setEditingRole(role);
    form.reset({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingRole
        ? `/api/admin/roles/${editingRole._id}`
        : "/api/admin/roles";
      const method = editingRole ? "PUT" : "POST";

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
        editingRole ? "Role updated successfully" : "Role created successfully",
      );
      setIsDialogOpen(false);
      router.refresh();

      if (editingRole) {
        setRoles((prev) =>
          prev.map((r) => (r._id === editingRole._id ? { ...r, ...data } : r)),
        );
      } else {
        const { roleId } = await res.json();
        setRoles((prev) => [
          ...prev,
          { _id: roleId, ...data, isSystem: false },
        ]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRole = async (role: RoleType) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted");
      return;
    }
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`/api/admin/roles/${role._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete role");
      }

      toast.success("Role deleted successfully");
      setRoles((prev) => prev.filter((r) => r._id !== role._id));
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
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role) => (
                <TableRow key={role._id}>
                  <TableCell className="font-medium capitalize">
                    {role.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[250px] truncate text-sm">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    {role.isSystem ? (
                      <Badge
                        variant="secondary"
                        className="flex w-fit items-center"
                      >
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        System
                      </Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.isSystem
                      ? "Pre-defined"
                      : `${role.permissions.length} keys`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(role)}
                        disabled={role.isSystem}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteRole(role)}
                        disabled={role.isSystem}
                      >
                        <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. shift_lead" {...field} />
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
                        <Input
                          placeholder="Optional description..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h4 className="mb-4 text-sm font-semibold">Permissions</h4>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group} className="space-y-3">
                      <h5 className="text-muted-foreground border-b pb-1 text-xs font-semibold uppercase">
                        {group}
                      </h5>
                      {perms.map((perm) => (
                        <FormField
                          key={perm.key}
                          control={form.control}
                          name="permissions"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={perm.key}
                                className="flex flex-row items-start space-y-0 space-x-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(perm.key)}
                                    onCheckedChange={(checked: boolean) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            perm.key,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (val) => val !== perm.key,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-medium">
                                    {perm.desc}
                                  </FormLabel>
                                  <p className="text-muted-foreground font-mono text-[10px]">
                                    {perm.key}
                                  </p>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="mt-6 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
