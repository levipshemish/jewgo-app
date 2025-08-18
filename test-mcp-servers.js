#!/usr/bin/env node

const { spawn } = require('child_process');

async function testMCPServer(command, request) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}. Error: ${error}`));
      }
    });
    
    // Send the request
    proc.stdin.write(JSON.stringify(request) + '\n');
    proc.stdin.end();
  });
}

async function main() {
  console.log('Testing MCP Servers...\n');
  
  // Test TS/Next Strict MCP
  try {
    console.log('1. Testing TS/Next Strict MCP...');
    const tscResult = await testMCPServer('node', [
      'tools/ts-next-strict-mcp/dist/index.js'
    ], {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'tsc_check',
        arguments: { cwd: 'frontend' }
      }
    });
    console.log('✅ TS/Next Strict MCP working');
    console.log('Response:', tscResult.slice(-200)); // Last 200 chars
  } catch (error) {
    console.log('❌ TS/Next Strict MCP failed:', error.message);
  }
  
  console.log('\n2. Testing CI Guard MCP...');
  try {
    const guardResult = await testMCPServer('node', [
      'tools/ci-guard-mcp/dist/index.js'
    ], {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'premerge_guard',
        arguments: { cwd: 'frontend' }
      }
    });
    console.log('✅ CI Guard MCP working');
    console.log('Response:', guardResult.slice(-200)); // Last 200 chars
  } catch (error) {
    console.log('❌ CI Guard MCP failed:', error.message);
  }
  
  console.log('\n3. Testing Schema Drift MCP...');
  try {
    const schemaResult = await testMCPServer('schema-drift-mcp', [], {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'schema_diff',
        arguments: {
          db_url: 'postgresql://test:test@localhost:5432/test',
          metadata_module: 'backend.database.models'
        }
      }
    });
    console.log('✅ Schema Drift MCP working');
    console.log('Response:', schemaResult.slice(-200)); // Last 200 chars
  } catch (error) {
    console.log('❌ Schema Drift MCP failed:', error.message);
  }
  
  console.log('\n🎉 MCP Server testing complete!');
}

main().catch(console.error);
