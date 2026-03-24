import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/gold-price');
    console.log('Local API:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Local API failed:', e.message);
  }
}

test();



