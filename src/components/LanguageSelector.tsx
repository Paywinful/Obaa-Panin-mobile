import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { Typography } from '../constants/typography';
import { LanguageCode } from '../types';

interface LanguageOption {
  code: LanguageCode;
  label: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'twi', label: 'Twi — Twi' },
  { code: 'en', label: 'English — English' },
];

interface LanguageSelectorProps {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (code: LanguageCode) => void;
}

export function LanguageSelector({ selectedLanguage, onSelectLanguage }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{Strings.languageLabel}</Text>
      <Pressable style={styles.selector} onPress={() => setOpen(true)}>
        <Text style={styles.selectorText}>{selected.label}</Text>
        <Text style={styles.chevron}>&#x2304;</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <FlatList
              data={LANGUAGES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.option,
                    item.code === selectedLanguage && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelectLanguage(item.code);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.code === selectedLanguage && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...Typography.label,
    color: Colors.primary,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  selectorText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  chevron: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: Colors.statusPill,
  },
  optionText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
