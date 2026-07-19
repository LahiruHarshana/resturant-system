import "server-only";

import { requirePermission } from "../auth/authorization";
import { StationModel } from "../db/models/station.model";

export async function authorizeStationAccess(
  stationId: string,
  action: "read" | "status",
) {
  const station = await StationModel.findById(stationId).lean();

  if (!station) {
    throw new Error("Station not found");
  }

  const permission =
    `line:${action}:${station.type.toLowerCase()}` as Parameters<
      typeof requirePermission
    >[0];

  const { userId } = await requirePermission(permission);

  return { userId, station };
}
