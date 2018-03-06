import { Module, NestModule, MiddlewaresConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { ServeStaticMiddleware } from './middlewares/static/ServeStaticMiddleware';
import { UsersModule } from './modules/users/users.module';

@Module({
    imports: [UsersModule],
    controllers: [AppController],
    components: [],
})
export class ApplicationModule implements NestModule {
    configure(consumer: MiddlewaresConsumer): void {
        consumer.apply(ServeStaticMiddleware).forRoutes(
            { path: '*', method: RequestMethod.GET },
            { path: '*', method: RequestMethod.HEAD },
        );
    }
}
