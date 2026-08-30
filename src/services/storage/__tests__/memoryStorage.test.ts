import {createMemoryStorage} from '../memoryStorage';

describe('createMemoryStorage', () => {
  it('devuelve null para una clave que no existe', async () => {
    const storage = createMemoryStorage();
    await expect(storage.getItem('ausente')).resolves.toBeNull();
  });

  it('guarda y lee un valor', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await expect(storage.getItem('token')).resolves.toBe('abc');
  });

  it('sobrescribe un valor existente', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.setItem('token', 'def');
    await expect(storage.getItem('token')).resolves.toBe('def');
  });

  it('borra un valor', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('token', 'abc');
    await storage.removeItem('token');
    await expect(storage.getItem('token')).resolves.toBeNull();
  });

  it('aísla instancias distintas', async () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    await a.setItem('token', 'abc');
    await expect(b.getItem('token')).resolves.toBeNull();
  });
});
