import useHydraWallet from "@/hooks/use-hydra-wallet";
import {
  dataCost,
  toValue,
  txBuilderConfig,
} from "@/services/blockchain-utils";
import {
  MastermindDatum,
  plutusScript,
  random128Hex,
} from "@/services/mastermind";
import { Game, GameSecret } from "@/types/game";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  UTxO,
  keepRelevant,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
} from "@meshsdk/core";
import axios, { AxiosError } from "axios";
import { Button, Modal, TextInput } from "flowbite-react";
import { Space_Mono } from "next/font/google";
import { useRouter } from "next/router";
import React, { use, useCallback, useEffect, useState } from "react";
import ColorRow from "../mastermind/color-row";
import useGameTransaction from "@/hooks/use-game-transaction";

const mainFont = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

type CreateNewGameModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateNewGameModal({
  isOpen,
  onClose,
}: CreateNewGameModalProps) {
  const [colorSequence, setColorSequence] = useState<Array<number>>(
    Array.from({ length: 4 }, () => Math.ceil(Math.random() * 4))
  );
  const [randomSalt, setRandomSalt] = useState<string>(random128Hex());
  const [adaAmount, setAdaAmount] = useState<string>("15");

  useEffect(() => {
    setColorSequence(
      Array.from({ length: 4 }, () => Math.ceil(Math.random() * 4))
    );
    setRandomSalt(random128Hex());
    setAdaAmount("15");
  }, []);

  return (
    <Modal className={`${mainFont.className} `} show={isOpen} onClose={onClose}>
      <Modal.Header>Create new game</Modal.Header>
      <Modal.Body className="prose dark:prose-invert">
        <p>Please select your secret sequence:</p>
        <div className="flex flex-row items-center justify-around">
          <ColorRow colorSequence={colorSequence} onChange={setColorSequence} />
        </div>
        <p>
          Now we need a secret salt for hashing the solution, you can select a
          random number, or type your own:
        </p>
        <TextInput disabled value={randomSalt} />
        <p className="text-gray-400">DO NOT SHARE THIS NUMBER WITH ANYONE</p>
        <p>Introduce ADA amount</p>
        <TextInput
          type="number"
          onChange={(evt) => setAdaAmount(evt.target.value)}
          value={adaAmount}
        />
      </Modal.Body>
      <Modal.Footer>
        <CreateGameButton
          secretCode={colorSequence}
          randomSalt={randomSalt}
          adaAmount={Number(adaAmount)}
          onClose={onClose}
        />
        <Button color="gray" onClick={() => onClose()}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function CreateGameButton({
  secretCode,
  randomSalt,
  adaAmount,
  onClose,
  ...props
}: {
  secretCode: Array<number>;
  randomSalt: string;
  adaAmount: number;
  onClose: () => void;
} & React.ComponentProps<typeof Button>) {
  const { hydraWalletAddress } = useHydraWallet();
  const router = useRouter();
  const { createNewGame, loading } = useGameTransaction();

  const createNewGameHandler = useCallback(async () => {
    if (
      hydraWalletAddress &&
      !secretCode.some((s) => s === undefined) &&
      adaAmount > 0
    ) {
      try {
        const { datum, txHash } = await createNewGame({
          secretCode,
          randomSalt,
          adaAmount,
        });

        const game: Partial<Game> = {
          codeMasterAddress: hydraWalletAddress,
          solutionHash: datum.hashSol.toString(),
          adaAmount: (adaAmount * 1000000).toString(),
          txHash: txHash,
          outputIndex: 0,
          currentDatum: (await datum.toCSL()).to_hex(),
        };

        const response = await axios.post(
          process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games",
          game
        );
        console.log(response.data);

        router.push("/games/" + response.data.data.id);
      } catch (e) {
        if (e instanceof AxiosError) {
          console.log(e.response?.data);
        }
        console.log(e);
      }
    }
  }, [
    hydraWalletAddress,
    secretCode,
    adaAmount,
    createNewGame,
    randomSalt,
    router,
  ]);

  return (
    <Button
      {...props}
      onClick={() => createNewGameHandler()}
      disabled={loading}
    >
      {loading ? "Creating game..." : "Create new game"}
    </Button>
  );
}
