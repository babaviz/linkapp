import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { recommendationService, RecommendationItem } from '../../services/recommendationService';
import Material3Card from './Material3Card';
import RecommendationCard from './RecommendationCard';

interface RecommendationsWidgetProps {
  title?: string;
  contentType?: 'property' | 'job' | 'service' | 'profile';
  maxItems?: number;
  onSeeAll?: () => void;
  onItemPress?: (item: RecommendationItem) => void;
}

export default function RecommendationsWidget({
  title = 'Recommended for You',
  contentType,
  maxItems = 3,
  onSeeAll,
  onItemPress
}: RecommendationsWidgetProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [user?.id, contentType]);

  const loadRecommendations = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      if (contentType) {
        const result = await recommendationService.getPersonalizedRecommendations({
          maxResults: maxItems,
          includeTypes: [contentType],
          userId: user.id,
          excludeViewed: true
        });
        setRecommendations(result);
      } else {
        const result = await recommendationService.getPersonalizedRecommendations({
          maxResults: maxItems,
          includeTypes: ['property', 'job', 'service', 'profile'],
          userId: user.id,
          excludeViewed: true
        });
        setRecommendations(result);
      }
    } catch (error) {
      
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = async (item: RecommendationItem) => {
    // Record interaction
    if (user?.id) {
      await recommendationService.recordInteraction(user.id, item, 'view');
    }

    // Use custom handler if provided, otherwise default navigation
    if (onItemPress) {
      onItemPress(item);
    }
  };

  if (isLoading) {
    return (
      <View style={{
        paddingHorizontal: 16,
        marginBottom: 24
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827'
          }}>{title}</Text>
        </View>
        <Material3Card style={{
          padding: 16,
          alignItems: 'center'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons name="refresh" size={16} color="#9CA3AF" />
            <Text style={{
              color: '#9CA3AF',
              marginLeft: 8
            }}>Loading recommendations...</Text>
          </View>
        </Material3Card>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={{
        paddingHorizontal: 16,
        marginBottom: 24
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827'
          }}>{title}</Text>
        </View>
        <Material3Card style={{
          padding: 16,
          alignItems: 'center'
        }}>
          <View style={{
            width: 48,
            height: 48,
            backgroundColor: '#F3F4F6',
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <Ionicons name="bulb-outline" size={24} color="#9CA3AF" />
          </View>
          <Text style={{
            color: '#4B5563',
            textAlign: 'center'
          }}>
            Start exploring to get personalized recommendations
          </Text>
        </Material3Card>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#111827'
        }}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={{
            backgroundColor: '#DBEAFE',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 8
          }}>
            <Text style={{
              color: '#2563EB',
              fontSize: 14,
              fontWeight: '500'
            }}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={recommendations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecommendationCard
            item={item}
            onPress={() => handleItemPress(item)}
            compact={true}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}
