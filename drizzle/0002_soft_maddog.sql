ALTER TABLE `query_logs` ADD `indexType` varchar(32) DEFAULT 'marcacao' NOT NULL;--> statement-breakpoint
ALTER TABLE `sisreg_config` DROP COLUMN `indexPath`;