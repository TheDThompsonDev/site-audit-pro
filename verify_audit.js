const fs = require('fs');

async function test() {
  const maxRetries = 30; // Wait up to 60s for server start
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log(`Attempt ${retries + 1}: Connecting to API...`);
      const res = await fetch('http://localhost:3001/api/generate-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });
      
      if (res.status === 200) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync('test_audit.docx', Buffer.from(buffer));
        console.log('Success: test_audit.docx created, size:', buffer.byteLength);
        process.exit(0);
      } else {
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
        // If 500, it might be a real error in logic, not just server starting.
        // But we'll retry a few times just in case.
        if (retries > 5) process.exit(1); 
      }
    } catch (e) {
      console.log('Connection failed (server might be starting)...', e.message);
    }
    
    retries++;
    await new Promise(r => setTimeout(r, 2000));
  }
  console.error('Failed to connect after retries');
  process.exit(1);
}

test();
