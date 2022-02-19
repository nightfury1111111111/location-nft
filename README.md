### GEO NFT

NFT Marketplace on Harmony ONE blockchain testnet. NFT is an SVG generated on-chain based on the location name and latitude/longitude.

The moving gradient is uniquely generated based on the latitude and longitude.

## Features

- On-chain NFT generated via SVG, inspired by Uniswap LP NFT.
- Only owner (Ownable contract) can mint NFT at `localhost:3000/location/add`
- Owner can mint any places using Google Places autocomplete.
- User can buy NFT and see their own NFT and where the NFT is located in the map.

## Roadmap

- Making the on-chain NFT looks more exclusive and premium.
- Use pooling to mimic real-time.
- Enable no refresh after user changing address.
- Native integration with Harmony wallet.
- User can buy through auction.

## Known issue

- User can't list back their item in the marketplace due to unable to execute IERC721.transferFrom function because the signer address(checksummed) and the msg.sender(not checksummed) but there are the same address.

## Development

Installing dependencies by
` yarn install`
and it will generate types based on the contracts.

Deploying contracts to testnet by
` yarn testnet:deploy`

Run NFT marketplace test by
` yarn test:token` or ` yarn test:svg` to test only the on-chain NFT SVG library. NFT will be generated inside the image folder.

Rename `.env.example` to `.env.local` to add the Mapbox API token, Firebase API key for the search location API, Marketplace and NFT addresses on testnet.

> You will get both addresses after runned the `yarn testnet:deploy` in the command prompt.

Build with

- React
- Next.js
- Typescript
- Mapbox
- Hardhat
