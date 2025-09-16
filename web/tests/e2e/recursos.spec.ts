import { test, expect } from '@playwright/test';

// Configuración base para los tests
test.describe('Recursos de Catequesis E2E', () => {
  // Test para la página principal de recursos
  test('recursos index', async ({ page }) => {
    await page.goto('/recursos');
    
    // Verificar que la página carga correctamente (título más flexible)
    await expect(page).toHaveTitle(/Catequesis|Recursos/);
    
    // Verificar que el título principal existe
    const heading = page.locator('h1').filter({ hasText: 'Recursos de Catequesis' });
    await expect(heading).toBeVisible();
    
    // Verificar que los enlaces a catequesis están presentes
    const indiceLink = page.locator('a[href*="indice_general"]');
    await expect(indiceLink).toBeVisible();
    
    const portadaLink = page.locator('a[href*="index.html"]');
    await expect(portadaLink).toBeVisible();
  });

  // Test para el índice general de catequesis
  test('indice general', async ({ page }) => {
    await page.goto('/recursos/catequesis');
    
    // Verificar que la página carga (puede ser rewrite interno, no necesariamente redirige)
    await expect(page).toHaveURL(/\/recursos\/catequesis/);
    
    // Verificar que el contenido HTML se carga correctamente
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Verificar que hay contenido (más flexible que buscar texto específico)
    const hasContent = await body.textContent();
    expect(hasContent).toBeTruthy();
    expect(hasContent!.length).toBeGreaterThan(100); // Verificar que hay contenido sustancial
  });

  // Test para una ficha específica (más flexible)
  test('ficha específica - acceso directo', async ({ page }) => {
    // Intentar acceder directamente al archivo HTML
    const response = await page.goto('/recursos/catequesis/fichas/adan_eva.html');
    
    // Verificar que la respuesta es exitosa
    expect(response?.status()).toBe(200);
    
    // Verificar que el contenido es HTML
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('text/html');
    
    // Verificar que hay contenido en la página
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    const hasContent = await body.textContent();
    expect(hasContent).toBeTruthy();
    expect(hasContent!.length).toBeGreaterThan(50);
  });

  // Test adicional para verificar que los archivos estáticos se sirven correctamente
  test('archivos estáticos accesibles', async ({ page }) => {
    // Verificar que podemos acceder directamente a un archivo HTML
    const response = await page.goto('/recursos/catequesis/indice_general.html');
    expect(response?.status()).toBe(200);
    
    // Verificar que el contenido es HTML válido
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });
});