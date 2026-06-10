"use strict";
// App-wide constants for MyNyumbApp
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIMITS = exports.CONTENT_PROTECTION = exports.VERIFICATION_STATUS = exports.ESCROW_STATUS = exports.TRANSACTION_STATUS = exports.DATE_MI_INTENTIONS = exports.DATE_MI_SERVICES = exports.TOOLS_MATERIALS = exports.SERVICE_CATEGORIES = exports.SKILL_CATEGORIES = exports.LISTING_TYPES = exports.PROPERTY_TYPES = exports.TAB_NAMES = void 0;
// Navigation Tab Names
exports.TAB_NAMES = {
    PROPERTY: 'Property',
    JOBS: 'Jobs',
    SERVICES: 'Services',
    STORIES: 'Stories',
    DATE_MI: 'Date Mi'
};
// Property Types
exports.PROPERTY_TYPES = {
    RESIDENTIAL: 'Residential',
    COMMERCIAL: 'Commercial',
    LAND: 'Land'
};
// Property Listing Types
exports.LISTING_TYPES = {
    RENT: 'rent',
    SALE: 'sale'
};
// Job/Skill Categories
exports.SKILL_CATEGORIES = {
    MASONRY: 'Masonry',
    PLUMBER: 'Plumber',
    ELECTRICIAN: 'Electrician',
    SEWAGE_TECHNICIAN: 'Sewage Technician',
    BIOGAS_TECHNICIAN: 'Biogas Technician',
    PAINTERS: 'Painters',
    WELDERS_FABRICATORS: 'Welders and Fabricators',
    WOOD_WORKINGS: 'Wood Workings',
    IT_TECHNOLOGY: 'IT & Technology'
};
// Service Categories
exports.SERVICE_CATEGORIES = {
    HOSPITALS_HEALTHCARE: 'Hospitals and Healthcare',
    SCHOOLS_EDUCATION: 'Schools and Educational Institutions',
    SUPERMARKETS_RETAIL: 'Supermarkets and Retail Stores',
    ENTERTAINMENT: 'Entertainment (Clubs, Recreation)',
    WINE_SPIRITS: 'Wine and Spirits',
    BUTCHERIES_FOOD: 'Butcheries and Food Services',
    BARBER_BEAUTY: 'Barber Shops and Beauty Services',
    SPAS_WELLNESS: 'Spas and Wellness Centers',
    MARKETS_TRADING: 'Markets and Trading Centers'
};
// Tools & Materials Categories
exports.TOOLS_MATERIALS = {
    TOOLS: 'Tools',
    SAND: 'Sand',
    BUILDING_STONES: 'Building Stones',
    GRAVEL_CONCRETE: 'Gravel/Concrete',
    ALUMINIUM_GLASS: 'Aluminium and Glass',
    TILES_GRANITE: 'Tiles and Granite',
    HOME_MOVERS: 'Home Movers',
    HOUSE_APPLIANCES: 'House Appliances',
    PAINT_SHOPS: 'Paint Shops'
};
// Date Mi Service Types
exports.DATE_MI_SERVICES = {
    VIDEO_CALLING: 'video_calling',
    PREMIUM_PHOTOS: 'premium_photos',
    PRIVATE_MESSAGES: 'private_messages',
    EXTENDED_CHAT: 'extended_chat',
    VIRTUAL_DATE: 'virtual_date'
};
// Date Mi Intentions
exports.DATE_MI_INTENTIONS = {
    SHORT_TERM: 'short_term_fun',
    LONG_TERM: 'long_term_partner',
    DIGITAL_SERVICES: 'digital_services'
};
// Payment/Transaction Status
exports.TRANSACTION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DISPUTED: 'disputed',
    REFUNDED: 'refunded'
};
// Escrow Status
exports.ESCROW_STATUS = {
    CREATED: 'created',
    FUNDED: 'funded',
    SERVICE_DELIVERED: 'service_delivered',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    CANCELLED: 'cancelled'
};
// User Verification Status
exports.VERIFICATION_STATUS = {
    UNVERIFIED: 'unverified',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
};
// Content Protection Settings
exports.CONTENT_PROTECTION = {
    WATERMARK_OPACITY: 0.3,
    MAX_SCREENSHOT_ATTEMPTS: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    CONTENT_EXPIRY_HOURS: 24
};
// App Limits
exports.LIMITS = {
    MAX_IMAGES_PER_LISTING: 6,
    MAX_BIO_LENGTH: 500,
    MAX_DESCRIPTION_LENGTH: 1000,
    MIN_AGE_DATE_MI: 18,
    MAX_VIDEO_SESSION_HOURS: 4
};
