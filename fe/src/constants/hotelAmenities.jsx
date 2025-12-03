import {
    Wifi,
    Utensils,
    Martini,
    UtensilsCrossed,
    ConciergeBell,
    Coffee,
    Dessert,
    CigaretteOff,
    CreditCard,
    Banknote,
    Bike,
    ShoppingBag,
    Hotel,
    BaggageClaim,
    HelpCircle,
    Store,
    CircleDollarSign,
    WashingMachine,
    AlarmClock,
    Gift,
    Brush,
    BedDouble,
    Baby,
    Blocks,
    Car,
    ParkingCircle,
    BatteryCharging,
    Accessibility,
    Activity,
    Dumbbell,
    WavesLadder,
    Briefcase,
    Users,
    AirVent,
    Refrigerator,
    BottleWine,
    Languages,
    Bath,
    ShowerHead,
} from "lucide-react";

export const HOTEL_AMENITIES = [
    // General / F&B
    { id: "wifi", label: "Wi-Fi", icon: Wifi },
    { id: "restaurant", label: "Restaurant", icon: Utensils },
    { id: "bar", label: "Bar", icon: Martini },
    { id: "tableService", label: "Table service", icon: UtensilsCrossed },
    { id: "roomService", label: "Room service", icon: ConciergeBell },
    { id: "breakfast", label: "Breakfast", icon: Coffee },
    { id: "breakfastBuffet", label: "Breakfast buffet", icon: Dessert },

    // Property / rules / payment
    { id: "smokeFreeProperty", label: "Smoke-free property", icon: CigaretteOff },
    { id: "creditCards", label: "Credit cards", icon: CreditCard },
    { id: "debitCards", label: "Debit cards", icon: CreditCard },
    { id: "cash", label: "Cash", icon: Banknote },

    // Activities & on-site services
    { id: "bicycleRental", label: "Bicycle rental", icon: Bike },
    { id: "boutiqueShopping", label: "Boutique shopping", icon: ShoppingBag },

    // Front office / concierge
    { id: "frontDesk", label: "Front desk", icon: Hotel },
    { id: "baggageStorage", label: "Baggage storage", icon: BaggageClaim },
    { id: "concierge", label: "Concierge", icon: HelpCircle },
    { id: "convenienceStore", label: "Convenience store", icon: Store },
    { id: "currencyExchange", label: "Currency exchange", icon: CircleDollarSign },

    // Housekeeping / laundry
    { id: "fullServiceLaundry", label: "Full-service laundry", icon: WashingMachine },
    { id: "wakeUpCalls", label: "Wake up calls", icon: AlarmClock },
    { id: "giftShop", label: "Gift shop", icon: Gift },
    { id: "housekeeping", label: "Housekeeping", icon: Brush },
    { id: "turndownService", label: "Turndown service", icon: BedDouble },

    // Family / kids
    { id: "kidFriendly", label: "Kid-friendly", icon: Baby },
    { id: "babysitting", label: "Babysitting", icon: Baby },
    { id: "kidsActivities", label: "Activities for kids", icon: Blocks },
    { id: "kidsClub", label: "Kids' club", icon: Blocks },

    // Parking & transport
    { id: "parking", label: "Parking", icon: ParkingCircle },
    { id: "selfParking", label: "Self parking", icon: ParkingCircle },
    { id: "valetParking", label: "Valet parking", icon: Car },
    { id: "evCharger", label: "EV charger", icon: BatteryCharging },
    { id: "privateCarService", label: "Private car service", icon: Car },
    { id: "carRentalOnsite", label: "Car rental onsite", icon: Car },

    // Pools & accessibility
    { id: "outdoorPool", label: "Pool", icon: WavesLadder },
    { id: "accessible", label: "Accessible", icon: Accessibility },
    { id: "accessibleParking", label: "Accessible parking", icon: ParkingCircle },
    { id: "accessibleElevator", label: "Accessible elevator", icon: Accessibility },
    { id: "accessiblePool", label: "Accessible pool", icon: WavesLadder },

    // Fitness
    { id: "fitnessCenter", label: "Fitness center", icon: Activity },
    { id: "ellipticalMachine", label: "Elliptical machine", icon: Activity },
    { id: "treadmill", label: "Treadmill", icon: Activity },
    { id: "weightMachines", label: "Weight machines", icon: Activity },
    { id: "freeWeights", label: "Free weights", icon: Dumbbell },

    // Spa-related (only ones with reasonably clear icons kept)
    // (Massage / Sauna / Spa skipped due to no close-enough dedicated icons)

    // Business
    { id: "businessCenter", label: "Business center", icon: Briefcase },
    { id: "meetingRooms", label: "Meeting rooms", icon: Users },

    // In-room amenities
    { id: "airConditioning", label: "Air conditioning", icon: AirVent },
    { id: "refrigerator", label: "Refrigerator", icon: Refrigerator },
    { id: "minibar", label: "Minibar", icon: BottleWine },

    // Languages
    { id: "english", label: "English", icon: Languages },
    { id: "vietnamese", label: "Vietnamese", icon: Languages },

    // Bathroom
    { id: "privateBathroom", label: "Private bathroom", icon: Bath },
    { id: "bathtub", label: "Bathtub", icon: Bath },
    { id: "shower", label: "Shower", icon: ShowerHead },
];
