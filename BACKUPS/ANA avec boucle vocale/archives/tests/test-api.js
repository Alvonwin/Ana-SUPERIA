#!/usr/bin/env node
/**
 * Test automatique des API endpoints Ana
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3338';
const endpoints = [
  // Core
  { method: 'GET', path: '/health', name: 'Health Check' },
  { method: 'GET', path: '/api/stats', name: 'Stats' },
  { method: 'GET', path: '/api/llms', name: 'List LLMs' },
  { method: 'GET', path: '/api/memory', name: 'Get Memory' },

  // Memory/ChromaDB
  { method: 'GET', path: '/api/memory/semantic/stats', name: 'ChromaDB Stats' },

  // Daily Art
  { method: 'GET', path: '/api/art/status', name: 'Art Status' },

  // Research
  { method: 'GET', path: '/api/research/status', name: 'Research Status' },

  // Services
  { method: 'GET', path: '/api/services/status', name: 'Services Status' },

  // Tools
  { method: 'GET', path: '/api/tools/bash/processes', name: 'Bash Processes' },

  // Autonomous
  { method: 'GET', path: '/api/chat/autonomous/stats', name: 'Autonomous Stats' }
];

async function testEndpoints() {
  console.log('🧪 Testing Ana API Endpoints...\n');

  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: BASE_URL + endpoint.path,
        timeout: 2000
      });

      if (response.status === 200) {
        console.log(`✅ ${endpoint.name}: OK`);
        passed++;
      } else {
        console.log(`⚠️ ${endpoint.name}: Status ${response.status}`);
        failed++;
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Backend not running on port 3338');
        process.exit(1);
      }
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('✅ All endpoints working!');
  }
}

testEndpoints();