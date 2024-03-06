import { useGames } from "@/hooks/use-games";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Table } from "flowbite-react";
import React from "react";
import GameList from "./game-list";

export default function ActiveGameTable() {
  const { activeGames } = useGames();
  const { hydraWalletAddress } = useHydraWallet();
  return (
    <>
      {!hydraWalletAddress && (
        <p className="prose dark:prose-invert">Connect to hydra</p>
      )}
      {hydraWalletAddress && (
        <div>
          <p className="prose dark:prose-invert my-4">My games:</p>
          <GameList
            games={activeGames?.filter(
              (game) =>
                (game.codeMasterAddress === hydraWalletAddress ||
                  game.codeBreakerAddress === hydraWalletAddress) &&
                game.state !== "FINISHED"
            )}
          />
          <p className="prose dark:prose-invert my-4">
            Games waiting an openent:
          </p>
          <GameList
            games={activeGames?.filter(
              (game) =>
                game.state === "CREATED" &&
                game.codeMasterAddress !== hydraWalletAddress
            )}
          />
        </div>
      )}
    </>
  );
}
