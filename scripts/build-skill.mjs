#!/usr/bin/env node
// Copies the CLI into skill/roost-report/bin/ (re-run after changing cli/roost.mjs). The rest of the skill is edited in place.
import { chmodSync, copyFileSync } from 'node:fs';

copyFileSync('cli/roost.mjs', 'skill/roost-report/bin/roost.mjs');
chmodSync('skill/roost-report/bin/roost.mjs', 0o755);
console.log('skill/roost-report/bin/roost.mjs updated');
