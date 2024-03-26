import { random128Hex } from "@/services/mastermind";
import { Button, Modal, TextInput } from "flowbite-react";
import { Space_Mono } from "next/font/google";
import { useEffect, useState } from "react";
import ColorRow from "../mastermind/color-row";
import CreateGameButton from "./create-new-game-button";

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
