import {
  AccountInfo,
  AssetMetadata,
  BlockInfo,
  IFetcher,
  ISubmitter,
  IListener,
  Protocol,
  TransactionInfo,
  UTxO,
} from "@meshsdk/core";
import axios from "axios";
import { Asset } from "copy-webpack-plugin";

export class HydraWebProvider implements IFetcher, ISubmitter, IListener {
  onTxConfirmed(
    txHash: string,
    callback: () => void,
    limit: number = 100
  ): void {
    let attempts = 0;

    const checkTx = setInterval(async () => {
      if (attempts >= limit) {
        clearInterval(checkTx);
      }
      const utxos = await this.fetchUTxOs(txHash);
      if (utxos.length > 0) {
        clearInterval(checkTx);
        callback();
      } else {
        attempts += 1;
      }
    }, 1_000);
  }

  fetchAccountInfo(address: string): Promise<AccountInfo> {
    throw new Error("Method not implemented.");
  }
  async fetchAddressUTxOs(
    address: string,
    asset?: string | undefined
  ): Promise<UTxO[]> {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/hydra/utxos/?address=` + address
    );

    return response.data;
  }
  fetchAssetAddresses(
    asset: string
  ): Promise<{ address: string; quantity: string }[]> {
    throw new Error("Method not implemented.");
  }
  fetchAssetMetadata(asset: string): Promise<AssetMetadata> {
    throw new Error("Method not implemented.");
  }
  fetchBlockInfo(hash: string): Promise<BlockInfo> {
    throw new Error("Method not implemented.");
  }
  fetchCollectionAssets(
    policyId: string,
    cursor?: string | number | undefined
  ): Promise<{ assets: Asset[]; next: string | number | null }> {
    throw new Error("Method not implemented.");
  }
  fetchHandleAddress(handle: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  fetchProtocolParameters(epoch: number): Promise<Protocol> {
    throw new Error("Method not implemented.");
  }
  fetchTxInfo(hash: string): Promise<TransactionInfo> {
    throw new Error("Method not implemented.");
  }
  async fetchUTxOs(hash: string): Promise<UTxO[]> {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/hydra/utxos/?txHash=` + hash
    );

    return response.data;
  }

  async submitTx(tx: string): Promise<string> {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/hydra/submitTx`,
      { tx },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  }
}
