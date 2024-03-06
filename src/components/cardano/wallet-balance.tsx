import { useLovelace, useWallet, useWalletList } from "@meshsdk/react";
import Image from "next/image";

interface WalletBalanceProps {
  label: string;
}

export default function WalletBalance({ label }: WalletBalanceProps) {
  const { connected, connecting, name } = useWallet();
  const wallet = useWalletList().find((wallet) => wallet.name === name);
  const balance = useLovelace();

  return connected && balance && wallet?.icon ? (
    <div className="flex flex-row items-center">
      <div className="h-5 w-5 relative">
        <Image src={wallet.icon} alt="Icon" fill={true} />
      </div>
      <div className="ml-2">
        ₳ {parseInt((parseInt(balance, 10) / 10_000).toString(), 10) / 100}
      </div>
    </div>
  ) : connected && wallet?.icon ? (
    <div className="h-5 w-5 relative">
      <Image src={wallet.icon} alt="Icon" fill={true} />
    </div>
  ) : connecting ? (
    <>Connecting...</>
  ) : (
    <>{label}</>
  );
}
