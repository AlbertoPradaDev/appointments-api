-- CreateTable Empleado
CREATE TABLE "Empleado" (
    "id" SERIAL NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for Empleado -> Negocio
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create a default Empleado for each existing Negocio
INSERT INTO "Empleado" ("negocioId", "nombre")
SELECT id, nombre FROM "Negocio";

-- Add empleadoId as nullable to tables that need it
ALTER TABLE "Servicio" ADD COLUMN "empleadoId" INTEGER;
ALTER TABLE "Horario" ADD COLUMN "empleadoId" INTEGER;
ALTER TABLE "Pausa" ADD COLUMN "empleadoId" INTEGER;
ALTER TABLE "DiaBloqueado" ADD COLUMN "empleadoId" INTEGER;
ALTER TABLE "Cita" ADD COLUMN "empleadoId" INTEGER;

-- Assign all existing rows to the default employee of their negocio
UPDATE "Servicio" s
SET "empleadoId" = e.id
FROM "Empleado" e
WHERE e."negocioId" = s."negocioId";

UPDATE "Horario" h
SET "empleadoId" = e.id
FROM "Empleado" e
WHERE e."negocioId" = h."negocioId";

UPDATE "Pausa" p
SET "empleadoId" = e.id
FROM "Empleado" e
WHERE e."negocioId" = p."negocioId";

UPDATE "DiaBloqueado" d
SET "empleadoId" = e.id
FROM "Empleado" e
WHERE e."negocioId" = d."negocioId";

UPDATE "Cita" c
SET "empleadoId" = e.id
FROM "Empleado" e
WHERE e."negocioId" = c."negocioId";

-- Make empleadoId NOT NULL
ALTER TABLE "Servicio" ALTER COLUMN "empleadoId" SET NOT NULL;
ALTER TABLE "Horario" ALTER COLUMN "empleadoId" SET NOT NULL;
ALTER TABLE "Pausa" ALTER COLUMN "empleadoId" SET NOT NULL;
ALTER TABLE "DiaBloqueado" ALTER COLUMN "empleadoId" SET NOT NULL;
ALTER TABLE "Cita" ALTER COLUMN "empleadoId" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pausa" ADD CONSTRAINT "Pausa_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiaBloqueado" ADD CONSTRAINT "DiaBloqueado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old negocioId foreign keys and columns from Servicio, Horario, Pausa, DiaBloqueado
ALTER TABLE "Servicio" DROP CONSTRAINT "Servicio_negocioId_fkey";
ALTER TABLE "Servicio" DROP COLUMN "negocioId";

ALTER TABLE "Horario" DROP CONSTRAINT "Horario_negocioId_fkey";
ALTER TABLE "Horario" DROP COLUMN "negocioId";

ALTER TABLE "Pausa" DROP CONSTRAINT "Pausa_negocioId_fkey";
ALTER TABLE "Pausa" DROP COLUMN "negocioId";

ALTER TABLE "DiaBloqueado" DROP CONSTRAINT "DiaBloqueado_negocioId_fkey";
ALTER TABLE "DiaBloqueado" DROP COLUMN "negocioId";

-- Drop negocio relations from Negocio table (these were the old reverse relations, no columns to drop)
-- Negocio still has citas relation, so negocioId stays in Cita
