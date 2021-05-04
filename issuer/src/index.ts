import {
  Agent,
  ConnectionEventType,
  ConnectionRecord,
  CredentialEventType,
  CredentialPreview,
  CredentialPreviewAttribute,
  CredentialRecord,
  ProofRecord,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://a0a54a8096ae.ngrok.io";

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
  console.log("--------------------");
  console.log(b64invite);
  console.log("--------------------");

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

  // Create a credential definition
  console.log("Creating credential definition");
  const [credDefId] = await createCredentialDefinition(agent, schema);

  // Same as schema
  const credDef = await agent.ledger.getCredentialDefinition(credDefId);
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
  agent.connections.events.on(
    ConnectionEventType.StateChanged,
    async (handler: {
      connectionRecord: ConnectionRecord;
      previousState: string;
    }) => {
      console.log(
        `Connection state change: ${handler.previousState} -> ${handler.connectionRecord.state}`
      );

      if (handler.connectionRecord.state === "complete") {
        // Offer a credential to the holder
        await offerCredential(
          agent,
          credentialPreview,
          credDef,
          handler.connectionRecord.id
        ).catch((e) => console.error(e));
      }
    }
  );
};

// handles all state changes on the credential
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
        case "request-received":
          await agent.credentials
            .acceptRequest(handler.credentialRecord.id)
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
            .requestProof(handler.credentialRecord.connectionId, proofRequest)
            .catch((e) => console.error(e));
          console.log("Proof has been requested");
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
        case "presentation-received":
          await agent.proofs
            .acceptPresentation(handler.proofRecord.id)
            .catch((e) => console.error(e));
          console.log("Presentation has been accepted");
          break;
        case "done":
          console.log("--- Proof flow is done ---");
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
    config: {
      supportRevocation: false,
    },
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
