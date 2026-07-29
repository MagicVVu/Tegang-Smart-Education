const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(workspaceRoot, "packages")
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@tegang/types": path.resolve(workspaceRoot, "packages/types"),
  "@tegang/mock-data": path.resolve(workspaceRoot, "packages/mock-data"),
  "@tegang/business-rules": path.resolve(
    workspaceRoot,
    "packages/business-rules"
  ),
  "@tegang/design-tokens": path.resolve(
    workspaceRoot,
    "packages/design-tokens"
  ),
  "@tegang/shared-utils": path.resolve(workspaceRoot, "packages/shared-utils")
};

module.exports = config;
