import React, { ReactElement, useEffect } from "react";
import Layout from "../../components/layout";
import { Button } from "flowbite-react";
import useDisclosure from "@/hooks/use-disclosure";
import CreateNewGameModal from "@/components/game/create-new-game-modal";
import ActiveGameTable from "@/components/game/active-games-table";
import useHydraWallet from "@/hooks/use-hydra-wallet";

export default function Lobby() {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const { hydraWalletAddress } = useHydraWallet();

  return (
    <>
      <div className="flex flex-col max-w-4xl mx-auto">
        <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8">
          <div className="prose dark:prose-invert">
            <h2 className="m-0">Lobby</h2>
            <div className="flex flex-row">
              <p className="">Please select a game or create a new one.</p>
            </div>
            <Button
              className="not-prose mb-4"
              color="purple"
              size={"xs"}
              onClick={() => onOpen()}
              disabled={!hydraWalletAddress}
            >
              Create new game
            </Button>
          </div>
          <ActiveGameTable />
        </div>
      </div>
      <CreateNewGameModal isOpen={isOpen} onClose={onClose} />
    </>
  );
}

Lobby.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
