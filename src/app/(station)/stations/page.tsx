import { StationModel } from "@/server/db/models";
import { connectToDatabase } from "@/server/db/connect";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Soup, Coffee, Monitor } from "lucide-react";

export const revalidate = 0; // Ensure fresh data

export default async function StationsSelectorPage() {
  await connectToDatabase();
  
  const stations = await StationModel.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kitchen Display System"
        title="Select Station"
        description="Choose a station to launch its dedicated Kitchen Display System (KDS) view."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {stations.map((station: any) => {
          const isBar = station.type === "BAR";
          const isKitchen = station.type === "KITCHEN";
          const Icon = isBar ? Coffee : isKitchen ? Soup : Monitor;

          return (
            <Link 
              key={station._id.toString()} 
              href={`/stations/${station._id.toString()}`}
              className="block outline-none"
            >
              <article className="group relative h-full overflow-hidden rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5 hover:ring-primary/30">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon aria-hidden="true" size={24} />
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {station.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground capitalize">
                  {station.type.toLowerCase()} Display
                </p>
                <div className="mt-6 flex items-center text-sm font-semibold text-primary/80 transition-colors group-hover:text-primary">
                  Launch Display <Monitor className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
