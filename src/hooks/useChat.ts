import { useState, useCallback, useRef } from 'react';
import { Message, AppPhase } from '../types';
import { sendChatMessage } from '../services/chatApi';
import { Strings } from '../constants/strings';

interface UseChatReturn {
  messages: Message[];
  phase: AppPhase;
  sendMessage: (text: string) => Promise<string>;
  setPhase: (phase: AppPhase) => void;
}

let messageIdCounter = 0;
function createMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    id: `msg_${Date.now()}_${++messageIdCounter}`,
    role,
    content,
    timestamp: Date.now(),
  };
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<AppPhase>('idle');
  const messagesRef = useRef<Message[]>([]);

  const sendMessage = useCallback(async (text: string): Promise<string> => {
    if (!text.trim()) {
      return Strings.emptyTranscript;
    }

    const userMessage = createMessage('user', text.trim());
    const updatedMessages = [...messagesRef.current, userMessage];
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);
    setPhase('processing');

    try {
      const response = await sendChatMessage(updatedMessages);

      if (response.error) {
        const errorMessage = createMessage('assistant', Strings.networkError);
        const withError = [...updatedMessages, errorMessage];
        messagesRef.current = withError;
        setMessages(withError);
        return Strings.networkError;
      }

      const assistantMessage = createMessage('assistant', response.content);
      const withResponse = [...updatedMessages, assistantMessage];
      messagesRef.current = withResponse;
      setMessages(withResponse);
      return response.content;
    } catch {
      const errorMessage = createMessage('assistant', Strings.networkError);
      const withError = [...updatedMessages, errorMessage];
      messagesRef.current = withError;
      setMessages(withError);
      return Strings.networkError;
    }
  }, []);

  return { messages, phase, sendMessage, setPhase };
}
