import { HydraContext } from "@/context/hydra";
import { useContext } from "react";

export default function useHydraWallet() {
  const context = useContext(HydraContext);

  return context;
}
