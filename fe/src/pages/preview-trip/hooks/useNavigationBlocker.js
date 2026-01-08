import { useEffect, useContext } from 'react'
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom'

export function useNavigationBlocker(blocker, when = true) {
  const { navigator } = useContext(NavigationContext)

  useEffect(() => {
    if (!when) return

    // ✅ Check if navigator.block exists (it doesn't in BrowserRouter)
    if (typeof navigator.block !== 'function') {
      console.warn('navigator.block is not available. Navigation blocking will not work.')
      return
    }

    const unblock = navigator.block((tx) => {
      const autoUnblockingTx = {
        ...tx,
        retry() {
          unblock()
          tx.retry()
        },
      }

      blocker(autoUnblockingTx)
    })

    return unblock
  }, [navigator, blocker, when])
}