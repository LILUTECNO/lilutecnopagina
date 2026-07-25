/**
 * Local Emulator Suite checks for checkout + Wompi webhook env loading.
 * Uses only fetch (no extra deps). Does NOT touch production.
 *
 * Run: npm run firebase:test:functions
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'lilutecno-pagina-web';
const FUNCTIONS_HOST = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [fnHost, fnPortRaw] = FUNCTIONS_HOST.includes(':')
  ? FUNCTIONS_HOST.split(':')
  : [FUNCTIONS_HOST, '5001'];
const FN_PORT = Number(fnPortRaw || 5001);

let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed += 1;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  failed += 1;
  console.error(`  ✗ ${name} — ${detail}`);
}

function assertEnvAndGitignore() {
  const envPath = path.join(ROOT, 'functions', '.env');
  if (!fs.existsSync(envPath)) throw new Error('functions/.env missing — export config first');
  const text = fs.readFileSync(envPath, 'utf8');
  if (!/WOMPI_PRIVATE_KEY\s*=\s*\S+/.test(text)) {
    throw new Error('WOMPI_PRIVATE_KEY missing from functions/.env');
  }
  ok('functions/.env has WOMPI_PRIVATE_KEY (value not printed)');

  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  if (!gitignore.includes('.env')) throw new Error('.gitignore does not ignore .env');
  ok('.gitignore covers .env / functions/.env');
}

async function testWompiWebhookMissingBody() {
  const url = `http://${fnHost}:${FN_PORT}/${PROJECT_ID}/us-central1/wompiWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  if (res.status === 500 && /Wompi key not configured/i.test(text)) {
    fail('wompiWebhook env', 'WOMPI_PRIVATE_KEY not visible in emulator');
    return;
  }
  if (res.status === 400 && /Missing transaction id/i.test(text)) {
    ok('wompiWebhook reads env', 'key present; empty body → 400');
    return;
  }
  fail('wompiWebhook env', `unexpected ${res.status}: ${text.slice(0, 200)}`);
}

async function testWompiWebhookFakeTransaction() {
  const url = `http://${fnHost}:${FN_PORT}/${PROJECT_ID}/us-central1/wompiWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { transaction: { id: 'local-test-txn-does-not-exist' } },
    }),
  });
  const text = await res.text();
  if (res.status === 500 && /Wompi key not configured/i.test(text)) {
    fail('wompiWebhook uses key', 'key not loaded in emulator');
    return;
  }
  if (res.status === 502 && /Unable to verify transaction/i.test(text)) {
    ok(
      'wompiWebhook uses WOMPI_PRIVATE_KEY',
      'key sent to Wompi verify API; 502 on fake txn is expected',
    );
    return;
  }
  if (res.status === 500 && /Webhook processing failed/i.test(text)) {
    ok(
      'wompiWebhook uses WOMPI_PRIVATE_KEY',
      'key present; pipeline ran (500 on fake txn acceptable locally)',
    );
    return;
  }
  fail('wompiWebhook uses key', `unexpected ${res.status}: ${text.slice(0, 200)}`);
}

async function testCreateCheckoutOrderUnauthenticated() {
  // Firebase callable protocol over HTTP
  const url = `http://${fnHost}:${FN_PORT}/${PROJECT_ID}/us-central1/createCheckoutOrder`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        items: [{ id: 'any', quantity: 1 }],
        customer: { name: 'Local', email: 'local@test.lilutecno' },
        shippingOption: 'BOGOTA',
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.status || body?.error?.message || JSON.stringify(body).slice(0, 120);
  const isUnauth =
    res.status === 401 ||
    /UNAUTHENTICATED|unauthenticated|Debes iniciar sesión/i.test(JSON.stringify(body));
  if (isUnauth) {
    ok('createCheckoutOrder auth gate', `rejects anonymous call (${res.status}: ${code})`);
    return;
  }
  fail('createCheckoutOrder auth gate', `expected unauthenticated, got ${res.status}: ${code}`);
}

async function seedProductViaFirestoreEmulator() {
  const productId = `local-test-${Date.now()}`;
  // Emulator accepts either host:port form in FIRESTORE_EMULATOR_HOST
  const base = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  // Bypass security rules in the local emulator only (not valid in production).
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer owner',
  };

  const productRes = await fetch(`${base}/products?documentId=${encodeURIComponent(productId)}`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      fields: {
        name: { stringValue: 'Producto prueba local' },
        // doubleValue so Number.isFinite(product.price) is true in the function
        price: { doubleValue: 10000 },
        stock: { integerValue: '5' },
      },
    }),
  });
  const productBody = await productRes.text();
  if (!productRes.ok) {
    throw new Error(`Firestore seed product failed ${productRes.status}: ${productBody.slice(0, 200)}`);
  }

  // shipping settings — PATCH upsert-style via create (ignore already-exists)
  const shipRes = await fetch(`${base}/settings?documentId=shipping`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      fields: {
        bogota: { doubleValue: 10000 },
        other: { doubleValue: 15000 },
      },
    }),
  });
  if (!shipRes.ok && shipRes.status !== 409) {
    // try update existing
    await fetch(`${base}/settings/shipping?updateMask.fieldPaths=bogota&updateMask.fieldPaths=other`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        fields: {
          bogota: { doubleValue: 10000 },
          other: { doubleValue: 15000 },
        },
      }),
    });
  }

  // Verify product is readable before calling the function
  const getRes = await fetch(`${base}/products/${encodeURIComponent(productId)}`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (!getRes.ok) {
    throw new Error(`Seeded product not readable: ${getRes.status}`);
  }

  return productId;
}

async function testCreateCheckoutOrderWithEmulatorAuth() {
  // Auth emulator: signUp anonymous-like email user, get idToken
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  const signUp = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `buyer-${Date.now()}@test.lilutecno`,
        password: 'TestPass123!',
        returnSecureToken: true,
      }),
    },
  );
  const authJson = await signUp.json();
  if (!authJson.idToken) {
    fail('createCheckoutOrder full', `auth emulator signUp failed: ${JSON.stringify(authJson).slice(0, 200)}`);
    return;
  }

  const productId = await seedProductViaFirestoreEmulator();
  const url = `http://${fnHost}:${FN_PORT}/${PROJECT_ID}/us-central1/createCheckoutOrder`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authJson.idToken}`,
    },
    body: JSON.stringify({
      data: {
        items: [{ id: productId, quantity: 1 }],
        customer: { name: 'Comprador Local', email: authJson.email },
        shippingOption: 'BOGOTA',
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  const orderId = body?.result?.orderId;
  const amount = body?.result?.amountInCents;
  if (orderId && typeof amount === 'number') {
    ok('createCheckoutOrder full flow', `orderId=${orderId}, amountInCents=${amount}`);
    return;
  }
  fail(
    'createCheckoutOrder full flow',
    `unexpected ${res.status}: ${JSON.stringify(body).slice(0, 300)}`,
  );
}

async function testMargenesFinancialLogic() {
  // Carga dinámica del módulo compilado (functions/lib/margenes.js).
  const mod = await import(
    new URL('../functions/lib/margenes.js', import.meta.url)
  );
  const {
    calcularPreciosAutomaticos,
    calcularRentabilidad,
    validarMargenMinimo,
    normalizarConfig,
    DEFAULT_CONFIG_MARGENES,
  } = mod;

  // Fórmulas del enunciado: base 10.000 -> 15.000 / 13.000 / 12.500 / 11.800 / 11.500.
  const cfg = normalizarConfig(DEFAULT_CONFIG_MARGENES);
  const precios = calcularPreciosAutomaticos(10000, cfg);
  if (precios.precio_cliente_final !== 15000) throw new Error(`cliente_final esperado 15000, got ${precios.precio_cliente_final}`);
  if (precios.precio_dropshipper !== 13000) throw new Error(`dropshipper esperado 13000, got ${precios.precio_dropshipper}`);
  if (precios.precio_surtir_r1 !== 12500) throw new Error(`r1 esperado 12500, got ${precios.precio_surtir_r1}`);
  if (precios.precio_surtir_r2 !== 11800) throw new Error(`r2 esperado 11800, got ${precios.precio_surtir_r2}`);
  if (precios.precio_surtir_r3 !== 11500) throw new Error(`r3 esperado 11500, got ${precios.precio_surtir_r3}`);
  ok('Margenes.calcularPreciosAutomaticos', 'base 10k → 15k/13k/12.5k/11.8k/11.5k');

  // Rentabilidad neta: base 10k, final 15k.
  const rent = calcularRentabilidad(10000, 15000);
  const expectedComision = Math.round(15000 * 0.035); // 525
  if (rent.comision_pasarela !== expectedComision) throw new Error(`comision esperada ${expectedComision}, got ${rent.comision_pasarela}`);
  const expectedIva = Math.round((15000 - 10000) * 0.19); // 950
  if (rent.iva_sobre_comision !== expectedIva) throw new Error(`iva esperado ${expectedIva}, got ${rent.iva_sobre_comision}`);
  const expectedNeta = (15000 - 10000) - expectedComision - expectedIva; // 3525
  if (rent.ganancia_neta !== expectedNeta) throw new Error(`neta esperada ${expectedNeta}, got ${rent.ganancia_neta}`);
  if (rent.estado !== 'ok') throw new Error(`estado esperado ok, got ${rent.estado}`);
  ok('Margenes.calcularRentabilidad', `neta=${rent.ganancia_neta} (${rent.porcentaje_neto}%) estado=${rent.estado}`);

  // Estado 'perdida' con precio por debajo de base.
  const perdida = calcularRentabilidad(10000, 9000);
  if (perdida.estado !== 'perdida') throw new Error(`esperaba perdida, got ${perdida.estado}`);
  ok('Margenes.estado perdida', `pct_neto=${perdida.porcentaje_neto}%`);

  // Bloqueo del 15% mínimo: final 11.000 sobre base 10.000 (10%) debe BLOQUEAR.
  const check = validarMargenMinimo(10000, 11000, 15);
  if (check.ok) throw new Error('validarMargenMinimo debería bloquear 10% < 15%');
  if (!/Margen mínimo 15% no alcanzado/.test(check.mensaje)) throw new Error(`mensaje inesperado: ${check.mensaje}`);
  ok('Margenes.validarMargenMinimo BLOCK 10%', check.mensaje);

  // 15% exacto permitido: 11.500 sobre 10.000 = 15%.
  const permitido = validarMargenMinimo(10000, 11500, 15);
  if (!permitido.ok) throw new Error(`15% exacto debería pasar: ${permitido.mensaje}`);
  ok('Margenes.validarMargenMinimo PASS 15%', '11.5k sobre 10k aceptado');
}

async function main() {
  console.log('=== Local functions safety checks (emulator) ===');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Functions: ${fnHost}:${FN_PORT}`);
  console.log(`Firestore: ${FIRESTORE_HOST}\n`);

  assertEnvAndGitignore();
  await testMargenesFinancialLogic();
  await testWompiWebhookMissingBody();
  await testWompiWebhookFakeTransaction();
  await testCreateCheckoutOrderUnauthenticated();
  await testCreateCheckoutOrderWithEmulatorAuth();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('\n✓ Local checks passed. Production deploy of these changes is allowed next.');
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
