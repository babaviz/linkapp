// VideoFeed.tsx - Updated with comprehensive filter modal
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
  RefreshControl,
  Animated
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { getUserFacingError } from '../../utils/userFacingError';
import { VideoCommentsModal } from './VideoCommentsModal';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

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
  headerHeight?: number;
  scrollY?: Animated.Value;
}

type FilterType = 'all' | 'my_videos' | 'liked' | 'favorited';

interface FilterOption {
  id: FilterType;
  label: string;
  icon: string;
  description: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All Videos', icon: 'people-outline', description: 'Browse all videos from everyone' },
  { id: 'my_videos', label: 'My Videos', icon: 'person-outline', description: 'Videos you have uploaded' },
  { id: 'liked', label: 'Liked Videos', icon: 'heart-outline', description: 'Videos you have liked' },
  { id: 'favorited', label: 'Favorited', icon: 'bookmark-outline', description: 'Videos you have favorited' },
];

export const VideoFeed: React.FC<VideoFeedProps> = ({ 
  userId, 
  onProfilePress, 
  onUploadPress,
  headerHeight = 0,
  scrollY
}) => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const [likingVideoId, setLikingVideoId] = useState<string | null>(null);
  const [favoritingVideoId, setFavoritingVideoId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const videoRefs = useRef<Map<string, Video>>(new Map());
  const flatListRef = useRef<FlatList>(null);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<ShortVideo | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [filterType]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // Build base query
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

      // Apply filter
      if (filterType === 'my_videos' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data: videosData, error: videosError } = await query.order('created_at', { ascending: false });

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

      // Format videos
      let formattedVideos: ShortVideo[] = videosData.map(item => {
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

      // Apply liked/favorited filters after data fetch (since they depend on user state)
      if (filterType === 'liked' && userId) {
        formattedVideos = formattedVideos.filter(v => v.isLiked);
      } else if (filterType === 'favorited' && userId) {
        formattedVideos = formattedVideos.filter(v => v.isFavorited);
      }

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

  const handleFilterSelect = (filter: FilterType) => {
    if (!userId && (filter === 'my_videos' || filter === 'liked' || filter === 'favorited')) {
      Alert.alert('Sign in required', 'Please sign in to view your personalized videos.');
      return;
    }
    setFilterType(filter);
    setShowFilterModal(false);
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
              // Delete associated records
              await supabase.from('date_mi_video_likes').delete().eq('video_id', video.id);
              await supabase.from('date_mi_video_favorites').delete().eq('video_id', video.id);
              await supabase.from('date_mi_video_comments').delete().eq('video_id', video.id);

              // Delete from storage
              const filePath = video.videoUrl.split('/datemi-short-videos/')[1];
              const { error: storageError } = await supabase.storage
                .from('datemi-short-videos')
                .remove([filePath]);

              if (storageError) throw storageError;

              // Delete thumbnail if exists
              if (video.thumbnailUrl) {
                const thumbPath = video.thumbnailUrl.split('/datemi-short-videos/')[1];
                await supabase.storage.from('datemi-short-videos').remove([thumbPath]);
              }

              // Delete video record
              const { error: deleteError } = await supabase
                .from('date_mi_short_videos')
                .delete()
                .eq('id', video.id);

              if (deleteError) throw deleteError;

              setVideos(prev => prev.filter(v => v.id !== video.id));
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
      setVideos(prev => prev.map(v =>
        v.id === video.id
          ? { ...v, isLiked: newIsLiked, likes: v.likes + (newIsLiked ? 1 : -1) }
          : v
      ));

      if (newIsLiked) {
        await supabase.from('date_mi_video_likes').insert({ video_id: video.id, user_id: userId });
        await supabase.rpc('increment_video_likes', { video_id: video.id, delta: 1 });
      } else {
        await supabase.from('date_mi_video_likes').delete().eq('video_id', video.id).eq('user_id', userId);
        await supabase.rpc('increment_video_likes', { video_id: video.id, delta: -1 });
      }
    } catch (error) {
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
    const newIsFavorited = !video.isFavorited;
    
    try {
      setVideos(prev => prev.map(v =>
        v.id === video.id
          ? { ...v, isFavorited: newIsFavorited, favorites: v.favorites + (newIsFavorited ? 1 : -1) }
          : v
      ));

      if (newIsFavorited) {
        await supabase.from('date_mi_video_favorites').insert({ video_id: video.id, user_id: userId });
        await supabase.rpc('increment_video_favorites', { video_id: video.id, delta: 1 });
      } else {
        await supabase.from('date_mi_video_favorites').delete().eq('video_id', video.id).eq('user_id', userId);
        await supabase.rpc('increment_video_favorites', { video_id: video.id, delta: -1 });
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
      // Silent fail
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== currentVisibleIndex && newIndex !== undefined) {
        const prevVideo = videoRefs.current.get(videos[currentVisibleIndex]?.id);
        if (prevVideo) {
          prevVideo.pauseAsync();
        }
        setCurrentVisibleIndex(newIndex);
        incrementViews(viewableItems[0].item.id);
      }
    }
  }, [currentVisibleIndex, videos]);

  const getFilterButtonIcon = () => {
    switch (filterType) {
      case 'my_videos': return 'person';
      case 'liked': return 'heart';
      case 'favorited': return 'bookmark';
      default: return 'options-outline';
    }
  };

  const getFilterButtonColor = () => {
    switch (filterType) {
      case 'my_videos': return ['#EF4444', '#F97316'];
      case 'liked': return ['#EC4899', '#F43F5E'];
      case 'favorited': return ['#F59E0B', '#FBBF24'];
      default: return ['#6012f1', '#8b5cf6'];
    }
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContainer}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterModalContent}>
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterOption,
                  filterType === option.id && styles.filterOptionActive
                ]}
                onPress={() => handleFilterSelect(option.id)}
              >
                <View style={[
                  styles.filterOptionIcon,
                  filterType === option.id && styles.filterOptionIconActive
                ]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={filterType === option.id ? '#FFFFFF' : '#6012f1'} 
                  />
                </View>
                <View style={styles.filterOptionTextContainer}>
                  <Text style={[
                    styles.filterOptionLabel,
                    filterType === option.id && styles.filterOptionLabelActive
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.filterOptionDescription}>
                    {option.description}
                  </Text>
                </View>
                {filterType === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            <TouchableOpacity
              style={styles.uploadOption}
              onPress={() => {
                setShowFilterModal(false);
                onUploadPress();
              }}
            >
              <View style={styles.uploadOptionIcon}>
                <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.filterOptionTextContainer}>
                <Text style={styles.uploadOptionLabel}>Upload Video</Text>
                <Text style={styles.filterOptionDescription}>
                  Share a new video with the community
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
        
        <Modal
          visible={showDeleteMenu === item.id}
          transparent
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
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientOverlay}
        />
        
        <View style={styles.actionsContainer}>
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
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item)}
            disabled={likingVideoId === item.id}
          >
            <Ionicons
              name={'heart'}
              size={36}
              color={item.isLiked ? '#EF4444' : '#FFFFFF'}
            />
            <Text style={styles.actionCount}>{item.likes}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setSelectedVideoForComments(item)}
          >
            <Ionicons name="chatbubble" size={32} color="#FFFFFF" />
            <Text style={styles.actionCount}>{item.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleFavorite(item)}
            disabled={favoritingVideoId === item.id}
          >
            <Ionicons
              name={'bookmark'}
              size={32}
              color={item.isFavorited ? '#F59E0B' : '#FFFFFF'}
            />
            <Text style={styles.actionCount}>{item.favorites}</Text>
          </TouchableOpacity>

          {isOwnVideo && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowDeleteMenu(item.id)}
            >
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        
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
    const getEmptyMessage = () => {
      switch (filterType) {
        case 'my_videos': return "You haven't uploaded any videos yet.";
        case 'liked': return "You haven't liked any videos yet.";
        case 'favorited': return "You haven't favorited any videos yet.";
        default: return "Be the first to upload a short video!";
      }
    };
    
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyTitle}>No Videos Found</Text>
        <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
        <TouchableOpacity style={styles.uploadEmptyButton} onPress={onUploadPress}>
          <Text style={styles.uploadEmptyButtonText}>Upload Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <AnimatedFlatList
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
        contentContainerStyle={{ paddingTop: headerHeight }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY || new Animated.Value(0) } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        style={[{top:-70}]}
      />
      
      <TouchableOpacity 
        style={styles.filterFloatingButton} 
        onPress={() => setShowFilterModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getFilterButtonColor()}
          style={styles.filterButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.filterButtonContent}>
            <Ionicons 
              name={getFilterButtonIcon() as any} 
              size={24} 
              color="#FFFFFF" 
            />
            {filterType !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {filterType === 'my_videos' ? '1' : filterType === 'liked' ? '♥' : '★'}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {renderFilterModal()}

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
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
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
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.7,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterModalContent: {
    padding: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
    gap: 12,
  },
  filterOptionActive: {
    backgroundColor: '#6012f1',
  },
  filterOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(96, 18, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterOptionTextContainer: {
    flex: 1,
  },
  filterOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  filterOptionLabelActive: {
    color: '#FFFFFF',
  },
  filterOptionDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  filterDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    gap: 12,
  },
  uploadOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
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