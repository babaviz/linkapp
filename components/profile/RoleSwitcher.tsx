import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setCurrentRole, switchModuleRole } from '../../redux/slices/userSlice';

interface RoleSwitcherProps {
  module: 'property' | 'jobs' | 'services';
  roles: { value: string; label: string }[];
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
  style?: any;
  colors?: {
    active: string;
    inactive: string;
    activeText: string;
    inactiveText: string;
  };
}

export default function RoleSwitcher({
  module,
  roles,
  selectedRole,
  onRoleChange,
  style,
  colors = {
    active: '#10B981', // Default green
    inactive: '#F3F4F6',
    activeText: '#FFFFFF',
    inactiveText: '#6B7280',
  }
}: RoleSwitcherProps) {
  const dispatch = useAppDispatch();
  const { profileSwitchContext } = useAppSelector((state) => state.user);

  const currentRole = selectedRole || profileSwitchContext.currentRole;

  const handleRoleSwitch = async (role: string) => {
    try {
      // Update local state immediately for UI responsiveness
      dispatch(setCurrentRole(role));
      
      // Update the module-specific profile
      await dispatch(switchModuleRole({ module, role })).unwrap();
      
      // Call parent callback if provided
      onRoleChange?.(role);
    } catch (error) {
      
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.toggleContainer}>
        {roles.map((role, index) => {
          const isActive = currentRole === role.value;
          const isFirst = index === 0;
          const isLast = index === roles.length - 1;
          
          return (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: isActive ? colors.active : colors.inactive,
                },
                isFirst && styles.firstButton,
                isLast && styles.lastButton,
              ]}
              onPress={() => handleRoleSwitch(role.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: isActive ? colors.activeText : colors.inactiveText,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
              >
                {role.label}
              </Text>
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
    marginVertical: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 2,
    minWidth: 200,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  firstButton: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  lastButton: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
