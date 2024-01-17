import { Indie_Flower, Press_Start_2P } from "next/font/google";

const titleFont = Press_Start_2P({
  weight: ["400"],
  subsets: ["latin"],
});
const titleFont2 = Indie_Flower({
  weight: ["400"],
  subsets: ["latin"],
});

function BrandLogo() {
  return (
    <h1
      className={`${titleFont.className} mb-0 uppercase  text-xl drop-shadow-[3px_4px_2px_rgba(0,0,0,0.3)] dark:drop-shadow-[0px_2px_1px_rgba(128,128,128,0.6)]`}
    >
      <span
        className={` ${titleFont2.className} text-violet-500 datk:text-violet-600 text-xl me-2 relative bottom-1`}
      >
        ZK
      </span>
      <span className="text-red-500 dark:text-red-600">Mas</span>
      <span className="text-green-500 dark:text-green-500 relative right-1">
        ter
      </span>
      <span className="text-yellow-300 dark:text-yellow-400">mind</span>
    </h1>
  );
}

export default BrandLogo;
