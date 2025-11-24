// All possible amenities we care about, grouped like the designs
export const HOTEL_AMENITIES_CONFIG = {
    mostPopular: {
        title: 'Most popular amenities',
        items: [
            { id: 'currency_exchange', label: 'Currency exchange', icon: '💱' },
            { id: 'wake_up_call', label: 'Wake-up call', icon: '⏰' },
            {
                id: 'wifi_public_areas_free',
                label: 'Wi-Fi in public areas',
                icon: '📶',
                badge: 'Free',
            },
        ],
    },
    
    moreAmenitiesTitle: 'More Amenities',
    categories: [
        {
            id: 'internet',
            title: 'Internet',
            items: [
                {
                    id: 'wifi_public_areas_free',
                    label: 'Wi-Fi in public areas',
                    icon: '📶',
                    badge: 'Free',
                },
            ],
        },
        {
            id: 'parking',
            title: 'Parking',
            items: [
                {
                    id: 'parking',
                    label: 'Parking',
                    icon: '🅿️',
                    muted: true, // show grey like the screenshot
                },
            ],
        },
        {
            id: 'front_desk',
            title: 'Front desk services',
            items: [
                {
                    id: 'front_desk_limited_hours',
                    label: 'Front desk (limited hours)',
                    icon: '👔',
                },
                { id: 'wake_up_call', label: 'Wake-up call', icon: '⏰' },
                { id: 'currency_exchange', label: 'Currency exchange', icon: '💱' },
                {
                    id: 'tour_ticket_booking',
                    label: 'Tour and ticket booking service',
                    icon: '🎫',
                },
            ],
        },
        {
            id: 'languages_spoken',
            title: 'Languages spoken',
            items: [
                { id: 'lang_en', label: 'English', icon: '🌐' },
                { id: 'lang_ja', label: 'Japanese', icon: '🌐' },
                { id: 'lang_vi', label: 'Vietnamese', icon: '🌐' },
            ],
        },
        {
            id: 'health_wellness',
            title: 'Health & wellness',
            items: [{ id: 'beauty_and_makeup', label: 'Beauty and makeup', icon: '💄' }],
        },
        {
            id: 'public_areas',
            title: 'Public areas',
            items: [{ id: 'smoking_area', label: 'Smoking area', icon: '🚬' }],
        },
        {
            id: 'cleaning_services',
            title: 'Cleaning services',
            items: [
                { id: 'ironing_service', label: 'Ironing service', icon: '🧺' },
                { id: 'dry_cleaning', label: 'Dry cleaning', icon: '🧼' },
            ],
        },
        {
            id: 'business_services',
            title: 'Business services',
            items: [{ id: 'postal_service', label: 'Postal service', icon: '📮' }],
        },
        {
            id: 'safety_security',
            title: 'Safety & security',
            items: [
                { id: 'smoke_detector', label: 'Smoke detector', icon: '🚨' },
                { id: 'fire_extinguisher', label: 'Fire extinguisher', icon: '🧯' },
                { id: 'security_personnel', label: 'Security personnel', icon: '🛡️' },
            ],
        },
    ],
}

// Layout for policies. field = key inside hotel.policies later
export const PROPERTY_POLICY_FIELDS = [
    { id: 'check_in_out', label: 'Check-in and Check-out Times', field: 'checkInOut' },
    { id: 'child_policies', label: 'Child policies', field: 'childPolicies' },
    { id: 'cribs_extra_beds', label: 'Cribs and Extra Beds', field: 'cribsAndExtraBeds' },
    { id: 'breakfast', label: 'Breakfast', field: 'breakfast' },
    { id: 'deposit_policy', label: 'Deposit Policy', field: 'depositPolicy' },
    { id: 'pets', label: 'Pets', field: 'pets' },
    { id: 'service_animals', label: 'Service animals', field: 'serviceAnimals' },
    { id: 'age_requirements', label: 'Age Requirements', field: 'ageRequirements' },
    { id: 'paying_at_hotel', label: 'Paying at the hotel', field: 'paymentMethods' },
]
