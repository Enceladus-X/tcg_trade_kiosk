type GatewayError = {
  message: string
  code?: string
  details?: string
}

type GatewayResult<T> = {
  data: T | null
  error: GatewayError | null
  /** Present only when the gateway was asked to count a paginated selection. */
  count?: number
}

type GatewayPayload = Record<string, unknown>

type ElectronGateway = {
  kioskGatewayRequest: (request: GatewayPayload) => Promise<unknown>
}

function bridge(): ElectronGateway {
  const candidate = (window as Window & { electronAPI?: ElectronGateway }).electronAPI
  if (!candidate?.kioskGatewayRequest) {
    throw new Error('Kiosk 보안 게이트웨이를 사용할 수 없습니다. Electron 앱의 config.json에 gatewayUrl과 deviceToken을 설정하세요.')
  }
  return candidate
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function errorFrom(value: unknown, fallback: string): GatewayError {
  const source = asObject(value)
  return {
    message: typeof source.message === 'string' ? source.message : fallback,
    code: typeof source.code === 'string' ? source.code : undefined,
    details: typeof source.details === 'string' ? source.details : undefined,
  }
}

async function request<T>(action: string, payload: GatewayPayload): Promise<GatewayResult<T>> {
  try {
    const raw = asObject(await bridge().kioskGatewayRequest({ schemaVersion: 1, action, payload }))
    if (raw.ok !== true) return { data: null, error: errorFrom(raw.error, 'Kiosk gateway request failed.') }
    const meta = asObject(raw.meta)
    const count = typeof meta.total === 'number' && Number.isFinite(meta.total) ? meta.total : undefined
    return { data: (raw.data ?? null) as T | null, error: null, ...(count === undefined ? {} : { count }) }
  } catch (error) {
    return { data: null, error: errorFrom(error, 'Kiosk gateway request failed.') }
  }
}

type Filters = Record<string, { eq?: string | number | boolean; in?: Array<string | number> }>

class QueryBuilder<T = unknown> implements PromiseLike<GatewayResult<T>> {
  private operation: 'select' | 'insert' | 'update' | 'delete' | null = null
  private selection: string | undefined
  private values: unknown
  private readonly filters: Filters = {}
  private orderBy: { column: string; ascending?: boolean } | undefined
  private pagination: { limit: number; offset: number; count?: 'exact' } | undefined

  constructor(private readonly table: string) {}

  select(columns = '*'): this {
    this.selection = columns
    if (!this.operation) this.operation = 'select'
    return this
  }

  insert(values: unknown): this {
    this.operation = 'insert'
    this.values = values
    return this
  }

  update(values: unknown): this {
    this.operation = 'update'
    this.values = values
    return this
  }

  delete(): this {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: string | number | boolean): this {
    this.filters[column] = { eq: value }
    return this
  }

  in(column: string, values: Array<string | number>): this {
    this.filters[column] = { in: values }
    return this
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this.orderBy = { column, ascending: options.ascending }
    return this
  }

  /**
   * Requests a bounded result set from the kiosk gateway.  This mirrors the
   * Supabase range API while keeping row-count work explicit at each callsite.
   */
  range(from: number, to: number, options: { count?: 'exact' } = {}): this {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) {
      throw new Error('Kiosk query range is invalid.')
    }
    this.pagination = { limit: to - from + 1, offset: from, count: options.count }
    return this
  }

  async single(): Promise<GatewayResult<T>> {
    const result = await this.execute()
    if (result.error) return result
    if (Array.isArray(result.data)) {
      if (result.data.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'Expected a single row.' } }
      return { data: result.data[0] as T, error: null }
    }
    return result
  }

  async execute(): Promise<GatewayResult<T>> {
    const result = await request<T>('query', {
      table: this.table,
      operation: this.operation ?? 'select',
      select: this.selection,
      values: this.values,
      filters: this.filters,
      order: this.orderBy,
      pagination: this.pagination,
    })
    return result
  }

  then<TResult1 = GatewayResult<T>, TResult2 = never>(
    onfulfilled?: ((value: GatewayResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let output = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(output)
}

export const supabase = {
  from(table: string): QueryBuilder<any> {
    return new QueryBuilder<any>(table)
  },
  rpc(name: string, args: Record<string, unknown> = {}): Promise<GatewayResult<any>> {
    return request<any>('rpc', { name, args })
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File, options: { contentType?: string; upsert?: boolean } = {}): Promise<GatewayResult<{ path: string; publicUrl: string }>> {
          const dataBase64 = arrayBufferToBase64(await file.arrayBuffer())
          return request('upload_image', {
            bucket,
            path,
            contentType: options.contentType || file.type || 'application/octet-stream',
            dataBase64,
          })
        },
      }
    },
  },
}
