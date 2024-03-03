import {
  Proof,
  RdmProof,
  PublicSignals,
  VerficationKey,
  VerificationKeyDatum,
} from "@/types/zk";
import { Data, PlutusScript } from "@meshsdk/core";
import vkJson from "./vk.json";
import mastermindScript from "./plutus.json";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
const snarkjs = require("snarkjs");
const circomlibjs = require("circomlibjs");
import * as bigintBuffer from "bigint-buffer";
import { rmdir } from "fs";
import { createHash } from "crypto";
const ff = require("ffjavascript");
const bb = require("bigint-buffer");

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

export const plutusScript: PlutusScript = {
  version: "V2",
  code: mastermindScript.cborHex,
};

// Reference: https://github.com/Emurgo/cardano-serialization-lib/blob/master/rust/src/plutus.rs

export class MastermindDatum {
  private vkey: VerificationKeyDatum;

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
    // Set verification key values from vk.json
    const vk: VerficationKey = vkJson;
    this.vkey = {} as VerificationKeyDatum;
    this.vkey.nPublic = Number(vk.nPublic);
    this.vkey.vkAlpha1 = vk.vk_alpha_1.map((x) => BigInt(x));
    this.vkey.vkBeta2 = vk.vk_beta_2.map((x) => x.map((y) => BigInt(y)));
    this.vkey.vkGamma2 = vk.vk_gamma_2.map((x) => x.map((y) => BigInt(y)));
    this.vkey.vkDelta2 = vk.vk_delta_2.map((x) => x.map((y) => BigInt(y)));
    this.vkey.vkAlphabeta12 = vk.vk_alphabeta_12.map((x) =>
      x.map((y) => y.map((z) => BigInt(z)))
    );
    this.vkey.IC = vk.IC.map((x) => x.map((y) => BigInt(y)));
  }

  // Enocde the Mastermind PlutusData
  public async toCSL(): Promise<CSL.PlutusData> {
    if (this.proof === null) {
      throw new Error("Proof is not set");
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
        CSL.BigInt.from_str(this.vkey.nPublic.toString())
      )
    );

    const vkAlpha1 = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG1(this.vkey.vkAlpha1), "hex")
    );
    vkey.add(vkAlpha1);

    const vkBeta2 = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG2(this.vkey.vkBeta2), "hex")
    );
    vkey.add(vkBeta2);

    const vkGamma2 = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG2(this.vkey.vkGamma2), "hex")
    );
    vkey.add(vkGamma2);

    const vkDelta2 = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG2(this.vkey.vkDelta2), "hex")
    );
    vkey.add(vkDelta2);

    const vkAlphabeta12 = CSL.PlutusList.new();
    vkAlphabeta12.add(CSL.PlutusData.new_bytes(new Uint8Array(8)));
    vkey.add(CSL.PlutusData.new_list(vkAlphabeta12));

    const ic = CSL.PlutusList.new();
    for (const icElem of this.vkey.IC) {
      const icElemBS = CSL.PlutusData.new_bytes(
        Buffer.from(await compressedG1(icElem), "hex")
      );
      ic.add(icElemBS);
    }
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

    const piA = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG1(this.proof.piA), "hex")
    );
    proof_fields.add(piA);

    const piB = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG2(this.proof.piB), "hex")
    );
    proof_fields.add(piB);

    const piC = CSL.PlutusData.new_bytes(
      Buffer.from(await compressedG1(this.proof.piC), "hex")
    );
    proof_fields.add(piC);

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
    console.log(fields.get(7));
    result.expirationTime = Number(fields.get(7)!.as_integer()!.to_str());

    // Create a Mastermind data object with empty values
    const vk_template: VerificationKeyDatum = {} as VerificationKeyDatum;

    const vk_fields = fields.get(8).as_constr_plutus_data()!.data();

    vk_template.nPublic = Number(vk_fields.get(0)!.as_integer()!.to_str());

    const vkAlpha1 = uncompressedG1(
      Buffer.from(vk_fields.get(1)!.as_bytes()!).toString("hex")
    );
    vk_template.vkAlpha1 = vkAlpha1;

    const vkBeta2 = uncompressedG2(
      Buffer.from(vk_fields.get(2)!.as_bytes()!).toString("hex")
    );
    vk_template.vkBeta2 = vkBeta2;

    const vkGamma2 = uncompressedG2(
      Buffer.from(vk_fields.get(3)!.as_bytes()!).toString("hex")
    );
    vk_template.vkGamma2 = vkGamma2;

    const vkDelta2 = uncompressedG2(
      Buffer.from(vk_fields.get(4)!.as_bytes()!).toString("hex")
    );
    vk_template.vkDelta2 = vkDelta2;

    const vkAlphabeta12 = [[[BigInt(0)]]];
    vk_template.vkAlphabeta12 = vkAlphabeta12;

    const ic = [];
    for (var i = 0; i < vk_fields.get(6)!.as_list()!.len(); i++) {
      const icElem = uncompressedG1(
        Buffer.from(vk_fields.get(6)!.as_list()!.get(i)!.as_bytes()!).toString(
          "hex"
        )
      );
      ic.push(icElem);
    }
    vk_template.IC = ic;

    result.vkey = vk_template;

    // Get the first field element of RdmProof
    // Then get innter PlutusList from the PlutusData Constructor representing RdmProof

    // Create a RdmProof data object with empty values
    const proof: RdmProof = {} as RdmProof;

    const rdm_proof_fields = fields.get(9).as_constr_plutus_data()!.data();

    const piA = uncompressedG1(
      Buffer.from(rdm_proof_fields.get(0)!.as_bytes()!).toString("hex")
    );
    proof.piA = piA;
    const piB = uncompressedG2(
      Buffer.from(rdm_proof_fields.get(1)!.as_bytes()!).toString("hex")
    );
    proof.piB = piB;
    const piC = uncompressedG1(
      Buffer.from(rdm_proof_fields.get(2)!.as_bytes()!).toString("hex")
    );
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

    try {
      const inputs = {
        pubNumBlacks: this.blackPegs,
        pubNumWhites: this.whitePegs,
        pubSolnHash: BigInt("0x" + hash.substring(2)).toString(10),
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
        "/mastermind.wasm",
        "/mastermind.pk"
      );
      console.log("Proof: ", proof);
      this.proof = {
        piA: proof.pi_a.map((e) => BigInt(e)),
        piB: proof.pi_b.map((e1) => e1.map((e2) => BigInt(e2))),
        piC: proof.pi_c.map((e) => BigInt(e)),
      };
      this.hashSol = BigInt("0x" + hash.substring(2));
    } catch (e) {
      throw new Error("Not proof");
    }
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

