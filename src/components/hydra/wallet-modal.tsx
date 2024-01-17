import useCardano from "@/hooks/use-cardano";
import useHydra from "@/hooks/use-hydra";
import { Button, Modal, TextInput } from "flowbite-react";
import { Space_Mono } from "next/font/google";
import { useState } from "react";

const mainFont = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

type WalletModalProps = {
  openModal: boolean;
  onClose: () => void;
};

function WalletModal({ openModal, onClose }: WalletModalProps) {
  const [depositAmount, setDepositAmount] = useState<string>("15");

  const { depositFundsToHydra } = useCardano();
  const { withdrawFundsFromHydra } = useHydra();

  return (
    <>
      <Modal
        className={`${mainFont.className}`}
        show={openModal}
        onClose={onClose}
        size="lg"
      >
        <Modal.Header>Hydra wallet</Modal.Header>
        <Modal.Body className="prose dark:prose-invert">
          <h3 className="text-normal">
            Manage your Hydra funds. You can deposit or withdraw your funds.
          </h3>
          <p>
            <strong>Deposit</strong> funds to Hydra to start playing. You can
            deposit as much as you want, but you need at least 5 ADA to start
            playing.
          </p>
          <div className="flex flex-row gap-2">
            <TextInput
              type="number"
              onChange={(evt) => setDepositAmount(evt.target.value)}
              value={depositAmount}
            />
            <Button
              onClick={() => {
                depositFundsToHydra(Number(depositAmount));
                onClose();
              }}
            >
              Deposit
            </Button>
          </div>
          <p>
            <strong>Withdraw</strong> all funds to your wallet. This action will
            withdraw all your funds from Hydra to your Cardano wallet limiting
            your interaction with the game.
          </p>
          <div>
            <Button color="purple" onClick={() => withdrawFundsFromHydra()}>
              Withdraw
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default WalletModal;
