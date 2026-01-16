import { useEffect } from 'react'

export function useKeyboardShortcuts(activeProfile, setActiveSlot) {
    // Keyboard shortcuts for switching slots (Alt+1/2/3)
    useEffect(() => {
        if (activeProfile?.layoutMode !== 'three_up') return

        const handleKeyDown = (e) => {
            // Alt+1 = Top, Alt+2 = Middle, Alt+3 = Bottom
            if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
                const slotMap = { '1': 'top', '2': 'middle', '3': 'bottom' }
                const targetSlot = slotMap[e.key]

                if (targetSlot) {
                    e.preventDefault()
                    setActiveSlot(targetSlot)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeProfile?.layoutMode, setActiveSlot])
}
