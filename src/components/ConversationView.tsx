import React, { useRef, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { ChatBubble } from './ChatBubble';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { Message } from '../types';

interface ConversationViewProps {
  messages: Message[];
}

export function ConversationView({ messages }: ConversationViewProps) {
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
        <Text style={styles.cardHeader}>{Strings.conversationHeader}</Text>
        <Text style={styles.cardSubheader}>{Strings.conversationSubheader}</Text>
        <View style={styles.emptyContent}>
          <View style={styles.chatIconContainer}>
            <Text style={styles.chatIcon}>💬</Text>
          </View>
          <Text style={styles.tapText}>{Strings.tapMicStart}</Text>
          <Text style={styles.messagesText}>{Strings.messagesWillAppear}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>{Strings.conversationHeader}</Text>
      <Text style={styles.cardSubheader}>{Strings.conversationSubheader}</Text>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
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
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardSubheader: {
    fontSize: 12,
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
    fontSize: 24,
  },
  tapText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  messagesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
  },
});
