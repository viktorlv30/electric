import { Middleware, NestMiddleware, ExpressMiddleware } from '@nestjs/common';
import * as serveStatic from 'serve-static';
import { Environment } from '../../Env';

@Middleware()
export class ServeStaticMiddleware implements NestMiddleware {
    resolve(...args: any[]): ExpressMiddleware {
        console.log(`Public path :`, Environment.PublicPath);
        return serveStatic(Environment.PublicPath);
    }
}