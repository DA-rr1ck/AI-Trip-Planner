import React from 'react'
import { useLocale } from '@/context/LocaleContext.jsx'

export default function LocaleToggle() {
    const { language, setLanguage, currency, setCurrency } = useLocale()

    return (
        <div className="flex items-center gap-3 text-xs sm:text-sm">
            {/* Language toggle */}
            <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 shadow-sm">
                <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1 rounded-full transition duration-300 ${language === 'en'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    EN
                </button>
                <button
                    type="button"
                    onClick={() => setLanguage('vi')}
                    className={`px-2.5 py-1 rounded-full transition duration-300 ${language === 'vi'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    VI
                </button>
            </div>

            {/* Currency toggle */}
            <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 shadow-sm">
                <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-2.5 py-1 rounded-full transition duration-300 ${currency === 'USD'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    USD
                </button>
                <button
                    type="button"
                    onClick={() => setCurrency('VND')}
                    className={`px-2.5 py-1 rounded-full transition duration-300 ${currency === 'VND'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    VND
                </button>
            </div>
        </div>
    )
}
