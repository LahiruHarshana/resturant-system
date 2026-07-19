"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver } from "react-hook-form";
import { StationSchema, type StationFormData } from "@/shared/admin/schemas";
import { STATION_TYPES } from "@/server/db/models/constants";

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Pencil, Plus, ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";

type StationType = {
  _id: string;
  name: string;
  type: string;
  isActive: boolean;
  sortOrder: number;
};

export default function StationsClient({
  initialStations,
}: {
  initialStations: StationType[];
}) {
  const [stations, setStations] = useState<StationType[]>(initialStations);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<StationType | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const form = useForm<StationFormData>({
    resolver: zodResolver(
      StationSchema,
    ) as unknown as Resolver<StationFormData>, // Narrowly justified unknown conversion because z.infer and z.input mismatch with react-hook-form

    defaultValues: {
      name: "",
      type: "KITCHEN",
      isActive: true,
      sortOrder: 0,
    },
  });

  const filteredStations = stations.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateDialog = () => {
    setEditingStation(null);
    form.reset({ name: "", type: "KITCHEN", isActive: true, sortOrder: 0 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (station: StationType) => {
    setEditingStation(station);
    form.reset({
      name: station.name,
      type: station.type as "KITCHEN" | "BAR" | "CUSTOM",
      isActive: station.isActive,
      sortOrder: station.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StationFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingStation
        ? `/api/admin/stations/${editingStation._id}`
        : "/api/admin/stations";
      const method = editingStation ? "PUT" : "POST";

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
        editingStation
          ? "Station updated successfully"
          : "Station created successfully",
      );
      setIsDialogOpen(false);

      // We should ideally fetch the new list or use mutate from swr/react-query.
      // For simplicity here, we'll refresh the page router.
      router.refresh();

      // Update local state temporarily for snappy UI
      if (editingStation) {
        setStations((prev) =>
          prev.map((s) =>
            s._id === editingStation._id ? { ...s, ...data } : s,
          ),
        );
      } else {
        const { stationId } = await res.json();
        setStations((prev) => [...prev, { _id: stationId, ...data }]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivateStation = async (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (!confirm("Are you sure you want to deactivate this station?")) return;
    }

    try {
      // Just toggle status
      const station = stations.find((s) => s._id === id);
      if (!station) return;

      const res = await fetch(`/api/admin/stations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: station.name,
          type: station.type,
          isActive: !currentStatus,
          sortOrder: station.sortOrder,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Station ${currentStatus ? "deactivated" : "activated"}`);
      setStations((prev) =>
        prev.map((s) =>
          s._id === id ? { ...s, isActive: !currentStatus } : s,
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
          placeholder="Search stations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Station
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl glass-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  No stations found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStations.map((station) => (
                <TableRow key={station._id}>
                  <TableCell className="font-medium">{station.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{station.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={station.isActive ? "default" : "secondary"}
                      className={
                        station.isActive
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                    >
                      {station.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {station.sortOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Launch Station"
                      >
                        <Link href={`/stations/${station._id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(station)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deactivateStation(station._id, station.isActive)
                        }
                        title={station.isActive ? "Deactivate" : "Activate"}
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
              {editingStation ? "Edit Station" : "Create Station"}
            </DialogTitle>
            <DialogDescription>
              Stations receive tickets based on their type. Kitchen stations
              receive kitchen tickets, bar receives bar tickets.
            </DialogDescription>
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
                      <Input placeholder="e.g. Main Kitchen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-4">
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
