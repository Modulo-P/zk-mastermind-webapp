import {
  Proof,
  RdmProof,
  VerificationKey,
  VerificationKeyDatum,
} from "@/types/zk";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { Data, PlutusScript } from "@meshsdk/core";
import axios from "axios";
import { createHash } from "crypto";
const snarkjs = require("snarkjs");

export interface ColorSchema {
  color: string;
  colorDark: string;
  bgTW: string;
  bgTWDark: string;
}

export const colorSchema: ColorSchema[] = [
  {
    color: "#FFB400",
    colorDark: "#FFB400",
    bgTW: "bg-[#FFB400]",
    bgTWDark: "bg-[#FFB400]",
  },
  {
    color: "#FF5A5F",
    colorDark: "#FF5A5F",
    bgTW: "bg-[#FF5A5F]",
    bgTWDark: "bg-[#FF5A5F]",
  },
  {
    color: "#8CE071",
    colorDark: "#8CE071",
    bgTW: "bg-[#8CE071]",
    bgTWDark: "bg-[#8CE071]",
  },
  {
    color: "#00D1C1",
    colorDark: "#00D1C1",
    bgTW: "bg-[#00D1C1]",
    bgTWDark: "bg-[#00D1C1]",
  },
  {
    color: "#007A87",
    colorDark: "#007A87",
    bgTW: "bg-[#007A87]",
    bgTWDark: "bg-[#007A87]",
  },
  {
    color: "#7B0051",
    colorDark: "#7B0051",
    bgTW: "bg-[#7B0051]",
    bgTWDark: "bg-[#7B0051]",
  },
];

export class MastermindGame {
  static vk: VerificationKeyDatum | null = null;
  static snarkVk: VerificationKey | null = null;
  static plutusScript: PlutusScript | null = null;

  static _initialized = (async () => {
    const vk: VerificationKey = (
      await axios.get(`${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/vk.json`)
    ).data;

    MastermindGame.snarkVk = vk;

    let result = {} as VerificationKeyDatum;
    result.nPublic = Number(vk.nPublic);
    result.vkAlpha1 = vk.vk_alpha_1.map((x) => BigInt(x));
    result.vkBeta2 = vk.vk_beta_2.map((x) => x.map((y) => BigInt(y)));
    result.vkGamma2 = vk.vk_gamma_2.map((x) => x.map((y) => BigInt(y)));
    result.vkDelta2 = vk.vk_delta_2.map((x) => x.map((y) => BigInt(y)));
    result.vkAlphabeta12 = vk.vk_alphabeta_12.map((x) =>
      x.map((y) => y.map((z) => BigInt(z)))
    );
    result.IC = vk.IC.map((x) => x.map((y) => BigInt(y)));
    result.protocol = vk.protocol;
    result.curve = vk.curve;

    MastermindGame.vk = result;

    MastermindGame.plutusScript = (
      await axios.get(`${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/plutus.json`)
    ).data;
  })();
}

// Reference: https://github.com/Emurgo/cardano-serialization-lib/blob/master/rust/src/plutus.rs

export class MastermindDatum {
  constructor(
    public codeMaster: string,
    public codeBreaker: string,
    public hashSol: bigint,
    public guesses: number[],
    public blackPegs: number,
    public whitePegs: number,
    public currentTurn: number,
    public expirationTime: number,
    public proof: RdmProof | null = null
  ) {
    async function loadVk(self: MastermindDatum) {}

    loadVk(this);
  }

