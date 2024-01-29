import { Proof, PublicSignals, VerficationKey } from "@/types/zk";
import { Data, PlutusScript } from "@meshsdk/core";
import vkJson from "./vk.json";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
const snarkjs = require("snarkjs");
const circomlibjs = require("circomlibjs");
import * as bigintBuffer from "bigint-buffer";
import script from "./plutus.json";

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
  code: script.plutusCode,
};

export class MastermindDatum {
  constructor(
    public codeMaster: string,
    public codeBreaker: string,
    public hashSol: bigint,
    public guesses: number[],
    public blackPegs: number,
    public whitePegs: number,
    public currentTurn: number,
    public nPublic: number,
    public vkAlpha1: bigint[],
    public vkBeta2: bigint[][],
    public vkGamma2: bigint[][],
    public vkDelta2: bigint[][],
    public vkAlphabeta12: bigint[][][],
    public ic: bigint[][],
    public piA: bigint[],
    public piB: bigint[][],
    public piC: bigint[]
  ) {
    const vk: VerficationKey = vkJson;
    this.nPublic = Number(vk.nPublic);
    this.vkAlpha1 = vk.vk_alpha_1.map((x) => BigInt(x));
    this.vkBeta2 = vk.vk_beta_2.map((x) => x.map((y) => BigInt(y)));
    this.vkGamma2 = vk.vk_gamma_2.map((x) => x.map((y) => BigInt(y)));
    this.vkDelta2 = vk.vk_delta_2.map((x) => x.map((y) => BigInt(y)));
    this.vkAlphabeta12 = vk.vk_alphabeta_12.map((x) =>
      x.map((y) => y.map((z) => BigInt(z)))
    );
    this.ic = vk.IC.map((x) => x.map((y) => BigInt(y)));
  }

  public setProof(proof: Proof, publicSignals: PublicSignals): void {
    this.hashSol = BigInt(publicSignals[0]);
    this.piA = proof.pi_a.map((x) => BigInt(x));
    this.piB = proof.pi_b.map((x) => x.map((y) => BigInt(y)));
    this.piC = proof.pi_c.map((x) => BigInt(x));
  }

  static fromJson(json: any): MastermindDatum {
    const result = new MastermindDatum(
      json.fields[0].bytes,
      json.fields[1].bytes,
      json.fields[2].int,
      json.fields[3].list.map((x: any) => BigInt(x.int)),
      json.fields[4].int,
      json.fields[5].int,
      json.fields[6].int,
      json.fields[7].int,
      json.fields[8].list,
      json.fields[9].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[10].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[11].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[12].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[13].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[14].list.map((x: any) => BigInt(x.int)),
      json.fields[15].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[16].list.map((x: any) => BigInt(x.int))
    );
    return result;
  }

