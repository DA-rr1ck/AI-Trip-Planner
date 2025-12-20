import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
    en: {
        translation: {
            hero: {
                badge: 'AI Travel Planner · Real-time Trip Tracking',
                title: {
                    line1: 'Build your travel itinerary with AI,',
                    line2: 'and track your trip in real time.',
                },
                description:
                    'A web and mobile system that lets you create travel itineraries with AI or manually, track your trip in real time on mobile, and keep every change in sync across devices.',
                primaryButton: 'Start planning a trip',
                pill: {
                    ai: 'AI',
                    web: 'Web',
                    app: 'App',
                },
                pillCaption: 'Plan and edit on Web, follow your trip on Mobile.',
                bullets: [
                    'Detailed daily timeline for each day of your trip.',
                    'Supports both AI and manual planning.',
                    'Data stays in sync between Web App and Mobile App.',
                ],
                overlay: {
                    eyebrow: 'Real-time Trip Tracking',
                    title: 'Tracking: Da Nang · 5 days',
                    badge: 'On time · Check-in 14:00',
                    cards: {
                        ai: {
                            title: 'AI Itinerary',
                            desc: 'Automatically generate an itinerary with Gemini based on the information you provide.',
                        },
                        manual: {
                            title: 'Manual override',
                            desc: 'Freely edit each day and each place in the itinerary however you like.',
                        },
                        sync: {
                            title: 'Mobile sync',
                            desc: 'The mobile app receives your itinerary and displays it along a real-time timeline.',
                        },
                    },
                    floating: {
                        title: 'All-in-one travel planner',
                        desc: 'AI Planner · Manual Planner · Real-time Tracking · Web/Mobile.',
                    },
                },
                featuresSection: {
                    title: 'Core features of the system',
                    subtitle:
                        'Designed as an AI-powered web app for creating travel itineraries, ready for real trips and real users.',
                    note: 'Optimized for desktop when planning · optimized for mobile while traveling.',
                },
                features: {
                    aiPlanner: {
                        title: 'AI Trip Planner',
                        desc: 'Enter destination, dates, budget, and travel style — the system uses Gemini to generate an optimized day-by-day itinerary.',
                    },
                    manualPlanner: {
                        title: 'Manual trip planning',
                        desc: 'Pick hotels, attractions, and activities yourself, and save them into a structured trip plan.',
                    },
                    hybridPlanner: {
                        title: 'Combine AI with manual edits',
                        desc: 'Edit, add, remove, or reorder activities, or call AI again for specific parts of the itinerary.',
                    },
                    realTimeTracking: {
                        title: 'Real-time tracking',
                        desc: 'The mobile app uses location to compare where you are with the plan and sends on-time/early/late notifications.',
                    },
                    timeManagement: {
                        title: 'Time & check-in management',
                        desc: 'Track check-in windows and travel times between places to avoid delays and schedule conflicts.',
                    },
                    sync: {
                        title: 'Web & Mobile sync',
                        desc: 'Every change to the itinerary is instantly updated between Web and Mobile using a single shared data source.',
                    },
                },
                howItWorks: {
                    title: 'How it works',
                    subtitle:
                        'From entering your trip information to being out on the road, the system stays with you and updates in real time.',
                    step1: {
                        stepLabel: 'Step 1',
                        title: 'Enter your trip information',
                        desc: 'Destination, start and end dates, budget, number of travelers, and travel style (relaxing, exploring, budget-friendly, etc.).',
                    },
                    step2: {
                        stepLabel: 'Step 2',
                        title: 'Choose AI or manual planning',
                        desc: 'Use AI to automatically generate an itinerary, or search for hotels and attractions yourself and add them to each day of the trip.',
                    },
                    step3: {
                        stepLabel: 'Step 3',
                        title: 'Follow your trip on Mobile',
                        desc: 'Use the mobile app to view your schedule in real time, track your location, and receive reminders.',
                    },
                },
                webMobile: {
                    title: 'Designed for both Web & Mobile',
                    subtitle:
                        'Use your computer to plan in detail on a large screen, then switch to mobile to follow the trip and receive notifications on the go.',
                    web: {
                        eyebrow: 'Web App',
                        title: 'Desktop interface for planning itineraries',
                        badge: 'Plan on Desktop',
                        placeholder:
                            'You can replace this area with a real Web App screenshot – trip list, daily details, maps, etc.',
                        bullets: [
                            'Create and edit itineraries using AI or manually.',
                            'Search hotels and attractions based on user-defined parameters.',
                            'Manage multiple trips and keep a history of itineraries.',
                            'Sync with user accounts for secure, personalized planning.',
                        ],
                    },
                    mobile: {
                        eyebrow: 'Mobile App',
                        title: 'Follow your trip in the real world',
                        badge: 'Track on Mobile',
                        phone: {
                            todayLabel: 'TODAY · DAY 2',
                            place: 'Hoi An Ancient Town',
                            checkin: '14:00 · Hotel check-in',
                            status: 'Status: On the way · 10 minutes left',
                            desc: 'The app shows each time slot in your day, compares it with your current GPS location, and sends reminders.',
                        },
                        bullets: [
                            'View your day-by-day schedule on a timeline.',
                            'See your current GPS location.',
                            'Get notifications when you are early, on time, or late compared to the plan.',
                            'Automatically reflect itinerary updates made on the Web.',
                        ],
                    },
                },
                finalCta: {
                    eyebrow: 'Ready to plan your trip?',
                    title: 'Turn your travel ideas into a real, usable itinerary.',
                    subtitle:
                        'Start by creating your first trip and experience the full flow: generate an itinerary with AI, fine-tune it manually, and follow it on mobile in real time.',
                    button: 'Create your first trip',
                    note: 'No payment required · just sign in.',
                },
            },
        },
    },
    vi: {
        translation: {
            hero: {
                badge: 'AI Travel Planner · Theo dõi chuyến đi thời gian thực',
                title: {
                    line1: 'Xây dựng lịch trình du lịch với AI,',
                    line2: 'theo dõi chuyến đi theo thời gian thực.',
                },
                description:
                    'Hệ thống Web & Mobile cho phép bạn tạo lịch trình du lịch bằng AI hoặc bằng tay, theo dõi chuyến đi theo thời gian thực trên mobile, và đồng bộ mọi thay đổi giữa các thiết bị.',
                primaryButton: 'Bắt đầu tạo lịch trình',
                pill: {
                    ai: 'AI',
                    web: 'Web',
                    app: 'App',
                },
                pillCaption: 'Tạo – chỉnh sửa trên Web, theo dõi trên Mobile.',
                bullets: [
                    'Lịch trình chi tiết từng ngày, từng mốc thời gian.',
                    'Hỗ trợ cả tạo lịch bằng AI & tạo bằng tay.',
                    'Đồng bộ dữ liệu giữa Web App và Mobile App.',
                ],
                overlay: {
                    eyebrow: 'Theo dõi chuyến đi thời gian thực',
                    title: 'Đang theo dõi: Đà Nẵng · 5 ngày',
                    badge: 'Đúng giờ · Check-in 14:00',
                    cards: {
                        ai: {
                            title: 'Lịch trình AI',
                            desc: 'Tự động tạo lịch trình với Gemini dựa trên thông tin bạn cung cấp.',
                        },
                        manual: {
                            title: 'Chỉnh sửa thủ công',
                            desc: 'Vẫn có thể chỉnh sửa từng ngày, từng địa điểm theo ý muốn.',
                        },
                        sync: {
                            title: 'Đồng bộ Mobile',
                            desc: 'App mobile nhận lịch trình và hiển thị theo mốc thời gian thực tế.',
                        },
                    },
                    floating: {
                        title: 'Nền tảng lập kế hoạch du lịch tất cả trong một',
                        desc: 'AI Planner · Manual Planner · Real-time Tracking · Web/Mobile.',
                    },
                },
                featuresSection: {
                    title: 'Tính năng chính của hệ thống',
                    subtitle:
                        'Được xây dựng như một Web App lập lịch trình du lịch tích hợp AI, sẵn sàng phục vụ các chuyến đi thực tế.',
                    note: 'Tối ưu cho desktop khi lập kế hoạch · Tối ưu cho mobile khi đang đi du lịch.',
                },
                features: {
                    aiPlanner: {
                        title: 'AI Trip Planner',
                        desc: 'Nhập điểm đến, ngày đi, kinh phí, phong cách du lịch… hệ thống dùng Gemini tạo lịch trình tối ưu từng ngày.',
                    },
                    manualPlanner: {
                        title: 'Tự tạo lịch trình bằng tay',
                        desc: 'Tự chọn khách sạn, địa điểm tham quan, hoạt động phù hợp với nhu cầu và lưu lại thành chuyến đi của bạn.',
                    },
                    hybridPlanner: {
                        title: 'Kết hợp AI + chỉnh tay',
                        desc: 'Có thể chỉnh sửa, thêm/bớt, sắp xếp lại các hoạt động hoặc gọi lại AI cho từng phần lịch trình.',
                    },
                    realTimeTracking: {
                        title: 'Theo dõi thời thực',
                        desc: 'App mobile tích hợp định vị, so sánh vị trí hiện tại với lịch trình và gửi thông báo đến đúng/đến sớm/đến trễ.',
                    },
                    timeManagement: {
                        title: 'Quản lý thời gian & check-in',
                        desc: 'Theo dõi khung giờ nhận phòng, thời gian di chuyển giữa các địa điểm để tránh trễ giờ và dồn lịch.',
                    },
                    sync: {
                        title: 'Đồng bộ Web & Mobile',
                        desc: 'Mọi thay đổi lịch trình được cập nhật ngay lập tức giữa bản Web và Mobile, luôn dùng chung một nguồn dữ liệu.',
                    },
                },
                howItWorks: {
                    title: 'Quy trình hoạt động',
                    subtitle:
                        'Từ lúc nhập thông tin chuyến đi đến khi bạn đang ở ngoài thực tế, hệ thống luôn đồng hành và cập nhật theo thời gian thực.',
                    step1: {
                        stepLabel: 'Bước 1',
                        title: 'Nhập thông tin chuyến đi',
                        desc: 'Điểm đến, ngày đi – ngày về, kinh phí, số người, phong cách chuyến đi (nghỉ dưỡng, khám phá, tiết kiệm…).',
                    },
                    step2: {
                        stepLabel: 'Bước 2',
                        title: 'Chọn AI hoặc tự xây lịch trình',
                        desc: 'Dùng AI để gen lịch trình tự động, hoặc tự tra cứu khách sạn/địa điểm, thêm vào từng ngày trong chuyến đi.',
                    },
                    step3: {
                        stepLabel: 'Bước 3',
                        title: 'Theo dõi chuyến đi trên Mobile',
                        desc: 'Dùng app mobile để xem lịch trình theo thời gian thực, theo dõi vị trí và nhận thông báo nhắc nhở.',
                    },
                },
                webMobile: {
                    title: 'Thiết kế cho cả Web & Mobile',
                    subtitle:
                        'Sử dụng máy tính để lập kế hoạch chi tiết với màn hình rộng, và chuyển sang mobile để theo dõi chuyến đi và nhận thông báo trong lúc di chuyển.',
                    web: {
                        eyebrow: 'Web App',
                        title: 'Giao diện lập lịch trình trên desktop/laptop',
                        badge: 'Plan on Desktop',
                        placeholder:
                            'Bạn có thể thay khu vực này bằng screenshot màn hình Web App thực tế – danh sách chuyến đi, chi tiết từng ngày, bản đồ, v.v.',
                        bullets: [
                            'Tạo & chỉnh sửa lịch trình bằng AI hoặc bằng tay.',
                            'Tra cứu khách sạn, địa điểm tham quan theo thông số người dùng.',
                            'Quản lý nhiều chuyến đi và lưu lịch sử hành trình.',
                            'Đồng bộ với tài khoản người dùng, bảo mật và cá nhân hóa.',
                        ],
                    },
                    mobile: {
                        eyebrow: 'Mobile App',
                        title: 'Theo dõi chuyến đi ngoài thực tế',
                        badge: 'Track on Mobile',
                        phone: {
                            todayLabel: 'TODAY · DAY 2',
                            place: 'Hội An Ancient Town',
                            checkin: '14:00 · Check-in khách sạn',
                            status: 'Trạng thái: Đang di chuyển · còn 10 phút',
                            desc: 'App hiển thị từng mốc thời gian trong ngày, so sánh với GPS hiện tại để gửi thông báo nhắc nhở.',
                        },
                        bullets: [
                            'Theo dõi lịch trình từng ngày theo trục thời gian.',
                            'Định vị GPS hiện tại của người dùng.',
                            'Thông báo khi đến sớm, đúng giờ hoặc trễ so với lịch.',
                            'Tự động cập nhật khi lịch trình thay đổi trên Web.',
                        ],
                    },
                },
                finalCta: {
                    eyebrow: 'Sẵn sàng tạo chuyến đi của bạn?',
                    title: 'Biến ý tưởng chuyến đi thành một lịch trình có thể sử dụng thực tế.',
                    subtitle:
                        'Bắt đầu tạo chuyến đi đầu tiên, trải nghiệm đầy đủ luồng: tạo lịch trình với AI, chỉnh tay, và theo dõi chuyến đi trên mobile theo thời gian thực.',
                    button: 'Tạo lịch trình ngay',
                    note: 'Không cần thanh toán · chỉ cần đăng nhập tài khoản.',
                },
            },
        },
    },
}

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
})

export default i18n
