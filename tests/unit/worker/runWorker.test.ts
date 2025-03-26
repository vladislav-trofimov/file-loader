import { Readable } from 'stream';
import { runWorkerStream } from '../../../src/runWorker';
import * as child_process from 'child_process';
import * as streamPromises from 'stream/promises';

jest.mock('child_process');
jest.mock('stream/promises');

describe('runWorkerStream', () => {
  const mockSpawn = child_process.spawn as jest.Mock;
  const mockPipeline = streamPromises.pipeline as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve when pipeline and worker exit cleanly', async () => {
    const fakeWorker = {
      stdin: {} as any,
      on: jest.fn((event, cb) => {
        if (event === 'close') setTimeout(() => cb(0), 10); // simulate success exit
      }),
      kill: jest.fn(),
    };

    mockSpawn.mockReturnValue(fakeWorker);
    mockPipeline.mockResolvedValue(undefined);

    await expect(runWorkerStream('job-1', 'some-file.txt', new Readable())).resolves.toBeUndefined();
    expect(fakeWorker.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('should reject if worker exits with error code', async () => {
    const fakeWorker = {
      stdin: {} as any,
      on: jest.fn((event, cb) => {
        if (event === 'close') setTimeout(() => cb(1), 10); 
      }),
      kill: jest.fn(),
    };

    mockSpawn.mockReturnValue(fakeWorker);
    mockPipeline.mockResolvedValue(undefined);

    await expect(runWorkerStream('job-1', 'file.txt', new Readable())).rejects.toThrow('Worker failed with code 1');
  });

  it('should kill the worker if pipeline fails', async () => {
    const fakeWorker = {
      stdin: {} as any,
      on: jest.fn(),
      kill: jest.fn(),
    };

    mockSpawn.mockReturnValue(fakeWorker);
    mockPipeline.mockRejectedValue(new Error('pipeline failed'));

    await expect(runWorkerStream('job-1', 'file.txt', new Readable())).rejects.toThrow('pipeline failed');
    expect(fakeWorker.kill).toHaveBeenCalled();
  });
});