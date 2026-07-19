export interface RealTimeProvider {
  publish(
    channel: string | string[],
    event: string,
    payload: unknown,
  ): Promise<void>;
}

export class TestRealTimeProvider implements RealTimeProvider {
  public publishedEvents: Array<{
    channel: string | string[];
    event: string;
    payload: unknown;
  }> = [];

  async publish(
    channel: string | string[],
    event: string,
    payload: unknown,
  ): Promise<void> {
    this.publishedEvents.push({ channel, event, payload });
  }

  clear() {
    this.publishedEvents = [];
  }
}
