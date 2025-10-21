/*
  Warnings:

  - A unique constraint covering the columns `[isbn]` on the table `Material` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doi]` on the table `Material` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Material_isbn_key" ON "Material"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "Material_doi_key" ON "Material"("doi");
