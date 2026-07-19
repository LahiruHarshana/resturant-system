export const CHANNEL_PREFIXES = {
  STATION: "private-station-",
  TABLE: "private-table-",
  CASHIER: "private-cashier",
  ADMIN: "private-admin",
  TICKET: "private-ticket-",
  USER: "private-user-",
};

/**
 * Sanitizes an ID to ensure it only contains safe characters.
 */
function sanitizeId(id: string): string {
  // Allow alphanumeric, dashes, and underscores
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(
      `Invalid or empty ID provided for channel generation: ${id}`,
    );
  }
  return id;
}

export function getStationChannel(stationId: string): string {
  return `${CHANNEL_PREFIXES.STATION}${sanitizeId(stationId)}`;
}

export function getTableChannel(tableId: string): string {
  return `${CHANNEL_PREFIXES.TABLE}${sanitizeId(tableId)}`;
}

export function getCashierChannel(): string {
  return CHANNEL_PREFIXES.CASHIER;
}

export function getAdminChannel(): string {
  return CHANNEL_PREFIXES.ADMIN;
}

export function getTicketChannel(ticketId: string): string {
  return `${CHANNEL_PREFIXES.TICKET}${sanitizeId(ticketId)}`;
}

export function getUserChannel(userId: string): string {
  return `${CHANNEL_PREFIXES.USER}${sanitizeId(userId)}`;
}
