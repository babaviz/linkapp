/**
 * Stream Chat Theme Wrapper
 * 
 * This module provides compatibility wrapping for Stream Chat themes
 * to prevent property configuration errors when used with different
 * versions of the library.
 */

import streamChatTheme from './streamChatTheme';
import { createStreamChatProxy } from '../services/streamChatCompatibility';

/**
 * Creates a safely wrapped theme that avoids property configuration errors
 */
export function getSafeStreamChatTheme() {
  try {
    // For development, wrap the theme in our safe proxy
    if (__DEV__) {
      return createStreamChatProxy(streamChatTheme);
    }
    
    // For production, return the theme directly
    return streamChatTheme;
  } catch (e) {
    // Return a minimal theme to avoid errors
    return {};
  }
}

export default getSafeStreamChatTheme;
