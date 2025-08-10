// globals.d.ts
declare function GM_xmlhttpRequest(details: {
  method?: string
  url: string
  headers?: Record<string, string>
  data?: string
  responseType?: string
  onload?: (response: {
    responseText: string
    responseXML: Document | null
    readyState: number
    responseHeaders: string
    status: number
    statusText: string
    finalUrl: string
  }) => void
  onerror?: (error: any) => void
  ontimeout?: () => void
  onreadystatechange?: (response: any) => void
  timeout?: number
}): void

type StringOrStringArray = string | string[]
declare interface GM_Meta {
  'author': string
  'description': string
  'grant': StringOrStringArray
  'license': string
  'match': StringOrStringArray
  'name': string
  'namespace': string
  'run-at': string
  'version': string
  'connect'?: StringOrStringArray
  'updateURL'?: string
  'downloadURL'?: string
}
