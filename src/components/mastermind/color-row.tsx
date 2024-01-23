import { Tooltip } from "flowbite-react";
import { useEffect, useState } from "react";
import ColorCircle from "./color-circle";
import Selector from "./selector";

type Props = {
  colorSequence?: Array<number>;
  blocked?: boolean;
  onChange?: (colorSequence: Array<number>) => void;
};

export default function ColorRow({
  colorSequence,
  blocked = false,
  onChange,
}: Props) {
  const [_colorSequence, setColorSequence] = useState<Array<number>>(
    colorSequence ?? new Array(4).fill(0)
  );

  const setColorSequenceAtIndex = (index: number, colorIndex: number) => {
    const newColorSequence = [..._colorSequence];
    newColorSequence[index] = colorIndex;
    setColorSequence(newColorSequence);
    onChange && onChange(newColorSequence);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        altKey: false,
        code: "Escape",
        ctrlKey: false,
        isComposing: false,
        key: "Escape",
        location: 0,
        metaKey: false,
        repeat: false,
        shiftKey: false,
        which: 27,
        charCode: 0,
        keyCode: 27,
      })
    );
  };

  useEffect(() => {
    setColorSequence(colorSequence ?? new Array(4).fill(0));
  }, [colorSequence]);

  return (
    <div className="flex">
      {_colorSequence.map((color, index) =>
        blocked ? (
          <ColorCircle key={index} color={color} />
        ) : (
          <Tooltip
            key={index}
            content={
              <Selector
                onChange={(selectedIndex) =>
                  setColorSequenceAtIndex(index, selectedIndex + 1)
                }
              />
            }
            trigger="click"
          >
            <ColorCircle color={color} />
          </Tooltip>
        )
      )}
    </div>
  );
}
