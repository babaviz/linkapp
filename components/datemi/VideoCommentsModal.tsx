// components/datemi/VideoCommentsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabaseClient';
import { getUserFacingError } from '../../utils/userFacingError';

interface Comment {
  id: string;
  comment_text: string;
  user_id: string;
  profile_id: string;
  display_name: string;
  profile_picture?: string;
  created_at: string;
}

interface VideoCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  userId?: string;
}

export const VideoCommentsModal: React.FC<VideoCommentsModalProps> = ({
  visible,
  onClose,
  videoId,
  userId,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && videoId) {
      loadComments();
    }
  }, [visible, videoId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('date_mi_video_comments')
        .select(`
          id,
          comment_text,
          user_id,
          profile_id,
          created_at,
          profiles:profile_id (
            display_name,
            profile_pictures
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments: Comment[] = (data || []).map(item => ({
        id: item.id,
        comment_text: item.comment_text,
        user_id: item.user_id,
        profile_id: item.profile_id,
        display_name: item.profiles?.display_name || 'User',
        profile_picture: item.profiles?.profile_pictures?.[0],
        created_at: item.created_at,
      }));

      setComments(formattedComments);
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'load comments',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to comment.');
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('Empty Comment', 'Please enter a comment.');
      return;
    }

    setSubmitting(true);

    try {
      // Get user's profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('date_mi_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Insert comment
      const { data: inserted, error: insertError } = await supabase
        .from('date_mi_video_comments')
        .insert({
          video_id: videoId,
          user_id: userId,
          profile_id: profileData.id,
          comment_text: newComment.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      const newCommentObj: Comment = {
        id: inserted.id,
        comment_text: inserted.comment_text,
        user_id: inserted.user_id,
        profile_id: inserted.profile_id,
        display_name: 'You',
        created_at: inserted.created_at,
      };

      setComments(prev => [newCommentObj, ...prev]);
      setNewComment('');
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'post comment',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      {item.profile_picture ? (
        <Image source={{ uri: item.profile_picture }} style={styles.commentAvatar} />
      ) : (
        <View style={styles.commentAvatarPlaceholder}>
          <Ionicons name="person" size={20} color="#FFFFFF" />
        </View>
      )}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentName}>{item.display_name}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.comment_text}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <Text style={styles.headerCount}>{comments.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6012f1" />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to comment!</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            editable={!submitting}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#6012f1" />
            ) : (
              <Ionicons name="send" size={20} color={newComment.trim() ? '#6012f1' : '#9CA3AF'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerCount: {
    fontSize: 14,
    color: '#9CA3AF',
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#000000',
    marginBottom:50
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: 12,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});