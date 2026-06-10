/**
 * Chat Redux Slice - Real-time messaging state management
 * Works with Stream Chat SDK for all chat functionality
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Channel } from 'stream-chat';
import { chatService, ChatConversation, CreateChatParams } from '../../services/chatService';
import { ChatMessage } from '../../components/common/ChatInterface';
import { streamChatService } from '../../services/streamChatService';

// Chat state interface
interface ChatState {
  // Active conversations
  conversations: ChatConversation[];
  
  // Current active conversation
  activeConversation: ChatConversation | null;
  
  // Messages for the active conversation
  activeMessages: ChatMessage[];
  
  // Stream Chat connection status
  connectionStatus: {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
  };
  
  // UI state
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  
  // Typing indicators
  typingUsers: { [conversationId: string]: string[] };
  
  // Total unread count across all conversations
  totalUnreadCount: number;
}

const initialState: ChatState = {
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
export const initializeChat = createAsyncThunk(
  'chat/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const status = await streamChatService.initialize();
      return {
        isConnected: status.isConnected,
        isConnecting: status.isConnecting,
        error: status.error
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await chatService.getUserConversations(userId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createOrGetConversation = createAsyncThunk(
  'chat/createOrGetConversation',
  async (params: CreateChatParams, { rejectWithValue }) => {
    try {
      return await chatService.createOrGetConversation(params);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ conversationId, limit = 50 }: { conversationId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const messages = await chatService.getConversationMessages(conversationId, limit);
      return { conversationId, messages };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    message: string;
    type: 'text' | 'image';
    replyTo?: string;
  }, { rejectWithValue }) => {
    try {
      return await chatService.sendMessage(params);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const markConversationAsRead = createAsyncThunk(
  'chat/markAsRead',
  async ({ conversationId, userId }: { conversationId: string; userId: string }, { rejectWithValue }) => {
    try {
      await chatService.markAsRead(conversationId, userId, '');
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Chat slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<ChatConversation | null>) => {
      state.activeConversation = action.payload;
      state.activeMessages = [];
    },
    
    updateConnectionStatus: (state, action: PayloadAction<ChatState['connectionStatus']>) => {
      state.connectionStatus = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      // Add message to active conversation if it belongs there
      if (state.activeConversation && 
          action.payload.id && 
          state.activeConversation.id.includes(action.payload.id)) {
        state.activeMessages.push(action.payload);
      }
    },
    
    updateConversation: (state, action: PayloadAction<ChatConversation>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
      
      // Update active conversation if it's the same
      if (state.activeConversation && state.activeConversation.id === action.payload.id) {
        state.activeConversation = action.payload;
      }
      
      // Calculate total unread count
      state.totalUnreadCount = state.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    },
    
    setTypingUsers: (state, action: PayloadAction<{ conversationId: string; users: string[] }>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.users;
    },
    
    clearTypingUsers: (state, action: PayloadAction<string>) => {
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
      .addCase(initializeChat.pending, (state) => {
        state.connectionStatus.isConnecting = true;
        state.connectionStatus.error = null;
      })
      .addCase(initializeChat.fulfilled, (state, action) => {
        state.connectionStatus = action.payload;
      })
      .addCase(initializeChat.rejected, (state, action) => {
        state.connectionStatus = {
          isConnected: false,
          isConnecting: false,
          error: action.payload as string
        };
      })
      
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
        state.totalUnreadCount = action.payload.reduce((sum, conv) => sum + conv.unreadCount, 0);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create or get conversation
      .addCase(createOrGetConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrGetConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeConversation = action.payload;
        
        // Add to conversations if not already there
        const exists = state.conversations.some(c => c.id === action.payload.id);
        if (!exists) {
          state.conversations.unshift(action.payload);
        }
      })
      .addCase(createOrGetConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoadingMessages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        if (state.activeConversation && state.activeConversation.id === action.payload.conversationId) {
          state.activeMessages = action.payload.messages;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.error = action.payload as string;
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isSendingMessage = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSendingMessage = false;
        
        // Add message to active messages
        state.activeMessages.push(action.payload);
        
        // Update conversation's last message
        const conversation = state.conversations.find(c => 
          c.id === state.activeConversation?.id
        );
        if (conversation) {
          conversation.lastMessage = action.payload;
          conversation.lastActivity = action.payload.timestamp;
        }
        
        if (state.activeConversation) {
          state.activeConversation.lastMessage = action.payload;
          state.activeConversation.lastActivity = action.payload.timestamp;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload as string;
      })
      
      // Mark as read
      .addCase(markConversationAsRead.fulfilled, (state, action) => {
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

export const {
  setActiveConversation,
  updateConnectionStatus,
  clearError,
  addMessage,
  updateConversation,
  setTypingUsers,
  clearTypingUsers,
  resetChatState,
  updateUnreadCount
} = chatSlice.actions;

export default chatSlice.reducer;
