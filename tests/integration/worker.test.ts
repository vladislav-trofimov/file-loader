import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function waitForFile(filePath: string, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for file to be created'));
      }
    }, 50);
  });
}

describe('worker.js', () => {
  const workerScript = path.resolve(__dirname, '../../dist/worker.js');

  it('should write stdin to file and exit with 0', async () => {
    const outputFile = path.join(os.tmpdir(), `test-output-${Date.now()}.txt`);
    const worker = spawn('node', [workerScript, outputFile]);

    worker.stdin.write('Hello from test\n', () => {
      worker.stdin.end();
    });

    const exitCode = await new Promise<number>((resolve) => {
      worker.on('close', (code) => resolve(code ?? 1));
    });

    await waitForFile(outputFile, 3000);

    const content = fs.readFileSync(outputFile, 'utf-8');

    expect(exitCode).toBe(0);
    expect(content).toBe('Hello from test\n');

    fs.unlinkSync(outputFile);
  });
});