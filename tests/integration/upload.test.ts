import http from 'http';
import dotenv from 'dotenv';
import redis from '../../src/connection/redis';

import { createMultipartFormWithFakeFile } from '../utils/fakeUploadStream';
import { app } from '../../src/app';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

const port = process.env.PORT || 8000;
const fileSize = 250;
const filename = 'fake.csv';

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

it(`should upload a ${fileSize}MB file successfully`, async () => {
  const {form, fileStream} = createMultipartFormWithFakeFile(fileSize, filename); 
  const auth = 'Basic ' + Buffer
  .from(`${process.env.BASIC_AUTH_USERNAME}:${process.env.BASIC_AUTH_PASSWORD}`)
  .toString('base64');

  const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
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
        resolve(response);
      }
    );
  });

  expect(res.statusCode).toBe(202);
  res.resume();
  fileStream.destroy(); 
  res.on('end', () => {
    res.socket?.destroy();
  });
});
