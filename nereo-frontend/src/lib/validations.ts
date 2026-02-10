import { z } from "zod/v4";

/** Validates Argentine mobile phone in E.164 format */
export const phoneSchema = z
  .string()
  .regex(/^\+549\d{10}$/, "Número de teléfono inválido. Formato: +54 9 XX XXXX-XXXX");

/** Validates a non-empty string */
export const requiredString = (field: string) =>
  z.string().min(1, `${field} es requerido`);

/** Validates an Argentine vehicle plate (old format ABC123 or new format AB123CD) */
export const plateSchema = z
  .string()
  .regex(
    /^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/i,
    "Patente inválida. Formato: ABC123 o AB123CD"
  );

/** Validates a positive currency amount in cents */
export const amountSchema = z
  .number()
  .positive("El monto debe ser mayor a 0");

/** Validates email */
export const emailSchema = z.string().email("Email inválido");
