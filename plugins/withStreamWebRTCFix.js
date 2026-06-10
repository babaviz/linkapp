const { withProjectBuildGradle } = require('@expo/config-plugins');

const ANDROID_WEBRTC_VERSION = '1.3.9';
const MARKER = 'withStreamWebRTCFix';

/**
 * Forces Stream WebRTC Android to a stable (non-SNAPSHOT) version.
 * This avoids resolving io.getstream:stream-webrtc-android:*-SNAPSHOT during EAS builds.
 * Version 1.3.9 is the latest stable release (1.3.10-SNAPSHOT doesn't exist).
 */
module.exports = function withStreamWebRTCFix(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes(MARKER)) {
      return config;
    }

    const resolutionBlock = `
// ${MARKER}
subprojects {
  afterEvaluate { project ->
    project.configurations.all {
      resolutionStrategy.eachDependency { details ->
        if (details.requested.group == 'io.getstream' && 
            details.requested.name == 'stream-webrtc-android' &&
            (details.requested.version?.contains('SNAPSHOT') || details.requested.version == null)) {
          details.useVersion '${ANDROID_WEBRTC_VERSION}'
          details.because 'Force stable version - SNAPSHOT not available in Maven repos'
        }
      }
    }
  }
}
`;

    contents += resolutionBlock;
    config.modResults.contents = contents;

    return config;
  });
};
