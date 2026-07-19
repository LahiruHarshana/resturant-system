"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver } from "react-hook-form";
import {
  TableSchema,
  ZoneSchema,
  type TableFormData,
  type ZoneFormData,
} from "@/shared/admin/schemas";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

type ZoneType = ZoneFormData & { _id: string };
type TableType = TableFormData & { _id: string; currentTicketId?: string };

export default function TablesClient({
  initialTables,
  initialZones,
}: {
  initialTables: TableType[];
  initialZones: ZoneType[];
}) {
  const [tables, setTables] = useState<TableType[]>(initialTables);
  const [zones, setZones] = useState<ZoneType[]>(initialZones);

  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);

  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const [editingZone, setEditingZone] = useState<ZoneType | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTable, setSearchTable] = useState("");
  const [searchZone, setSearchZone] = useState("");

  const router = useRouter();

  const tableForm = useForm<TableFormData>({
    resolver: zodResolver(TableSchema) as unknown as Resolver<TableFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: {
      label: "",
      seats: 4,
      zone: zones[0]?.name || "",
      status: "AVAILABLE",
    },
  });

  const zoneForm = useForm<ZoneFormData>({
    resolver: zodResolver(ZoneSchema) as unknown as Resolver<ZoneFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: { name: "", isActive: true, sortOrder: 0 },
  });

  const filteredTables = tables.filter((t) =>
    t.label.toLowerCase().includes(searchTable.toLowerCase()),
  );

  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(searchZone.toLowerCase()),
  );

  const onTableSubmit = async (data: TableFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingTable
        ? `/api/admin/tables/${editingTable._id}`
        : "/api/admin/tables";
      const method = editingTable ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed");
      }

      toast.success(editingTable ? "Table updated" : "Table created");
      setIsTableDialogOpen(false);
      router.refresh();

      if (editingTable) {
        setTables((prev) =>
          prev.map((t) => (t._id === editingTable._id ? { ...t, ...data } : t)),
        );
      } else {
        const { tableId } = await res.json();
        setTables((prev) => [...prev, { _id: tableId, ...data }]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onZoneSubmit = async (data: ZoneFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingZone
        ? `/api/admin/zones/${editingZone._id}`
        : "/api/admin/zones";
      const method = editingZone ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed");
      }

      toast.success(editingZone ? "Zone updated" : "Zone created");
      setIsZoneDialogOpen(false);
      router.refresh();

      if (editingZone) {
        setZones((prev) =>
          prev.map((z) => (z._id === editingZone._id ? { ...z, ...data } : z)),
        );
        // Also update tables locally to reflect zone name change
        if (editingZone.name !== data.name) {
          setTables((prev) =>
            prev.map((t) =>
              t.zone === editingZone.name ? { ...t, zone: data.name } : t,
            ),
          );
        }
      } else {
        const { zoneId } = await res.json();
        setZones((prev) => [...prev, { _id: zoneId, ...data }]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTable = async (table: TableType) => {
    if (table.currentTicketId) {
      toast.error(
        "Cannot delete a table with an active ticket. Deactivate it instead.",
      );
      return;
    }
    if (!confirm("Are you sure you want to delete this table?")) return;

    try {
      const res = await fetch(`/api/admin/tables/${table._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete table");
      toast.success("Table deleted");
      setTables((prev) => prev.filter((t) => t._id !== table._id));
      router.refresh();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search tables..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => {
                setEditingTable(null);
                tableForm.reset({
                  label: "",
                  seats: 4,
                  zone: zones[0]?.name || "",
                  status: "AVAILABLE",
                });
                setIsTableDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Table
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl glass-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No tables found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTables.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell>{t.zone}</TableCell>
                      <TableCell>{t.seats}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.status === "AVAILABLE"
                              ? "default"
                              : t.status === "INACTIVE"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTable(t);
                              tableForm.reset(t);
                              setIsTableDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteTable(t)}
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
        </TabsContent>

        <TabsContent value="zones" className="space-y-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search zones..."
              value={searchZone}
              onChange={(e) => setSearchZone(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => {
                setEditingZone(null);
                zoneForm.reset({ name: "", isActive: true, sortOrder: 0 });
                setIsZoneDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Zone
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl glass-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No zones found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredZones.map((z) => (
                    <TableRow key={z._id}>
                      <TableCell className="font-medium">{z.name}</TableCell>
                      <TableCell>{z.sortOrder}</TableCell>
                      <TableCell>
                        <Badge
                          variant={z.isActive ? "default" : "secondary"}
                          className={
                            z.isActive ? "bg-green-600 hover:bg-green-700" : ""
                          }
                        >
                          {z.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingZone(z);
                              zoneForm.reset(z);
                              setIsZoneDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Create Table"}
            </DialogTitle>
          </DialogHeader>
          <Form {...tableForm}>
            <form
              onSubmit={tableForm.handleSubmit(onTableSubmit)}
              className="space-y-4"
            >
              <FormField
                control={tableForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. T-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={tableForm.control}
                  name="seats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seats</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tableForm.control}
                  name="zone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {zones
                            .filter((z) => z.isActive)
                            .map((z) => (
                              <SelectItem key={z._id} value={z.name}>
                                {z.name}
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
                control={tableForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="OCCUPIED">
                          Occupied (Forced override)
                        </SelectItem>
                        <SelectItem value="RESERVED">Reserved</SelectItem>
                        <SelectItem value="INACTIVE">
                          Inactive (Deactivated)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTableDialogOpen(false)}
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

      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZone ? "Edit Zone" : "Create Zone"}
            </DialogTitle>
          </DialogHeader>
          <Form {...zoneForm}>
            <form
              onSubmit={zoneForm.handleSubmit(onZoneSubmit)}
              className="space-y-4"
            >
              <FormField
                control={zoneForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Patio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4">
                <FormField
                  control={zoneForm.control}
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
                  control={zoneForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="mt-8 flex flex-1 flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel>Active</FormLabel>
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
                  onClick={() => setIsZoneDialogOpen(false)}
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
