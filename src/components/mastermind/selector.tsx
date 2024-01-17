import { colorSchema } from "@/services/mastermind";
import ColorCircle from "./color-circle";

type Props = {
  onChange: (index: number) => void;
};
export default function Selector({ onChange }: Props) {
  const colorSelected = (index: number) => {
    onChange(index);
  };

  return (
    <div className="flex flex-col">
      <p className="text-sm text-gray-400 mt-0 text-center">Click to select</p>
      <div className="grid grid-cols-3">
        {colorSchema.map((_, index) => (
          <div
            key={index}
            className="rounded-full"
            onClick={() => colorSelected(index)}
          >
            <ColorCircle color={index + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
