-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('PESSOA', 'INSTITUICAO');

-- CreateTable
CREATE TABLE "Autor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AuthorType" NOT NULL,

    CONSTRAINT "Autor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'RASCUNHO',
    "isbn" TEXT,
    "pages" INTEGER,
    "durationMin" INTEGER,
    "url" TEXT,
    "authorId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Autor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
