#!/usr/bin/env node
/**
 * Validate .usdc-mandate.json (and optionally .usdc-mandate-ledger.json).
 * Usage: node validate-mandate.js [path-to-workspace]
 * Default workspace: . or process.env.OPENCLAW_WORKSPACE or ~/.openclaw/workspace
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const defaultWorkspace = path.join(os.homedir(), '.openclaw', 'workspace');
const workspace = process.argv[2] || process.env.OPENCLAW_WORKSPACE || defaultWorkspace;
const mandatePath = path.join(workspace, '.usdc-mandate.json');
const ledgerPath = path.join(workspace, '.usdc-mandate-ledger.json');

const required = ['maxAmountPerPeriod', 'period', 'periodStart'];
const allowedPeriods = ['day', 'week', 'month'];

function validateMandate(obj) {
  const errs = [];
  if (!obj || typeof obj !== 'object') {
    return ['Mandate must be a JSON object'];
  }
  for (const key of required) {
    if (obj[key] === undefined || obj[key] === null) {
      errs.push(`Missing required field: ${key}`);
    }
  }
  if (obj.maxAmountPerPeriod !== undefined && (typeof obj.maxAmountPerPeriod !== 'number' || obj.maxAmountPerPeriod < 0)) {
    errs.push('maxAmountPerPeriod must be a non-negative number');
  }
  if (obj.period !== undefined && !allowedPeriods.includes(obj.period)) {
    errs.push(`period must be one of: ${allowedPeriods.join(', ')}`);
  }
  if (obj.periodStart !== undefined && typeof obj.periodStart !== 'string') {
    errs.push('periodStart must be an ISO date string');
  }
  if (obj.allowedRecipients !== undefined && !Array.isArray(obj.allowedRecipients)) {
    errs.push('allowedRecipients must be an array');
  }
  return errs;
}

function validateLedger(arr) {
  if (!Array.isArray(arr)) return ['Ledger must be a JSON array'];
  const errs = [];
  arr.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') errs.push(`Ledger[${i}]: must be object`);
    else {
      if (entry.amount !== undefined && (typeof entry.amount !== 'number' || entry.amount < 0)) errs.push(`Ledger[${i}]: amount must be non-negative number`);
      if (entry.timestamp !== undefined && typeof entry.timestamp !== 'string') errs.push(`Ledger[${i}]: timestamp must be string`);
    }
  });
  return errs;
}

let exitCode = 0;

if (!fs.existsSync(mandatePath)) {
  console.error('Missing:', mandatePath);
  process.exit(1);
}

let mandate;
try {
  mandate = JSON.parse(fs.readFileSync(mandatePath, 'utf8'));
} catch (e) {
  console.error('Invalid JSON:', mandatePath, e.message);
  process.exit(1);
}

const mandateErrs = validateMandate(mandate);
if (mandateErrs.length) {
  console.error('Mandate errors:', mandateErrs.join('; '));
  exitCode = 1;
} else {
  console.log('Mandate OK:', mandatePath);
}

if (fs.existsSync(ledgerPath)) {
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch (e) {
    console.error('Invalid ledger JSON:', ledgerPath, e.message);
    exitCode = 1;
  }
  if (ledger) {
    const ledgerErrs = validateLedger(ledger);
    if (ledgerErrs.length) {
      console.error('Ledger errors:', ledgerErrs.join('; '));
      exitCode = 1;
    } else {
      console.log('Ledger OK:', ledgerPath, `(${ledger.length} entries)`);
    }
  }
} else {
  console.log('Ledger missing (optional):', ledgerPath);
}

process.exit(exitCode);
