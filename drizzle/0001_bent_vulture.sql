ALTER TABLE `registrations` MODIFY COLUMN `paymentStatus` enum('payment_pending','verified','rejected') NOT NULL DEFAULT 'payment_pending';--> statement-breakpoint
ALTER TABLE `registrations` ADD `memberOne` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `memberTwo` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `memberThree` varchar(120);--> statement-breakpoint
ALTER TABLE `registrations` ADD `memberFour` varchar(120);--> statement-breakpoint
ALTER TABLE `registrations` ADD `transactionId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_transactionId_unique` UNIQUE(`transactionId`);