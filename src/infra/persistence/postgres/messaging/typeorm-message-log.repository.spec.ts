import { TypeOrmMessageLogRepository } from './typeorm-message-log.repository';
import { MessageLogEntity } from '@/infra/persistence/postgres/messaging/message-log.entity';
import { Repository } from 'typeorm';

describe('TypeOrmMessageLogRepository monotonic status', () => {
  let repo: TypeOrmMessageLogRepository;
  let queryMock: jest.Mock;
  let updateMock: jest.Mock;

  beforeEach(() => {
    queryMock = jest.fn();
    updateMock = jest.fn().mockReturnValue({ affected: 0 });
    const typeormRepo = {
      query: queryMock,
      update: updateMock,
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      }),
    } as unknown as Repository<MessageLogEntity>;

    repo = new TypeOrmMessageLogRepository(typeormRepo);
  });

  it('markDelivered uses rank-guarded SQL update', async () => {
    queryMock.mockResolvedValue([{ id: 'log-1' }]);
    const at = new Date('2026-08-18T10:00:00Z');

    const updated = await repo.markDelivered('log-1', at);

    expect(updated).toBe(true);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('END) < $5'), [
      'delivered',
      at,
      null,
      'log-1',
      3,
    ]);
  });

  it('markRead uses rank 4 and backfills delivered_at', async () => {
    queryMock.mockResolvedValue([]);
    const at = new Date('2026-08-18T11:00:00Z');

    const updated = await repo.markRead('log-1', at);

    expect(updated).toBe(false);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SET status = $1'), [
      'read',
      at,
      at,
      'log-1',
      4,
    ]);
  });

  it('markDelivered returns false when rank would downgrade', async () => {
    queryMock.mockResolvedValue([]);

    const updated = await repo.markDelivered('log-1', new Date());

    expect(updated).toBe(false);
  });
});
