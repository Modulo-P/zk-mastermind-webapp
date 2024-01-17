import { useGameStore } from "@/store/use-game-store";
import { Game } from "@/types/game";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";

export function useGames() {
  const { setActiveGames } = useGameStore();
  const { data } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      const response = await axios.get(
        process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games"
      );
      return response.data;
    },
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (data) {
      setActiveGames(data);
    }
  }, [data, setActiveGames]);

  return {
    activeGames: data,
  };
}
