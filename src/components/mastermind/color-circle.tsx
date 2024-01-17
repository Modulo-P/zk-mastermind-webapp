import { ColorSchema, colorSchema } from "@/services/mastermind";

type Props = {
  color: number;
  selected?: boolean;
};
export default function ColorCircle({ color, selected = false }: Props) {
  return (
    <div
      className={`w-10 h-10 border-2 rounded-full m-2 cursor-pointer
      ${
        selected
          ? "border-gray-500 dark:border-gray-300"
          : "border-gray-300 dark:border-gray-500"
      } 
      ${
        color !== 0
          ? `${colorSchema[color - 1].bgTW} dark:${
              colorSchema[color - 1].bgTWDark
            }`
          : "bg-gray-50 dark:bg-gray-800"
      }
      `}
    ></div>
  );
}
