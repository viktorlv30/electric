import { Connection } from "mongoose";
import { UserSchema } from "../users/schemas/user.schema";

export const usersProviders = [
    {
        provide: 'UserModelToken',
        useFactory: (connection: Connection) => connection.model('User', UserSchema),
        inject: ['MongoDbConnectionToken'],
    },
]