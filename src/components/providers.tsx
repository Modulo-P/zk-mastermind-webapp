"use client";

import { ConfettiProvider } from "@/context/confetti";
import { HydraProvider } from "@/context/hydra";
import { customTheme } from "@/styles/flowbite-theme";
import { MeshProvider } from "@meshsdk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Flowbite } from "flowbite-react";

const queryClient = new QueryClient();

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <Flowbite theme={{ theme: customTheme }}>
      <MeshProvider>
        <HydraProvider>
          <QueryClientProvider client={queryClient}>
            <ConfettiProvider>{children}</ConfettiProvider>
          </QueryClientProvider>
        </HydraProvider>
      </MeshProvider>
    </Flowbite>
  );
}
