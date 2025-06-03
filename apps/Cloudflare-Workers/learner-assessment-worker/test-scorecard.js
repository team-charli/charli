// Simple test script to trigger scorecard generation without RoboTeacher conversation
// This simulates a session ending with some learner speech segments

const TEST_ROOM_ID = `test-room-${Date.now()}`;
const TEST_SESSION_ID = `robo-${Date.now()}`;
const TEST_LEARNER_ID = 18;

async function testScorecardGeneration() {
  console.log('🧪 Starting scorecard generation test...');
  console.log(`Room ID: ${TEST_ROOM_ID}`);
  console.log(`Session ID: ${TEST_SESSION_ID}`);
  console.log(`Learner ID: ${TEST_LEARNER_ID}`);

  const baseUrl = 'https://learner-assessment-worker.charli.chat';
  
  try {
    // Step 1: Send a few audio chunks to establish session metadata
    console.log('\n📡 Step 1: Sending initial audio chunks to establish session...');
    
    const audioUrl = `${baseUrl}/audio/${TEST_ROOM_ID}?peerId=test-peer&role=learner&roboMode=true&learnerId=${TEST_LEARNER_ID}&sessionId=${TEST_SESSION_ID}`;
    
    // Send a few dummy audio chunks (empty bytes) to trigger metadata storage
    for (let i = 0; i < 3; i++) {
      const response = await fetch(audioUrl, {
        method: 'POST',
        body: new ArrayBuffer(1024), // Dummy audio data
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      
      if (!response.ok) {
        console.error(`❌ Audio chunk ${i+1} failed:`, response.status, response.statusText);
        return;
      }
      console.log(`✅ Audio chunk ${i+1} sent successfully`);
    }

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Trigger session end to generate scorecard
    console.log('\n🏁 Step 2: Triggering session end to generate scorecard...');
    
    const endUrl = `${audioUrl}&action=end-session`;
    const endResponse = await fetch(endUrl, { method: 'POST' });
    
    if (!endResponse.ok) {
      console.error('❌ Session end failed:', endResponse.status, endResponse.statusText);
      const errorText = await endResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const result = await endResponse.json();
    console.log('✅ Session end response:', JSON.stringify(result, null, 2));

    console.log('\n🎉 Test completed! Check the worker logs for detailed scorecard generation process.');
    
    // Quick diagnostic: Check if we're still seeing old metaWritten behavior
    console.log('\n🔍 Testing metadata behavior with follow-up request...');
    const diagnosticResponse = await fetch(audioUrl, {
      method: 'POST',
      body: new ArrayBuffer(512),
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    
    if (diagnosticResponse.ok) {
      console.log('📝 Follow-up request completed (check logs for "Skipping metadata storage" vs session-specific keys)');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testScorecardGeneration().catch(console.error);