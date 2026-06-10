# Reusable Common Components

This directory contains optimized, reusable UI components designed for the MyNyumbApp. These components are built with responsive design principles and feature Kenyan-themed styling.

## 🎨 HeroBanner Component

A versatile hero banner component with multiple background themes and Kenyan-inspired decorations.

### Features
- **Multiple Background Types**: `gradient`, `kenyan-landscape`, `professionals`, `tech-pattern`
- **Responsive Design**: Adapts to phone and tablet screen sizes
- **Kenyan Decorations**: Contextual icons and patterns
- **Customizable Height**: `compact`, `medium`, `tall` options
- **Gradient Overlays**: Beautiful color combinations

### Usage
```tsx
import { HeroBanner } from '../components/common';

<HeroBanner
  title="Jobs & Skills"
  subtitle="Connect talent with opportunities across Kenya"
  emoji="💼"
  countryFlag="🇰🇪"
  backgroundType="kenyan-landscape"
  primaryColor="#059669"
  secondaryColor="#10B981"
  height="compact"
>
  {/* Child components go here */}
</HeroBanner>
```

### Background Types

#### `kenyan-landscape`
- Forest green to sunset orange gradient
- Acacia tree and Mount Kenya decorations
- Perfect for outdoor/nature-related apps

#### `professionals`
- Professional blue gradient
- Business icons (briefcase, handshake, graduation)
- Ideal for job/career applications

#### `tech-pattern`
- Purple to cyan gradient
- Tech icons (laptop, mobile, code)
- Great for technology services

#### `gradient`
- Custom primary/secondary color gradient
- Abstract geometric decorations
- Universal option for any content

---

## 📊 StatsWidget Component

Displays live statistics with smooth animations and multiple layout options.

### Features
- **Animated Numbers**: Spring animations for engaging display
- **Multiple Layouts**: Horizontal or grid arrangements
- **Theme Support**: Dark, light, or transparent themes
- **Compact Mode**: Space-efficient variant
- **Icon Support**: Custom icons for each statistic

### Usage
```tsx
import { StatsWidget, JobStatsPreset } from '../components/common';

<StatsWidget
  stats={JobStatsPreset}
  title="Live Statistics"
  layout="horizontal"
  theme="transparent"
  animated={true}
  compactMode={false}
/>
```

### Pre-configured Stats
```tsx
// Available preset configurations
JobStatsPreset      // Jobs-related statistics
PropertyStatsPreset // Real estate statistics  
ServiceStatsPreset  // Service provider stats
DateMiStatsPreset   // Dating app statistics
```

### Custom Stats
```tsx
const customStats = [
  { value: '1.2K', label: 'Users', icon: '👥', color: '#10B981' },
  { value: '45', label: 'Cities', icon: '🏙️', color: '#3B82F6' },
  { value: '4.8', label: 'Rating', icon: '⭐', color: '#F59E0B' },
];

<StatsWidget stats={customStats} />
```

---

## 🔍 SearchSection Component

A comprehensive search interface with integrated action buttons and live indicators.

### Features
- **Search Integration**: Accepts any search component
- **Action Buttons**: Customizable gradient buttons
- **Live Indicators**: Real-time activity display
- **Glass Morphism**: Modern transparent styling
- **Responsive Layout**: Adapts to screen size

### Usage
```tsx
import { SearchSection, JobActionButtons } from '../components/common';
import { FunctionalSearchBar } from '../jobs/FunctionalSearchBar';

<SearchSection
  title="Find Your Perfect Job ✨"
  subtitle="Discover opportunities that match your skills"
  searchComponent={
    <FunctionalSearchBar
      onSearch={handleSearch}
      placeholder="Search..."
    />
  }
  actionButtons={JobActionButtons}
  layout="compact"
  showLiveIndicator={true}
  liveText="47 people searching right now"
/>
```

### Action Button Structure
```tsx
const customButtons: ActionButton[] = [
  {
    title: 'Find Items',
    subtitle: 'Browse collection',
    icon: '🔍',
    gradient: ['#10B981', '#059669'],
    badge: 'LIVE',
    onPress: () => navigate('search'),
  },
];
```

---

## 🎯 Complete Integration Example

Here's how to combine all components for a complete hero section:

```tsx
import { 
  HeroBanner, 
  StatsWidget, 
  SearchSection,
  JobStatsPreset,
  JobActionButtons 
} from '../components/common';

function OptimizedScreen() {
  return (
    <HeroBanner
      title="Jobs & Skills"
      subtitle="Connect talent with opportunities across Kenya"
      backgroundType="kenyan-landscape"
      height="compact"
    >
      <View style={{ marginTop: 16 }}>
        {/* Stats */}
        <StatsWidget
          stats={JobStatsPreset}
          compactMode={true}
          theme="transparent"
        />
        
        {/* Search */}
        <View style={{ marginTop: 16 }}>
          <SearchSection
            searchComponent={<MySearchBar />}
            actionButtons={JobActionButtons}
            layout="compact"
          />
        </View>
      </View>
    </HeroBanner>
  );
}
```

---

## 🎨 Design System

### Color Palette
- **Primary Green**: `#059669` (Kenyan flag inspired)
- **Secondary Green**: `#10B981` 
- **Professional Blue**: `#3B82F6`
- **Tech Purple**: `#7C3AED`
- **Sunset Orange**: `#F59E0B`

### Typography Scale
- **Phone**: 12px - 30px range
- **Tablet**: 14px - 32px range (20-25% larger)

### Spacing Scale
- **Phone**: 4px - 24px
- **Tablet**: 6px - 32px (50% more generous)

### Touch Targets
- **Minimum**: 44px (iOS/Android guidelines)
- **Recommended**: 48px for tablets

---

## 🚀 Performance Notes

### Optimizations
- **Animated.Value reuse**: Shared animation instances
- **Memoized components**: Prevent unnecessary re-renders
- **Lazy loading**: Deferred heavy computations
- **Native driver**: GPU-accelerated animations

### Memory Management
- **Cleanup animations**: On component unmount
- **Remove listeners**: Prevent memory leaks
- **Optimize images**: Proper resolution for device density

---

## 📱 Responsive Behavior

### Phone (< 768px)
- Single column layouts
- Compact spacing and fonts
- Simplified decorations
- Touch-optimized interactions

### Tablet (≥ 768px)
- Multi-column where appropriate
- Generous spacing and larger fonts
- Enhanced visual decorations
- Mouse and touch hybrid support

---

## 🔧 Customization

### Extending Components
```tsx
// Create app-specific variants
const PropertyHeroBanner = (props) => (
  <HeroBanner
    {...props}
    backgroundType="kenyan-landscape"
    primaryColor="#059669"
    emoji="🏠"
  />
);

// Custom stat presets
export const MyAppStatsPreset = [
  { value: '2.5K', label: 'Properties', icon: '🏠' },
  { value: '12', label: 'Counties', icon: '📍' },
];
```

### Theme Customization
```tsx
// Override default colors
const customTheme = {
  primary: '#your-brand-color',
  secondary: '#your-accent-color',
  background: 'your-background-pattern',
};
```

This component library ensures consistent, high-quality user experiences across all screens in the MyNyumbApp while maintaining excellent performance and accessibility standards.

