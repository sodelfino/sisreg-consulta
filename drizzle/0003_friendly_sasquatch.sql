CREATE TABLE `access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(256) NOT NULL,
	`email` varchar(320) NOT NULL,
	`cargo` varchar(256) NOT NULL,
	`justificativa` text NOT NULL,
	`status` enum('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
	`motivoRejeicao` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_requests_id` PRIMARY KEY(`id`)
);
