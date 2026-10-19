const test = require('node:test');
const assert = require('node:assert/strict');
const { getTenantId } = require('./tenant');

test('returns the authenticated tenant ObjectId', () => {
  const id = '6acbdbc7bd79392050fd2b6f';
  const result = getTenantId({ admin: { _id: id } });

  assert.equal(result.toString(), id);
});

test('rejects a missing tenant', () => {
  assert.throws(
    () => getTenantId({}),
    (error) => error.status === 401
  );
});

test('rejects a malformed tenant ID', () => {
  assert.throws(
    () => getTenantId({ admin: { _id: 'not-an-object-id' } }),
    (error) => error.status === 401
  );
});
