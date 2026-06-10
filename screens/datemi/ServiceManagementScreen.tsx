import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Switch,
  Modal,
  StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Material3Card from '../../components/common/Material3Card';
import Material3Button from '../../components/common/Material3Button';
import { useAppSelector } from '../../redux/hooks';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyHelpers';

interface CreatorService {
  id: string;
  title: string;
  description: string;
  type: 'video_call' | 'photo_content' | 'chat_session' | 'custom';
  price: number;
  duration?: number; // in minutes for video calls
  isActive: boolean;
  totalBookings: number;
  rating: number;
  previewImage?: string;
}

export default function ServiceManagementScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const userCountry = user?.location?.county;
  const [services, setServices] = useState<CreatorService[]>([
    {
      id: '1',
      title: '1-on-1 Video Call',
      description: 'Personal video chat session',
      type: 'video_call',
      price: 500,
      duration: 15,
      isActive: true,
      totalBookings: 23,
      rating: 4.8,
    },
    {
      id: '2',
      title: 'Premium Photo Access',
      description: 'Exclusive photo content',
      type: 'photo_content',
      price: 200,
      isActive: true,
      totalBookings: 67,
      rating: 4.9,
    },
    {
      id: '3',
      title: 'Private Chat Session',
      description: 'Extended messaging session',
      type: 'chat_session',
      price: 300,
      duration: 30,
      isActive: false,
      totalBookings: 12,
      rating: 4.6,
    },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<CreatorService | null>(null);

  const handleToggleService = (serviceId: string) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { ...service, isActive: !service.isActive }
        : service
    ));
  };

  const handleEditService = (service: CreatorService) => {
    setEditingService(service);
    setShowAddModal(true);
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setServices(prev => prev.filter(s => s.id !== serviceId));
          },
        },
      ]
    );
  };

  const getServiceTypeIcon = (type: CreatorService['type']) => {
    switch (type) {
      case 'video_call':
        return 'videocam';
      case 'photo_content':
        return 'images';
      case 'chat_session':
        return 'chatbubbles';
      case 'custom':
        return 'star';
      default:
        return 'diamond';
    }
  };

  const getServiceTypeColor = (type: CreatorService['type']) => {
    switch (type) {
      case 'video_call':
        return '#EF4444';
      case 'photo_content':
        return '#F59E0B';
      case 'chat_session':
        return '#10B981';
      case 'custom':
        return '#8B5CF6';
      default:
        return '#6366F1';
    }
  };

  const renderServiceCard = (service: CreatorService) => (
    <Material3Card 
      key={service.id} 
      style={[styles.style1, { backgroundColor: 'rgba(255,255,255,0.1)' }] as any}
    >
      <View style={styles.style2}>
        <View style={styles.style3}>
          <View style={styles.style4}>
            <View 
              style={[styles.style5, { backgroundColor: getServiceTypeColor(service.type) }]}
            >
              <Ionicons 
                name={getServiceTypeIcon(service.type) as any} 
                size={20} 
                color="white" 
              />
            </View>
            <View style={styles.style6}>
              <Text style={styles.style7}>{service.title}</Text>
              <Text style={styles.style8}>{service.description}</Text>
            </View>
          </View>
          
          <Switch
            value={service.isActive}
            onValueChange={() => handleToggleService(service.id)}
            thumbColor={service.isActive ? '#8B5CF6' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#8B5CF6' }}
          />
        </View>

        <View style={styles.style9}>
          <View style={styles.style6}>
            <Text style={styles.style8}>Price</Text>
            <Text style={styles.style10}>
              {formatCurrency(service.price, userCountry)}
              {service.duration && ` / ${service.duration}min`}
            </Text>
          </View>
          
          <View style={styles.style11}>
            <Text style={styles.style8}>Bookings</Text>
            <Text style={styles.style10}>{service.totalBookings}</Text>
          </View>
          
          <View style={styles.style12}>
            <Text style={styles.style8}>Rating</Text>
            <View style={styles.style13}>
              <Ionicons name="star" size={16} color="#EAB308" />
              <Text style={styles.style14}>{service.rating}</Text>
            </View>
          </View>
        </View>

        <View style={styles.style15}>
          <Material3Button
            onPress={() => handleEditService(service)}
            variant="outlined"
            style={{ flex: 1 }}
            textStyle={{ color: 'white' }}
          >
            Edit
          </Material3Button>
          <Material3Button
            onPress={() => handleDeleteService(service.id)}
            variant="outlined"
            style={{ flex: 1 }}
            textStyle={{ color: '#EF4444' }}
          >
            Delete
          </Material3Button>
        </View>
      </View>
    </Material3Card>
  );

  const renderAddServiceModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <SafeAreaView style={styles.style16}>
        <View style={styles.style17}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.style18}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.style19}>
            {editingService ? 'Edit Service' : 'Add Service'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.style20}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.style21}>
          <View style={styles.style22}>
            <Text style={styles.style23}>Service Details</Text>
            
            <View style={styles.style1}>
              <Text style={styles.style24}>Service Title</Text>
              <TextInput
                style={styles.style25}
                placeholder="e.g., 1-on-1 Video Call"
                defaultValue={editingService?.title}
              />
            </View>

            <View style={styles.style1}>
              <Text style={styles.style24}>Description</Text>
              <TextInput
                style={styles.style25}
                placeholder="Describe your service"
                multiline
                numberOfLines={3}
                defaultValue={editingService?.description}
              />
            </View>

            <View style={styles.style1}>
              <Text style={styles.style24}>Service Type</Text>
              <View style={styles.style26}>
                {[
                  { type: 'video_call', label: 'Video Call', icon: 'videocam' },
                  { type: 'photo_content', label: 'Photo Content', icon: 'images' },
                  { type: 'chat_session', label: 'Chat Session', icon: 'chatbubbles' },
                  { type: 'custom', label: 'Custom', icon: 'star' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.serviceTypeOption,
                      editingService?.type === option.type 
                        ? styles.serviceTypeOptionActive 
                        : styles.serviceTypeOptionInactive
                    ]}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={editingService?.type === option.type ? '#6366F1' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.serviceTypeOptionText,
                      editingService?.type === option.type 
                        ? styles.serviceTypeOptionTextActive 
                        : styles.serviceTypeOptionTextInactive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.style27}>
              <View style={styles.style6}>
                <Text style={styles.style24}>Price ({getCurrencySymbol(userCountry)})</Text>
                <TextInput
                  style={styles.style25}
                  placeholder="500"
                  keyboardType="numeric"
                  defaultValue={editingService?.price.toString()}
                />
              </View>
              
              <View style={styles.style6}>
                <Text style={styles.style24}>Duration (minutes)</Text>
                <TextInput
                  style={styles.style25}
                  placeholder="15"
                  keyboardType="numeric"
                  defaultValue={editingService?.duration?.toString()}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.style16}>
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <View style={styles.style28}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.style29}>My Services</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.style30}>
        <View style={styles.style22}>
          <Material3Card style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <View style={styles.style2}>
              <Text style={styles.style31}>Service Performance</Text>
              
              <View style={styles.style32}>
                <View style={styles.style11}>
                  <Text style={styles.style33}>{services.length}</Text>
                  <Text style={styles.style8}>Active Services</Text>
                </View>
                <View style={styles.style11}>
                  <Text style={styles.style33}>
                    {services.reduce((sum, s) => sum + s.totalBookings, 0)}
                  </Text>
                  <Text style={styles.style8}>Total Bookings</Text>
                </View>
                <View style={styles.style11}>
                  <Text style={styles.style33}>
                    {(services.reduce((sum, s) => sum + s.rating, 0) / services.length).toFixed(1)}
                  </Text>
                  <Text style={styles.style8}>Avg Rating</Text>
                </View>
              </View>
            </View>
          </Material3Card>
        </View>

        <View style={styles.style1}>
          <View style={styles.style34}>
            <Text style={styles.style35}>My Services</Text>
            <TouchableOpacity 
              onPress={() => setShowAddModal(true)}
              style={styles.style13}
            >
              <Ionicons name="add" size={20} color="#8B5CF6" />
              <Text style={styles.style36}>Add Service</Text>
            </TouchableOpacity>
          </View>

          {services.map(service => renderServiceCard(service))}
        </View>

        {services.length === 0 && (
          <View style={styles.style37}>
            <View style={styles.style38}>
              <Ionicons name="diamond-outline" size={40} color="white" />
            </View>
            <Text style={styles.style39}>No Services Yet</Text>
            <Text style={styles.style40}>
              Create your first service to start earning
            </Text>
            <Material3Button
              onPress={() => setShowAddModal(true)}
              variant="filled"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              Create Service
            </Material3Button>
          </View>
        )}
      </ScrollView>

      {renderAddServiceModal()}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'marginBottom': 16
},
  style2: {
  'padding': 16
},
  style3: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 12
},
  style4: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'flex': 1
},
  style5: {
  'width': 40,
  'height': 40,
  'borderRadius': 8,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginRight': 12
},
  style6: {
  'flex': 1
},
  style7: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'fontSize': 18
},
  style8: {
  'color': '#D1D5DB',
  'fontSize': 14
},
  style9: {
  'flexDirection': 'row',
  'justifyContent': 'space-between',
  'alignItems': 'center',
  'marginBottom': 16
},
  style10: {
  'color': '#FFFFFF',
  'fontWeight': '700',
  'fontSize': 18
},
  style11: {
  'flex': 1,
  'alignItems': 'center'
},
  style12: {
  'flex': 1,
  'alignItems': 'flex-end'
},
  style13: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style14: {
  'color': '#FFFFFF',
  'fontWeight': '700',
  'fontSize': 18,
  'marginLeft': 4
},
  style15: {
  'flexDirection': 'row',
  'gap': 8
},
  style16: {
  'flex': 1,
  'backgroundColor': '#FFFFFF'
},
  style17: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 12,
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style18: {
  'fontSize': 18
},
  style19: {
  'fontSize': 20,
  'fontWeight': '600'
},
  style20: {
  'fontSize': 18,
  'fontWeight': '600'
},
  style21: {
  'flex': 1,
  'paddingHorizontal': 16,
  'paddingVertical': 24
},
  style22: {
  'marginBottom': 24
},
  style23: {
  'fontSize': 18,
  'fontWeight': '600',
  'marginBottom': 16
},
  style24: {
  'color': '#374151',
  'fontWeight': '500',
  'marginBottom': 8
},
  style25: {
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'borderRadius': 8,
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style26: {
  'flexDirection': 'row',
  'gap': 8
},
  style27: {
  'flexDirection': 'row',
  'gap': 16,
  'marginBottom': 16
},
  style28: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style29: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#FFFFFF'
},
  style30: {
  'flex': 1,
  'paddingHorizontal': 16,
  'paddingVertical': 16
},
  style31: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'fontSize': 18,
  'marginBottom': 12
},
  style32: {
  'flexDirection': 'row',
  'justifyContent': 'space-between'
},
  style33: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF'
},
  style34: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 16
},
  style35: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#FFFFFF'
},
  style36: {
  'marginLeft': 4
},
  style37: {
  'alignItems': 'center'
},
  style38: {
  'width': 80,
  'height': 80,
  'backgroundColor': '#F3E8FF',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginBottom': 16
},
  style39: {
  'color': '#FFFFFF',
  'fontSize': 18,
  'fontWeight': '600',
  'marginBottom': 8
},
  style40: {
  'color': '#D1D5DB',
  'textAlign': 'center',
  'marginBottom': 24
},
  serviceTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  serviceTypeOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF'
  },
  serviceTypeOptionInactive: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF'
  },
  serviceTypeOptionText: {
    marginLeft: 8
  },
  serviceTypeOptionTextActive: {
    color: '#4F46E5',
    fontWeight: '600'
  },
  serviceTypeOptionTextInactive: {
    color: '#374151'
  }
});
