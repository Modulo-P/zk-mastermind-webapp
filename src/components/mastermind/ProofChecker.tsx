import { MastermindDatum } from "@/services/mastermind";
import { Proof } from "@/types/zk";
import { Label, TextInput, Textarea } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";
import vkJson from "../../services/vk.json";
import ColorRow from "./color-row";
import { FaCheck, FaTimes } from "react-icons/fa";

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

  const handleCheckButton = useCallback(async () => {
    console.log("check");
    console.log("proof", datum.proof);
    console.log("vkJson", vkJson);

    console.log("Public signals", [
      solutionHash,
      colorSequence[0],
      colorSequence[1],
      colorSequence[2],
      colorSequence[3],
      blackPegs,
      whitePegs,
      solutionHash,
    ]);

    if (solutionHash === "" || !datum.proof) {
      return;
    }

    try {
      const result = await snarkjs.groth16.verify(
        vkJson,
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
  }, [
    datum.proof,
    solutionHash,
    colorSequence,
    blackPegs,
    whitePegs,
    proof,
    setCheckCB,
  ]);

  useEffect(() => {
    handleCheckButton();
  }, [handleCheckButton]);

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
