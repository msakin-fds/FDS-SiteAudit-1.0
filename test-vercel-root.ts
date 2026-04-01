import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://fds-site-audit-bd.vercel.app/');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 200));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
