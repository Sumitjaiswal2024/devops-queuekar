const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Queue = require('../src/models/Queue');
const Token = require('../src/models/Token');
const User = require('../src/models/User');

describe('Queue model', () => {
    test('is valid with all required fields and applies defaults', () => {
        const q = new Queue({
            _id: 'ABC123',
            name: 'OPD Queue',
            domain: 'city-clinic',
            serviceType: 'consultation',
            adminId: new mongoose.Types.ObjectId()
        });
        assert.equal(q.validateSync(), undefined);
        assert.equal(q.status, 'active');
        assert.equal(q.maxCapacity, 100);
    });

    test('is invalid without name, domain, serviceType and adminId', () => {
        const err = new Queue({ _id: 'ABC123' }).validateSync();
        assert.ok(err.errors.name);
        assert.ok(err.errors.domain);
        assert.ok(err.errors.serviceType);
        assert.ok(err.errors.adminId);
    });

    test('rejects an unknown status value', () => {
        const q = new Queue({
            _id: 'ABC123', name: 'x', domain: 'x', serviceType: 'x',
            adminId: new mongoose.Types.ObjectId(), status: 'broken'
        });
        assert.ok(q.validateSync().errors.status);
    });
});

describe('Token model', () => {
    test('defaults a new token to waiting', () => {
        const t = new Token({ queueId: 'ABC123', name: 'Asha', tokenNumber: 1 });
        assert.equal(t.validateSync(), undefined);
        assert.equal(t.status, 'waiting');
    });

    test('requires queueId, name and tokenNumber', () => {
        const err = new Token({}).validateSync();
        assert.ok(err.errors.queueId);
        assert.ok(err.errors.name);
        assert.ok(err.errors.tokenNumber);
    });

    test('accepts every valid lifecycle status and rejects others', () => {
        for (const status of ['waiting', 'serving', 'done', 'skipped']) {
            const t = new Token({ queueId: 'Q1', name: 'A', tokenNumber: 1, status });
            assert.equal(t.validateSync(), undefined, `${status} should be valid`);
        }
        const bad = new Token({ queueId: 'Q1', name: 'A', tokenNumber: 1, status: 'lost' });
        assert.ok(bad.validateSync().errors.status);
    });
});

describe('User model', () => {
    test('rejects a password shorter than 6 characters', () => {
        const u = new User({ name: 'Admin', email: 'a@b.com', password: '123' });
        assert.ok(u.validateSync().errors.password);
    });

    test('lowercases email and defaults role to user', () => {
        const u = new User({ name: 'Admin', email: 'ADMIN@Clinic.COM', password: 'secret1' });
        assert.equal(u.email, 'admin@clinic.com');
        assert.equal(u.role, 'user');
    });

    test('comparePassword matches the correct password only', async () => {
        const u = new User({ name: 'Admin', email: 'a@b.com', password: 'placeholder' });
        u.password = await bcrypt.hash('secret123', 10);
        assert.equal(await u.comparePassword('secret123'), true);
        assert.equal(await u.comparePassword('wrong-pass'), false);
    });
});
