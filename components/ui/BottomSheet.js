import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * BottomSheet - Genel amaçlı alttan açılan panel
 * ThemePickerModal / PaperTemplateModal ile aynı görsel ve animasyon deseni:
 * karartma perdesi, yaylanarak açılış, tutamaçtan aşağı kaydırarak kapatma.
 *
 * - Kullanıcı kapatırsa (perde, tutamaç, kapat butonu, geri tuşu) kapanış animasyonu bitince onClose çağrılır.
 * - Üst bileşen visible=false yaparsa panel animasyonla kapanır; onClose tekrar çağrılmaz.
 *
 * @param {boolean} visible
 * @param {function} onClose
 * @param {string} title
 * @param {string} subtitle
 * @param {ReactNode} children - Panel içeriği
 * @param {ReactNode} footer - İçeriğin altında sabit kalan alan (ör. onay butonu)
 * @param {number} maxHeightRatio - Ekran yüksekliğine oranla en fazla yükseklik
 */
export default function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.86,
}) {
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [isRendered, setIsRendered] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const finishClose = useCallback((notifyParent) => {
    setIsRendered(false);
    if (notifyParent && onCloseRef.current) onCloseRef.current();
  }, []);

  const animateOut = useCallback(
    (notifyParent) => {
      backdropOpacity.value = withTiming(0, { duration: 220 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 240 }, (finished) => {
        if (finished) runOnJS(finishClose)(notifyParent);
      });
    },
    [backdropOpacity, translateY, finishClose]
  );

  const dismissByUser = useCallback(() => animateOut(true), [animateOut]);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 160, mass: 0.9 });
    } else if (isRendered) {
      animateOut(false);
    }
  }, [visible]);

  const dismissRef = useRef(dismissByUser);
  dismissRef.current = dismissByUser;

  // Tutamaçtan aşağı kaydırarak kapatma
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 6,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.value = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          dismissRef.current();
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 180 });
        }
      },
    })
  ).current;

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isRendered) return null;

  return (
    <Modal
      visible={isRendered}
      transparent={true}
      animationType="none"
      onRequestClose={dismissByUser}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissByUser} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.card, borderColor: colors.border, maxHeight: SCREEN_HEIGHT * maxHeightRatio },
            isTablet && styles.sheetContainerTablet,
            animatedSheetStyle,
          ]}
        >
          <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                {!!title && (
                  <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                    {title}
                  </Text>
                )}
                {!!subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textSecondary + 'B3' }]}>{subtitle}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={dismissByUser}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.border + '25', borderColor: colors.border + '40' },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.body}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
  },
  sheetContainerTablet: {
    width: 560,
    alignSelf: 'center',
    borderRadius: 28,
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  dragHandleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // İçerik daralıp kayabilsin, footer her zaman görünür kalsın
  body: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  footer: {
    marginTop: 12,
  },
});
