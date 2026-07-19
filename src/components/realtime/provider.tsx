"use client";

import Pusher, { Channel } from "pusher-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConnectionState =
  "connecting" | "connected" | "disconnected" | "unavailable" | "error";

interface RealTimeContextValue {
  connectionState: ConnectionState;
  subscribe: (channelName: string) => Channel | null;
  unsubscribe: (channelName: string) => void;
}

export const RealTimeContext = createContext<RealTimeContextValue | null>(null);

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    // Only initialize if we have public keys
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      setConnectionState("unavailable");
      return;
    }

    setConnectionState("connecting");

    const pusher = new Pusher(key, {
      cluster,
      authEndpoint: "/api/realtime/auth",
      // Avoid raw logs in production unless debugging
      // activityTimeout, pongTimeout could be configured here
    });

    pusherRef.current = pusher;

    pusher.connection.bind("state_change", (states: { current: string }) => {
      switch (states.current) {
        case "connected":
          setConnectionState("connected");
          break;
        case "connecting":
          setConnectionState("connecting");
          break;
        case "disconnected":
        case "unavailable":
        case "failed":
          setConnectionState(
            states.current === "failed"
              ? "error"
              : (states.current as ConnectionState),
          );
          break;
      }
    });

    pusher.connection.bind("error", (err: unknown) => {
      console.error("[RealTime] Connection error:", err);
      setConnectionState("error");
    });

    return () => {
      pusher.disconnect();
      pusherRef.current = null;
      setConnectionState("disconnected");
    };
  }, []);

  const subscribe = (channelName: string): Channel | null => {
    if (!pusherRef.current) return null;
    return pusherRef.current.subscribe(channelName);
  };

  const unsubscribe = (channelName: string) => {
    if (!pusherRef.current) return;
    pusherRef.current.unsubscribe(channelName);
  };

  return (
    <RealTimeContext.Provider
      value={{ connectionState, subscribe, unsubscribe }}
    >
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealtimeConnection() {
  const ctx = useContext(RealTimeContext);
  if (!ctx) {
    throw new Error(
      "useRealtimeConnection must be used within a RealTimeProvider",
    );
  }
  return ctx;
}
