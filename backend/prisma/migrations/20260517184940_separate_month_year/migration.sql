/*
  Warnings:

  - You are about to drop the column `mesCorrespondiente` on the `Movimiento` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre]` on the table `Persona` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Movimiento" DROP COLUMN "mesCorrespondiente",
ADD COLUMN     "anio" INTEGER,
ADD COLUMN     "mes" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Persona_nombre_key" ON "Persona"("nombre");
