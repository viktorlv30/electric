import { Module, NestModule, MiddlewaresConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { ServeStaticMiddleware } from './middlewares/static/ServeStaticMiddleware';

@Module({
    imports: [],
    controllers: [AppController],
    components: [],
})
export class ApplicationModule implements NestModule {
    configure(consumer: MiddlewaresConsumer): void {
        consumer.apply(ServeStaticMiddleware).forRoutes(AppController);
    }
}
