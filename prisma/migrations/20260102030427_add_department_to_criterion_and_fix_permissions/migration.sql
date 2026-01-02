-- AlterTable
ALTER TABLE `criteria` ADD COLUMN `departmentId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `criteria` ADD CONSTRAINT `criteria_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
