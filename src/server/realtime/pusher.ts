import Pusher from "pusher";
import { RealTimeProvider } from "./provider";

export class PusherRealTimeProvider implements RealTimeProvider {
  private pusher: Pusher;

  constructor(appId: string, key: string, secret: string, cluster: string) {
    this.pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  async publish(
    channel: string | string[],
    event: string,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.pusher.trigger(channel, event, payload);
    } catch (error) {
      console.error(
        `Failed to publish event '${event}' to channel '${channel}'`,
        error,
      );
    }
  }

  // We can also expose auth method if needed, but it's specific to Pusher.
  authenticate(
    socketId: string,
    channel: string,
    data?: Pusher.PresenceChannelData,
  ) {
    return this.pusher.authorizeChannel(socketId, channel, data);
  }
}
