describe('Testes básicos', () => {
  test('soma simples', () => {
    expect(1 + 1).toBe(2);
  });

  test('objeto igual', () => {
    expect({ nome: 'teste' }).toEqual({ nome: 'teste' });
  });
});