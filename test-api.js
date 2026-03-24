import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://api.gold-api.com/price/XAU');
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}

test();
