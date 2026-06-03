import '../styles/globals.css'
import { useEffect } from 'react'
import Head from 'next/head'
import { initPosthog } from '../lib/analytics'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initPosthog()
  }, [])
  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/Favicon.png" />
        <link rel="shortcut icon" href="/Favicon.png" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
