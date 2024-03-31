import { MastermindDatum } from "@/services/mastermind";
import ProofChecker from "./ProofChecker";
import { useEffect, useState } from "react";
import { PiPiBold } from "react-icons/pi";
import useDisclosure from "@/hooks/use-disclosure";
import { Button, Modal } from "flowbite-react";
import { Space_Mono } from "next/font/google";

const mainFont = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

type Props = {
  datum: MastermindDatum | null;
};

export default function ProofCheckerModal({ datum }: Props) {
  const [check, setCheck] = useState<boolean>(true);
  const { isOpen, onClose, onOpen } = useDisclosure();
  const [checkerComponent, setCheckerComponent] = useState<JSX.Element | null>(
    null
  );

  useEffect(() => {
    if (datum) {
      setCheckerComponent(<ProofChecker datum={datum} setCheckCB={setCheck} />);
    }
  }, [datum]);

  return (
    <>
      <Button
        type="button"
        color={!datum ? "gray" : check ? "green" : "red"}
        onClick={() => datum && onOpen()}
      >
        <PiPiBold size={"15px"} />
      </Button>
      <div className="hidden">{checkerComponent}</div>
      <Modal
        className={`${mainFont.className} `}
        show={isOpen}
        onClose={onClose}
      >
        <Modal.Header>Info</Modal.Header>
        <Modal.Body>{datum && checkerComponent}</Modal.Body>
      </Modal>
    </>
  );
}

export function ProofCheckerModalButton({
  datum,
  setCheck,
}: {
  datum: MastermindDatum;
  setCheck: (check: boolean) => void;
}) {
  return <ProofChecker datum={datum} setCheckCB={setCheck} />;
}
