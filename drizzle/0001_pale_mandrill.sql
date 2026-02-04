CREATE TABLE `field_selections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`fields` json NOT NULL,
	`isDefault` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_selections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `query_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`queryMode` varchar(32) NOT NULL,
	`dateStart` varchar(32),
	`dateEnd` varchar(32),
	`size` int NOT NULL,
	`fromOffset` int DEFAULT 0,
	`totalHits` int,
	`httpStatus` int,
	`took` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `query_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sisreg_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`baseUrl` varchar(512) NOT NULL DEFAULT 'https://sisreg-es.saude.gov.br',
	`indexPath` varchar(256) NOT NULL DEFAULT '/marcacao-ambulatorial-rj-macae/_search',
	`username` varchar(256) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sisreg_config_id` PRIMARY KEY(`id`)
);
