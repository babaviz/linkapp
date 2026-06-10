import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from '../theme';

// Common NativeWind to StyleSheet conversions
// Use these helper functions instead of className attributes

export const createFlexStyles = {
  // Flex containers
  flex1: { flex: 1 } as ViewStyle,
  flexRow: { flexDirection: 'row' } as ViewStyle,
  flexCol: { flexDirection: 'column' } as ViewStyle,
  
  // Justify content
  justifyStart: { justifyContent: 'flex-start' } as ViewStyle,
  justifyEnd: { justifyContent: 'flex-end' } as ViewStyle,
  justifyCenter: { justifyContent: 'center' } as ViewStyle,
  justifyBetween: { justifyContent: 'space-between' } as ViewStyle,
  justifyAround: { justifyContent: 'space-around' } as ViewStyle,
  justifyEvenly: { justifyContent: 'space-evenly' } as ViewStyle,
  
  // Align items
  itemsStart: { alignItems: 'flex-start' } as ViewStyle,
  itemsEnd: { alignItems: 'flex-end' } as ViewStyle,
  itemsCenter: { alignItems: 'center' } as ViewStyle,
  itemsStretch: { alignItems: 'stretch' } as ViewStyle,
  
  // Combined common patterns
  centerAll: { alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  rowCenter: { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
};

export const createSpacingStyles = {
  // Padding (equivalent to p-, px-, py-, pt-, pb-, pl-, pr-)
  p1: { padding: spacing[1] } as ViewStyle,
  p2: { padding: spacing[2] } as ViewStyle,
  p3: { padding: spacing[3] } as ViewStyle,
  p4: { padding: spacing[4] } as ViewStyle,
  p5: { padding: spacing[5] } as ViewStyle,
  p6: { padding: spacing[6] } as ViewStyle,
  p8: { padding: spacing[8] } as ViewStyle,
  p10: { padding: spacing[10] } as ViewStyle,
  
  px2: { paddingHorizontal: spacing[2] } as ViewStyle,
  px3: { paddingHorizontal: spacing[3] } as ViewStyle,
  px4: { paddingHorizontal: spacing[4] } as ViewStyle,
  px6: { paddingHorizontal: spacing[6] } as ViewStyle,
  
  py2: { paddingVertical: spacing[2] } as ViewStyle,
  py3: { paddingVertical: spacing[3] } as ViewStyle,
  py4: { paddingVertical: spacing[4] } as ViewStyle,
  py6: { paddingVertical: spacing[6] } as ViewStyle,
  
  // Margin (equivalent to m-, mx-, my-, mt-, mb-, ml-, mr-)
  m1: { margin: spacing[1] } as ViewStyle,
  m2: { margin: spacing[2] } as ViewStyle,
  m3: { margin: spacing[3] } as ViewStyle,
  m4: { margin: spacing[4] } as ViewStyle,
  m5: { margin: spacing[5] } as ViewStyle,
  m6: { margin: spacing[6] } as ViewStyle,
  
  mx2: { marginHorizontal: spacing[2] } as ViewStyle,
  mx3: { marginHorizontal: spacing[3] } as ViewStyle,
  mx4: { marginHorizontal: spacing[4] } as ViewStyle,
  
  my2: { marginVertical: spacing[2] } as ViewStyle,
  my3: { marginVertical: spacing[3] } as ViewStyle,
  my4: { marginVertical: spacing[4] } as ViewStyle,
  
  mt2: { marginTop: spacing[2] } as ViewStyle,
  mt4: { marginTop: spacing[4] } as ViewStyle,
  mb2: { marginBottom: spacing[2] } as ViewStyle,
  mb4: { marginBottom: spacing[4] } as ViewStyle,
  ml2: { marginLeft: spacing[2] } as ViewStyle,
  ml4: { marginLeft: spacing[4] } as ViewStyle,
  mr2: { marginRight: spacing[2] } as ViewStyle,
  mr4: { marginRight: spacing[4] } as ViewStyle,
};

export const createColorStyles = {
  // Background colors
  bgWhite: { backgroundColor: colors.background } as ViewStyle,
  bgGray50: { backgroundColor: colors.secondary[50] } as ViewStyle,
  bgGray100: { backgroundColor: colors.secondary[100] } as ViewStyle,
  bgPrimary500: { backgroundColor: colors.primary[500] } as ViewStyle,
  bgPrimary600: { backgroundColor: colors.primary[600] } as ViewStyle,
  
  // Text colors  
  textGray600: { color: colors.text.secondary } as TextStyle,
  textGray700: { color: colors.text.primary } as TextStyle,
  textGray900: { color: colors.secondary[900] } as TextStyle,
  textPrimary600: { color: colors.primary[600] } as TextStyle,
  textWhite: { color: colors.text.inverse } as TextStyle,
  textSuccess: { color: colors.success[600] } as TextStyle,
  textError: { color: colors.error[600] } as TextStyle,
  textWarning: { color: colors.warning[600] } as TextStyle,
};

export const createBorderStyles = {
  // Border radius
  roundedSm: { borderRadius: borderRadius.sm } as ViewStyle,
  rounded: { borderRadius: borderRadius.base } as ViewStyle,
  roundedMd: { borderRadius: borderRadius.md } as ViewStyle,
  roundedLg: { borderRadius: borderRadius.lg } as ViewStyle,
  roundedXl: { borderRadius: borderRadius.xl } as ViewStyle,
  roundedFull: { borderRadius: borderRadius.full } as ViewStyle,
  
  // Borders
  border: { borderWidth: 1, borderColor: colors.border.light } as ViewStyle,
  borderGray200: { borderWidth: 1, borderColor: colors.border.light } as ViewStyle,
  borderGray300: { borderWidth: 1, borderColor: colors.border.medium } as ViewStyle,
  borderPrimary: { borderWidth: 1, borderColor: colors.primary[600] } as ViewStyle,
};

export const createTextStyles = {
  // Font sizes
  textXs: { fontSize: typography.fontSize.xs } as TextStyle,
  textSm: { fontSize: typography.fontSize.sm } as TextStyle,
  textBase: { fontSize: typography.fontSize.base } as TextStyle,
  textLg: { fontSize: typography.fontSize.lg } as TextStyle,
  textXl: { fontSize: typography.fontSize.xl } as TextStyle,
  text2xl: { fontSize: typography.fontSize['2xl'] } as TextStyle,
  text3xl: { fontSize: typography.fontSize['3xl'] } as TextStyle,
  
  // Font weights
  fontNormal: { fontWeight: typography.fontWeight.normal } as TextStyle,
  fontMedium: { fontWeight: typography.fontWeight.medium } as TextStyle,
  fontSemibold: { fontWeight: typography.fontWeight.semibold } as TextStyle,
  fontBold: { fontWeight: typography.fontWeight.bold } as TextStyle,
  
  // Text alignment
  textLeft: { textAlign: 'left' } as TextStyle,
  textCenter: { textAlign: 'center' } as TextStyle,
  textRight: { textAlign: 'right' } as TextStyle,
};

export const createShadowStyles = {
  shadowSm: shadows.sm,
  shadow: shadows.base,
  shadowMd: shadows.md,
  shadowLg: shadows.lg,
};

// Utility function to combine styles easily
export const combineStyles = (...styles: any[]) => {
  return Object.assign({}, ...styles);
};

// Common component style patterns
export const buttonStyles = {
  primary: combineStyles(
    createColorStyles.bgPrimary600,
    createSpacingStyles.px6,
    createSpacingStyles.py3,
    createBorderStyles.roundedMd,
    createShadowStyles.shadowSm
  ),
  secondary: combineStyles(
    createColorStyles.bgGray100,
    createSpacingStyles.px6,
    createSpacingStyles.py3,
    createBorderStyles.roundedMd,
    createBorderStyles.border
  ),
  outline: combineStyles(
    createSpacingStyles.px6,
    createSpacingStyles.py3,
    createBorderStyles.roundedMd,
    createBorderStyles.borderPrimary,
    { backgroundColor: 'transparent' }
  ),
};

export const cardStyles = {
  default: combineStyles(
    createColorStyles.bgWhite,
    createSpacingStyles.p4,
    createBorderStyles.roundedLg,
    createShadowStyles.shadow,
    createBorderStyles.borderGray200
  ),
  elevated: combineStyles(
    createColorStyles.bgWhite,
    createSpacingStyles.p4,
    createBorderStyles.roundedLg,
    createShadowStyles.shadowMd
  ),
};

export const inputStyles = {
  default: combineStyles(
    createSpacingStyles.px3,
    createSpacingStyles.py2,
    createBorderStyles.roundedMd,
    createBorderStyles.borderGray200,
    createColorStyles.bgWhite,
    createTextStyles.textBase
  ),
  focused: combineStyles(
    createSpacingStyles.px3,
    createSpacingStyles.py2,
    createBorderStyles.roundedMd,
    createBorderStyles.borderPrimary,
    createColorStyles.bgWhite,
    createTextStyles.textBase
  ),
};
