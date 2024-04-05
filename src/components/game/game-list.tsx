import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Game } from "@/types/game";
import { Button, Table } from "flowbite-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaTwitter } from "react-icons/fa";
import { TwitterShareButton } from "react-share";

export default function GameList({ games }: { games?: Game[] }) {
  const router = useRouter();
  const { hydraWalletAddress } = useHydraWallet();
  return (
    <>
      {games && games.length === 0 && (
        <p className="prose dark:prose-invert text-center text-gray-400">
          No games
        </p>
      )}
      {games && games.length > 0 && (
        <div className="relative">
          <div className="bg-gray-100 h-10 right-10 w-full absolute z-10 dark:bg-gray-800"></div>
          <div className="max-h-56 overflow-auto m-0 p-0 relative">
            <Table className="text-xs top-0">
              <Table.Head className="sticky top-0 z-20 border-b border-gray-300 dark:border-0">
                <Table.HeadCell>Code master</Table.HeadCell>
                <Table.HeadCell>Code breaker</Table.HeadCell>
                <Table.HeadCell>My role</Table.HeadCell>
                <Table.HeadCell>hADA</Table.HeadCell>
                <Table.HeadCell>State</Table.HeadCell>
                <Table.HeadCell>Share</Table.HeadCell>
                <Table.HeadCell>
                  <span className="sr-only">Play</span>
                </Table.HeadCell>
              </Table.Head>
              <Table.Body className="z-0">
                {games &&
                  games.map((game) => (
                    <Table.Row key={game.id}>
                      <Table.Cell className="overflow-ellipsis font-medium text-gray-900 dark:text-white">
                        {game.codeMaster.nickname}
                      </Table.Cell>
                      <Table.Cell>{game.codeBreaker?.nickname}</Table.Cell>
                      <Table.Cell>
                        {hydraWalletAddress &&
                        game.codeMasterAddress === hydraWalletAddress
                          ? "Code master"
                          : "Code breaker"}
                      </Table.Cell>
                      <Table.Cell>
                        {Number(game.adaAmount) / 1000000}
                      </Table.Cell>
                      <Table.Cell>{game.state}</Table.Cell>
                      <Table.Cell>
                        <TwitterShareButton
                          url={`https://zkmastermind.modulo-p.io/games/${game.id}`}
                          title={`I'm looking for a challenger on ZK-Mastermind. Can you break the code? $ADA`}
                          hashtags={["ZkMastermind", "Cardano", "ADA"]}
                          related={["modp_"]}
                        >
                          <Button color="blue">
                            <FaTwitter size={16} className="" />
                          </Button>
                        </TwitterShareButton>
                      </Table.Cell>
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
