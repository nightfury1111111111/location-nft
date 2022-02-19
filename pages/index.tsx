import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
// import axios from "redaxios";
import LocationList from "src/components/locationList";
import Layout from "src/components/layout";
import Map from "src/components/map";
import { useLastData } from "src/utils/useLastData";
import { useLocalState } from "src/utils/useLocalState";
import { useDebounce } from "use-debounce";
import Marketplace from "../artifacts/contracts/OneWorld.sol/Marketplace.json";
import Token from "../artifacts/contracts/OneWorld.sol/Token.json";
import { Token as TokenType, Marketplace as MarketplaceType } from "types";
import { extractJSONFromURI } from "src/utils/extractJSONFromURI";

const tokenAddress = process.env.NEXT_PUBLIC_NFT_ADDRESS;
const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

type BoundsArray = [[number, number], [number, number]];

const parseBounds = (boundsString: string) => {
  const bounds = JSON.parse(boundsString) as BoundsArray;

  return {
    sw: {
      latitude: bounds?.[0]?.[1],
      longitude: bounds?.[0]?.[0],
    },
    ne: {
      latitude: bounds?.[1]?.[1],
      longitude: bounds?.[1]?.[0],
    },
  };
};

interface ITokenURI {
  image: string;
  address: string;
  name: string;
  attributes: IAttributes;
}

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

export default function Home() {
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [nfts, setNfts] = useState<ILocation[]>([]);
  const [fetchingStatus, setFetchingStatus] = useState<string>("idle");

  async function loadNFTs() {
    if (window.ethereum) {
      setFetchingStatus("fetching");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        Token.abi,
        provider
      ) as TokenType;
      const marketContract = new ethers.Contract(
        marketplaceAddress,
        Marketplace.abi,
        provider
      ) as MarketplaceType;
      try {
        const data = await marketContract.fetchMarketItems();

        const items = await Promise.all(
          data.map(async (i) => {
            let tokenURI = await tokenContract.tokenURI(i.tokenId);

            const parsedTokenURI: ITokenURI = JSON.parse(tokenURI);

            let svgData = await tokenContract.getSVG(
              i.tokenId,
              parsedTokenURI.attributes.latitude.toString(),
              parsedTokenURI.attributes.longitude.toString(),
              parsedTokenURI.name
            );

            const json = extractJSONFromURI(svgData);
            console.log("json.image :>> ", json.image);

            console.log("svgData", svgData);

            let price = ethers.utils.formatUnits(i.price.toString(), "ether");

            let item = {
              price,
              tokenId: i.tokenId.toNumber(),
              seller: i.seller,
              owner: i.owner,
              image: json.image,
              address: parsedTokenURI.name,
              attributes: parsedTokenURI.attributes,
            };
            console.log({ item });
            return item;
          })
        );
        setNfts(items);
      } catch (error) {
        console.log({ error });
      } finally {
        setFetchingStatus("done-fetching");
      }
    }
  }

  console.log({ nfts });

  useEffect(() => {
    loadNFTs();
  }, []);

  const [dataBounds, setDataBounds] = useLocalState<string>(
    "bounds",
    "[[0,0],[0,0]]"
  );

  const [debouncedDataBounds] = useDebounce(dataBounds, 200);

  const bounds = parseBounds(debouncedDataBounds);

  const data = useMemo(() => {
    return nfts.filter(({ attributes }) => {
      return (
        attributes.latitude >= bounds.sw.latitude &&
        attributes.latitude <= bounds.ne.latitude &&
        attributes.longitude >= bounds.sw.longitude &&
        attributes.longitude <= bounds.ne.longitude
      );
    });
  }, [bounds, nfts]);

  const error = false;

  const lastData = useLastData(data);

  if (error) return <Layout main={<div>Error loading houses</div>} />;

  console.log({ data, nfts, lastData });

  return (
    <Layout
      main={
        <div className="flex">
          <div
            className="w-1/2 pb-4"
            style={{ maxHeight: "calc(100vh - 64px)", overflowX: "scroll" }}
          >
            <h2 className="pt-3 px-3">Marketplace</h2>
            <h2 className="px-3">Purchase a whole city across the world</h2>
            <LocationList
              nfts={lastData ? lastData : []}
              setHighlightedId={setHighlightedId}
              fetchingStatus={fetchingStatus}
            />
          </div>

          <div className="w-1/2">
            <Map
              setDataBounds={setDataBounds}
              nfts={lastData ? lastData : []}
              highlightedId={highlightedId}
            />
          </div>
        </div>
      }
    />
  );
}
