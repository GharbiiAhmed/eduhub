export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export async function apiCall<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  return apiCall<T>(url, { method: "GET" })
}

export async function apiPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return apiCall<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function apiPut<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return apiCall<T>(url, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  return apiCall<T>(url, { method: "DELETE" })
}
