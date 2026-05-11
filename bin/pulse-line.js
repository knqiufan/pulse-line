#!/usr/bin/env node
// Route to CLI if arguments present, otherwise render pulse

const args = process.argv.slice(2);

if (args.length === 0 && !process.stdin.isTTY) {
  // No arguments and stdin provided -> render pulse
  require('../dist/src/index.js');
} else {
  // Has arguments -> CLI mode
  require('../dist/src/cli.js');
}
