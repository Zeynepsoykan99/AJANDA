import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Helper to convert polar coordinates to cartesian (x, y)
 */
const polarToCartesian = (cx, cy, radius, angleInRadians) => {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

/**
 * Creates SVG path definition for a donut arc segment
 */
const createDonutSlicePath = (cx, cy, innerRadius, outerRadius, startAngle, endAngle) => {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);

  const angleDiff = endAngle - startAngle;
  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

/**
 * MoodPieChart - react-native-svg tabanlı interaktif Donut Grafik ve Lejant
 *
 * @param {object} props
 * @param {Array} props.distribution - Mood dağılım listesi ({ key, count, percentage, color, emoji, labelKey })
 * @param {object} [props.dominantMood] - Ayın baskın duygu nesnesi
 * @param {string|null} [props.selectedKey] - Varsa kullanıcı tarafından seçili dilim
 * @param {function} [props.onSelectKey] - Dilim / Lejant tıklandığında (key) => void
 * @param {number} [props.size=220] - Grafik çapı
 * @param {number} [props.donutWidth=32] - Simit halka kalınlığı
 */
export default function MoodPieChart({
  distribution = [],
  dominantMood = null,
  selectedKey = null,
  onSelectKey,
  size = Math.min(SCREEN_WIDTH - 80, 220),
  donutWidth = 32,
}) {
  const { t } = useTranslation();

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius - donutWidth;

  const totalCount = useMemo(
    () => distribution.reduce((sum, item) => sum + item.count, 0),
    [distribution]
  );

  // Calculate arc angles for each slice
  const slices = useMemo(() => {
    if (totalCount === 0 || distribution.length === 0) return [];

    // If only 1 slice, we render special 360-degree double arc
    if (distribution.length === 1) {
      const item = distribution[0];
      return [
        {
          ...item,
          startAngle: 0,
          endAngle: Math.PI * 2,
          isFull: true,
        },
      ];
    }

    const gap = 0.04; // small aesthetic separation gap between slices in radians
    const totalGaps = gap * distribution.length;
    const availableAngle = Math.PI * 2 - totalGaps;

    let currentAngle = -Math.PI / 2; // start from 12 o'clock

    return distribution.map((item) => {
      const sliceAngle = (item.count / totalCount) * availableAngle;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle + gap;

      const path = createDonutSlicePath(
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle
      );

      return {
        ...item,
        startAngle,
        endAngle,
        path,
        isFull: false,
      };
    });
  }, [distribution, totalCount, cx, cy, innerRadius, outerRadius]);

  const activeItem = useMemo(() => {
    if (selectedKey) {
      return distribution.find((d) => d.key === selectedKey) || dominantMood;
    }
    return dominantMood || distribution[0] || null;
  }, [selectedKey, distribution, dominantMood]);

  const handleSlicePress = (key) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (onSelectKey) {
      onSelectKey(selectedKey === key ? null : key);
    }
  };

  if (distribution.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* SVG Donut Chart */}
      <View style={[styles.chartWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice) => {
              const isSelected = activeItem?.key === slice.key;

              if (slice.isFull) {
                return (
                  <Circle
                    key={slice.key}
                    cx={cx}
                    cy={cy}
                    r={(outerRadius + innerRadius) / 2}
                    stroke={slice.color}
                    strokeWidth={donutWidth}
                    fill="none"
                    onPress={() => handleSlicePress(slice.key)}
                  />
                );
              }

              return (
                <Path
                  key={slice.key}
                  d={slice.path}
                  fill={slice.color}
                  opacity={selectedKey && !isSelected ? 0.45 : 1}
                  stroke={isSelected ? '#FFFFFF' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                  onPress={() => handleSlicePress(slice.key)}
                />
              );
            })}
          </G>
        </Svg>

        {/* Merkez Bilgi Kartı */}
        <View style={styles.centerBadge} pointerEvents="none">
          {activeItem ? (
            <>
              <Text style={styles.centerEmoji}>{activeItem.emoji}</Text>
              <Text style={styles.centerPercent}>%{activeItem.percentage}</Text>
              <Text style={styles.centerDays}>
                {activeItem.count} {t('analytics.daysUnit', 'gün')}
              </Text>
            </>
          ) : (
            <Text style={styles.centerDays}>{totalCount} {t('analytics.daysUnit', 'gün')}</Text>
          )}
        </View>
      </View>

      {/* Lejant (Legend) Listesi */}
      <View style={styles.legendContainer}>
        {distribution.map((item) => {
          const isSelected = activeItem?.key === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.7}
              onPress={() => handleSlicePress(item.key)}
              style={[
                styles.legendChip,
                isSelected && styles.legendChipActive,
                { borderColor: isSelected ? item.color : '#E0D6C850' },
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendEmoji}>{item.emoji}</Text>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t(item.labelKey, item.defaultLabel)}
              </Text>
              <Text style={styles.legendPercent}>%{item.percentage}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmoji: {
    fontSize: 32,
    marginBottom: 2,
  },
  centerPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2723',
    letterSpacing: -0.5,
  },
  centerDays: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8D6E63',
    marginTop: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF90',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1.2,
    gap: 5,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  legendChipActive: {
    backgroundColor: '#FFFDF9',
    shadowOpacity: 0.12,
    elevation: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendEmoji: {
    fontSize: 13,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E342E',
  },
  legendPercent: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8D6E63',
    marginLeft: 2,
  },
});
