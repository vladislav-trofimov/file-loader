import { extractFileFromRequest } from '../../../src/utils/extractFileName';
import type { Request } from 'express';
import busboy from 'busboy';
import { Readable } from 'stream';

jest.mock('busboy');

type BusboyEvent = 'file' | 'finish' | 'error';
type FileCallback = (
  fieldname: string,
  fileStream: Readable,
  info: { filename: string; encoding: string; mimeType: string },
) => void;
type ErrorCallback = (err: Error) => void;
type FinishCallback = () => void;

describe('extractFileFromRequest', () => {
  const mockPipe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve with filename and stream when file is present', async () => {
    const onHandlers: Partial<Record<BusboyEvent, Function>> = {};

    // @ts-ignore
    busboy.mockImplementation(() => ({
      on: (event: BusboyEvent, cb: Function) => {
        onHandlers[event] = cb;
      },
    }));

    const mockReq = {
      headers: {},
      pipe: mockPipe,
    } as unknown as Request;

    const resultPromise = extractFileFromRequest(mockReq);

    const fakeStream = new Readable({ read() {} });
    (onHandlers.file as FileCallback)(
      'file',
      fakeStream,
      {
        filename: 'test.txt',
        encoding: 'utf-8',
        mimeType: 'text/plain',
      },
    );

    const result = await resultPromise;

    expect(result.filename).toBe('test.txt');
    expect(result.fileStream).toBe(fakeStream);
    expect(mockPipe).toHaveBeenCalled();
  });

  it('should reject if no file is provided', async () => {
    const onHandlers: Partial<Record<BusboyEvent, Function>> = {};
    // @ts-ignore
    busboy.mockImplementation(() => ({
      on: (event: BusboyEvent, cb: Function) => {
        onHandlers[event] = cb;
      },
    }));

    const mockReq = {
      headers: {},
      pipe: mockPipe,
    } as unknown as Request;

    const resultPromise = extractFileFromRequest(mockReq);

    (onHandlers.finish as FinishCallback)();

    await expect(resultPromise).rejects.toThrow('File not found');
  });

  it('should reject on busboy error', async () => {
    const onHandlers: Partial<Record<BusboyEvent, Function>> = {};
    // @ts-ignore
    busboy.mockImplementation(() => ({
      on: (event: BusboyEvent, cb: Function) => {
        onHandlers[event] = cb;
      },
    }));

    const mockReq = {
      headers: {},
      pipe: mockPipe,
    } as unknown as Request;

    const resultPromise = extractFileFromRequest(mockReq);

    (onHandlers.error as ErrorCallback)(new Error('Something went wrong'));

    await expect(resultPromise).rejects.toThrow('Something went wrong');
  });
});
