import React, { useRef, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChatBubble } from './ChatBubble';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { Typography } from '../constants/typography';
import { Message } from '../types';

interface ConversationViewProps {
  messages: Message[];
  onReplayMessage?: (text: string) => void;
  onClearConversation?: () => void;
}

export function ConversationView({ messages, onReplayMessage, onClearConversation }: ConversationViewProps) {
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardHeader}>{Strings.conversationHeader}</Text>
        </View>
        <Text style={styles.cardSubheader}>{Strings.conversationSubheader}</Text>
        <View style={styles.emptyContent}>
          <View style={styles.chatIconContainer}>
            <Text style={styles.chatIcon}>...</Text>
          </View>
          <Text style={styles.tapText}>{Strings.tapMicStart}</Text>
          <Text style={styles.messagesText}>{Strings.messagesWillAppear}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardHeader}>{Strings.conversationHeader}</Text>
        {onClearConversation ? (
          <Pressable
            style={({ pressed }) => [styles.clearButton, pressed ? styles.clearButtonPressed : null]}
            onPress={onClearConversation}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation"
          >
            <MaterialIcons name="delete-outline" size={16} color={Colors.primary} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.cardSubheader}>{Strings.conversationSubheader}</Text>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} onReplay={onReplayMessage} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.frostedCard,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    ...Typography.title,
    fontSize: 16,
    color: Colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubheader: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  chatIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  tapText: {
    ...Typography.body,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  messagesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
  },
  clearButtonPressed: {
    opacity: 0.82,
  },
  clearText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
});