  // Enocde the Mastermind PlutusData
  public toCSL(): CSL.PlutusData {
    if (this.proof === null) {
      throw new Error("Proof is not set");
    }

    if (MastermindGame.vk === null) {
      throw new Error("Verification Key is not set");
    }

    // Create a Plutus List
    const fields = CSL.PlutusList.new();

    // Transform each of the fields a to plutus data and append it to the fields Plutus List

    fields.add(CSL.PlutusData.new_bytes(Buffer.from(this.codeMaster, "hex")));
    fields.add(CSL.PlutusData.new_bytes(Buffer.from(this.codeBreaker, "hex")));
    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.hashSol.toString()))
    );

    const guesses = CSL.PlutusList.new();
    this.guesses.forEach((guess) => {
      guesses.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(guess.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(guesses));

    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.blackPegs.toString()))
    );
    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.whitePegs.toString()))
    );
    fields.add(
      CSL.PlutusData.new_integer(
        CSL.BigInt.from_str(this.currentTurn.toString())
      )
    );
    fields.add(
      CSL.PlutusData.new_integer(
        CSL.BigInt.from_str(this.expirationTime.toString())
      )
    );

    // Create a Plutus List to gather VerificationKey values
    const vkey = CSL.PlutusList.new();

    // Transform each of the fields a to plutus data and append it to the vkey Plutus List

    vkey.add(
      CSL.PlutusData.new_integer(
        CSL.BigInt.from_str(MastermindGame.vk.nPublic.toString())
      )
    );

    const vkAlpha1 = CSL.PlutusList.new();
    MastermindGame.vk.vkAlpha1.forEach((vk) => {
      vkAlpha1.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(vk.toString()))
      );
    });
    vkey.add(CSL.PlutusData.new_list(vkAlpha1));

    const vkBeta2 = CSL.PlutusList.new();
    MastermindGame.vk.vkBeta2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkBeta2.add(CSL.PlutusData.new_list(vkList));
    });
    vkey.add(CSL.PlutusData.new_list(vkBeta2));

    const vkGamma2 = CSL.PlutusList.new();
    MastermindGame.vk.vkGamma2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkGamma2.add(CSL.PlutusData.new_list(vkList));
    });
    vkey.add(CSL.PlutusData.new_list(vkGamma2));

    const vkDelta2 = CSL.PlutusList.new();
    MastermindGame.vk.vkDelta2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkDelta2.add(CSL.PlutusData.new_list(vkList));
    });
    vkey.add(CSL.PlutusData.new_list(vkDelta2));

    const vkAlphabeta12 = CSL.PlutusList.new();
    MastermindGame.vk.vkAlphabeta12.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        const vkElemList = CSL.PlutusList.new();
        vkElem.forEach((vkElemElem) => {
          vkElemList.add(
            CSL.PlutusData.new_integer(
              CSL.BigInt.from_str(vkElemElem.toString())
            )
          );
        });
        vkList.add(CSL.PlutusData.new_list(vkElemList));
      });
      vkAlphabeta12.add(CSL.PlutusData.new_list(vkList));
    });
    vkey.add(CSL.PlutusData.new_list(vkAlphabeta12));

    const ic = CSL.PlutusList.new();
    MastermindGame.vk.IC.forEach((icElem) => {
      const icElemList = CSL.PlutusList.new();
      icElem.forEach((icElemElem) => {
        icElemList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(icElemElem.toString()))
        );
      });
      ic.add(CSL.PlutusData.new_list(icElemList));
    });
    vkey.add(CSL.PlutusData.new_list(ic));

    // Create a Constructor that represents the VerificationKey type.
    const vkey_agreggation = CSL.PlutusData.new_constr_plutus_data(
      CSL.ConstrPlutusData.new(CSL.BigNum.from_str("0"), vkey)
    );

    // Append the VerificationKey Data to the fields Plutus List
    fields.add(vkey_agreggation);

    // Proof
    // Create Plutus list of RdmProof
    const proof_fields = CSL.PlutusList.new();

    const piA = CSL.PlutusList.new();
    this.proof.piA.forEach((piAElem) => {
      piA.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(piAElem.toString()))
      );
    });
    proof_fields.add(CSL.PlutusData.new_list(piA));

    const piB = CSL.PlutusList.new();
    this.proof.piB.forEach((piBElem) => {
      const piBElemList = CSL.PlutusList.new();
      piBElem.forEach((piBElemElem) => {
        piBElemList.add(
          CSL.PlutusData.new_integer(
            CSL.BigInt.from_str(piBElemElem.toString())
          )
        );
      });
      piB.add(CSL.PlutusData.new_list(piBElemList));
    });
    proof_fields.add(CSL.PlutusData.new_list(piB));

    const piC = CSL.PlutusList.new();
    this.proof.piC.forEach((piC1Elem) => {
      piC.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(piC1Elem.toString()))
      );
    });
    proof_fields.add(CSL.PlutusData.new_list(piC));

    // Create a Constructor that represents the RdmProof type.
    const proofValue = CSL.PlutusData.new_constr_plutus_data(
      CSL.ConstrPlutusData.new(CSL.BigNum.from_str("0"), proof_fields)
    );

    // Add the RdmProof Data to the fields of MastermindRedeemer
    fields.add(proofValue);

    // Create a Constructor that represents the MastermindDatum type.
    const result = CSL.PlutusData.new_constr_plutus_data(
      CSL.ConstrPlutusData.new(CSL.BigNum.from_str("0"), fields)
    );

    result;

    return result;
  }

  public static fromCsl(datum: CSL.PlutusData) {
    // Create a Mastermind data object with empty values
    const result: MastermindDatum = {} as MastermindDatum;

    // Check if its a Option<ConstrPlutusData>
    const cto = datum.as_constr_plutus_data()!;

    // Get the PlutusList from cto
    const fields = cto.data();

    // Extract each element of the list and transform the values into each MastermindDatum field type.

    result.codeMaster = Buffer.from(fields.get(0)!.as_bytes()!).toString("hex");
    result.codeBreaker = Buffer.from(fields.get(1)!.as_bytes()!).toString(
      "hex"
    );
    result.hashSol = BigInt(fields.get(2)!.as_integer()!.to_str());

    const guesses = [];
    for (var i = 0; i < fields.get(3)!.as_list()!.len(); i++) {
      guesses.push(
        Number(fields.get(3)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.guesses = guesses;

    result.blackPegs = Number(fields.get(4)!.as_integer()!.to_str());
    result.whitePegs = Number(fields.get(5)!.as_integer()!.to_str());
    result.currentTurn = Number(fields.get(6)!.as_integer()!.to_str());
    result.expirationTime = Number(fields.get(7)!.as_integer()!.to_str());

    // Create a Mastermind data object with empty values
    const vk_template: VerificationKeyDatum = {} as VerificationKeyDatum;

    const vk_fields = fields.get(8).as_constr_plutus_data()!.data();

    vk_template.nPublic = Number(vk_fields.get(0)!.as_integer()!.to_str());

    const vkAlpha1 = [];
    for (var i = 0; i < vk_fields.get(1)!.as_list()!.len(); i++) {
      vkAlpha1.push(
        BigInt(vk_fields.get(1)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    vk_template.vkAlpha1 = vkAlpha1;

    const vkBeta2 = [];
    for (var i = 0; i < vk_fields.get(2)!.as_list()!.len(); i++) {
      const vkBeta2Elem = [];
      for (
        var j = 0;
        j < vk_fields.get(2)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkBeta2Elem.push(
          BigInt(
            vk_fields
              .get(2)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      vkBeta2.push(vkBeta2Elem);
    }
    vk_template.vkBeta2 = vkBeta2;

    const vkGamma2 = [];
    for (var i = 0; i < vk_fields.get(3)!.as_list()!.len(); i++) {
      const vkGamma2Elem = [];
      for (
        var j = 0;
        j < vk_fields.get(3)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkGamma2Elem.push(
          BigInt(
            vk_fields
              .get(3)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      vkGamma2.push(vkGamma2Elem);
    }
    vk_template.vkGamma2 = vkGamma2;

    const vkDelta2 = [];
    for (var i = 0; i < vk_fields.get(4)!.as_list()!.len(); i++) {
      const vkDelta2Elem = [];
      for (
        var j = 0;
        j < vk_fields.get(4)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkDelta2Elem.push(
          BigInt(
            vk_fields
              .get(4)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      vkDelta2.push(vkDelta2Elem);
    }
    vk_template.vkDelta2 = vkDelta2;

    const vkAlphabeta12 = [];
    for (var i = 0; i < vk_fields.get(5)!.as_list()!.len(); i++) {
      const vkAlphabeta12Elem = [];
      for (
        var j = 0;
        j < vk_fields.get(5)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        const vkAlphabeta12ElemElem = [];
        for (
          var k = 0;
          k <
          vk_fields
            .get(5)!
            .as_list()!
            .get(i)!
            .as_list()!
            .get(j)!
            .as_list()!
            .len();
          k++
        ) {
          vkAlphabeta12ElemElem.push(
            BigInt(
              vk_fields
                .get(5)!
                .as_list()!
                .get(i)!
                .as_list()!
                .get(j)!
                .as_list()!
                .get(k)!
                .as_integer()!
                .to_str()
            )
          );
        }
        vkAlphabeta12Elem.push(vkAlphabeta12ElemElem);
      }
      vkAlphabeta12.push(vkAlphabeta12Elem);
    }
    vk_template.vkAlphabeta12 = vkAlphabeta12;

    const ic = [];
    for (var i = 0; i < vk_fields.get(6)!.as_list()!.len(); i++) {
      const icElem = [];
      for (
        var j = 0;
        j < vk_fields.get(6)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        icElem.push(
          BigInt(
            vk_fields
              .get(6)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      ic.push(icElem);
    }
    vk_template.IC = ic;

    // Get the first field element of RdmProof
    // Then get innter PlutusList from the PlutusData Constructor representing RdmProof

    // Create a RdmProof data object with empty values
    const proof: RdmProof = {} as RdmProof;

    const rdm_proof_fields = fields.get(9).as_constr_plutus_data()!.data();

    const piA = [];
    for (var i = 0; i < rdm_proof_fields.get(0)!.as_list()!.len(); i++) {
      piA.push(
        BigInt(
          rdm_proof_fields.get(0)!.as_list()!.get(i)!.as_integer()!.to_str()
        )
      );
    }
    proof.piA = piA;
    const piB = [];
    for (var i = 0; i < rdm_proof_fields.get(1)!.as_list()!.len(); i++) {
      const piBElem = [];
      for (
        var j = 0;
        j < rdm_proof_fields.get(1)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        piBElem.push(
          BigInt(
            rdm_proof_fields
              .get(1)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      piB.push(piBElem);
    }
    proof.piB = piB;
    const piC = [];
    for (var i = 0; i < rdm_proof_fields.get(2)!.as_list()!.len(); i++) {
      piC.push(
        BigInt(
          rdm_proof_fields.get(2)!.as_list()!.get(i)!.as_integer()!.to_str()
        )
      );
    }
    proof.piC = piC;

    result.proof = proof;

    return new MastermindDatum(
      result.codeMaster,
      result.codeBreaker,
      result.hashSol,
      result.guesses,
      result.blackPegs,
      result.whitePegs,
      result.currentTurn,
      result.expirationTime,
      result.proof
    );
  }

  public copy() {
    return new MastermindDatum(
      this.codeMaster,
      this.codeBreaker,
      this.hashSol,
      this.guesses,
      this.blackPegs,
      this.whitePegs,
      this.currentTurn,
      this.expirationTime,
      this.proof
    );
  }

  public getSnarkjsPublicSignals() {
    return [
      this.hashSol.toString(),
      this.guesses[0].toString(),
      this.guesses[1].toString(),
      this.guesses[2].toString(),
      this.guesses[3].toString(),
      this.blackPegs.toString(),
      this.whitePegs.toString(),
      this.hashSol.toString(),
    ];
  }

  async calculateProof(secretCode: Array<number>, secretHash: string) {
    const buffer = Buffer.alloc(4);

    for (let i = 0; i < 4; i++) {
      buffer.writeInt8(secretCode[i], i);
    }

    const randomSalt = BigInt("0x" + secretHash);

    const salt = bitArray2buffer(dec2bitArray(randomSalt, 128));

    const concatenated = Buffer.concat([buffer, salt]);

    const hash = createHash("sha256").update(concatenated).digest("hex");

    this.hashSol = BigInt("0x" + hash.substring(2));

    try {
      const inputs = {
        pubNumBlacks: this.blackPegs,
        pubNumWhites: this.whitePegs,
        pubSolnHash: this.hashSol,
        privSalt: randomSalt,
        pubGuessA: this.guesses[0],
        pubGuessB: this.guesses[1],
        pubGuessC: this.guesses[2],
        pubGuessD: this.guesses[3],
        privSolnA: secretCode[0],
        privSolnB: secretCode[1],
        privSolnC: secretCode[2],
        privSolnD: secretCode[3],
      };
      console.log(inputs);
      const { proof }: { proof: Proof } = await snarkjs.groth16.fullProve(
        inputs,
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/mastermind.wasm`,
        `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/mastermind.pk`
      );
      console.log("Proof: ", proof);
      this.proof = {
        piA: proof.pi_a.map((e) => BigInt(e)),
        piB: proof.pi_b.map((e1) => e1.map((e2) => BigInt(e2))),
        piC: proof.pi_c.map((e) => BigInt(e)),
      };
    } catch (e) {
      throw new Error("Not proof");
    }
  }

  public getSnarkProof() {
    if (this.proof === null) return null;

    return {
      pi_a: this.proof.piA.map((e) => e.toString()),
      pi_b: this.proof.piB.map((e1) => e1.map((e2) => e2.toString())),
      pi_c: this.proof.piC.map((e) => e.toString()),
    };
  }

  public setExpirationTime(slot: number) {
    this.expirationTime = slot * 1000;
  }
}

export const startRedeemerMesh: Data = { alternative: 0, fields: [] };
export const clueRedeemerMesh: Data = { alternative: 1, fields: [] };
export const endRedeemerMesh: Data = { alternative: 2, fields: [] };
export const guessRedeemerMesh: Data = { alternative: 3, fields: [] };

export function random128Hex() {
  function random16Hex() {
    return (0x10000 | (Math.random() * 0x10000)).toString(16).substr(1);
  }
  return (
    random16Hex() +
    random16Hex() +
    random16Hex() +
    random16Hex() +
    random16Hex() +
    random16Hex() +
    random16Hex() +
    random16Hex()
  );
}

function bitArray2buffer(a: Buffer) {
  const len = Math.floor((a.length - 1) / 8) + 1;
  const b = Buffer.alloc(len);

  for (let i = 0; i < a.length; i++) {
    const p = Math.floor(i / 8);
    b[p] = b[p] | (Number(a[i]) << (7 - (i % 8)));
  }
  return b;
}

function dec2bitArray(dec: any, length: number) {
  const result = [];
  for (var i = 0; i < length; i++) {
    result.push(Number((BigInt(dec) >> BigInt(i)) & BigInt(1)));
  }

  return Buffer.from(result);
}
