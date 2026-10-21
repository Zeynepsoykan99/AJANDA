/**
 * screenMocks.js — screenHarness ile kullanilan sahte yerel bilesenler ve servisler
 *
 * Sahte bilesenler render sayisini sayar ve son prop'larini kaydeder; boylece
 * test, gercek ekranin cocuklarina verdigi geri cagrilari (onDrawingsChange vb.)
 * gercek bir cizimin yapacagi gibi cagirabilir.
 *
 * DrawingCanvas sahtesi, gercek StaticDrawingsLayer ile AYNI memo sozlesmesine
 * sahip bir ic katman cizer (drawings, selectedStrokeIds, hiddenStrokeIds sig
 * karsilastirma). Boylece "aktif olmayan sayfada memo kiriliyor mu" sorusu
 * gercek React.memo davranisiyla sayilir.
 */
const React = require('react');

const createRegistry = () => {
  const renders = {};
  const instances = {}; // ad -> Map(id -> son prop'lar)
  const propChanges = {}; // ad -> { prop -> degisim sayisi } (ayni ornek, ardisik render)
  let seq = 0;
  return {
    renders,
    instances,
    propChanges,
    nextId: () => ++seq,
    count(name) {
      renders[name] = (renders[name] || 0) + 1;
    },
    snapshot() {
      return { ...renders };
    },
    diff(before) {
      const out = {};
      Object.keys(renders).forEach((k) => {
        out[k] = renders[k] - ((before && before[k]) || 0);
      });
      return out;
    },
  };
};

/** Ayni ornegin ardisik render'larinda referansi degisen prop'lari sayar */
const trackProps = (registry, name, id, props, ignore = []) => {
  if (!registry.instances[name]) registry.instances[name] = new Map();
  const prev = registry.instances[name].get(id);
  if (prev) {
    if (!registry.propChanges[name]) registry.propChanges[name] = {};
    Object.keys(props).forEach((k) => {
      if (k === 'children' || ignore.includes(k)) return;
      if (prev[k] !== props[k]) {
        registry.propChanges[name][k] = (registry.propChanges[name][k] || 0) + 1;
      }
    });
  }
  registry.instances[name].set(id, props);
};

const useInstanceId = (registry, name) => {
  const ref = React.useRef(null);
  if (ref.current === null) ref.current = registry.nextId();
  React.useEffect(
    () => () => {
      if (registry.instances[name]) registry.instances[name].delete(ref.current);
    },
    []
  );
  return ref.current;
};

