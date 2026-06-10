const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to remove obsolete useProguard() from build.gradle
 * Firebase Performance adds this during prebuild but it's obsolete in AGP 8.0+
 */
module.exports = function withRemoveUseProguard(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app/build.gradle'
      );

      if (fs.existsSync(buildGradlePath)) {
        let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');

        // Remove useProguard lines (both true and false variants)
        // These are added by @react-native-firebase/perf but are obsolete in AGP 8.0+
        buildGradleContent = buildGradleContent.replace(
          /\s*useProguard\s+(true|false)\s*\n?/g,
          ''
        );

        // Also remove renderscriptDebuggable which is also obsolete
        buildGradleContent = buildGradleContent.replace(
          /\s*renderscriptDebuggable\s+(true|false)\s*\n?/g,
          ''
        );

        fs.writeFileSync(buildGradlePath, buildGradleContent);
        console.log('✅ Removed obsolete useProguard() from build.gradle');
      }

      return config;
    },
  ]);
};