async function compressedG1(point: Array<string | bigint>) {
  const curve = await ff.getCurveFromName("bls12381");

  const result = bb.toBufferBE(BigInt(point[0]), 48);
  const COMPRESSED = 0b10000000;
  const INFINITY = 0b01000000;
  const YBIT = 0b00100000;

  result[0] = result[0] | COMPRESSED;

  if (BigInt(point[2]) !== BigInt(1)) {
    result[0] = result[0] | INFINITY;
  } else {
    const F = curve.G1.F;

    const x = F.fromObject(BigInt(point[0]));

    const x3b = F.add(F.mul(F.square(x), x), curve.G1.b);
    const y1 = F.toObject(F.sqrt(x3b));
    const y2 = F.toObject(F.neg(F.sqrt(x3b)));

    const y = BigInt(point[1]);

    if (y1 > y2 && y > y2) {
      result[0] = result[0] | YBIT;
    } else if (y1 < y2 && y > y1) {
      result[0] = result[0] | YBIT;
    }
  }

  return result.toString("hex");
}

async function compressedG2(point: Array<Array<string | bigint>>) {
  const curve = await ff.getCurveFromName("bls12381");

  const result = Buffer.concat([
    bb.toBufferBE(BigInt(point[0][1]), 48),
    bb.toBufferBE(BigInt(point[0][0]), 48),
  ]);
  const COMPRESSED = 0b10000000;
  const INFINITY = 0b01000000;
  const YBIT = 0b00100000;

  result[0] = result[0] | COMPRESSED;

  if (BigInt(point[2][0]) !== BigInt(1)) {
    result[0] = result[0] | INFINITY;
  } else {
    const F = curve.G2.F;

    const x = F.fromObject(point[0].map((item) => BigInt(item)));

    // console.log("x", x);

    const x3b = F.add(F.mul(F.square(x), x), curve.G2.b);
    const y1 = F.toObject(F.sqrt(x3b));
    const y2 = F.toObject(F.neg(F.sqrt(x3b)));
    // console.log("y1", y1);
    // console.log("y2", y2);
    // console.log("point", point[1]);

    const y = point[1].map((item) => BigInt(item));

    if (greaterThan(y1, y2) && greaterThan(y, y2)) {
      result[0] = result[0] | YBIT;
    } else if (greaterThan(y2, y1) && greaterThan(y, y1)) {
      result[0] = result[0] | YBIT;
    }
  }
  return result.toString("hex");
}

function greaterThan(a: Array<BigInt>, b: Array<BigInt>) {
  if (a[1] > b[1]) {
    return true;
  } else if (a[1] === b[1] && a[0] > b[0]) {
    return true;
  }
  return false;
}

function uncompressedG1(point: string) {
  const COMPRESSED = 0b10000000;
  const INFINITY = 0b01000000;
  const YBIT = 0b00100000;

  const buffer = Buffer.from(point, "hex");

  if ((buffer[0] & COMPRESSED) === 0) {
    throw new Error("Invalid format");
  }

  if ((buffer[0] & INFINITY) !== 0) {
    return [BigInt(1), BigInt(1), BigInt(0)];
  }

  return [BigInt(1), BigInt(1), BigInt(0)]; // TODO
}

function uncompressedG2(point: string) {
  const COMPRESSED = 0b10000000;
  const INFINITY = 0b01000000;
  const YBIT = 0b00100000;

  const buffer = Buffer.from(point, "hex");

  if ((buffer[0] & COMPRESSED) === 0) {
    throw new Error("Invalid format");
  }

  return [
    [BigInt(1), BigInt(1)],
    [BigInt(1), BigInt(1)],
    [BigInt(0), BigInt(0)],
  ]; // TODO
}
