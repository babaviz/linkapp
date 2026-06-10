/**
 * ChatScreen
 * 
 * Main chat screen that displays the user's chat conversations.
 * This screen uses the ChatChannelList component and handles navigation
 * to individual chat channels.
 */

import React, { useCallback } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel } from 'stream-chat';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatChannelList } from '../components/chat';
import { useStreamChat } from '../hooks/useStreamChat';
import { navigateToMainTab } from '../navigation/mainTabNavigation';

// Navigation types (you may need to adjust based on your navigation setup)
type ChatNavigationProp = StackNavigationProp<any, 'Chat'>;
type ChatRouteProp = RouteProp<any, 'Chat'>;

interface Props {
  navigation: ChatNavigationProp;
  route: ChatRouteProp;
}

export default function ChatScreen({ navigation }: Props) {
  const {
    // Keep `isConnecting` available if we want to show subtle UI,
    // but don't block rendering the cached/snapshotted channel list.
    isConnecting
  } = useStreamChat();

  /**
   * Handle channel press - navigate to individual chat
   */
  const handleChannelPress = useCallback((channel: Channel) => {

    navigation.navigate('ChatChannel', {
      channelCid: channel.cid,
      channel: channel,
      channelName: (channel.data as any)?.name || 'Chat'
    });
  }, [navigation]);

  const handleChannelPressByCid = useCallback(
    (channelCid: string, channelName?: string) => {
      navigation.navigate('ChatChannel', {
        channelCid,
        channelName: channelName || 'Chat',
      });
    },
    [navigation]
  );

  /**
   * Handle new chat press - show options for starting new chat
   */
  const handleNewChatPress = useCallback(() => {
    Alert.alert(
      'Start New Chat',
      'Choose how to start a new conversation',
      [
        {
          text: 'Browse Properties',
          onPress: () => navigateToMainTab(navigation as any, 'PropertyHub')
        },
        {
          text: 'Browse Jobs',
          onPress: () => navigateToMainTab(navigation as any, 'JobsMain')
        },
        {
          text: 'Browse Services',
          onPress: () => navigateToMainTab(navigation as any, 'ServicesMain')
        },
        {
          text: 'Date Mi',
          onPress: () => navigateToMainTab(navigation as any, 'DateMiMain')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }, [navigation]);

  // If not connected and not connecting, we might not have a Stream client
  // In this case, we'll just show the ChatChannelList which handles the connection state
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ChatChannelList
        onChannelPress={handleChannelPress}
        onChannelPressByCid={handleChannelPressByCid}
        onNewChatPress={handleNewChatPress}
        maxChannels={100}
        showSearch={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
