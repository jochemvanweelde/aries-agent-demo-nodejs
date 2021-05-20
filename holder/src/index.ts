import {
  Agent,
  ConnectionEventTypes,
  ConnectionInvitationMessage,
  ConnectionRecord,
  CredentialEventTypes,
  CredentialRecord,
  JsonTransformer,
  ProofRecord,
  RequestPresentationMessage,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://333338b8ef0b.ngrok.io";

// invite object that was logged by the issuer
const INVITE =
  "eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvY29ubmVjdGlvbnMvMS4wL2ludml0YXRpb24iLCJAaWQiOiJkZTViN2E0Zi1jMGZjLTQwNWMtOWIzOS01NGRhYTI1OWE5MDgiLCJsYWJlbCI6IjdmMTI5ZDJiLWQxNjMtNDI0OS05YmQyLWFkMzExY2IyYjMyZSIsInJlY2lwaWVudEtleXMiOlsiQzJaNlg3ZG8zV3pRRDVnS3JGUlZ0MkFhVDFUU2RuczE3eG1YYkRWVFZ1UHYiXSwic2VydmljZUVuZHBvaW50IjoiaHR0cHM6Ly9lZGE1MTk3YmZiMTEubmdyb2suaW8vbXNnIiwicm91dGluZ0tleXMiOlsiODJSQlNuM2hlTGdYelpkNzRVc01DOFE4WVJmRUVoUW9BTTdMVXFFNmJldkoiXX0=";

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
  agent.events.on(
    ConnectionEventTypes.ConnectionStateChanged,
    async (handler: {
      type: ConnectionEventTypes.ConnectionStateChanged,
      payload: {
        connectionRecord: ConnectionRecord,
        previousState: string;
      }
    }) => {
      console.log(
        `Connection state change: ${handler.payload.previousState} -> ${handler.payload.connectionRecord.state}`
      );
    }
  );
};

// Handles all state changes with credentials
const credentialHandler = async (agent: Agent) => {
  agent.events.on(
    CredentialEventTypes.CredentialStateChanged,
    async (handler: {
      type: CredentialEventTypes.CredentialStateChanged,
      payload: {
        credentialRecord: CredentialRecord;
        previousState: string;
      }
    }) => {
      console.log(
        `Credential state change: ${handler.payload.previousState} -> ${handler.payload.credentialRecord.state}`
      );

      switch (handler.payload.credentialRecord.state) {
        case "offer-received":
          await agent.credentials.acceptOffer(handler.payload.credentialRecord.id);
          console.log("Accepted offer");
          break;
        case "credential-received":
          await agent.credentials.acceptCredential(handler.payload.credentialRecord.id);
          console.log("Accepted credential");
          break;
        case "done":
          break;
      }
    }
  );
};

const proofHandler = async (agent: Agent) => {
  agent.events.on(
    CredentialEventTypes.CredentialStateChanged,
    async (handler: {
      type: CredentialEventTypes.CredentialStateChanged,
      payload: {
        proofRecord: ProofRecord;
        previousState: string 
      }
      }) => {
      console.log(
        `Credential state change: 
          ${handler.payload.previousState} -> ${handler.payload.proofRecord.state}`
      );
      switch (handler.payload.proofRecord.state) {
        case "request-received":
          const requestMessage =
            handler.payload.proofRecord.requestMessage instanceof
            RequestPresentationMessage
              ? handler.payload.proofRecord.requestMessage
              : JsonTransformer.fromJSON(
                  handler.payload.proofRecord.requestMessage,
                  RequestPresentationMessage
                );
          const proofRequest = requestMessage.indyProofRequest;
          try {
            const requestedCredentials = await agent.proofs.getRequestedCredentialsForProofRequest(
              proofRequest,
              undefined
            );
            await agent.proofs.acceptRequest(
              handler.payload.proofRecord.id,
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
