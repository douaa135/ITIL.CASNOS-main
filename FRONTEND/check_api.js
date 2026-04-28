const axios = require('axios');

async function check() {
  const api = axios.create({ baseURL: 'http://localhost:5000/api' });
  const res = await api.get('/statuts?contexte=RFC');
  console.log(res.data);
}
check();
