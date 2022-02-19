import { ethers } from "ethers";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import { Marketplace as MarketplaceType, Token as TokenType } from "types";
import Web3Modal from "web3modal";
import Marketplace from "../../artifacts/contracts/OneWorld.sol/Marketplace.json";
import Token from "../../artifacts/contracts/OneWorld.sol/Token.json";

interface IAttributes {
  latitude: number;
  longitude: number;
}

interface ILocation {
  price: string;
  tokenId: number;
  seller: string;
  owner: string;
  image: string;
  address: string;
  attributes: IAttributes;
}
interface IProps {
  nfts: ILocation[];
  setHighlightedId: (id: number | null) => void;
  fetchingStatus: string;
}

const tokenAddress = process.env.NEXT_PUBLIC_NFT_ADDRESS;
const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

export default function LocationList({
  nfts,
  setHighlightedId,
  fetchingStatus,
}: IProps) {
  const router = useRouter();

  async function buyNft(nft: ILocation) {
    console.log({ nft });

    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        marketplaceAddress,
        Marketplace.abi,
        signer
      );

      const price = ethers.utils.parseUnits(nft.price.toString(), "ether");
      // console.log({ price, o: parseInt(nft.price) });
      const transaction = await contract.createMarketSale(
        tokenAddress,
        nft.tokenId,
        {
          value: price,
        }
      );
      await transaction.wait();
      router.push("/my-locations");
    } catch (error) {
      console.log({ error });
    }
  }

  const listNft = (nft: ILocation) => async () => {
    console.log({ nft });

    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();

      const ownerAddress = await signer.getAddress();

      console.log("signer address", ownerAddress);
      const contract = new ethers.Contract(
        tokenAddress,
        Token.abi,
        signer
      ) as TokenType;

      const balanceOf = await contract.balanceOf(ownerAddress);
      console.log("owner balance", balanceOf.toString());

      const owner = await contract.ownerOf(nft.tokenId);
      console.log("owner address", owner);

      const marketplaceContract = new ethers.Contract(
        marketplaceAddress,
        Marketplace.abi,
        signer
      ) as MarketplaceType;

      const price = ethers.utils.parseUnits(nft.price, "ether");

      let listingPrice = await marketplaceContract.getListingPrice(price);
      const marketplaceFee: string = listingPrice.toString();

      console.log({ tokenId: nft.tokenId, tokenAddress, price });

      const transaction = await marketplaceContract.createMarketItem(
        tokenAddress,
        nft.tokenId,
        price,
        { value: marketplaceFee }
      );
      await transaction.wait();
      router.push("/");
    } catch (error) {
      console.log({ error });
    }
  };

  console.log({ fetchingStatus });
  if (nfts?.length === 0 && fetchingStatus === "done-fetching") {
    return (
      <p className="p-3">
        {router.pathname === "/" ? (
          "No available cities to purchase"
        ) : (
          <>
            You don't own any location NFT, get one
            <Link href="/">
              <a className="text-green-400 font-medium">here</a>
            </Link>
          </>
        )}
      </p>
    );
  }

  return (
    <>
      {nfts?.map((nft: ILocation) => (
        <div
          key={nft.tokenId}
          className="px-6 pt-4 cursor-pointer flex flex-wrap"
          onMouseEnter={() => setHighlightedId(nft.tokenId)}
          onMouseLeave={() => setHighlightedId(null)}
        >
          <div className="sm:w-full md:w-1/2">
            <img
              alt={nft.address}
              width={350}
              height={Math.floor((9 / 16) * 350)}
              src={nft.image}
            />
          </div>
          <div className="sm:w-full md:w-1/2 sm:pl-0 md:pl-4">
            <h2 className="text-lg">{nft.address}</h2>
            <p className="text-blue-300">{nft.price} ONE</p>
            {router.pathname === "/" ? (
              <button
                className="bg-green-500 font-medium py-2 px-12 rounded"
                onClick={() => buyNft(nft)}
              >
                Buy
              </button>
            ) : (
              <button
                className="bg-green-500 font-medium py-2 px-12 rounded"
                onClick={listNft(nft)}
              >
                List on marketplace
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
