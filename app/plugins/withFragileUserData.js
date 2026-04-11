const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo config plugin: 为 Android 添加 android:hasFragileUserData="true"
 * 卸载 App 时系统会提示用户是否保留数据
 */
function withFragileUserData(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (application) {
      application.$['android:hasFragileUserData'] = 'true';
    }
    return config;
  });
}

module.exports = withFragileUserData;
