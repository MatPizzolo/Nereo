import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Map HTTP status codes to user-friendly Spanish messages */
const httpErrorMessages: Record<number, string> = {
  400: "Datos inválidos. Revisá el formulario.",
  401: "Sesión expirada. Iniciá sesión de nuevo.",
  403: "Sin permisos para esta acción.",
  404: "Recurso no encontrado.",
  409: "Conflicto: el recurso ya existe.",
  422: "Datos inválidos. Revisá el formulario.",
  429: "Demasiadas solicitudes. Esperá un momento.",
  500: "Error del servidor. Intentá más tarde.",
  502: "Servidor no disponible. Intentá más tarde.",
  503: "Servicio en mantenimiento. Intentá más tarde.",
};

/** Whether to suppress the automatic error toast (e.g. login handles its own errors) */
let suppressToast = false;

export function withSuppressedToast<T>(fn: () => Promise<T>): Promise<T> {
  suppressToast = true;
  return fn().finally(() => {
    suppressToast = false;
  });
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = body.message ?? res.statusText;
    const error = new ApiError(res.status, message);

    // Auto-toast for API errors (unless suppressed)
    if (!suppressToast) {
      const userMessage = httpErrorMessages[res.status] ?? message;
      toast.error(userMessage);
    }

    // Auto-redirect to login on 401 (except for auth endpoints)
    if (res.status === 401 && !path.includes("/auth/")) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
