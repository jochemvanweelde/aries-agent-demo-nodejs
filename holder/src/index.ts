import {
  Agent,
  ConnectionEventType,
  ConnectionInvitationMessage,
  ConnectionRecord,
  CredentialEventType,
  CredentialRecord,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://1e6f61fc37ca.ngrok.io";

// invite object that was logged by the issuer
const INVITE =
  "eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvY29ubmVjdGlvbnMvMS4wL2ludml0YXRpb24iLCJAaWQiOiJjZGRmN2M0My03YjRkLTRmM2QtYmEwOC04NzI2YTNmNzU2YjUiLCJsYWJlbCI6Ijc0NmVhNmRhLTZhNjctNDMxZC05NjQzLTY3ZWJmYmZmOWZhMyIsInJlY2lwaWVudEtleXMiOlsiMmVEanpKNmgyRXVocFFXWUE5MUEzdERDc0FtQ0FXQmk0RUZDZ283TVVlNFUiXSwic2VydmljZUVuZHBvaW50IjoiZGlkY29tbTp0cmFuc3BvcnQvcXVldWUiLCJyb3V0aW5nS2V5cyI6W119";

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
