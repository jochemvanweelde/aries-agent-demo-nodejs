import {
  Agent,
  ConnectionEventType,
  ConnectionInvitationMessage,
  ConnectionRecord,
  CredentialEventType,
  CredentialRecord,
} from "aries-framework-javascript";
import { initAgent } from "./agent/agent.provider";

const URL = "https://2e08cd27502a.ngrok.io";

// invite object that was logged by the issuer
const INVITE =
  "eyJAdHlwZSI6ImRpZDpzb3Y6QnpDYnNOWWhNcmpIaXFaRFRVQVNIZztzcGVjL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwiQGlkIjoiZTVlYmM1ZGItOTNiNy00OTM1LWJmODQtNGQ5NjM2ZTFkY2EyIiwibGFiZWwiOiIwNWMxYzA2Mi02N2I4LTRhMTQtODQ0NC03YjQ2ZWJmYTNlZWMiLCJyZWNpcGllbnRLZXlzIjpbIjdrRThaUDVmNlF6amgxc21rcVB3YWJYVkJSRGhOVWFXNGllQ2tQdXZ0UTJHIl0sInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vOGY4MmEzMjk3Y2JmLm5ncm9rLmlvL21zZyIsInJvdXRpbmdLZXlzIjpbIkVuTHdHWFVxTnNwM3JndnQ3a1Y0N2VRS1BWMnBQQlVXU2ZtY2R6OGY3dlU2Il19";

const main = async () => {
  console.log("--- made with <3 by an intern at Animo ---");

  // Initialize the agent
  const agent: Agent = await initAgent(URL);

  // Receive the invite
  await receiveInvite(agent);

  // Start the connection handler
  connectionHandler(agent);

  // Start the credential handler
  credentialHandler(agent);
};

const receiveInvite = async (agent: Agent) => {
  // Convert base64 to UTF-8 string
  const invite = JSON.parse(
    Buffer.from(INVITE, "base64").toString("utf8")
  ) as ConnectionInvitationMessage;

  // Receive the invitation
  await agent.connections
    .receiveInvitation(invite)
    .catch((e) => console.error(e));
};

//handles all state changes on the connection
const connectionHandler = (agent: Agent) => {
  agent.connections.events.on(
    ConnectionEventType.StateChanged,
    (handler: {
      connectionRecord: ConnectionRecord;
      previousState: string;
    }) => {
      console.log(
        `Connection state change: ${handler.previousState} -> ${handler.connectionRecord.state}`
      );
    }
  );
};

// Handles all state changes with credentials
const credentialHandler = async (agent: Agent) => {
  agent.credentials.events.on(
    CredentialEventType.StateChanged,
    async (handler: {
      credentialRecord: CredentialRecord;
      previousState: string;
    }) => {
      console.log(
        `Credential state change: ${handler.previousState} -> ${handler.credentialRecord.state}`
      );

      // Automates the issue credential flow
      switch (handler.credentialRecord.state) {
        case "offer-received":
          await agent.credentials.acceptOffer(handler.credentialRecord.id);
          console.log("Accepted offer");
          break;
        case "credential-received":
          await agent.credentials.acceptCredential(handler.credentialRecord.id);
          console.log("Accepted credential");
          break;
        case "done":
          console.log("flow is done!");
          break;
      }
    }
  );
};

main();
