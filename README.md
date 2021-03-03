## Demonstration that issues a credential with Hyperledger Aries Framework Javascript

### Requirements

1. docker & docker-compose
2. node version 12 (use nvm)

### Setup

#### Starting the docker containers

```sh
git clone https://github.com/hyperledger/aries-framework-javascript.git
cd aries-framework-javascript
docker-compose -f ./docker/docker-compose-mediators.yml -f ./docker/docker-compose-mediators-ngrok.yml up
```

After the all the containers are running, two NGROK urls should appear, eg: `https://2e08cd27502a.ngrok.io`

Paste one url in the issuer file (index.ts -> const URL) and the other in the holder file (same location)

#### Setting up the issuer and holder

```sh
nvm use 12
cd aries-agent-demo-nodejs/aries-holder-agent-nodejs
yarn install
cd ../../
cd aries-agent-demo-nodejs/aries-issue-agent-nodejs
yarn install
```

#### Running the issuer

```sh
cd aries-agent-demo-nodejs/aries-issue-agent-nodejs
yarn start
```

<b>Make sure to copy the logged invite to the holder agent (index.ts -> const INVITE)</b>

#### Running the holder

```sh
cd aries-agent-demo-nodejs/aries-holder-agent-nodejs
yarn start
```
