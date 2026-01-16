import { useEffect } from 'react'

export function usePersistenceSaver(state) {
    const {
        model,
        data,
        sheetData,
        activeSlot,
        autoIncrementCheckNumbers,
        editMode,
        profiles,
        activeProfileId,
        ledgers,
        activeLedgerId,
        checkHistory,
        preferences,
        importQueue
    } = state

    // Immediate save for critical data (importQueue, checkHistory, ledgers)
    useEffect(() => {
        window.cs2.settingsSet({
            model,
            data,
            sheetData,
            activeSlot,
            autoIncrementCheckNumbers,
            editMode,
            profiles,
            activeProfileId,
            ledgers,
            activeLedgerId,
            checkHistory,
            preferences,
            importQueue
        })
    }, [importQueue, checkHistory, ledgers, activeLedgerId, profiles, activeProfileId, sheetData, activeSlot])

    // Debounced save for UI state changes (model, data, editMode, preferences)
    useEffect(() => {
        const t = setTimeout(() => {
            window.cs2.settingsSet({
                model,
                data,
                sheetData,
                activeSlot,
                autoIncrementCheckNumbers,
                editMode,
                profiles,
                activeProfileId,
                ledgers,
                activeLedgerId,
                checkHistory,
                preferences,
                importQueue
            })
        }, 250)
        return () => clearTimeout(t)
    }, [model, data, editMode, preferences, sheetData, activeSlot, autoIncrementCheckNumbers])
}
