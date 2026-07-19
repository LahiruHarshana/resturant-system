"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver } from "react-hook-form";
import { UserSchema, type UserFormData } from "@/shared/admin/schemas";

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
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, Key, Asterisk } from "lucide-react";

type RoleType = { _id: string; name: string };
type UserType = Omit<UserFormData, "roles" | "resetPin" | "resetPassword"> & {
  _id: string;
  roles: RoleType[];
};

export default function UsersClient({
  initialUsers,
  roles,
  currentUserId,
}: {
  initialUsers: UserType[];
  roles: RoleType[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserType[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // Credentials modal state
  const [credentials, setCredentials] = useState<{
    tempPassword?: string;
    tempPin?: string;
  } | null>(null);

  const router = useRouter();

  const form = useForm<UserFormData>({
    resolver: zodResolver(UserSchema) as unknown as Resolver<UserFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: {
      name: "",
      email: "",
      phone: "",
      roles: [],
      isActive: true,
      pinEnabled: false,
      resetPassword: false,
      resetPin: false,
    },
  });

  const pinEnabled = form.watch("pinEnabled");

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateDialog = () => {
    setEditingUser(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      roles: [],
      isActive: true,
      pinEnabled: false,
      resetPassword: false,
      resetPin: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserType) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      roles: user.roles.map((r) => r._id),
      isActive: user.isActive,
      pinEnabled: user.pinEnabled,
      resetPassword: false,
      resetPin: false,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser._id}`
        : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";

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

      const result = await res.json();

      toast.success(
        editingUser ? "User updated successfully" : "User created successfully",
      );
      setIsDialogOpen(false);
      router.refresh();

      if (editingUser) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === editingUser._id
              ? {
                  ...u,
                  ...data,
                  roles: data.roles.map((rid) =>
                    roles.find((r) => r._id === rid)!,
                  ),
                }
              : u,
          ),
        );
      } else {
        setUsers((prev) => [
          ...prev,
          {
            ...data,
            _id: result.userId,
            roles: data.roles.map((rid) => roles.find((r) => r._id === rid)!),
          },
        ]);
      }

      if (result.tempPassword || result.tempPin) {
        setCredentials({
          tempPassword: result.tempPassword,
          tempPin: result.tempPin,
        });
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Security</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    {user.name}
                    {user._id === currentUserId && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <Badge
                          key={r._id}
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {r.name.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? "default" : "secondary"}
                      className={user.isActive ? "bg-green-600" : ""}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.pinEnabled ? (
                        <span title="PIN Enabled">
                          <Asterisk className="text-primary h-4 w-4" />
                        </span>
                      ) : (
                        <span title="PIN Disabled">
                          <Asterisk className="text-muted h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Create User"}
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
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Roles</FormLabel>
                <div className="bg-muted/20 grid grid-cols-2 gap-2 rounded-md border p-4">
                  {roles.map((role) => (
                    <FormField
                      key={role._id}
                      control={form.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(role._id)}
                              onCheckedChange={(checked: boolean) => {
                                return checked
                                  ? field.onChange([...field.value, role._id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (v) => v !== role._id,
                                      ),
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer font-normal capitalize">
                            {role.name.replace(/_/g, " ")}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {form.formState.errors.roles && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.roles.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Account Active</FormLabel>
                        <FormDescription>Can login</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={editingUser?._id === currentUserId}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pinEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enable PIN</FormLabel>
                        <FormDescription>Fast POS login</FormDescription>
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

              {editingUser && (
                <div className="space-y-4 rounded-md border bg-amber-50/50 p-4 dark:bg-amber-950/20">
                  <h4 className="flex items-center text-sm font-semibold">
                    <Key className="mr-2 h-4 w-4" />
                    Security Actions
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="resetPassword"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-y-0 space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Reset Password
                            </FormLabel>
                            <p className="text-muted-foreground text-xs">
                              Generates a temporary password
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {pinEnabled && (
                      <FormField
                        control={form.control}
                        name="resetPin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-y-0 space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">
                                Reset PIN
                              </FormLabel>
                              <p className="text-muted-foreground text-xs">
                                Generates a new 4-digit PIN
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credentials Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-destructive text-sm font-medium">
              Please copy these credentials now. They will not be shown again.
            </p>
            {credentials?.tempPassword && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Temporary Password
                </label>
                <div className="bg-muted rounded-md p-3 text-center font-mono text-lg select-all">
                  {credentials.tempPassword}
                </div>
              </div>
            )}
            {credentials?.tempPin && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Temporary PIN</label>
                <div className="bg-muted rounded-md p-3 text-center font-mono text-2xl tracking-[0.5em] select-all">
                  {credentials.tempPin}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
