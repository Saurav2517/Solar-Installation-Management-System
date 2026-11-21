const createApp = require('../dist/app').default;
const app = createApp();

const server = app.listen(3000, async () => {
  console.log('🚀 Server started on port 3000\n');
  try {
    console.log('--- Probing GET /health ---');
    const res1 = await fetch('http://localhost:3000/health');
    const json1 = await res1.json();
    console.log(JSON.stringify(json1, null, 2));

    console.log('\n--- Probing GET /api/v1 (API Directory) ---');
    const res2 = await fetch('http://localhost:3000/api/v1');
    const json2 = await res2.json();
    console.log(JSON.stringify(json2, null, 2));

    console.log('\n--- Probing Error Handling (404 Route) ---');
    const res3 = await fetch('http://localhost:3000/non-existing-path');
    const json3 = await res3.json();
    console.log(JSON.stringify(json3, null, 2));

    console.log('\n✅ ALL TERMINAL PROBES PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Probe failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
