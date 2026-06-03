import '../styles/globals.css'
import { useEffect } from 'react'
import Head from 'next/head'
import { initPosthog } from '../lib/analytics'

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230A0A0A'/%3E%3Ctext x='50' y='73' font-family='Arial,Helvetica,sans-serif' font-size='76' font-weight='700' fill='%23C9FF00' text-anchor='middle'%3E%C3%9C%3C/text%3E%3C/svg%3E"

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initPosthog()
  }, [])
  return (
    <>
      <Head>
        <link rel="icon" href={FAVICON} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
