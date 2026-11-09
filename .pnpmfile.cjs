function readPackage(pkg) {
  if (pkg.name === 'drizzle-orm') {
    delete pkg.peerDependencies?.['expo-sqlite'];
    delete pkg.peerDependenciesMeta?.['expo-sqlite'];
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
