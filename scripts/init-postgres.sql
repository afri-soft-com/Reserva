-- Bases / schémas RESERVA (Docker local + init Render éventuel)
-- Une instance Postgres, 4 schémas Prisma (?schema=...)

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS hotels;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS transport;
