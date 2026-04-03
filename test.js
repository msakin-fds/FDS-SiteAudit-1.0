import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/health');
    const text = await res.text();
    console.log('Health:', text);
  } catch (e) {
    console.error(e);
  }
}
test();
