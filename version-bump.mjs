import { readFileSync, writeFileSync } from "fs";

// When run via `npm version`, npm sets npm_package_version to the new version.
// When run directly in CI, TARGET_VERSION must be set in the environment.
const targetVersion = process.env.TARGET_VERSION ?? process.env.npm_package_version;

if (!targetVersion) {
	console.error(
		"No target version specified. Set the TARGET_VERSION environment variable or run via `npm version`."
	);
	process.exit(1);
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, "\t") + "\n");

// Update manifest.json
const manifest = readJson("manifest.json");
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeJson("manifest.json", manifest);

// Update versions.json with the new version → minAppVersion mapping
const versions = readJson("versions.json");
versions[targetVersion] = minAppVersion;
writeJson("versions.json", versions);

// When invoked directly (not through the npm version lifecycle), also update package.json.
// The npm version command updates package.json itself, so we skip it in that case.
if (!process.env.npm_package_version) {
	const pkg = readJson("package.json");
	pkg.version = targetVersion;
	writeJson("package.json", pkg);
}

console.log(`Version bumped to ${targetVersion}`);
