// components/datemi/VideoFeed.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { DateMiProfileService } from '../../services/dateMiService';
import { getUserFacingError } from '../../utils/userFacingError';
import { VideoCommentsModal } from './VideoCommentsModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ShortVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  userId: string;
  userProfileId: string;
  displayName: string;
  profilePicture?: string;
  caption?: string;
  likes: number;
  comments: number;
  favorites: number;
  views: number;
  isLiked: boolean;
  isFavorited: boolean;
  createdAt: string;
}

interface VideoFeedProps {
  userId?: string;
  onProfilePress: (profileId: string) => void;
  onUploadPress: () => void;
}

type FilterMode = 'all' | 'user';

export const VideoFeed: React.FC<VideoFeedProps> = ({ userId, onProfilePress, onUploadPress }) => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const [likingVideoId, setLikingVideoId] = useState<string | null>(null);
  const [favoritingVideoId, setFavoritingVideoId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, Video>>(new Map());
  const flatListRef = useRef<FlatList>(null);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<ShortVideo | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [filterMode]); // Reload when filter mode changes

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // Build query based on filter mode
      let query = supabase
        .from('date_mi_short_videos')
        .select(`
          id,
          video_url,
          thumbnail_url,
          user_id,
          profile_id,
          caption,
          likes_count,
          comments_count,
          favorites_count,
          views_count,
          created_at
        `)
        .eq('is_active', true);

      // Apply user filter if needed
      if (filterMode === 'user' && userId) {
        query = query.eq('user_id', userId);
      }

      // Order by most recent
      query = query.order('created_at', { ascending: false });

      const { data: videosData, error: videosError } = await query;

      if (videosError) throw videosError;

      if (!videosData || videosData.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get all unique profile IDs
      const profileIds = [...new Set(videosData.map(v => v.profile_id).filter(Boolean))];
      
      // Fetch profiles separately
      let profilesMap = new Map();
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('date_mi_profiles')
          .select('id, user_id, display_name, profile_pictures')
          .in('id', profileIds);

        if (!profilesError && profilesData) {
          profilesMap = new Map(profilesData.map(p => [p.id, p]));
        }
      }

      // Get user's liked/favorited videos
      let likedVideoIds: Set<string> = new Set();
      let favoritedVideoIds: Set<string> = new Set();
      
      if (userId) {
        const [likesResult, favoritesResult] = await Promise.all([
          supabase.from('date_mi_video_likes').select('video_id').eq('user_id', userId),
          supabase.from('date_mi_video_favorites').select('video_id').eq('user_id', userId),
        ]);
        
        if (likesResult.data) {
          likedVideoIds = new Set(likesResult.data.map(l => l.video_id));
        }
        if (favoritesResult.data) {
          favoritedVideoIds = new Set(favoritesResult.data.map(f => f.video_id));
        }
      }

      // Format videos with profile data
      const formattedVideos: ShortVideo[] = videosData.map(item => {
        const profile = profilesMap.get(item.profile_id);
        return {
          id: item.id,
          videoUrl: item.video_url,
          thumbnailUrl: item.thumbnail_url,
          userId: item.user_id,
          userProfileId: profile?.id || item.profile_id,
          displayName: profile?.display_name || 'User',
          profilePicture: profile?.profile_pictures?.[0],
          caption: item.caption,
          likes: item.likes_count || 0,
          comments: item.comments_count || 0,
          favorites: item.favorites_count || 0,
          views: item.views_count || 0,
          isLiked: likedVideoIds.has(item.id),
          isFavorited: favoritedVideoIds.has(item.id),
          createdAt: item.created_at,
        };
      });

      setVideos(formattedVideos);
      
      // Reset current visible index
      setCurrentVisibleIndex(0);
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'load videos',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const toggleFilter = () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to view your videos.');
      return;
    }
    
    const newFilterMode = filterMode === 'all' ? 'user' : 'all';
    setFilterMode(newFilterMode);
  };

  const handleDeleteVideo = async (video: ShortVideo) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingVideoId(video.id);
            try {
              // First, delete all associated likes
              await supabase
                .from('date_mi_video_likes')
                .delete()
                .eq('video_id', video.id);

              // Delete all associated favorites
              await supabase
                .from('date_mi_video_favorites')
                .delete()
                .eq('video_id', video.id);

              // Delete all comments
              await supabase
                .from('date_mi_video_comments')
                .delete()
                .eq('video_id', video.id);

              // Delete from storage first
              const filePath = video.videoUrl.split('/datemi-short-videos/')[1];
              const { error: storageError } = await supabase.storage
                .from('datemi-short-videos')
                .remove([filePath]);

              if (storageError) throw storageError;

              // Finally, delete the video
              const { error: deleteError } = await supabase
                .from('date_mi_short_videos')
                .delete()
                .eq('id', video.id);

              if (deleteError) throw deleteError;

              // Remove video from state
              setVideos(prev => prev.filter(v => v.id !== video.id));
              
              // Close delete menu
              setShowDeleteMenu(null);
              
              Alert.alert('Success', 'Video deleted successfully');
            } catch (error) {
              const friendly = getUserFacingError(error, {
                action: 'delete video',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message);
            } finally {
              setDeletingVideoId(null);
            }
          }
        }
      ]
    );
  };

  const handleLike = async (video: ShortVideo) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to like videos.');
      return;
    }

    setLikingVideoId(video.id);
    
    const newIsLiked = !video.isLiked;
    try {     

      // Optimistic update
      setVideos(prev => prev.map(v =>
        v.id === video.id
          ? { ...v, isLiked: newIsLiked, likes: v.likes + (newIsLiked ? 1 : -1) }
          : v
      ));

      if (newIsLiked) {
        // CREATE the like record
        const { error: insertError } = await supabase
          .from('date_mi_video_likes')
          .insert({
            video_id: video.id,
            user_id: userId,
          });
        
        if (insertError) throw insertError;
        
        // Increment the counter
        await supabase.rpc('increment_video_likes', {
          video_id: video.id,
          delta: 1,
        });
      } else {
        // DELETE the like record
        const { error: deleteError } = await supabase
          .from('date_mi_video_likes')
          .delete()
          .eq('video_id', video.id)
          .eq('user_id', userId);
        
        if (deleteError) throw deleteError;
        
        // Decrement the counter
        await supabase.rpc('increment_video_likes', {
          video_id: video.id,
          delta: -1,
        });
      }
    } catch (error) {
      // Revert on error
      setVideos(prev => prev.map(v =>
        v.id === video.id
          ? { ...v, isLiked: video.isLiked, likes: video.likes }
          : v
      ));
      const friendly = getUserFacingError(error, {
        action: newIsLiked ? 'like this video' : 'unlike this video',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setLikingVideoId(null);
    }
  };

  const handleFavorite = async (video: ShortVideo) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to favorite videos.');
      return;
    }

    setFavoritingVideoId(video.id);
    
    try {
      const newIsFavorited = !video.isFavorited;

      setVideos(prev => prev.map(v =>
        v.id === video.id
          ? { ...v, isFavorited: newIsFavorited, favorites: v.favorites + (newIsFavorited ? 1 : -1) }
          : v
      ));

      if (newIsFavorited) {
        // CREATE the favorite record
        const { error: insertError } = await supabase
          .from('date_mi_video_favorites')
          .insert({
            video_id: video.id,
            user_id: userId,
          });
        
        if (insertError) throw insertError;
        
        // Increment the counter
        await supabase.rpc('increment_video_favorites', {
          video_id: video.id,
          delta: 1,
        });
      } else {
        // DELETE the favorite record
        const { error: deleteError } = await supabase
          .from('date_mi_video_favorites')
          .delete()
          .eq('video_id', video.id)
          .eq('user_id', userId);
        
        if (deleteError) throw deleteError;
        
        // Decrement the counter
        await supabase.rpc('increment_video_favorites', {
          video_id: video.id,
          delta: -1,
        });
      }
    } catch (error) {
      setVideos(prev => prev.map(v =>
        v.id === video.id
          ? { ...v, isFavorited: video.isFavorited, favorites: video.favorites }
          : v
      ));
      const friendly = getUserFacingError(error, {
        action: newIsFavorited ? 'favorite this video' : 'remove favorite',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setFavoritingVideoId(null);
    }
  };

  const incrementViews = async (videoId: string) => {
    try {
      await supabase.rpc('increment_video_views', { video_id: videoId });
    } catch {
      // Silent fail for view counting
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== currentVisibleIndex && newIndex !== undefined) {
        // Pause previous video
        const prevVideo = videoRefs.current.get(videos[currentVisibleIndex]?.id);
        if (prevVideo) {
          prevVideo.pauseAsync();
        }
        setCurrentVisibleIndex(newIndex);
        
        // Increment view count for the new video
        const videoId = viewableItems[0].item.id;
        incrementViews(videoId);
      }
    }
  }, [currentVisibleIndex, videos]);

  const renderVideoItem = ({ item, index }: { item: ShortVideo; index: number }) => {
    const isVisible = index === currentVisibleIndex;
    const isOwnVideo = userId === item.userId;
    
    return (
      <View style={styles.videoContainer}>
        <Video
          ref={ref => ref && videoRefs.current.set(item.id, ref)}
          source={{ uri: item.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isVisible}
          isLooping
          useNativeControls={false}
          posterSource={item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined}
          posterStyle={styles.videoPoster}
        />
        
        {/* Delete Menu Modal */}
        <Modal
          visible={showDeleteMenu === item.id}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteMenu(null)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowDeleteMenu(null)}
          >
            <View style={styles.deleteMenuContainer}>
              <View style={styles.deleteMenu}>
                <TouchableOpacity 
                  style={styles.deleteMenuItem}
                  onPress={() => handleDeleteVideo(item)}
                  disabled={deletingVideoId === item.id}
                >
                  {deletingVideoId === item.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={24} color="#EF4444" />
                      <Text style={styles.deleteMenuItemText}>Delete Video</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteMenuCancel}
                  onPress={() => setShowDeleteMenu(null)}
                >
                  <Text style={styles.deleteMenuCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientOverlay}
        />
        
        {/* Right Side Actions */}
        <View style={styles.actionsContainer}>
          {/* Profile Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onProfilePress(item.userProfileId)}
          >
            {item.profilePicture ? (
              <Image source={{ uri: item.profilePicture }} style={styles.actionAvatar} />
            ) : (
              <View style={styles.actionAvatarPlaceholder}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          
          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item)}
            disabled={likingVideoId === item.id}
          >
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={36}
              color={item.isLiked ? '#EF4444' : '#6012f1'}
            />
            <Text style={styles.actionCount}>{item.likes}</Text>
          </TouchableOpacity>
          
          {/* Comment Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setSelectedVideoForComments(item)}
          >
            <Ionicons name="chatbubble-outline" size={32} color="#6012f1" />
            <Text style={styles.actionCount}>{item.comments}</Text>
          </TouchableOpacity>
          
          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleFavorite(item)}
            disabled={favoritingVideoId === item.id}
          >
            <Ionicons
              name={item.isFavorited ? 'bookmark' : 'bookmark-outline'}
              size={32}
              color={item.isFavorited ? '#F59E0B' : '#6012f1'}
            />
            <Text style={styles.actionCount}>{item.favorites}</Text>
          </TouchableOpacity>

          {/* Delete Button - Only for user's own videos */}
          {isOwnVideo && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowDeleteMenu(item.id)}
            >
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => onProfilePress(item.userProfileId)}
          >
            <Text style={styles.displayName}>{item.displayName}</Text>
          </TouchableOpacity>
          {item.caption && (
            <Text style={styles.caption} numberOfLines={2}>
              {item.caption}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && videos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  if (videos.length === 0 && !loading) {
    const isUserFilter = filterMode === 'user';
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyTitle}>
          {isUserFilter ? 'No Videos Yet' : 'No Videos Available'}
        </Text>
        <Text style={styles.emptyText}>
          {isUserFilter 
            ? "You haven't uploaded any videos yet." 
            : "Be the first to upload a short video!"}
        </Text>
        <TouchableOpacity style={styles.uploadEmptyButton} onPress={onUploadPress}>
          <Text style={styles.uploadEmptyButtonText}>
            {isUserFilter ? 'Upload Your First Video' : 'Upload Video'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />
        }
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
      />
      
      {/* Floating Filter Button */}
      <TouchableOpacity 
        style={styles.filterFloatingButton} 
        onPress={toggleFilter}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={filterMode === 'all' ? ['#6012f1', '#8b5cf6'] : ['#EF4444', '#F97316']}
          style={styles.filterButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.filterButtonContent}>
            <Ionicons 
              name={filterMode === 'all' ? 'people-outline' : 'person-outline'} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.filterButtonText}>
              {filterMode === 'all' ? 'All' : 'My'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <VideoCommentsModal
        visible={!!selectedVideoForComments}
        onClose={() => setSelectedVideoForComments(null)}
        videoId={selectedVideoForComments?.id || ''}
        userId={userId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPoster: {
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  actionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 350,
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  actionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionCount: {
    color: '#6012f1',
    fontSize: 12,
    marginTop: 0,
    fontWeight: '500',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 80,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  caption: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadEmptyButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  uploadEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterFloatingButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
  filterButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteMenuContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  deleteMenu: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  deleteMenuItemText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    alignItems:'center'
  },
  deleteMenuCancel: {
    padding: 16,
  },
  deleteMenuCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});