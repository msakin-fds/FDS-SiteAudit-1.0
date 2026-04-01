import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://fds-site-audit-bd.vercel.app/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', prompt: '{"overallScore": 100}' })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 200));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
