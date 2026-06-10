import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Material3Card from '../../components/common/Material3Card';
import Material3Button from '../../components/common/Material3Button';
import { useAppSelector } from '../../redux/hooks';
import { formatCurrency } from '../../utils/currencyHelpers';
import MediaUpload, { MediaItem as UploadMediaItem } from '../../components/common/MediaUpload';
import { creatorService, ContentItem as CreatorContentItem } from '../../services/creatorService';
import { storageService } from '../../services/storageService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface ContentItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  price: number;
  isPublic: boolean;
  views: number;
  purchases: number;
  earnings: number;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

function mapCreatorContentToItem(item: CreatorContentItem): ContentItem {
  const metadata = item.metadata || {};
  const metaAny = metadata as any;
  const views =
    typeof metaAny.views === 'number' && Number.isFinite(metaAny.views)
      ? metaAny.views
      : 0;
  const purchases =
    typeof metaAny.purchases === 'number' && Number.isFinite(metaAny.purchases)
      ? metaAny.purchases
      : 0;
  const earnings =
    typeof metaAny.earnings === 'number' && Number.isFinite(metaAny.earnings)
      ? metaAny.earnings
      : 0;

  return {
    id: item.id,
    type: item.contentType,
    title: item.title,
    description: item.description ?? undefined,
    fileUrl: item.fileUrl,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    price: Number(item.price) || 0,
    isPublic: item.isPublic,
    views,
    purchases,
    earnings,
    uploadedAt: item.createdAt,
    metadata: item.metadata,
  };
}

