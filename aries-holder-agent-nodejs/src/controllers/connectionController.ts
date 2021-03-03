import {
  Agent,
  ConnectionRecord,
  ConnectionInvitationMessage,
  JsonTransformer,
} from "aries-framework-javascript";
import fetch from "node-fetch";

const getConnections = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/connections`);
  const text = await response.text();
  console.log(text);
};

export { getConnections };
