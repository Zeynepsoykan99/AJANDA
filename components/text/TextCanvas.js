import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import * as Haptics from 'expo-haptics';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

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
  canvasWidth = 0,
  canvasHeight = 0,
  onSnapChange,
}) => {
  const [pos, setPos] = useState({ x: block.x, y: block.y });
  const [boxWidth, setBoxWidth] = useState(block.width || 120);
  const currentPosRef = useRef({ x: block.x, y: block.y });
  const isSnappedVRef = useRef(false);
  const isSnappedHRef = useRef(false);

  useEffect(() => {
    setPos({ x: block.x, y: block.y });
    currentPosRef.current = { x: block.x, y: block.y };
  }, [block.x, block.y]);

  useEffect(() => {
    if (block.width) setBoxWidth(block.width);
  }, [block.width]);

  // Sürükle (Taşı) PanResponder + Akıllı Hizalama (Snapping)
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditing,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !isEditing && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onPanResponderMove: (_, gestureState) => {
        let rawX = block.x + gestureState.dx;
        let rawY = block.y + gestureState.dy;

        // Akıllı Hizalama (Snapping)
        if (canvasWidth > 0 && canvasHeight > 0) {
          const itemW = boxWidth;
          const itemH = 40;
          const centerX = rawX + itemW / 2;
          const centerY = rawY + itemH / 2;
          const midX = canvasWidth / 2;
          const midY = canvasHeight / 2;
          const threshold = 14;

          // Dikey eksen (yatay merkez) snap
          if (Math.abs(centerX - midX) < threshold) {
            rawX = midX - itemW / 2;
            if (!isSnappedVRef.current) {
              isSnappedVRef.current = true;
              triggerHaptic();
              if (onSnapChange) onSnapChange({ v: true });
            }
          } else {
            if (isSnappedVRef.current) {
              isSnappedVRef.current = false;
              if (onSnapChange) onSnapChange({ v: false });
            }
          }

          // Yatay eksen (dikey merkez) snap
          if (Math.abs(centerY - midY) < threshold) {
            rawY = midY - itemH / 2;
            if (!isSnappedHRef.current) {
              isSnappedHRef.current = true;
              triggerHaptic();
              if (onSnapChange) onSnapChange({ h: true });
            }
          } else {
            if (isSnappedHRef.current) {
              isSnappedHRef.current = false;
              if (onSnapChange) onSnapChange({ h: false });
            }
          }
        }

        currentPosRef.current = { x: rawX, y: rawY };
        setPos({ x: rawX, y: rawY });
      },
      onPanResponderRelease: (_, gestureState) => {
        isSnappedVRef.current = false;
        isSnappedHRef.current = false;
        if (onSnapChange) onSnapChange({ v: false, h: false });

        if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
          onEdit(block.id);
        } else {
          onMoveEnd(block.id, currentPosRef.current.x, currentPosRef.current.y);
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
                fontFamily: block.fontFamily || undefined,
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
                fontFamily: block.fontFamily || undefined,
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
  activeFontFamily,
}) {
  const [editingId, setEditingId] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const [guideLines, setGuideLines] = useState({ v: false, h: false });

  const handleSnapChange = useCallback((snap) => {
    setGuideLines((prev) => ({ ...prev, ...snap }));
  }, []);

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
      fontFamily: activeFontFamily || undefined,
      width: 120,
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
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="box-none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasLayout({ width, height });
      }}
    >
      {/* Akıllı Hizalama Kılavuz Çizgileri */}
      {guideLines.v && canvasLayout.width > 0 && (
        <View
          style={[styles.guideLineVertical, { left: canvasLayout.width / 2 }]}
          pointerEvents="none"
        />
      )}
      {guideLines.h && canvasLayout.height > 0 && (
        <View
          style={[styles.guideLineHorizontal, { top: canvasLayout.height / 2 }]}
          pointerEvents="none"
        />
      )}

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
          canvasWidth={canvasLayout.width}
          canvasHeight={canvasLayout.height}
          onSnapChange={handleSnapChange}
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
    padding: 0,
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
  guideLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#E91E63',
    zIndex: 20,
    opacity: 0.6,
  },
  guideLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#E91E63',
    zIndex: 20,
    opacity: 0.6,
  },
});
