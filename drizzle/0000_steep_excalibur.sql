CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(32) NOT NULL,
	`teamName` varchar(120) NOT NULL,
	`leadName` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(24) NOT NULL,
	`college` varchar(180) NOT NULL,
	`memberCount` int NOT NULL,
	`domain` varchar(96) NOT NULL,
	`buildType` enum('software','hardware') NOT NULL,
	`paymentStatus` enum('awaiting_qr','payment_pending','verified','rejected') NOT NULL DEFAULT 'awaiting_qr',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
