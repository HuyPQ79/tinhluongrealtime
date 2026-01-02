-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `actorId` VARCHAR(191) NULL,
    ADD COLUMN `entityId` VARCHAR(191) NULL,
    ADD COLUMN `entityType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `system_configs` ADD COLUMN `systemRoles` JSON NULL;

-- CreateTable
CREATE TABLE `approval_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `contentType` VARCHAR(191) NOT NULL,
    `targetRankIds` JSON NOT NULL,
    `initiatorRoleIds` JSON NOT NULL,
    `approverRoleIds` JSON NOT NULL,
    `auditorRoleIds` JSON NULL,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
