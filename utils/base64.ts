/**
 * Base64 encoding/decoding utilities for cross-platform compatibility
 */

/**
 * Encode string to base64
 */
export function encodeBase64(str: string): string {
  try {
    // Try using btoa if available (web/some React Native environments)
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    
    // Fallback to manual encoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  } catch (error) {
    
    // Ultimate fallback - return hex encoding
    return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Decode base64 to string
 */
export function decodeBase64(str: string): string {
  try {
    // Try using atob if available (web/some React Native environments)
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    
    // Fallback to manual decoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    
    while (i < str.length) {
      const encoded1 = chars.indexOf(str.charAt(i++));
      const encoded2 = chars.indexOf(str.charAt(i++));
      const encoded3 = chars.indexOf(str.charAt(i++));
      const encoded4 = chars.indexOf(str.charAt(i++));
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    
    return result;
  } catch (error) {
    
    // Ultimate fallback - try hex decoding
    try {
      return str.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || str;
    } catch {
      return str;
    }
  }
}
