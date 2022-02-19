const { ethers } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const fs = require("fs");

chai.use(solidity);

const { expect } = chai;

describe("NFT marketplace contract", function () {
  let NFTMarketplace;
  let marketplaceContract;
  let marketContractAddress;

  let NFTToken;
  let tokenContract;
  let tokenContractAddress;

  let owner;
  let alice; // account 1
  let nonOwner;
  let otherAddressList;

  beforeEach(async function () {
    NFTMarketplace = await ethers.getContractFactory("Marketplace");
    marketplaceContract = await NFTMarketplace.deploy();
    await marketplaceContract.deployed();
    marketContractAddress = marketplaceContract.address;

    const generativeNFT = await ethers.getContractFactory("NFTDescriptor");
    const generativeNFTContract = await generativeNFT.deploy();

    NFTToken = await ethers.getContractFactory("Token", {
      libraries: {
        NFTDescriptor: generativeNFTContract.address,
      },
    });
    tokenContract = await NFTToken.deploy(marketContractAddress);
    await tokenContract.deployed();
    tokenContractAddress = tokenContract.address;

    const [
      address0,
      address1,
      address2,
      ...otherAddresses
    ] = await ethers.getSigners();
    owner = address0;
    alice = address1;

    nonOwner = address2;
    otherAddressList = otherAddresses;
  });

  describe("Deployment", () => {
    it("Should set the right owner", async function () {
      expect(await tokenContract.owner()).to.equal(owner.address);
    });
    it("Should be deployed", async function () {
      expect(marketplaceContract).to.exist;
      expect(tokenContract).to.exist;
    });
  });

  describe("NFT token", () => {
    let tokenId;
    let tokenURI;
    beforeEach(async function () {
      tokenURI = {
        name: "Great Wall of China",
        address: "Great Wall of China, Huairou District, China",
        image: "QmcEKozMSmS4sV37wkuU9Xe8ctvpNaeKDfBFPRo4Uz8kFJ",
        attributes: {
          latitude: "40.4319077",
          longitude: "116.5703749",
        },
      };

      const transaction = await tokenContract.createToken(
        JSON.stringify(tokenURI)
      );
      const tx = await transaction.wait();
      const event = tx?.events?.[0];
      const value = event?.args?.[2];
      tokenId = value.toNumber();
    });
    it("Should be minted to the owner", async function () {
      expect(await tokenContract.ownerOf(tokenId)).to.equal(owner.address);
    });

    it("Should approve marketplace contract for all", async function () {
      expect(
        await tokenContract.isApprovedForAll(
          owner.address,
          marketContractAddress
        )
      ).to.equal(true);
    });

    it("Should generate svg file", async () => {
      function extractJSONFromURI(uri) {
        const encodedJSON = uri.substr("data:application/json;base64,".length);
        const decodedJSON = Buffer.from(encodedJSON, "base64").toString("utf8");
        return JSON.parse(decodedJSON);
      }
      const data = await tokenContract.getSVG(
        tokenId,
        tokenURI.attributes.latitude,
        tokenURI.attributes.longitude,
        tokenURI.name
      );
      const json = extractJSONFromURI(data);
      console.log("json.image :>> ", json.image);

      const base64Str = json.image.replace("data:image/svg+xml;base64,", "");
      await fs.promises.writeFile("images/nft-example.svg", base64Str, {
        encoding: "base64",
      });
    });
  });
  describe("Marketplace", () => {
    let tokenId;
    let price; // price of NFT
    let listingPrice; // getting from contract function
    let marketplaceFee; // hardcoded
    const emptyAddress = "0x0000000000000000000000000000000000000000";

    const tokenURI = {
      name: "Great Wall of China, Huairou District, China",
      image: "QmcEKozMSmS4sV37wkuU9Xe8ctvpNaeKDfBFPRo4Uz8kFJ",
      attributes: {
        latitude: "40.4319077",
        longitude: "116.5703749",
      },
    };

    beforeEach(async function () {
      let transaction = await tokenContract.createToken(
        JSON.stringify(tokenURI)
      );
      const tx = await transaction.wait();
      const event = tx?.events?.[0];
      const value = event?.args?.[2];
      tokenId = value.toNumber();

      price = ethers.utils.parseUnits("500", "ether");
      marketplaceFee = ethers.utils.parseUnits("25", "ether"); // 5% of 500

      listingPrice = await marketplaceContract.getListingPrice(price);

      transaction = await marketplaceContract.createMarketItem(
        tokenContractAddress,
        tokenId,
        price,
        {
          value: listingPrice,
        }
      );
      await transaction.wait();
    });

    it("Should be able to get 5% of the market item price", () => {
      expect(listingPrice.toString()).to.equal(marketplaceFee.toString());
    });

    it("Should be able to fetch the created item", async () => {
      const data = await marketplaceContract.fetchMarketItems();

      const items = await Promise.all(
        data.map(async (i) => {
          const tokenURI = await tokenContract.tokenURI(i.tokenId);

          const parsedTokenURI = JSON.parse(tokenURI);

          const item = {
            price: i.price,
            tokenId: i.tokenId.toNumber(),
            seller: i.seller,
            owner: i.owner,
            image: parsedTokenURI.image,
            address: parsedTokenURI.name,
            attributes: parsedTokenURI.attributes,
          };
          return item;
        })
      );

      expect(items[0].price).to.equal(price);
      expect(items[0].tokenId).to.equal(tokenId);
      expect(items[0].seller).to.equal(owner.address);
      expect(items[0].owner).to.equal(emptyAddress);
      expect(items[0].image).to.equal(tokenURI.image);
      expect(items[0].address).to.equal(tokenURI.name);
      expect(items[0].attributes.latitude).to.equal(
        tokenURI.attributes.latitude
      );
      expect(items[0].attributes.longitude).to.equal(
        tokenURI.attributes.longitude
      );
    });

    it("Should be able to let Alice buy the token, fetch the token", async () => {
      const transaction = await marketplaceContract
        .connect(alice)
        .createMarketSale(tokenContractAddress, tokenId, {
          value: price,
        });
      await transaction.wait();
      const data = await marketplaceContract.connect(alice).fetchMyNfts();

      const items = await Promise.all(
        data.map(async (i) => {
          const tokenURI = await tokenContract.tokenURI(i.tokenId);

          const parsedTokenURI = JSON.parse(tokenURI);

          const item = {
            price: i.price,
            tokenId: i.tokenId.toNumber(),
            seller: i.seller,
            owner: i.owner,
            image: parsedTokenURI.image,
            address: parsedTokenURI.name,
            attributes: parsedTokenURI.attributes,
          };
          return item;
        })
      );

      expect(items[0].price).to.equal(price);
      expect(items[0].tokenId).to.equal(tokenId);

      expect(items[0].seller).to.equal(
        owner.address,
        "Item's seller should be the owner address"
      );

      expect(items[0].owner).to.equal(
        alice.address,
        "Item's owner should be Alice's address"
      );

      expect(items[0].image).to.equal(tokenURI.image);
      expect(items[0].address).to.equal(tokenURI.name);
      expect(items[0].attributes.latitude).to.equal(
        tokenURI.attributes.latitude
      );
      expect(items[0].attributes.longitude).to.equal(
        tokenURI.attributes.longitude
      );

      //List item back after purchase

      const itemPrice = ethers.utils.parseUnits("600", "ether");
      const marketplaceFee = ethers.utils.parseUnits("30", "ether"); // 5% of 500

      listingPrice = await marketplaceContract
        .connect(alice)
        .getListingPrice(itemPrice);

      const ownerOfToken = await tokenContract.ownerOf(tokenId);
      console.log("ownerOf", ownerOfToken);
      expect(ownerOfToken).to.equal(
        alice.address,
        "Alice should be the owner of the token"
      );
      console.log("--start--");
      console.log("alice lowercase", alice.address.toLowerCase());
      console.log("alice", alice.address);

      transaction = await marketplaceContract
        .connect(alice)
        .createMarketItem(tokenContractAddress, tokenId, itemPrice, {
          value: listingPrice,
        });
      await transaction.wait();
      console.log("--end--");

      expect(listingPrice.toString()).to.equal(
        marketplaceFee.toString(),
        "Should be 5% of the market item price"
      );
    });
  });
});
