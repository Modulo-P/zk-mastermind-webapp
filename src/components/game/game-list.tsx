import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Game } from "@/types/game";
import { resolvePaymentKeyHash } from "@meshsdk/core";
import { FlowbiteTableTheme, Table } from "flowbite-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function GameList({ games }: { games?: Game[] }) {
  const router = useRouter();
  const { hydraWalletAddress } = useHydraWallet();
  return (
    <>
      {games && games.length === 0 && (
        <p className="text-center text-gray-400">No games</p>
      )}
      {games && games.length > 0 && (
        <div className="relative">
          <div className="bg-gray-100 h-10 right-10 w-full absolute z-10 dark:bg-gray-800"></div>
          <div className="max-h-56 overflow-auto m-0 p-0 relative">
            <Table className="text-xs top-0">
              <Table.Head className="sticky top-0 z-20 border-b border-gray-300 dark:border-0">
                <Table.HeadCell>Code master</Table.HeadCell>
                <Table.HeadCell>My role</Table.HeadCell>
                <Table.HeadCell>hADA</Table.HeadCell>
                <Table.HeadCell>State</Table.HeadCell>
                <Table.HeadCell>
                  <span className="sr-only">Edit</span>
                </Table.HeadCell>
              </Table.Head>
              <Table.Body className="z-0">
                {games &&
                  games.map((game) => (
                    <Table.Row key={game.id}>
                      <Table.Cell className="overflow-ellipsis font-medium text-gray-900 dark:text-white">
                        {game.codeMaster.substring(0, 14) +
                          "..." +
                          game.codeMaster.substring(game.codeMaster.length - 4)}
                      </Table.Cell>
                      <Table.Cell>
                        {hydraWalletAddress &&
                        game.codeMaster === hydraWalletAddress
                          ? "Code master"
                          : "Code breaker"}
                      </Table.Cell>
                      <Table.Cell>
                        {Number(game.adaAmount) / 1000000}
                      </Table.Cell>
                      <Table.Cell>{game.state}</Table.Cell>
                      <Table.Cell>
                        <Link
                          href={`/games/${game.id}`}
                          className="font-medium text-cyan-600 hover:underline dark:text-cyan-500"
                        >
                          Play!
                        </Link>
                      </Table.Cell>
                    </Table.Row>
                  ))}
              </Table.Body>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
