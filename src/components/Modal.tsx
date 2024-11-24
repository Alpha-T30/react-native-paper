import * as React from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Pressable,
  View,
  ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useLatestCallback from 'use-latest-callback';

import Surface from './Surface';
import { useInternalTheme } from '../core/theming';
import type { ThemeProp } from '../types';
import { addEventListener } from '../utils/addEventListener';
import { BackHandler } from '../utils/BackHandler/BackHandler';
import useAnimatedValue from '../utils/useAnimatedValue';

const DEFAULT_DURATION = 220;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ModalProps = {
  dismissable?: boolean;
  dismissableBackButton?: boolean;
  onDismiss?: () => void;
  overlayAccessibilityLabel?: string;
  visible: boolean;
  children: React.ReactNode;
  contentContainerStyle?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  style?: StyleProp<ViewStyle>;
  theme?: ThemeProp;
  testID?: string;
};

function Modal({
  dismissable = true,
  dismissableBackButton = dismissable,
  visible = false,
  overlayAccessibilityLabel = 'Close modal',
  onDismiss = () => {},
  children,
  contentContainerStyle,
  style,
  theme: themeOverrides,
  testID = 'modal',
}: ModalProps) {
  const theme = useInternalTheme(themeOverrides);
  const visibleRef = React.useRef(visible);

  React.useEffect(() => {
    visibleRef.current = visible;
  });

  const onDismissCallback = useLatestCallback(onDismiss);
  const { scale } = theme.animation;
  const { top, bottom } = useSafeAreaInsets();
  const opacity = useAnimatedValue(visible ? 1 : 0);
  const [rendered, setRendered] = React.useState(visible);

  if (visible && !rendered) {
    setRendered(true);
  }

  const showModal = React.useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: scale * DEFAULT_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [opacity, scale]);

  const hideModal = React.useCallback(() => {
    if (!rendered) return;
    if (!visibleRef.current) return;

    visibleRef.current = false;

    Animated.timing(opacity, {
      toValue: 0,
      duration: scale * DEFAULT_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onDismissCallback();
        setRendered(false);
      }
    });
  }, [onDismissCallback, opacity, scale, rendered]);

  React.useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const onHardwareBackPress = () => {
      if (dismissable || dismissableBackButton) {
        hideModal();
      }
      return true;
    };

    const subscription = addEventListener(
      BackHandler,
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => subscription.remove();
  }, [dismissable, dismissableBackButton, hideModal, visible]);

  const prevVisible = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (prevVisible.current !== visible) {
      if (visible) {
        showModal();
      } else {
        hideModal();
      }
    }
    prevVisible.current = visible;
  });

  if (!rendered) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      style={StyleSheet.absoluteFill}
      onAccessibilityEscape={hideModal}
      testID={testID}
    >
      <AnimatedPressable
        accessibilityLabel={overlayAccessibilityLabel}
        accessibilityRole="button"
        disabled={!dismissable || !rendered}
        onPress={dismissable && rendered ? hideModal : undefined}
        importantForAccessibility="no"
        style={[
          styles.backdrop,
          {
            backgroundColor: theme.colors?.backdrop,
            opacity,
          },
        ]}
        testID={`${testID}-backdrop`}
      />
      <View
        style={[
          styles.wrapper,
          { marginTop: top, marginBottom: bottom },
          style,
        ]}
        pointerEvents="box-none"
        testID={`${testID}-wrapper`}
      >
        <Surface
          testID={`${testID}-surface`}
          theme={theme}
          style={[{ opacity }, styles.content, contentContainerStyle]}
        >
          {children}
        </Surface>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  content: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
});

export default Modal;
