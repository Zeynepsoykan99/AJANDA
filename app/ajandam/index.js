import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import {
  COVER_TEMPLATES,
  DEFAULT_COVER_TEMPLATE_ID,
  getCoverTemplateById,
} from '../../constants/coverTemplates';
import CoverDisplay from '../../components/CoverDisplay';
import CoverEditor from '../../components/CoverEditor';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * AjandamScreen - Ajanda Kapağı Ekranı
 * Kullanıcıyı kişiselleştirilebilir bir kapak karşılar.
 * Kapağı düzenleyebilir ve ajandayı açabilir.
 */
export default function AjandamScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [coverData, setCoverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  // Kapak verilerini yükle
  useEffect(() => {
    (async () => {
      try {
        const saved = await StorageService.getCover();
        if (saved) {
          setCoverData(saved);
        } else {
          // Varsayılan kapak
          const defaultCover = {
            templateId: DEFAULT_COVER_TEMPLATE_ID,
            userName: '',
            userNote: '',
          };
          setCoverData(defaultCover);
        }
      } catch (error) {
        console.warn('Kapak yüklenirken hata:', error);
        setCoverData({
          templateId: DEFAULT_COVER_TEMPLATE_ID,
          userName: '',
          userNote: '',
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Kapak kaydet
  const handleSaveCover = useCallback(async (newCoverData) => {
    setCoverData(newCoverData);
    await StorageService.setCover(newCoverData);
  }, []);

  // Ajandayı aç
  const handleOpenAgenda = useCallback(() => {
    router.push('/ajandam/pages');
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const template = getCoverTemplateById(coverData?.templateId);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Üst Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsEditorVisible(true)}
          style={[
            styles.editButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Kapak */}
      <View style={styles.coverWrapper}>
        <CoverDisplay
          template={template}
          userName={coverData?.userName}
          userNote={coverData?.userNote}
        />
      </View>

      {/* Ajandayı Aç Butonu */}
      <View
        style={[
          styles.openButtonContainer,
          isTablet && { maxWidth: 440, alignSelf: 'center' },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenAgenda}
          style={[styles.openButton, { backgroundColor: colors.accent }]}
        >
          <MaterialCommunityIcons
            name="book-open-page-variant-outline"
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.openButtonText}>Ajandamı Aç</Text>
        </TouchableOpacity>
      </View>

      {/* Kapak Düzenleme Modal */}
      <CoverEditor
        visible={isEditorVisible}
        onClose={() => setIsEditorVisible(false)}
        coverData={coverData}
        onSave={handleSaveCover}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  coverWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 60,
  },
  openButtonContainer: {
    paddingBottom: 36,
    paddingHorizontal: 40,
    width: '100%',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 10,
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
