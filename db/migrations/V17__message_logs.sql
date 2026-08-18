-- V17: Admin-initiated template message audit log.

CREATE TABLE message_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             uuid NOT NULL,
  recipient           varchar(32) NOT NULL,
  channel             varchar(16) NOT NULL,
  template_name       varchar(128) NOT NULL,
  variables           jsonb NOT NULL DEFAULT '{}',
  status              varchar(16) NOT NULL,
  provider_message_id varchar(128),
  failure_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  CONSTRAINT fk_message_logs_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE RESTRICT,
  CONSTRAINT chk_message_logs_channel CHECK (channel IN ('whatsapp', 'sms')),
  CONSTRAINT chk_message_logs_status CHECK (status IN ('queued', 'sent', 'failed'))
);

CREATE INDEX idx_message_logs_shop_created ON message_logs (shop_id, created_at DESC);
CREATE INDEX idx_message_logs_shop ON message_logs (shop_id);
