export type PublicSignals = Array<string>;

export type Proof = {
  pi_a: Array<string>;
  pi_b: Array<Array<string>>;
  pi_c: Array<string>;
};

export type VerficationKey = {
  nPublic: number;
  vk_alpha_1: Array<string>;
  vk_beta_2: Array<Array<string>>;
  vk_gamma_2: Array<Array<string>>;
  vk_delta_2: Array<Array<string>>;
  vk_alphabeta_12: Array<Array<Array<string>>>;
  IC: Array<Array<string>>;
};
