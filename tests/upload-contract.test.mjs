import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const uploadRoute = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');
const uploadPage = fs.readFileSync('src/app/(protected)/upload/page.tsx', 'utf8');
const copilotPage = fs.readFileSync('src/app/(protected)/copilot/page.tsx', 'utf8');

test('multipart contract uses canonical documents field on server', () => {
  assert.match(uploadRoute, /formData\.getAll\("documents"\)/);
  assert.doesNotMatch(uploadRoute, /formData\.getAll\("file"\)/);
});

test('upload UIs send documents field', () => {
  assert.match(uploadPage, /formData\.append\("documents", file\)/);
  assert.match(copilotPage, /body\.append\("documents", file\)/);
  assert.doesNotMatch(copilotPage, /append\("file", file\)/);
});

test('server validates malformed multipart and missing files', () => {
  assert.match(uploadRoute, /MALFORMED_MULTIPART/);
  assert.match(uploadRoute, /MISSING_FILES/);
  assert.match(uploadRoute, /INVALID_FILE_TYPE/);
  assert.match(uploadRoute, /FILE_TOO_LARGE/);
});

test('ingestion lifecycle and extracted signal summary are present', () => {
  assert.match(uploadRoute, /upload_started/);
  assert.match(uploadRoute, /ingestion_completed/);
  assert.match(uploadRoute, /extractedSignals/);
});