  public toCSL(): CSL.PlutusData {
    const fields = CSL.PlutusList.new();

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
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.nPublic.toString()))
    );

    const vkAlpha1 = CSL.PlutusList.new();
    this.vkAlpha1.forEach((vk) => {
      vkAlpha1.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(vk.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(vkAlpha1));

    const vkBeta2 = CSL.PlutusList.new();
    this.vkBeta2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkBeta2.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkBeta2));

    const vkGamma2 = CSL.PlutusList.new();
    this.vkGamma2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkGamma2.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkGamma2));

    const vkDelta2 = CSL.PlutusList.new();
    this.vkDelta2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkDelta2.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkDelta2));

    const vkAlphabeta12 = CSL.PlutusList.new();
    this.vkAlphabeta12.forEach((vk) => {
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
    fields.add(CSL.PlutusData.new_list(vkAlphabeta12));

    const ic = CSL.PlutusList.new();
    this.ic.forEach((icElem) => {
      const icElemList = CSL.PlutusList.new();
      icElem.forEach((icElemElem) => {
        icElemList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(icElemElem.toString()))
        );
      });
      ic.add(CSL.PlutusData.new_list(icElemList));
    });
    fields.add(CSL.PlutusData.new_list(ic));

    const piA = CSL.PlutusList.new();
    this.piA.forEach((piAElem) => {
      piA.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(piAElem.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(piA));

    const piB = CSL.PlutusList.new();
    this.piB.forEach((piBElem) => {
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
    fields.add(CSL.PlutusData.new_list(piB));

    const piC = CSL.PlutusList.new();
    this.piC.forEach((piC1Elem) => {
      piC.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(piC1Elem.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(piC));

    const result = CSL.PlutusData.new_constr_plutus_data(
      CSL.ConstrPlutusData.new(CSL.BigNum.from_str("0"), fields)
    );

    result;

    return result;
  }

  public static fromCsl(datum: CSL.PlutusData) {
    const result: MastermindDatum = {} as MastermindDatum;

    const cto = datum.as_constr_plutus_data()!;

    const fields = cto.data();

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
    result.nPublic = Number(fields.get(7)!.as_integer()!.to_str());

    const vkAlpha1 = [];
    for (var i = 0; i < fields.get(8)!.as_list()!.len(); i++) {
      vkAlpha1.push(
        BigInt(fields.get(8)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.vkAlpha1 = vkAlpha1;

    const vkBeta2 = [];
    for (var i = 0; i < fields.get(9)!.as_list()!.len(); i++) {
      const vkBeta2Elem = [];
      for (
        var j = 0;
        j < fields.get(9)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkBeta2Elem.push(
          BigInt(
            fields
              .get(9)!
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
    result.vkBeta2 = vkBeta2;

    const vkGamma2 = [];
    for (var i = 0; i < fields.get(10)!.as_list()!.len(); i++) {
      const vkGamma2Elem = [];
      for (
        var j = 0;
        j < fields.get(10)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkGamma2Elem.push(
          BigInt(
            fields
              .get(10)!
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
    result.vkGamma2 = vkGamma2;

    const vkDelta2 = [];
    for (var i = 0; i < fields.get(11)!.as_list()!.len(); i++) {
      const vkDelta2Elem = [];
      for (
        var j = 0;
        j < fields.get(11)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkDelta2Elem.push(
          BigInt(
            fields
              .get(11)!
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
    result.vkDelta2 = vkDelta2;

    const vkAlphabeta12 = [];
    for (var i = 0; i < fields.get(12)!.as_list()!.len(); i++) {
      const vkAlphabeta12Elem = [];
      for (
        var j = 0;
        j < fields.get(12)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        const vkAlphabeta12ElemElem = [];
        for (
          var k = 0;
          k <
          fields
            .get(12)!
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
              fields
                .get(12)!
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
    result.vkAlphabeta12 = vkAlphabeta12;

    const ic = [];
    for (var i = 0; i < fields.get(13)!.as_list()!.len(); i++) {
      const icElem = [];
      for (
        var j = 0;
        j < fields.get(13)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        icElem.push(
          BigInt(
            fields
              .get(13)!
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
    result.ic = ic;

    const piA = [];
    for (var i = 0; i < fields.get(14)!.as_list()!.len(); i++) {
      piA.push(
        BigInt(fields.get(14)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.piA = piA;

    const piB = [];
    for (var i = 0; i < fields.get(15)!.as_list()!.len(); i++) {
      const piBElem = [];
      for (
        var j = 0;
        j < fields.get(15)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        piBElem.push(
          BigInt(
            fields
              .get(15)!
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
    result.piB = piB;

    const piC = [];
    for (var i = 0; i < fields.get(16)!.as_list()!.len(); i++) {
      piC.push(
        BigInt(fields.get(16)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.piC = piC;

    return new MastermindDatum(
      result.codeMaster,
      result.codeBreaker,
      result.hashSol,
      result.guesses,
      result.blackPegs,
      result.whitePegs,
      result.currentTurn,
      result.nPublic,
      result.vkAlpha1,
      result.vkBeta2,
      result.vkGamma2,
      result.vkDelta2,
      result.vkAlphabeta12,
      result.ic,
      result.piA,
      result.piB,
      result.piC
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
      this.nPublic,
      this.vkAlpha1,
      this.vkBeta2,
      this.vkGamma2,
      this.vkDelta2,
      this.vkAlphabeta12,
      this.ic,
      this.piA,
      this.piB,
      this.piC
    );
  }

  public async calculateProof(secretCode: Array<number>, secretHash: string) {
    const { proof, publicSignals }: any = await getProof(
      this,
      secretCode,
      secretHash
    );
    this.setProof(proof, publicSignals);
  }

  public getSnarkjsProof() {
    const result: any = {};
    result["protocol"] = "groth16";
    result["curve"] = "bn128";
    result["pi_a"] = this.piA.map((x) => x.toString());
    result["pi_b"] = this.piB.map((x) => x.map((y) => y.toString()));
    result["pi_c"] = this.piC.map((x) => x.toString());

    return result;
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
}

export const startRedeemerMesh: Data = { alternative: 0, fields: [] };
export const clueRedeemerMesh: Data = { alternative: 1, fields: [] };
export const endRedeemerMesh: Data = { alternative: 2, fields: [] };
export const guessRedeemerMesh: Data = { alternative: 3, fields: [] };

async function getProof(
  datum: MastermindDatum,
  secretCode: Array<number>,
  secretHash: string
) {
  const secretCodeIndex = secretCode;
  const secretCodeNumber = BigInt(secretCodeIndex.join(""));
  const secretCodeHashDec = BigInt(parseInt(secretHash, 16));

  const saltedSolution = secretCodeNumber + secretCodeHashDec;

  const pedersen = await circomlibjs.buildPedersenHash();
  const babyJub = await circomlibjs.buildBabyjub();
  const F = babyJub.F;

  const publicHash = pedersen.hash(bigintBuffer.toBufferLE(saltedSolution, 32));
  const publicHashUnpacked = babyJub.unpackPoint(publicHash);

  try {
    const inputs = {
      pubNumBlacks: datum.blackPegs,
      pubNumWhites: datum.whitePegs,
      pubSolnHash: F.toObject(publicHashUnpacked[0]),
      privSaltedSoln: saltedSolution,
      pubGuessA: datum.guesses[0],
      pubGuessB: datum.guesses[1],
      pubGuessC: datum.guesses[2],
      pubGuessD: datum.guesses[3],
      privSolnA: secretCodeIndex[0],
      privSolnB: secretCodeIndex[1],
      privSolnC: secretCodeIndex[2],
      privSolnD: secretCodeIndex[3],
    };
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      "/mastermind.wasm",
      "/mastermind.pk"
    );
    console.log("Proof: ", proof);
    console.log("Public signals: ", publicSignals);
    return { proof, publicSignals };
  } catch (e) {
    throw new Error("Not proof");
  }
}

function leInt2Buff(n: bigint, len: number) {
  let r = n;
  let o = 0;
  const buff = Buffer.alloc(len);
  while (r > BigInt(0) && o < len) {
    let c = r & BigInt(0xff);
    r = r >> BigInt(8);
    buff[o] = Number(c);
    o++;
  }
  if (r > BigInt(0)) {
    throw new Error("byte length overflow");
  }

  return buff;
}
