import { AppProps } from "next/app";
import Head from "next/head";
import "../styles/index.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>ONE World</title>
        <link rel="icon" href="/favicon.ico"></link>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
