// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const NFTMarket = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await NFTMarket.deploy();
  const { address } = await marketplace.deployed();

  console.log("Marketplace deployed to:", address);

  const generativeNFT = await ethers.getContractFactory("NFTDescriptor");
  const generativeNFTContract = await generativeNFT.deploy();

  const NFT = await hre.ethers.getContractFactory("Token", {
    libraries: {
      NFTDescriptor: generativeNFTContract.address,
    },
  });
  const nft = await NFT.deploy(address);

  const { address: tokenAddress } = await nft.deployed();

  console.log("NFT deployed to:", tokenAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
