#!/usr/bin/env node
/**
 * Auto-setup script for pulse-line plugin.
 * Runs on SessionStart to ensure statusLine is configured in user settings.
 * Idempotent — skips if statusLine is already set.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const PULSE_CMD = 'npx -y pulse-line@latest';

function run() {
  let settings = {};

  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    } catch {
      return;
    }
  }

  if (settings.statusLine && settings.statusLine.command) {
    return;
  }

  settings.statusLine = {
    type: 'command',
    command: PULSE_CMD
  };

  const dir = path.dirname(SETTINGS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

run();
