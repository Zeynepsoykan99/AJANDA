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
  onResizeEnd,
}) => {
  const [pos, setPos] = useState({ x: block.x, y: block.y });
  const [boxWidth, setBoxWidth] = useState(block.width || 120);

  useEffect(() => {
    setPos({ x: block.x, y: block.y });
  }, [block.x, block.y]);

  useEffect(() => {
    if (block.width) setBoxWidth(block.width);
  }, [block.width]);

  // Sürükle (Taşı) PanResponder
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditing,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !isEditing && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onPanResponderMove: (_, gestureState) => {
        setPos({
          x: block.x + gestureState.dx,
          y: block.y + gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
          onEdit(block.id);
        } else {
          onMoveEnd(block.id, block.x + gestureState.dx, block.y + gestureState.dy);
        }
      },
    })
  ).current;

  // Genişlik (Resize) PanResponder
  const initialWidthRef = useRef(boxWidth);
  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        initialWidthRef.current = boxWidth;
      },
      onPanResponderMove: (_, gestureState) => {
        const newWidth = Math.max(60, initialWidthRef.current + gestureState.dx);
        setBoxWidth(newWidth);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalWidth = Math.max(60, initialWidthRef.current + gestureState.dx);
        onResizeEnd(block.id, finalWidth);
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.blockContainer,
        { left: pos.x, top: pos.y, width: boxWidth },
        isEditing && styles.blockEditing,
      ]}
      {...(!isEditing ? dragPanResponder.panHandlers : {})}
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

          {/* Sağ Taraftaki Boyutlandırma Tutamacı (Resize Handle) */}
          <View style={styles.resizeHandleContainer} {...resizePanResponder.panHandlers}>
            <MaterialCommunityIcons name="drag-vertical" size={20} color="#E91E63" />
          </View>

          {/* Sol Üst Köşede Sil Butonu */}
          <TouchableOpacity
            onPress={() => onDelete(block.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color="#E91E63" />
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

export default function TextCanvas({
  isTextMode = false,
  textBlocks = [],
  onTextBlocksChange,
  activeColor = '#4E342E',
  activeFontSize = 15,
}) {
  const [editingId, setEditingId] = useState(null);

  const handleCanvasPress = (evt) => {
    if (!isTextMode) return;
    if (editingId) {
      setEditingId(null);
      return;
    }

    const { locationX, locationY } = evt.nativeEvent;
    const newId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBlock = {
      id: newId,
      x: Math.max(10, Math.round(locationX)),
      y: Math.max(10, Math.round(locationY - 15)),
      text: '',
      color: activeColor,
      fontSize: activeFontSize,
      width: 120, // Varsayılan Genişlik (Pazartesi vb. sütunlar için makul bir başlangıç)
    };

    onTextBlocksChange([...textBlocks, newBlock]);
    setEditingId(newId);
  };

  const handleTextChange = (id, newText) => {
    onTextBlocksChange(
      textBlocks.map((b) => (b.id === id ? { ...b, text: newText } : b))
    );
  };

  const handleMoveEnd = (id, newX, newY) => {
    onTextBlocksChange(
      textBlocks.map((b) => (b.id === id ? { ...b, x: newX, y: newY } : b))
    );
  };

  const handleResizeEnd = (id, newWidth) => {
    onTextBlocksChange(
      textBlocks.map((b) => (b.id === id ? { ...b, width: newWidth } : b))
    );
  };

  const handleBlur = (id) => {
    // Sadece kutu dışına veya Bitti'ye tıklandığında tetiklenir
    // Ancak handleCanvasPress içinde state'i null yaptığımız için burası yedek
    setEditingId(null);
    const block = textBlocks.find((b) => b.id === id);
    if (block && !block.text.trim()) {
      handleDeleteBlock(id);
    }
  };

  const handleDeleteBlock = (id) => {
    onTextBlocksChange(textBlocks.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {isTextMode && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleCanvasPress}
        />
      )}

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
          onResizeEnd={handleResizeEnd}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blockContainer: {
    position: 'absolute',
    minWidth: 60,
    zIndex: 30,
  },
  blockEditing: {
    zIndex: 50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E91E6388',
    backgroundColor: '#FFFFFFEE',
    borderRadius: 8,
    padding: 0, // Sıfırladık ki iç padding'leri flex ile yönetelim
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 40,
    position: 'relative',
  },
  textInput: {
    flex: 1,
    padding: 8,
    margin: 0,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
    textAlignVertical: 'top',
  },
  resizeHandleContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E91E6315',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#E91E6330',
  },
  deleteBtn: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewBlock: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  savedText: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
  },
});
