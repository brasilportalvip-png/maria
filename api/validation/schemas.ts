import { z } from 'zod';

export const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem não pode ser vazia').max(2000, 'Mensagem muito longa (máximo 2000 caracteres)'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string().max(4000)
  })).max(20).optional().default([]),
  pomboGiraName: z.string().max(100).optional().default('Maria Padilha Rainha das 7 Encruzilhadas'),
  idempotencyKey: z.string().max(100).optional(),
});

export const OracleReadingRequestSchema = z.object({
  type: z.enum([
    'odu',
    'buzios',
    'tarot',
    'numerology',
    'cabala',
    'astrology',
    'premium_complete'
  ]),
  question: z.string().max(2000).optional(),
  userData: z.object({
    fullName: z.string().min(2).max(150),
    birthDate: z.string().min(4).max(25),
    birthTime: z.string().max(10).optional(),
    city: z.string().max(100).optional().default(''),
    timezone: z.string().max(50).optional().default('America/Sao_Paulo'),
  }).optional(),
  specificName: z.string().max(150).optional(),
  specificDate: z.string().max(25).optional(),
  idempotencyKey: z.string().max(100).optional(),
  readingId: z.string().max(100).optional(),
});

export const RegisterRequestSchema = z.object({
  fullName: z.string().min(2, 'Nome muito curto').max(150),
  email: z.string().email('E-mail inválido').max(150),
  phone: z.string().min(8, 'Telefone inválido').max(25),
  birthDate: z.string().min(4, 'Data de nascimento obrigatória').max(25),
  birthTime: z.string().max(10).optional(),
  city: z.string().min(2, 'Cidade obrigatória').max(100),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100),
  timezone: z.string().max(50).optional().default('America/Sao_Paulo'),
  deviceId: z.string().max(150).optional(),
});

export const CreatePaymentRequestSchema = z.object({
  planId: z.enum(['prata', 'ouro', 'diamante']),
  idempotencyKey: z.string().max(100).optional(),
});

export const UpdateCreditsSchema = z.object({
  targetUid: z.string().min(1),
  creditsDelta: z.number().int().min(-1000).max(1000),
  reason: z.string().min(2).max(255),
});

export const BlockUserSchema = z.object({
  targetUid: z.string().min(1),
  isBlocked: z.boolean(),
  reason: z.string().min(2).max(255),
});

export const DeleteAccountSchema = z.object({
  confirmation: z.literal('QUERO_EXCLUIR_MINHA_CONTA'),
});
