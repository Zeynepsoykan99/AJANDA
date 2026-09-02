import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  PanResponder,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DraggableTextBlock = ({
  block,
  activeColor,
  activeFontSize,
  isEditing,
  onEdit,
  onChange,
  onBlur,
  onDelete,
  onMoveEnd,
}) => {
  const [pos, setPos] = useState({ x: block.x, y: block.y });

  useEffect(() => {
    setPos({ x: block.x, y: block.y });
  }, [block.x, block.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditing,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !isEditing && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onPanResponderGrant: () => {
        // Drag başladı
      },
      onPanResponderMove: (_, gestureState) => {
        setPos({
          x: block.x + gestureState.dx,
          y: block.y + gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
          // Tap algılandı
          onEdit(block.id);
        } else {
          // Drag bitti, kaydet
          onMoveEnd(block.id, block.x + gestureState.dx, block.y + gestureState.dy);
        }
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.blockContainer,
        { left: pos.x, top: pos.y },
        isEditing && styles.blockEditing,
      ]}
      {...(!isEditing ? panResponder.panHandlers : {})}
    >
      {isEditing ? (
        <View style={styles.inputWrapper}>
          <TextInput
            value={block.text}
            onChangeText={(txt) => onChange(block.id, txt)}
            onBlur={() => onBlur(block.id)}
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
          <TouchableOpacity
            onPress={() => onDelete(block.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color="#E91E63" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.viewBlock}>
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
        </View>
      )}
    </View>
  );
};

/**
 * TextCanvas - Serbest Konumlandırılabilir ve Sürüklenebilir Metin Katmanı
 * Kullanıcı "Klavye" modundayken sayfanın herhangi bir yerine dokunarak
 * şeffaf metin kutuları (TextInput) açabilir ve bunları sürükleyebilir.
 */
export default function TextCanvas({
  isTextMode = false,
  textBlocks = [],
  onTextBlocksChange,
  activeColor = '#4E342E',
  activeFontSize = 15,
}) {
  const [editingId, setEditingId] = useState(null);

  // Sayfaya dokunulduğunda yeni metin kutusu oluştur
  const handleCanvasPress = (evt) => {
    if (!isTextMode) return;

    // Eğer zaten bir şey düzenleniyorsa ve dışarı tıklandıysa, düzenlemeyi bitir.
    if (editingId) {
      setEditingId(null);
      return;
    }

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

  const handleTextChange = (id, newText) => {
    const updated = textBlocks.map((b) =>
      b.id === id ? { ...b, text: newText } : b
    );
    onTextBlocksChange(updated);
  };

  const handleMoveEnd = (id, newX, newY) => {
    const updated = textBlocks.map((b) =>
      b.id === id ? { ...b, x: newX, y: newY } : b
    );
    onTextBlocksChange(updated);
  };

  const handleBlur = (id) => {
    setEditingId(null);
    const block = textBlocks.find((b) => b.id === id);
    if (block && !block.text.trim()) {
      handleDeleteBlock(id);
    }
  };

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
      {textBlocks.map((block) => (
        <DraggableTextBlock
          key={block.id}
          block={block}
          activeColor={activeColor}
          activeFontSize={activeFontSize}
          isEditing={editingId === block.id}
          onEdit={setEditingId}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onDelete={handleDeleteBlock}
          onMoveEnd={handleMoveEnd}
        />
      ))}
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
