import { createContext, useState } from "react";

interface ConfettiContextInterface {
  confetti: boolean;
  setConfetti: (confetti: boolean) => void;
}

const INITITAL_STATE: ConfettiContextInterface = {
  confetti: false,
  setConfetti: (_) => {},
};

export const ConfettiContext =
  createContext<ConfettiContextInterface>(INITITAL_STATE);

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [confetti, setConfetti] = useState<boolean>(false);

  return (
    <ConfettiContext.Provider value={{ confetti, setConfetti }}>
      {children}
    </ConfettiContext.Provider>
  );
}
