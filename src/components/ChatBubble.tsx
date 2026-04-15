import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
  onReplay?: (text: string) => void;
}

export function ChatBubble({ message, onReplay }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
      {!isUser && onReplay ? (
        <Pressable
          style={({ pressed }) => [styles.replayButton, pressed ? styles.replayButtonPressed : null]}
          onPress={() => onReplay(message.content)}
          accessibilityRole="button"
          accessibilityLabel="Replay assistant message"
        >
          <MaterialIcons name="play-arrow" size={16} color={Colors.primary} />
          <Text style={styles.replayText}>Replay</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.assistantBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: Colors.textLight,
  },
  assistantText: {
    color: Colors.text,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
  },
  replayButtonPressed: {
    opacity: 0.8,
  },
  replayText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
});
