import { describe, it, expect, beforeEach } from 'vitest';
import { isAccountLocked, recordFailedLogin, clearLoginAttempts, isTokenBlacklisted, blacklistToken } from '../middleware/auth';
import { verifyImageSignature, computeFileHash } from '../middleware/uploadSecurity';
import { stripHtml, encodeHtml } from '../middleware/sanitize';
import { LoginSchema, ChatSchema, SubsidySchema } from '../middleware/validate';

describe('Account Lockout (A07)', () => {
  beforeEach(() => { clearLoginAttempts('test@example.com'); });
  it('should not lock after 4 attempts', () => {
    for (let i = 0; i < 4; i++) recordFailedLogin('test@example.com');
    expect(isAccountLocked('test@example.com').locked).toBe(false);
  });
  it('should lock after 5 attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedLogin('test@example.com');
    expect(isAccountLocked('test@example.com').locked).toBe(true);
  });
  it('should be case-insensitive', () => {
    for (let i = 0; i < 5; i++) recordFailedLogin('TEST@EXAMPLE.COM');
    expect(isAccountLocked('test@example.com').locked).toBe(true);
  });
  it('should clear on clearLoginAttempts', () => {
    for (let i = 0; i < 5; i++) recordFailedLogin('test@example.com');
    clearLoginAttempts('test@example.com');
    expect(isAccountLocked('test@example.com').locked).toBe(false);
  });
});

describe('Token Blacklist (A07)', () => {
  it('should not flag non-blacklisted token', () => {
    expect(isTokenBlacklisted('non-existent')).toBe(false);
  });
  it('should flag blacklisted token', () => {
    const jti = 'jti-' + Date.now();
    blacklistToken(jti, Date.now() + 3600000);
    expect(isTokenBlacklisted(jti)).toBe(true);
  });
  it('should auto-prune expired entries', () => {
    const jti = 'expired-' + Date.now();
    blacklistToken(jti, Date.now() - 1000);
    expect(isTokenBlacklisted(jti)).toBe(false);
  });
});

describe('HTML Sanitization (A05)', () => {
  it('should strip script tags', () => {
    expect(stripHtml('<script>alert(1)</script>Hello')).toBe('Hello');
  });
  it('should strip all HTML', () => {
    expect(stripHtml('<b>Bold</b> text')).toBe('Bold text');
  });
  it('should handle empty string', () => {
    expect(stripHtml('')).toBe('');
  });
  it('should handle null gracefully', () => {
    expect(stripHtml(null as any)).toBe('');
  });
});

describe('HTML Encoding (A05)', () => {
  it('should encode script tags', () => {
    const e = encodeHtml('<script>xss</script>');
    expect(e).not.toContain('<script>');
    expect(e).toContain('&lt;script&gt;');
  });
  it('should encode all 5 dangerous chars', () => {
    expect(encodeHtml("& < > \" '")).toBe("&amp; &lt; &gt; &quot; &#x27;");
  });
});

describe('File Signature Verification (A05/A08)', () => {
  it('should detect JPEG', () => {
    const buf = Buffer.from([0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01]);
    expect(verifyImageSignature(buf)).toBe('image/jpeg');
  });
  it('should detect PNG', () => {
    const buf = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D]);
    expect(verifyImageSignature(buf)).toBe('image/png');
  });
  it('should reject PHP file', () => {
    expect(verifyImageSignature(Buffer.from('<?php system($_GET[cmd]); ?>'))).toBeNull();
  });
  it('should reject empty buffer', () => {
    expect(verifyImageSignature(Buffer.alloc(0))).toBeNull();
  });
  it('should compute consistent SHA-256', () => {
    const d = Buffer.from('test');
    expect(computeFileHash(d)).toBe(computeFileHash(d));
    expect(computeFileHash(d)).toHaveLength(64);
  });
});

describe('Input Validation (A05)', () => {
  it('LoginSchema rejects missing email', () => {
    expect(LoginSchema.safeParse({ password: 'Test@123' }).success).toBe(false);
  });
  it('LoginSchema rejects invalid email', () => {
    expect(LoginSchema.safeParse({ email: 'bad', password: 'Test@123' }).success).toBe(false);
  });
  it('LoginSchema lowercases email', () => {
    const r = LoginSchema.safeParse({ email: 'USER@EXAMPLE.COM', password: 'Test@123' });
    expect(r.success && r.data.email).toBe('user@example.com');
  });
  it('ChatSchema rejects oversized message', () => {
    expect(ChatSchema.safeParse({ message: 'A'.repeat(2001) }).success).toBe(false);
  });
  it('ChatSchema rejects invalid history role', () => {
    expect(ChatSchema.safeParse({ message: 'Hi', history: [{ role: 'bad', parts: [{ text: 'x' }] }] }).success).toBe(false);
  });
  it('SubsidySchema rejects oversized reason', () => {
    expect(SubsidySchema.safeParse({ resource_type: 'Seeds', quantity: '1kg', reason: 'A'.repeat(1001) }).success).toBe(false);
  });
  it('SubsidySchema accepts valid request', () => {
    expect(SubsidySchema.safeParse({ resource_type: 'Seeds', quantity: '1kg', reason: 'Need seeds' }).success).toBe(true);
  });
});
