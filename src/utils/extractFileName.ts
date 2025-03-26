import { Request } from 'express';
import busboy from 'busboy';
import type { Readable } from 'stream';

export function extractFileFromRequest(
  req: Request,
): Promise<{ filename: string; fileStream: Readable }> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });

    let fileResolved = false;

    bb.on(
      'file',
      (
        fieldname: string,
        fileStream: Readable,
        info: { filename: string; encoding: string; mimeType: string },
      ) => {
        const { filename } = info;

        resolve({
          filename,
          fileStream,
        });
      },
    );

    bb.on('error', reject);

    bb.on('finish', () => {
      if (!fileResolved) {
        reject(new Error('File not found'));
      }
    });

    req.pipe(bb);
  });
}
