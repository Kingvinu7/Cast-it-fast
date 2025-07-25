"use client";
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi.config'
import { useEffect, useState } from 'react'

export function WagmiWrapper({ children }) {
  const [isClient, setIsClient] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Only initialize on client side
    setIsClient(true)
    
    // Check if we're in a proper browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Handle any Wagmi initialization errors
    const handleError = (error) => {
      console.error('Wagmi initialization error:', error)
      setHasError(true)
    }

    // Add error listener
    window.addEventListener('error', handleError)
    
    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Don't render Wagmi on server side or if there's an error
  if (!isClient || hasError) {
    return children
  }

  try {
    return (
      <WagmiProvider config={config}>
        {children}
      </WagmiProvider>
    )
  } catch (error) {
    console.error('WagmiProvider error:', error)
    // Fallback to rendering without Wagmi
    return children
  }
}
