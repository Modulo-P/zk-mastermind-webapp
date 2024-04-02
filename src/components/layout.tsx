"use client";

import useConfetti from "@/hooks/use-confetti";
import { useWallet } from "@meshsdk/react";
import { DarkThemeToggle, ThemeModeScript, useThemeMode } from "flowbite-react";
import { Space_Mono } from "next/font/google";
import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import Confetti from "react-confetti";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWindowSize } from "usehooks-ts";
import BrandLogo from "./ui/brand-logo";
import WalletDropdown from "./ui/wallet-dropdown";

const mainFont = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function Layout({ children }: React.PropsWithChildren) {
  const { width, height } = useWindowSize();
  const { confetti, setConfetti } = useConfetti();
  const { setMode } = useThemeMode();

  const { connected, wallet, disconnect, connect } = useWallet();

  useEffect(() => {
    if (connect && process.env.NODE_ENV === "development") {
      connect("eternl");
    }
  }, [connect]);

  useEffect(() => {
    if (!localStorage.getItem("flowbite-theme-mode-set")) {
      setMode("dark");
      localStorage.setItem("flowbite-theme-mode-set", "true");
    }
  }, [setMode]);

  useEffect(() => {
    const go = async () => {
      if (wallet && connected && (await wallet.getNetworkId()) !== 0) {
        toast.error("Please connect to the Cardano Preprod", {
          theme:
            localStorage.getItem("flowbite-theme-mode") === "dark"
              ? "dark"
              : "light",
        });
        disconnect();
      }
    };
    go();
  }, [connected, wallet, disconnect]);

  return (
    <>
      <Head>
        <ThemeModeScript />
      </Head>
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
        <div className="flex flex-row  w-full max-w-none fixed top-0 py-2 z-10 bg-gray-800  dark:bg-gray-900 items-center">
          <div className="ms-4">
            <Link href="/lobby" className="no-underline">
              <BrandLogo />
            </Link>
          </div>
          <div className="flex-1" />
          <div className="me-4">
            <WalletDropdown />
          </div>
        </div>

        <main className="mt-24">{children}</main>
        <DarkThemeToggle className="fixed bottom-10 right-10 border" />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </>
  );
}
