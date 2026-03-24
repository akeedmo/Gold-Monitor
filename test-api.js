import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://api.api-ninjas.com/v1/invalidendpoint', {
      headers: { 'X-Api-Key': 'invalid_key' }
    });
    console.log(res.data);
  } catch (e) {
    console.error('API-Ninjas failed:', e.response?.status, e.response?.data || e.message);
  }
}

test();





