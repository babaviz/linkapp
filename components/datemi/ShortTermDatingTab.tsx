// components/datemi/ShortTermDatingTab.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { ProfileGridSkeleton } from './ProfileCardSkeleton';

interface ShortTermDatingTabProps {
  profiles: DateMiProfile[];
  isLoading: boolean;
  error: string | null;
  isSearching: boolean;
  searchTerm: string;
  onSearchChange: (text: string) => void;
  onSearchDone: () => void;
  onProfilePress: (profileId: string) => void;
  onRefresh: () => void;
  profileLoading: boolean;
  profileError: string | null;
  onRetryProfile: () => void;
}

const ProfileCard = React.memo(({ profile, onPress }: { profile: DateMiProfile; onPress: (id: string) => void }) => (
  <TouchableOpacity style={styles.profileCard} onPress={() => onPress(profile.id)} activeOpacity={0.9}>
    <View style={styles.profileImageContainer}>
      {profile.profilePictures?.[0] ? (
        <Image source={{ uri: profile.profilePictures[0] }} style={styles.profileImage} resizeMode="cover" />
      ) : (
        <View style={[styles.profileImage, styles.placeholderImage]}>
          <Text style={styles.placeholderIcon}>👤</Text>
        </View>
      )}
      
      {profile.verified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedIcon}>✓</Text>
        </View>
      )}
      
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.profileOverlay}>
        <Text style={styles.profileName}>{profile.displayName}{profile.age && `, ${profile.age}`}</Text>
        {profile.location && <Text style={styles.profileLocation}>📍 {profile.location}</Text>}
      </LinearGradient>
    </View>
  </TouchableOpacity>
));

export const ShortTermDatingTab: React.FC<ShortTermDatingTabProps> = ({
  profiles,
  isLoading,
  error,
  isSearching,
  searchTerm,
  onSearchChange,
  onSearchDone,
  onProfilePress,
  onRefresh,
  profileLoading,
  profileError,
  onRetryProfile,
}) => {
  const renderProfileCard = ({ item }: { item: DateMiProfile }) => (
    <ProfileCard profile={item} onPress={onProfilePress} />
  );

  return (
    <FlatList
      data={profiles}
      keyExtractor={(item) => item.id}
      numColumns={2}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      removeClippedSubviews
      windowSize={7}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      refreshing={false}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <>
          {profileLoading && (
            <View style={styles.profileErrorBanner}>
              <Text style={styles.profileErrorTitle}>Preparing your profile…</Text>
              <Text style={styles.profileErrorText}>You can start browsing while we finish loading.</Text>
            </View>
          )}

          {isSearching && (
            <View style={styles.searchContainer}>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    value={searchTerm}
                    onChangeText={onSearchChange}
                    placeholder="Search profiles..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                </View>
                <TouchableOpacity onPress={onSearchDone} style={styles.searchDoneButton} activeOpacity={0.85}>
                  <Text style={styles.searchDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {profileError && !profileLoading && (
            <View style={styles.profileErrorBanner}>
              <Text style={styles.profileErrorTitle}>Profile loading issue</Text>
              <Text style={styles.profileErrorText}>{profileError}</Text>
              <TouchableOpacity onPress={onRetryProfile} style={styles.profileErrorButton} activeOpacity={0.85}>
                <Text style={styles.profileErrorButtonText}>Retry profile load</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      }
      renderItem={renderProfileCard}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.profilesContainer}>
            <ProfileGridSkeleton count={6} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⚠️</Text>
            <Text style={styles.emptyStateTitle}>Couldn't load profiles</Text>
            <Text style={styles.emptyStateText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton} activeOpacity={0.9}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎉</Text>
            <Text style={styles.emptyStateTitle}>No profiles found</Text>
            <Text style={styles.emptyStateText}>Try checking back later for new profiles.</Text>
          </View>
        )
      }
      columnWrapperStyle={profiles.length > 0 ? styles.profileRow : undefined}
    />
  );
};

const { width: screenWidth } = Dimensions.get('window');
const GRID_SIDE_PADDING = 20;
const GRID_COLUMN_GAP = 8;
const cardWidth = (screenWidth - GRID_SIDE_PADDING * 2 - GRID_COLUMN_GAP) / 2;

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  searchContainer: { paddingHorizontal: 20, marginBottom: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchIcon: { fontSize: 16, marginRight: 10, opacity: 0.9 },
  searchInput: { color: '#FFFFFF', fontSize: 14, flex: 1, paddingVertical: 0 },
  searchDoneButton: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  searchDoneText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  profileErrorBanner: { marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  profileErrorTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  profileErrorText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  profileErrorButton: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  profileErrorButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  profilesContainer: { paddingHorizontal: 20, paddingBottom: 12 },
  profileRow: { paddingHorizontal: 20, justifyContent: 'space-between' },
  profileCard: { width: cardWidth, marginBottom: 6 },
  profileImageContainer: { position: 'relative', aspectRatio: 3/4, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  profileImage: { width: '100%', height: '100%' },
  placeholderImage: { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 40, opacity: 0.3 },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#3B82F6', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  verifiedIcon: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  profileOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingVertical: 12 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  profileLocation: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyStateIcon: { fontSize: 60, opacity: 0.3, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  emptyStateText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  retryButton: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});