# LinkApp

A comprehensive React Native application for property, jobs, services, and dating services in Kenya.

## 🚀 Current Status

✅ **Dependencies**: All core dependencies are properly installed and configured
✅ **Supabase Integration**: Authentication and database services set up with demo mode
✅ **Redux Store**: Complete state management with all slices configured
✅ **Navigation**: Multi-tab navigation with auth flow
✅ **Styling**: Migrated from NativeWind to StyleSheet with the theme system
✅ **TypeScript**: Fully typed with proper interfaces

## 🏗️ Architecture

- **Frontend**: React Native with Expo 53
- **State Management**: Redux Toolkit with async thunks
- **Backend**: Supabase (PostgreSQL + Authentication)
- **Navigation**: React Navigation 6
- **Styling**: React Native StyleSheet with custom theme system
- **TypeScript**: Full type safety throughout the application

## 📱 Features

### Core Modules
1. **Property** - Real estate listings (rent/sale)
2. **Jobs** - Job board with skill-based matching
3. **Services** - Service provider marketplace
4. **Date Mi** - Age-verified dating platform

### Technical Features
- Multi-role user profiles per module
- Secure authentication with demo mode
- Deep linking support
- Image upload and management
- Real-time messaging
- Escrow payment system
- Content moderation
- Age verification for dating features

## 🛠️ Setup

### Prerequisites
- Node.js 20.19.5+ (managed with Volta)
- npm or yarn
- Expo CLI
- React Native development environment

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo>
   cd MyNyumbApp
   npm install
   ```

2. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your Supabase credentials (optional for demo mode)
   ```

3. **Start development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on device/simulator**
   - Scan QR code with Expo Go (mobile)
   - Press 'w' for web development
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator

## 🎨 Styling System

The app uses a custom theme system with StyleSheet instead of NativeWind:

```jsx
import { colors, typography, spacing } from './theme';
import { createFlexStyles, createColorStyles } from './utils/styleHelpers';

// Use pre-defined style helpers
<View style={[createFlexStyles.flex1, createColorStyles.bgWhite]}>
  <Text style={createColorStyles.textPrimary600}>Hello World</Text>
</View>
```

See [NativeWind Migration Guide](./docs/NativeWind-to-StyleSheet-Migration.md) for detailed conversion instructions.

## 🗂️ Project Structure

```
MyNyumbApp/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── property/       # Property-specific components
│   ├── jobs/          # Jobs-specific components
│   └── ...
├── navigation/         # Navigation configuration
├── screens/           # Screen components organized by module
├── redux/            # State management
│   ├── slices/       # Redux slices for each module
│   └── hooks.ts      # Typed Redux hooks
├── services/         # API and external service integrations
├── theme/           # Design system and styling
├── types/           # TypeScript type definitions
├── utils/           # Helper functions and utilities
├── config/          # App configuration
└── docs/           # Documentation
```

## 🔐 Authentication

The app supports both real Supabase authentication and demo mode:

- **Demo Login**: `demo@test.com` / `demo123`
- **Real Authentication**: Configure Supabase credentials in `.env`
- **Multi-role Profiles**: Users can have different roles in each module

## 🧪 Development

### Demo Mode
- App runs in demo mode without Supabase configuration
- Demo user profile automatically created
- All core functionality available for testing

### Testing Scripts
```bash
# Test Supabase connection
npm run test:supabase

# Test environment variables
npm run test:env

# Initialize Supabase infrastructure
npm run init:supabase
```

### Available Scripts
- `npm start` - Start Expo development server
- `npm run dev` - Alias for start
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS  
- `npm run web` - Run on web

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow the established folder structure
- Use the theme system for consistent styling
- Implement proper error handling
- Add loading states for async operations

### State Management
- Use Redux slices for module-specific state
- Implement async thunks for API calls
- Type all actions and state properly
- Keep state normalized when possible

### Components
- Create reusable components in `components/common/`
- Module-specific components in respective folders
- Use StyleSheet instead of inline styles
- Implement proper prop types

## 🚨 Known Issues

- `expo-document-picker` version mismatch (doesn't affect core functionality)
- Some components still use NativeWind (gradual migration in progress)

## 🤝 Contributing

1. Follow the established code patterns
2. Use the theme system for styling
3. Add TypeScript types for new features
4. Test in both demo and real Supabase modes
5. Update documentation for significant changes

## 📄 License

[Your License Here]

## 📞 Support

For development questions or issues, refer to:
- [Migration Guide](./docs/NativeWind-to-StyleSheet-Migration.md)
- Component examples in the codebase
- Redux patterns in existing slices

---

**Status**: ✅ Ready for development with proper dependencies, Supabase integration, and StyleSheet migration in progress.
