import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { markTooltipShownAsync, setShowTooltipsAsync } from '../../redux/slices/onboardingSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TooltipPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface TooltipHighlightProps {
  id: string;
  title: string;
  message: string;
  targetPosition?: TooltipPosition;
  icon?: string;
  color?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showOnce?: boolean;
  delay?: number;
  enabled?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export const TooltipHighlight: React.FC<TooltipHighlightProps> = ({
  id,
  title,
  message,
  targetPosition,
  icon = 'info',
  color = '#3B82F6',
  placement = 'bottom',
  showOnce = true,
  delay = 500,
  enabled = true,
  onDismiss,
  children,
}) => {
  const dispatch = useAppDispatch();
  const { showTooltips, tooltipsShown } = useAppSelector((state) => state.onboarding);
  
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const shouldShow = enabled && showTooltips && (!showOnce || !tooltipsShown.includes(id));

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => {
        setVisible(true);
        
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [shouldShow, delay]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      Promise.resolve(dispatch(markTooltipShownAsync(id)))
        .catch(() => undefined)
        .finally(() => {
          onDismiss?.();
        });
    });
  };

  const handleDismissAll = () => {
    dispatch(setShowTooltipsAsync(false));
    handleDismiss();
  };

  if (!visible || !shouldShow) {
    return <>{children}</>;
  }

  const getTooltipPosition = (): any => {
    if (!targetPosition) {
      return {
        top: SCREEN_HEIGHT / 2 - 100,
        left: 20,
        right: 20,
      };
    }

    const basePosition: any = {};
    
    if (placement === 'bottom' && targetPosition.bottom !== undefined) {
      basePosition.top = targetPosition.bottom + 10;
    } else if (placement === 'top' && targetPosition.top !== undefined) {
      basePosition.bottom = SCREEN_HEIGHT - targetPosition.top + 10;
    } else if (placement === 'right' && targetPosition.right !== undefined) {
      basePosition.left = targetPosition.right + 10;
    } else if (placement === 'left' && targetPosition.left !== undefined) {
      basePosition.right = SCREEN_WIDTH - targetPosition.left + 10;
    }

    if (!basePosition.left && !basePosition.right) {
      basePosition.left = 20;
      basePosition.right = 20;
    }

    return basePosition;
  };

  const getHighlightPosition = (): any => {
    if (!targetPosition) return null;
    
    return {
      top: targetPosition.top,
      left: targetPosition.left,
      width: (targetPosition.right || 0) - (targetPosition.left || 0),
      height: (targetPosition.bottom || 0) - (targetPosition.top || 0),
    };
  };

  const tooltipPosition = getTooltipPosition();
  const highlightPosition = getHighlightPosition();

  return (
    <>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleDismiss}
      >
        <View style={styles.overlay}>
          {highlightPosition && (
            <Animated.View
              style={[
                styles.highlight,
                highlightPosition,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: color,
                },
              ]}
            />
          )}

          <Animated.View
            style={[
              styles.tooltip,
              tooltipPosition,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={[styles.tooltipHeader, { backgroundColor: color }]}>
              <MaterialIcons name={icon as any} size={24} color="#FFF" />
              <Text style={styles.tooltipTitle}>{title}</Text>
              <TouchableOpacity
                onPress={handleDismiss}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.tooltipBody}>
              <Text style={styles.tooltipMessage}>{message}</Text>
            </View>

            <View style={styles.tooltipFooter}>
              <TouchableOpacity
                onPress={handleDismissAll}
                style={styles.dismissAllButton}
              >
                <Text style={styles.dismissAllText}>Don't show tips</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDismiss}
                style={[styles.gotItButton, { backgroundColor: color }]}
              >
                <Text style={styles.gotItText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: SCREEN_WIDTH - 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  tooltipTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  tooltipBody: {
    padding: 16,
    paddingTop: 8,
  },
  tooltipMessage: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  tooltipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  dismissAllButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dismissAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  gotItButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  gotItText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

interface HighlightWrapperProps {
  id: string;
  title: string;
  message: string;
  icon?: string;
  color?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showOnce?: boolean;
  delay?: number;
  enabled?: boolean;
  children: React.ReactNode;
  onDismiss?: () => void;
}

export const HighlightWrapper: React.FC<HighlightWrapperProps> = ({
  children,
  ...tooltipProps
}) => {
  const [targetPosition, setTargetPosition] = useState<TooltipPosition>();
  const targetRef = useRef<View>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      targetRef.current?.measure((x, y, width, height, pageX, pageY) => {
        setTargetPosition({
          top: pageY,
          left: pageX,
          right: pageX + width,
          bottom: pageY + height,
        });
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View ref={targetRef} collapsable={false}>
      <TooltipHighlight {...tooltipProps} targetPosition={targetPosition}>
        {children}
      </TooltipHighlight>
    </View>
  );
};

export default TooltipHighlight;
