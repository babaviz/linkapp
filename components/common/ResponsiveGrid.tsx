import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useResponsiveLayout } from '../../utils/responsive';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  style?: ViewStyle;
  itemStyle?: ViewStyle;
  maxColumns?: number;
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * ResponsiveGrid
 * Automatically adjusts column count based on device type
 * Phone: 1 column, Tablet: 2 columns, Desktop: 3-4 columns
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  style,
  itemStyle,
  maxColumns,
  gap = 'md',
}) => {
  const layout = useResponsiveLayout();
  const columns = maxColumns ? Math.min(layout.gridColumns, maxColumns) : layout.gridColumns;
  const gapSize = layout.gapSize(gap);
  
  // Group children into rows
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += columns) {
    rows.push(children.slice(i, i + columns));
  }
  
  return (
    <View style={[styles.container, style]}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            {
              gap: gapSize,
              marginBottom: rowIndex < rows.length - 1 ? gapSize : 0,
            },
          ]}
        >
          {row.map((child, colIndex) => (
            <View
              key={colIndex}
              style={[
                styles.item,
                {
                  flex: 1,
                  maxWidth: `${100 / columns}%`,
                },
                itemStyle,
              ]}
            >
              {child}
            </View>
          ))}
          {/* Fill remaining space if row is incomplete */}
          {row.length < columns &&
            Array.from({ length: columns - row.length }).map((_, index) => (
              <View
                key={`empty-${index}`}
                style={[
                  styles.item,
                  {
                    flex: 1,
                    maxWidth: `${100 / columns}%`,
                  },
                ]}
              />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  item: {
    minWidth: 0, // Prevent flex items from overflowing
  },
});

export default ResponsiveGrid;
