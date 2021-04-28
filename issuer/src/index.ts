import {
  Agent,
  ConnectionEventType,
  ConnectionRecord,
  CredentialEventType,
  CredentialPreview,
  CredentialPreviewAttribute,
  CredentialRecord,
} from "aries-framework";
import { initAgent } from "./agent/agent.provider";

const URL = "https://e402b21db9c1.ngrok.io";

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
  console.log(b64invite);

  // Start the connection handler
  connectionHandler(agent);

  // Start the credential handler
  credentialHandler(agent);
};

// handles all state changes on the connection
const connectionHandler = async (agent: Agent) => {
  agent.connections.events.on(
    ConnectionEventType.StateChanged,
    async (handler: {
      connectionRecord: ConnectionRecord;
      previousState: string;
    }) => {
      console.log(
        `Connection state change: ${handler.previousState} -> ${handler.connectionRecord.state}`
      );

      // Automates the issue credential flow
      if (handler.connectionRecord.state === "complete") {
        // Register the DID
        await agent.ledger.getPublicDid(agent.publicDid.did);

        // Create a schema
        console.log("Creating schema...");
        const [schemaId] = await createSchema(agent);

        // Get the schema again because of issues with AFJ atm
        // the return value from createSchema does not work
        const schema = await agent.ledger.getSchema(schemaId);
        console.log("Created Schema");

        // Create a credential definition
        console.log("Creating credential definition");
        const [credDefId] = await createCredentialDefinition(agent, schema);

        // Same as schema
        const credDef = await agent.ledger.getCredentialDefinition(credDefId);
        console.log("Created Definition");

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
        `Credential state change: 
          ${handler.previousState} -> ${handler.credentialRecord.state}`
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
          console.log("flow is done!");
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
