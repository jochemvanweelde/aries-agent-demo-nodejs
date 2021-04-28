import { Agent, InitConfig } from "aries-framework";
import indy from "indy-sdk";
import { downloadGenesis, storeGenesis } from "./genesis-utils";
import {
  HttpOutboundTransporter,
  PollingInboundTransporter,
} from "./transporters";
import { v4 as uuidv4 } from "uuid";

const initAgent = async (mediatorUrl: string): Promise<Agent> => {
  const genesis = await downloadGenesis();
  const genesisPath = await storeGenesis(genesis, "genesis.txn");

  const agentConfig: InitConfig = {
    label: uuidv4(),
    walletConfig: { id: uuidv4() },
    walletCredentials: { key: uuidv4() },
    autoAcceptConnections: true,
    poolName: "test-9832743",
    genesisPath,
    mediatorUrl,
    publicDidSeed: "12345678901234567890123456789099",
    indy,
  };
  const agent = new Agent(agentConfig);
  agent.setInboundTransporter(new PollingInboundTransporter());
  agent.setOutboundTransporter(new HttpOutboundTransporter(agent));
  console.log("agent instance created");
  await agent.init().catch((e) => console.error(e));
  return agent;
};

export { initAgent };
