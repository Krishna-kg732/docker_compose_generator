/**
 * Test script for Dynamic Docker Compose Generator API
 * Tests the new /templates/generate endpoint with various scenarios
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

// Test data matching your requirements
const testCases = [
  {
    name: 'Basic Sonarr + Radarr + Prowlarr Setup',
    data: {
      selectedServices: ['sonarr', 'radarr', 'prowlarr'],
      variables: {
        sonarrPort: 8989,
        radarrPort: 7878,
        prowlarrPort: 9696,
        configPath: '/srv/config',
        tvPath: '/mnt/tv',
        moviesPath: '/mnt/movies'
      }
    }
  },
  {
    name: 'Media Server with Custom Ports',
    data: {
      selectedServices: ['jellyfin', 'qbittorrent'],
      variables: {
        jellyfinPort: 8096,
        qbittorrentPort: 8080,
        mediaPath: '/mnt/media',
        configPath: '/srv/config'
      }
    }
  },
  {
    name: 'Simple Nginx Setup',
    data: {
      selectedServices: ['nginx'],
      variables: {
        nginxPort: 80,
        configPath: '/etc/nginx'
      }
    }
  }
];

async function testAPI() {
  console.log('🧪 Testing Dynamic Docker Compose Generator API\\n');

  // Test 1: Health Check
  try {
    console.log('1️⃣ Testing Health Endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed');
    console.log(`   Status: ${health.data.status}`);
    console.log(`   Templates: ${health.data.templates}\\n`);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: List Available Services
  try {
    console.log('2️⃣ Testing Service Listing...');
    const services = await axios.get(`${BASE_URL}/api/services`);
    console.log(`✅ Found ${services.data.count || services.data.data.length} available services`);
    console.log('   Services:', services.data.data.map(s => s.id || s.name).join(', ') + '\\n');
  } catch (error) {
    console.error('❌ Service listing failed:', error.message);
  }

  // Test 3: Generate Docker Compose (YAML Response)
  console.log('3️⃣ Testing Docker Compose Generation (YAML)...');
  for (const testCase of testCases) {
    try {
      console.log(`\\n📋 Test Case: ${testCase.name}`);
      console.log(`   Selected Services: ${testCase.data.selectedServices.join(', ')}`);
      
      const response = await axios.post(`${BASE_URL}/templates/generate`, testCase.data, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('✅ Generation successful!');
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Response Length: ${response.data.length} characters`);
      
      // Save YAML to file for inspection
      const filename = `generated-${testCase.name.replace(/\\s+/g, '-').toLowerCase()}.yaml`;
      fs.writeFileSync(filename, response.data);
      console.log(`   💾 Saved to: ${filename}`);
      
      // Show first few lines
      const lines = response.data.split('\\n').slice(0, 10);
      console.log('   📄 Preview:');
      lines.forEach(line => console.log(`      ${line}`));
      if (response.data.split('\\n').length > 10) {
        console.log('      ...(truncated)');
      }
      
    } catch (error) {
      console.error(`❌ Failed for ${testCase.name}:`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
    }
  }

  // Test 4: Generate Docker Compose (JSON Response)
  console.log('\\n4️⃣ Testing Docker Compose Generation (JSON)...');
  try {
    const jsonResponse = await axios.post(`${BASE_URL}/api/generate-json`, testCases[0].data);
    console.log('✅ JSON generation successful!');
    console.log('   Services generated:', Object.keys(jsonResponse.data.data.dockerCompose.services).join(', '));
    console.log('   Generated at:', jsonResponse.data.data.generatedAt);
  } catch (error) {
    console.error('❌ JSON generation failed:', error.response?.data || error.message);
  }

  // Test 5: Error Cases
  console.log('\\n5️⃣ Testing Error Handling...');
  
  // Test invalid service
  try {
    await axios.post(`${BASE_URL}/templates/generate`, {
      selectedServices: ['nonexistent-service'],
      variables: {}
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Correctly handled non-existent service (404)');
    } else {
      console.log('⚠️ Unexpected error for non-existent service:', error.response?.status);
    }
  }

  // Test empty services array
  try {
    await axios.post(`${BASE_URL}/templates/generate`, {
      selectedServices: [],
      variables: {}
    });
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly handled empty services array (400)');
    } else {
      console.log('⚠️ Unexpected error for empty services:', error.response?.status);
    }
  }

  console.log('\\n🎉 API Testing Complete!');
}

// Run tests
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = testAPI;