const createScreenMocks = ({ registry, params = {}, windowSize = { width: 800, height: 1200 } }) => {
  const host = (name) => {
    const C = React.forwardRef(function HostMock(props, ref) {
      registry.count(name);
      return React.createElement('div', { ref }, props.children);
    });
    C.displayName = name;
    return C;
  };
  const View = host('View');
  const Text = React.forwardRef(function TextMock(props, ref) {
    registry.count('Text');
    return React.createElement('span', { ref }, props.children);
  });

  const ScrollView = React.forwardRef(function ScrollViewMock(props, ref) {
    const id = useInstanceId(registry, 'ScrollView');
    registry.count('ScrollView');
    trackProps(registry, 'ScrollView', id, props);
    React.useImperativeHandle(ref, () => ({ scrollTo() {}, scrollToEnd() {} }), []);
    return React.createElement('div', null, props.children);
  });

  const COLORS = {
    background: '#FFF5F8',
    card: '#FFFFFF',
    border: '#EEEEEE',
    accent: '#C2185B',
    textPrimary: '#222222',
    textSecondary: '#666666',
  };
  const THEME = { colors: COLORS, themeId: 'test' };
  const LAYOUT = { isTablet: false, isTwoPage: false, maxContentWidth: 800 };
  const EDGE = { animatedStyle: {} };
  const ROUTER = { back() {}, push() {}, replace() {} };
  const alerts = [];
  const t = (key, def, opts) => {
    if (typeof def === 'string') return def;
    if (def && typeof def === 'object' && typeof def.defaultValue === 'string') return def.defaultValue;
    return key;
  };
  const I18N = { t, i18n: { language: 'tr', changeLanguage: async () => {} } };

  const DrawingCanvasMock = function DrawingCanvasMock(props) {
    const id = useInstanceId(registry, 'DrawingCanvas');
    registry.count('drawingCanvas');
    trackProps(registry, 'DrawingCanvas', id, props);
    // Gercek bilesende hiddenStrokeIds bir state'tir (ornek boyunca sabit referans)
    const [hidden] = React.useState(() => new Set());
    return React.createElement(StaticLayerProbe, {
      drawings: props.drawings,
      selectedStrokeIds: props.selectedStrokeIds,
      hiddenStrokeIds: hidden,
    });
  };
  // Gercek StaticDrawingsLayer ile ayni memo sozlesmesi (sig karsilastirma)
  const StaticLayerProbe = React.memo(function StaticLayerProbe() {
    registry.count('staticLayer');
    return null;
  });

  const recordingComponent = (name, counterKey) =>
    function RecordingMock(props) {
      const id = useInstanceId(registry, name);
      registry.count(counterKey);
      trackProps(registry, name, id, props);
      return props.children !== undefined ? React.createElement(React.Fragment, null, props.children) : null;
    };

  const ZoomableCanvas = React.forwardRef(function ZoomableCanvasMock(props, ref) {
    registry.count('ZoomableCanvas');
    React.useImperativeHandle(
      ref,
      () => ({ remeasure() {}, getTransform: () => ({ scale: 1 }), resetZoomImmediate() {} }),
      []
    );
    return React.createElement('div', null, props.children);
  });

  const getAudioFileName = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const segments = raw.split('?')[0].split('#')[0].split('/');
    return segments[segments.length - 1] || '';
  };

  const mocks = {
    'react-native': {
      View,
      Text,
      ScrollView,
      TouchableOpacity: host('TouchableOpacity'),
      Pressable: host('Pressable'),
      ActivityIndicator: host('ActivityIndicator'),
      TextInput: host('TextInput'),
      Image: host('Image'),
      FlatList: host('FlatList'),
      Modal: host('Modal'),
      StyleSheet: {
        create: (s) => s,
        absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        hairlineWidth: 0.5,
        flatten: (s) => s,
      },
      PixelRatio: { get: () => 2, roundToNearestPixel: (x) => x },
      Platform: {
        OS: 'android',
        select: (o) => (o.android !== undefined ? o.android : o.native !== undefined ? o.native : o.default),
      },
      Alert: { alert: (...args) => alerts.push(args) },
      AppState: { addEventListener: () => ({ remove() {} }), currentState: 'active' },
      useWindowDimensions: () => windowSize,
      Dimensions: { get: () => windowSize },
      Keyboard: { dismiss() {} },
    },
    'react-native-safe-area-context': { SafeAreaView: host('SafeAreaView') },
    'react-native-reanimated': {
      __esModule: true,
      default: { createAnimatedComponent: (c) => c, View },
      runOnJS: (fn) => fn,
    },
    'expo-status-bar': { StatusBar: () => null },
    'expo-router': {
      useRouter: () => ROUTER,
      useLocalSearchParams: () => params,
      useFocusEffect: (cb) => React.useEffect(() => cb(), [cb]),
    },
    'react-i18next': { useTranslation: () => I18N },
    'context/ThemeContext.js': { useTheme: () => THEME },
    'hooks/useResponsiveLayout.js': {
      __esModule: true,
      default: () => LAYOUT,
      computeContainedPageDimensions: () => ({ pageWidth: 600, pageHeight: 900 }),
    },
    'hooks/useDynamicEdgeColor.js': { __esModule: true, default: () => EDGE },
    'services/securityService.js': {
      SecurityService: {
        normalizeTargetId: (x) => x,
        hasPin: async () => false,
        isSessionUnlocked: () => true,
        isPinSupportedAsync: async () => false,
      },
    },
    'services/biometricService.js': { addSessionLockListener: () => () => {} },
    'services/audioService.js': {
      AudioService: {
        getAudioFileName,
        deleteAudioFiles: async () => {},
        deleteAudioFile: async () => {},
        resolveAudioUri: () => null,
      },
      getAudioFileName,
      AUDIO_DIR: 'file:///audio/',
    },
    'services/notificationService.js': {
      NotificationService: { cancelScheduledNotification: async () => {} },
    },
    'services/drawingPreferencesService.js': {
      getDrawingPreferences: async () => ({ scribbleErase: false }),
      isScribbleEraseEnabled: () => false,
      addDrawingPreferencesListener: () => () => {},
    },
    'services/privacySettingsService.js': {
      getPrivacySettings: async () => ({ autoHandwriting: false }),
    },
    'components/drawing/DrawingCanvas.js': { __esModule: true, default: DrawingCanvasMock },
    'components/drawing/ZoomableCanvas.js': {
      __esModule: true,
      default: ZoomableCanvas,
      useZoomableCanvas: () => ({}),
    },
    'components/text/TextCanvas.js': { __esModule: true, default: recordingComponent('TextCanvas', 'textCanvas') },
    'components/stickers/StickerCanvas.js': {
      __esModule: true,
      default: recordingComponent('StickerCanvas', 'stickerCanvas'),
    },
    'components/stationery/NotebookInlineText.js': {
      __esModule: true,
      default: recordingComponent('NotebookInlineText', 'inlineText'),
    },
    'expo-file-system/legacy': { documentDirectory: 'file:///doc/' },
    'expo-constants': { __esModule: true, default: {} },
  };

  return { mocks, alerts };
};

/** Aktif sayfanin DrawingCanvas'i (NotebookPagesView aktif sayfada pointerEvents vermez) */
const activeDrawingCanvas = (registry) => {
  const map = registry.instances.DrawingCanvas;
  if (!map) return null;
  const all = [...map.values()];
  return all.find((p) => p.pointerEvents === undefined) || all[0] || null;
};

module.exports = { createRegistry, createScreenMocks, activeDrawingCanvas };
