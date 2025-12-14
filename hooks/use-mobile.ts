import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize state with the correct value on the client, not undefined.
  // This avoids a render cycle where the value flips, causing React error #310.
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(mql.matches)
    }

    // Listen for changes
    mql.addEventListener('change', onChange)
    
    // Set initial value in case it changed between initial state and effect setup
    setIsMobile(mql.matches);

    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
