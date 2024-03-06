import { useUserStore } from "@/store/use-user-store";
import useHydraWallet from "./use-hydra-wallet";
import { useEffect } from "react";
import axios from "axios";
import { User } from "@/types/user";
const { generateUsernames } = require("username-generator-tool");

export function useUser() {
  const { user, setUser } = useUserStore();

  const { hydraWalletAddress } = useHydraWallet();

  useEffect(() => {
    async function go() {
      if (hydraWalletAddress) {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/users/?address=${hydraWalletAddress}`
          );
          let user: null | User = response.data.data;

          if (!user) {
            user = {
              address: hydraWalletAddress,
              nickname: generateUsernames("")[0],
              id: 0,
            };
            await axios.post(`${process.env.NEXT_PUBLIC_HYDRA_BACKEND}/users`, {
              address: hydraWalletAddress,
              nickname: user.nickname,
            });
          }

          setUser(user);
        } catch (error) {
          console.error(error);
        }
      }
    }
    go();
  }, [hydraWalletAddress, setUser]);

  return { user, setUser };
}
