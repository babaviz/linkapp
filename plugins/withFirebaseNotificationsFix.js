const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseNotificationsFix(config) {
  // SIMPLIFIED VERSION - Just remove conflicting meta-data
  // Firebase will provide its own defaults
  
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    if (androidManifest.manifest && androidManifest.manifest.application) {
      // Ensure tools namespace exists
      androidManifest.manifest.$ = androidManifest.manifest.$ || {};
      androidManifest.manifest.$['xmlns:tools'] =
        androidManifest.manifest.$['xmlns:tools'] ||
        'http://schemas.android.com/tools';

      const application = androidManifest.manifest.application[0];
      
      if (application['meta-data']) {
        // Remove duplicate Firebase notification meta-data
        // Firebase messaging library provides its own defaults
        application['meta-data'] = application['meta-data'].filter((metaData) => {
          const name = metaData.$?.['android:name'];
          return (
            name !== 'com.google.firebase.messaging.default_notification_channel_id' &&
            name !== 'com.google.firebase.messaging.default_notification_color'
          );
        });
      }
    }
    
    return config;
  });

  // Remove conflicting entries from main AndroidManifest during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const mainManifestPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/AndroidManifest.xml'
      );

      if (fs.existsSync(mainManifestPath)) {
        let manifestContent = fs.readFileSync(mainManifestPath, 'utf-8');

        // Ensure tools namespace exists
        if (
          manifestContent.includes('<manifest') &&
          !manifestContent.includes('xmlns:tools="http://schemas.android.com/tools"')
        ) {
          manifestContent = manifestContent.replace(
            /<manifest\b([^>]*)>/,
            '<manifest$1 xmlns:tools="http://schemas.android.com/tools">'
          );
        }

        // Remove conflicting Firebase notification meta-data
        const removeMeta = (name) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Self-closing tag
          const selfClosing = new RegExp(
            `\\s*<meta-data[^>]*android:name\\s*=\\s*"${escaped}"[^>]*/>\\s*\\n?`,
            'g'
          );
          // Expanded tag
          const expanded = new RegExp(
            `\\s*<meta-data[^>]*android:name\\s*=\\s*"${escaped}"[^>]*>\\s*</meta-data>\\s*\\n?`,
            'g'
          );
          manifestContent = manifestContent.replace(selfClosing, '\n');
          manifestContent = manifestContent.replace(expanded, '\n');
        };

        removeMeta('com.google.firebase.messaging.default_notification_color');
        removeMeta('com.google.firebase.messaging.default_notification_channel_id');

        fs.writeFileSync(mainManifestPath, manifestContent);
      }

      return config;
    },
  ]);

  return config;
};
