import { HydraWebProvider } from "@/services/hydra";
import { AppWallet, UTxO } from "@meshsdk/core";
import { useAddress, useWallet } from "@meshsdk/react";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useInterval } from "usehooks-ts";

interface HydraContextInterface {
  hydraWallet?: AppWallet;
  hydraWalletAddress?: string;
  hydraUtxos: UTxO[];
  hydraProvider: HydraWebProvider;
}

const INITITAL_STATE: HydraContextInterface = {
  hydraUtxos: [],
  hydraProvider: new HydraWebProvider(),
};

export default function useHydraStore() {
  const { connected, wallet } = useWallet();
  const [hydraWallet, setHydraWallet] = useState<AppWallet>();
  const [hydraWalletAddress, setHydraWalletAddress] = useState<string>();
  const hydraProvider = useMemo(() => new HydraWebProvider(), []);
  const [hydraUtxos, setHydraUtxos] = useState<UTxO[]>([]);
  useInterval(async () => {
    if (hydraWallet && hydraWalletAddress) {
      const utxos = await hydraProvider.fetchAddressUTxOs(hydraWalletAddress);
      if (JSON.stringify(utxos) !== JSON.stringify(hydraUtxos)) {
        setHydraUtxos(utxos);
      }
    } else {
      setHydraUtxos([]);
    }
  }, 5000);

  useEffect(() => {
    const go = async () => {
      if (!wallet.getUnusedAddresses) return;

      const address = (await wallet.getUnusedAddresses())[0];
      if (address && connected) {
        const privateKey = localStorage.getItem(
          "hydraWalletPrivateKey-" + address
        );
        if (privateKey) {
          connectToHydra({
            setHydraWallet,
            setHydraWalletAddress,
            hydraProvider,
            privateKey,
            address,
          });
        } else {
          connectToHydra({
            setHydraWallet,
            setHydraWalletAddress,
            hydraProvider,
            address,
          });
        }
      } else {
        setHydraWallet(undefined);
        setHydraWalletAddress(undefined);
      }
    };
    go();
  }, [connected, hydraProvider, wallet]);

  return { hydraWallet, hydraWalletAddress, hydraUtxos, hydraProvider };
}

async function connectToHydra({
  setHydraWallet,
  setHydraWalletAddress,
  hydraProvider,
  privateKey,
  address,
}: {
  setHydraWallet: Dispatch<SetStateAction<AppWallet | undefined>>;
  setHydraWalletAddress: Dispatch<SetStateAction<string | undefined>>;
  hydraProvider: HydraWebProvider;
  privateKey?: string;
  address: string;
}) {
  let privateKeyToUse = privateKey;
  if (!privateKeyToUse) {
    privateKeyToUse =
      "5820" +
      Buffer.from(window.crypto.getRandomValues(new Uint8Array(32))).toString(
        "hex"
      );
    localStorage.setItem("hydraWalletPrivateKey-" + address, privateKeyToUse);
  }
  const hydraWallet = new AppWallet({
    networkId: 0,
    fetcher: hydraProvider,
    submitter: hydraProvider,
    key: {
      type: "cli",
      payment: privateKeyToUse,
    },
  });
  const hydraWalletAddress = await hydraWallet.getPaymentAddress();

  setHydraWallet(hydraWallet);
  setHydraWalletAddress(hydraWalletAddress);
}

export const HydraContext =
  createContext<HydraContextInterface>(INITITAL_STATE);

export function HydraProvider({ children }: { children: React.ReactNode }) {
  const value = useHydraStore();

  return (
    <HydraContext.Provider value={value}>{children}</HydraContext.Provider>
  );
}
