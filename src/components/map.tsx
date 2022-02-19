import React, { useRef, useState } from "react";
import ReactMapGL, { Marker, Popup, ViewState } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLocalState } from "src/utils/useLocalState";
import { HousesQuery_houses } from "src/generated/HousesQuery";
import { SearchBox } from "./searchBox";

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
interface iProps {
  setDataBounds: (bounds: string) => void;
  nfts: ILocation[];
  highlightedId: number | null;
}

const Map = ({ setDataBounds, nfts, highlightedId }: iProps) => {
  const [selected, setSelected] = useState<ILocation | null>(null);

  const mapRef = useRef<ReactMapGL | null>();

  const [viewport, setViewport] = useLocalState<ViewState>("viewport", {
    latitude: 43,
    longitude: -79,
    zoom: 10,
  });

  console.log({ highlightedId, nfts });

  return (
    <div className="text-black relative">
      <ReactMapGL
        {...viewport}
        width="100%"
        height="calc(100vh - 64px)"
        mapboxApiAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN}
        onViewportChange={(nextViewport) => setViewport(nextViewport)}
        ref={(instance) => (mapRef.current = instance)}
        minZoom={0}
        maxZoom={15}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        onLoad={() => {
          if (mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds();
            setDataBounds(JSON.stringify(bounds.toArray()));
          }
        }}
        onInteractionStateChange={(extra) => {
          if (!extra.isDragging && mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds();
            setDataBounds(JSON.stringify(bounds.toArray()));
          }
        }}
      >
        <div className="absolute top-0 w-full z-10 p-4">
          <SearchBox
            defaultValue=""
            onSelectAddress={(_address, latitude, longitude) => {
              if (latitude && longitude) {
                setViewport((old) => ({
                  ...old,
                  latitude,
                  longitude,
                  zoom: 12,
                }));
                if (mapRef.current) {
                  const bounds = mapRef.current.getMap().getBounds();
                  setDataBounds(JSON.stringify(bounds.toArray()));
                }
              }
            }}
          />
        </div>
        {nfts?.map((nft) => (
          <Marker
            key={nft.tokenId}
            latitude={nft?.attributes?.latitude}
            longitude={nft?.attributes?.longitude}
            offsetLeft={-15}
            offsetTop={-15}
            className={highlightedId === nft.tokenId ? "marker-active" : ""}
          >
            <button
              style={{ width: "30px", height: "30px", fontSize: "30px" }}
              type="button"
              onClick={() => setSelected(nft)}
            >
              <img
                src={
                  highlightedId === nft.tokenId
                    ? "/map-pin-selected.svg"
                    : "/map-pin.svg"
                }
                alt="nft"
                className="w-8"
              ></img>
            </button>
          </Marker>
        ))}
        {/* {selected && (
          <Popup
            latitude={selected.latitude}
            longitude={selected.longitude}
            onClose={() => setSelected(null)}
            closeOnClick={false}
          >
            <div className="text-center">
              <h3 className="px-4">{selected.address.substr(0, 30)}</h3>
              <Image
                className="mx-auto my-4"
                cloudName={process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
                publicId={selected.publicId}
                secure
                dpr="auto"
                quality="auto"
                width={200}
                height={Math.floor((9 / 16) * 200)}
                crop="fill"
                gravity="auto"
              ></Image>
              <Link href={`/houses/${selected.id}`}>
                <a>View House</a>
              </Link>
            </div>
          </Popup>
        )} */}
      </ReactMapGL>
    </div>
  );
};

export default Map;
