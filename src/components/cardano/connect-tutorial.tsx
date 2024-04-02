"use client";
import useCardano from "@/hooks/use-cardano";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { useUser } from "@/hooks/use-user";
import { User } from "@/types/user";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import axios from "axios";
import { Button, TextInput } from "flowbite-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ConnectTutorial() {
  const { connected } = useWallet();
  const { hydraWalletAddress, hydraUtxos } = useHydraWallet();
  const [nickname, setNickname] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("15");
  const { depositFundsToHydra } = useCardano();
  const router = useRouter();
  const { user, setUser } = useUser();

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
    }
  }, [user]);

  const handleSaveNickame = async (nickname: string) => {
    if (hydraWalletAddress && nickname) {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/users/?address=${hydraWalletAddress}`
        );
        let user: User | null = response.data.data;
        if (!user) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/users`,
            {
              address: hydraWalletAddress,
              nickname,
            }
          );
          user = response.data.data;
        } else {
          const response = await axios.patch(
            `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/users`,
            {
              id: user.id,
              address: hydraWalletAddress,
              nickname,
            }
          );
          user = response.data.data;
        }
        setUser(user);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full px-4 flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800">
      <h2 className="mt-4 text-center font-normal uppercase">
        🚀 Connect to the dApp 🚀
      </h2>
      <p className="mt-2">
        Get your <b>Preprod</b> wallet ready to play:
      </p>
      <ul className="mt-0">
        <li>
          Connect your Cardano wallet (preprod) {connected ? "✅" : "❌"}
          <div className="my-2">
            <CardanoWallet />
          </div>
        </li>
        <li>
          Generate Hydra Wallet {connected && hydraWalletAddress ? "✅" : "❌"}
        </li>
        <li>
          Choose a nickname {connected && hydraWalletAddress ? "✅" : "❌"}
        </li>
        {connected && hydraWalletAddress && (
          <div className="flex flex-row gap-2">
            <TextInput
              value={nickname}
              onChange={(evt) => setNickname(evt.target.value)}
            />
            <Button onClick={() => handleSaveNickame(nickname)}>Save</Button>
          </div>
        )}
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
