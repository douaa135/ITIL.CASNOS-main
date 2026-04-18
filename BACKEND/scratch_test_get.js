const userService = require('./src/services/user.service.js');
async function test() {
  try {
    const res = await userService.getAllUsers();
    console.log("Total in DB:", res.total);
    console.log("First 3 users:");
    console.log(JSON.stringify(res.data.slice(0, 3), null, 2));
  } catch(e) {
    console.error("ERROR:", e);
  }
}
test();
