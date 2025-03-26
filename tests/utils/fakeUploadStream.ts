import { Readable } from 'stream';
import FormData from 'form-data';

export function createFakeFileStream(sizeInMB: number): Readable {
  const size = sizeInMB * 1024 * 1024;
  let sent = 0;

  return new Readable({
    read(chunkSize) {
      if (sent >= size) {
        this.push(null);
        return;
      }
      const remaining = size - sent;
      const chunk = Buffer.alloc(Math.min(chunkSize, remaining), 'a');
      sent += chunk.length;
      this.push(chunk);
    },
  });
}

export function createMultipartFormWithFakeFile(sizeInMB: number, filename: string) {
  const form = new FormData();
  const fileStream = createFakeFileStream(sizeInMB);

  const fakeType = 'text/csv';

  form.append('file', fileStream, {
    filename: filename,
    contentType: fakeType
  });
  return { form, fileStream };
}