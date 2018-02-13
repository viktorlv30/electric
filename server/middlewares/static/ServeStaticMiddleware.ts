import { Middleware, NestMiddleware, ExpressMiddleware } from '@nestjs/common';

@Middleware()
export class ServeStaticMiddleware implements NestMiddleware {
    resolve(...args: any[]): ExpressMiddleware {
        return (req, res, next) => {
            console.log('Request...');
            next();
        };
    }
}