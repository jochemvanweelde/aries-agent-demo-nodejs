import {
  Agent,
  ConnectionEventType,
  ConnectionInvitationMessage,
  ConnectionRecord,
  CredentialEventType,
  CredentialRecord,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://2c69b1bc5132.ngrok.io";

// invite object that was logged by the issuer
const INVITE =
  "eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvY29ubmVjdGlvbnMvMS4wL2ludml0YXRpb24iLCJAaWQiOiIyMTllNzY2OC03OWJjLTQwY2QtYjFiYi00YjQxNTYzOTNmMzEiLCJsYWJlbCI6Ijg4YTc2ZDZmLTA1ZjQtNDYzOS1iNzcyLTFiOGQ0YzhjNGY3NiIsInJlY2lwaWVudEtleXMiOlsiRWU5Tm1SUVQ2ZUx0OHYyVlE3aFRlckxUcDVSY2VWb2lMNUJIWERhWmZZakoiXSwic2VydmljZUVuZHBvaW50IjoiaHR0cHM6Ly9lNWNkMzg4MThiY2Mubmdyb2suaW8vbXNnIiwicm91dGluZ0tleXMiOlsiODJSQlNuM2hlTGdYelpkNzRVc01DOFE4WVJmRUVoUW9BTTdMVXFFNmJldkoiXX0=";

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
