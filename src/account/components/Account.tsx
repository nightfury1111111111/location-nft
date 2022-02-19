import type { Web3Provider } from "@ethersproject/providers";
// import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";
import useUserAddress from "../hooks/useUserAddress";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Core from "web3modal";

export const Account = () => {
  const [injectedProvider, setInjectedProvider] = useState<Web3Provider>();
  const [web3Modal, setWeb3Modal] = useState<Core>(); // later
  const router = useRouter();

  useEffect(() => {
    setWeb3Modal(web3Modal);

    if (!web3Modal) {
      try {
        import("web3modal").then((Web3Modal) => {
          setWeb3Modal(
            new Web3Modal.default({
              network: "testnet",
              cacheProvider: true,
            })
          );
        });
      } catch (e) {
        console.log("Error while creating Web3Modal");
      }
    }
  }, []);

  const { userAddress, setUserAddress } = useUserAddress(
    injectedProvider as Web3Provider
  );

  const openWeb3Modal = useCallback(async () => {
    console.log("web3Modal", web3Modal);
    const provider = await web3Modal?.connect();

    setInjectedProvider(new ethers.providers.Web3Provider(provider));
  }, [web3Modal]);

  const logout = async () => {
    await web3Modal?.clearCachedProvider();
    router.replace(router.asPath);
    setUserAddress("");
  };

  useEffect(() => {
    if (web3Modal?.cachedProvider) {
      openWeb3Modal();
    }
  }, [openWeb3Modal]);

  const isConnected = userAddress;

  return (
    <>
      <div className="flex align-baseline h-auto">
        <p className="mt-1 mr-3">{userAddress}</p>
        {isConnected ? (
          <button
            style={{ verticalAlign: "top", marginLeft: 8, marginTop: 4 }}
            onClick={logout}
          >
            Logout
          </button>
        ) : (
          <button
            style={{ verticalAlign: "top", marginLeft: 8, marginTop: 4 }}
            onClick={openWeb3Modal}
          >
            Connect
          </button>
        )}
      </div>
    </>
  );
};
