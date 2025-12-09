/**
 * ANA INTEGRATION TEST SUITE
 * Tests backend-frontend communication
 *
 * Run: node test_integration.js
 */

const axios = require('axios');
const io = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3338';
const TEST_TIMEOUT = 30000; // 30s

console.log('\n🧪 ========================================');
console.log('   ANA INTEGRATION TEST SUITE');
console.log('========================================\n');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

async function test(name, testFn) {
  testsRun++;
  process.stdout.write(`⏳ ${name}... `);

  try {
    await testFn();
    testsPassed++;
    console.log('✅ PASS');
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL: ${error.message}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('📋 Testing Backend API Endpoints\n');

  // Test 1: Health check
  await test('Health endpoint (/health)', async () => {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    if (response.data.status !== 'ok') throw new Error('Health check failed');
  });

  // Test 2: Stats endpoint
  await test('Stats endpoint (/api/stats)', async () => {
    const response = await axios.get(`${BACKEND_URL}/api/stats`, { timeout: 5000 });
    if (!response.data.memory) throw new Error('No memory stats');
    if (!response.data.llm_usage) throw new Error('No LLM usage stats');
  });

  // Test 3: LLMs list
  await test('LLMs list (/api/llms)', async () => {
    const response = await axios.get(`${BACKEND_URL}/api/llms`, { timeout: 5000 });
    if (!response.data.configured) throw new Error('No configured LLMs');
    if (!response.data.available) throw new Error('No available LLMs');
  });

  // Test 4: Memory endpoint
  await test('Memory endpoint (/api/memory)', async () => {
    const response = await axios.get(`${BACKEND_URL}/api/memory`, { timeout: 5000 });
    if (!response.data.stats) throw new Error('No memory stats');
  });

  // Test 5: Memory search
  await test('Memory search (/api/memory/search)', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/memory/search`, {
      query: 'test'
    }, { timeout: 5000 });
    if (response.data.results === undefined) throw new Error('No search results');
  });

  console.log('\n📋 Testing WebSocket Communication\n');

  // Test 6: WebSocket connection
  await test('WebSocket connection', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      socket.on('connect', () => {
        socket.close();
        resolve();
      });

      socket.on('connect_error', (error) => {
        socket.close();
        reject(new Error(`Connection failed: ${error.message}`));
      });

      setTimeout(() => {
        socket.close();
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  });

  // Test 7: Chat streaming
  await test('Chat streaming (WebSocket)', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling']
      });

      let modelSelected = false;
      let chunksReceived = 0;
      let completed = false;

      socket.on('connect', () => {
        socket.emit('chat:message', { message: 'Bonjour Ana, réponds juste "OK"' });
      });

      socket.on('chat:model_selected', (data) => {
        modelSelected = true;
        if (!data.model || !data.reason) {
          socket.close();
          reject(new Error('Invalid model_selected data'));
        }
      });

      socket.on('chat:chunk', (data) => {
        chunksReceived++;
      });

      socket.on('chat:complete', (data) => {
        completed = true;
        socket.close();

        if (!modelSelected) {
          reject(new Error('Model not selected'));
        } else if (chunksReceived === 0) {
          reject(new Error('No chunks received'));
        } else {
          resolve();
        }
      });

      socket.on('chat:error', (error) => {
        socket.close();
        reject(new Error(`Chat error: ${error.error}`));
      });

      setTimeout(() => {
        socket.close();
        reject(new Error('Chat timeout (no response in 20s)'));
      }, 20000);
    });
  });

  console.log('\n📋 Testing Tool Calling Endpoints\n');

  // Test 8: File read tool
  await test('File read tool (/api/tools/file/read)', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/tools/file/read`, {
      path: __filename  // Read this test file itself
    }, { timeout: 5000 });

    if (!response.data.success) throw new Error('File read failed');
    if (!response.data.content) throw new Error('No file content');
  });

  // Test 9: File list tool
  await test('File list tool (/api/tools/file/list)', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/tools/file/list`, {
      path: 'E:\\ANA'
    }, { timeout: 5000 });

    if (!response.data.success) throw new Error('File list failed');
    if (!response.data.entries || response.data.entries.length === 0) throw new Error('No files listed');
  });

  // Test 10: Bash execute tool
  await test('Bash execute tool (/api/tools/bash/execute)', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/tools/bash/execute`, {
      command: 'echo "test"',
      timeout: 5000
    }, { timeout: 10000 });

    if (!response.data.success) throw new Error('Bash execute failed');
    if (response.data.stdout === undefined) throw new Error('No bash stdout');
  });

  // Test 11: Search glob tool
  await test('Search glob tool (/api/tools/search/glob)', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/tools/search/glob`, {
      pattern: '*.js',
      basePath: 'E:\\ANA',
      limit: 10
    }, { timeout: 5000 });

    if (!response.data.success) throw new Error('Glob search failed');
  });

  // Test 12: Git status tool
  await test('Git status tool (/api/tools/git/status)', async () => {
    const response = await axios.post(`${BACKEND_URL}/api/tools/git/status`, {
      repoPath: 'E:\\ANA'
    }, { timeout: 5000 });

    // Git status may fail if not a repo, that's OK
    if (response.data.success === undefined) throw new Error('Invalid response format');
  });

  console.log('\n📋 Testing Error Handling\n');

  // Test 13: 404 handler
  await test('404 handler (/nonexistent)', async () => {
    try {
      await axios.get(`${BACKEND_URL}/nonexistent`, { timeout: 5000 });
      throw new Error('Should have returned 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return; // Expected
      }
      throw error;
    }
  });

  // Test 14: Error middleware (invalid request)
  await test('Error middleware (invalid chat request)', async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/chat`, {}, { timeout: 5000 });
      throw new Error('Should have returned 400');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return; // Expected
      }
      throw error;
    }
  });

  // Final report
  console.log('\n========================================');
  console.log('📊 TEST RESULTS');
  console.log('========================================');
  console.log(`Total: ${testsRun}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Check if backend is running
console.log('🔍 Checking if backend is running...\n');
axios.get(`${BACKEND_URL}/health`, { timeout: 5000 })
  .then(() => {
    console.log('✅ Backend detected on port 3338\n');
    runTests().catch((error) => {
      console.error('\n❌ Test suite crashed:', error);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('❌ Backend not reachable on port 3338');
    console.error('   Please start backend first: cd E:\\ANA\\server && node ana-core.cjs\n');
    process.exit(1);
  });
