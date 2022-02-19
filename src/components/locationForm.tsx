import { ethers } from "ethers";
import { create as createIPFS } from "ipfs-http-client";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import NFTMarketplace from "../../artifacts/contracts/OneWorld.sol/Marketplace.json";
import Token from "../../artifacts/contracts/OneWorld.sol/Token.json";
import { SearchBox } from "./searchBox";
import { Token as TokenType, Marketplace as MarketplaceType } from "types";

interface IFormData {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  price: string;
  image: FileList;
}

export default function HouseForm() {
  const tokenAddress = process.env.NEXT_PUBLIC_NFT_ADDRESS;
  const nftMarketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const { register, handleSubmit, setValue, errors, watch } = useForm<
    IFormData
  >({
    defaultValues: {},
  });

  const address = watch("address");

  useEffect(() => {
    register({ name: "address" }, { required: "Please enter your address" });
    register({ name: "name" }, { required: "Please enter your address" });
    register({ name: "latitude" }, { required: true, min: -90, max: 90 });
    register({ name: "longitude" }, { required: true, min: -180, max: 180 });
  }, [register]);

  const ipfs = createIPFS({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
  });

  async function requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  const handleCreate = async (data: IFormData) => {
    try {
      setSubmitting(true);
      // const result = await ipfs.add(data.image[0]);
      const tokenURI = {
        name: data.name,
        address: data.address,
        // image: result.path,
        attributes: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };

      if (typeof window.ethereum !== "undefined" && tokenAddress) {
        await requestAccount();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(
          tokenAddress,
          Token.abi,
          signer
        ) as TokenType;
        let transaction = await tokenContract.createToken(
          JSON.stringify(tokenURI)
        );
        const tx = await transaction.wait();
        let event = tx?.events?.[0];
        let value = event?.args?.[2];
        let tokenId = value.toNumber();

        const price = ethers.utils.parseUnits(data.price, "ether");

        const marketplaceContract = new ethers.Contract(
          nftMarketplaceAddress,
          NFTMarketplace.abi,
          signer
        ) as MarketplaceType;

        let listingPrice = await marketplaceContract.getListingPrice(price);
        const marketplaceFee: string = listingPrice.toString();

        transaction = await marketplaceContract.createMarketItem(
          tokenAddress,
          tokenId,
          price,
          { value: marketplaceFee }
        );
        await transaction.wait();

        router.push("/");
      }
    } catch (error) {
      if (
        error?.data?.message ===
        "execution reverted: Ownable: caller is not the owner"
      ) {
        alert("Only the contract owner can mint");
      }
      console.log({ error });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (data: IFormData) => {
    handleCreate(data);
  };

  return (
    <form className="mx-auto max-w-xl py-6" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="text-xl">
        Mint a new location and publish to the marketplace
      </h1>
      <div className="mt-4">
        <label htmlFor="search" className="block mb-1">
          Search a location
        </label>
        <SearchBox
          onSelectAddress={(address, latitude, longitude, name) => {
            setValue("address", address);
            setValue("latitude", latitude);
            setValue("longitude", longitude);
            setValue("name", name);
          }}
          defaultValue={""}
        />
        {errors.address && <p>{errors.address.message}</p>}
      </div>

      {address && (
        <>
          {" "}
          {/* <div className="mt-8 my-6">
            <label
              htmlFor="image"
              className="p-4 border-dashed border-4 border-gray-600 block cursor-pointer"
            >
              Click to add image (16:9)
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={register({
                validate: (fileList: FileList) => {
                  if (fileList.length === 1) return true;
                  return "Plese upload a file";
                },
              })}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event?.target?.files?.[0]) {
                  const file = event.target.files[0];

                  const reader = new FileReader();

                  reader.onloadend = async () => {
                    setPreviewImage(reader.result as string);
                  };

                  reader.readAsDataURL(file);
                }
              }}
            />
            {previewImage && (
              <img
                src={previewImage}
                className="mt-4 object-cover"
                style={{ width: "576px", height: `${(9 / 16) * 575}px` }}
              ></img>
            )}
            {errors.image && <p className="mt-1">{errors.image.message}</p>}
          </div> */}
          <div className="mt-4">
            <label htmlFor="price" className="block mb-1">
              {" "}
              Initial price (ONE)
            </label>{" "}
            <input
              className="p-2"
              type="number"
              name="price"
              id="price"
              ref={register({
                required: "Please enter the price",
                min: { value: 5, message: "Must be more than 5 ONE" },
              })}
            ></input>
            {errors.price && <p>{errors.price.message}</p>}
          </div>
          <div className="mt-4">
            <button
              className="bg-blue-500 hover:bg-blue-700
          font-bold
          py-2
          px-4
          mr-4
          mt-8
          rounded"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Loading..." : "Save"}
            </button>{" "}
            <Link href={"/"}>
              <a>Cancel</a>
            </Link>
          </div>
        </>
      )}
    </form>
  );
}
