-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tipos ENUM personalizados
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE message_type AS ENUM ('text', 'image', 'document');