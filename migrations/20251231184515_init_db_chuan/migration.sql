-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `budgetNorm` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `managerId` VARCHAR(191) NULL,
    `blockDirectorId` VARCHAR(191) NULL,
    `hrId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `avatar` TEXT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL DEFAULT 'OTHER',
    `birthday` DATETIME(3) NULL,
    `address` TEXT NULL,
    `identityNumber` VARCHAR(191) NULL,
    `bankAccount` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `taxCode` VARCHAR(191) NULL,
    `socialInsuranceNo` VARCHAR(191) NULL,
    `joinDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('ACTIVE', 'INACTIVE', 'MATERNITY', 'PROBATION', 'PENDING_APPROVAL') NOT NULL DEFAULT 'ACTIVE',
    `roles` JSON NOT NULL,
    `numberOfDependents` INTEGER NOT NULL DEFAULT 0,
    `currentDeptId` VARCHAR(191) NULL,
    `currentRankId` VARCHAR(191) NULL,
    `currentGradeId` VARCHAR(191) NULL,
    `currentPosition` VARCHAR(191) NULL,
    `paymentType` VARCHAR(191) NOT NULL DEFAULT 'TIME',
    `efficiencySalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `pieceworkUnitPrice` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `reservedBonusAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `probationRate` INTEGER NOT NULL DEFAULT 100,

    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_currentDeptId_idx`(`currentDeptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `type` ENUM('TIME', 'PIECEWORK', 'DAILY', 'MODE', 'HOLIDAY', 'PAID_LEAVE', 'UNPAID', 'WAITING') NOT NULL DEFAULT 'TIME',
    `hours` DOUBLE NOT NULL DEFAULT 8,
    `overtimeHours` DOUBLE NOT NULL DEFAULT 0,
    `otRate` DOUBLE NOT NULL DEFAULT 1.5,
    `isOvertimeWithOutput` BOOLEAN NOT NULL DEFAULT false,
    `output` DOUBLE NULL,
    `pieceworkUnitPrice` DECIMAL(18, 2) NULL,
    `dailyWorkItemId` VARCHAR(191) NULL,
    `overtimeDailyWorkItemId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PENDING', 'PENDING_MANAGER', 'PENDING_GDK', 'PENDING_BLD', 'PENDING_HR', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `sentToHrAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `attendance_records_date_idx`(`date`),
    INDEX `attendance_records_status_idx`(`status`),
    UNIQUE INDEX `attendance_records_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluation_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `criteriaId` VARCHAR(191) NOT NULL,
    `criteriaName` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NULL,
    `target` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY_SALARY',
    `points` DOUBLE NOT NULL,
    `description` TEXT NULL,
    `proofFileName` VARCHAR(191) NULL,
    `requesterId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'PENDING_MANAGER', 'PENDING_GDK', 'PENDING_BLD', 'PENDING_HR', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rejectionReason` TEXT NULL,

    INDEX `evaluation_requests_userId_idx`(`userId`),
    INDEX `evaluation_requests_status_idx`(`status`),
    INDEX `evaluation_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'PENDING_MANAGER', 'PENDING_GDK', 'PENDING_BLD', 'PENDING_HR', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `Ctc` DOUBLE NOT NULL DEFAULT 0,
    `Ctt` DOUBLE NOT NULL DEFAULT 0,
    `Cn` DOUBLE NOT NULL DEFAULT 0,
    `NCD` DOUBLE NOT NULL DEFAULT 0,
    `NL` DOUBLE NOT NULL DEFAULT 0,
    `NCL` DOUBLE NOT NULL DEFAULT 0,
    `NKL` DOUBLE NOT NULL DEFAULT 0,
    `NCV` DOUBLE NOT NULL DEFAULT 0,
    `LCB_dm` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `LHQ_dm` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `LSL_dm` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `SL_khoan` DOUBLE NOT NULL DEFAULT 0,
    `SL_tt` DOUBLE NOT NULL DEFAULT 0,
    `DG_khoan` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `HS_tn` DOUBLE NOT NULL DEFAULT 0,
    `probationRate` INTEGER NOT NULL DEFAULT 100,
    `actualBaseSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `actualEfficiencySalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `actualPieceworkSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `otherSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `totalAllowance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `totalBonus` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `overtimeSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `insuranceDeduction` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `pitDeduction` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `unionFee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `advancePayment` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `otherDeductions` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `calculatedSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `netSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `calculationLog` JSON NULL,
    `adjustments` JSON NULL,
    `sentToHrAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `lastUpdated` DATETIME(3) NOT NULL,

    INDEX `salary_records_date_idx`(`date`),
    UNIQUE INDEX `salary_records_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `details` TEXT NOT NULL,
    `isConfigAction` BOOLEAN NOT NULL DEFAULT false,

    INDEX `audit_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_variables` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `salary_variables_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_formulas` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `expression` TEXT NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `group` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `salary_formulas_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_ranks` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `baseSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `allowance` DECIMAL(18, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_grades` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `multiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `baseSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `efficiencySalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `fixedAllowance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `flexibleAllowance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `otherSalary` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `fixedBonuses` JSON NULL,
    `rankId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `piecework_configs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `targetOutput` DOUBLE NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(18, 2) NOT NULL DEFAULT 0,

    INDEX `piecework_configs_userId_idx`(`userId`),
    INDEX `piecework_configs_month_idx`(`month`),
    UNIQUE INDEX `piecework_configs_userId_month_key`(`userId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_work_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NOT NULL DEFAULT 'SERVICE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL DEFAULT 3.0,

    UNIQUE INDEX `holidays_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default_config',
    `baseSalary` DECIMAL(18, 2) NOT NULL DEFAULT 1800000,
    `standardWorkDays` INTEGER NOT NULL DEFAULT 26,
    `insuranceBaseSalary` DECIMAL(18, 2) NOT NULL DEFAULT 1800000,
    `maxInsuranceBase` DECIMAL(18, 2) NOT NULL DEFAULT 36000000,
    `pitSteps` JSON NULL,
    `insuranceRules` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `criterion_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `criteria` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `points` DOUBLE NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `value` DOUBLE NOT NULL DEFAULT 0,
    `threshold` DOUBLE NOT NULL DEFAULT 0,
    `target` VARCHAR(191) NOT NULL,
    `proofRequired` BOOLEAN NOT NULL DEFAULT false,
    `groupId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bonus_types` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `isTaxable` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `bonus_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annual_bonus_policies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `formulaCode` VARCHAR(191) NOT NULL,
    `condition` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_currentDeptId_fkey` FOREIGN KEY (`currentDeptId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluation_requests` ADD CONSTRAINT `evaluation_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_records` ADD CONSTRAINT `salary_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_grades` ADD CONSTRAINT `salary_grades_rankId_fkey` FOREIGN KEY (`rankId`) REFERENCES `salary_ranks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criteria` ADD CONSTRAINT `criteria_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `criterion_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
