import { notFound } from "next/navigation";
import { requireAuthentication } from "../../../../server/auth/session";
import { StationModel } from "../../../../server/db/models/station.model";
import { StationClient } from "./station-client";

export const metadata = {
  title: "Station Display | POS",
};

export default async function StationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify session server-side for early protection
  await requireAuthentication();

  const station = await StationModel.findById(id).lean();
  if (!station) {
    notFound();
  }

  return (
    <StationClient
      stationId={id}
      stationName={station.name}
      stationType={station.type}
    />
  );
}
