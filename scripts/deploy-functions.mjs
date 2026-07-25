/**
 * Stable Cloud Functions deploy for lilutecno-pagina-web.
 *
 * Why this exists:
 * The default Compute Engine service account
 *   907793758364-compute@developer.gserviceaccount.com
 * was deleted and cannot be undeleted (past 30 days).
 *
 * Temporary patches applied to firebase-tools during deploy only:
 * 1) buildConfig.serviceAccount → custom SA (Gen2 container builds)
 * 2) Eventarc IAM bindings → custom SA instead of missing Compute default
 *
 * Runtime + build identity:
 *   firebase-adminsdk-fbsvc@lilutecno-pagina-web.iam.gserviceaccount.com
 *
 * Usage (from repo root):
 *   npm run firebase:deploy:functions
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT_ID = 'lilutecno-pagina-web';
const SERVICE_ACCOUNT = 'firebase-adminsdk-fbsvc@lilutecno-pagina-web.iam.gserviceaccount.com';
const MARKER_BUILD = '/* lilutecno-build-sa-patch */';
const MARKER_IAM = '/* lilutecno-eventarc-iam-patch */';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd} ${args.join(' ')}`);
  }
}

function findFirebaseToolsLibFile(relativeUnderLib) {
  const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));
  const candidates = [];

  try {
    const pkgJson = requireFromRoot.resolve('firebase-tools/package.json');
    candidates.push(path.join(path.dirname(pkgJson), 'lib', relativeUnderLib));
  } catch {
    // not installed locally
  }

  const globalBase = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools')
    : path.join(process.env.HOME || '', '.npm-global', 'lib', 'node_modules', 'firebase-tools');
  candidates.push(path.join(globalBase, 'lib', relativeUnderLib));

  try {
    const npmRoot = spawnSync('npm', ['root', '-g'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (npmRoot.status === 0 && npmRoot.stdout) {
      candidates.push(
        path.join(npmRoot.stdout.trim(), 'firebase-tools', 'lib', relativeUnderLib),
      );
    }
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not locate firebase-tools/lib/${relativeUnderLib}. Install firebase-tools (npm i -g firebase-tools).`,
  );
}

function applyBuildServiceAccountPatch(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  if (original.includes(MARKER_BUILD)) {
    return { original, alreadyPatched: true };
  }

  const needle = `const gcfFunction = {
        name: backend.functionName(endpoint),
        buildConfig: {
            runtime: endpoint.runtime,
            entryPoint: endpoint.entryPoint,
            source: {
                storageSource: (_a = endpoint.source) === null || _a === void 0 ? void 0 : _a.storageSource,
            },
            environmentVariables: {},
        },
        serviceConfig: {},
    };`;

  if (!original.includes(needle)) {
    throw new Error(
      `Unexpected firebase-tools cloudfunctionsv2.js shape at ${filePath}. ` +
        'Update scripts/deploy-functions.mjs for this CLI version, or restore the default Compute SA via Google Support.',
    );
  }

  const injection = `const gcfFunction = {
        name: backend.functionName(endpoint),
        buildConfig: {
            runtime: endpoint.runtime,
            entryPoint: endpoint.entryPoint,
            source: {
                storageSource: (_a = endpoint.source) === null || _a === void 0 ? void 0 : _a.storageSource,
            },
            environmentVariables: {},
        },
        serviceConfig: {},
    };
    ${MARKER_BUILD}
    // Project default Compute SA is missing; force custom build SA when runtime SA is set.
    if (endpoint.serviceAccount) {
        const saEmail = endpoint.serviceAccount.includes("@")
            ? endpoint.serviceAccount
            : endpoint.serviceAccount;
        gcfFunction.buildConfig.serviceAccount = \`projects/\${endpoint.project}/serviceAccounts/\${saEmail}\`;
    }`;

  const patched = original.replace(needle, injection);
  fs.writeFileSync(filePath, patched, 'utf8');
  return { original, alreadyPatched: false };
}

