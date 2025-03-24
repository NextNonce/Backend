import { Injectable, ConsoleLogger } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as process from 'node:process';

@Injectable()
export class AppLoggerService extends ConsoleLogger {
    private logFilePath = path.join(process.cwd(), 'logs', 'server.log');
    private errorLogPath = path.join(process.cwd(), 'logs', 'error.log');

    async writeToFile(filePath: string, entry: string) {
        const now = new Date();
        const formattedEntry = `${Intl.DateTimeFormat('de-DE', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(now)}\t${entry}\n`;

        const logsDir = path.dirname(filePath);

        try {
            if (!fs.existsSync(logsDir)) {
                await fsPromises.mkdir(logsDir, { recursive: true });
            }

            await fsPromises.appendFile(filePath, formattedEntry, 'utf8');
        } catch (error) {
            if (error instanceof Error) console.error(error.message);
        }
    }

    log(message: any, context?: string) {
        const entry = `${context ? `[${context}] ` : `${this.context}`}\t${message}`;
        this.writeToFile(this.logFilePath, entry).catch(console.error);
        const contextMessage = context ?? (this.context ?? 'Unknown context');
        super.log(message, contextMessage);
    }

    error(message: any, stackOrContext?: string) {
        const entry = `[ERROR] ${stackOrContext ? `[${stackOrContext}] ` : `${this.context}`}\t${message}`;
        this.writeToFile(this.errorLogPath, entry).catch(console.error);
        const contextMessage = stackOrContext ?? (this.context ?? 'Unknown context');
        super.error(message, contextMessage);
    }
}
