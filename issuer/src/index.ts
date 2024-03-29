import {
  Agent,
  ConnectionEventTypes,
  ConnectionRecord,
  CredentialEventTypes,
  CredentialPreview,
  CredentialPreviewAttribute,
  CredentialRecord,
  ProofRecord,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://14a7a5edd17c.ngrok.io";

// Issueable attributes
const credentialPreview = new CredentialPreview({
  attributes: [
    new CredentialPreviewAttribute({
      name: "test",
      mimeType: "text/plain",
      value: "Hello World!",
    }),
  ],
});

const main = async () => {
  console.log("--- made with <3 by an intern at Animo ---");

  // Initialize the agent
  const agent = await initAgent(URL);

  // Create the invitation
  const { invitation } = await agent.connections.createConnection({});

  // Convert the invite to base64
  const b64invite = Buffer.from(JSON.stringify(invitation)).toString("base64");

  // Logs the invite for the nodejs holder
  console.log("---------INVITE-----------");
  console.log(b64invite);
  console.log("--------------------------");

  // Register the DID
  await agent.ledger.getPublicDid(agent.publicDid.did);

  // Create a schema
  console.log("Creating schema...");
  const schemaId = `${agent.publicDid.did}:2:testSchema:1.0`;

  let schema = await agent.ledger.getSchema(schemaId);
  if (!schema) {
    await createSchema(agent);
    schema = await agent.ledger.getSchema(schemaId);
  }
  console.log("Created schema");

  // Create a credential definition
  console.log("Creating credential definition...");
  const credDefId = await createCredentialDefinition(agent, schema);

  // Same as schema
  const credDef = await agent.ledger.getCredentialDefinition(credDefId.id);
  console.log("Created Definition");

  // Start the connection handler
  connectionHandler(agent, credDef);

  // Start the credential handler
  credentialHandler(agent);

  // Start the proof handler
  proofHandler(agent);
};

// handles all state changes on the connection
const connectionHandler = async (agent: Agent, credDef: any) => {
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

      if (handler.payload.connectionRecord.state === "complete") {
        // Offer a credential to the holder
        await offerCredential(
          agent,
          credentialPreview,
          credDef,
          handler.payload.connectionRecord.id
        ).catch((e) => console.error(e));
      }
    }
  );
}


// handles all state changes on the credential
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
      // Automates the issue credential flow
      switch (handler.payload.credentialRecord.state) {
        case "request-received":
          await agent.credentials
            .acceptRequest(handler.payload.credentialRecord.id)
            .catch((e) => console.error(e));
          console.log(`Accepted request`);
          break;
        case "done":
          const proofRequest = {
            requestedAttributes: {
              attr_1: {
                name: "test",
                restrictions: [
                  {
                    schemaName: "testSchema",
                    schemaVersion: "1.0",
                  },
                ],
              },
            },
          };
          await agent.proofs
            .requestProof(handler.payload.credentialRecord.connectionId, proofRequest)
            .catch((e) => console.error(e));
          console.log("Proof has been requested");
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
        `Proof state change: ${handler.payload.previousState} -> ${handler.payload.proofRecord.state}`
      );
      switch (handler.payload.proofRecord.state) {
        case "presentation-received":
          await agent.proofs
            .acceptPresentation(handler.payload.proofRecord.id)
            .catch((e) => console.error(e));
          console.log("Presentation has been accepted");
          break;
        case "done":
          console.log(
            "--- FLOW IS DONE! The credential has been issued and verified! ---"
          );
      }
    }
  );
};

// Creates a schema
const createSchema = async (agent: Agent): Promise<any> => {
  return agent.ledger.registerSchema({
    name: "testSchema",
    version: "1.0",
    attributes: ["test"],
  });
};

// Created a credential definition
const createCredentialDefinition = async (agent: Agent, schema: any) => {
  return agent.ledger.registerCredentialDefinition({
    schema,
    tag: "default",
    signatureType: "CL",
    supportRevocation: false,
  });
};

// Offers a credential to the holder
const offerCredential = async (
  agent: Agent,
  credentialPreview: CredentialPreview,
  credDef: any,
  connId: string
) => {
  const credentialOfferTemplate = {
    credentialDefinitionId: credDef.id,
    preview: credentialPreview,
  };
  await agent.credentials
    .offerCredential(connId, credentialOfferTemplate)
    .catch((e) => console.error(e));
};

main();
