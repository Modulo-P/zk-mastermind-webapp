import { Asset, Protocol, UTxO } from "@meshsdk/core";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";

export function coalesceAssets(utxos: UTxO[]): Asset[] {
  return utxos
    .map((utxo) => utxo.output.amount.map((asset) => Object.assign({}, asset)))
    .reduce((acc, amount) => {
      amount.forEach((asset) => {
        if (acc.some((a) => a.unit === asset.unit)) {
          const actual = acc.find((a) => a.unit === asset.unit)!;
          actual.quantity = (
            Number(actual.quantity) + Number(asset.quantity)
          ).toString();
        } else {
          acc.push(asset);
        }
      });
      return acc;
    }, []);
}

export const toValue = (assets: Asset[]) => {
  const lovelace = assets.find((asset) => asset.unit === "lovelace");
  const policies = Array.from(
    new Set<string>(
      assets
        .filter((asset) => asset.unit !== "lovelace")
        .map((asset) => asset.unit.slice(0, 56))
    )
  );

  const multiAsset = CSL.MultiAsset.new();
  policies.forEach((policyId) => {
    const policyAssets = CSL.Assets.new();
    assets
      .filter((asset) => asset.unit.slice(0, 56) === policyId)
      .forEach((asset) => {
        policyAssets.insert(
          CSL.AssetName.new(Buffer.from(asset.unit.slice(56), "hex")),
          CSL.BigNum.from_str(asset.quantity)
        );
      });

    multiAsset.insert(CSL.ScriptHash.from_hex(policyId), policyAssets);
  });

  const value = CSL.Value.new(
    CSL.BigNum.from_str(lovelace ? lovelace.quantity : "0")
  );

  if (assets.length > 1 || !lovelace) {
    value.set_multiasset(multiAsset);
  }

  return value;
};

export const toUnitInterval = (float: string) => {
  const decimal = float.split(".")[1] ?? "0";

  const numerator = `${parseInt(decimal, 10)}`;
  const denominator = "1" + "0".repeat(decimal.length);

  return CSL.UnitInterval.new(
    CSL.BigNum.from_str(numerator),
    CSL.BigNum.from_str(denominator)
  );
};

export const parameters: Protocol = {
  epoch: 0,
  coinsPerUTxOSize: "4310",
  priceMem: 0,
  priceStep: 0,
  minFeeA: 0,
  minFeeB: 0,
  keyDeposit: "2000000",
  maxTxSize: 700000,
  maxValSize: "5000",
  poolDeposit: "500000000",
  maxCollateralInputs: 3,
  decentralisation: 0,
  maxBlockSize: 2800000,
  collateralPercent: 150,
  maxBlockHeaderSize: 1100,
  minPoolCost: "340000000",
  maxTxExMem: "16000000",
  maxTxExSteps: "10000000000",
  maxBlockExMem: "80000000",
  maxBlockExSteps: "40000000000",
};

export const txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
  .coins_per_utxo_byte(CSL.BigNum.from_str(parameters.coinsPerUTxOSize))
  .ex_unit_prices(
    CSL.ExUnitPrices.new(
      toUnitInterval(parameters.priceMem.toString()),
      toUnitInterval(parameters.priceStep.toString())
    )
  )
  .fee_algo(
    CSL.LinearFee.new(
      CSL.BigNum.from_str(parameters.minFeeA.toString()),
      CSL.BigNum.from_str(parameters.minFeeB.toString())
    )
  )
  .key_deposit(CSL.BigNum.from_str(parameters.keyDeposit))
  .max_tx_size(parameters.maxTxSize)
  .max_value_size(parseInt(parameters.maxValSize, 10))
  .pool_deposit(CSL.BigNum.from_str(parameters.poolDeposit))
  .build();

export const dataCost = CSL.DataCost.new_coins_per_byte(
  CSL.BigNum.from_str(parameters.coinsPerUTxOSize)
);

export function addUTxOInputs(
  utxos: UTxO[],
  txBuilder: CSL.TransactionBuilder
) {
  utxos.forEach((utxo: UTxO) => {
    txBuilder.add_regular_input(
      CSL.Address.from_bech32(utxo.output.address),
      CSL.TransactionInput.new(
        CSL.TransactionHash.from_bytes(Buffer.from(utxo.input.txHash, "hex")),
        utxo.input.outputIndex
      ),
      toValue(utxo.output.amount)
    );
  });
}

// TODO Temporary solution to convert between slot and unix time
export function unixToSlot(unix: number) {
  return Math.floor(unix / 1000) - 1709391813 + 53708613;
}

export function slotToUnix(slot: number) {
  return (slot + 1709391813 - 53708613) * 1000;
}
