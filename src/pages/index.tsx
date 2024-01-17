"use client";

import ConnectTutorial from "@/components/cardano/connect-tutorial";
import { Indie_Flower, Press_Start_2P } from "next/font/google";
import { ReactElement } from "react";
import Layout from "../components/layout";
import Logo from "@/components/ui/logo";

const titleFont = Press_Start_2P({
  weight: ["400"],
  subsets: ["latin"],
});
const titleFont2 = Indie_Flower({
  weight: ["400"],
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className="prose dark:prose-invert flex flex-col items-center max-w-2xl mx-auto">
      <Logo />
      <p className="">
        Welcome to ZK Mastermind, a game where you can play Mastermind in the
        blockchain without revealing your secret code!
      </p>
      <ConnectTutorial />
    </div>
  );
}

Home.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
