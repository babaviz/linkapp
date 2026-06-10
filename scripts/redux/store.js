"use strict";
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const authSlice_1 = __importDefault(require("./slices/authSlice"));
const userSlice_1 = __importDefault(require("./slices/userSlice"));
const propertySlice_1 = __importDefault(require("./slices/propertySlice"));
const messageSlice_1 = __importDefault(require("./slices/messageSlice"));
const chatSlice_1 = __importDefault(require("./slices/chatSlice"));
const callSlice_1 = __importDefault(require("./slices/callSlice"));
const jobSlice_1 = __importDefault(require("./slices/jobSlice"));
const serviceSlice_1 = __importDefault(require("./slices/serviceSlice"));
const datemiSlice_1 = __importDefault(require("./slices/datemiSlice"));
const searchSlice_1 = __importDefault(require("./slices/searchSlice"));
const paymentSlice_1 = __importDefault(require("./slices/paymentSlice"));
const moderationSlice_1 = __importDefault(require("./slices/moderationSlice"));
const locationSlice_1 = __importDefault(require("./slices/locationSlice"));
const notificationSlice_1 = __importDefault(require("./slices/notificationSlice"));
const subscriptionSlice_1 = __importDefault(require("./slices/subscriptionSlice"));
const propertyApi_1 = require("./api/propertyApi");
exports.store = (0, toolkit_1.configureStore)({
    reducer: {
        auth: authSlice_1.default,
        user: userSlice_1.default,
        property: propertySlice_1.default,
        message: messageSlice_1.default,
        chat: chatSlice_1.default,
        call: callSlice_1.default,
        jobs: jobSlice_1.default,
        services: serviceSlice_1.default,
        datemi: datemiSlice_1.default,
        search: searchSlice_1.default,
        payment: paymentSlice_1.default,
        moderation: moderationSlice_1.default,
        location: locationSlice_1.default,
        notifications: notificationSlice_1.default,
        subscription: subscriptionSlice_1.default,
        // RTK Query API reducers
        [propertyApi_1.propertyApi.reducerPath]: propertyApi_1.propertyApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoredActions: [
                'persist/PERSIST',
            ],
            ignoredPaths: [],
            // Custom function to detect non-serializable values
            isSerializable: (value) => {
                // Allow Date objects as they can be serialized
                if (value instanceof Date)
                    return true;
                // Check for functions, Maps, Sets, etc.
                if (typeof value === 'function')
                    return false;
                if (value instanceof Map)
                    return false;
                if (value instanceof Set)
                    return false;
                if (value && typeof value === 'object' && value.constructor !== Object && value.constructor !== Array) {
                    // Allow plain objects and arrays, reject others
                    return false;
                }
                return true;
            },
        },
    })
        // Add RTK Query middleware
        .concat(propertyApi_1.propertyApi.middleware),
});
