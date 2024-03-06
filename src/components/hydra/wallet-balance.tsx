import useDisclosure from "@/hooks/use-disclosure";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Button, CustomFlowbiteTheme } from "flowbite-react";
import { AiOutlineSwap } from "react-icons/ai";
import WalletModal from "./wallet-modal";
import { coalesceAssets } from "@/services/blockchain-utils";

export default function WalletBalance() {
  const { hydraUtxos, hydraWalletAddress } = useHydraWallet();

  const totalBalance = coalesceAssets(hydraUtxos);

  const { isOpen, onClose, onOpen } = useDisclosure();

  return (
    <div className="flex flex-row">
      {!hydraWalletAddress && "Click to connect!"}
      {hydraWalletAddress && (
        <div className="flex flex-row items-center gap-2">
          <img
            src={"/img/hydra-white.png"}
            alt="Hydra logo"
            width="28px"
            className="not-prose"
          />
          <div>
            {totalBalance.some(
              (a) => a.unit === process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!
            )
              ? Math.round(
                  (Number(
                    totalBalance.filter(
                      (a) => a.unit === process.env.NEXT_PUBLIC_HYDRA_ASSET_ID!
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
  );
}

const buttonTheme: CustomFlowbiteTheme["button"] = {
  color: {
    gray: "bg-transparent !border-white ",
  },

  outline: {
    on: "bg-transparent text-white",
  },
};