/**
 * Firebase CLI binds roles/run.invoker + roles/eventarc.eventReceiver to the
 * default Compute SA when first enabling Eventarc. That SA is deleted here, so
 * setIamPolicy fails. Route those bindings to our custom admin SA instead.
 */
function applyEventarcIamPatch(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  if (original.includes(MARKER_IAM)) {
    return { original, alreadyPatched: true };
  }

  const needle =
    'const defaultComputeServiceAgent = `serviceAccount:${await gce.getDefaultServiceAccount(projectNumber)}`;';
  if (!original.includes(needle)) {
    throw new Error(
      `Unexpected firebase-tools checkIam.js shape at ${filePath}. ` +
        'Update scripts/deploy-functions.mjs for this CLI version.',
    );
  }

  const replacement =
    `${MARKER_IAM}\n` +
    `    // Default Compute SA missing; use Firebase Admin SDK SA for Eventarc IAM.\n` +
    `    const defaultComputeServiceAgent = \`serviceAccount:${SERVICE_ACCOUNT}\`;`;

  const patched = original.replace(needle, replacement);
  fs.writeFileSync(filePath, patched, 'utf8');
  return { original, alreadyPatched: false };
}

function restoreFile(filePath, original, alreadyPatched) {
  if (alreadyPatched) return;
  fs.writeFileSync(filePath, original, 'utf8');
}

function assertSafeToDeploy() {
  const envPath = path.join(ROOT, 'functions', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Missing functions/.env. Run: npx firebase functions:config:export  (or restore WOMPI keys into functions/.env)',
    );
  }
  const envText = fs.readFileSync(envPath, 'utf8');
  if (!/WOMPI_PRIVATE_KEY\s*=\s*\S+/.test(envText)) {
    throw new Error('functions/.env is missing WOMPI_PRIVATE_KEY — aborting to protect payments.');
  }

  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  if (!gitignore.includes('functions/.env') && !gitignore.match(/(^|\/)\.env\b/m)) {
    throw new Error('.gitignore must ignore functions/.env before deploy.');
  }
}

function main() {
  console.log('=== Lilutecno stable functions deploy ===');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Service account: ${SERVICE_ACCOUNT}`);

  assertSafeToDeploy();

  console.log('\n[1/4] Building functions TypeScript...');
  run('npm', ['run', 'build'], { cwd: path.join(ROOT, 'functions') });

  const buildSaFile = findFirebaseToolsLibFile(path.join('gcp', 'cloudfunctionsv2.js'));
  const eventarcIamFile = findFirebaseToolsLibFile(path.join('deploy', 'functions', 'checkIam.js'));

  console.log(`\n[2/4] Patching firebase-tools for custom build SA:\n  ${buildSaFile}`);
  const buildPatch = applyBuildServiceAccountPatch(buildSaFile);
  console.log(buildPatch.alreadyPatched ? '  (patch already present — reusing)' : '  (temporary patch applied)');

  console.log(`\n[3/4] Patching firebase-tools Eventarc IAM for custom SA:\n  ${eventarcIamFile}`);
  const iamPatch = applyEventarcIamPatch(eventarcIamFile);
  console.log(iamPatch.alreadyPatched ? '  (patch already present — reusing)' : '  (temporary patch applied)');

  try {
    console.log('\n[4/4] Deploying functions only (hosting/firestore untouched)...');
    run('npx', ['firebase', 'deploy', '--only', 'functions', `--project=${PROJECT_ID}`]);
    console.log('\n✓ Functions deploy complete.');
  } finally {
    restoreFile(buildSaFile, buildPatch.original, buildPatch.alreadyPatched);
    restoreFile(eventarcIamFile, iamPatch.original, iamPatch.alreadyPatched);
    if (!buildPatch.alreadyPatched || !iamPatch.alreadyPatched) {
      console.log('Restored original firebase-tools files.');
    }
  }
}

try {
  main();
} catch (err) {
  console.error('\n✗ Deploy aborted:', err.message || err);
  process.exit(1);
}
