import {createMemoryStorage} from '../memoryStorage';

describe('createMemoryStorage', () => {
  it('returns null for a key that does not exist', async () => {
    const storage = createMemoryStorage();
    await expect(storage.getItem('ausente')).resolves.toBeNull();
  });

  it('stores and reads a value', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await expect(storage.getItem('token')).resolves.toBe('abc');
  });

  it('overwrites an existing value', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.setItem('token', 'def');
    await expect(storage.getItem('token')).resolves.toBe('def');
  });

  it('deletes a value', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.removeItem('token');
    await expect(storage.getItem('token')).resolves.toBeNull();
  });

  it('isolates different instances', async () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    await a.setItem('token', 'abc');
    await expect(b.getItem('token')).resolves.toBeNull();
  });
});
