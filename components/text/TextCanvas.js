import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * TextCanvas - Serbest Konumlandırılabilir Metin Katmanı
 * Kullanıcı "Klavye" modundayken sayfanın herhangi bir yerine dokunarak
 * şeffaf metin kutuları (TextInput) açabilir ve doğrudan şablonun üzerine yazı yazabilir.
 */
export default function TextCanvas({
  isTextMode = false,
  textBlocks = [],
  onTextBlocksChange,
  activeColor = '#4E342E',
  activeFontSize = 15,
}) {
  const [editingId, setEditingId] = useState(null);
  const inputRefs = useRef({});

  // Sayfaya dokunulduğunda yeni metin kutusu oluştur
  const handleCanvasPress = (evt) => {
    if (!isTextMode) return;

    // Dokunulan koordinatlar
    const { locationX, locationY } = evt.nativeEvent;

    // Yeni metin bloğu
    const newId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBlock = {
      id: newId,
      x: Math.max(10, Math.round(locationX)),
      y: Math.max(10, Math.round(locationY - 15)), // İmleci dokunulan yerin biraz üstüne hizala
      text: '',
      color: activeColor,
      fontSize: activeFontSize,
    };

    const updated = [...textBlocks, newBlock];
    onTextBlocksChange(updated);
    setEditingId(newId);
  };

  // Metin içeriğini güncelle
  const handleTextChange = (id, newText) => {
    const updated = textBlocks.map((b) =>
      b.id === id ? { ...b, text: newText } : b
    );
    onTextBlocksChange(updated);
  };

  // Odak kaybedildiğinde boşsa sil
  const handleBlur = (id) => {
    setEditingId(null);
    const block = textBlocks.find((b) => b.id === id);
    if (block && !block.text.trim()) {
      handleDeleteBlock(id);
    }
  };

  // Metin kutusunu sil
  const handleDeleteBlock = (id) => {
    const updated = textBlocks.filter((b) => b.id !== id);
    onTextBlocksChange(updated);
    if (editingId === id) setEditingId(null);
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Klavye modu açıkken yeni kutu eklemek için tıklama alanı */}
      {isTextMode && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleCanvasPress}
        />
      )}

      {/* Mevcut Metin Blokları */}
      {textBlocks.map((block) => {
        const isEditing = editingId === block.id;

        return (
          <View
            key={block.id}
            style={[
              styles.blockContainer,
              { left: block.x, top: block.y },
              isEditing && styles.blockEditing,
            ]}
          >
            {isEditing ? (
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[block.id] = ref;
                  }}
                  value={block.text}
                  onChangeText={(txt) => handleTextChange(block.id, txt)}
                  onBlur={() => handleBlur(block.id)}
                  autoFocus
                  multiline
                  placeholder="Notunu yaz..."
                  placeholderTextColor={block.color + '55'}
                  style={[
                    styles.textInput,
                    {
                      color: block.color || activeColor,
                      fontSize: block.fontSize || activeFontSize,
                    },
                  ]}
                />
                {/* Sil Butonu */}
                <TouchableOpacity
                  onPress={() => handleDeleteBlock(block.id)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close-circle" size={18} color="#E91E63" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setEditingId(block.id);
                }}
                style={styles.viewBlock}
              >
                <Text
                  style={[
                    styles.savedText,
                    {
                      color: block.color || activeColor,
                      fontSize: block.fontSize || activeFontSize,
                    },
                  ]}
                >
                  {block.text}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blockContainer: {
    position: 'absolute',
    minWidth: 90,
    maxWidth: '85%',
    zIndex: 30,
  },
  blockEditing: {
    zIndex: 50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E91E6388',
    backgroundColor: '#FFFFFFEE',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  textInput: {
    flex: 1,
    padding: 2,
    margin: 0,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
  },
  deleteBtn: {
    padding: 2,
    alignSelf: 'flex-start',
  },
  viewBlock: {
    padding: 2,
    backgroundColor: 'transparent',
  },
  savedText: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
  },
});
