import ClaimButton from "@/components/game/claim-button";
import ClueForm from "@/components/game/clue-form";
import GuessButton from "@/components/game/guess-button";
import Layout from "@/components/layout";
import ProofCheckerModal from "@/components/mastermind/ProofCheckerModal";
import Board from "@/components/mastermind/board";
import useGame from "@/hooks/use-game";
import useGameTransaction from "@/hooks/use-game-transaction";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import { MastermindDatum } from "@/services/mastermind";
import { Game } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import axios, { AxiosError } from "axios";
import { Button } from "flowbite-react";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ReactElement, useEffect } from "react";
import { FaTwitter } from "react-icons/fa";
import { TwitterShareButton } from "react-share";

export async function getServerSideProps({
  params,
}: GetServerSidePropsContext) {
  if (!params || !params.id) {
    return { notFound: true };
  }

  const res = await axios.get(
    `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/games/?id=${params.id}`
  );

  if (res.status !== 200 || !res.data) {
    return { notFound: true };
  }

  return { props: { game: res.data as Game } };
}

export default function Game({
  game: serverGame,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { hydraWalletAddress, hydraWallet, hydraUtxos } = useHydraWallet();
  const { findHydraUtxo } = useHydra();
  const { game, priorGameRow, currentGameRow } = useGame({
    id: Number(router.query.id),
  });
  const { end } = useGameTransaction();
  const { waitTransactionConfirmation } = useTransactionLifecycle();

  useEffect(() => {
    const endGame = async () => {
      let winnerAddress = "";

      if (
        game &&
        priorGameRow &&
        game.codeMasterAddress === hydraWalletAddress &&
        game.currentTurn === 20 &&
        priorGameRow.blackPegs < 4
      ) {
        winnerAddress = game.codeMaster;
      } else if (
        game &&
        priorGameRow &&
        game.codeBreakerAddress === hydraWalletAddress &&
        priorGameRow.blackPegs === 4
      ) {
        winnerAddress = game.codeBreakerAddress;
      }

      if (
        !winnerAddress ||
        (hydraWalletAddress !== winnerAddress && game?.state !== "STARTED")
      )
        return;

      if (
        !hydraWallet ||
        !hydraUtxos ||
        !game ||
        !game.rows ||
        !hydraWalletAddress
      )
        return;
      try {
        await setTimeout(() => {}, 5000);

        try {
          const { txHash } = await end({ game, priorGameRow });

          await waitTransactionConfirmation(txHash);

          game.state = "FINISHED";
          const response = await axios.patch(
            process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games",
            game
          );
          console.log(response.data);

          router.push("/lobby");
        } catch (e) {
          if (e instanceof AxiosError) {
            console.log(e.response?.data);
          }
          console.log(e);
        }
      } catch (e) {
        console.log(e);
      }
    };
    endGame();
  }, [
    currentGameRow,
    end,
    findHydraUtxo,
    game,
    hydraUtxos,
    hydraWallet,
    hydraWalletAddress,
    priorGameRow,
    router,
    waitTransactionConfirmation,
  ]);

  return (
    <>
      <Head>
        <meta name="og:title" content="Play ZK-Mastermind on Hydra" />
        <meta
          name="og:description"
          content={`${serverGame.codeMaster.nickname} is looking for a challenger. Can you break the code? $ADA #ZkMastermind`}
        />
        <meta
          name="og:image"
          content="https://zkmastermind.modulo-p.io/img/twitter-image.png"
        />
        <meta name="twitter:title" content="Play ZK-Mastermind on Hydra" />
        <meta name="twitter:site" content="@modp_" />
        <meta
          name="twitter:description"
          content={`${serverGame.codeMaster.nickname} is looking for a challenger. Can you break the code? $ADA #ZkMastermind`}
        />
        <meta
          name="twitter:image"
          content="https://zkmastermind.modulo-p.io/img/twitter-image.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <div className="flex flex-col max-w-4xl mx-auto">
        <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8 mb-8">
          <div className="prose dark:prose-invert text-center max-w-2xl mx-auto">
            🚨IMPORTANT!!!🚨 If you like what we are doing!! Please consider
            support us in Catalyst: 🚦
            <a
              href="https://cardano.ideascale.com/c/idea/113249"
              target="_blank"
            >
              Semaphore protocol
            </a>
            🚦
          </div>
        </div>
        <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8">
          <div className="flex flex-row gap-8 ">
            <div className="flex flex-col prose dark:prose-invert">
              <h2 className="text-center mb-2">Board</h2>
              <p className="text-center my-2">
                {game?.codeBreakerAddress && (
                  <>
                    {game.codeMaster.nickname} 🆚 {game.codeBreaker.nickname}
                  </>
                )}
              </p>
              {game && (
                <div className="flex flex-row gap-4">
                  <div>Initial proof:</div>
                  <ProofCheckerModal
                    datum={MastermindDatum.fromCsl(
                      CSL.PlutusData.from_hex(game.turns[0].datum)
                    )}
                  />
                </div>
              )}
              <p className="text-xs">TIP: click to change the color</p>
              {game?.rows && <Board id={game.id} readonly={false} />}
            </div>
            <div className="flex flex-col flex-grow prose dark:prose-invert text-sm">
              <h2 className="text-center ">Smart contract control</h2>
              <p>
                Modulo-P brings you the first-ever game to experience the speed
                of Hydra and ZK proofs on Cardano.
              </p>
              {game &&
                ((hydraWalletAddress === game.codeBreakerAddress &&
                  game.state === "STARTED") ||
                  (game.state === "CREATED" &&
                    game.codeMasterAddress !== hydraWalletAddress)) && (
                  <div>
                    <p>
                      You are the code breaker 🥷. Select a sequence and send
                      your guess to the code master. Wait until the code master
                      give you back a clue. This clue is shield by a ZK Proof
                      and it can&apos;t be incorrect.
                    </p>
                    <GuessButton
                      game={game}
                      setInfoMessage={(message) =>
                        console.log("guess button", message)
                      }
                    />
                  </div>
                )}
              {game &&
                ["STARTED", "CREATED"].includes(game.state) &&
                hydraWalletAddress === game.codeMasterAddress && (
                  <div>
                    <p>
                      You are the code master 🧙🏻‍♀️. Wait for the code breaker.
                      When you recieve a guess, remember to give back the
                      correct clue. Else you won&apos;t be able to continue the
                      game.{" "}
                    </p>
                    <ClueForm id={game.id} />
                    <p>
                      Searching for a challenger. You are the code master. Post
                      on social media to find a challenger.
                    </p>
                    <TwitterShareButton
                      url={`https://zkmastermind.modulo-p.io/games/${game.id}`}
                      title={`I'm looking for a challenger on ZK-Mastermind. Can you break the code?`}
                      hashtags={["ZkMastermind", "Cardano", "ADA"]}
                      related={["modp_"]}
                    >
                      <Button color="blue">
                        Share on Twitter{" "}
                        <FaTwitter size={24} className="ms-2" />
                      </Button>
                    </TwitterShareButton>
                  </div>
                )}
              {game && game.state == "STARTED" && currentGameRow && (
                <>
                  <p>
                    If your opponent doesn&apos;t respond within a time limit,
                    you will have the right to claim the game.
                  </p>
                  <ClaimButton game={game} currentGameRow={currentGameRow} />
                </>
              )}
              {game && game.state === "FINISHED" && (
                <p>The game is finished.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Game.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
