/* Injects a release signingConfig (driven by environment variables) into the
   Capacitor-generated android/app/build.gradle, and stamps versionCode /
   versionName. Run in CI *after* `npx cap add android`.
   Env used at BUILD time by Gradle:
     KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
   Env used now (optional):
     ANDROID_VERSION_CODE, ANDROID_VERSION_NAME
*/
const fs = require('fs');
const path = 'android/app/build.gradle';

let src = fs.readFileSync(path, 'utf8');

if (src.includes('signingConfigs.release')) {
  console.log('Signing config already present — skipping.');
} else {
  // 1) add `signingConfig signingConfigs.release` inside buildTypes.release
  //    (the only `release {` present before we add signingConfigs).
  if (!/release\s*\{/.test(src)) {
    throw new Error('Could not find a `release {` buildType block in build.gradle');
  }
  src = src.replace(/release\s*\{/, 'release {\n            signingConfig signingConfigs.release');

  // 2) add a signingConfigs block just before buildTypes { ... }
  const signingBlock =
    "signingConfigs {\n" +
    "        release {\n" +
    "            storeFile file(System.getenv('KEYSTORE_PATH'))\n" +
    "            storePassword System.getenv('KEYSTORE_PASSWORD')\n" +
    "            keyAlias System.getenv('KEY_ALIAS')\n" +
    "            keyPassword System.getenv('KEY_PASSWORD')\n" +
    "        }\n" +
    "    }\n\n" +
    "    buildTypes {";
  if (!src.includes('buildTypes {')) {
    throw new Error('Could not find `buildTypes {` in build.gradle');
  }
  src = src.replace('buildTypes {', signingBlock);
  console.log('Injected release signingConfig.');
}

// 3) stamp version code / name if provided
if (process.env.ANDROID_VERSION_CODE) {
  src = src.replace(/versionCode\s+\d+/, `versionCode ${process.env.ANDROID_VERSION_CODE}`);
}
if (process.env.ANDROID_VERSION_NAME) {
  src = src.replace(/versionName\s+"[^"]*"/, `versionName "${process.env.ANDROID_VERSION_NAME}"`);
}

fs.writeFileSync(path, src);
console.log('build.gradle updated.');
