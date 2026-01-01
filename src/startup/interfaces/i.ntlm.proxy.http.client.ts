export interface INtlmProxyHttpClient {
  request(configApiUrl: string, path: string, method: string, body: object | undefined): Promise<object | undefined>
}
