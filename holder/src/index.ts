import {
  Agent,
  ConnectionEventType,
  ConnectionInvitationMessage,
  ConnectionRecord,
  CredentialEventType,
  CredentialRecord,
  JsonTransformer,
  ProofRecord,
  RequestPresentationMessage,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://68a34548b582.ngrok.io";

// invite object that was logged by the issuer
const INVITE =
  "eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvY29ubmVjdGlvbnMvMS4wL2ludml0YXRpb24iLCJAaWQiOiJlZGViN2VhZi1kYjRjLTQxYzMtYmY4ZC03Y2ZhMWQwZTQ3NDUiLCJsYWJlbCI6IjVhNjdhZGI1LTdiMTgtNGY1Yy05MjM4LWYyZThiZmUyZGEyMCIsInJlY2lwaWVudEtleXMiOlsiNnJIR29zb1pVYk5xTXFXVnZHVU1qalloZEU5S2lMeXM4bXROWlhXZ1EyY1MiXSwic2VydmljZUVuZHBvaW50IjoiaHR0cHM6Ly9iYjQ0MmUzYzdmZjAubmdyb2suaW8vbXNnIiwicm91dGluZ0tleXMiOlsiODJSQlNuM2hlTGdYelpkNzRVc01DOFE4WVJmRUVoUW9BTTdMVXFFNmJldkoiXX0=";

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

  // Start the proof handler
  proofHandler(agent);
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
          break;
      }
    }
  );
};

const proofHandler = async (agent: Agent) => {
  agent.proofs.events.on(
    CredentialEventType.StateChanged,
    async (handler: { proofRecord: ProofRecord; previousState: string }) => {
      console.log(
        `Credential state change: 
          ${handler.previousState} -> ${handler.proofRecord.state}`
      );
      switch (handler.proofRecord.state) {
        case "request-received":
          const requestMessage =
            handler.proofRecord.requestMessage instanceof
            RequestPresentationMessage
              ? handler.proofRecord.requestMessage
              : JsonTransformer.fromJSON(
                  handler.proofRecord.requestMessage,
                  RequestPresentationMessage
                );
          const proofRequest = requestMessage.indyProofRequest;
          try {
            const requestedCredentials = await agent.proofs.getRequestedCredentialsForProofRequest(
              proofRequest,
              undefined
            );
            await agent.proofs.acceptRequest(
              handler.proofRecord.id,
              requestedCredentials
            );
            console.log("proof request has been accepted");
          } catch (e) {
            console.error(e);
          }
      }
    }
  );
};

main();
