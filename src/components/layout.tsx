"use client";

import WalletBalance from "@/components/hydra/wallet-balance";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { DarkThemeToggle } from "flowbite-react";
import { Space_Mono } from "next/font/google";
import Link from "next/link";
import { useEffect } from "react";
import { useWindowSize } from "usehooks-ts";
import BrandLogo from "./ui/brand-logo";
import Confetti from "react-confetti";
import useConfetti from "@/hooks/use-confetti";

const mainFont = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function Layout({ children }: React.PropsWithChildren) {
  const { hydraUtxos } = useHydraWallet();
  const { width, height } = useWindowSize();
  const { confetti, setConfetti } = useConfetti();

  const { connect } = useWallet();

  // useEffect(() => {
  //   connect("eternl");
  // }, [connect]);

  return (
    <div className={`${mainFont.className} tracking-wide`}>
      <div className="absolute top-0 left-0 w-full">
        <Confetti
          width={width}
          height={height}
          className="top-0 left-0 absolute"
          run={confetti}
          numberOfPieces={2000}
          recycle={false}
          onConfettiComplete={(c) => {
            setConfetti(false);
            c?.reset();
          }}
        />
      </div>
      <div className="prose dark:prose-invert flex flex-row  w-full max-w-none fixed top-0 py-2 z-10 bg-gray-900 items-center">
        <div className="ms-4">
          <Link href="/lobby" className="no-underline">
            <BrandLogo />
          </Link>
        </div>
        <div className="flex-1" />
        <WalletBalance />
        <div className="me-4">
          <CardanoWallet />
        </div>
      </div>

      <main className="mt-24">{children}</main>
      <DarkThemeToggle className="fixed bottom-10 right-10 border" />
    </div>
  );
}
