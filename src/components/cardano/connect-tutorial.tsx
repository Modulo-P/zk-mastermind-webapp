"use client";
import useCardano from "@/hooks/use-cardano";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { Button, TextInput } from "flowbite-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ConnectTutorial() {
  const { connected } = useWallet();
  const { hydraWalletAddress, hydraUtxos } = useHydraWallet();
  const [depositAmount, setDepositAmount] = useState<string>("15");
  const { depositFundsToHydra } = useCardano();
  const router = useRouter();

  useEffect(() => {
    console.log("hydraUtxos", hydraUtxos);
  }, [hydraUtxos]);

  return (
    <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full px-4 flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800">
      <h2 className="mt-4 text-center font-normal uppercase">
        🚀 Connect to the dApp 🚀
      </h2>
      <p className="mt-2">Get your wallet ready to play:</p>
      <ul className="mt-0">
        <li>
          Connect your Cardano wallet {connected ? "✅" : "❌"}
          <div className="my-2">
            <CardanoWallet />
          </div>
        </li>
        <li>
          Generate Hydra Wallet {connected && hydraWalletAddress ? "✅" : "❌"}
        </li>
        <li>
          Deposit funds in Hydra{" "}
          {connected && hydraUtxos.length > 0 ? "✅" : "❌"}
        </li>
        {connected && hydraWalletAddress && (
          <div className="flex flex-row gap-2">
            <TextInput
              type="number"
              onChange={(evt) => setDepositAmount(evt.target.value)}
              value={depositAmount}
            />
            <Button onClick={() => depositFundsToHydra(Number(depositAmount))}>
              Deposit
            </Button>
          </div>
        )}
        <li>
          {connected && hydraWalletAddress && hydraUtxos.length > 0
            ? "You are ready to play!"
            : "You are not ready to play yet!"}
          <Button
            color="purple"
            className="mt-2"
            disabled={
              !(connected && hydraWalletAddress && hydraUtxos.length > 0)
            }
            onClick={() => router.push("/lobby")}
          >
            Play!
          </Button>
        </li>
      </ul>
    </div>
  );
}
