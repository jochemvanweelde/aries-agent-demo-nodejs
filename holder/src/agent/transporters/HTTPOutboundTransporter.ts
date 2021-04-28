import { Agent, OutboundPackage, OutboundTransporter } from "aries-framework";
import fetch from "node-fetch";

class HttpOutboundTransporter implements OutboundTransporter {
  private agent: Agent;

  public constructor(agent: Agent) {
    this.agent = agent;
  }
  public async sendMessage(
    outboundPackage: OutboundPackage,
    receiveReply: boolean
  ) {
    const { payload, endpoint } = outboundPackage;

    if (!endpoint) {
      throw new Error(
        `Missing endpoint. I don't know how and where to send the message.`
      );
    }

    if (receiveReply) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        this.agent.receiveMessage(await response.json());
        return response;
      } catch (e) {
        console.error(e);
      }
    } else {
      await fetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
    }
  }
}

export { HttpOutboundTransporter };
