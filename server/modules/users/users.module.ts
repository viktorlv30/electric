import { Module, NestModule, MiddlewaresConsumer, RequestMethod } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseModule } from '../database/database.module';
import { usersProviders } from '../providers/users.providers';

@Module({
    imports: [DatabaseModule],
    controllers: [UsersController],
    components: [UsersService, ...usersProviders],
})
export class UsersModule {

}
