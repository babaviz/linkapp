"use strict";
/**
 * Chat Redux Slice - Real-time messaging state management
 * Works with Stream Chat SDK for all chat functionality
 */
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUnreadCount = exports.resetChatState = exports.clearTypingUsers = exports.setTypingUsers = exports.updateConversation = exports.addMessage = exports.clearError = exports.updateConnectionStatus = exports.setActiveConversation = exports.markConversationAsRead = exports.sendMessage = exports.fetchMessages = exports.createOrGetConversation = exports.fetchConversations = exports.initializeChat = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const chatService_1 = require("../../services/chatService");
const streamChatService_1 = require("../../services/streamChatService");
const initialState = {
    conversations: [],
    activeConversation: null,
    activeMessages: [],
    connectionStatus: {
        isConnected: false,
        isConnecting: false,
        error: null
    },
    isLoading: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    error: null,
    typingUsers: {},
    totalUnreadCount: 0
};
// Async thunks for chat operations
exports.initializeChat = (0, toolkit_1.createAsyncThunk)('chat/initialize', async (_, { rejectWithValue }) => {
    try {
        const status = await streamChatService_1.streamChatService.initialize();
        return {
            isConnected: status.isConnected,
            isConnecting: status.isConnecting,
            error: status.error
        };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchConversations = (0, toolkit_1.createAsyncThunk)('chat/fetchConversations', async (userId, { rejectWithValue }) => {
    try {
        return await chatService_1.chatService.getUserConversations(userId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.createOrGetConversation = (0, toolkit_1.createAsyncThunk)('chat/createOrGetConversation', async (params, { rejectWithValue }) => {
    try {
        return await chatService_1.chatService.createOrGetConversation(params);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchMessages = (0, toolkit_1.createAsyncThunk)('chat/fetchMessages', async ({ conversationId, limit = 50 }, { rejectWithValue }) => {
    try {
        const messages = await chatService_1.chatService.getConversationMessages(conversationId, limit);
        return { conversationId, messages };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.sendMessage = (0, toolkit_1.createAsyncThunk)('chat/sendMessage', async (params, { rejectWithValue }) => {
    try {
        return await chatService_1.chatService.sendMessage(params);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.markConversationAsRead = (0, toolkit_1.createAsyncThunk)('chat/markAsRead', async ({ conversationId, userId }, { rejectWithValue }) => {
    try {
        await chatService_1.chatService.markAsRead(conversationId, userId, '');
        return conversationId;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
// Chat slice
const chatSlice = (0, toolkit_1.createSlice)({
    name: 'chat',
    initialState,
    reducers: {
        setActiveConversation: (state, action) => {
            state.activeConversation = action.payload;
            state.activeMessages = [];
        },
        updateConnectionStatus: (state, action) => {
            state.connectionStatus = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        addMessage: (state, action) => {
            // Add message to active conversation if it belongs there
            if (state.activeConversation &&
                action.payload.id &&
                state.activeConversation.id.includes(action.payload.id)) {
                state.activeMessages.push(action.payload);
            }
        },
        updateConversation: (state, action) => {
            const index = state.conversations.findIndex(c => c.id === action.payload.id);
            if (index !== -1) {
                state.conversations[index] = action.payload;
            }
            else {
                state.conversations.unshift(action.payload);
            }
            // Update active conversation if it's the same
            if (state.activeConversation && state.activeConversation.id === action.payload.id) {
                state.activeConversation = action.payload;
            }
            // Calculate total unread count
            state.totalUnreadCount = state.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        },
        setTypingUsers: (state, action) => {
            state.typingUsers[action.payload.conversationId] = action.payload.users;
        },
        clearTypingUsers: (state, action) => {
            delete state.typingUsers[action.payload];
        },
        resetChatState: (state) => {
            return initialState;
        },
        updateUnreadCount: (state) => {
            state.totalUnreadCount = state.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        }
    },
    extraReducers: (builder) => {
        builder
            // Initialize chat
            .addCase(exports.initializeChat.pending, (state) => {
            state.connectionStatus.isConnecting = true;
            state.connectionStatus.error = null;
        })
            .addCase(exports.initializeChat.fulfilled, (state, action) => {
            state.connectionStatus = action.payload;
        })
            .addCase(exports.initializeChat.rejected, (state, action) => {
            state.connectionStatus = {
                isConnected: false,
                isConnecting: false,
                error: action.payload
            };
        })
            // Fetch conversations
            .addCase(exports.fetchConversations.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchConversations.fulfilled, (state, action) => {
            state.isLoading = false;
            state.conversations = action.payload;
            state.totalUnreadCount = action.payload.reduce((sum, conv) => sum + conv.unreadCount, 0);
        })
            .addCase(exports.fetchConversations.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Create or get conversation
            .addCase(exports.createOrGetConversation.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.createOrGetConversation.fulfilled, (state, action) => {
            state.isLoading = false;
            state.activeConversation = action.payload;
            // Add to conversations if not already there
            const exists = state.conversations.some(c => c.id === action.payload.id);
            if (!exists) {
                state.conversations.unshift(action.payload);
            }
        })
            .addCase(exports.createOrGetConversation.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Fetch messages
            .addCase(exports.fetchMessages.pending, (state) => {
            state.isLoadingMessages = true;
            state.error = null;
        })
            .addCase(exports.fetchMessages.fulfilled, (state, action) => {
            state.isLoadingMessages = false;
            if (state.activeConversation && state.activeConversation.id === action.payload.conversationId) {
                state.activeMessages = action.payload.messages;
            }
        })
            .addCase(exports.fetchMessages.rejected, (state, action) => {
            state.isLoadingMessages = false;
            state.error = action.payload;
        })
            // Send message
            .addCase(exports.sendMessage.pending, (state) => {
            state.isSendingMessage = true;
            state.error = null;
        })
            .addCase(exports.sendMessage.fulfilled, (state, action) => {
            state.isSendingMessage = false;
            // Add message to active messages
            state.activeMessages.push(action.payload);
            // Update conversation's last message
            const conversation = state.conversations.find(c => c.id === state.activeConversation?.id);
            if (conversation) {
                conversation.lastMessage = action.payload;
                conversation.lastActivity = action.payload.timestamp;
            }
            if (state.activeConversation) {
                state.activeConversation.lastMessage = action.payload;
                state.activeConversation.lastActivity = action.payload.timestamp;
            }
        })
            .addCase(exports.sendMessage.rejected, (state, action) => {
            state.isSendingMessage = false;
            state.error = action.payload;
        })
            // Mark as read
            .addCase(exports.markConversationAsRead.fulfilled, (state, action) => {
            const conversation = state.conversations.find(c => c.id === action.payload);
            if (conversation) {
                state.totalUnreadCount -= conversation.unreadCount;
                conversation.unreadCount = 0;
            }
            if (state.activeConversation && state.activeConversation.id === action.payload) {
                state.activeConversation.unreadCount = 0;
            }
        });
    }
});
_a = chatSlice.actions, exports.setActiveConversation = _a.setActiveConversation, exports.updateConnectionStatus = _a.updateConnectionStatus, exports.clearError = _a.clearError, exports.addMessage = _a.addMessage, exports.updateConversation = _a.updateConversation, exports.setTypingUsers = _a.setTypingUsers, exports.clearTypingUsers = _a.clearTypingUsers, exports.resetChatState = _a.resetChatState, exports.updateUnreadCount = _a.updateUnreadCount;
exports.default = chatSlice.reducer;
