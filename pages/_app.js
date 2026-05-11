import '../styles/globals.css'
import { useEffect } from 'react'
import { initPosthog } from '../lib/analytics'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initPosthog()
  }, [])
  return <Component {...pageProps} />
}
