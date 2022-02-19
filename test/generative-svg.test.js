const { ethers, waffle } = require("hardhat");
const fs = require("fs");
const chai = require("chai");

const { expect } = chai;

const toWei = ethers.utils.parseEther;
chai.use(require("chai-bignumber")());

const overrides = { gasLimit: 9500000 };
const amount = toWei("100");

describe("Generative NFT on-chain", async function () {
  const provider = waffle.provider;
  const wallets = provider.getWallets();
  const [wallet, other] = wallets;

  let token;
  let nftDescriptor;
  let loadFixture;
  let json;

  const generativeNFTFixture = async () => {
    const generativeNFT = await ethers.getContractFactory("NFTDescriptor");
    const generativeNFTContract = await generativeNFT.deploy();

    const [ERC20MockFactory, NFTDescriptorTestFactory] = await Promise.all([
      ethers.getContractFactory("ERC20Mock"),
      ethers.getContractFactory("NFTDescriptorTest", {
        libraries: {
          NFTDescriptor: generativeNFTContract.address,
        },
      }),
    ]);
    const token = await ERC20MockFactory.deploy();
    const nftDescriptor = await NFTDescriptorTestFactory.deploy(overrides);

    return { token, nftDescriptor };
  };

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader(wallets);
  });

  beforeEach("load fixture", async function () {
    ({ token, nftDescriptor } = await loadFixture(generativeNFTFixture));

    await token.mint(wallet.address, amount);
    await token.mint(other.address, amount);
  });

  function extractJSONFromURI(uri) {
    const encodedJSON = uri.substr("data:application/json;base64,".length);
    const decodedJSON = Buffer.from(encodedJSON, "base64").toString("utf8");
    return JSON.parse(decodedJSON);
  }
  it("constructURIParams", async function () {
    const params = [
      {
        tokenId: 10,
        blockNumber: 5431,
        latitude: "116.5703749",
        longitude: "40.4319077",
        name: "Kuala Lumpur",
      },
      {
        tokenId: 11,
        blockNumber: 1345,
        latitude: "-6.2087634",
        longitude: "106.845599",
        name: "Jakarta",
      },
      {
        tokenId: 12,
        blockNumber: 4345,
        latitude: "51.5073509",
        longitude: "-0.1277583",
        name: "London",
      },
    ];

    params.forEach(async (param, index) => {
      const data = await nftDescriptor.constructTokenURI(param);
      json = extractJSONFromURI(data);

      const base64Str = json.image.replace("data:image/svg+xml;base64,", "");
      await fs.promises.writeFile(
        `images/nft-example-${index}.svg`,
        base64Str,
        {
          encoding: "base64",
        }
      );
    });
  });
});
