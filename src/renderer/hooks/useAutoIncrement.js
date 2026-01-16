import { useEffect } from 'react'

export function useAutoIncrement(
    autoIncrementCheckNumbers,
    activeProfile,
    activeSlot,
    sheetData,
    setSheetData
) {
    // Auto-increment check numbers when switching slots
    useEffect(() => {
        if (!autoIncrementCheckNumbers || activeProfile?.layoutMode !== 'three_up') return

        const slots = ['top', 'middle', 'bottom']
        const currentIndex = slots.indexOf(activeSlot)

        if (currentIndex > 0) {
            const previousSlot = slots[currentIndex - 1]
            const previousNumber = sheetData[previousSlot]?.checkNumber

            if (previousNumber && !isNaN(parseInt(previousNumber))) {
                const nextNumber = (parseInt(previousNumber) + 1).toString()

                // Only auto-populate if current slot's checkNumber is empty
                if (!sheetData[activeSlot]?.checkNumber) {
                    setSheetData(prev => ({
                        ...prev,
                        [activeSlot]: { ...prev[activeSlot], checkNumber: nextNumber }
                    }))
                }
            }
        }
    }, [activeSlot, autoIncrementCheckNumbers, activeProfile?.layoutMode, sheetData, setSheetData])

    // Initialize check numbers for all slots when auto-increment is enabled
    useEffect(() => {
        if (!autoIncrementCheckNumbers || activeProfile?.layoutMode !== 'three_up') return

        const slots = ['top', 'middle', 'bottom']
        const baseNumber = parseInt(activeProfile?.nextCheckNumber) || 1001

        // Check if ALL slots need initialization
        const needsInit = slots.every(slot => !sheetData[slot]?.checkNumber)

        if (needsInit) {
            const updates = {}
            slots.forEach((slot, index) => {
                const expectedNumber = String(baseNumber + index)
                updates[slot] = { ...sheetData[slot], checkNumber: expectedNumber }
            })
            setSheetData(prev => ({ ...prev, ...updates }))
        }
    }, [autoIncrementCheckNumbers, activeProfile?.layoutMode, activeProfile?.nextCheckNumber, sheetData, setSheetData])
}