export default function ContentLibraryScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const userCountry = user?.location?.county;

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | 'photos' | 'videos' | 'audio'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'photo' | 'video' | 'audio'>('photo');
  const [selectedMedia, setSelectedMedia] = useState<UploadMediaItem[]>([]);
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentDescription, setNewContentDescription] = useState('');
  const [newContentPrice, setNewContentPrice] = useState('0');
  const [newContentIsPublic, setNewContentIsPublic] = useState(true);
  const [isSavingContent, setIsSavingContent] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (!user?.id) {
        setContentItems([]);
        setLoading(false);
        setLoadingError('Sign in to manage your content library.');
        return;
      }

      if (!isSupabaseConfigured()) {
        setContentItems([]);
        setLoading(false);
        setLoadingError(
          'Content library is unavailable because Supabase is not configured.'
        );
        return;
      }

      setLoading(true);
      setLoadingError(null);

      try {
        const items = await creatorService.getCreatorContent(user.id);
        setContentItems(items.map(mapCreatorContentToItem));
      } catch {
        setLoadingError(
          'Failed to load your content library. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    void loadContent();
  }, [user?.id]);

  const filteredContent = contentItems.filter(item => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'photos') return item.type === 'photo';
    if (selectedTab === 'videos') return item.type === 'video';
    if (selectedTab === 'audio') return item.type === 'audio';
    return true;
  });

  const totalEarnings = contentItems.reduce(
    (sum, item) => sum + (item.earnings || 0),
    0
  );
  const totalPurchases = contentItems.reduce(
    (sum, item) => sum + (item.purchases || 0),
    0
  );
  const totalViews = contentItems.reduce(
    (sum, item) => sum + (item.views || 0),
    0
  );

  const resetUploadForm = () => {
    setUploadType('photo');
    setSelectedMedia([]);
    setNewContentTitle('');
    setNewContentDescription('');
    setNewContentPrice('0');
    setNewContentIsPublic(true);
  };

  const handleConfirmDelete = async (contentId: string) => {
    if (!user?.id) {
      Alert.alert(
        'Sign in required',
        'You need to be signed in to delete content.'
      );
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Content unavailable',
        'Content cannot be deleted because Supabase is not configured.'
      );
      return;
    }

    try {
      await creatorService.deleteContent(contentId);
      setContentItems(prev => prev.filter(item => item.id !== contentId));
    } catch {
      Alert.alert(
        'Delete failed',
        'We could not delete this content. Please try again.'
      );
    }
  };

  const handleDeleteContent = (contentId: string) => {
    Alert.alert(
      'Delete Content',
      'Are you sure you want to delete this content? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleConfirmDelete(contentId);
          },
        },
      ]
    );
  };

  const handleToggleVisibility = (contentId: string) => {
    const target = contentItems.find(item => item.id === contentId);
    if (!target) {
      return;
    }

    if (!user?.id) {
      Alert.alert(
        'Sign in required',
        'You need to be signed in to update content visibility.'
      );
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Content unavailable',
        'Content visibility cannot be changed because Supabase is not configured.'
      );
      return;
    }

    const nextIsPublic = !target.isPublic;

    setContentItems(prev =>
      prev.map(item =>
        item.id === contentId ? { ...item, isPublic: nextIsPublic } : item
      )
    );

    void (async () => {
      try {
        await creatorService.updateContent(contentId, { isPublic: nextIsPublic });
      } catch {
        setContentItems(prev =>
          prev.map(item =>
            item.id === contentId ? { ...item, isPublic: target.isPublic } : item
          )
        );
        Alert.alert(
          'Update failed',
          'We could not update content visibility. Please try again.'
        );
      }
    })();
  };

  const handleCreateContent = async () => {
    if (!user?.id) {
      Alert.alert(
        'Sign in required',
        'You must be signed in to upload content.'
      );
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Content upload unavailable',
        'Content upload is disabled because Supabase is not configured.'
      );
      return;
    }

    const media = selectedMedia[0];

    if (!media) {
      Alert.alert(
        'Select media',
        'Please select a photo, video, or audio file to upload.'
      );
      return;
    }

    const title = newContentTitle.trim();
    if (!title) {
      Alert.alert('Title required', 'Please enter a title for your content.');
      return;
    }

    const numericPrice = Number(newContentPrice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Invalid price', 'Please enter a valid non-negative price.');
      return;
    }

    try {
      setIsSavingContent(true);

      const contentId = crypto.randomUUID();
      const response = await fetch(media.uri);
      const blob = await response.blob();

      const storageType =
        uploadType === 'photo'
          ? 'image'
          : uploadType === 'video'
          ? 'video'
          : 'audio';

      const uploadResult = await storageService.uploadCreatorContent(
        contentId,
        user.id,
        blob,
        storageType
      );

      if (!uploadResult.success || !uploadResult.data?.publicUrl) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const fileUrl = uploadResult.data.publicUrl;
      const metadata: Record<string, unknown> = {
        originalFileName: media.name,
        size: media.size,
        mimeType: media.mimeType,
        views: 0,
        purchases: 0,
        earnings: 0,
      };

      const created = await creatorService.uploadContent({
        id: contentId,
        creatorId: user.id,
        title,
        description: newContentDescription.trim() || undefined,
        contentType: uploadType,
        fileUrl,
        thumbnailUrl: uploadType === 'photo' ? fileUrl : undefined,
        price: numericPrice,
        isPublic: newContentIsPublic,
        tags: [],
        metadata,
      });

      const uiItem = mapCreatorContentToItem(created);
      setContentItems(prev => [uiItem, ...prev]);

      resetUploadForm();
      setShowUploadModal(false);
    } catch {
      Alert.alert(
        'Upload failed',
        'We could not upload your content. Please check your connection and try again.'
      );
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleUploadModalClose = () => {
    if (isSavingContent) {
      return;
    }
    setShowUploadModal(false);
  };

  const getContentIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'photo':
        return 'image-outline';
      case 'video':
        return 'videocam-outline';
      case 'audio':
        return 'musical-notes-outline';
      default:
        return 'document-outline';
    }
  };

  const renderStatsOverview = () => (
    <Material3Card style={[styles.style1, { backgroundColor: 'rgba(255,255,255,0.1)' }] as any}>
      <View style={styles.style2}>
        <Text style={styles.style3}>Content Performance</Text>
        
        <View style={styles.style4}>
          <View style={styles.style5}>
            <Text style={styles.style6}>
              {formatCurrency(totalEarnings, userCountry)}
            </Text>
            <Text style={styles.style7}>Total Earnings</Text>
          </View>
          <View style={styles.style5}>
            <Text style={styles.style6}>{totalPurchases}</Text>
            <Text style={styles.style7}>Purchases</Text>
          </View>
          <View style={styles.style5}>
            <Text style={styles.style6}>{totalViews}</Text>
            <Text style={styles.style7}>Views</Text>
          </View>
        </View>
      </View>
    </Material3Card>
  );

  const renderTabSelector = () => (
    <View style={styles.style8}>
      {[
        { key: 'all', label: 'All', count: contentItems.length },
        { key: 'photos', label: 'Photos', count: contentItems.filter(i => i.type === 'photo').length },
        { key: 'videos', label: 'Videos', count: contentItems.filter(i => i.type === 'video').length },
        { key: 'audio', label: 'Audio', count: contentItems.filter(i => i.type === 'audio').length },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => setSelectedTab(tab.key as any)}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.tabButtonActive
          ]}
        >
          <Text style={[
            styles.tabText,
            selectedTab === tab.key && styles.tabTextActive
          ]}>
            {tab.label} ({tab.count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContentItem = ({ item }: { item: ContentItem }) => (
    <Material3Card 
      style={[styles.style9, { backgroundColor: 'rgba(255,255,255,0.1)' }] as any}
    >
      <View style={styles.style2}>
        <View style={styles.style10}>
          <View style={styles.style11}>
            <Ionicons name={getContentIcon(item.type) as any} size={24} color="white" />
          </View>
          
          <View style={styles.style12}>
            <View style={styles.style13}>
              <Text style={styles.style14}>{item.title}</Text>
              <View style={[
                styles.statusBadge,
                item.isPublic ? styles.publicBadge : styles.premiumBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  item.isPublic ? styles.publicText : styles.premiumText
                ]}>
                  {item.isPublic ? 'Public' : 'Premium'}
                </Text>
              </View>
            </View>
            
            {item.description && (
              <Text style={styles.style15}>{item.description}</Text>
            )}

            <View style={styles.style16}>
              <View>
                <Text style={styles.style17}>{formatCurrency(item.price, userCountry)}</Text>
              </View>
              <View style={styles.style18}>
                <View style={styles.style19}>
                  <Text style={styles.style17}>{item.views}</Text>
                  <Text style={styles.style20}>Views</Text>
                </View>
                <View style={styles.style19}>
                  <Text style={styles.style17}>{item.purchases}</Text>
                  <Text style={styles.style20}>Sales</Text>
                </View>
                <View style={styles.style19}>
                  <Text style={styles.style21}>
                    {formatCurrency(item.earnings, userCountry)}
                  </Text>
                  <Text style={styles.style20}>Earned</Text>
                </View>
              </View>
            </View>

            <View style={styles.style22}>
              <Material3Button
                onPress={() => {}}
                variant="outlined"
                style={{ flex: 1 }}
                textStyle={{ color: 'white', fontSize: 14 }}
              >
                Edit
              </Material3Button>
              <Material3Button
                onPress={() => handleToggleVisibility(item.id)}
                variant="tonal"
                style={{ flex: 1 }}
                textStyle={{ fontSize: 14 }}
              >
                {item.isPublic ? 'Make Premium' : 'Make Public'}
              </Material3Button>
              <TouchableOpacity
                onPress={() => handleDeleteContent(item.id)}
                style={styles.style23}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Material3Card>
  );

  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleUploadModalClose}
    >
      <SafeAreaView style={styles.style24}>
        <View style={styles.style25}>
          <TouchableOpacity onPress={handleUploadModalClose} disabled={isSavingContent}>
            <Text style={styles.style26}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.style27}>Upload Content</Text>
          <TouchableOpacity onPress={handleCreateContent} disabled={isSavingContent}>
            {isSavingContent ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text style={styles.style28}>Upload</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.style29}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Text style={styles.style30}>Content Type</Text>
          
          <View style={styles.style31}>
            {[
              { type: 'photo', icon: 'image-outline', label: 'Photo Content', desc: 'Upload high-quality photos' },
              { type: 'video', icon: 'videocam-outline', label: 'Video Content', desc: 'Upload short videos' },
              { type: 'audio', icon: 'musical-notes-outline', label: 'Audio Content', desc: 'Upload audio messages or music' },
            ].map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.style32,
                  uploadType === option.type
                    ? styles.uploadTypeCardSelected
                    : styles.uploadTypeCardUnselected,
                ]}
                onPress={() =>
                  setUploadType(option.type as 'photo' | 'video' | 'audio')
                }
                disabled={isSavingContent}
              >
                <Ionicons name={option.icon as any} size={24} color="#6366F1" />
                <View style={styles.style33}>
                  <Text style={styles.style34}>{option.label}</Text>
                  <Text style={styles.style35}>{option.desc}</Text>
                </View>
                <Ionicons
                  name={
                    uploadType === option.type
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={20}
                  color={uploadType === option.type ? '#6366F1' : '#9CA3AF'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <MediaUpload
            mediaType={
              uploadType === 'photo'
                ? 'image'
                : uploadType === 'video'
                ? 'video'
                : 'document'
            }
            maxFiles={1}
            module="datemi"
            selectedMedia={selectedMedia}
            onMediaSelected={(media) => setSelectedMedia(media)}
            onMediaRemoved={(mediaId) =>
              setSelectedMedia((prev) =>
                prev.filter((item) => item.id !== mediaId)
              )
            }
            placeholder="Select content to upload to your library"
            uploadButton
            disabled={isSavingContent}
          />

          <View style={styles.uploadSection}>
            <Text style={styles.uploadFieldLabel}>Title</Text>
            <TextInput
              style={styles.uploadTextInput}
              placeholder="Give your content a title"
              value={newContentTitle}
              onChangeText={setNewContentTitle}
              editable={!isSavingContent}
            />

            <Text style={styles.uploadFieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.uploadTextInput, styles.uploadDescriptionInput]}
              placeholder="Describe what viewers get from this content"
              multiline
              numberOfLines={4}
              value={newContentDescription}
              onChangeText={setNewContentDescription}
              editable={!isSavingContent}
            />

            <Text style={styles.uploadFieldLabel}>Price</Text>
            <TextInput
              style={styles.uploadTextInput}
              placeholder="0 (free) or a price in your currency"
              keyboardType="numeric"
              value={newContentPrice}
              onChangeText={setNewContentPrice}
              editable={!isSavingContent}
            />

            <View style={styles.uploadVisibilityRow}>
              <View>
                <Text style={styles.uploadVisibilityLabel}>
                  {newContentIsPublic ? 'Public content' : 'Premium content'}
                </Text>
                <Text style={styles.uploadVisibilityValue}>
                  {newContentIsPublic
                    ? 'Visible to everyone'
                    : 'Only available to paying customers'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setNewContentIsPublic(!newContentIsPublic)}
                disabled={isSavingContent}
                style={styles.visibilityToggleButton}
              >
                <Text style={styles.visibilityToggleText}>
                  {newContentIsPublic ? 'Make Premium' : 'Make Public'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.style24}>
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <View style={styles.style36}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.style37}>Content Library</Text>
        <TouchableOpacity onPress={() => setShowUploadModal(true)}>
          <Ionicons name="cloud-upload-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.style38}
        contentInsetAdjustmentBehavior="automatic"
      >
        {renderStatsOverview()}
        {renderTabSelector()}

        {loadingError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{loadingError}</Text>
          </View>
        )}

        {loading && filteredContent.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : (
          <FlatList
            data={filteredContent}
            renderItem={renderContentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.style39}>
                <View style={styles.style40}>
                  <Ionicons name="cloud-upload-outline" size={40} color="white" />
                </View>
                <Text style={styles.style41}>No Content Yet</Text>
                <Text style={styles.style42}>
                  Upload your first content to start earning
                </Text>
                <Material3Button
                  onPress={() => setShowUploadModal(true)}
                  variant="filled"
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  Upload Content
                </Material3Button>
              </View>
            )}
          />
        )}
      </ScrollView>

      {renderUploadModal()}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'marginBottom': 24
},
  style2: {
  'padding': 16
},
  style3: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'fontSize': 18,
  'marginBottom': 16
},
  style4: {
  'flexDirection': 'row',
  'justifyContent': 'space-between'
},
  style5: {
  'flex': 1,
  'alignItems': 'center'
},
  style6: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF'
},
  style7: {
  'color': '#D1D5DB',
  'fontSize': 14
},
  style8: {
  'flexDirection': 'row',
  'backgroundColor': '#1F2937',
  'opacity': 0.3,
  'borderRadius': 8,
  'padding': 4,
  'marginBottom': 24
},
  style9: {
  'marginBottom': 16
},
  style10: {
  'flexDirection': 'row',
  'alignItems': 'flex-start'
},
  style11: {
  'width': 64,
  'height': 64,
  'backgroundColor': '#374151',
  'borderRadius': 8,
  'marginRight': 16,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style12: {
  'flex': 1
},
  style13: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 8
},
  style14: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'fontSize': 18,
  'flex': 1
},
  style15: {
  'color': '#D1D5DB',
  'fontSize': 14,
  'marginBottom': 12
},
  style16: {
  'flexDirection': 'row',
  'justifyContent': 'space-between',
  'alignItems': 'center',
  'marginBottom': 12
},
  style17: {
  'color': '#FFFFFF',
  'fontWeight': '700'
},
  style18: {
  'flexDirection': 'row',
  'gap': 16
},
  style19: {
  'alignItems': 'center'
},
  style20: {
  'color': '#D1D5DB',
  'fontSize': 12
},
  style21: {
  'fontWeight': '700'
},
  style22: {
  'flexDirection': 'row',
  'gap': 8
},
  style23: {
  'paddingHorizontal': 16,
  'paddingVertical': 8,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style24: {
  'flex': 1,
  'backgroundColor': '#FFFFFF'
},
  style25: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 12,
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style26: {
  'fontSize': 18
},
  style27: {
  'fontSize': 20,
  'fontWeight': '600'
},
  style28: {
  'fontSize': 18,
  'fontWeight': '600'
},
  style29: {
  'flex': 1,
  'paddingHorizontal': 16,
  'paddingVertical': 24
},
  style30: {
  'fontSize': 18,
  'fontWeight': '600',
  'marginBottom': 16
},
  style31: {
  'gap': 12,
  'marginBottom': 24
},
  style32: {
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'borderRadius': 8,
  'padding': 16,
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style33: {
  'marginLeft': 16,
  'flex': 1
},
  style34: {
  'fontWeight': '600',
  'fontSize': 18
},
  style35: {
  'color': '#4B5563',
  'fontSize': 14
},
  style36: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style37: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#FFFFFF'
},
  style38: {
  'flex': 1,
  'paddingHorizontal': 16,
  'paddingVertical': 16
},
  style39: {
  'alignItems': 'center'
},
  style40: {
  'width': 80,
  'height': 80,
  'backgroundColor': '#F3E8FF',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginBottom': 16
},
  style41: {
  'color': '#FFFFFF',
  'fontSize': 18,
  'fontWeight': '600',
  'marginBottom': 8
},
  style42: {
  'color': '#D1D5DB',
  'textAlign': 'center',
  'marginBottom': 24
},
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  publicBadge: {
    backgroundColor: '#059669',
  },
  premiumBadge: {
    backgroundColor: '#7C3AED',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  publicText: {
    color: '#FFFFFF',
  },
  premiumText: {
    color: '#FFFFFF',
  },
  uploadTypeCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  uploadTypeCardUnselected: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  uploadSection: {
    marginTop: 24,
  },
  uploadFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  uploadDescriptionInput: {
    height: 96,
    textAlignVertical: 'top',
  },
  uploadVisibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  uploadVisibilityLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  uploadVisibilityValue: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  visibilityToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  visibilityToggleText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FEE2E2',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
});
