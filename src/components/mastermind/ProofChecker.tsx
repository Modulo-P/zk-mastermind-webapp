import { MastermindDatum, MastermindGame } from "@/services/mastermind";
import { Proof } from "@/types/zk";
import { Label, TextInput, Textarea } from "flowbite-react";
import { useEffect, useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import ColorRow from "./color-row";

const snarkjs = require("snarkjs");

type Props = {
  datum: MastermindDatum;
  setCheckCB?: (check: boolean) => void;
};
export default function ProofChecker({ datum, setCheckCB }: Props) {
  const [colorSequence, setColorSequence] = useState<Array<number>>(
    datum.guesses
  );
  const [proof, setProof] = useState<Proof>(
    datum.getSnarkProof() ?? { pi_a: [], pi_b: [[]], pi_c: [] }
  );
  const [solutionHash, setSolutionHash] = useState<string>(
    datum.hashSol.toString()
  );
  const [whitePegs, setWhitePegs] = useState<string>(
    datum.whitePegs.toString()
  );
  const [blackPegs, setBlackPegs] = useState<string>(
    datum.blackPegs.toString()
  );
  const [check, setCheck] = useState<boolean>(true);

  useEffect(() => {
    const go = async () => {
      if (solutionHash === "" || !datum.proof || !MastermindGame.snarkVk) {
        return;
      }

      try {
        const result = await snarkjs.groth16.verify(
          MastermindGame.snarkVk,
          [
            solutionHash,
            colorSequence[0].toString(),
            colorSequence[1].toString(),
            colorSequence[2].toString(),
            colorSequence[3].toString(),
            blackPegs,
            whitePegs,
            solutionHash,
          ],
          proof
        );
        console.log("result", result);
        setCheck(result);
        if (setCheckCB) {
          setCheckCB(result);
        }
      } catch (e) {
        console.error(e);
      }
    };
    go();
  }, [
    datum.proof,
    solutionHash,
    colorSequence,
    blackPegs,
    whitePegs,
    proof,
    setCheckCB,
  ]);

  return (
    <>
      <div className="prose dark:prose-invert flex flex-col gap-2">
        <Label>Proof</Label>
        <Textarea
          placeholder="Enter your proof"
          rows={10}
          value={JSON.stringify(proof)}
          onChange={(evt) => setProof(JSON.parse(evt.target.value))}
        />
        <Label>Solution hash</Label>
        <TextInput
          value={solutionHash}
          onChange={(evt) => setSolutionHash(evt.target.value)}
          placeholder="Enter your solution hash"
        ></TextInput>
        <Label>Black pegs</Label>
        <TextInput
          type="number"
          value={blackPegs}
          onChange={(evt) => setBlackPegs(evt.target.value)}
        ></TextInput>
        <Label>White pegs</Label>
        <TextInput
          type="number"
          value={whitePegs}
          onChange={(evt) => setWhitePegs(evt.target.value)}
        ></TextInput>
        <div>
          <div>
            <ColorRow
              colorSequence={colorSequence}
              blocked={false}
              onChange={(cS) => {
                setColorSequence(cS);
              }}
            />
          </div>
          <div>
            <div className="flex flex-row gap-4 items-center">
              <div>Result</div>
              {check && <FaCheck size={48} color="green" />}
              {!check && <FaTimes size={48} color="red" />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
