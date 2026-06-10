declare module 'react-native-chart-kit' {
  import { ViewStyle } from 'react-native';
  
  export interface ChartConfig {
    backgroundColor?: string;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    decimalPlaces?: number;
    color?: (opacity?: number) => string;
    labelColor?: (opacity?: number) => string;
    style?: ViewStyle;
    propsForDots?: any;
    propsForLabels?: any;
    propsForBackgroundLines?: any;
  }

  export interface LineChartData {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity?: number) => string;
      strokeWidth?: number;
    }>;
  }

  export interface BarChartData {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity?: number) => string;
    }>;
  }

  export interface PieChartData {
    data: Array<{
      name: string;
      population: number;
      color: string;
      legendFontColor?: string;
      legendFontSize?: number;
    }>;
  }

  export const LineChart: import('react').FC<{
    data: LineChartData;
    width: number;
    height: number;
    chartConfig: ChartConfig;
    bezier?: boolean;
    style?: ViewStyle;
    withDots?: boolean;
    withShadow?: boolean;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    withVerticalLabels?: boolean;
    withHorizontalLabels?: boolean;
    withVerticalLines?: boolean;
    withHorizontalLines?: boolean;
    fromZero?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    yAxisInterval?: number;
    yLabelsOffset?: number;
    xLabelsOffset?: number;
    hidePointsAtIndex?: number[];
  }>;

  export const BarChart: import('react').FC<{
    data: BarChartData;
    width: number;
    height: number;
    chartConfig: ChartConfig;
    style?: ViewStyle;
    withVerticalLabels?: boolean;
    withHorizontalLabels?: boolean;
    withInnerLines?: boolean;
    withDots?: boolean;
    withShadow?: boolean;
    fromZero?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    yAxisInterval?: number;
    yLabelsOffset?: number;
    xLabelsOffset?: number;
    hidePointsAtIndex?: number[];
  }>;

  export const PieChart: import('react').FC<{
    data: PieChartData;
    width: number;
    height: number;
    chartConfig: ChartConfig;
    accessor?: string;
    backgroundColor?: string;
    paddingLeft?: string;
    center?: [number, number];
    absolute?: boolean;
    hasLegend?: boolean;
  }>;
}
