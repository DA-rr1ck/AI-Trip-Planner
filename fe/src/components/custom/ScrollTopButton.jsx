import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollTopButton() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            // show button after scrolling 200px
            setVisible(window.scrollY > 200)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-15 right-3 md:bottom-6 md:right-6 z-[9999] p-2.5 md:p-3 rounded-full shadow-lg bg-white border border-gray-200 transition-all duration-300 hover:bg-gray-100 ${
                visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
        >
            <ArrowUp className="w-5 h-5" />
        </button>
    )
}
