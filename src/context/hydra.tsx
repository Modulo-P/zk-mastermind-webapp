import { HydraWebProvider } from "@/services/hydra";
import { AppWallet, UTxO, resolveRewardAddress } from "@meshsdk/core";
import { useAddress, useWallet } from "@meshsdk/react";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";
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
      // Get all wallet addresses
      let addresses = new Set<string>();

      if (wallet.getUnusedAddresses !== undefined) {
        const unusedAddresses = await wallet.getUnusedAddresses();
        unusedAddresses.forEach((address) => addresses.add(address));
      }

      if (wallet.getChangeAddress !== undefined) {
        const changeAddress = await wallet.getChangeAddress();
        if (changeAddress) {
          addresses.add(changeAddress);
        }
      }

      if (wallet.getUsedAddresses !== undefined) {
        const usedAddresses = await wallet.getUsedAddresses();
        usedAddresses.forEach((address) => addresses.add(address));
      }

      // Resolve reward addresses
      const rewardAddress = new Set<string>();

      addresses.forEach((address) => {
        try {
          rewardAddress.add(resolveRewardAddress(address));
        } catch (_) {}
      });

      // Find hydra private key
      let privateKey: string | undefined;
      let address: string | undefined;

      // First look for the reward address
      rewardAddress.forEach((addr) => {
        const key = localStorage.getItem("hydraWalletPrivateKey-" + addr);
        if (key) {
          privateKey = key;
          address = addr;
        }
      });

      // If there is no reward address, look for the other addresses
      if (!privateKey) {
        addresses.forEach((addr) => {
          const key = localStorage.getItem("hydraWalletPrivateKey-" + addr);
          if (key) {
            privateKey = key;
            address = addr;
          }
        });
      }

      // Select address to associate with hydra wallet
      if (!privateKey) {
        rewardAddress.forEach((addr) => {
          if (!address) {
            address = addr;
          }
        });
        addresses.forEach((addr) => {
          if (!address) {
            address = addr;
          }
        });
      }

      if (connected && address) {
        connectToHydra({
          setHydraWallet,
          setHydraWalletAddress,
          hydraProvider,
          privateKey,
          address,
        });
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
