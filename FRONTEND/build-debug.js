
import { build } from 'vite';

async function run() {
  try {
    await build();
  } catch (err) {
    console.error('BUILD FAILED');
    console.error(err);
    if (err.errors) {
      console.error('ERRORS:', JSON.stringify(err.errors, null, 2));
    }
    process.exit(1);
  }
}

run();
