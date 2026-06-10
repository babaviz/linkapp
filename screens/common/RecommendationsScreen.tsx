import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Image,
  Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { recommendationService, RecommendationItem } from '../../services/recommendationService';
import Material3Card from '../../components/common/Material3Card';
import Material3Button from '../../components/common/Material3Button';
import { navigateToMainTab } from '../../navigation/mainTabNavigation';

const { width: screenWidth } = Dimensions.get('window');

interface RecommendationsScreenProps {
  navigation: any;
}

export default function RecommendationsScreen({ navigation }: RecommendationsScreenProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [recommendations, setRecommendations] = useState<{
    trending: RecommendationItem[];
    personalized: RecommendationItem[];
    recent: RecommendationItem[];
  }>({ trending: [], personalized: [], recent: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'property' | 'job' | 'service'>('all');

  useEffect(() => {
    loadRecommendations();
  }, [selectedCategory]);

  const loadRecommendations = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      if (selectedCategory === 'all') {
        const homeRecommendations = await recommendationService.getHomeScreenRecommendations(user.id);
        setRecommendations(homeRecommendations);
      } else {
        const personalized = await recommendationService.getPersonalizedRecommendations({
          maxResults: 10,
          includeTypes: [selectedCategory],
          userId: user.id,
          excludeViewed: true
        });
        
        const trending = await recommendationService.getTrendingRecommendations(selectedCategory, 5);
        
        setRecommendations({
          trending,
          personalized,
          recent: []
        });
      }
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const handleItemPress = async (item: RecommendationItem) => {
    if (!user?.id) return;
    // Record interaction
    await recommendationService.recordInteraction(user.id, item, 'view');

    // Navigate to appropriate screen
    switch (item.type) {
      case 'property':
        navigation.navigate('PropertyDetails', { propertyId: item.id });
        break;
      case 'job':
        navigation.navigate('JobDetails', { jobId: item.id });
        break;
      case 'service':
        navigation.navigate('ServiceDetails', { serviceId: item.id });
        break;
      case 'profile':
        // `DateMi` isn't always in the active navigator tree; `ProfileView` exists in root stack.
        navigation.navigate('ProfileView', { profileId: item.id });
        break;
    }
  };

  const renderRecommendationCard = ({ item }: { item: RecommendationItem }) => (
    <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.style1}>
      <Material3Card style={styles.style2}>
        <View style={styles.style3}>
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.style4}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.style5}>
            <View style={styles.style6}>
              <View style={styles.style7}>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: 
                    item.type === 'property' ? '#DBEAFE' :
                    item.type === 'job' ? '#D1FAE5' :
                    item.type === 'service' ? '#F3E8FF' :
                    '#FCE7F3' 
                  }
                ]}>
                  <Text style={[
                    styles.typeBadgeText,
                    { color:
                      item.type === 'property' ? '#1D4ED8' :
                      item.type === 'job' ? '#047857' :
                      item.type === 'service' ? '#7C3AED' :
                      '#BE185D'
                    }
                  ]}>
                    {item.type.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.style7}>
                  <Ionicons name="star" size={12} color="#EAB308" />
                  <Text style={styles.style8}>
                    {Math.round(item.relevanceScore)}% match
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.style9} numberOfLines={2}>
              {item.title}
            </Text>
            
            <Text style={styles.style10} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.style11}>
              <View>
                {item.price && (
                  <Text style={styles.style12}>
                    KES {item.price.toLocaleString()}
                  </Text>
                )}
                {item.location && (
                  <View style={styles.style13}>
                    <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.style8}>{item.location}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.style14}>
                <Text style={styles.style15}>
                  {item.reason}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Material3Card>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.style16}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      {[
        { key: 'all', label: 'All', icon: 'apps' },
        { key: 'property', label: 'Property', icon: 'home' },
        { key: 'job', label: 'Jobs', icon: 'briefcase' },
        { key: 'service', label: 'Services', icon: 'construct' },
      ].map((category) => (
        <TouchableOpacity
          key={category.key}
          onPress={() => setSelectedCategory(category.key as any)}
          style={[
            styles.categoryButton,
            selectedCategory === category.key 
              ? styles.categoryButtonActive 
              : styles.categoryButtonInactive
          ]}
        >
          <Ionicons 
            name={category.icon as any} 
            size={16} 
            color={selectedCategory === category.key ? '#6B46C1' : 'white'} 
          />
          <Text style={[
            styles.categoryButtonText,
            { color: selectedCategory === category.key ? '#6B46C1' : 'white' }
          ]}>
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSection = (title: string, data: RecommendationItem[], emptyText: string) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.style17}>
        <View style={styles.style18}>
          <Text style={styles.style19}>{title}</Text>
          {data.length > 3 && (
            <TouchableOpacity>
              <Text style={styles.style20}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderRecommendationCard}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.style21}>
      <View style={styles.style22}>
        <Ionicons name="bulb-outline" size={64} color="white" />
      </View>
      
      <Text style={styles.style23}>
        Building Your Recommendations
      </Text>
      
      <Text style={styles.style24}>
        Start exploring content to help us understand your preferences. 
        The more you interact, the better our recommendations become!
      </Text>
      
      <Material3Button
        onPress={() => navigateToMainTab(navigation as any, 'PropertyHub')}
        variant="filled"
        style={{ backgroundColor: '#8B5CF6', marginBottom: 12 }}
      >
        Explore Property
      </Material3Button>
      
      <Material3Button
        onPress={() => navigateToMainTab(navigation as any, 'JobsMain')}
        variant="outlined"
        style={{ borderColor: 'white' }}
      >
        Browse Jobs
      </Material3Button>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.style25}>
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={{ flex: 1 }}
        >
          <View style={styles.style26}>
            <View style={styles.style27}>
              <Ionicons name="refresh" size={32} color="white" />
            </View>
            <Text style={styles.style28}>Loading recommendations...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const hasRecommendations = recommendations.trending.length > 0 || 
                            recommendations.personalized.length > 0 || 
                            recommendations.recent.length > 0;

  return (
    <SafeAreaView style={styles.style25}>
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.style29}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.style30}>For You</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {renderCategoryFilter()}

        {!hasRecommendations ? renderEmptyState() : (
          <ScrollView
            style={styles.style25}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="white"
              />
            }
          >
            {selectedCategory === 'all' && (
              <>
                {renderSection('Trending Now', recommendations.trending, 'No trending content')}
                {renderSection('Recommended for You', recommendations.personalized, 'No personalized recommendations')}
                {renderSection('Recently Posted', recommendations.recent, 'No recent content')}
              </>
            )}

            {selectedCategory !== 'all' && (
              <>
                {renderSection('Trending', recommendations.trending, `No trending ${selectedCategory} content`)}
                {renderSection('Recommended', recommendations.personalized, `No ${selectedCategory} recommendations`)}
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'marginRight': 16
},
  style2: {
  'width': 320
},
  style3: {
  'overflow': 'hidden'
},
  style4: {
  'width': '100%',
  'borderTopLeftRadius': 8,
  'borderTopRightRadius': 8
},
  style5: {
  'padding': 16
},
  style6: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 8
},
  style7: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style8: {
  'fontSize': 12,
  'color': '#6B7280',
  'marginLeft': 4
},
  style9: {
  'fontSize': 18,
  'fontWeight': '700',
  'color': '#111827',
  'marginBottom': 4
},
  style10: {
  'color': '#4B5563',
  'fontSize': 14,
  'marginBottom': 12
},
  style11: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between'
},
  style12: {
  'fontSize': 18,
  'fontWeight': '700',
  'color': '#111827'
},
  style13: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginTop': 4
},
  style14: {
  'backgroundColor': '#F3F4F6',
  'paddingHorizontal': 12,
  'paddingVertical': 4,
  'borderRadius': 9999
},
  style15: {
  'fontSize': 12,
  'color': '#4B5563'
},
  style16: {
  'marginBottom': 24
},
  style17: {},
  style18: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'marginBottom': 16
},
  style19: {
  'fontSize': 20,
  'fontWeight': '700',
  'color': '#FFFFFF'
},
  style20: {
  'fontWeight': '500'
},
  style21: {
  'flex': 1,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style22: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginBottom': 24
},
  style23: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF',
  'marginBottom': 16,
  'textAlign': 'center'
},
  style24: {
  'color': '#D1D5DB',
  'textAlign': 'center',
  'marginBottom': 24
},
  style25: {
  'flex': 1
},
  style26: {
  'flex': 1,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style27: {
  'width': 64,
  'height': 64,
  'backgroundColor': '#FFFFFF',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginBottom': 16
},
  style28: {
  'color': '#FFFFFF',
  'fontWeight': '500'
},
  style29: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style30: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#FFFFFF'
},
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    marginRight: 8
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500'
  },
  categoryButton: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center'
  },
  categoryButtonActive: {
    backgroundColor: 'white'
  },
  categoryButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  categoryButtonText: {
    marginLeft: 8,
    fontWeight: '500'
  }
});
