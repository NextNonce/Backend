
export function LogExecutionTime(): MethodDecorator {
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now();

            try {
                return await originalMethod.apply(this, args);
            } finally {
                const duration = Date.now() - startTime;

                const methodName = String(propertyKey);
                const className = target.constructor.name;

                let argsStr: string;
                try {
                    argsStr = JSON.stringify(args);
                } catch (error) {
                    argsStr = '[Unable to stringify arguments]';
                }

                const message = `[${className}.${methodName}] executed in ${duration}ms with args: ${argsStr}`;

                if (this.logger && typeof this.logger.debug === 'function') {
                    this.logger.debug(message);
                } else {
                    console.log(message);
                }
            }
        };

        return descriptor;
    };
}