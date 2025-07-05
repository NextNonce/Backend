import { Injectable, ConsoleLogger } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as process from 'node:process';

export function formatMessage(
    message: any,
    startLen = 85,
    endLen = 25,
): string {
    const msgStr = String(message);
    if (msgStr.length > startLen + endLen) {
        return (
            msgStr.substring(0, startLen) +
            '...' +
            msgStr.substring(msgStr.length - endLen)
        );
    }
    return msgStr;
}

@Injectable()
export class AppLoggerService extends ConsoleLogger {
    private logFilePath = path.join(process.cwd(), 'logs', 'server.log');
    private errorLogPath = path.join(process.cwd(), 'logs', 'error.log');
    private debugLogPath = path.join(process.cwd(), 'logs', 'debug.log');

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

    /**
     * Overrides the default ConsoleLogger's timestamp creator.
     */
    protected getTimestamp(): string {
        const now = new Date();

        // --- 1. Date Parts ---
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // .getMonth() is 0-indexed, so we add 1
        const year = now.getFullYear();
        const datePart = `${day}.${month}.${year}`;

        // --- 2. Time Parts (with AM/PM) ---
        const rawHours = now.getHours();
        const ampm = rawHours >= 12 ? 'PM' : 'AM';
        let hours12 = rawHours % 12;
        hours12 = hours12 ? hours12 : 12; // The hour '0' should be '12' for AM/PM format
        const hours = String(hours12).padStart(2, '0');

        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

        // --- 3. CHOOSE SEPARATOR ---
        const millisecondSeparator = '.'; // Use '.' for ".973" or ':' for ":973"

        // --- 4. Combine Everything ---
        return `${datePart}, ${hours}:${minutes}:${seconds}${millisecondSeparator}${milliseconds} ${ampm}`;
    }

    log(message: any, context?: string) {
        const entry = `${context ? `[${context}] ` : `${this.context}`}\t${message}`;
        this.writeToFile(this.logFilePath, entry).catch(console.error);
        const contextMessage = context ?? this.context ?? 'Unknown context';
        super.log(message, contextMessage);
    }

    warn(message: any, context?: string) {
        const entry = `[WARN] ${context ? `[${context}] ` : `${this.context}`}\t${message}`;
        this.writeToFile(this.logFilePath, entry).catch(console.error);
        const contextMessage = context ?? this.context ?? 'Unknown context';
        super.warn(message, contextMessage);
    }

    error(message: any, stackOrContext?: string) {
        const entry = `[ERROR] ${stackOrContext ? `[${stackOrContext}] ` : `${this.context}`}\t${message}`;
        this.writeToFile(this.errorLogPath, entry).catch(console.error);
        const contextMessage =
            stackOrContext ?? this.context ?? 'Unknown context';
        super.error(message, contextMessage);
    }

    debug(message: any, context?: string): void {
        if (process.env.NODE_ENV === 'production') return;
        const entry = `[DEBUG] ${context ? `[${context}] ` : `${this.context}`}\t${message}`;
        this.writeToFile(this.debugLogPath, entry).catch(console.error);
        const contextMessage = context ?? this.context ?? 'Unknown context';
        super.debug(message, contextMessage);
    }
}
