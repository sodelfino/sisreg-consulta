import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { executeSisregSearch, testSisregConnection } from "./sisreg";

describe("SISREG Elasticsearch Service", () => {
  const mockCredentials = {
    baseUrl: "https://sisreg-es.saude.gov.br",
    indexPath: "/marcacao-ambulatorial-rj-macae/_search",
    username: "testuser",
    password: "testpass",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeSisregSearch", () => {
    it("should return results for quick mode query", async () => {
      const mockResponse = {
        took: 15,
        hits: {
          total: { value: 100 },
          hits: [
            { _source: { codigo_solicitacao: "123", no_usuario: "Test User" } },
            { _source: { codigo_solicitacao: "456", no_usuario: "Another User" } },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await executeSisregSearch(mockCredentials, {
        mode: "quick",
        size: 10,
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.total).toBe(100);
      expect(result.hits).toHaveLength(2);
      expect(result.took).toBe(15);
    });

    it("should handle 401 unauthorized error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      const result = await executeSisregSearch(mockCredentials, {
        mode: "quick",
        size: 10,
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.errorMessage).toContain("Credenciais inválidas");
    });

    it("should handle 403 forbidden error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Forbidden" }),
      });

      const result = await executeSisregSearch(mockCredentials, {
        mode: "quick",
        size: 10,
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.errorMessage).toContain("Acesso negado");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await executeSisregSearch(mockCredentials, {
        mode: "quick",
        size: 10,
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(0);
      expect(result.errorMessage).toContain("Erro de conexão");
    });

    it("should build correct query for novas mode with date range", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          took: 10,
          hits: { total: { value: 50 }, hits: [] },
        }),
      });

      await executeSisregSearch(mockCredentials, {
        mode: "novas",
        size: 100,
        dateStart: "2024-01-01",
        dateEnd: "2024-01-31",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://sisreg-es.saude.gov.br/marcacao-ambulatorial-rj-macae/_search");
      
      const body = JSON.parse(options.body);
      expect(body.query.bool.must).toBeDefined();
      expect(body.size).toBe(100);
    });

    it("should include Basic Auth header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          took: 10,
          hits: { total: { value: 0 }, hits: [] },
        }),
      });

      await executeSisregSearch(mockCredentials, {
        mode: "quick",
        size: 10,
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it("should limit size to 1000", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          took: 10,
          hits: { total: { value: 0 }, hits: [] },
        }),
      });

      await executeSisregSearch(mockCredentials, {
        mode: "quick",
        size: 5000, // Request more than limit
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.size).toBe(1000); // Should be capped at 1000
    });
  });

  describe("testSisregConnection", () => {
    it("should return success for valid connection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          took: 5,
          hits: { total: { value: 1000 }, hits: [{ _source: {} }] },
        }),
      });

      const result = await testSisregConnection(mockCredentials);

      expect(result.ok).toBe(true);
      expect(result.message).toContain("Conexão bem sucedida");
    });

    it("should return failure for invalid credentials", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      const result = await testSisregConnection(mockCredentials);

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Credenciais inválidas");
    });
  });
});
