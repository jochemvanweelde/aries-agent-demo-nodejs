import { Agent, InboundTransporter } from "aries-framework-javascript";
import fetch from "node-fetch";

class PollingInboundTransporter implements InboundTransporter {
  public stop: boolean;

  public constructor() {
    this.stop = false;
  }
  public async start(agent: Agent): Promise<void> {
    await this.registerMediator(agent);
  }

  public async registerMediator(agent: Agent): Promise<void> {
    try {
      const mediatorUrl = agent.getMediatorUrl();
      const mediatorInvitationUrlResponse = await fetch(
        `${mediatorUrl}/invitation`
      );
      const response = await fetch(`${mediatorUrl}/`);
      const { verkey } = JSON.parse(await response.text());
      const invitationUrl = await mediatorInvitationUrlResponse.text();
      await agent.routing.provision({
        verkey,
        invitationUrl,
      });
      this.pollDownloadMessages(agent);
    } catch (error) {
      console.warn(error);
    }
  }
  private pollDownloadMessages(agent: Agent): void {
    setInterval(async () => {
      const downloadedMessages = await agent.routing.downloadMessages();

      for (const message of downloadedMessages) {
        await agent.receiveMessage(message);
      }
    }, 10000);
  }
}

export { PollingInboundTransporter };
