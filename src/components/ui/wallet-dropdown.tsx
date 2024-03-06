"use client";

import { useUser } from "@/hooks/use-user";
import { Dropdown } from "flowbite-react";
import HydraWalletBalance from "../hydra/wallet-balance";
import CardanoWalletBalance from "../cardano/wallet-balance";
import { useWallet, useWalletList } from "@meshsdk/react";
import { TbTransferVertical } from "react-icons/tb";
import WalletModal from "../hydra/wallet-modal";
import useDisclosure from "@/hooks/use-disclosure";

export default function WalletDropdown() {
  const { user, setUser } = useUser();
  const { connected, disconnect, connect } = useWallet();
  const { onClose, onOpen, isOpen } = useDisclosure();
  const wallets = useWalletList();

  return (
    <>
      <Dropdown label={<HydraWalletBalance />}>
        <Dropdown.Header>
          <div className="flex flex-col gap-2">
            <div>{user?.nickname || ""}</div>
            <CardanoWalletBalance label="Connect your wallet" />
          </div>
        </Dropdown.Header>
        {connected && (
          <>
            <Dropdown.Item onClick={() => onOpen()} icon={TbTransferVertical}>
              Send/Recieve funds
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              onClick={() => {
                disconnect();
                setUser(null);
              }}
            >
              Disconnect
            </Dropdown.Item>
          </>
        )}
        {!connected && (
          <>
            {wallets.map((wallet) => {
              return (
                <Dropdown.Item
                  key={wallet.name}
                  className="flex flex-row items-center"
                  onClick={() => connect(wallet.name)}
                >
                  <div className="ml-2 h-8 w-8 relative">
                    <img src={wallet.icon} alt="icon" />
                  </div>
                  <div className="ml-2 capitalize">{wallet.name}</div>
                </Dropdown.Item>
              );
            })}
          </>
        )}
      </Dropdown>
      <WalletModal onClose={onClose} openModal={isOpen} />
    </>
  );
}
