import { ZodSchema } from "zod";
import {
  LineCreatedEventPayload,
  LineCreatedEventSchema,
  LineStatusChangedEventPayload,
  LineStatusChangedEventSchema,
  REALTIME_EVENTS,
  TicketUpdatedEventPayload,
  TicketUpdatedEventSchema,
  TicketClosedEventSchema,
} from "../../shared/realtime/events";
import {
  getAdminChannel,
  getCashierChannel,
  getStationChannel,
  getTableChannel,
} from "./channels";
import { getRealTimeProvider } from "./index";

/**
 * Validates and publishes an event safely.
 * Never throws exceptions to the caller to avoid breaking the main REST flow.
 */
async function safePublish<T>(
  channel: string | string[],
  eventName: string,
  payload: T,
  schema: ZodSchema<T>,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const validatedPayload = schema.parse(payload);
    const provider = getRealTimeProvider();
    await provider.publish(channel, eventName, validatedPayload);
    return { success: true };
  } catch (error) {
    console.error(
      `[RealTime] Publish validation/network error for event '${eventName}' to channel '${channel}'`,
      error,
    );
    return { success: false, error };
  }
}

export async function publishToStation(
  stationId: string,
  eventName: string,
  payload: unknown,
): Promise<{ success: boolean; error?: unknown }> {
  const channel = getStationChannel(stationId);

  if (eventName === REALTIME_EVENTS.LINE_CREATED_V1) {
    return safePublish(
      channel,
      eventName,
      payload as LineCreatedEventPayload,
      LineCreatedEventSchema,
    );
  }

  if (eventName === REALTIME_EVENTS.LINE_STATUS_CHANGED_V1) {
    return safePublish(
      channel,
      eventName,
      payload as LineStatusChangedEventPayload,
      LineStatusChangedEventSchema,
    );
  }

  // For unsupported events, we just log and return error
  console.warn(
    `[RealTime] Unsupported event '${eventName}' for station publish`,
  );
  return { success: false, error: new Error("Unsupported event type") };
}

export async function publishToTable(
  tableId: string,
  eventName: string,
  payload: unknown,
): Promise<{ success: boolean; error?: unknown }> {
  const channel = getTableChannel(tableId);

  if (eventName === REALTIME_EVENTS.TICKET_UPDATED_V1) {
    return safePublish(
      channel,
      eventName,
      payload as TicketUpdatedEventPayload,
      TicketUpdatedEventSchema,
    );
  }

  if (eventName === REALTIME_EVENTS.LINE_STATUS_CHANGED_V1) {
    return safePublish(
      channel,
      eventName,
      payload as LineStatusChangedEventPayload,
      LineStatusChangedEventSchema,
    );
  }

  console.warn(`[RealTime] Unsupported event '${eventName}' for table publish`);
  return { success: false, error: new Error("Unsupported event type") };
}

// Future implementations for Cashier / Admin as needed by guides
export async function publishToCashier(
  eventName: string,
  payload: unknown,
): Promise<{ success: boolean; error?: unknown }> {
  const channel = getCashierChannel();

  if (eventName === REALTIME_EVENTS.TICKET_CLOSED_V1) {
    return safePublish(channel, eventName, payload, TicketClosedEventSchema);
  }

  return safePublish(channel, eventName, payload, TicketUpdatedEventSchema); // Placeholder schema fallback
}

export async function publishToAdmin(
  eventName: string,
  payload: unknown,
): Promise<{ success: boolean; error?: unknown }> {
  const channel = getAdminChannel();
  // Placeholder schema mapping - add explicit types later when implementing admin realtime
  return safePublish(channel, eventName, payload, TicketUpdatedEventSchema);
}
