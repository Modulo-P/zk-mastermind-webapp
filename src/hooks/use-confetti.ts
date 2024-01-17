import { ConfettiContext } from "@/context/confetti";
import { useContext } from "react";

export default function useConfetti() {
  const { confetti, setConfetti } = useContext(ConfettiContext);

  return { confetti, setConfetti };
}
