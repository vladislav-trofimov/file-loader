import http from 'http';
import dotenv from 'dotenv';
import redis from '../../src/connection/redis';

import { createMultipartFormWithFakeFile } from '../utils/fakeUploadStream';
import { app } from '../../src/app';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

const port = process.env.PORT || 8000;
const fileSize = 250;

let server: http.Server;

beforeAll((done) => {
  server = app.listen(port, () => {
    done();
  });
});

afterAll(async () => {
  await redis.quit();
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });
});

it('should upload 5 files in parallel', async () => {
  const auth = 'Basic ' + Buffer
    .from(`${process.env.BASIC_AUTH_USERNAME}:${process.env.BASIC_AUTH_PASSWORD}`)
    .toString('base64');

  const uploadFile = (idx: number) => {
    const filename = `test-upload-${idx + 1}.bin`
    const { form, fileStream } = createMultipartFormWithFakeFile(fileSize, filename);

    return new Promise<http.IncomingMessage>((resolve, reject) => {
      form.submit(
        {
          host: 'localhost',
          port,
          path: '/upload',
          method: 'POST',
          headers: {
            ...form.getHeaders(),
            Authorization: auth,
          },
        },
        (err, response) => {
          if (err) return reject(err);

          response.resume();        
          fileStream.destroy();      
          response.on('end', () => {
            response.socket?.destroy();
          });

          resolve(response);
        }
      );
    });
  };

  const uploads = await Promise.all([
    uploadFile(0),
    uploadFile(1),
    uploadFile(2),
    uploadFile(3),
    uploadFile(4),
  ]);

  uploads.forEach((res, i) => {
    expect(res.statusCode).toBe(202);
  });
});
