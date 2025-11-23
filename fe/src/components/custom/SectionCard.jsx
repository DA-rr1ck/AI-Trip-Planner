import React from 'react'

/**
 * Use for both hotel and attraction details pages
 */
export default function SectionCard({
    header = true,
    title,
    subtitle,
    rightSlot,
    children,
    id,
    className,
}) {
    return (
        <section
            id={id}
            className='bg-white border rounded-xl shadow-sm p-3 md:p-4 space-y-3'
        >
            {header && (
                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
                    <div>
                        <h2 className='text-lg md:text-xl font-semibold'>{title}</h2>
                        {subtitle && (
                            <p className='text-sm text-gray-500 mt-1'>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {rightSlot && <div className='flex-shrink-0'>{rightSlot}</div>}
                </div>
            )}
            <div className={className}>
                {children}
            </div>
        </section>
    )
}
