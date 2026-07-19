import { getFloorTables } from "@/server/waiter/floor-service";
import { FloorClient } from "./floor-client";

export const dynamic = "force-dynamic";

export default async function FloorPage() {
  const data = await getFloorTables();
  return <FloorClient initialData={data} />;
}
