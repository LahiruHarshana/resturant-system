import { getTicketShell } from "@/server/waiter/ticket-service";
import { getCompactMenu } from "@/server/waiter/menu-service";
import { notFound } from "next/navigation";
import { TicketClient } from "./ticket-client";

export default async function TicketShellPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let ticket;
  let menu;

  try {
    ticket = await getTicketShell(id);
    menu = await getCompactMenu();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Ticket not found") {
      notFound();
    }
    throw err;
  }

  return <TicketClient initialTicket={ticket} menu={menu} />;
}
