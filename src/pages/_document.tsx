import { ThemeModeScript } from "flowbite-react";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <ThemeModeScript mode="dark" />
      </Head>
      <body className="bg-white dark:bg-gray-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
