-- V18: Extend message_logs for MSG91 delivery/read tracking.

ALTER TABLE message_logs DROP CONSTRAINT chk_message_logs_status;

ALTER TABLE message_logs ADD CONSTRAINT chk_message_logs_status
  CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE message_logs ADD COLUMN delivered_at timestamptz;
ALTER TABLE message_logs ADD COLUMN read_at timestamptz;
ALTER TABLE message_logs ADD COLUMN provider varchar(16) NOT NULL DEFAULT 'msg91';

CREATE INDEX idx_message_logs_provider_message_id
  ON message_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
