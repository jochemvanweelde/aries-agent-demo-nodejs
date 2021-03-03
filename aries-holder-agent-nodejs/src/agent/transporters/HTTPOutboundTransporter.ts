import { OutboundTransporter } from "aries-framework-javascript";
import fetch from "node-fetch";

class HttpOutboundTransporter implements OutboundTransporter {
  public async sendMessage(
    outboundPackage: any,
    receiveReply: boolean
  ): Promise<void> {
    const { payload, endpoint } = outboundPackage;

    if (!endpoint) {
      throw new Error(
        `Missing endpoint. I don't know how and where to send the message.`
      );
    }

    try {
      if (receiveReply) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/ssi-agent-wire" },
          body: JSON.stringify(payload),
        });
        const data = await response.text();
        const wireMessage = JSON.parse(data);
        return wireMessage;
      } else {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/ssi-agent-wire",
          },
          body: JSON.stringify(payload),
        });
      }
    } catch (e) {
      console.error("error sending message", e);
      throw e;
    }
  }
}

export { HttpOutboundTransporter };
