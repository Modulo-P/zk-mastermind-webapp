export type PublicSignals = Array<string>;

export type Proof = {
  pi_a: Array<string>;
  pi_b: Array<Array<string>>;
  pi_c: Array<string>;
};

export interface RdmProof {
  piA: bigint[];
  piB: bigint[][];
  piC: bigint[];
}

export type VerificationKey = {
  nPublic: number;
  vk_alpha_1: Array<string>;
  vk_beta_2: Array<Array<string>>;
  vk_gamma_2: Array<Array<string>>;
  vk_delta_2: Array<Array<string>>;
  vk_alphabeta_12: Array<Array<Array<string>>>;
  IC: Array<Array<string>>;
  curve: string;
  protocol: string;
};

export type VerificationKeyDatum = {
  nPublic: number;
  vkAlpha1: Array<bigint>;
  vkBeta2: Array<Array<bigint>>;
  vkGamma2: Array<Array<bigint>>;
  vkDelta2: Array<Array<bigint>>;
  vkAlphabeta12: Array<Array<Array<bigint>>>;
  IC: Array<Array<bigint>>;
  curve: string;
  protocol: string;
};
