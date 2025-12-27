import React, { createContext, useContext, useEffect, useState } from 'react'
import i18n from '@/i18n'

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('app_language') || 'en'
    })

    const [currency, setCurrency] = useState(() => {
        return localStorage.getItem('app_currency') || 'USD'
    })

    useEffect(() => {
        localStorage.setItem('app_language', language)
        i18n.changeLanguage(language)
    }, [language])

    useEffect(() => {
        localStorage.setItem('app_currency', currency)
    }, [currency])

    const value = {
        language,      // 'en' | 'vi'
        currency,      // 'USD' | 'VND'
        setLanguage,
        setCurrency,
    }

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    )
}

export function useLocale() {
    const ctx = useContext(LocaleContext)
    if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
    return ctx
}
