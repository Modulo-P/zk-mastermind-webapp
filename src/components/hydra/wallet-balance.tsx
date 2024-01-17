import useDisclosure from "@/hooks/use-disclosure";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Button } from "flowbite-react";
import { AiOutlineSwap } from "react-icons/ai";
import WalletModal from "./wallet-modal";
import { coalesceAssets } from "@/services/blockchain-utils";

function WalletBalance() {
  const { hydraUtxos, hydraWalletAddress } = useHydraWallet();

  const totalBalance = coalesceAssets(hydraUtxos);

  const { isOpen, onClose, onOpen } = useDisclosure();

  return (
    <div className="flex flex-row items-center">
      <div className="flex items-center justify-center font-normal text-lg border rounded-t-md w-60 h-[58px] py-2 px-4 shadow-sm">
        {!hydraWalletAddress && "Hydra not connected"}
        {hydraWalletAddress && (
          <div className="flex flex-row gap-2">
            <img
              src={"/img/hydra.png"}
              alt="Hydra logo"
              width="28px"
              className="inline dark:hidden not-prose"
            />
            <img
              src={"/img/hydra-white.png"}
              alt="Hydra logo"
              width="28px"
              className="hidden dark:inline not-prose"
            />
            <div>
              {totalBalance.some(
                (a) => a.unit === process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!
              )
                ? Math.round(
                    (Number(
                      totalBalance.filter(
                        (a) =>
                          a.unit === process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!
                      )[0].quantity ?? "0"
                    ) /
                      1_000_000) *
                      100
                  ) / 100
                : 0}{" "}
              hADA
            </div>
          </div>
        )}
      </div>
      <Button
        disabled={!hydraWalletAddress}
        outline
        color="gray"
        className="h-[58px] mx-4"
        onClick={() => onOpen()}
      >
        <AiOutlineSwap />
      </Button>
      <WalletModal openModal={isOpen} onClose={onClose} />
    </div>
  );
}

export default WalletBalance;
