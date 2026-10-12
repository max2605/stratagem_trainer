import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) throw new Error('Usage: node scripts/platform-prepare.mjs android|ios');
const native = path.join(root, platform === 'ios' ? 'iphone' : 'android', 'sourcecode', 'native');
const exists = await access(native).then(() => true, () => false);
function run(args) {
  const command = path.join(root, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');
  const result = spawnSync(process.execPath, [command, ...args], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!exists) run(['add', platform]);
run(['sync', platform]);

if (platform === 'ios') {
  const resources = path.join(native, 'App', 'App');
  await mkdir(resources, { recursive: true });
  const privacy = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>NSPrivacyTracking</key><false/>\n<key>NSPrivacyCollectedDataTypes</key><array/>\n<key>NSPrivacyAccessedAPITypes</key><array><dict>\n<key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string>\n<key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array>\n</dict></array>\n</dict></plist>\n`;
  await writeFile(path.join(resources, 'PrivacyInfo.xcprivacy'), privacy);
  const projectFile = path.join(native, 'App', 'App.xcodeproj', 'project.pbxproj');
  let project = (await readFile(projectFile, 'utf8')).replace(/\r\n/g, '\n');
  if (!project.includes('/* PrivacyInfo.xcprivacy */')) {
    project = project
      .replace('/* Begin PBXBuildFile section */', '/* Begin PBXBuildFile section */\n\t\tA17E00010000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A17E00010000000000000002 /* PrivacyInfo.xcprivacy */; };')
      .replace('/* Begin PBXFileReference section */', '/* Begin PBXFileReference section */\n\t\tA17E00010000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };')
      .replace('504EC3061FED79650016851F /* App */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (', '504EC3061FED79650016851F /* App */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\tA17E00010000000000000002 /* PrivacyInfo.xcprivacy */,')
      .replace(/(isa = PBXResourcesBuildPhase;[\s\S]*?files = \()/, '$1\n\t\t\t\tA17E00010000000000000001 /* PrivacyInfo.xcprivacy in Resources */,');
    await writeFile(projectFile, project);
  }
  const infoFile = path.join(native, 'App', 'App', 'Info.plist');
  let info = await readFile(infoFile, 'utf8');
  for (const key of ['UIFileSharingEnabled', 'LSSupportsOpeningDocumentsInPlace']) {
    if (!info.includes(`<key>${key}</key>`)) info = info.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t<true/>\n</dict>\n</plist>\n`);
  }
  await writeFile(infoFile, info);
}
