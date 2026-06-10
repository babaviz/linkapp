import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView,
  FlatList, 
  TouchableOpacity, 
  Alert,
  StatusBar,
  ActivityIndicator,
  Image,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Material3Card from '../../components/common/Material3Card';
import Material3Button from '../../components/common/Material3Button';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { DateMiProfileService } from '../../services/dateMiService';
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { getUserFacingError } from '../../utils/userFacingError';

type BlockedUsersScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function BlockedUsersScreen() {
  const navigation = useNavigation<BlockedUsersScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const [blockedUsers, setBlockedUsers] = useState<DateMiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const users = await DateMiProfileService.getBlockedProfiles(user.id);
      setBlockedUsers(users);
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'load blocked users',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBlockedUsers();
  };

  const handleUnblock = async (profile: DateMiProfile) => {
    if (!user?.id) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${profile.displayName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblockingId(profile.id);
            try {
              const success = await DateMiProfileService.unblockProfile(user.id, profile.id);
              if (success) {
                setBlockedUsers(prev => prev.filter(u => u.id !== profile.id));
                Alert.alert('Success', `${profile.displayName} has been unblocked`);
              } else {
                const friendly = getUserFacingError(new Error('Unblock failed'), {
                  action: 'unblock this user',
                  displayStyle: 'alert',
                });
                Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
              }
            } catch (error) {
              const friendly = getUserFacingError(error, {
                action: 'unblock this user',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            } finally {
              setUnblockingId(null);
            }
          }
        }
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: DateMiProfile }) => {
    const isUnblocking = unblockingId === item.id;
    const profilePicture = item.profilePictures?.[0];

    return (
      <Material3Card style={{ marginBottom: 12 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            overflow: 'hidden'
          }}>
            {profilePicture ? (
              <Image
                source={{ uri: profilePicture }}
                style={{ width: 60, height: 60 }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="person" size={32} color="#6B7280" />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#111827',
              marginBottom: 4
            }}>
              {item.displayName}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280'
            }}>
              {item.age ? `${item.age} years old` : 'Age not specified'}
              {item.location ? ` • ${item.location}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleUnblock(item)}
            disabled={isUnblocking}
            style={{
              backgroundColor: isUnblocking ? '#E5E7EB' : '#EF4444',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            {isUnblocking ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <>
                <MaterialIcons name="block" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14
                }}>
                  Unblock
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Material3Card>
    );
  };

  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingTop: 80
    }}>
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24
      }}>
        <MaterialIcons name="block" size={60} color="#9CA3AF" />
      </View>
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 12
      }}>
        No Blocked Users
      </Text>
      <Text style={{
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24
      }}>
        You haven't blocked anyone yet. When you block someone, they'll appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#6B46C1', '#553C9A']}
        style={{ paddingBottom: 20 }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 10,
          paddingBottom: 10
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#FFFFFF'
            }}>
              Blocked Users
            </Text>
            <Text style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              marginTop: 2
            }}>
              {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
            </Text>
          </View>
          
          <MaterialIcons name="block" size={24} color="#FFFFFF" />
        </View>
      </LinearGradient>

      {loading ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 40,
            backgroundColor: '#F9FAFB',
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            Loading blocked users…
          </Text>

          {Array.from({ length: 8 }).map((_, index) => (
            <Material3Card key={`blocked-skeleton-${index}`} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <SkeletonLoader width={48} height={48} borderRadius={24} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <SkeletonLoader width="60%" height={16} style={{ marginBottom: 6 }} />
                  <SkeletonLoader width="40%" height={12} />
                </View>
                <SkeletonLoader width={88} height={32} borderRadius={16} />
              </View>
            </Material3Card>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 40,
            flexGrow: 1,
            backgroundColor: '#F9FAFB'
          }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6B46C1']}
              tintColor="#6B46C1"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {blockedUsers.length > 0 && (
        <View style={{
          padding: 20,
          backgroundColor: '#F9FAFB',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB'
        }}>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 20
          }}>
            Blocked users won't be able to see your profile, send you messages, or match with you.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
