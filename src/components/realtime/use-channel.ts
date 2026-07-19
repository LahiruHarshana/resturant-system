"use client";

import { useEffect, useRef } from "react";
import { ZodSchema } from "zod";
import { useRealtimeConnection } from "./provider";

interface UseRealtimeChannelOptions<T> {
  channelName: string;
  eventName: string;
  schema: ZodSchema<T>;
  onEvent: (payload: T) => void;
  enabled?: boolean;
}

export function useRealtimeChannel<T>({
  channelName,
  eventName,
  schema,
  onEvent,
  enabled = true,
}: UseRealtimeChannelOptions<T>) {
  const { subscribe, unsubscribe, connectionState } = useRealtimeConnection();
  const onEventRef = useRef(onEvent);

  // Keep latest callback ref to avoid re-binding if onEvent changes
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || connectionState !== "connected") {
      return;
    }

    const channel = subscribe(channelName);
    if (!channel) return;

    const handler = (rawPayload: unknown) => {
      try {
        const validatedPayload = schema.parse(rawPayload);
        onEventRef.current(validatedPayload);
      } catch (error) {
        console.warn(
          `[RealTime] Client dropped invalid payload for event '${eventName}':`,
          error,
        );
      }
    };

    // Unbind previous handler if any to prevent duplicates during strict-mode remounts
    channel.unbind(eventName);
    channel.bind(eventName, handler);

    return () => {
      channel.unbind(eventName, handler);
      unsubscribe(channelName);
    };
  }, [
    channelName,
    eventName,
    schema,
    enabled,
    subscribe,
    unsubscribe,
    connectionState,
  ]);
}
