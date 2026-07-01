import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthUsersTable1740000000000 implements MigrationInterface {
  name = 'CreateAuthUsersTable1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE auth_user_role AS ENUM ('customer', 'provider', 'admin')
    `);

    await queryRunner.query(`
      CREATE TABLE auth_users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number  varchar(15) NOT NULL,
        role          auth_user_role NOT NULL DEFAULT 'customer',
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        deleted_at    timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX auth_users_phone_active_idx
        ON auth_users (phone_number)
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS auth_users_phone_active_idx`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_users`);
    await queryRunner.query(`DROP TYPE IF EXISTS auth_user_role`);
  }
}
